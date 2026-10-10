/* ═══════════════════════════════════════════════════════════════════════════
   data/securite-1.js — Parcours SÉCURITÉ (sections 15 → 18 : pare-feu → IPS)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'pare-feu-proxmox',
    track: 'securite',
    level: 'intermediaire',
    title: 'Pare-feu Proxmox : datacenter, host, VM/CT',
    icon: 'fa-solid fa-shield-halved',
    step: '15',
    requires: ['interface-web'],
    description: 'Le pare-feu Proxmox est un pare-feu stateful intégré, basé sur iptables/nftables, piloté par le service pve-firewall et administrable entièrement depuis la GUI ou la CLI. Il s\'applique à trois niveaux cumulatifs : le datacenter (cluster.fw partagé par tout le cluster), le nœud (host.fw) et chaque VM ou conteneur (fichier <vmid>.fw). Dès le premier jour, les ports critiques du CDC doivent être prévus : 8006 (interface web et API), 22 (SSH), 5900:5999 (consoles VNC), 5404:5405 UDP (Corosync) et les ports Ceph 6789/3300/6800:7300 en cluster. Au labo CFP-CMD, la politique cible est policy_in DROP et policy_out ACCEPT, avec l\'activation du pare-feu au niveau VM d\'abord et au niveau datacenter en dernier.',
    cliCommands: [
      `# Configuration globale — /etc/pve/firewall/cluster.fw (CDC 8.2)
[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT

[RULES]
IN ACCEPT -p tcp -dport 8006       # Interface web + API REST
IN ACCEPT -p tcp -dport 22         # SSH administration
IN ACCEPT -p tcp -dport 5900:5999  # Consoles VNC des VMs
IN ACCEPT -p udp -dport 5404:5405  # Corosync (cluster)
IN ACCEPT -p tcp -dport 6789       # Ceph MON
IN ACCEPT -p tcp -dport 3300       # Ceph MON 2
IN ACCEPT -p tcp -dport 6800:7300  # Ceph OSD / MGR`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Firewall → Options</span> → Firewallservice : Enable (à faire en DERNIER)",
      "<span class='wb-path'>Datacenter → Firewall → Rules</span> → Add : Direction IN, ACCEPT, TCP, ports 8006 / 22 / 5900:5999",
      "<span class='wb-path'>Datacenter → Firewall → Security Group</span> → Créer des groupes de règles réutilisables",
      "<span class='wb-path'>Datacenter → Firewall → IPSet</span> → Listes nommées (admin_hosts, monitoring)",
      "<span class='wb-path'>Node → Firewall</span> → Règles propres au nœud (host.fw : DNS, NTP, services locaux)",
      "<span class='wb-path'>VM → Firewall → Options</span> → Cocher Firewall, Input policy : DROP"
    ],
    diagram: 'sec-firewall-levels',
    terminology: ['Pare-feu Proxmox', 'cluster.fw', 'Security Group', 'IP set', 'Port 8006', 'Corosync auth'],
    concepts: [
      { term: 'Niveau datacenter', def: "Fichier /etc/pve/firewall/cluster.fw : règles, groupes et IP sets partagés instantanément par tous les nœuds du cluster." },
      { term: 'Niveau nœud', def: "Fichier /etc/pve/nodes/<node>/host.fw : règles propres à un hôte, typiquement pour ses services locaux (DNS, NTP, backups)." },
      { term: 'Niveau VM/CT', def: "Fichier /etc/pve/firewall/<vmid>.fw : appliqué aux interfaces de la machine seulement si l'option firewall est cochée sur sa NIC." },
      { term: 'Stateful', def: "Le pare-feu suit les connexions établies via conntrack : seules les nouvelles sessions traversent l'évaluation des règles." },
      { term: 'Macros', def: "Raccourcis prêts à l'emploi (SSH, HTTPS, Ping, SMB…) qui déploient un ensemble de règles nommé dans une seule ligne." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "N'activez jamais le pare-feu du datacenter avant d'avoir écrit les règles 8006 et 22 : avec policy_in DROP, vous perdriez immédiatement la GUI et le SSH sur tous les nœuds." },
      { type: 'info', icon: 'fa-circle-info', text: "Un flux doit être accepté à TOUS les niveaux traversés (datacenter → nœud → VM) : une seule règle DROP en amont suffit à bloquer définitivement un trafic." }
    ],
    table: {
      headers: ['Service', 'Port', 'Protocole', 'Règle conseillée (CDC)'],
      rows: [
        ['Interface web + API', '8006', 'TCP', 'IN ACCEPT -source réseau mgmt'],
        ['SSH', '22', 'TCP', 'IN ACCEPT -source réseau mgmt'],
        ['Consoles VNC', '5900:5999', 'TCP', 'IN ACCEPT (mgmt uniquement)'],
        ['Corosync', '5404:5405', 'UDP', 'IN ACCEPT entre nœuds du cluster'],
        ['Ceph MON', '6789 / 3300', 'TCP', 'IN ACCEPT réseau cluster/Ceph'],
        ['Ceph OSD/MGR', '6800:7300', 'TCP', 'IN ACCEPT réseau cluster/Ceph']
      ]
    }
  },

  {
    id: 'regles-politiques',
    track: 'securite',
    level: 'intermediaire',
    title: 'Règles et politiques : IN/OUT, ACCEPT/DROP/REJECT',
    icon: 'fa-solid fa-list-check',
    step: '16',
    requires: ['pare-feu-proxmox'],
    description: 'Une règle du pare-feu Proxmox tient en une ligne : direction (IN ou OUT), action (ACCEPT, REJECT ou DROP), protocole, port et source ou destination optionnels. Les politiques par défaut policy_in et policy_out décident du sort des paquets sans correspondance : DROP en entrée pour ne laisser ouvert que le nécessaire, ACCEPT en sortie pour ne pas casser apt, DNS et les mises à jour. La différence REJECT/DROP est stratégique : REJECT répond à l\'émetteur (diagnostic facile, mais il confirme que l\'hôte existe), DROP jette le paquet en silence (furtivité, scans ralentis). Les règles s\'évaluent de haut en bas et la première qui correspond décide.',
    cliCommands: [
      `# Syntaxe d'une règle — section [RULES] de cluster.fw ou <vmid>.fw
# <DIRECTION> <ACTION> [-macro] -p <proto> -dport <port> [-source <ip>]
IN  ACCEPT -p tcp -dport 443 -source 192.168.10.0/24
OUT ACCEPT -p udp -dport 53  -destination 192.168.10.53
IN  REJECT -p tcp -dport 3389            # refuse en répondant
IN  DROP   -log warning                  # jette et journalise

# Politiques par défaut — section [OPTIONS]
[OPTIONS]
policy_in: DROP
policy_out: ACCEPT`,
      `# Compiler et contrôler la syntaxe avant activation
pve-firewall compile

# Voir les règles effectives chargées par le noyau
iptables -L -n -v | head -30

# Utiliser une IP set comme source (préfixe +)
ipset list admin_hosts
# IN ACCEPT -p tcp -dport 8006 -source +admin_hosts`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Firewall → Rules</span> → Add : Direction IN, Action ACCEPT, Protocole TCP, Port 8006",
      "<span class='wb-path'>Datacenter → Firewall → Options</span> → Input policy : DROP · Output policy : ACCEPT",
      "<span class='wb-path'>VM → Firewall → Rules</span> → Règles applicatives (80/443 depuis le VLAN mgmt 192.168.10.0/24)",
      "<span class='wb-path'>VM → Firewall → Options</span> → Input policy : DROP par défaut sur chaque machine",
      "<span class='wb-path'>Datacenter → Firewall → Rules → Add</span> → Champ Macro : SSH, HTTPS, Ping…"
    ],
    diagram: 'sec-rules-flow',
    terminology: ['policy_in', 'policy_out', 'DROP', 'REJECT', 'Security Group', 'IP set'],
    concepts: [
      { term: 'Direction IN/OUT', def: "IN filtre le trafic destiné à l'objet, OUT le trafic qu'il émet ; chaque interface (net0, net1…) peut aussi être filtrée séparément." },
      { term: 'ACCEPT', def: "Laisse passer le paquet dès que la règle correspond : à réserver aux flux légitimes documentés (8006, 22, 443…)." },
      { term: 'Première correspondance', def: "Les règles se lisent de haut en bas et la première qui matche décide : placer les ACCEPT fines avant les DROP larges." },
      { term: 'Référence IP set', def: "Un IP set se cite avec le préfixe + dans -source ou -destination (ex. +admin_hosts) : un seul endroit à mettre à jour." },
      { term: 'Security Group', def: "Groupe de règles nommé, applicable à plusieurs VM/CT en une seule ligne : le DRY du pare-feu Proxmox." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "L'ordre des règles est déterminant : une ACCEPT trop large placée en haut neutralise toutes les restrictions situées en dessous." },
      { type: 'info', icon: 'fa-circle-info', text: "REJECT renvoie un TCP RST ou un ICMP unreachable : pratique en interne pour diagnostiquer, mais DROP reste préféré face à Internet." }
    ],
    table: {
      headers: ['Action', 'Réponse à l\'émetteur', 'Cas d\'usage', 'Point de vigilance'],
      rows: [
        ['ACCEPT', '—', 'Flux légitimes (8006, 22, 443)', 'Trop large = surface d\'attaque'],
        ['REJECT', 'RST / ICMP unreachable', 'Diagnostic interne, services interdits', 'Confirme que l\'hôte existe'],
        ['DROP', 'Aucune (silence)', 'Politique par défaut, ports inutiles', 'Rend le diagnostic plus difficile'],
        ['policy_in', 'Selon valeur', 'Entrant sans correspondance', 'DROP = tout fermé par défaut'],
        ['policy_out', 'Selon valeur', 'Sortant sans correspondance', 'ACCEPT évite de casser apt/DNS']
      ]
    }
  },

  {
    id: 'logging-firewall',
    track: 'securite',
    level: 'intermediaire',
    title: 'Logging firewall : LOGID, niveaux, analyse',
    icon: 'fa-solid fa-file-shield',
    step: '17',
    requires: ['regles-politiques'],
    description: 'Chaque règle et chaque politique du pare-feu Proxmox porte un niveau de journalisation (nolog, debug… emerg), fixé par l\'option -log d\'une règle ou globalement par log_level_in / log_level_out. Les paquets bloqués émettent une ligne dans le journal du noyau portant un LOGID numérique (ex. 7400) qui identifie la règle ou la fonction à l\'origine du drop. Ces lignes se lisent dans la GUI (Node → Firewall → Log), via journald ou dans /var/log/kern.log, et l\'analyse des LOGID révèle rapidement les scans, les erreurs de configuration et les flux légitimes oubliés. Bonne pratique : journaliser les DROP en warning, les ACCEPT sensibles en info, et réserver debug au dépannage ponctuel.',
    cliCommands: [
      `# Niveaux globaux — section [OPTIONS] de cluster.fw
[OPTIONS]
log_level_in:  warning
log_level_out: nolog

# Niveau par règle (remplace le niveau global pour cette règle)
IN ACCEPT -p tcp -dport 22 -log info
IN DROP   -log warning`,
      `# Suivre les drops du pare-feu en temps réel
journalctl -k -f | grep -E 'DROP|REJECT|LOGID'

# Retrouver les derniers drops d'une IP source
grep 'SRC=192.168.10.99' /var/log/kern.log | tail -20

# Top des ports ciblés par les drops (analyse de scans)
grep -oP 'DPT=\\d+' /var/log/kern.log | sort | uniq -c | sort -rn | head`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Firewall → Log</span> → Vue temps réel des lignes de log, filtre par mot-clé",
      "<span class='wb-path'>Datacenter → Firewall → Options</span> → Log level in : warning · Log level out : nolog",
      "<span class='wb-path'>Datacenter → Firewall → Rules</span> → Éditer une règle → champ Log level",
      "<span class='wb-path'>Node → Syslog</span> → Journal complet du nœud, recherche par LOGID ou par IP"
    ],
    diagram: 'sec-logging',
    terminology: ['LOGID', 'DROP', 'REJECT', 'Pare-feu Proxmox', 'cluster.fw'],
    concepts: [
      { term: 'Niveau de log', def: "Échelle syslog appliquable par règle ou globalement : nolog, debug, info, notice, warning, err, crit, alert, emerg." },
      { term: 'Format de ligne', def: "Exemple : DROP: IN=vmbr0 OUT= SRC=1.2.3.4 DST=192.168.10.11 PROTO=TCP DPT=3389 LOGID:7400… — tout est dans la ligne." },
      { term: 'Plages de LOGID', def: "Chaque plage d'identifiants correspond à une origine (règles host, macros, conntrack…) : la table est documentée dans le Proxmox VE Administration Guide." },
      { term: 'Rotation et export', def: "Les journaux noyau suivent la rotation Debian (logrotate) : pour une rétention longue, exporter vers un SIEM (parcours Monitoring)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Journaliser en debug sur un nœud chargé génère un volume d'écritures très important : réservez ce niveau à un dépannage temporaire puis revenez à warning." },
      { type: 'info', icon: 'fa-circle-info', text: "Commencez toujours par la GUI (Node → Firewall → Log) qui colore et filtre les LOGID avant d'attaquer journald en SSH." }
    ],
    table: {
      headers: ['Niveau', 'Effet', 'Usage recommandé'],
      rows: [
        ['nolog', 'Aucune ligne journalisée', 'Flux bruitants (DHCP, broadcast)'],
        ['debug', 'Tout, très verbeux', 'Dépannage temporaire uniquement'],
        ['info', 'Détail exploitable', 'ACCEPT sensibles (SSH, 8006)'],
        ['notice', 'Événements normaux notables', 'Suivi ponctuel'],
        ['warning', 'Anomalies signalées', 'DROP par défaut (conseillé)'],
        ['err → emerg', 'Erreurs graves', 'À intégrer dans les alertes SIEM']
      ]
    }
  },

  {
    id: 'ips-suricata',
    track: 'securite',
    level: 'avance',
    title: 'IPS Suricata : intégration, NFQUEUE',
    icon: 'fa-solid fa-bug-slash',
    step: '18',
    requires: ['logging-firewall'],
    description: 'Suricata est un moteur IDS/IPS open source qui inspecte les paquets en profondeur (L3 à L7) avec des règles au format Snort. En mode IPS inline, Proxmox déporte la décision ACCEPT/DROP à Suricata via la cible NFQUEUE : le noyau place le paquet dans une file, Suricata l\'analyse puis renvoie son verdict. Cette intégration se superpose au pare-feu Proxmox : les règles firewall filtrent d\'abord les ports, Suricata inspecte ensuite le contenu autorisé. Au labo CFP-CMD (Lab 5), on limite l\'IPS au trafic des VMs exposées pour contenir la charge CPU, et on garde le mode IDS passif pour la détection sur tout le reste.',
    cliCommands: [
      `# 1. Installation et jeux de règles
apt install -y suricata suricata-update
suricata-update update-sources
suricata-update   # → /var/lib/suricata/rules/suricata.rules`,
      `# 2. Déclarer la file NFQUEUE — /etc/suricata/suricata.yaml
nfqueue:
  - queue: 1
    max-pending-packets: 1024
    fail-open: yes

# 3. Envoyer le trafic des VMs vers Suricata (IPS inline)
iptables -I FORWARD -j NFQUEUE --queue-num 1 --queue-bypass

# 4. Variante IDS passive (aucun blocage, miroir)
suricata -c /etc/suricata/suricata.yaml --af-packet -i vmbr0`,
      `# 5. Démarrer et observer les alertes
systemctl restart suricata
systemctl status suricata --no-pager
tail -f /var/log/suricata/eve.json | grep '"alert"'`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Shell</span> → apt install suricata suricata-update",
      "<span class='wb-path'>Node → Shell</span> → suricata-update puis systemctl restart suricata",
      "<span class='wb-path'>Node → Shell</span> → iptables -I FORWARD -j NFQUEUE --queue-num 1 --queue-bypass",
      "<span class='wb-path'>Node → Firewall → Rules</span> → Réduire la surface : seuls les ports utiles atteignent l'IPS",
      "<span class='wb-path'>Node → Shell</span> → tail -f /var/log/suricata/eve.json (suivre les alertes)"
    ],
    diagram: 'sec-suricata',
    terminology: ['Suricata', 'NFQUEUE', 'DROP', 'LOGID', 'Pare-feu Proxmox'],
    concepts: [
      { term: 'IDS vs IPS', def: "IDS = détection passive sur une copie du trafic (alertes) ; IPS = inline, Suricata renvoie un verdict ACCEPT/DROP et bloque réellement." },
      { term: 'fail-open', def: "Avec --queue-bypass, si Suricata tombe, les paquets repassent sans inspection : disponibilité avant sécurité — un choix à assumer." },
      { term: 'eve.json', def: "Journal JSON structuré de Suricata (alertes, flux, HTTP, DNS) : la source idéale pour un SIEM ou une corrélation ELK." },
      { term: 'Rulesets', def: "suricata-update agrège les jeux ET/open (emerging-threats, malware, scan) : planifier une mise à jour quotidienne." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un IPS inline consomme du CPU proportionnellement au débit inspecté : filtrez d'abord avec les règles firewall (policy_in DROP) et n'envoyez à NFQUEUE que le trafic utile." },
      { type: 'info', icon: 'fa-circle-info', text: "Proxmox ne livre pas d'IPS clé en main : l'intégration NFQUEUE est une personnalisation à valider en labo (Lab 5) avant toute production." }
    ],
    table: {
      headers: ['Critère', 'IDS (passif)', 'IPS (NFQUEUE inline)'],
      rows: [
        ['Position', 'Miroir / af-packet', 'Dans le chemin du flux'],
        ['Blocage', 'Non (alertes seules)', 'Oui (verdict ACCEPT/DROP)'],
        ['Risque', 'Aucun impact réseau', 'Coupure si le moteur tombe (fail-open)'],
        ['CPU', 'Faible (copie du trafic)', 'Élevé (tout le trafic inspecté)'],
        ['Usage CFP-CMD', 'Veille globale du labo', 'VMs exposées uniquement']
      ]
    }
  }
]);
