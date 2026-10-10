/* ═══════════════════════════════════════════════════════════════════════════
   data/cluster-1.js — Parcours CLUSTERING & HA (sections 23 → 29)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   Contexte CDC : cluster PROXMOX-CFP (pve1/pve2/pve3), réseau corosync
   dédié 10.10.10.0/24 (VLAN 20), quorum n/2+1, Ceph 10.20.20.0/24 + 10.30.30.0/24.
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'creation-cluster',
    track: 'cluster',
    level: 'avance',
    title: 'Création de cluster : pvecm, join, quorum',
    icon: 'fa-solid fa-server',
    step: '23',
    requires: ['interface-web'],
    description: 'Un cluster Proxmox VE regroupe plusieurs nœuds sous une configuration unique, stockée dans pmxcfs (/etc/pve), base de données distribuée répliquée en temps réel via Corosync. La création se fait avec pvecm create sur le premier nœud, puis pvecm add depuis chaque nœud supplémentaire : la topologie doit être planifiée dès le départ, car un nœud ne peut pas rejoindre un autre cluster sans réinstallation. Le quorum (n/2+1 votes) garantit qu\'une seule majorité décide à un instant donné : avec 3 nœuds, 2 votes sont nécessaires pour toute écriture. Le labo CFP-CMD exploite le cluster PROXMOX-CFP de 3 nœuds reliés par un réseau corosync dédié 10.10.10.0/24.',
    cliCommands: [
      `# 1. Sur pve1 : créer le cluster (IP du lien corosync dédié link0)
pvecm create PROXMOX-CFP --link0 10.10.10.11

# 2. Sur pve2 et pve3 : rejoindre le cluster (IP de pve1)
pvecm add 10.10.10.11 --link0 10.10.10.12   # à exécuter sur pve2
pvecm add 10.10.10.11 --link0 10.10.10.13   # à exécuter sur pve3`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Cluster → Create Cluster</span> → Nom PROXMOX-CFP, Lien 0 = 10.10.10.11",
      "<span class='wb-path'>Datacenter → Cluster → Join Information</span> → Copier le bloc d'adhésion (token + fingerprint)",
      "<span class='wb-path'>Node pve2 → Cluster → Join Cluster</span> → Coller l'information, mot de passe root de pve1, IP du lien 0",
      "<span class='wb-path'>Datacenter → Summary</span> → Les 3 nœuds apparaissent dans l'arborescence du cluster",
      "<span class='wb-path'>Datacenter → Cluster</span> → Vérifier quorum, votes et liens corosync de chaque membre"
    ],
    diagram: 'clu-creation',
    terminology: ['pvecm', 'pmxcfs', 'Vote', 'corosync.conf', 'Quorum', 'Cluster'],
    concepts: [
      { term: 'pvecm', def: "Outil CLI de gestion du cluster Proxmox : create, add, status, nodes, delnode, qdevice — équivalent exact des actions GUI." },
      { term: 'pmxcfs', def: "Proxmox Cluster File System — base de données distribuée montée sur /etc/pve, répliquée en temps réel via Corosync sur tous les nœuds." },
      { term: 'Join Information', def: "Bloc généré par le nœud existant (token, fingerprint TLS, configuration) à coller sur le nœud qui rejoint le cluster." },
      { term: 'Lien 0 (link0)', def: "Premier lien Corosync du nœud : adresse IP locale dédiée au trafic de cluster (10.10.10.1x sur le labo CFP-CMD)." },
      { term: 'Quorum perdu', def: "Situation où moins de n/2+1 votes répondent : pmxcfs passe en lecture seule, plus de démarrage ni de migration de VMs." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "pvecm expected <n> force la valeur du quorum attendu : réservez-la aux interventions de maintenance documentées. En production, la perte de quorum doit figer les écritures, jamais être contournée à la main." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Ne créez jamais le cluster avec l'interface de management comme unique lien Corosync quand une NIC dédiée est possible : la saturation du LAN dégraderait le quorum (voir section 24)." }
    ],
    table: {
      headers: ['Taille du cluster', 'Votes total', 'Quorum (n/2+1)', 'Tolérance de panne'],
      rows: [
        ['1 nœud (standalone)', '1', '1', 'Aucune'],
        ['2 nœuds sans QDevice', '2', '2', 'Aucune (quorum perdu dès la 1ʳᵉ panne)'],
        ['2 nœuds + QDevice', '3', '2', '1 nœud'],
        ['3 nœuds — PROXMOX-CFP', '3', '2', '1 nœud'],
        ['5 nœuds', '5', '3', '2 nœuds']
      ]
    }
  },

  {
    id: 'corosync',
    track: 'cluster',
    level: 'avance',
    title: 'Corosync : liens redondants, latence, NIC dédiée',
    icon: 'fa-solid fa-tower-broadcast',
    step: '24',
    requires: ['creation-cluster'],
    description: 'Corosync est le protocole de communication temps réel qui propage la configuration (pmxcfs) et l\'état du quorum entre les nœuds ; il écoute en UDP sur les ports 5404-5405 et exige une latence très faible. Chaque nœud expose un ou plusieurs liens (link0, link1…) : les liens redondants sur des chemins physiques distincts permettent de survivre à la panne d\'un switch ou d\'une NIC. Proxmox recommande une latence inférieure à 5 ms et une NIC dédiée (ou un VLAN isolé) pour le trafic de cluster. Sur le labo CFP-CMD, link0 emprunte le VLAN 20 (10.10.10.0/24), physiquement séparé du VLAN de management et des flux Ceph.',
    cliCommands: [
      `# État des liens Corosync et du quorum
corosync-cfgtool -s      # état de chaque lien (nodeid, status)
corosync-quorumtool -s   # votes, quorum et flags du cluster

# Tester la latence inter-nœuds (cible < 5 ms)
ping -c 5 10.10.10.12`,
      `# Extrait de /etc/pve/corosync.conf — 2 liens par nœud (labo PROXMOX-CFP)
nodelist {
  node { name: pve1  nodeid: 1  ring0_addr: 10.10.10.11  ring1_addr: 192.168.10.11 }
  node { name: pve2  nodeid: 2  ring0_addr: 10.10.10.12  ring1_addr: 192.168.10.12 }
  node { name: pve3  nodeid: 3  ring0_addr: 10.10.10.13  ring1_addr: 192.168.10.13 }
}`,
      `# Après maintenance réseau : redémarrer corosync UN nœud à la fois
systemctl restart corosync
journalctl -u corosync -n 30 --no-pager`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → System → Network</span> → Créer l'interface dédiée (vmbr0.20 → 10.10.10.x/24)",
      "<span class='wb-path'>Datacenter → Cluster</span> → Vérifier les liens et le nodeid de chaque membre",
      "<span class='wb-path'>Node → Shell</span> → nano /etc/pve/corosync.conf → ajouter ring1_addr (lien 1) sur chaque node",
      "<span class='wb-path'>Node → System → Network → Apply Configuration</span> → ifreload -a puis ping inter-nœuds",
      "<span class='wb-path'>Node → Shell</span> → corosync-cfgtool -s → les 2 liens affichés OK (healthy)"
    ],
    diagram: 'clu-corosync',
    terminology: ['Corosync', 'Lien Corosync', 'Latence Corosync', 'corosync.conf', 'pmxcfs', 'Vote'],
    concepts: [
      { term: 'Lien (link)', def: "Chemin réseau distinct reliant un nœud à l'anneau Corosync : link0 obligatoire, link1 et plus pour la redondance (ring0_addr/ring1_addr)." },
      { term: 'knet (Kronosnet)', def: "Couche réseau de Corosync 3 : commute automatiquement le trafic sur les liens sains dès qu'un lien tombe." },
      { term: 'UDP 5404-5405', def: "Ports officiels du trafic Corosync : à laisser ouverts entre tous les nœuds sur chaque lien, sans pare-feu intermédiaire." },
      { term: 'Token (totem)', def: "Jeton du protocole totem circulant entre les nœuds : si le token timeout est dépassé (latence, saturation), le nœud est exclu du quorum." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un seul lien Corosync est un SPOF caché : la panne du switch ou de la NIC concernée fait perdre le quorum au cluster entier, même si les VMs continuent de tourner. Prévoyez link0/link1 sur des NICs et switches distincts." },
      { type: 'danger', icon: 'fa-bolt', text: "Corosync sur un LAN saturé (backups, migrations, Ceph) = token timeout dépassé = nœuds exclus du quorum. NIC dédiée ou QoS stricte obligatoires sur le chemin de cluster." }
    ],
    table: {
      headers: ['Critère', 'Recommandation Proxmox', 'Labo CFP-CMD'],
      rows: [
        ['Latence', '< 5 ms (instabilité au-delà de ~10 ms)', 'LAN local dédié, < 1 ms'],
        ['Bande passante', '≥ 1 Gbps', '1 Gbps (VLAN 20)'],
        ['Liens', '2+ sur chemins physiques distincts', 'link0 10.10.10.0/24 + link1 192.168.10.0/24'],
        ['Support physique', 'NIC dédiée au trafic de cluster', 'VLAN 20 isolé sur le bond principal'],
        ['Coexistence', 'Jamais avec backups/Ceph/migration', 'Ceph 10.20/10.30, backups sur autre VLAN']
      ]
    }
  },

  {
    id: 'qdevice',
    track: 'cluster',
    level: 'avance',
    title: 'QDevice : cluster 2 nœuds avec vote externe',
    icon: 'fa-solid fa-scale-balanced',
    step: '25',
    requires: ['corosync'],
    description: 'À deux nœuds, un cluster Proxmox perd le quorum dès la première panne (2 votes requis sur 2) : le QDevice apporte le vote externe manquant. Le service corosync-qnetd (QNetd) tourne sur une machine tierce — Debian légère, VM hors cluster ou NAS capable — jamais sur un nœud du cluster, et arbitre la majorité. Le vote du QDevice est dynamique : QNetd ne l\'accorde qu\'au côté viable, ce qui rétablit un quorum à 2 votes sur 3 en cas de perte d\'un nœud. Le labo CFP-CMD héberge son QDevice sur la machine d\'administration 192.168.10.60, raccordée aux deux nœuds.',
    cliCommands: [
      `# Sur le serveur QNetd (192.168.10.60 — Debian, HORS cluster)
apt install corosync-qnetd
systemctl enable --now corosync-qnetd`,
      `# Sur CHAQUE nœud du cluster de 2 nœuds
apt install corosync-qdevice
# Depuis un nœud du cluster : déploiement automatique (clés TLS + corosync.conf)
pvecm qdevice setup 192.168.10.60`,
      `# Vérifier le vote externe
pvecm status              # → Qdevice member, votes: 3 (2 nœuds + 1 QDevice)
corosync-qdevice-tool -fvs   # état détaillé côté nœud
# Retirer le QDevice si besoin : pvecm qdevice remove`
    ],
    guiSteps: [
      "<span class='wb-path'>Serveur QNetd → Shell</span> → apt install corosync-qnetd (machine Debian dédiée)",
      "<span class='wb-path'>Node → Shell</span> → pvecm qdevice setup <IP_QNETD> (déploie clés et vote externe)",
      "<span class='wb-path'>Datacenter → Cluster</span> → Le QDevice apparaît dans les informations du cluster",
      "<span class='wb-path'>Datacenter → Summary</span> → Quorum respecté : 3 votes (2 nœuds + 1 QDevice)",
      "<span class='wb-path'>Node → Shell</span> → pvecm status → ligne Qdevice avec votes: 1"
    ],
    diagram: 'clu-qdevice',
    terminology: ['QDevice', 'QNetd', 'Vote', 'Quorum', 'corosync.conf', 'Cluster'],
    concepts: [
      { term: 'corosync-qnetd', def: "Service serveur du QDevice : distribue le vote externe et arbitre la majorité selon un algorithme (ffsplit par défaut, lms)." },
      { term: 'corosync-qdevice', def: "Client installé sur les nœuds : maintient le canal TLS vers QNetd et vote conformément à la décision reçue." },
      { term: 'ffsplit', def: "Algorithme par défaut du QDevice : le vote est attribué au côté qui rassemble le plus de membres actifs du cluster." },
      { term: 'Tie-breaker', def: "Rôle du QDevice : départager un cluster pair (2 nœuds) sans ajouter un 3ᵉ nœud Proxmox complet et coûteux." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "N'installez jamais corosync-qnetd sur un nœud du cluster qu'il arbitre : la machine doit rester indépendante (pannes non corrélées), idéalement sur un switch et une alimentation différents." },
      { type: 'info', icon: 'fa-circle-info', text: "Si le QDevice tombe, le cluster pair redevient sensible (quorum 2/2) mais ne s'arrête pas : tant que les deux nœuds sont vivants, tout continue de fonctionner." }
    ],
    table: {
      headers: ['Scénario (2 nœuds + QDevice)', 'Votes disponibles', 'Quorum', 'Conséquence'],
      rows: [
        ['Les 3 votants en ligne', '3', 'OK (2/3)', 'Fonctionnement normal'],
        ['1 nœud en panne', '2 (nœud + QDevice)', 'OK (2/3)', 'Cluster opérationnel, failover possible'],
        ['QDevice en panne', '2 (les 2 nœuds)', 'OK (2/2)', 'Fonctionne, mais plus de tolérance de panne'],
        ['1 nœud + QDevice en panne', '1', 'PERDU (1/3)', 'Écritures figées, VMs locales continuent de tourner'],
        ['Migration du QNetd', '—', '—', 'pvecm qdevice remove puis setup sur la nouvelle IP']
      ]
    }
  },

  {
    id: 'ha-manager',
    track: 'cluster',
    level: 'avance',
    title: 'HA Manager : groupes, ressources, failover',
    icon: 'fa-solid fa-heart-pulse',
    step: '26',
    requires: ['creation-cluster'],
    description: 'Le HA Manager transforme un cluster en infrastructure tolérante aux pannes : les ressources déclarées (VM ou CT) sont redémarrées automatiquement sur un autre nœud en cas de défaillance. L\'architecture distingue le CRM (Cluster Resource Manager, dans pmxcfs) qui prend les décisions, et les LRM (Local Resource Manager) qui exécutent les actions sur chaque nœud en s\'appuyant sur le watchdog. Le fencing isole brutalement tout nœud suspect : le watchdog le redémarre avant toute reprise de ses ressources, afin d\'éviter un split-brain. Les ressources HA exigent un stockage partagé et sont rangées dans des HA Groups qui définissent priorités et restrictions de nœuds.',
    cliCommands: [
      `# Ajouter la VM 100 et le CT 200 en HA (groupe prod)
ha-manager add vm:100 --group prod --state started
ha-manager add ct:200 --group prod --state started

# État global des ressources HA
ha-manager status`,
      `# Gérer une ressource HA
ha-manager set vm:100 --state stopped     # arrêt propre supervisé par le HA
ha-manager set vm:100 --state disabled    # sortir de la gestion HA
ha-manager migrate vm:100 pve2            # déménagement demandé (migration)
ha-manager relocate vm:100 pve3           # déplacement rapide (redémarrage)`,
      `# Vérifier le watchdog sur un nœud
systemctl status watchdog-mux --no-pager
# Simuler une panne : tuer corosync sur pve2 et observer le failover
pkill -9 corosync   # sur pve2 uniquement — à des fins de test
pvecm status && ha-manager status`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → HA → Groups → Add</span> → Groupe prod : nœuds pve1/pve2/pve3, options restricted et nofailback",
      "<span class='wb-path'>Datacenter → HA → Resources → Add</span> → Ressource vm:100, groupe prod, état started, max_restart/max_relocate",
      "<span class='wb-path'>Datacenter → HA → Status</span> → Suivre les demandes du CRM et l'activité des LRM",
      "<span class='wb-path'>VM → Options</span> → Désactiver Start at boot : le HA gère seul le démarrage des ressources déclarées",
      "<span class='wb-path'>Datacenter → HA → Resources → Migrate</span> → Déménagement manuel d'une ressource vers un nœud cible"
    ],
    diagram: 'clu-ha',
    terminology: ['HA Manager', 'HA Group', 'Ressource HA', 'Failover', 'Fencing', 'Watchdog', 'Recovery', 'Stockage partagé'],
    concepts: [
      { term: 'CRM', def: "Cluster Resource Manager : décisionnaire HA hébergé dans pmxcfs, il planifie les requêtes et arbitre le failover à l'échelle du cluster." },
      { term: 'LRM', def: "Local Resource Manager : agent présent sur chaque nœud, il exécute start/stop/migrate et rafraîchit le watchdog." },
      { term: 'watchdog-mux', def: "Multiplexeur du watchdog : si le LRM ne renouvelle plus son ticket (nœud figé), le matériel redémarre le nœud (fencing)." },
      { term: 'max_restart / max_relocate', def: "Limites de tentatives avant abandon : une fois épuisées, la ressource passe en état error et demande une intervention humaine." },
      { term: 'nofailback', def: "Option d'HA Group : empêche le retour automatique de la ressource vers le nœud de plus haute priorité redevenu disponible." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Une ressource HA sur stockage LOCAL ne peut pas basculer : le disque reste sur le nœud mort. Le HA exige un stockage partagé (Ceph, NFS, iSCSI) ou une réplication ZFS pvesr à 15 min près, au prix d'une perte de données potentielle." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le fencing redémarre brutalement le nœud suspect (watchdog) : une VM non déclarée en HA sur ce nœud redémarre aussi. Déclarez en HA tout ce qui doit survivre à un failover." }
    ],
    table: {
      headers: ['État de la ressource HA', 'Effet', 'Comportement au failover'],
      rows: [
        ['started', 'La ressource doit tourner', 'Redémarrage automatique sur un nœud du groupe'],
        ['stopped', 'La ressource reste arrêtée', 'Recréée à l\'arrêt sur un nœud du groupe'],
        ['disabled', 'Hors gestion HA', 'Aucune action (comme une ressource non HA)'],
        ['ignored', 'Gestion HA suspendue temporairement', 'Le LRM ne touche plus à la ressource'],
        ['error', 'Tentatives épuisées', 'Intervention requise : ha-manager set … --state started']
      ]
    }
  },

  {
    id: 'migration-chaud',
    track: 'cluster',
    level: 'avance',
    title: 'Migration à chaud : live migration, stockage partagé',
    icon: 'fa-solid fa-right-left',
    step: '27',
    requires: ['ha-manager'],
    description: 'La migration déplace une VM ou un CT d\'un nœud à l\'autre sans interruption notable : la live migration copie la RAM par itérations (dirty pages) pendant que la machine continue de servir, puis bascule en quelques millisecondes. Avec un stockage partagé, seul l\'état mémoire voyage : l\'opération est rapide et transparente pour les utilisateurs. Sans stockage partagé, Proxmox peut migrer avec les disques locaux (option with-local-disks) au prix d\'un transfert complet. La compatibilité CPU (le type host est interdit entre générations différentes) et un réseau de migration dédié conditionnent la réussite de l\'opération.',
    cliCommands: [
      `# Live migration de la VM 100 vers pve2 (stockage partagé)
qm migrate 100 pve2 --online

# Live migration avec disques locaux (copie complète)
qm migrate 100 pve2 --online --with-local-disks 1

# Migration d'un conteneur (redémarrage bref)
pct migrate 200 pve2 --restart`,
      `# /etc/pve/datacenter.cfg — isoler le trafic de migration
echo "migration: network=10.10.20.0/24" >> /etc/pve/datacenter.cfg
cat /etc/pve/datacenter.cfg`,
      `# Migrer une ressource HA (le CRM orchestre)
ha-manager migrate vm:100 pve2

# Suivre la progression en direct
tail -f /var/log/syslog | grep -E "migration|qemu"`
    ],
    guiSteps: [
      "<span class='wb-path'>VM → Migrate</span> → Nœud cible pve2, Mode : Online (live migration), vérifier les disques",
      "<span class='wb-path'>CT → Migrate</span> → Mode Restart pour un conteneur avec données locales",
      "<span class='wb-path'>Datacenter → HA → Status</span> → Migrate / Relocate sur une ressource HA",
      "<span class='wb-path'>Datacenter → Options</span> → Vérifier la config (réseau de migration dans datacenter.cfg)",
      "<span class='wb-path'>VM → Summary</span> → Uptime continu après bascule = preuve de la live migration"
    ],
    diagram: 'clu-migration',
    terminology: ['Live migration', 'Stateful migration', 'Stockage partagé', 'qm', 'Failover', 'Nœud (node)'],
    concepts: [
      { term: 'Dirty pages', def: "Pages mémoire modifiées pendant la copie : la live migration effectue des itérations successives jusqu'à réduire le delta final à quelques Mo." },
      { term: 'Offline migration', def: "Migration à froid d'une VM arrêtée : seuls disques et configuration sont copiés, aucune contrainte de compatibilité CPU." },
      { term: 'CPU type et migration', def: "Le type host empêche la live migration entre CPU hétérogènes : sur un cluster mixte, utilisez x86-64-v2-AES." },
      { term: 'datacenter.cfg', def: "Configuration du datacenter : option migration: network=CIDR pour isoler le trafic de migration sur une NIC dédiée." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Une live migration transfère la RAM par le réseau : sur 1 Gbps, 32 Go de mémoire très active peuvent prendre plusieurs minutes. Configurez migration: network= sur une NIC 10 Gbps pour les grosses VMs." },
      { type: 'danger', icon: 'fa-bolt', text: "CPU type host + nœuds hétérogènes = échec ou crash à la reprise. Le labo PROXMOX-CFP utilise 3 nœuds identiques ; sinon basculez le CPU type sur x86-64-v2-AES." }
    ],
    table: {
      headers: ['Critère', 'Live migration (online)', 'Migration offline', 'with-local-disks'],
      rows: [
        ['Interruption', 'Quasi nulle (millisecondes)', 'VM arrêtée', 'Bref freeze final'],
        ['RAM copiée', 'Oui (itérations dirty pages)', 'Non', 'Oui (mode online)'],
        ['Disques', 'Restent sur le stockage partagé', 'Copiés si locaux', 'Copie complète des disques locaux'],
        ['Durée typique', 'Secondes à minutes (selon RAM)', 'Selon taille des disques', 'Selon disques + RAM'],
        ['Contrainte CPU', 'Compatibilité entre nœuds requise', 'Aucune', 'Compatibilité entre nœuds requise']
      ]
    }
  },

  {
    id: 'stockage-partage',
    track: 'cluster',
    level: 'avance',
    title: 'Stockage partagé : Ceph, NFS, iSCSI pour HA',
    icon: 'fa-solid fa-database',
    step: '28',
    requires: ['migration-chaud'],
    description: 'Le stockage partagé est le carburant du HA et de la live migration : les disques des VMs résident sur un backend vu par tous les nœuds, si bien qu\'un nœud reprend le travail d\'un autre sans copie. Trois familles dominent : Ceph RBD (hyperconvergé, répliqué, snapshots — le choix du labo CFP-CMD sur 10.20.20.0/24), NFS (simple, pour VMs peu critiques, backups et ISO) et iSCSI + LVM (SAN existant, bloc pur sans snapshots natifs). Un storage partagé se déclare au niveau Datacenter et apparaît avec la mention Shared ; un storage local n\'est vu que d\'un nœud et bloque tout failover. Le parcours Stockage avancé approfondit Ceph : ici, l\'objectif est de choisir le bon backend pour le HA.',
    cliCommands: [
      `# Vérifier les storages partagés disponibles
pvesm status          # colonne Shared + état Active

# Ceph RBD (hyperconvergence, HA natif)
ceph status && rbd ls cfp-cmd`,
      `# Ajouter un partage NFS (VMs + backups)
pvesm add nfs nfs-shared --server 192.168.10.60 --export /export/vm \\
  --content images,backup --options vers=4.1

# Ajouter une cible iSCSI puis LVM par-dessus (storage partagé)
pvesm add iscsi san-iscsi --portal 192.168.10.70 --target iqn.2024.cfp-cmd:lun1
pvesm add lvm san-lvm --vgname pve-san --base san-iscsi --shared 1 --content images`,
      `# Déplacer le disque d'une VM vers le storage partagé (prérequis HA)
qm move-disk 100 scsi0 ceph-rbd --delete 1
pvesm list ceph-rbd`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Storage → Add → RBD</span> → moniteurs Ceph, pool, content : Disk image",
      "<span class='wb-path'>Datacenter → Storage → Add → NFS</span> → serveur, export, version NFS, contenus",
      "<span class='wb-path'>Datacenter → Storage</span> → Colonne Shared = Oui et état Active pour chaque storage HA",
      "<span class='wb-path'>VM → Hardware → Disk Action → Move Storage</span> → basculer un disque local vers le partagé",
      "<span class='wb-path'>Datacenter → HA → Resources</span> → Vérifier que chaque ressource HA pointe vers un storage partagé"
    ],
    diagram: 'clu-shared',
    terminology: ['Stockage partagé', 'Ceph', 'NFS', 'iSCSI', 'ZFS', 'Content type'],
    concepts: [
      { term: 'Ceph RBD', def: "Bloc distribué répliqué sur les nœuds (3× par défaut) : snapshots, clones et HA natif — socle de l'hyperconvergence Proxmox." },
      { term: 'LUN', def: "Volume bloc exposé par un SAN iSCSI : Proxmox le consomme via LVM (un disque VM = un LV, pas de snapshot natif)." },
      { term: 'Réplication pvesr', def: "Alternative au stockage partagé : ZFS répliqué toutes les X minutes entre nœuds — HA possible mais avec perte de données potentielle." },
      { term: 'SPOF du NAS', def: "Un NFS unique est un point de défaillance unique : le failover déplace la VM, mais si le NAS meurt, plus rien ne tourne." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Ne déclarez jamais une ressource HA sur un storage local ou sur un NAS isolé sans redondance : le failover serait illusoire. Ceph répliqué 3× ou NFS redondé constituent des socles sûrs." },
      { type: 'info', icon: 'fa-circle-info', text: "Le CDC du labo place Ceph public sur 10.20.20.0/24 et le réseau cluster Ceph sur 10.30.30.0/24 : séparez toujours ces flux de Corosync (10.10.10.0/24)." }
    ],
    table: {
      headers: ['Backend', 'Partagé', 'Snapshots', 'Idéal pour'],
      rows: [
        ['Ceph RBD', 'Oui (3 nœuds et +)', 'Oui (copy-on-write)', 'HA + hyperconvergence (PROXMOX-CFP)'],
        ['NFS', 'Oui', 'Selon backend', 'Backups, ISO, VMs peu critiques'],
        ['iSCSI + LVM', 'Oui', 'Non', 'SAN existant, bloc performant'],
        ['ZFS local + pvesr', 'Non (répliqué)', 'Oui', '2 nœuds sans baie, HA approximatif'],
        ['Directory local', 'Non', 'Non', 'ISO, templates — jamais du HA']
      ]
    }
  },

  {
    id: 'datacenter-manager',
    track: 'cluster',
    level: 'avance',
    title: 'Proxmox Datacenter Manager : gestion multi-clusters',
    icon: 'fa-solid fa-building',
    step: '29',
    requires: ['ha-manager'],
    description: 'Proxmox Datacenter Manager (PDCM) est la réponse officielle au multi-clusters : une interface web centralisée qui agrège plusieurs clusters Proxmox VE déclarés comme remotes et offre une vue unifiée des ressources, des mises à jour et des métriques. Chaque cluster se connecte via un utilisateur et un API Token dédiés à privilèges limités, et le PDCM pilote même des migrations inter-clusters lorsque la compatibilité CPU et stockage le permet. C\'est le chaînon manquant entre clusters isolés (sites, filiales, labo vs production) sans outil externe. Sur le labo CFP-CMD, le PDCM superviserait le cluster PROXMOX-CFP et un cluster distant de 2 nœuds + QDevice.',
    cliCommands: [
      `# Installer le Datacenter Manager (machine dédiée ou VM)
apt install proxmox-datacenter-manager
systemctl status proxmox-datacenter-manager
# Interface web : https://IP_PDCM:8443`,
      `# Sur chaque cluster : utilisateur + token dédiés au PDCM
pveum user add pdm-sync@pve --comment "Remote PDCM"
pveum acl modify / --users pdm-sync@pve --roles PVEAuditor
pveum user token add pdm-sync@pve pdm-token --privsep 0`,
      `# Côté nœuds : vérifier la compatibilité de version des remotes
pveversion
# Journal PDCM en cas de souci de synchronisation
journalctl -u proxmox-datacenter-manager -n 50 --no-pager`
    ],
    guiSteps: [
      "<span class='wb-path'>https://IP_PDCM:8443</span> → Connexion à l'interface du Datacenter Manager",
      "<span class='wb-path'>Configuration → Remotes → Add</span> → Host du cluster, utilisateur pdm-sync@pve, token, fingerprint TLS",
      "<span class='wb-path'>Configuration → Remotes → Check</span> → Tester la connexion et les permissions du token",
      "<span class='wb-path'>Dashboard</span> → Vue consolidée : nœuds, VMs/CTs, storages et alertes des 2 clusters",
      "<span class='wb-path'>Remote → Migration</span> → Migration inter-clusters (compatibilité CPU et stockage requise)"
    ],
    diagram: 'clu-pdcm',
    terminology: ['Multi-cluster', 'Datacenter', 'API REST', 'Cluster', 'Live migration', 'Proxmox VE'],
    concepts: [
      { term: 'Remote', def: "Cluster Proxmox déclaré dans le PDCM : connexion HTTPS + API Token avec fingerprint TLS validé." },
      { term: 'Migration inter-clusters', def: "Déplacement d'une VM entre clusters distants : exige des CPU compatibles et un stockage accessible (partagé ou copie)." },
      { term: 'proxmox-datacenter-manager', def: "Paquet/service du PDCM : interface web sur le port 8443 et moteur de synchronisation des remotes." },
      { term: 'Vue fédérée', def: "Agrégation des états et métriques de tous les remotes : complément du HA local, pas un remplacement du quorum de chaque cluster." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le Datacenter Manager est une brique récente : ne la placez pas sur le chemin critique du HA. Chaque cluster doit rester pleinement autonome si le PDCM tombe." },
      { type: 'info', icon: 'fa-circle-info', text: "Donnez au PDCM un rôle en lecture seule (PVEAuditor) sauf besoin de migrations inter-clusters : le principe de moindre privilège s'applique aussi aux remotes." }
    ],
    table: {
      headers: ['Aspect', 'Cluster unique (UI locale)', 'Multi-clusters (PDCM)'],
      rows: [
        ['Connexion', 'https://nœud:8006', 'https://pdcm:8443 (portail unique)'],
        ['Périmètre', 'Un seul cluster', 'Tous les remotes déclarés'],
        ['Migrations', 'Intra-cluster', 'Inter-clusters (compatibilité requise)'],
        ['Authentification', 'root@pam / realm local', 'API Token dédié par cluster'],
        ['Panne du portail', '—', 'Les clusters restent opérationnels']
      ]
    }
  }

]);
