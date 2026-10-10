/* ═══════════════════════════════════════════════════════════════════════════
   data/labs.js — Parcours LABS & ÉVALUATION (sections 64 → 70)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   Labo CDC : pve1/pve2/pve3 · mgmt 192.168.10.0/24 (VLAN 10) · corosync
   10.10.10.0/24 (VLAN 20) · ceph public 10.20.20.0/24 (VLAN 30) · ceph
   cluster 10.30.30.0/24 (VLAN 40) · VMs prod 10.100.0.0/24 (VLAN 100) ·
   VMs test 10.200.0.0/24 (VLAN 200)
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'lab0-preparation',
    track: 'labs',
    level: 'debutant',
    title: 'Lab 0 : préparer le labo (3 nœuds, réseau isolé)',
    icon: 'fa-solid fa-screwdriver-wrench',
    step: '64',
    requires: ['validation-fondamentaux'],
    description: "Ce labo d'amorçage construit l'environnement commun à tous les travaux pratiques : trois nœuds Proxmox VE nommés pve1, pve2 et pve3, installés depuis l'ISO et complètement isolés du réseau de production du CFP. Le câblage suit le plan d'adressage officiel du CDC : management en 192.168.10.0/24 (VLAN 10), Corosync en 10.10.10.0/24 (VLAN 20), Ceph public en 10.20.20.0/24 (VLAN 30) et Ceph cluster en 10.30.30.0/24 (VLAN 40). Un nœud de référence est transformé en template afin de produire des clones lab réutilisables, ce qui permet de reconstruire la maquette en quelques minutes après chaque scénario de panne. Chaque manipulation est consignée dans le journal de labo et un snapshot « lab-sain » marque l'état de départ validé de la maquette.",
    steps: [
      { title: "Préparer le support", detail: "Inventorier le matériel (ou créer 3 VMs imbriquées sur un hyperviseur de labo : 4 vCPU, 8 Go RAM, 2 disques chacune). Télécharger l'ISO Proxmox VE et vérifier son empreinte : sha256sum proxmox-ve_*.iso. Préparer le switch du labo avec les VLANs 10, 20, 30, 40, 100 et 200." },
      { title: "Installer pve1", detail: "Boot sur l'ISO, « Install Proxmox VE (Graphical) », filesystem ZFS (RAID1 si 2 disques OS), mot de passe root solide, IP de management 192.168.10.11/24 sur le VLAN 10, gateway du labo, hostname pve1.cfp-cmd.local." },
      { title: "Installer pve2 et pve3", detail: "Même procédure avec 192.168.10.12 et 192.168.10.13 (VLAN 10). Noter chaque IP, chaque mot de passe et chaque FQDN dans le journal de labo." },
      { title: "Câbler les VLANs du CDC", detail: "Sur chaque nœud : créer vmbr0 (mgmt VLAN 10), vmbr1 (corosync 10.10.10.1x/24), vmbr2 (Ceph public 10.20.20.1x/24), vmbr3 (Ceph cluster 10.30.30.1x/24) puis ifreload -a. Un ping doit traverser chaque sous-réseau entre les 3 nœuds." },
      { title: "Basculer les dépôts et mettre à jour", detail: "Activer pve-no-subscription, supprimer le dépôt entreprise, puis apt update && apt full-upgrade -y sur les 3 nœuds. Installer les outils des labs : htop, iperf3, fio, iftop." },
      { title: "Fabriquer le nœud de référence", detail: "Sur pve1 : finaliser la configuration (hostname, hosts, NTP), éteindre puis convertir la VM imbriquée 900 en template — qm template 900 — pour servir de modèle aux clones lab. Pour des nœuds physiques, exporter à la place un script d'installation commun." },
      { title: "Dériver les clones lab", detail: "qm clone 900 902 --name pve2-lab --full 1 (idem 903) si les nœuds sont des VMs ; adapter hostname et IPs à chaque clone. Vérifier la connectivité : ping 192.168.10.12, 10.10.10.13, 10.20.20.13, 10.30.30.12 depuis pve1." },
      { title: "Figer et documenter", detail: "Prendre un snapshot « lab-sain » sur chaque nœud, remplir le plan d'adressage dans le journal de labo (tableau du CDC 8.1) et lister les accès (URLs :8006, comptes). Le labo est prêt pour les labs 1 à 5." }
    ],
    checklist: [
      "Les 3 nœuds répondent en HTTPS :8006 et en SSH sur 192.168.10.11/12/13 (VLAN 10)",
      "Les 4 VLANs d'infrastructure (10/20/30/40) sont câblés et chaque sous-réseau répond au ping entre nœuds",
      "Dépôt no-subscription actif, dépôt entreprise supprimé, apt full-upgrade sans erreur sur les 3 nœuds",
      "Un template (ou un script) de nœud de référence produit des clones lab fonctionnels",
      "Un snapshot « lab-sain » est pris sur chacun des 3 nœuds",
      "Le journal de labo contient le plan d'adressage complet et les accès (CDC 8.1)",
      "Aucune interface du labo n'est routée vers le réseau de production du CFP"
    ],
    cliCommands: [
      `# pve1 — /etc/network/interfaces (extrait : les 4 VLANs d'infrastructure du CDC)
auto vmbr0
iface vmbr0 inet static
    address 192.168.10.11/24     # VLAN 10 — Management
    bridge-ports enp1s0.10
    bridge-stp off
    bridge-fd 0

auto vmbr1
iface vmbr1 inet static
    address 10.10.10.11/24       # VLAN 20 — Corosync
    bridge-ports enp1s0.20

auto vmbr2
iface vmbr2 inet static
    address 10.20.20.11/24       # VLAN 30 — Ceph public
    bridge-ports enp1s0.30

auto vmbr3
iface vmbr3 inet static
    address 10.30.30.11/24       # VLAN 40 — Ceph cluster
    bridge-ports enp1s0.40

ifreload -a`,
      `# Dépôts de formation + mises à jour (sur chaque nœud)
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" \\
  > /etc/apt/sources.list.d/pve.list
rm -f /etc/apt/sources.list.d/pve-enterprise.list
apt update && apt full-upgrade -y
apt install -y htop iperf3 fio iftop

# Vérifications de bout en bout
pveversion
ip -br a
ping -c2 192.168.10.12 && ping -c2 10.10.10.13 && ping -c2 10.20.20.13

# Template de référence puis clones lab (nœuds en VMs imbriquées)
qm shutdown 900 && qm wait 900
qm template 900
qm clone 900 902 --name pve2-lab --full 1
qm clone 900 903 --name pve3-lab --full 1`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → System → Network</span> → Créer vmbr0 à vmbr3 et attribuer les IP des VLANs 10/20/30/40",
      "<span class='wb-path'>Node → Updates → Repositories</span> → Basculer sur pve-no-subscription, désactiver pve-enterprise",
      "<span class='wb-path'>Datacenter → Storage</span> → Vérifier local (ISO/templates) et local-zfs actifs",
      "<span class='wb-path'>VM 900 → Clone</span> → Mode Full Clone vers pve2-lab et pve3-lab",
      "<span class='wb-path'>VM → Snapshots → Take Snapshot</span> → Snapshot « lab-sain » sur chaque nœud"
    ],
    diagram: 'lab-topology',
    terminology: ['Lab isolé', 'Clone lab', 'Bare-metal', 'FQDN', 'Dépôt no-subscription', 'Nœud (node)'],
    concepts: [
      { term: 'Lab isolé', def: "Maquette coupée du réseau de production : VLANs dédiés, aucun routage sortant, snapshots de retour arrière. Toutes les manipulations destructives des labs 1 à 5 s'y déroulent sans risque." },
      { term: 'Clone lab', def: "Copie dérivée d'un nœud (ou VM/CT) de référence transformé en template : la maquette se reconstruit en quelques minutes dans un état connu et validé." },
      { term: 'Journal de labo', def: "Document vivant du formateur/apprenant : plan d'adressage, commandes saisies, mesures, incidents et conclusions de chaque lab." },
      { term: "Plan d'adressage", def: "Tableau officiel des sous-réseaux du CDC (mgmt, corosync, Ceph public, Ceph cluster, VMs prod, VMs test) : une seule source de vérité pour tout le câblage." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Aucun réseau du labo (notamment les VLANs 20, 30 et 40) ne doit être routé vers le LAN de production du CFP : un Corosync ou un Ceph exposé peut saturer le réseau et perturber les autres salles. L'isolation est un critère de validation de ce lab." },
      { type: 'info', icon: 'fa-circle-info', text: "Reprenez systématiquement le snapshot « lab-sain » avant chaque lab avancé : le rollback est le moyen le plus rapide de repartir d'une base propre après un scénario de panne." }
    ],
    table: {
      headers: ['Réseau', 'Sous-réseau', 'VLAN', 'Rôle dans le labo'],
      rows: [
        ['Management', '192.168.10.0/24', '10', "GUI :8006, SSH, API, accès formateur, QDevice"],
        ['Corosync', '10.10.10.0/24', '20', "Battement du cluster, latence < 5 ms exigée"],
        ['Ceph public', '10.20.20.0/24', '30', "Traffic clients / MON / OSD (RBD)"],
        ['Ceph cluster', '10.30.30.0/24', '40', "Réplication interne OSD vers OSD"],
        ['VMs production', '10.100.0.0/24', '100', "Workloads de démonstration"],
        ['VMs test', '10.200.0.0/24', '200', "VMs des labs, Docker, poste d'attaque"]
      ]
    }
  },

  {
    id: 'lab1-cluster-ha',
    track: 'labs',
    level: 'avance',
    title: 'Lab 1 : cluster HA, quorum, QDevice, test de failover',
    icon: 'fa-solid fa-server',
    step: '65',
    requires: ['lab0-preparation', 'creation-cluster', 'qdevice', 'ha-manager'],
    description: "Ce lab transforme les trois nœuds standalone en cluster Proxmox VE opérationnel, avec un quorum garanti par un QDevice et un gestionnaire de haute disponibilité actif. Vous créerez le cluster sur le réseau Corosync dédié (VLAN 20), rejoindrez pve2 et pve3, installerez corosync-qnetd sur le serveur du formateur et déclarerez une ressource HA. Le cœur du lab est le test de failover : la panne brutale d'un nœud doit provoquer le redémarrage automatique de la VM sur un nœud sain, en moins de deux minutes. Chaque scénario de panne est chronométré et documenté dans le journal de labo.",
    steps: [
      { title: "Restaurer la base saine", detail: "Rollback des snapshots « lab-sain » sur les 3 nœuds. Vérifier /etc/hosts (pve1, pve2, pve3 résolus sur tous les sous-réseaux) et le SSH root inter-nœuds sans mot de passe (clés installées par le cluster)." },
      { title: "Créer le cluster sur pve1", detail: "pvecm create cfp-cmd --link0 10.10.10.11 — le lien 0 utilise le VLAN 20 dédié. Vérifier : pvecm status (nom, votes, id de cluster)." },
      { title: "Joindre pve2 et pve3", detail: "Sur chaque nœud : pvecm add 10.10.10.11 --link0 <ip-corosync-du-nœud> (ou GUI Datacenter → Cluster → Join Information). Les 3 nœuds doivent apparaître « online » avec Quorate: Yes." },
      { title: "Instrumenter le quorum", detail: "Lire /etc/pve/corosync.conf (link0 sur 10.10.10.0/24), tester pvecm expected 3, puis observer ce qui se passe quand un nœud quitte le cluster : pvecm status et le comportement de /etc/pve." },
      { title: "Installer le QDevice", detail: "Sur le serveur du formateur (192.168.10.40) : apt install -y corosync-qnetd, puis depuis pve1 : pvecm qdevice setup 192.168.10.40. Vérifier le vote supplémentaire du QDevice dans pvecm status." },
      { title: "Déclarer la ressource HA", detail: "VM 101 (disque sur un storage partagé ou répliqué), groupe HA labo-ha incluant les 3 nœuds, puis ha-manager groupadd labo-ha --nodes pve1:pve2:pve3 et ha-manager add labo-ha vm:101 --state started." },
      { title: "Scénario de panne n° 1 : un nœud tombe", detail: "Depuis pve2 (qui héberge VM 101) : poweroff -f. Chronométrer la détection par le CRM (fencing de pve2), le redémarrage de VM 101 sur pve1 ou pve3, et consigner le délai total (attendu : 60 à 120 s)." },
      { title: "Scénario de panne n° 2 : quorum perdu", detail: "Couper simultanément pve3 ET le QDevice : le cluster tombe sous la majorité, /etc/pve passe en lecture seule et les ressources HA sont arrêtées. Restaurer la situation, vérifier le retour du quorum et documenter." },
      { title: "Conclure", detail: "Rédiger dans le journal de labo : délais de bascule mesurés, rôle du QDevice dans chaque situation, décisions à transposer en production (nombre de nœuds, réseau Corosync dédié)." }
    ],
    checklist: [
      "pvecm status affiche 3 nœuds online et Quorate: Yes",
      "Le QDevice (192.168.10.40) apparaît dans les votes de pvecm status",
      "VM 101 est une ressource HA (state: started) dans le groupe labo-ha",
      "Le failover après poweroff de pve2 est chronométré et consigné (cible < 120 s)",
      "La perte simultanée de 2 votes arrête proprement les ressources HA (quorum perdu observé)",
      "corosync.conf montre link0 sur le VLAN 20 dédié (10.10.10.0/24)",
      "Le journal de labo documente les 2 scénarios de panne avec les délais observés"
    ],
    cliCommands: [
      `# Création et expansion du cluster (VLAN 20 dédié)
pvecm create cfp-cmd --link0 10.10.10.11          # sur pve1
pvecm add 10.10.10.11 --link0 10.10.10.12         # sur pve2
pvecm add 10.10.10.11 --link0 10.10.10.13         # sur pve3
pvecm status

# QDevice : serveur du formateur, puis setup depuis un nœud
apt install -y corosync-qnetd                     # sur 192.168.10.40
pvecm qdevice setup 192.168.10.40                 # sur pve1`,
      `# Haute disponibilité : groupe, ressource, tests
ha-manager groupadd labo-ha --nodes pve1:pve2:pve3
ha-manager add labo-ha vm:101 --state started
ha-manager status

# Scénario de panne n° 1 : depuis pve2
poweroff -f
# puis sur pve1 : watch -n1 ha-manager status     # observer la bascule
pvecm status && qm list                           # état final attendu`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Cluster → Create Cluster</span> → Nom cfp-cmd, Link 0 = 10.10.10.11",
      "<span class='wb-path'>Datacenter → Cluster → Join Information</span> → Copier le jeton et rejoindre depuis pve2/pve3",
      "<span class='wb-path'>Datacenter → HA → Groups</span> → Créer labo-ha (nodes pve1:pve2:pve3)",
      "<span class='wb-path'>VM 101 → More → Manage HA</span> → Ajouter au groupe labo-ha, état started",
      "<span class='wb-path'>Datacenter → HA → Status</span> → Suivre la bascule en direct pendant la panne"
    ],
    diagram: 'lab-failover',
    terminology: ['Cluster', 'Quorum', 'QDevice', 'Corosync', 'Scénario de panne', 'Journal de labo'],
    concepts: [
      { term: 'Quorum', def: "Majorité de votes (n/2 + 1) nécessaire pour que le cluster reste actif : sans elle, /etc/pve passe en lecture seule et les ressources HA sont arrêtées (anti split-brain)." },
      { term: 'QDevice', def: "Vote externe fourni par corosync-qnetd (ici sur le serveur du formateur) : il permet à un cluster de 2 nœuds — ou à un cluster amputé d'un vote — de conserver la majorité." },
      { term: 'Fencing', def: "Isolement garanti d'un nœud suspect avant toute bascule : le CRM attend la confirmation de la défaillance (watchdog) pour éviter deux nœuds actifs sur la même VM." },
      { term: 'CRM', def: "Cluster Resource Manager (ha-manager) : applique l'état souhaité des ressources HA (started, stopped) et pilote les bascules lors des pannes." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Ne créez jamais le cluster sur le réseau de management partagé avec les VMs : Corosync exige une latence faible et stable (idéalement < 5 ms), sous peine de délations intempestives de nœuds. Le VLAN 20 dédié existe pour cela." },
      { type: 'danger', icon: 'fa-bolt', text: "Sans quorum, /etc/pve passe en lecture seule et les ressources HA s'arrêtent : c'est un comportement voulu. Ne forcez jamais pvecm expected à la main pour « récupérer » un cluster dégradé sans avoir compris la situation." }
    ],
    table: {
      headers: ['Situation', 'Votes disponibles', 'Quorum ?', 'Comportement attendu'],
      rows: [
        ['3 nœuds + QDevice en ligne', '4 / 4', 'Oui', "Fonctionnement nominal"],
        ['pve2 tombe (2 nœuds + QDevice)', '3 / 4', 'Oui', "Failover HA automatique de VM 101"],
        ['pve2 tombe sans QDevice', '2 / 3', 'Oui', "Le cluster survit (majorité simple)"],
        ['2 nœuds tombent (1 seul nœud)', '1 / 3', 'Non', "/etc/pve en lecture seule, ressources HA arrêtées"]
      ]
    }
  },

  {
    id: 'lab2-ceph-hci',
    track: 'labs',
    level: 'avance',
    title: 'Lab 2 : Ceph HCI, pools, réplication, migration',
    icon: 'fa-solid fa-cubes-stacked',
    step: '66',
    requires: ['lab0-preparation', 'ceph-hci'],
    description: "Ce lab hyperconverge le stockage : Ceph est déployé sur les trois nœuds afin que les disques des VMs vivent sur un pool RBD répliqué, accessible simultanément par tout le cluster. Vous initialiserez les moniteurs et managers, créerez six OSD (deux par nœud), puis le pool « rbd-vm » en réplication 3 avec min_size 2. Les performances seront mesurées avec fio (IOPS, latence) et iperf3 sur le VLAN 30, avant et pendant un scénario de panne d'OSD. Le lab se termine par la migration à chaud d'une VM entre nœuds : sur stockage partagé Ceph, aucune copie de disque n'est nécessaire.",
    steps: [
      { title: "Vérifier les prérequis", detail: "Un disque vierge par OSD (ici /dev/sdb et /dev/sdc sur chaque nœud), les VLANs 30 et 40 câblés (10.20.20.1x / 10.30.30.1x), horloge synchronisée (NTP) sur les 3 nœuds — Ceph est très sensible au skew temporel." },
      { title: "Installer Ceph", detail: "GUI Datacenter → Ceph → Start Ceph Install (ou pveceph install) : les dépôts et paquets Ceph compatibles avec la version de Proxmox VE sont déployés sur les 3 nœuds." },
      { title: "Initialiser le cluster Ceph", detail: "Sur pve1 : pveceph init --cluster-network 10.30.30.0/24 (réseau client = 10.20.20.0/24 par défaut), puis MON et MGR sur chaque nœud : pveceph mon create && pveceph mgr create." },
      { title: "Créer les OSD", detail: "Sur chaque nœud : pveceph osd create /dev/sdb && pveceph osd create /dev/sdc. Contrôle : ceph osd tree doit montrer 6 OSD up/in répartis sur les 3 hôtes." },
      { title: "Créer le pool RBD", detail: "pveceph pool create rbd-vm --size 3 --min_size 2 --pg_num 128 : le storage « rbd-vm » est déclaré automatiquement dans Proxmox (pvesm status). Ajuster l'autoscaler des PG si un warning apparaît." },
      { title: "Valider le stockage partagé", detail: "Créer VM 101 avec son disque sur rbd-vm (VirtIO SCSI single + Qemu Guest Agent), la démarrer, puis vérifier rbd ls rbd-vm et le chemin rbd-vm:vm-101-disk-0 dans le Hardware." },
      { title: "Mesurer (test de charge)", detail: "Depuis la VM : fio --name=lab --filename=/root/fio.test --ioengine=libaio --rw=randwrite --bs=4k --iodepth=32 --size=2G --runtime=60 pour les IOPS. Entre nœuds : iperf3 -s sur pve1 puis iperf3 -c 10.20.20.11 -t 10 depuis pve2. Consigner les chiffres." },
      { title: "Scénario de panne : perte d'un OSD / d'un nœud", detail: "ceph osd fail osd.5 (ou poweroff de pve3) : observer HEALTH_WARN, les PG degraded puis recovering, et le retour à HEALTH_OK. Relancer un fio pendant la recovery pour mesurer l'impact sur la latence." },
      { title: "Migrer à chaud", detail: "qemu agent actif, puis qm migrate 101 pve1 --online depuis pve2 : la migration ne copie pas le disque (storage partagé), seulement l'état mémoire. Chronométrer et consigner (< 60 s attendu)." }
    ],
    checklist: [
      "ceph -s renvoie HEALTH_OK avec 3 MON, au moins 2 MGR et 6 OSD up/in",
      "Le pool rbd-vm est en réplication 3 (size=3, min_size=2) sans warning de PG",
      "Le storage rbd-vm est actif sur les 3 nœuds (pvesm status)",
      "VM 101 démarre depuis rbd-vm sur n'importe quel nœud du cluster",
      "Les mesures fio (IOPS/latence) et iperf3 (débit VLAN 30) sont consignées dans le journal de labo",
      "La panne d'OSD déclenche HEALTH_WARN puis recovery vers HEALTH_OK, sans perte de données",
      "La migration à chaud de VM 101 entre nœuds se fait sans copie de disque (< 60 s)",
      "Les chiffres avant/pendant la recovery sont comparés dans le journal de labo"
    ],
    cliCommands: [
      `# Déploiement Ceph HCI (répéter mon/mgr/osd sur chaque nœud)
pveceph install
pveceph init --cluster-network 10.30.30.0/24      # sur pve1
pveceph mon create && pveceph mgr create
pveceph osd create /dev/sdb && pveceph osd create /dev/sdc

# Pool répliqué + storage Proxmox associé
pveceph pool create rbd-vm --size 3 --min_size 2 --pg_num 128
pvesm status`,
      `# Santé, topologie et tests de charge
ceph -s && ceph osd tree
rbd ls rbd-vm
fio --name=lab --filename=/root/fio.test --ioengine=libaio \\
    --rw=randwrite --bs=4k --iodepth=32 --size=2G --runtime=60 --group_reporting
iperf3 -s                                          # sur pve1 (10.20.20.11)
iperf3 -c 10.20.20.11 -t 10                        # depuis pve2

# Panne contrôlée puis migration à chaud
ceph osd fail osd.5
qm migrate 101 pve1 --online`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Ceph → Install</span> → Lancer l'installation sur les 3 nœuds",
      "<span class='wb-path'>Datacenter → Ceph → Monitors / Managers</span> → Créer MON + MGR sur pve1, pve2 et pve3",
      "<span class='wb-path'>Datacenter → Ceph → OSD</span> → Create : OSD sur /dev/sdb et /dev/sdc de chaque nœud",
      "<span class='wb-path'>Datacenter → Ceph → Pools</span> → Create pool rbd-vm (size 3, min_size 2)",
      "<span class='wb-path'>VM 101 → Hardware → Hard Disk</span> → Vérifier rbd-vm:vm-101-disk-0",
      "<span class='wb-path'>VM 101 → Migrate</span> → Migration à chaud (mode online) vers pve1"
    ],
    diagram: 'lab-ceph',
    terminology: ['Ceph', 'Cluster', 'Test de charge', 'fio', 'iperf3', 'Nœud (node)'],
    concepts: [
      { term: 'OSD', def: "Object Storage Daemon — un OSD par disque : il stocke les objets du pool, gère la réplication et remonte ses métriques. Le lab en crée 6 (2 par nœud)." },
      { term: 'MON / MGR', def: "Les moniteurs maintiennent la carte du cluster (quorum de 3 ici) ; les managers exposent les métriques et le tableau de bord. Les deux sont répartis sur les nœuds." },
      { term: 'CRUSH', def: "Algorithme de placement de Ceph : il distribue chaque objet sur 3 OSD de nœuds différents (failure domain = host), sans table centrale." },
      { term: 'Réplication 3', def: "Chaque objet existe en 3 exemplaires ; min_size=2 autorise l'écriture tant que 2 répliques sont en ligne — le cluster dégrade ses performances mais ne perd pas les données." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Ceph est très sensible à la latence réseau : ne partagez jamais le VLAN 40 (réplication OSD-OSD) avec d'autres flux, sous peine de stale PGs et d'IO bloquées dès qu'un nœud sature. Les VLANs 30 et 40 du CDC existent pour cela." },
      { type: 'info', icon: 'fa-circle-info', text: "min_size=2 garantit les écritures tant que 2 répliques sont en ligne ; en dessous, Ceph suspend les IO plutôt que de risquer une incohérence — c'est le comportement attendu lors de la panne simulée." }
    ],
    table: {
      headers: ['État', 'Signification', 'Action attendue'],
      rows: [
        ['HEALTH_OK', "Toutes les PG actives et clean", "Aucune — état nominal"],
        ['HEALTH_WARN', "Dégradé : OSD down, PG degraded ou nearfull", "Diagnostiquer (ceph osd tree), surveiller la recovery"],
        ['HEALTH_ERR', "Critique : quorum MON perdu, PG incomplete", "Intervention immédiate, ne plus éteindre de nœud"],
        ['recovering / degraded', "Réplication en cours de réparation", "Laisser la recovery se terminer, limiter la charge"]
      ]
    }
  },

  {
    id: 'lab3-sdn-multi-tenant',
    track: 'labs',
    level: 'avance',
    title: 'Lab 3 : SDN multi-tenant, zones, VNets, isolation',
    icon: 'fa-solid fa-sitemap',
    step: '67',
    requires: ['lab0-preparation', 'sdn-avance'],
    description: "Ce lab met en place un SDN multi-tenant complet sur le cluster : deux zones VLAN (production et test) et une zone VXLAN capable d'étendre des segments L2 entre les trois nœuds. Chaque zone héberge des VNets avec subnets déclarés, et des VMs de test issues de clones lab servent à vérifier la connectivité et l'isolation entre tenants. Vous activerez l'IPAM intégré, testerez le filtrage au niveau VNet puis configurerez le routage inter-zones avec FRRouting lorsque nécessaire. Le lab se conclut par un scénario de panne de configuration : une modification manuelle divergente doit être diagnostiquée puis corrigée proprement par le modèle déclaratif.",
    steps: [
      { title: "Activer le SDN", detail: "Datacenter → SDN : ipam « pve », firewall activé, puis créer les zones vlan-prod (bridge vmbr0, VLAN 100), vlan-test (VLAN 200) et vxlan-tenants (peers = 192.168.10.11/12/13)." },
      { title: "Appliquer la configuration", detail: "Bouton Apply : sur chaque nœud, vérifier la génération de /etc/network/interfaces.d/sdn et l'absence d'erreur dans les journaux. Tant que Apply n'est pas passé, les VNets n'existent pas." },
      { title: "Créer VNets et subnets", detail: "vnet-prod (zone vlan-prod, tag 100, subnet 10.100.0.0/24 gw 10.100.0.1), vnet-test (tag 200, 10.200.0.0/24), vnet-tenant-a et vnet-tenant-b (zone vxlan-tenants, tags 1000 et 1001, subnets 172.16.10.0/24 et 172.16.20.0/24)." },
      { title: "Brancher les VMs de test", detail: "Cloner la VM Debian de référence (clone lab) vers tenant-a-vm (210), tenant-b-vm (211) et test-vm (212) ; brancher chaque NIC sur son VNet, avec IP statique ou IPAM." },
      { title: "Vérifier l'isolation", detail: "Depuis tenant-a-vm : ping OK vers 172.16.10.10 (même tenant), ping KO vers 172.16.20.10 (tenant B, isolation L2). Documenter les résultats dans le journal de labo." },
      { title: "Tester le VXLAN", detail: "Migrer tenant-a-vm sur pve2 (qm migrate 210 pve2 --online) : la VM conserve son IP et sa connectivité grâce au segment VXLAN 1000 étendu entre les nœuds. Revenir sur pve1 après le test." },
      { title: "Router entre zones", detail: "Activer FRRouting sur les nœuds pour n'autoriser que vnet-test → vnet-prod:443 : pings et ports filtrés vérifiés depuis les VMs (traceroute, curl). Le routage est un choix explicite, jamais implicite." },
      { title: "Scénario de panne de configuration", detail: "Modifier à la main le tag de vnet-tenant-a sur pve2 uniquement (bridge VXLAN), observer l'incohérence (VM injoignable depuis pve2), puis corriger : revenir au modèle déclaratif et Apply SDN. Documenter la leçon." }
    ],
    checklist: [
      "Les 3 zones (vlan-prod, vlan-test, vxlan-tenants) sont appliquées sans erreur sur les 3 nœuds",
      "Les VNets prod100, test200, tenant-a (tag 1000) et tenant-b (tag 1001) existent avec leurs subnets",
      "Les VMs de test (210/211/212) obtiennent leur IP et joignent leur gateway de VNet",
      "Tenant A ne joint pas Tenant B : isolation L2 vérifiée et consignée",
      "La migration de tenant-a-vm sur pve2 conserve la connectivité (VXLAN étendu)",
      "Le routage inter-zones n'ouvre que les flux explicitement autorisés (test → prod :443)",
      "Le scénario de panne de configuration est documenté avec la correction Apply/rollback"
    ],
    cliCommands: [
      `# Le SDN est déclaratif au niveau Datacenter (/etc/pve/sdn/*)
# Extrait généré sur chaque nœud après Apply :
cat /etc/network/interfaces.d/sdn

# Vérifications côté API
pvesh get /cluster/sdn/zones
pvesh get /cluster/sdn/vnets
ip -d link show | grep -i vxlan`,
      `# Tests d'isolation et de routage (depuis les VMs de test)
ping -c2 172.16.10.10        # même tenant : OK
ping -c2 172.16.20.10        # autre tenant : KO (isolation L2)
traceroute 10.100.0.1        # routage inter-zones via FRRouting
curl -m3 https://10.100.0.50 # flux autorisé :443 uniquement

# Migration d'une VM branchée sur le VNet VXLAN
qm migrate 210 pve2 --online`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → SDN → Zones</span> → Add : zones vlan-prod, vlan-test et vxlan-tenants",
      "<span class='wb-path'>Datacenter → SDN → VNets</span> → Add : vnet-prod, vnet-test, vnet-tenant-a, vnet-tenant-b",
      "<span class='wb-path'>Datacenter → SDN → Subnets</span> → Déclarer 10.100.0.0/24, 10.200.0.0/24, 172.16.10.0/24, 172.16.20.0/24",
      "<span class='wb-path'>Datacenter → SDN → Apply</span> → Générer la configuration réseau sur tous les nœuds",
      "<span class='wb-path'>VM 210 → Hardware → Network Device</span> → Brancher la NIC sur vnet-tenant-a"
    ],
    diagram: 'lab-sdn',
    terminology: ['SDN', 'VNet', 'VXLAN', 'FRRouting', 'Lab isolé', 'Clone lab'],
    concepts: [
      { term: 'Zone', def: "Domaine d'encapsulation SDN : zones VLAN (un tag par bridge) ou VXLAN (segments étendus entre nœuds). Les VNets d'une zone partagent le même mécanisme." },
      { term: 'VNet', def: "Segment L2 virtuel isolé : chaque tenant reçoit son VNet (tag 1000/1001 ici) ; deux VNets ne se voient jamais sans routage explicite." },
      { term: 'Subnet', def: "Plage IP associée à un VNet (10.100.0.0/24…) avec gateway : elle alimente l'IPAM, le DHCP optionnel et les règles de filtrage au niveau VNet." },
      { term: 'Isolation multi-tenant', def: "Garantie que les tenants ne communiquent pas : isolation L2 par VNet, filtrage L3 au niveau des zones et routage inter-zones strictement limité aux flux déclarés." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le SDN est déclaratif : toute modification manuelle de bridge ou de tag directement sur un nœud est écrasée au prochain Apply — ou pire, diverge silencieusement. Passez toujours par Datacenter → SDN." },
      { type: 'info', icon: 'fa-circle-info', text: "Une zone VXLAN exige des peers joignables sur tous les nœuds (les IPs de management 192.168.10.11/12/13 conviennent) ; sans cela, Apply échoue et les VNets de la zone restent indisponibles." }
    ],
    table: {
      headers: ['Objet', 'Rôle', 'Exemple du lab'],
      rows: [
        ['Zone', "Domaine d'encapsulation commun", "vlan-prod, vlan-test, vxlan-tenants"],
        ['VNet', "Segment L2 virtuel isolé (tag)", "vnet-tenant-a = VXLAN 1000"],
        ['Subnet', "Plage IP + gateway du VNet", "172.16.10.0/24 gw 172.16.10.1"],
        ['IPAM', "Allocation automatique des IP", "ipam « pve » intégré"],
        ['FRRouting', "Routage inter-zones sur les nœuds", "Autoriser test → prod sur :443 seulement"]
      ]
    }
  },

  {
    id: 'lab4-docker-portainer',
    track: 'labs',
    level: 'intermediaire',
    title: 'Lab 4 : Docker + Portainer + monitoring dans LXC',
    icon: 'fa-solid fa-cubes',
    step: '68',
    requires: ['lab0-preparation', 'docker-portainer'],
    description: "Ce lab installe une plateforme de conteneurs d'applications dans un conteneur système : un LXC non privilégié avec nesting accueille Docker Engine, Portainer CE pour l'administration graphique et une stack de monitoring. Les données Docker vivent sur un dataset ZFS dédié afin de profiter des snapshots et des sauvegardes vzdump. Vous déploierez une première application web, mesurerez les performances réseau du CT face à une VM avec iperf3, puis validerez le couple sauvegarde/restauration du conteneur complet. À l'arrivée, vous saurez choisir entre Docker-in-LXC et VM dédiée selon le besoin.",
    steps: [
      { title: "Créer le CT 300", detail: "pveam download local debian-12-standard, puis pct create 300 … --unprivileged 1 --features nesting=1 : 2 vCPU, 2 Go RAM, disque 16 Go sur local-zfs, NIC eth0 sur vmbr0 tag=200 avec IP 10.200.0.30/24." },
      { title: "Préparer le stockage Docker", detail: "zfs create tank/docker-ct300 puis montage en point mp0 vers /var/lib/docker : les couches et volumes Docker profitent du copy-on-write ZFS et des snapshots, sans polluer le rootfs." },
      { title: "Installer Docker", detail: "Dans le CT : curl -fsSL https://get.docker.com | sh (ou dépôt officiel : docker-ce, docker-ce-cli, containerd.io, docker-compose-plugin). Validation : docker info puis docker run --rm hello-world." },
      { title: "Déployer Portainer CE", detail: "docker volume create portainer_data puis conteneur portainer/portainer-ce avec -p 9443:9443 et le socket Docker monté. Première connexion admin sur https://10.200.0.30:9443 dans les 5 minutes." },
      { title: "Déployer la stack monitoring", detail: "docker compose up -d avec prometheus + grafana + node-exporter dans le CT, et pve-exporter côté hôte : importer un dashboard Proxmox dans Grafana et vérifier les métriques des 3 nœuds." },
      { title: "Publier une app de test", detail: "Conteneur nginx exposé sur le port 8080 du CT : joignable depuis une VM du VLAN 200 (curl http://10.200.0.30:8080). Appliquer le groupe de règles « web » du lab 5 sur cette NIC." },
      { title: "Mesurer (test de charge)", detail: "iperf3 -s dans le CT, iperf3 -c 10.200.0.30 -t 10 depuis une VM du VLAN 200, puis la même mesure entre deux VMs : comparer les débits et conclure sur l'overhead réseau LXC vs KVM. Consigner les chiffres." },
      { title: "Sauvegarder et restaurer", detail: "vzdump 300 --storage local --mode snapshot --compress zstd, détruire un conteneur Docker, restaurer le CT depuis le vzdump et vérifier : Portainer, volumes et app de test intacts." }
    ],
    checklist: [
      "CT 300 non privilégié avec nesting=1 (et keyctl si nécessaire) actifs",
      "/var/lib/docker est monté sur un dataset ZFS dédié (mp0 tank/docker-ct300)",
      "docker info et docker run --rm hello-world passent sans erreur dans le CT",
      "Portainer CE est joignable en https://10.200.0.30:9443 avec un compte admin créé",
      "La stack monitoring (Prometheus + Grafana) collecte les métriques des 3 nœuds",
      "Le test iperf3 CT vs VM est consigné avec les débits mesurés et la conclusion",
      "vzdump + restauration du CT 300 validés (Portainer et volumes intacts)"
    ],
    cliCommands: [
      `# CT 300 : création et stockage Docker dédié
pct create 300 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \\
  --hostname docker-01 --unprivileged 1 --features nesting=1 \\
  --cores 2 --memory 2048 --rootfs local-zfs:16 \\
  --net0 name=eth0,bridge=vmbr0,tag=200,ip=10.200.0.30/24,gw=10.200.0.1
zfs create tank/docker-ct300
pct set 300 -mp0 tank/docker-ct300,mp=/var/lib/docker
pct start 300 && pct enter 300`,
      `# Dans le CT : Docker + Portainer
curl -fsSL https://get.docker.com | sh
docker info && docker run --rm hello-world
docker volume create portainer_data
docker run -d -p 9443:9443 --name portainer \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v portainer_data:/data portainer/portainer-ce:latest

# Test de charge réseau + sauvegarde côté hôte
iperf3 -s                          # dans le CT (10.200.0.30)
vzdump 300 --storage local --mode snapshot --compress zstd`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → local → CT Templates → Templates</span> → Télécharger debian-12-standard",
      "<span class='wb-path'>Create CT</span> → Hostname docker-01, laisser « Unprivileged container » coché",
      "<span class='wb-path'>Create CT → Options → Features</span> → Cocher nesting (et keyctl si besoin)",
      "<span class='wb-path'>CT 300 → Resources → Add → Mount Point</span> → mp0 tank/docker-ct300 vers /var/lib/docker",
      "<span class='wb-path'>CT 300 → Console</span> → Installer Docker puis Portainer",
      "<span class='wb-path'>CT 300 → Backup → Backup now</span> → vzdump de validation"
    ],
    diagram: 'lab-docker',
    terminology: ['LXC', 'CT non privilégié', 'Nesting', 'Clone lab', 'Test de charge', 'iperf3'],
    concepts: [
      { term: 'Docker-in-LXC', def: "Exécution de Docker dans un conteneur système Proxmox : densité maximale et démarrage instantané, au prix d'un noyau partagé avec l'hôte — idéal pour les labs et services légers." },
      { term: 'Portainer CE', def: "Interface web d'administration Docker (édition Community) : gestion des stacks, conteneurs, volumes et images sans ligne de commande, exposée en HTTPS sur 9443." },
      { term: 'Volume Docker', def: "Zone de données persistante des conteneurs ; ici hébergée sur le dataset ZFS dédié, donc couverte par les snapshots et la sauvegarde vzdump du CT." },
      { term: 'Stack Compose', def: "Ensemble de services déclarés dans un docker-compose.yml et démarrés ensemble (prometheus + grafana + node-exporter dans ce lab)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un CT qui exécute Docker doit rester non privilégié : dans un CT privilégié, le root de Docker est le root de l'hôte, ce qui annule l'isolation. Ajoutez keyctl=1 aux features si certaines images l'exigent." },
      { type: 'info', icon: 'fa-circle-info', text: "Ne placez jamais /var/lib/docker directement sur le rootfs du CT : les couches Docker génèrent des milliers de petits fichiers et polluent les snapshots — le dataset ZFS dédié les isole proprement." }
    ],
    table: {
      headers: ['Critère', 'Docker dans LXC', 'Docker dans VM'],
      rows: [
        ['Overhead mémoire', "Quasi nul (noyau partagé)", "RAM complète du guest"],
        ['Démarrage', "< 1 seconde", "10 à 30 secondes"],
        ['Isolation noyau', "Partagée avec l'hôte", "Noyau dédié"],
        ["Cas d'usage", "Labs, services légers, CI", "Charges sensibles, noyaux spécifiques"],
        ['Sauvegarde', "vzdump du CT complet", "vzdump de la VM ou agent invité"]
      ]
    }
  },

  {
    id: 'lab5-securite',
    track: 'labs',
    level: 'intermediaire',
    title: 'Lab 5 : sécurité (pare-feu, RBAC, 2FA, IPS)',
    icon: 'fa-solid fa-shield-halved',
    step: '69',
    requires: ['lab0-preparation', 'durcissement'],
    description: "Ce lab durcit la maquette complète en appliquant une défense en profondeur : pare-feu Proxmox aux trois niveaux (datacenter, nœud, VM/CT), détection d'intrusions avec Suricata, contrôle d'accès RBAC et double facteur TOTP. Un poste d'attaque du VLAN 200 sert à scanner l'infrastructure avant et après durcissement afin de mesurer concrètement la réduction de la surface d'attaque. Chaque règle, utilisateur et alerte est documenté dans le journal de labo pour servir de référence au futur administrateur. Le principe du moindre privilège guide tout le lab : le compte root reste réservé aux interventions d'urgence.",
    steps: [
      { title: "État des lieux", detail: "Depuis le poste d'attaque du VLAN 200 : nmap -sV -p- 192.168.10.11 (puis .12/.13) et sur les IP des VMs. Consigner les ports ouverts (8006, 22, 5405…) dans le journal de labo : c'est la référence « avant »." },
      { title: "Pare-feu datacenter", detail: "Datacenter → Firewall : enable, Input Policy DROP, Output Policy ACCEPT. Règles explicites : 8006/tcp et 22/tcp acceptés uniquement depuis le poste formateur (192.168.10.5, via IPSet), puis tout le reste est bloqué." },
      { title: "Pare-feu nœud", detail: "Règles par niveau nœud : Corosync 5404-5405/udp restreint au VLAN 20 (10.10.10.0/24), Ceph 3300/6789/6800-7300 restreint aux VLANs 30/40. Après activation, vérifier que pvecm status et ceph -s restent sains." },
      { title: "Pare-feu VM/CT", detail: "Activer le firewall sur les NICs des VMs de test, créer le groupe de règles « web » (80/443 entrants seulement) et l'appliquer à l'app nginx du lab 4. Tester : 8080 et autres ports refusés depuis le VLAN 200." },
      { title: "IPS Suricata", detail: "Sur le nœud passerelle du labo : apt install -y suricata, mode af-packet sur vmbr0, règles ET/open activées. Générer un scan nmap et vérifier la remontée d'alerte dans /var/log/suricata/fast.log." },
      { title: "RBAC au moindre privilège", detail: "pveum user add formateur@pve, rôle PVEVMAdmin attribué sur /pool/labo uniquement : l'utilisateur voit ses VMs mais ni les nœuds ni les VMs hors pool. Créer aussi un API Token en lecture seule pour la supervision." },
      { title: "Double facteur (2FA)", detail: "Datacenter → Permissions → Two Factor : activer TOTP sur root@pam et formateur@pve, tester une reconnexion complète (mot de passe + code), conserver les codes de secours dans le journal de labo." },
      { title: "Durcissement système", detail: "sshd : PermitRootLogin prohibit-password + clés SSH, fail2ban sur sshd et pveproxy, unattended-upgrades pour les correctifs de sécurité. Vérifier les services actifs après redémarrage." },
      { title: "Mesurer le durcissement", detail: "Refaire les scans nmap initiaux : comparer avec l'« avant », justifier chaque port restant, exporter les règles (cluster.fw, host.fw) dans le journal de labo et conclure sur la surface d'attaque résiduelle." }
    ],
    checklist: [
      "Le scan nmap « avant/après » est consigné dans le journal de labo, chaque port restant justifié",
      "Pare-feu datacenter actif : Input Policy DROP, accès 8006/22 limité au poste formateur",
      "Corosync et Ceph ne répondent qu'aux VLANs 20/30/40 (règles nœud vérifiées après activation)",
      "Le groupe « web » du pare-feu VM/CT laisse passer uniquement 80/443 depuis le VLAN 200",
      "Suricata génère une alerte visible dans fast.log lors d'un scan nmap",
      "formateur@pve (PVEVMAdmin sur /pool/labo) ne peut ni voir les nœuds ni gérer les VMs hors pool",
      "TOTP actif sur root@pam et formateur@pve (reconnexion testée, codes de secours archivés)",
      "sshd durci (clés, prohibit-password), fail2ban et unattended-upgrades actifs"
    ],
    cliCommands: [
      `# Pare-feu datacenter : politique et règles clés (/etc/pve/firewall/cluster.fw)
[OPTIONS]
enable: 1
policy_in: DROP
policy_out: ACCEPT

[RULES]
IN ACCEPT -source 192.168.10.5 -p tcp -dport 8006   # poste formateur
IN ACCEPT -source 192.168.10.5 -p tcp -dport 22
IN ACCEPT -source 10.10.10.0/24 -p udp -dport 5404:5405

pve-firewall status && pve-firewall compile`,
      `# IPS, RBAC et durcissement
apt install -y suricata
suricata -c /etc/suricata/suricata.yaml --af-packet -D
tail -f /var/log/suricata/fast.log    # pendant un scan nmap

pveum user add formateur@pve --comment "Compte labo"
pveum acl modify /pool/labo --users formateur@pve --roles PVEVMAdmin
pveum user tfa add formateur@pve -t totp

sshd -T | grep -E 'permitrootlogin|passwordauthentication'
apt install -y fail2ban unattended-upgrades`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Firewall → Options</span> → Input Policy : DROP, Output : ACCEPT",
      "<span class='wb-path'>Datacenter → Firewall → IPSet/Rules</span> → IPSet « formateurs » puis règles 8006/22",
      "<span class='wb-path'>Node → Firewall</span> → Règles Corosync / Ceph spécifiques par nœud",
      "<span class='wb-path'>Datacenter → Permissions → Users → TFA</span> → Activer TOTP sur root et formateur",
      "<span class='wb-path'>VM/CT → Firewall → Insert Rule</span> → Groupe « web » (80/443) sur les NICs de test"
    ],
    diagram: 'lab-sec',
    terminology: ['RBAC', 'API REST', 'Lab isolé', 'Journal de labo', 'Cluster', 'CT non privilégié'],
    concepts: [
      { term: 'Défense en profondeur', def: "Superposition de contrôles indépendants : filtrage réseau (3 niveaux de pare-feu), détection (IPS), contrôle d'accès (RBAC + 2FA) et durcissement système — une seule couche ne suffit jamais." },
      { term: 'Rôle RBAC', def: "Ensemble de privilèges (PVEVMAdmin, PVEAuditor…) attribué à un utilisateur ou un token sur un chemin précis (/pool/labo, /vms…) : le moindre privilège devient concret." },
      { term: 'TOTP', def: "Time-based One-Time Password — second facteur de 6 chiffres (Google Authenticator, FreeOTP) exigé à la connexion ; indispensable sur root@pam même dans un labo." },
      { term: 'IPS', def: "Intrusion Prevention System — Suricata inspecte les flux (af-packet sur vmbr0) et alerte (voire bloque) sur les signatures d'attaque : complément réseau du pare-feu à état." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Activez le pare-feu datacenter en gardant une session SSH ouverte : une politique DROP trop large peut couper l'accès d'administration à tous les nœuds du cluster. Déclarez d'abord une règle explicite pour votre poste formateur." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Après l'activation de la 2FA sur root@pam, la perte du téléphone sans codes de secours bloque l'accès root à l'interface web : archivez les codes dans le journal de labo (hors machine)." }
    ],
    table: {
      headers: ['Port', 'Service', 'Politique du lab'],
      rows: [
        ['8006/tcp', "Interface web + API REST", "Accepté depuis le poste formateur uniquement"],
        ['22/tcp', "SSH", "Accepté VLAN 10, clés obligatoires, fail2ban actif"],
        ['5404-5405/udp', "Corosync", "Restreint au VLAN 20 (10.10.10.0/24)"],
        ['3300, 6789, 6800-7300/tcp', "Ceph MON / OSD", "Restreint aux VLANs 30 et 40"],
        ['5900-5999/tcp', "Consoles VNC", "Passer par l'interface web (source formateur)"],
        ['3128/tcp', "Proxy SPICE", "Restreint au VLAN 10"]
      ]
    }
  },

  {
    id: 'quiz-final',
    track: 'labs',
    level: 'intermediaire',
    title: 'Quiz final : évaluation complète',
    icon: 'fa-solid fa-graduation-cap',
    step: '70',
    requires: ['lab1-cluster-ha', 'lab2-ceph-hci', 'lab3-sdn-multi-tenant', 'lab4-docker-portainer', 'lab5-securite'],
    description: "Cette section ne contient pas de nouveau contenu technique : c'est le point de contrôle final du guide. L'outil « Quiz final » du menu Outils 🔧 tire 20 questions au hasard dans toutes les banques de questions du guide (fondamentaux, réseau, sécurité, cluster, stockage, conteneurs, monitoring, sauvegarde, automatisation et labs), avec un seuil de réussite de 70 %, soit 14 bonnes réponses sur 20. Le meilleur score est mémorisé dans le navigateur et visible à chaque retour, ce qui permet de suivre la progression entre les sessions. Avant de le tenter, vérifiez que les checklists des labs 1 à 5 sont cochées et que le journal de labo est complet : l'évaluation combine la théorie (quiz) et la pratique (labs validés). En cas d'échec, un rattrapage illimité est prévu, avec un nouveau tirage de questions à chaque tentative.",
    cliCommands: [
      `# Contrôle général avant l'évaluation finale (à exécuter sur pve1)
pvecm status                   # cluster sain, quorum OK (lab 1)
ceph -s                        # HEALTH_OK (lab 2)
pvesm status                   # storages actifs, dont rbd-vm (lab 2)
pve-firewall status            # pare-feu actif, policy DROP (lab 5)
ha-manager status              # ressource HA started (lab 1)`
    ],
    guiSteps: [
      "<span class='wb-path'>Outils 🔧 → Quiz final</span> → 20 questions tirées de tout le guide, seuil 70 %",
      "<span class='wb-path'>Sidebar → parcours Labs</span> → Vérifier que les checklists (lab0 à lab5) sont cochées"
    ],
    diagram: 'lab-eval',
    terminology: ['Évaluation', 'Rattrapage', 'Chemin de progression', 'Journal de labo'],
    concepts: [
      { term: 'Évaluation', def: "Mesure des acquis sous trois formes : quiz de section après chaque chapitre, quiz final de 20 questions sur tout le guide, et validation des checklists pratiques des labs." },
      { term: 'Rattrapage', def: "Nouvelle tentative d'évaluation après un échec : le tirage de questions est régénéré à chaque essai, les questions et options sont mélangées, et seul le meilleur score est conservé." },
      { term: 'Chemin de progression', def: "Suite ordonnée de sections reliées par des prérequis (requires) : les parcours se débloquent logiquement, du socle fondamental jusqu'au quiz final." },
      { term: 'Journal de labo', def: "Preuve pratique de la validation : plan d'adressage, mesures fio/iperf3, scénarios de panne et règles de pare-feu consignés au fil des labs 0 à 5." }
    ],
    alerts: [
      { type: 'info', icon: 'fa-circle-info', text: "Le tirage du quiz final couvre l'intégralité du guide : les questions du parcours Labs (sections 64 à 70) y figurent aussi. Avant l'évaluation, relisez les sections signalées par les quiz de section ratés." },
      { type: 'success', icon: 'fa-circle-check', text: "Objectif de fin de parcours : quiz final validé (au moins 70 %), les 6 checklists de labs (lab0 à lab5) complétées et le journal de labo à jour — vous êtes prêt pour l'administration d'une infrastructure Proxmox VE de production." }
    ],
    table: {
      headers: ['Évaluation', 'Seuil', 'Rattrapage', 'Preuve conservée'],
      rows: [
        ['Quiz de section (chaque section)', "70 %", "Illimité, questions et options mélangées", "Meilleur score par section (navigateur)"],
        ['Quiz final — 20 questions, tout le guide', "70 % (14 / 20)", "Illimité, nouveau tirage à chaque essai", "Meilleur score final mémorisé"],
        ['Checklists des labs 1 à 5', "100 % des cases", "Ré-exécution après rollback « lab-sain »", "Cases cochées persistantes"],
        ['Validation de filière CFP-CMD', "Quiz final ≥ 70 % + labs complétés", "Accompagnement formateur puis nouvelle tentative", "Journal de labo signé + score"]
      ]
    }
  }
]);
