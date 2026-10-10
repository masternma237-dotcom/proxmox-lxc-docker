/* ═══════════════════════════════════════════════════════════════════════════
   data/core.js — Parcours FONDAMENTAUX (sections 00 → 07)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'introduction',
    track: 'fondamentaux',
    level: 'debutant',
    title: 'Introduction à Proxmox VE',
    icon: 'fa-solid fa-rocket',
    step: '00',
    requires: [],
    description: 'Proxmox Virtual Environment (VE) est la plateforme de virtualisation open source la plus adoptée en entreprise. Elle combine la virtualisation complète de machines (KVM) et la conteneurisation système (LXC) dans une interface web unique, avec des fonctionnalités de niveau entreprise : clustering haute disponibilité, stockage défini par logiciel (ZFS, Ceph), SDN, pare-feu intégré et sauvegarde dédupliquée. Cette première section pose les bases conceptuelles indispensables avant toute manipulation.',
    cliCommands: [
      `# Vérifier la version de Proxmox VE
pveversion -v

# Lister les VMs (KVM) et les conteneurs (LXC)
qm list
pct list

# État du cluster (mono-nœud au départ)
pvecm status`
    ],
    guiSteps: [
      "<span class='wb-path'>https://IP_DU_NOEUD:8006</span> → Connexion à l'interface web (root / PAM)",
      "<span class='wb-path'>Datacenter → Summary</span> → Vue d'ensemble de la santé et des ressources",
      "<span class='wb-path'>Node → Summary</span> → CPU, RAM, stockage, uptime du nœud"
    ],
    diagram: 'fd-arch',
    terminology: ['Proxmox VE', 'KVM', 'LXC', 'Hyperviseur type 1', 'Cluster', 'Datacenter'],
    concepts: [
      { term: 'Proxmox VE', def: "Distribution Debian spécialisée intégrant KVM (VMs) et LXC (conteneurs) avec une interface web unifiée et une API REST complète." },
      { term: 'KVM', def: "Kernel-based Virtual Machine — hyperviseur de type 1 intégré au noyau Linux, utilisé pour les machines virtuelles avec QEMU." },
      { term: 'LXC', def: "Linux Containers — conteneurs système légers partageant le noyau de l'hôte, plus performants qu'une VM pour les services Linux." },
      { term: 'Datacenter', def: "Niveau supérieur de l'arborescence Proxmox : regroupe tous les nœuds, la configuration du cluster, le stockage et les permissions." },
      { term: 'Hyperviseur type 1', def: "Hyperviseur installé directement sur le matériel (bare-metal), sans OS hôte intermédiaire — c'est le cas de Proxmox VE." }
    ],
    alerts: [
      { type: 'info', icon: 'fa-circle-info', text: "Proxmox VE est basé sur Debian : toutes les commandes Debian (apt, systemctl) restent utilisables, ce qui facilite l'administration pour un administrateur Linux." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Ne confondez pas LXC et Docker : LXC est un conteneur système (comme une VM légère), Docker est un conteneur d'applications. Docker s'installe À L'INTÉRIEUR d'un LXC (voir parcours Docker & LXC)." }
    ],
    table: {
      headers: ['Élément', 'VM KVM', 'Conteneur LXC'],
      rows: [
        ['Isolation', 'Noyau dédié (très forte)', 'Partage le noyau hôte (forte mais moindre)'],
        ['Performance', 'Proche du bare-metal (~95 %)', 'Native (~99 %)'],
        ['Systèmes invités', 'Linux, Windows, BSD…', 'Linux uniquement'],
        ['Démarrage', 'Secondes à dizaines de secondes', 'Instantané (< 1 s)'],
        ['Overhead mémoire', 'Réservation RAM complète', 'RAM partagée à la demande'],
        ['Cas d\'usage', 'OS propriétaires, noyaux custom', 'Services Linux, Docker, outils réseau']
      ]
    }
  },

  {
    id: 'installation',
    track: 'fondamentaux',
    level: 'debutant',
    title: 'Installation : ISO, sur Debian et post-installation',
    icon: 'fa-solid fa-download',
    step: '01',
    requires: ['introduction'],
    description: 'Deux voies d\'installation existent : l\'ISO officielle Proxmox VE (recommandée, elle embarque Debian, l\'installeur graphique et ZFS) ou l\'installation sur une Debian existante (à réserver aux cas particuliers). La post-installation conditionne la stabilité de toute l\'infrastructure : choix des dépôts, mise à jour complète, vérification des périphériques de bloc et configuration du réseau de management. Sur le labo CFP-CMD, trois nœuds seront installés selon cette procédure.',
    cliCommands: [
      `# 1. Configurer le dépôt no-subscription (labo / formation)
echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" \\
  > /etc/apt/sources.list.d/pve.list

# 2. Supprimer le dépôt entreprise (sans licence) puis mettre à jour
rm -f /etc/apt/sources.list.d/pve-enterprise.list
apt update && apt full-upgrade -y

# 3. Vérifier la version installée et les disques disponibles
pveversion
lsblk

# 4. (Optionnel) Installation sur une Debian 12 existante
apt install -y proxmox-ve postfix open-iscsi`
    ],
    guiSteps: [
      "<span class='wb-path'>Démarrage ISO</span> → « Install Proxmox VE (Graphical) »",
      "<span class='wb-path'>Target Harddisk</span> → Options → ext4 / xfs / ZFS (RAID1 conseillé)",
      "<span class='wb-path'>Country / Timezone / Keyboard</span> → France · Europe/Paris · fr",
      "<span class='wb-path'>Password + e-mail</span> → mot de passe root ≥ 16 caractères",
      "<span class='wb-path'>Network Configuration</span> → Interface, hostname (FQDN), IP mgmt, gateway, DNS",
      "<span class='wb-path'>Post-install</span> → Reboot puis https://IP:8006"
    ],
    diagram: 'fd-install',
    terminology: ['ISO Proxmox', 'Dépôt no-subscription', 'Dépôt entreprise', 'Bare-metal', 'FQDN'],
    concepts: [
      { term: 'ISO Proxmox', def: "Image d'installation complète incluant l'installeur graphique, Debian, le noyau Proxmox et les outils de virtualisation." },
      { term: 'Dépôt no-subscription', def: "Dépôt public gratuit proposant les mêmes paquets que le canal entreprise, avec un léger délai de publication des correctifs." },
      { term: 'Dépôt entreprise', def: "Dépôt stable réservé aux abonnés payants : il est priorisé en production avec contrat de support." },
      { term: 'Bare-metal', def: "Installation directe sur le matériel physique, sans couche d'hyperviseur préexistante — configuration optimale pour les performances." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le dépôt entreprise renvoie une erreur 401 si aucune licence n'est souscrite : supprimez-le ou commentez-le avant le premier apt update, sinon la mise à jour échoue." },
      { type: 'danger', icon: 'fa-bolt', text: "Le choix du système de fichiers lors de l'installation (ext4, xfs, ZFS RAID1) est définitif sans réinstallation : prévoyez ZFS RAID1 sur les nœuds de production pour la redondance du disque OS." }
    ],
    table: {
      headers: ['Prérequis', 'Minimum', 'Recommandé (labo CFP-CMD)'],
      rows: [
        ['CPU', '64-bit, 4 cœurs, VT-x/AMD-V', '16+ cœurs, VT-d pour le passthrough'],
        ['RAM', '8 Go', '64 Go (Ceph + VMs)'],
        ['Disque OS', '32 Go', 'SSD NVMe 250 Go (ZFS RAID1)'],
        ['Réseau', '1 NIC 1 Gbps', '2+ NICs, 10 Gbps, NIC dédiée cluster'],
        ['Écrans VMs', '—', 'SSD + HDD pour le stockage Ceph']
      ]
    }
  },

  {
    id: 'interface-web',
    track: 'fondamentaux',
    level: 'debutant',
    title: 'Interface Web, CLI et API',
    icon: 'fa-solid fa-display',
    step: '02',
    requires: ['installation'],
    description: 'Proxmox VE s\'administre par trois canaux équivalents : l\'interface web (GUI) pour les opérations courantes, la CLI avec les outils qm, pct et pvesh pour le scripting, et l\'API REST pour l\'automatisation avancée (Terraform, Ansible). Maîtriser les trois est indispensable : la GUI révèle la logique des objets, la CLI documente les paramètres exacts et l\'API industrialise tout le reste. Cette section fait le tour du propriétaire et installe les réflexes de navigation.',
    cliCommands: [
      `# CLI : les 3 outils essentiels
qm list                      # Machines virtuelles KVM
pct list                     # Conteneurs LXC
pvesh get /nodes             # Requête API brute (pvesh = CLI de l'API)

# Aide contextuelle complète
qm help create
pct help
pvesh help get /nodes/{node}/status`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter</span> → Niveau global : cluster, stockage, permissions, pare-feu",
      "<span class='wb-path'>Node → System → Network</span> → Interfaces réseau, bridges, bonds",
      "<span class='wb-path'>Node → Updates</span> → Dépôts et mises à jour",
      "<span class='wb-path'>Node → Shell</span> → Console web (équivalent SSH)",
      "<span class='wb-path'>VM → Console / Summary</span> → Écran de la VM et métriques temps réel",
      "<span class='wb-path'>Datacenter → API Tokens</span> → Créer un token pour l'automatisation"
    ],
    diagram: 'fd-interfaces',
    terminology: ['GUI', 'qm', 'pct', 'pvesh', 'API REST', 'Ticket d\'authentification'],
    concepts: [
      { term: 'qm', def: "Outil CLI de gestion des VMs KVM : création, snapshot, migration, clonage, console…" },
      { term: 'pct', def: "Outil CLI de gestion des conteneurs LXC (Proxmox Container Toolkit)." },
      { term: 'pvesh', def: "Client CLI de l'API REST Proxmox : permet d'appeler n'importe quel endpoint depuis le shell." },
      { term: 'API Token', def: "Identifiant de type USER@REALM!TOKENID associé à des permissions séparées de l'utilisateur — recommandé pour l'automatisation." },
      { term: 'Ticket', def: "Cookie d'authentification API valide 2 h, obtenu via POST /access/ticket." }
    ],
    alerts: [
      { type: 'info', icon: 'fa-circle-info', text: "La touche F11 dans l'interface web bascule en plein écran, et l'icône ⋯ des consoles permet d'ouvrir la VM dans un nouvel onglet avec noVNC." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "L'API REST écoute uniquement en HTTPS sur le port 8006 avec un certificat auto-signé par défaut : les clients doivent accepter ce certificat ou installer un certificat ACME (voir section 21)." }
    ],
    table: {
      headers: ['Canal', 'Outil', 'Cas d\'usage principal'],
      rows: [
        ['GUI Web', 'https://IP:8006', 'Découverte, opérations ponctuelles, supervision visuelle'],
        ['CLI', 'qm / pct / pvesh', 'Scripting shell, dépannage, opérations rapides en SSH'],
        ['API REST', 'POST /access/ticket', 'Automatisation Terraform / Ansible / Python'],
        ['Console VM', 'noVNC / SPICE', 'Accès à l\'écran de la machine virtuelle'],
        ['Console CT', 'lxc-console', 'Accès direct au conteneur depuis le nœud']
      ]
    }
  },

  {
    id: 'stockage-base',
    track: 'fondamentaux',
    level: 'intermediaire',
    title: 'Stockage de base : ZFS, LVM-Thin, répertoires, NFS, iSCSI',
    icon: 'fa-solid fa-database',
    step: '03',
    requires: ['interface-web'],
    description: 'Le stockage est le socle de toute infrastructure de virtualisation : il héberge les disques des VMs, les conteneurs, les ISO et les sauvegardes. Proxmox VE gère nativement plusieurs technologies via des plugins unifiés : répertoires simples, LVM et LVM-Thin, ZFS (snapshots instantanés et intégrité), NFS, iSCSI et CIFS. Le choix dépend du besoin : performance brute, capacité de snapshot, partage multi-nœuds ou support de la haute disponibilité.',
    cliCommands: [
      `# Statut et capacité de tous les storages du datacenter
pvesm status

# Créer un pool ZFS (recommandé : ashift=12 pour les SSD)
zpool create -f -o ashift=12 tank mirror /dev/sdb /dev/sdc
zfs set compression=lz4 tank

# Déclarer ce pool comme storage Proxmox
pvesm add zfspool local-zfs --pool tank --content images,rootdir

# Ajouter un partage NFS (backups)
pvesm add nfs nfs-backup --server 192.168.10.60 --export /export/pve \\
  --content backup --options vers=4.1

# Lister le contenu d'un storage
pvesm list local-zfs`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Disks</span> → Inventaire des disques et état S.M.A.R.T.",
      "<span class='wb-path'>Node → Disks → ZFS</span> → Créer un pool ZFS via l'assistant",
      "<span class='wb-path'>Datacenter → Storage → Add</span> → Choisir le type (Directory, ZFS, NFS, LVM-Thin…)",
      "<span class='wb-path'>Storage → Edit</span> → Cocher les contenus : Disk image, ISO, Templates, Backups",
      "<span class='wb-path'>Datacenter → Storage</span> → Vérifier la colonne Enabled/Active"
    ],
    diagram: 'fd-storage',
    terminology: ['ZFS', 'LVM-Thin', 'NFS', 'iSCSI', 'Storage plugin', 'Content type'],
    concepts: [
      { term: 'ZFS', def: "Système de fichiers transactionnel : intégrité par checksums, compression native, snapshots instantanés, RAID logiciel (mirror, raidz)." },
      { term: 'LVM-Thin', def: "Volume logique à provisionnement allégé : disques alloués à la demande, snapshots, mais pas de checksum ni compression." },
      { term: 'Storage plugin', def: "Module Proxmox unifiant une technologie de stockage derrière une interface commune (pvesm, GUI, API)." },
      { term: 'Content type', def: "Classification du contenu d'un storage : images (disques VM), rootdir (CT), iso, vztmpl (templates LXC), backup." },
      { term: 'Local vs partagé', def: "Un storage local n'est vu que d'un nœud (pas de migration avec stockage), un storage partagé (NFS, Ceph) est vu de tous les nœuds (prérequis HA)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "ZFS est gourmand en RAM : prévoyez 1 Go de RAM par To de pool minimum (8 Go recommandés pour le cache ARC sur les petits pools)." },
      { type: 'info', icon: 'fa-circle-info', text: "L'ashift=12 (secteurs 4K) doit être fixé à la création du pool : il ne se modifie pas ensuite et garantit les performances sur les SSD modernes." }
    ],
    table: {
      headers: ['Technologie', 'Snapshots', 'Partage multi-nœuds', 'Cas d\'usage'],
      rows: [
        ['Directory (ext4/xfs)', 'Non', 'Non', 'ISO, templates, backups simples'],
        ['LVM-Thin', 'Oui', 'Non', 'VMs/CTs locaux performants'],
        ['ZFS', 'Oui (instantanés)', 'Non (réplication pvesr)', 'Production locale, intégrité, compression'],
        ['NFS', 'Selon backend', 'Oui', 'Backups, ISO partagés'],
        ['iSCSI', 'Non (via LVM au-dessus)', 'Oui', 'SAN existant, cluster HA'],
        ['Ceph RBD', 'Oui', 'Oui', 'HCI multi-nœuds, HA (parcours Stockage)']
      ]
    }
  },

  {
    id: 'creation-vm',
    track: 'fondamentaux',
    level: 'intermediaire',
    title: 'Création de VM : CPU, RAM, disques, réseau, cloud-init',
    icon: 'fa-solid fa-display-chart-up',
    step: '04',
    requires: ['stockage-base'],
    description: 'Créer une VM KVM bien dimensionnée évite 80 % des problèmes de production : le type de CPU, la réservation mémoire, le bus de disque (VirtIO) et le modèle de carte réseau (VirtIO) déterminent les performances. Cloud-init standardise le premier démarrage : IP fixe, clés SSH, hostname injectés automatiquement depuis un template. Cette section couvre la création manuelle via GUI et CLI, puis la préparation d\'un template cloud-init réutilisable.',
    cliCommands: [
      `# 1. Télécharger une ISO (Ubuntu Server) directement sur le nœud
cd /var/lib/vz/template/iso
wget https://releases.ubuntu.com/24.04/ubuntu-24.04-live-server-amd64.iso

# 2. Créer la VM 100 avec VirtIO partout
qm create 100 --name web-prod --cores 4 --memory 4096 \\
  --cpu host --net0 virtio,bridge=vmbr0 --ostype l26 \\
  --scsihw virtio-scsi-single

# 3. Disque sur ZFS + UEFI + option de démarrage
qm set 100 --scsi0 local-zfs:32,discard=on,ssd=1
qm set 100 --efidisk0 local-zfs:1
qm set 100 --ide2 local:iso/ubuntu-24.04-live-server-amd64.iso,media=cdrom
qm set 100 --boot order=scsi0

# 4. Démarrer et vérifier
qm start 100
qm status 100
qm config 100`
    ],
    guiSteps: [
      "<span class='wb-path'>Create VM (bouton bleu)</span> → Onglet General : VM ID, Name, Pool",
      "<span class='wb-path'>OS → ISO image</span> → Sélectionner l'ISO téléchargée",
      "<span class='wb-path'>System</span> → Machine q35, BIOS OVMF (UEFI), Add EFI Disk, Qemu Agent",
      "<span class='wb-path'>Disks</span> → Storage local-zfs, Disk size 32, Bus VirtIO Block, Discard, SSD emulation",
      "<span class='wb-path'>CPU / Memory</span> → Cores 4, Type host, Memory 4096, Ballooning",
      "<span class='wb-path'>Network</span> → Bridge vmbr0, Model VirtIO (paravirtualized)",
      "<span class='wb-path'>VM → Hardware → Add → CloudInit Drive</span> → puis onglet Cloud-Init"
    ],
    diagram: 'fd-vm',
    terminology: ['VirtIO', 'Qemu Guest Agent', 'Cloud-init', 'Template', 'Ballooning', 'host CPU'],
    concepts: [
      { term: 'VirtIO', def: "Pilotes paravirtualisés KVM : disque (virtio-blk/virtio-scsi) et réseau (virtio-net) nettement plus rapides que l'émulation IDE/e1000." },
      { term: 'CPU type host', def: "Expose au guest les instructions exactes du processeur hôte : performances maximales mais incompatible avec la migration entre CPU hétérogènes." },
      { term: 'Qemu Guest Agent', def: "Agent invité qui gèle proprement les filesystems lors des snapshots/backs et remonte les IPs à l'interface Proxmox." },
      { term: 'Cloud-init', def: "Standard de configuration initiale : hostname, utilisateur, clés SSH, IP statique injectées au premier boot depuis une image cloud." },
      { term: 'Ballooning', def: "Récupération dynamique de mémoire par l'hôte lorsque le guest n'en a plus besoin (pilote balloon requis)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Installez toujours le Qemu Guest Agent dans le guest (apt install qemu-guest-agent) et activez-le dans les options de la VM : sans lui, les snapshots cohérents et l'affichage des IPs ne fonctionnent pas." },
      { type: 'info', icon: 'fa-circle-info', text: "Le type de CPU kvm64 (défaut) limite les performances : utilisez host sur un cluster mono-génération, ou x86-64-v2-AES pour garantir la compatibilité de migration." }
    ],
    table: {
      headers: ['Paramètre', 'Valeur conseillée', 'Justification'],
      rows: [
        ['Bus disque', 'VirtIO SCSI single', 'Meilleures perfs + TRIM/discard par disque'],
        ['Cache', 'No cache (défaut)', 'Cohérence avec ZFS/LVM qui gèrent déjà le cache'],
        ['NIC', 'VirtIO', 'Throughput quasi natif, faible CPU'],
        ['Machine', 'q35', 'PCIe, UEFI, matériel moderne'],
        ['BIOS', 'OVMF (UEFI)', 'Requis par les OS récents et Secure Boot'],
        ['CPU type', 'host (ou x86-64-v2-AES)', 'Performance vs compatibilité migration']
      ]
    }
  },

  {
    id: 'creation-lxc',
    track: 'fondamentaux',
    level: 'intermediaire',
    title: 'Création de LXC : templates, privileged et unprivileged',
    icon: 'fa-solid fa-box',
    step: '05',
    requires: ['stockage-base'],
    description: 'Les conteneurs LXC offrent des services Linux avec la densité d\'un conteneur et l\'ergonomie d\'une VM : IP propre, filesystem dédié, limites de ressources fines. Proxmox télécharge des templates officiels (Debian, Ubuntu, Alpine, Rocky…) puis instancie des conteneurs privileged ou unprivileged. Le mode unprivileged remappe les UID (100000+) et constitue le choix par défaut en sécurité ; le mode privileged reste nécessaire pour certains usages comme Docker avec nesting ou le GPU passthrough.',
    cliCommands: [
      `# 1. Rafraîchir la liste des templates disponibles
pveam update
pveam available

# 2. Télécharger un template Debian 12
pveam download local debian-12-standard_12.2-1_amd64.tar.zst

# 3. Créer un conteneur UNPRIVILEGED (recommandé)
pct create 200 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \\
  --hostname dns-lab --cores 2 --memory 1024 --swap 512 \\
  --rootfs local-zfs:8 \\
  --net0 name=eth0,bridge=vmbr0,ip=192.168.10.30/24,gw=192.168.10.1 \\
  --unprivileged 1 --features nesting=1 \\
  --ssh-public-keys /root/.ssh/id_ed25519.pub

# 4. Démarrer et entrer dedans
pct start 200
pct enter 200
cat /proc/self/uid_map   # vérifier le mapping UID`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Shell</span> → pveam update (ou via GUI : Storage local → CT Templates → Templates)",
      "<span class='wb-path'>Create CT</span> → General : CT ID, hostname, mot de passe ou clé SSH",
      "<span class='wb-path'>Template</span> → Choisir le template téléchargé",
      "<span class='wb-path'>Disks / CPU / Memory</span> → Tailles adaptées (un LXC est léger : 1 Go RAM suffit souvent)",
      "<span class='wb-path'>Network</span> → Bridge vmbr0, IPv4 statique ou DHCP",
      "<span class='wb-path'>Options</span> → Unprivileged coché, features nesting si besoin",
      "<span class='wb-path'>CT → Console</span> → Premier démarrage instantané"
    ],
    diagram: 'fd-lxc',
    terminology: ['Template LXC', 'CT privilégié', 'CT non privilégié', 'Nesting', 'UID mapping', 'pveam'],
    concepts: [
      { term: 'pveam', def: "Proxmox VE Appliance Manager : gestion des templates LXC (téléchargement, liste, suppression)." },
      { term: 'CT privilégié', def: "Conteneur dont root = root de l'hôte : compatible avec tout (Docker, mount, GPU) mais faille de sécurité si compromission." },
      { term: 'CT non privilégié', def: "Conteneur remappé : root du CT = UID 100000 de l'hôte ; une évasion n'obtient qu'un compte sans droits." },
      { term: 'Nesting', def: "Feature autorisant l'exécution de conteneurs dans le conteneur (requis pour Docker dans LXC)." },
      { term: 'uid_map', def: "Table de correspondance des UIDs entre le conteneur et l'hôte, visible dans /proc/self/uid_map." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Un conteneur privilégié compromis = accès root au nœud : n'utilisez privileged que lorsque c'est techniquement indispensable (Docker avec certaines images, passthrough GPU, montages NFS par l'hôte)." },
      { type: 'info', icon: 'fa-circle-info', text: "Le mapping UID des conteneurs non privilégiés peut nécessiter un sous-uid : vérifiez /etc/subuid et /etc/subgid si vous montez des volumes partagés avec l'hôte." }
    ],
    table: {
      headers: ['Aspect', 'LXC privilégié', 'LXC non privilégié'],
      rows: [
        ['UID root du CT', '= root hôte (0)', 'Remappé 100000+'],
        ['Risque si évasion', 'Critique (root hôte)', 'Faible (utilisateur sans droits)'],
        ['Docker', 'Oui (nesting)', 'Oui dans la plupart des cas (nesting)'],
        ['Montages NFS par le CT', 'Oui', 'Non (via bind-mount hôte)'],
        ['GPU passthrough', 'Oui simple', 'Oui avec ajustements de permissions'],
        ['Recommandation', 'Cas spécifiques documentés', 'DÉFAUT pour tout le reste']
      ]
    }
  },

  {
    id: 'snapshots-clones',
    track: 'fondamentaux',
    level: 'intermediaire',
    title: 'Snapshots et clones : VM et conteneurs',
    icon: 'fa-solid fa-camera',
    step: '06',
    requires: ['creation-vm', 'creation-lxc'],
    description: 'Snapshots et clones sont les deux mécanismes de duplication, aux rôles très différents : le snapshot fige l\'état d\'une machine à un instant T (disque + RAM optionnelle) pour permettre un rollback rapide lors d\'une opération risquée, tandis que le clone fabrique une nouvelle machine depuis un template ou une VM existante. La performance de ces opérations dépend du backend : quasi instantanées sur ZFS/LVM-Thin, lentes en copie sur directory.',
    cliCommands: [
      `# SNAPSHOTS — VM
qm snapshot 100 avant-maintenance --description "Avant mise à jour kernel"
qm listsnapshot 100
qm rollback 100 avant-maintenance
qm delsnapshot 100 avant-maintenance

# SNAPSHOTS — conteneur LXC
pct snapshot 200 avant-changement-dns
pct rollback 200 avant-changement-dns

# TEMPLATES ET CLONES
qm template 100                       # convertir la VM 100 en template
qm clone 100 110 --name web-lab-1 --full 1   # clone complet (indépendant)
qm clone 100 111 --name web-linked-1         # clone lié (rapide, dépend du template)
pct clone 200 210 --hostname dns-lab-2`
    ],
    guiSteps: [
      "<span class='wb-path'>VM → Snapshots → Take Snapshot</span> → Nom, description, inclure RAM",
      "<span class='wb-path'>VM → Snapshots → Rollback</span> → Revenir à l'état du snapshot",
      "<span class='wb-path'>VM → Clone</span> → Mode Full Copy ou Linked Clone",
      "<span class='wb-path'>VM → Convert to template</span> → Transformer en template (irréversible)",
      "<span class='wb-path'>Template → Clone</span> → Créer de nouvelles VMs prêtes à démarrer"
    ],
    diagram: 'fd-snapshots',
    terminology: ['Snapshot', 'Rollback', 'Template', 'Full clone', 'Linked clone', 'Copy-on-write'],
    concepts: [
      { term: 'Snapshot', def: "Point de restauration basé sur copy-on-write : ne remplace PAS une sauvegarde (vit sur le même storage)." },
      { term: 'Rollback', def: "Retour à l'état exact d'un snapshot : les données postérieures sont perdues et les snapshots intermédiaires peuvent être supprimés." },
      { term: 'Template', def: "VM/CT transformé en modèle en lecture seule, source de clones — impossible à démarrer directement." },
      { term: 'Full clone', def: "Copie complète indépendante du template : portable entre storages, mais création plus longue." },
      { term: 'Linked clone', def: "Clone partageant les blocs du template (copy-on-write) : création instantanée et économe, mais dépend du storage du template." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un snapshot n'est pas une sauvegarde : il vit sur le même disque que la VM. Une panne du storage détruit VM et snapshots simultanément — la protection passe par vzdump/PBS (parcours Sauvegarde)." },
      { type: 'info', icon: 'fa-circle-info', text: "Évitez d'accumuler plus de quelques snapshots par VM : chaque snapshot freine légèrement les écritures et complexifie la suppression sur certains backends." }
    ],
    table: {
      headers: ['Critère', 'Snapshot', 'Full clone', 'Linked clone'],
      rows: [
        ['Objectif', 'Revenir en arrière', 'Nouvelle machine indépendante', 'Nouvelle machine économe'],
        ['Durée de création', 'Instantané (COW)', 'Proportionnelle à la taille', 'Instantané (COW)'],
        ['Espace consommé', 'Delta seulement', 'Copie intégrale', 'Delta seulement'],
        ['Dépendance', 'Même VM, même storage', 'Aucune', 'Template + même storage'],
        ['Contient la RAM', 'Optionnel (--ram)', 'Non', 'Non']
      ]
    }
  },

  {
    id: 'validation-fondamentaux',
    track: 'fondamentaux',
    level: 'intermediaire',
    title: 'Validation du parcours : tests et dépannage',
    icon: 'fa-solid fa-clipboard-check',
    step: '07',
    requires: ['snapshots-clones'],
    description: 'Avant de passer aux parcours réseau et sécurité, cette section verrouille les acquis des fondamentaux : vérifier que le nœud est sain, qu\'une VM et un conteneur de référence tournent, que le storage ZFS est actif et que les sauvegardes manuelles fonctionnent. Chaque commande ci-dessous constitue un point de contrôle reproductible : en cas d\'anomalie, le tableau de dépannage indique la cause la plus probable et le remède associé.',
    cliCommands: [
      `# Santé générale du nœud
pveversion -v | head -5
systemctl status pveproxy pvestatd --no-pager
pvesm status

# Vérifications ZFS
zpool status
zpool list

# Inventaire VMs / CTs + agent invité
qm list && pct list
qm agent 100 ping && echo "Qemu Agent OK"

# Sauvegarde manuelle de test (mode snapshot)
vzdump 100 --storage local --mode snapshot --compress zstd

# Journaux utiles en cas de problème
journalctl -u pvestatd -n 50
journalctl -u qemu-server@100 -n 50`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Summary</span> → Aucun avertissement, storage actifs",
      "<span class='wb-path'>Node → Disks → Directory / ZFS</span> → Pool sain (ONLINE, pas d'erreurs)",
      "<span class='wb-path'>VM → Summary</span> → Graphiques CPU/RAM remplis (agent actif)",
      "<span class='wb-path'>VM → Backup → Backup now</span> → Test vzdump manuel",
      "<span class='wb-path'>Datacenter → Permissions</span> → root@pam seul compte actif au départ"
    ],
    diagram: 'base-address-plan',
    terminology: ['pvestatd', 'pveproxy', 'vzdump', 'zpool status', 'Qemu Guest Agent'],
    concepts: [
      { term: 'pvestatd', def: "Daemon de statistiques Proxmox : alimente les graphiques et l'état des ressources ; à redémarrer si l'UI affiche des données figées." },
      { term: 'pveproxy', def: "Serveur web interne de l'interface d'administration (port 8006)." },
      { term: 'zpool status', def: "Commande ZFS d'état du pool : ONLINE = sain, DEGRADED = un disque défaillant, FAULTED = pool indisponible." },
      { term: 'vzdump', def: "Outil de sauvegarde natif : capture une VM/CT en mode snapshot/suspend/stop vers un storage de type backup." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Si pvesm status affiche un storage en état unknown, vérifiez la connectivité NFS/iSCSI ou l'état du pool ZFS avant toute création de VM : les écritures échoueraient." },
      { type: 'success', icon: 'fa-circle-check', text: "Checklist de sortie du parcours : 1 nœud à jour, 1 pool ZFS sain, 1 VM KVM + 1 LXC démarrés, 1 template clonable, 1 sauvegarde vzdump réussie." }
    ],
    table: {
      headers: ['Symptôme', 'Cause probable', 'Remède'],
      rows: [
        ['UI lente, graphes vides', 'pvestatd arrêté', 'systemctl restart pvestatd'],
        ['apt update erreur 401', 'Dépôt entreprise sans licence', 'Supprimer pve-enterprise.list'],
        ['zpool DEGRADED', 'Disque défaillant', 'zpool replace tank <disque> <nouveau>'],
        ['VM ne démarre pas : KVM non dispo', 'VT-x/AMD-V désactivé dans le BIOS', 'Activer la virtualisation matérielle'],
        ['Snapshot très lent', 'Storage directory (pas de COW)', 'Migrer vers ZFS/LVM-Thin'],
        ['Console noVNC noire', 'Guest sans écran/agent', 'Installer qemu-guest-agent, vérifier le boot']
      ]
    }
  }
]);
