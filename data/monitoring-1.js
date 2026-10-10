/* ═══════════════════════════════════════════════════════════════════════════
   data/monitoring-1.js — Parcours MONITORING (sections 43 → 49)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   Métriques natives, pve-exporter, InfluxDB + Grafana, SNMP/Zabbix,
   logs, alertes, Datacenter Manager.
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'metriques-natives',
    track: 'monitoring',
    level: 'intermediaire',
    title: 'Métriques natives : RRD, historique, graphiques',
    icon: 'fa-solid fa-chart-line',
    step: '43',
    requires: ['interface-web'],
    description: 'Proxmox VE embarque une chaîne de métriques entièrement native : le daemon pvestatd sonde les nœuds, VMs et conteneurs toutes les 10 secondes, puis alimente des bases RRD servies par rrdcached. L\'interface web dessine ensuite ces séries en graphiques (CPU, RAM, IO delay, réseau, stockage) sur cinq fenêtres temporelles allant de l\'heure à l\'année. Cette supervision intégrée ne demande aucune configuration et couvre le diagnostic quotidien, mais sa résolution se dégrade avec le temps : elle ne remplace pas un export externe vers Prometheus ou InfluxDB. Comprendre cette chaîne est le prérequis de toutes les sections suivantes du parcours.',
    cliCommands: [
      `# Le producteur des graphiques : pvestatd
systemctl status pvestatd --no-pager
journalctl -u pvestatd -n 20

# Séries brutes via l'API (même données que les graphes GUI)
pvesh get /nodes/pve1/rrddata --timeframe hour
pvesh get /nodes/pve1/rrddata --timeframe year`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Summary</span> → santé du cluster et consommation agrégée des ressources",
      "<span class='wb-path'>Node → Summary</span> → CPU, IO delay, mémoire, réseau et espace de stockage du nœud",
      "<span class='wb-path'>VM → Summary / CT → Summary</span> → graphiques par machine, sélecteur de période en haut à droite",
      "<span class='wb-path'>Datacenter → Metric Server</span> → point de configuration des exports externes (sections suivantes)",
      "<span class='wb-path'>Node → Shell</span> → pvesh get /nodes/pve1/rrddata --timeframe hour pour les données brutes"
    ],
    diagram: 'mon-rrd',
    terminology: ['RRD', 'RRDcached', 'Metric server', 'pvestatd', 'Datacenter', 'Nœud (node)'],
    concepts: [
      { term: 'pvestatd', def: "Daemon de statistiques Proxmox : sonde nœuds, VMs et CTs en continu et écrit les points dans les RRD — s'il est arrêté, les graphes se figent." },
      { term: 'RRD', def: "Round Robin Database : base circulaire de taille fixe dont la résolution diminue à mesure que les données vieillissent." },
      { term: 'rrdcached', def: "Daemon de mise en cache d'écriture : il amortit les mises à jour RRD et évite les accès disque à chaque point de collecte." },
      { term: 'IO delay', def: "Temps pendant lequel une tâche attend le disque : indicateur clé de saturation du stockage, visible sur les Summary de nœud." },
      { term: 'rrddata', def: "Endpoint API (/nodes/{node}/rrddata) qui expose les séries RRD brutes au format JSON — base de toute réutilisation externe." }
    ],
    alerts: [
      { type: 'info', icon: 'fa-circle-info', text: "Les graphiques apparaissent quelques minutes après l'installation : le premier point RRD n'existe qu'après le premier cycle de collecte, rien à configurer." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "La résolution RRD se dégrade avec l'âge des données (≈ 1 minute sur l'heure, plusieurs heures sur l'année) : un incident bref d'hier devient invisible. Pour un historique fin, exporter vers pve-exporter ou InfluxDB." }
    ],
    table: {
      headers: ['Fenêtre', 'Résolution approx.', 'Usage typique'],
      rows: [
        ['hour', '≈ 1 minute', 'Diagnostic immédiat, incident en cours'],
        ['day', '≈ 2 minutes', 'Analyse de la journée écoulée'],
        ['week', '≈ 13 minutes', 'Tendances hebdomadaires, batchs nocturnes'],
        ['month', '≈ 1,25 heure', 'Capacity planning court terme'],
        ['year', '≈ 9 heures', 'Croissance annuelle, capacité long terme']
      ]
    }
  },

  {
    id: 'pve-exporter',
    track: 'monitoring',
    level: 'intermediaire',
    title: 'pve-exporter : Prometheus, config, déploiement',
    icon: 'fa-solid fa-satellite-dish',
    step: '44',
    requires: ['metriques-natives'],
    description: 'pve-exporter expose les métriques Proxmox VE au format Prometheus : un compte de service en lecture seule interroge l\'API REST et publie des séries pve_* sur le port 9221. Prometheus scrape ensuite cet endpoint à intervalle régulier et conserve un historique à résolution constante, indépendant des limites du RRD natif. Le déploiement suit le cahier des charges du labo (CDC 3.6) : binaire téléchargé depuis GitHub, fichier de configuration YAML et service systemd dédié. C\'est la voie pull recommandée pour une supervision industrielle avec Grafana et Alertmanager.',
    cliCommands: [
      `# 1. Compte de supervision côté Proxmox (moindre privilège)
pveum user add monitor@pve --comment "Supervision pve-exporter"
pveum aclmod / --users monitor@pve --roles PVEAuditor`,
      `# 2. Installation du binaire (CDC 3.6) + configuration
curl -fsSL https://github.com/bigtcze/pve-exporter/releases/latest/download/pve-exporter-linux-amd64 \\
  -o /usr/local/bin/pve-exporter
chmod +x /usr/local/bin/pve-exporter

mkdir -p /etc/pve-exporter
cat > /etc/pve-exporter/config.yml <<EOF
proxmox:
  host: 192.168.10.10
  port: 8006
  user: monitor@pve
  password: <MOT_DE_PASSE>
EOF`,
      `# 3. Service systemd dédié + job Prometheus
cat > /etc/systemd/system/pve-exporter.service <<EOF
[Unit]
Description=Proxmox VE Prometheus Exporter
After=network.target

[Service]
ExecStart=/usr/local/bin/pve-exporter -config /etc/pve-exporter/config.yml
Restart=always

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable --now pve-exporter
curl -s http://localhost:9221/metrics | head -20

# Côté serveur de supervision : /etc/prometheus/prometheus.yml
scrape_configs:
  - job_name: 'pve'
    static_configs:
      - targets: ['192.168.10.10:9221']`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Users → Add</span> → compte monitor@pve (realm PVE, mot de passe fort)",
      "<span class='wb-path'>Datacenter → Permissions → Add → User Permission</span> → Path /, Role PVEAuditor",
      "<span class='wb-path'>Node → Shell</span> → création de /etc/pve-exporter/config.yml (CDC 3.6)",
      "<span class='wb-path'>Node → System → Services</span> → pve-exporter : Start / Enable, état active (running)",
      "<span class='wb-path'>http://IP_EXPORTER:9221/metrics</span> → vérifier les séries pve_* avec labels node, vmid, type"
    ],
    diagram: 'mon-exporter',
    terminology: ['pve-exporter', 'Prometheus', 'Exporter', 'Scrape', 'API REST', 'RBAC'],
    concepts: [
      { term: 'PVEAuditor', def: "Rôle Proxmox en lecture seule : suffisant pour exporter les métriques, sans aucun droit de modification sur le cluster." },
      { term: 'Endpoint /metrics', def: "URL HTTP exposant les séries au format texte Prometheus (pve_up, pve_cpu_usage_ratio…) : cible du job de scrape." },
      { term: 'Pull model', def: "Prometheus initie la collecte : détection naturelle de panne (target down), aucun flux sortant à ouvrir depuis Proxmox." },
      { term: 'pve_*', def: "Préfixe des métriques exportées : CPU, RAM, disques et état par nœud, VM et conteneur, avec labels node, vmid, type." },
      { term: 'config.yml', def: "Fichier de configuration de pve-exporter (host, port, user, password) passé au binaire via l'option -config." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "N'utilisez jamais root@pam dans config.yml : le compte monitor@pve en PVEAuditor limite l'impact d'une compromission de l'exporter (lecture seule)." },
      { type: 'info', icon: 'fa-circle-info', text: "Le scrape s'effectue typiquement toutes les 15 à 30 secondes : ajustez scrape_interval côté Prometheus selon la charge, en restant sous la minute pour détecter rapidement une panne." }
    ],
    table: {
      headers: ['Métrique', 'Signification', 'Labels principaux'],
      rows: [
        ['pve_up', 'Nœud joignable (1) ou en panne (0)', 'id, name'],
        ['pve_cpu_usage_ratio', 'Utilisation CPU (0 → 1)', 'id, node, instance'],
        ['pve_memory_used_bytes', 'RAM utilisée', 'id, node'],
        ['pve_storage_usage_bytes', 'Espace consommé par storage', 'id, node, type'],
        ['pve_vm_status', 'État de la VM (running, stopped…)', 'node, vmid, status']
      ]
    }
  },

  {
    id: 'influxdb-grafana',
    track: 'monitoring',
    level: 'intermediaire',
    title: 'InfluxDB + Grafana : dashboard Proxmox',
    icon: 'fa-solid fa-chart-pie',
    step: '45',
    requires: ['metriques-natives'],
    description: 'La stack InfluxDB + Grafana est la voie push native de Proxmox VE : le Metric Server envoie les métriques du cluster vers un bucket InfluxDB en Line protocol, et Grafana interroge la base pour dessiner des dashboards Proxmox riches et partageables. Contrairement à la voie pull de Prometheus, aucun agent n\'est nécessaire : un seul point de configuration suffit dans Datacenter → Metric Server. InfluxDB 2.x apporte l\'authentification par token, les organisations et des politiques de rétention par bucket. Telegraf complète la stack pour superviser en plus l\'hôte qui héberge la base (CPU, disques, réseau).',
    cliCommands: [
      `# 1. InfluxDB 2.x (Debian/Ubuntu)
curl -fsSL https://download.influxdata.com/influxdb/keys | gpg --dearmor \\
  -o /usr/share/keyrings/influxdb.gpg
echo "deb [signed-by=/usr/share/keyrings/influxdb.gpg] https://download.influxdata.com/influxdb/deb stable main" \\
  > /etc/apt/sources.list.d/influxdb.list
apt update && apt install -y influxdb2
systemctl enable --now influxdb

# 2. Initialisation : organisation, bucket pve2, rétention, token
influx setup --username admin --password '<MOT_DE_PASSE>' \\
  --org cfp-cmd --bucket pve2 --retention 30d --force
influx auth create --org cfp-cmd --all-access   # notez le token`,
      `# 3. Côté Proxmox : Metric Server vers InfluxDB (HTTP, port 8089)
pvesh set /cluster/metric-server/influxdb \\
  --server 192.168.10.60 --port 8089 --protocol http \\
  --organization cfp-cmd --bucket pve2 --token '<TOKEN>'

# Vérifier la configuration, désactiver l'export si besoin
pvesh get /cluster/metric-server
pvesh delete /cluster/metric-server/influxdb   # arrête le flux`,
      `# 4. Grafana OSS (Debian/Ubuntu)
apt install -y apt-transport-https software-properties-common wget
wget -q -O /usr/share/keyrings/grafana.gpg https://apt.grafana.com/gpg.key
echo "deb [signed-by=/usr/share/keyrings/grafana.gpg] https://apt.grafana.com stable main" \\
  > /etc/apt/sources.list.d/grafana.list
apt update && apt install -y grafana
systemctl enable --now grafana-server    # UI : http://IP:3000 (admin/admin)`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Metric Server → Add → InfluxDB</span> → IP, port 8089, protocole HTTP, Organization, Bucket, Token",
      "<span class='wb-path'>Datacenter → Metric Server</span> → état du serveur configuré, boutons Edit / Remove",
      "<span class='wb-path'>Grafana → Connections → Data sources → Add data source</span> → InfluxDB, langage Flux, org/bucket/token",
      "<span class='wb-path'>Grafana → Dashboards → New → Import</span> → dashboard communautaire « Proxmox » depuis grafana.com",
      "<span class='wb-path'>Grafana → Explore</span> → requête Flux sur le bucket pve2 pour valider l'arrivée des séries",
      "<span class='wb-path'>Node → Summary</span> → les graphes natifs RRD restent disponibles en parallèle de Grafana"
    ],
    diagram: 'mon-stack',
    terminology: ['InfluxDB', 'Grafana', 'Dashboard', 'Telegraf', 'Line protocol', 'Metric server'],
    concepts: [
      { term: 'Bucket', def: "Conteneur logique InfluxDB 2.x : les métriques Proxmox y entrent avec la politique de rétention du bucket (ex. 30 jours)." },
      { term: 'Flux', def: "Langage de requête d'InfluxDB 2.x utilisé par Grafana : from(bucket:) |> range() |> filter() |> aggregation." },
      { term: 'Push vs Pull', def: "Proxmox pousse en continu vers InfluxDB (UDP/HTTP 8089), là où Prometheus vient tirer les métriques : deux topologies complémentaires." },
      { term: 'Retention policy', def: "Durée de conservation des points par bucket : détail 30-90 jours, puis downsample vers un bucket annuel plus grossier." },
      { term: 'Telegraf', def: "Agent de collecte InfluxData : complète la stack avec les métriques de l'hôte de supervision (CPU, disque, réseau) vers le même InfluxDB." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le protocole UDP (port 8089, défaut historique) est fire-and-forget : ni confirmation ni authentification. En production, privilégiez HTTP/HTTPS avec token pour garantir la réception des points." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un flux continu de métriques remplit vite un disque : définissez une rétention de bucket (30-90 jours) et surveillez l'espace du serveur InfluxDB." }
    ],
    table: {
      headers: ['Approche', 'Sens du flux', 'Rétention', 'Visualisation', 'Alerting'],
      rows: [
        ['RRD natif', 'Collecte locale (pvestatd)', '≈ 1 an, faible résolution', 'GUI intégrée', 'Notifications PVE seulement'],
        ['pve-exporter', 'Pull — Prometheus scrape :9221', 'Selon rétention Prometheus', 'Grafana', 'Alertmanager'],
        ['InfluxDB + Grafana', 'Push — Metric Server :8089', 'Par bucket (30 j…)', 'Grafana', 'Grafana Alerting'],
        ['SNMP + Zabbix', 'Poll — GET/GETNEXT UDP 161', 'Selon rétention Zabbix', 'Zabbix', 'Triggers + actions']
      ]
    }
  },

  {
    id: 'snmp-zabbix',
    track: 'monitoring',
    level: 'avance',
    title: 'SNMP : MIB, OID, supervision Zabbix',
    icon: 'fa-solid fa-tower-observation',
    step: '46',
    requires: ['metriques-natives'],
    description: 'SNMP reste la lingua franca de la supervision : chaque nœud exécute un agent snmpd qui publie CPU, mémoire, disques et interfaces via une arborescence d\'OID normalisée par des MIB. Zabbix interroge cet agent en polling (GET, GETNEXT, WALK sur UDP 161) et déclenche ses triggers sur les seuils définis. Sur le labo isolé, la communauté SNMP v2c suffit ; en production, SNMP v3 avec authentification et chiffrement est la norme. À noter : Zabbix propose aussi le template officiel « Proxmox VE by HTTP », qui passe par l\'API REST et complète la vue matérielle SNMP.',
    cliCommands: [
      `# 1. Agent SNMP sur le nœud Proxmox
apt install -y snmpd snmp

# 2. Configuration minimale /etc/snmp/snmpd.conf
cat > /etc/snmp/snmpd.conf <<EOF
agentAddress udp:161
rocommunity cfp-cmd 192.168.10.0/24
sysLocation CFP-CMD Labo
sysContact admin@cfp-cmd.local
EOF
systemctl restart snmpd`,
      `# 3. Tests depuis le serveur de supervision
snmpwalk -v 2c -c cfp-cmd 192.168.10.10 .1.3.6.1.2.1.1        # MIB-2 : système
snmpget -v 2c -c cfp-cmd 192.168.10.10 .1.3.6.1.4.1.2021.4.5.0  # RAM totale
snmpwalk -v 2c -c cfp-cmd 192.168.10.10 .1.3.6.1.4.1.2021.9    # disques
snmptranslate -IR memTotalReal.0                               # OID → nom MIB`,
      `# 4. Ouvrir UDP 161 au seul serveur Zabbix (pare-feu Proxmox)
pvesh create /cluster/firewall/rules --enable 1 \\
  --proto udp --dport 161 --source 192.168.10.60 \\
  --action ACCEPT --comment "SNMP Zabbix"`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Shell</span> → apt install snmpd puis édition de /etc/snmp/snmpd.conf",
      "<span class='wb-path'>Datacenter → Firewall → Add</span> → règle UDP 161 entrante, source limitée au serveur Zabbix",
      "<span class='wb-path'>Zabbix → Data collection → Hosts → Create host</span> → interface SNMP (IP du nœud, port 161, communauté)",
      "<span class='wb-path'>Zabbix → host → Templates</span> → lier « Linux by Zabbix SNMP » (ou des items OID dédiés)",
      "<span class='wb-path'>Zabbix → Monitoring → Latest data</span> → CPU, mémoire et disques remontés par OID"
    ],
    diagram: 'mon-snmp',
    terminology: ['SNMP', 'OID', 'MIB', 'Zabbix', 'Nœud (node)', 'Cluster'],
    concepts: [
      { term: 'Agent snmpd', def: "Service Linux écoutant UDP 161 et répondant aux requêtes sur les OID autorisés par /etc/snmp/snmpd.conf." },
      { term: 'Communauté', def: "Mot de passe simple de SNMP v1/v2c (ex. public) : restreindre par source IP et passer à v3 en production." },
      { term: 'Poll vs Trap', def: "Le poll interroge à intervalle fixe (fiable, latence = intervalle) ; le trap est envoyé par l'agent dès l'événement (UDP 162), sans garantie de remise." },
      { term: 'Template Zabbix', def: "Ensemble réutilisable d'items, triggers et graphiques : « Linux by Zabbix SNMP » couvre les OID UCD standards." },
      { term: 'Proxmox VE by HTTP', def: "Template Zabbix alternatif utilisant l'API REST (token) : état du cluster, VMs et storages sans agent installé." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "La communauté v2c circule en clair sur le réseau : tout intercepteur peut la lire. En production, basculez sur SNMP v3 (authPriv) ou isolez la supervision dans un VLAN dédié." },
      { type: 'info', icon: 'fa-circle-info', text: "SNMP supervise l'hôte (CPU, RAM, disques, interfaces) mais ne voit pas l'intérieur des VMs : combinez-le avec pve-exporter ou l'API REST pour la vue cluster." }
    ],
    table: {
      headers: ['OID (base)', 'MIB', 'Informations exposées'],
      rows: [
        ['.1.3.6.1.2.1.1', 'MIB-2 (system)', 'sysDescr, sysUpTime, hostname'],
        ['.1.3.6.1.2.1.2', 'IF-MIB', 'Interfaces réseau : débit, état, erreurs'],
        ['.1.3.6.1.4.1.2021.4', 'UCD-SNMP-MIB', 'Mémoire : totale, libre, swap'],
        ['.1.3.6.1.4.1.2021.9', 'UCD-SNMP-MIB', 'Disques : usage et inodes'],
        ['.1.3.6.1.4.1.2021.10', 'UCD-SNMP-MIB', 'Charge CPU (load averages 1/5/15)']
      ]
    }
  },

  {
    id: 'logs-journald',
    track: 'monitoring',
    level: 'avance',
    title: 'Logs : syslog, journald, centralisation',
    icon: 'fa-solid fa-scroll',
    step: '47',
    requires: ['metriques-natives'],
    description: 'La journalisation Proxmox s\'appuie sur deux couches complémentaires : journald (systemd) capture en binaire indexé les messages du noyau et des services, consultables par journalctl, tandis que rsyslog les déverse en texte dans /var/log/syslog pour les outils classiques. Les tâches Proxmox (backup, migration, start/stop) disposent en plus de leurs propres journaux sous /var/log/pve/tasks, visibles depuis la GUI. En production, ces flux se centralisent : rsyslog transfère vers un serveur de logs en TCP/TLS sur le port 514, ou vers une plateforme Loki, Graylog ou Elastic. La centralisation est vitale : en cas de panne d\'un nœud, ses logs locaux peuvent devenir inaccessibles précisément au moment où on en a besoin.',
    cliCommands: [
      `# 1. journald : requêtes courantes
journalctl -u pveproxy -n 50             # journal d'un service
journalctl -f                            # suivi temps réel
journalctl --since "1h ago" -p warning   # avertissements récents
journalctl --disk-usage                  # place occupée par le journal`,
      `# 2. Bornes de rétention dans /etc/systemd/journald.conf
SystemMaxUse=500M
MaxRetentionSec=1month
systemctl restart systemd-journald

# 3. Centralisation rsyslog : /etc/rsyslog.d/60-central.conf
*.* @@192.168.10.60:514        # @@ = TCP (un seul @ = UDP)
systemctl restart rsyslog`,
      `# 4. Journaux de tâches Proxmox + test de bout en bout
ls /var/log/pve/tasks/
pvesh get /cluster/tasks --output-format json | head
logger -p user.warning "test de centralisation" && tail -1 /var/log/syslog`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Syslog</span> → consultation et filtrage de /var/log/syslog depuis la GUI",
      "<span class='wb-path'>Node → Shell</span> → journalctl -u pvestatd -n 100 (équivalent CLI du journal systemd)",
      "<span class='wb-path'>VM/CT → Tasks → clic sur une tâche → View Log</span> → journal détaillé d'un backup ou d'une migration",
      "<span class='wb-path'>Datacenter → panneau Tasks (bas de l'arborescence)</span> → historique global des tâches du cluster",
      "<span class='wb-path'>Serveur central (Loki / Graylog)</span> → recherche cross-nœuds « pveproxy », dashboards de volumes de logs"
    ],
    diagram: 'mon-logs',
    terminology: ['journald', 'syslog', 'rsyslog', 'pveproxy', 'pvestatd', 'Nœud (node)'],
    concepts: [
      { term: 'Journal binaire', def: "Format de journald : indexé et riche en métadonnées (unité, PID, facility), mais lisible uniquement via journalctl." },
      { term: 'Facility / gravité', def: "Classification syslog : facility (daemon, kern, auth…) et niveau (emerg → debug) qui servent de filtres à la centralisation." },
      { term: 'Task log', def: "Journal propre à chaque opération Proxmox (UPID) : stocké sous /var/log/pve/tasks et affiché par le bouton View Log." },
      { term: 'Forward rsyslog', def: "Règle *.* @@serveur:514 poussant tous les messages vers le serveur central, idéalement en TCP + TLS." },
      { term: 'Rotation', def: "logrotate coupe /var/log/syslog quotidiennement ; journald borne sa taille (SystemMaxUse) et sa durée (MaxRetentionSec)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Sans configuration, journald peut consommer plusieurs Go : fixez SystemMaxUse dans /etc/systemd/journald.conf et surveillez /var/log sur les nœuds." },
      { type: 'info', icon: 'fa-circle-info', text: "Les logs d'authentification (auth.log) et le syslog du pare-feu Proxmox sont précieux en audit sécurité : centralisez-les impérativement hors des nœuds." }
    ],
    table: {
      headers: ['Destination', 'Format', 'Outil', 'Usage'],
      rows: [
        ['journald (/var/log/journal)', 'Binaire indexé', 'journalctl', 'Debug services, corrélation unité/PID'],
        ['/var/log/syslog', 'Texte', 'rsyslog + logrotate', 'Compatibilité outils, grep rapide'],
        ['Serveur central :514', 'Texte / JSON', 'rsyslog forward', 'Centralisation multi-nœuds, rétention longue'],
        ['Loki / Graylog / Elastic', 'Indexé', 'Collecteurs', 'Recherche avancée, dashboards, alertes sur logs']
      ]
    }
  },

  {
    id: 'alertes',
    track: 'monitoring',
    level: 'avance',
    title: 'Alertes : seuils, notifications, automation',
    icon: 'fa-solid fa-bell',
    step: '48',
    requires: ['influxdb-grafana'],
    description: 'Les métriques ne valent que par les alertes qu\'elles déclenchent : Proxmox VE 8.1+ intègre un système de notifications complet, avec des notification targets (email SMTP, Gotify, webhook) et des matchers qui routent chaque événement selon sa gravité ou son origine. Les jobs de sauvegarde et les événements système s\'y raccordent nativement. Côté supervision externe, Grafana Alerting et Prometheus Alertmanager évaluent des règles de seuil (CPU au-dessus de 90 % pendant 10 minutes, nœud injoignable) et notifient par les mêmes canaux. Le vrai travail d\'administrateur est le calibrage : un seuil trop bas génère de la fatigue d\'alertes, un seuil trop haut laisse passer les incidents.',
    cliCommands: [
      `# 1. Notifications natives Proxmox VE 8.1+
pvesh get /cluster/notifications/targets
pvesh create /cluster/notifications/targets/smtp --name alertes-cfp \\
  --mailto admin@cfp-cmd.local --from-address pve@cfp-cmd.local \\
  --server smtp.cfp-cmd.local --port 25 --mode starttls
pvesh create /cluster/notifications/matchers --name tout-vers-mail \\
  --targets alertes-cfp`,
      `# 2. Règles Prometheus / Alertmanager (extrait rules.yml)
groups:
  - name: proxmox
    rules:
      - alert: NoeudDown
        expr: pve_up == 0
        for: 5m
      - alert: CpuSature
        expr: pve_cpu_usage_ratio > 0.90
        for: 10m
      - alert: DisquePlein
        expr: pve_storage_usage_bytes / pve_storage_total_bytes > 0.85
        for: 15m

promtool check rules /etc/prometheus/rules.yml`,
      `# 3. Test de bout en bout du canal mail
apt install -y mailutils
echo "Test d'alerte Proxmox VE" | mail -s "[TEST] Alerte CFP-CMD" admin@cfp-cmd.local
journalctl -u postfix -n 20      # vérifier la remise SMTP`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Notifications → Add → Email target</span> → nom, destinataires, serveur SMTP",
      "<span class='wb-path'>Datacenter → Notifications → Add → Notification matcher</span> → cible(s), filtres gravité / origine",
      "<span class='wb-path'>Datacenter → Backup → Edit job → Send email</span> → rapport always/failure via la notification target",
      "<span class='wb-path'>Datacenter → Notifications → bouton Test</span> → envoi immédiat d'un message de test",
      "<span class='wb-path'>Grafana → Alerting → Alert rules → New rule</span> → seuil CPU/RAM/disque + durée + labels",
      "<span class='wb-path'>Grafana → Alerting → Contact points</span> → email, webhook, Slack…"
    ],
    diagram: 'mon-alerts',
    terminology: ['Notification target', 'Matcher', 'Prometheus', 'Grafana', 'Zabbix'],
    concepts: [
      { term: 'Seuil + durée', def: "Une alerte fiable combine un seuil ET une durée (for: 10m) pour éliminer les faux positifs transitoires." },
      { term: 'Gravité', def: "info / warning / average / disaster : les matchers et les politiques de notification trient les envois selon la sévérité." },
      { term: 'Fatigue d\'alertes', def: "Trop de notifications non actionnables rendent les vraies alertes invisibles : prioriser, regrouper, lisser." },
      { term: 'Escalade', def: "Si l'alerte n'est pas acquittée (Zabbix) ou reste active après repeat_interval (Alertmanager), notifier le niveau supérieur." },
      { term: 'Runbook', def: "Chaque alerte doit pointer vers une procédure : quoi vérifier, quelle commande exécuter, qui contacter." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Testez la chaîne complète de bout en bout (bouton Test des targets, mail manuel, alerte volontaire) : une alerte jamais testée échouera le jour de la panne." },
      { type: 'info', icon: 'fa-circle-info', text: "Proxmox VE notifie nativement les échecs de backup et de jobs : raccordez-les au même canal que vos alertes Grafana pour une source de vérité unique." }
    ],
    table: {
      headers: ['Canal', 'Outil', 'Latence', 'Usage typique'],
      rows: [
        ['Email SMTP', 'Notifications PVE / Grafana / Zabbix', 'Secondes à minutes', 'Rapports backup, alertes standards'],
        ['Gotify / push mobile', 'Notifications PVE', 'Secondes', 'Astreinte on-call'],
        ['Webhook / Slack / Teams', 'Alertmanager, Grafana, PVE', 'Secondes', 'Intégration ITSM, salons d\'équipe'],
        ['SMS / appel', 'Passerelle Zabbix / PagerDuty', 'Secondes', 'Alertes critiques P1']
      ]
    }
  },

  {
    id: 'ddm-vue-centralisee',
    track: 'monitoring',
    level: 'avance',
    title: 'Datacenter Manager : vue centralisée',
    icon: 'fa-solid fa-magnifying-glass-chart',
    step: '49',
    requires: ['influxdb-grafana'],
    description: 'Le Proxmox Datacenter Manager (PDM) est la réponse officielle à la fragmentation : une console dédiée qui agrège plusieurs clusters Proxmox VE dans une vue unique — santé, CPU, RAM, stockage et VMs de tous les nœuds. Chaque cluster est déclaré comme remote via un compte et un token API dédiés, et PDM offre en prime la migration à distance de VMs entre clusters, même sans stockage partagé. Installé depuis une ISO spécifique sur un serveur autonome (version alpha au moment du labo), il complète plutôt qu\'il ne remplace Grafana et Zabbix, qui restent les outils d\'historique et d\'alerting. Sur le labo CFP-CMD, PDM devient le point d\'entrée de la supervision de niveau 1.',
    cliCommands: [
      `# 1. PDM : ISO dédiée sur un serveur AUTONOME (hors cluster)
# https://www.proxmox.com/en/downloads → Proxmox Datacenter Manager (alpha)
# dd if=pdm-*.iso of=/dev/sdX bs=4M status=progress && sync
# Interface : https://IP_PDM:8006 (root / realm PDM)`,
      `# 2. Sur chaque cluster supervisé : compte + token pour PDM
pveum user add pdm@pve --comment "Proxmox Datacenter Manager"
pveum aclmod / --users pdm@pve --roles PVEAuditor
pveum user token generate pdm@pve pdm --privsep 0`,
      `# 3. Vérifier ce que PDM verra via l'API
pvesh get /cluster/status --output-format json | head -5
pvesh get /nodes --output-format json | head -5
pvesh get /version`
    ],
    guiSteps: [
      "<span class='wb-path'>https://IP_PDM:8006</span> → première connexion root (realm PDM)",
      "<span class='wb-path'>PDM → Remotes → Add</span> → host du cluster, user pdm@pve, secret du token, fingerprint TLS",
      "<span class='wb-path'>PDM → Dashboard</span> → santé agrégée, CPU/RAM/stockage de tous les clusters",
      "<span class='wb-path'>PDM → Datastores</span> → capacité de stockage consolidée multi-clusters",
      "<span class='wb-path'>PDM → VM → Remote Migration</span> → déplacer une VM vers un autre cluster, sans stockage partagé"
    ],
    diagram: 'mon-pdcm',
    terminology: ['Datacenter', 'Cluster', 'Prometheus', 'Grafana', 'Zabbix', 'Metric server'],
    concepts: [
      { term: 'Proxmox Datacenter Manager', def: "Console dédiée (ISO séparée, port 8006) qui agrège plusieurs clusters Proxmox VE : métriques, VMs, migrations inter-clusters." },
      { term: 'Remote', def: "Cluster enregistré dans PDM via host + user + token : l'unité de fédération du Datacenter Manager." },
      { term: 'Fingerprint TLS', def: "Empreinte du certificat du cluster distant, épinglée dans PDM pour sécuriser la première connexion (certificats auto-signés)." },
      { term: 'Remote migration', def: "Migration d'une VM/CT entre clusters indépendants, disque transféré à la volée : impossible avec le seul pvecm." },
      { term: 'Niveau 1 vs niveau 2', def: "PDM répond au « où en sommes-nous ? » (état global temps réel) ; Grafana/Zabbix répondent au « qu'est-ce qui s'est passé ? » (historique et alertes)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "PDM est en version alpha : serveur dédié obligatoire, jamais sur un nœud du cluster supervisé, et pas en production critique sans évaluation préalable." },
      { type: 'info', icon: 'fa-circle-info', text: "Le secret du token pdm@pve doit être stocké avec la même rigueur qu'un mot de passe : il ouvre l'API de tous les clusters déclarés comme remotes." }
    ],
    table: {
      headers: ['Solution', 'Périmètre', 'Points forts', 'Limites'],
      rows: [
        ['GUI Proxmox par cluster', 'Un cluster à la fois', 'Zéro installation, temps réel', 'Aucune vue multi-clusters'],
        ['Proxmox Datacenter Manager', 'Multi-clusters', 'Vue unifiée + migration distante', 'Alpha, historique limité'],
        ['Grafana (InfluxDB / Prometheus)', 'Toutes sources', 'Historique long, dashboards, alertes', 'Pas d\'actions opérationnelles'],
        ['Zabbix', 'Tous équipements', 'Triggers matures, inventaire', 'Configuration initiale plus lourde']
      ]
    }
  }

]);
