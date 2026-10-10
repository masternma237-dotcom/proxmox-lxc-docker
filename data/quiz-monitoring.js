/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-monitoring.js — Banques de quiz du parcours Monitoring
   Format : [question, [options], indexBonneRéponse, explication]
   4 questions par section (43 → 49), mélangées au rendu par js/quiz.js.
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'metriques-natives': [
    ["Quel daemon collecte les statistiques affichées dans les graphiques Proxmox VE ?",
     ["pvestatd", "pveproxy", "pvedaemon", "corosync"], 0,
     "pvestatd sonde nœuds, VMs et CTs en continu et alimente les bases RRD des graphiques."],
    ["Dans quel format les métriques natives sont-elles stockées ?",
     ["Bases RRD (round-robin)", "Fichiers CSV", "Base PostgreSQL", "JSON Lines"], 0,
     "Les séries sont écrites dans des RRD sous /var/lib/rrdcached/db via rrdcached."],
    ["Que devient la résolution des graphiques RRD sur un an ?",
     ["Elle se dégrade (points espacés de plusieurs heures)", "Elle reste à la minute", "Elle augmente avec le temps", "Elle est illimitée"], 0,
     "RRD agrège : ≈ 1 minute sur l'heure jusqu'à ≈ 9 heures sur l'année — d'où l'export externe."],
    ["Quelle commande renvoie les données brutes d'un graphique de nœud ?",
     ["pvesh get /nodes/pve1/rrddata --timeframe hour", "qm status 100", "pvesm status", "zpool status"], 0,
     "L'endpoint /nodes/{node}/rrddata expose les mêmes séries que les graphiques de la GUI."]
  ],

  'pve-exporter': [
    ["Quel compte utiliser pour pve-exporter selon le moindre privilège ?",
     ["monitor@pve avec le rôle PVEAuditor", "root@pam", "root@pve", "Un compte administrateur complet"], 0,
     "PVEAuditor est en lecture seule : suffisant pour exporter les métriques, minimal en cas de compromission."],
    ["Sur quel port pve-exporter publie-t-il ses métriques ?",
     ["9221", "8006", "3000", "8089"], 0,
     "L'endpoint /metrics écoute sur le port 9221 : cible du job de scrape Prometheus."],
    ["Où pve-exporter lit-il ses identifiants API ?",
     ["/etc/pve-exporter/config.yml", "/etc/pve/pve.cfg", "/var/lib/pve-exporter.env", "Dans la base Prometheus"], 0,
     "Le fichier config.yml (host, port, user, password) est passé au binaire via l'option -config (CDC 3.6)."],
    ["Que fait Prometheus vis-à-vis de pve-exporter ?",
     ["Il scrape l'endpoint /metrics à intervalle fixe", "Il pousse des règles vers l'exporter", "Il exécute pvestatd", "Il écrit dans les RRD"], 0,
     "Modèle pull : Prometheus collecte (scrape) les métriques à chaque scrape_interval."]
  ],

  'influxdb-grafana': [
    ["Quel composant Proxmox pousse les métriques vers InfluxDB ?",
     ["Le Metric Server (Datacenter → Metric Server)", "pvestatd directement", "Le Qemu Guest Agent", "pve-firewall"], 0,
     "Le Metric Server envoie les séries du cluster vers InfluxDB ou Graphite en Line protocol."],
    ["Quel port/protocole utilise le flux vers InfluxDB ?",
     ["8089 en UDP ou HTTP", "514 en TCP", "161 en UDP", "9221 en HTTP"], 0,
     "InfluxDB écoute le Line protocol sur le port 8089 (UDP historique, HTTP avec token en production)."],
    ["Qu'apporte InfluxDB 2.x pour ce cas d'usage ?",
     ["Organisations, buckets et authentification par token", "Des graphiques dans la GUI Proxmox", "Le protocole SNMP", "La réplication Ceph"], 0,
     "InfluxDB 2.x organise les données en buckets avec rétention par bucket et token obligatoire."],
    ["Comment Grafana interroge-t-il InfluxDB 2.x ?",
     ["En langage Flux", "En SQL pur", "Via SNMP", "Via journalctl"], 0,
     "Grafana utilise le langage Flux : from(bucket: …) |> range(…) |> filter(…)."]
  ],

  'snmp-zabbix': [
    ["Qu'est-ce qu'un OID en SNMP ?",
     ["Un identifiant numérique hiérarchique d'une métrique dans la MIB", "Un mot de passe de communauté", "Un port UDP", "Un template Zabbix"], 0,
     "L'OID (.1.3.6.1…) désigne précisément un objet dans l'arborescence MIB."],
    ["Quel agent installe-t-on sur le nœud Proxmox pour la supervision SNMP ?",
     ["snmpd", "zabbix-agent2 obligatoire", "telegraf", "pve-snmp"], 0,
     "snmpd écoute sur UDP 161 et répond aux requêtes selon /etc/snmp/snmpd.conf."],
    ["Pourquoi préférer SNMP v3 en production ?",
     ["La communauté v2c circule en clair sur le réseau", "v3 est plus rapide", "v2c est incompatible avec Zabbix", "v3 supprime les MIB"], 0,
     "SNMP v3 ajoute authentification et chiffrement (authPriv), absents de la v2c."],
    ["Que supervisent les OID de la branche UCD (.1.3.6.1.4.1.2021) ?",
     ["Mémoire, disques et charge du système", "Les VMs internes au cluster", "Uniquement la MIB-2", "Les sauvegardes vzdump"], 0,
     "La branche UCD (Linux) expose mem, dsk et load, utilisés par le template SNMP de Zabbix."]
  ],

  'logs-journald': [
    ["Quelle commande suit le journal d'un service en temps réel ?",
     ["journalctl -u pveproxy -f", "tail /etc/passwd", "journalctl --rotate", "logrotate -f"], 0,
     "journalctl -u <unité> -f suit le journal systemd de l'unité en continu."],
    ["Où sont stockés les journaux des tâches Proxmox (backup, migration) ?",
     ["/var/log/pve/tasks", "/var/log/tasks.db", "/root/.tasks", "Uniquement dans le journal binaire"], 0,
     "Chaque tâche a son journal sous /var/log/pve/tasks, affiché par le bouton View Log de la GUI."],
    ["Quel fichier configure les bornes de rétention de journald ?",
     ["/etc/systemd/journald.conf", "/etc/rsyslog.conf", "/etc/logrotate.conf", "/etc/pve/journal.cfg"], 0,
     "SystemMaxUse (taille) et MaxRetentionSec (durée) dans journald.conf contrôlent la rétention."],
    ["Quelle règle rsyslog centralise tous les messages en TCP ?",
     ["*.* @@192.168.10.60:514", "*.info @127.0.0.1", "*.* >localhost", "console.* -/dev/tty"], 0,
     "@@ désigne le transfert TCP (un seul @ = UDP) vers le serveur central sur le port 514."]
  ],

  'alertes': [
    ["Qu'est-ce qu'une notification target dans Proxmox VE 8.1+ ?",
     ["La destination d'une notification (email, Gotify, webhook)", "Un seuil CPU", "Un matcher de gravité", "Un job de backup"], 0,
     "Les targets reçoivent les notifications ; les matchers les routent vers les targets."],
    ["Pourquoi associer une durée (for: 10m) à un seuil d'alerte ?",
     ["Éviter les faux positifs transitoires", "Réduire la charge de Prometheus", "Compter les alertes", "Chiffrer les notifications"], 0,
     "La condition doit persister : un pic de quelques secondes ne déclenche pas une alerte calibrée pour 10 minutes."],
    ["Comment tester rapidement un endpoint de notification natif ?",
     ["Le bouton Test de Datacenter → Notifications", "promtool test inbox", "pveum test notify", "qm notify"], 0,
     "La GUI propose un envoi de test ; côté CLI, un mail manuel (mailutils) valide le chemin SMTP."],
    ["Qu'est-ce que la fatigue d'alertes ?",
     ["Des notifications trop nombreuses qui font ignorer les vraies alertes", "Un bug de Grafana", "L'expiration des tokens API", "Une panne d'Alertmanager"], 0,
     "Des seuils mal calibrés génèrent un bruit permanent : les incidents réels passent inaperçus."]
  ],

  'ddm-vue-centralisee': [
    ["Qu'apporte le Proxmox Datacenter Manager ?",
     ["Une vue centralisée de plusieurs clusters + migration distante", "Un remplacement de Grafana", "Une nouvelle version de corosync", "Un backup dédupliqué"], 0,
     "PDM agrège les remotes (métriques, VMs, stockage) et permet la migration inter-clusters."],
    ["Où installe-t-on Proxmox Datacenter Manager ?",
     ["Sur un serveur autonome dédié (ISO spécifique)", "Sur le premier nœud du cluster", "Dans chaque VM", "Sur le PBS"], 0,
     "PDM possède sa propre ISO : jamais sur un nœud supervisé (version alpha en plus)."],
    ["Quel compte expose-t-on à PDM sur chaque cluster ?",
     ["pdm@pve avec PVEAuditor + token API", "root@pam sans token", "Un compte administrateur complet", "monitor@pve!pdm sans rôle"], 0,
     "PVEAuditor suffit à la supervision ; le token (privsep 0) autorise en plus les migrations distantes."],
    ["Que vérifie-t-on en premier après l'ajout d'un remote dans PDM ?",
     ["Le fingerprint TLS et la remontée des nœuds dans le dashboard", "La version de Grafana", "Le mot de passe root", "Le quota de la GUI"], 0,
     "L'empreinte du certificat sécurise la connexion ; le dashboard confirme la remontée des nœuds."]
  ]
});
