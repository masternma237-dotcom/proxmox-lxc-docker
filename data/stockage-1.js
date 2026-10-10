/* ═══════════════════════════════════════════════════════════════════════════
   data/stockage-1.js — Parcours STOCKAGE AVANCÉ (sections 30 → 35)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   Contexte CDC : Ceph public 10.20.20.0/24 · cluster 10.30.30.0/24 · réplication ×3
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'zfs',
    track: 'stockage',
    level: 'avance',
    title: 'ZFS : pools, datasets, snapshots, réplication',
    icon: 'fa-solid fa-database',
    step: '30',
    requires: ['stockage-base'],
    description: 'ZFS est le stockage de référence d\'un nœud Proxmox autonome : copy-on-write, checksums de bout en bout, compression transparente et snapshots instantanés. Un pool (zpool) assemble des vdevs redondants (mirror ou RAIDZ) sur lesquels on crée datasets et zvols hébergeant les disques de VMs. Le cache ARC valorise la RAM disponible, L2ARC prolonge la lecture sur SSD et SLOG accélère les écritures synchrones. La réplication pvesr exploite les snapshots pour envoyer périodiquement chaque volume vers un second nœud : la protection de référence en mono-nœud ou sans Ceph. Cette section approfondit le socle vu dans stockage-base et prépare les choix HA du parcours.',
    cliCommands: [
      `# Créer un pool ZFS redondant (ashift=12 : secteurs 4K, SSD)
zpool create -f -o ashift=12 -O compression=lz4 -O atime=off tank mirror /dev/sdb /dev/sdc
zpool add tank mirror /dev/sdd /dev/sde
zpool status

# Scrub hebdomadaire recommandé (vérifie tous les checksums)
zpool scrub tank`,
      `# Dataset dédié aux disques de VMs + déclaration Proxmox
zfs create tank/vmdata
zfs get recordsize,compression tank/vmdata
pvesm add zfspool local-zfs --pool tank/vmdata --content images,rootdir

# Destruction définitive du pool : exporter d'abord, sauvegarder toujours
zpool export tank
zpool destroy tank`,
      `# Snapshot manuel puis envoi vers un second nœud
zfs snapshot tank/vmdata@pre-migration
zfs send tank/vmdata@pre-migration | ssh root@pve2 zfs receive -F tank/vmdata

# Réplication Proxmox automatisée (job 101-1 → pve2, toutes les 15 min)
pvesr create-local-job 101-1 pve2 --schedule "*/15"
pvesr list`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Disks → ZFS</span> → Create: ZFS → nom « tank », RAID level Mirror, compression lz4, ashift 12",
      "<span class='wb-path'>Node → Disks</span> → Vérifier le pool créé : santé, capacité, disques membres",
      "<span class='wb-path'>Datacenter → Storage → Add → ZFS</span> → Pool « tank/vmdata », content Disk image + Container",
      "<span class='wb-path'>VM → Snapshots → Take Snapshot</span> → Snapshot instantané grâce au copy-on-write",
      "<span class='wb-path'>Datacenter → Replication → Add</span> → Job de réplication 101-1 vers pve2, calendrier */15"
    ],
    diagram: 'sto-zfs',
    terminology: ['ZFS', 'Pool ZFS', 'Dataset', 'ARC', 'ashift', 'RAIDZ', 'SLOG', 'pvesr'],
    concepts: [
      { term: 'Pool ZFS', def: "Assemblage de vdevs redondants : capacité et IOPS se répartissent sur tous les vdevs ; on en ajoute, on n'en retire pas." },
      { term: 'Dataset', def: "Découpage du pool avec propriétés héritables (compression, quota, recordsize) ; les zvols (type volume) hébergent les disques de VMs." },
      { term: 'ARC / L2ARC / SLOG', def: "Trio de caches : ARC en RAM (lecture chaude), L2ARC sur SSD (prolongation), SLOG sur NVMe (journaux d'écritures synchrones)." },
      { term: 'RAIDZ vs mirror', def: "RAIDZ1/2/3 optimise la capacité ; le mirror offre plus d'IOPS et une reconstruction rapide — le choix par défaut de Proxmox." },
      { term: 'pvesr', def: "Réplication par snapshots ZFS d'un nœud à l'autre : le même volume existe sur les deux nœuds, calendrier et débit configurables." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "ZFS est gourmand en RAM : comptez 1 Go par To de pool minimum (ARC inclus). Évitez la déduplication ; si Ceph cohabite sur les mêmes nœuds, réservez la mémoire ARC." },
      { type: 'info', icon: 'fa-circle-info', text: "ashift, recordsize et la topologie des vdevs se décident à la création et se corrigent difficilement : privilégiez ashift=12 et des mirrors." }
    ],
    table: {
      headers: ['Vdev', 'Redondance', 'Capacité utile', 'Quand l\'utiliser'],
      rows: [
        ['Mirror (2 disques)', '1 par vdev', '50 %', 'Défaut Proxmox : IOPS et rebuild rapide'],
        ['RAIDZ1 (3+ disques)', '1 disque', '(n-1)/n', 'Capacité, archives, NAS'],
        ['RAIDZ2 (4+ disques)', '2 disques', '(n-2)/n', 'Production, gros pools'],
        ['RAIDZ3 (5+ disques)', '3 disques', '(n-3)/n', 'Cas rares, très haute sécurité'],
        ['Stripe (aucune)', 'Aucune', '100 %', 'Interdit en production']
      ]
    }
  },

  {
    id: 'ceph-hci',
    track: 'stockage',
    level: 'avance',
    title: 'Ceph HCI : OSD, MON, MDS, CRUSH, pools',
    icon: 'fa-solid fa-cubes-stacked',
    step: '31',
    requires: ['zfs'],
    description: 'Ceph transforme trois nœuds Proxmox en cluster hyperconvergé : chaque nœud héberge des OSDs (disques), des MON (quorum) et un manager, tandis que CRUSH répartit automatiquement les objets. Proxmox VE intègre le déploiement via pveceph et pilote l\'ensemble depuis l\'interface web : pools RBD, santé, OSDs. Le labo CFP-CMD sépare le réseau public (10.20.20.0/24, trafic clients) du réseau cluster (10.30.30.0/24, réplication). Les pools répliqués en size=3 tolèrent la perte d\'un OSD, voire d\'un nœud complet, sans interruption : le socle du HA et de la migration live sans copie de disques.',
    cliCommands: [
      `# Installer Ceph et initialiser la configuration (CDC : réseaux dédiés)
pveceph install
pveceph init --network 10.20.20.0/24 --cluster-network 10.30.30.0/24

# État global du cluster
ceph -s`,
      `# Sur chaque nœud : MON + MGR, puis les OSDs (bluestore)
pveceph mon create
pveceph mgr create
pveceph osd create /dev/sdb
pveceph osd create /dev/sdc

# Arborescence CRUSH et santé détaillée
ceph osd tree
ceph health detail`,
      `# Pool répliqué pour les VMs (CDC : 3 copies, 2 minimum en dégradé)
pveceph pool create vms --add_rbd --size 3 --min_size 2 --pg_autoscale_mode on

# Déclarer le storage RBD dans Proxmox
pvesm add rbd ceph-rbd --pool vms --content images,rootdir
ceph df`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Ceph → Configuration</span> → Vérifier réseaux public 10.20.20.0/24 et cluster 10.30.30.0/24",
      "<span class='wb-path'>Datacenter → Ceph → Monitors → Create</span> → 3 MON répartis sur pve1, pve2 et pve3",
      "<span class='wb-path'>Datacenter → Ceph → Managers → Create</span> → 2 MGR en actif/passif",
      "<span class='wb-path'>Datacenter → Ceph → OSDs → Create: OSD</span> → Disques non utilisés, bluestore, un OSD par disque",
      "<span class='wb-path'>Datacenter → Ceph → Pools → Create</span> → Pool « vms », PG autoscale on, size 3, min_size 2",
      "<span class='wb-path'>Datacenter → Storage → Add → RBD (Ceph)</span> → Storage ceph-rbd, content Disk image + Container"
    ],
    diagram: 'sto-ceph',
    terminology: ['Ceph', 'OSD', 'MON', 'MDS', 'CRUSH', 'Placement group', 'Pool Ceph', 'RBD'],
    concepts: [
      { term: 'OSD', def: "Un disque = un daemon OSD (bluestore) : unité de stockage et de réplication ; visez au moins 4 OSDs par nœud en production." },
      { term: 'MON + MGR', def: "Les MON maintiennent la carte du cluster par quorum (3 minimum) ; le MGR pilote la supervision et l'équilibrage." },
      { term: 'MDS / CephFS', def: "Le MDS expose le filesystem CephFS : inutile pour les disques RBD des VMs, à activer séparément si besoin." },
      { term: 'CRUSH', def: "Algorithme déclaratif : sans table centralisée, il calcule où placer les copies selon la topologie (host, rack) et la règle du pool." },
      { term: 'PG et size', def: "Les placement groups échantillonnent le travail ; size=3 avec min_size=2 (CDC) garantit les écritures même si un OSD tombe." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "3 nœuds minimum, 32 Go de RAM chacun et des réseaux dédiés 10 GbE : Ceph partage CPU, RAM et disques avec les VMs — surdimensionnez, sinon la latence s'effondre." },
      { type: 'info', icon: 'fa-circle-info', text: "Un OSD perdu pendant une resynchronisation = risque de perte de données : attendez HEALTH_OK et la remontée des PG avant d'éteindre un nœud." }
    ],
    table: {
      headers: ['Composant', 'Rôle', 'Réseau CDC', 'Minimum labo'],
      rows: [
        ['MON', 'Quorum, carte du cluster', 'Public 10.20.20.0/24', '3 (1 par nœud)'],
        ['MGR', 'Supervision, équilibrage', 'Public 10.20.20.0/24', '2 (actif/passif)'],
        ['OSD', 'Données + réplication', 'Cluster 10.30.30.0/24', '2 par nœud (6 total)'],
        ['MDS', 'Métadonnées CephFS', 'Public 10.20.20.0/24', '0 (RBD seul)'],
        ['Pool RBD', 'Disques VMs/CTs', 'Public + cluster', '1 pool size=3']
      ]
    }
  },

  {
    id: 'ceph-avance',
    track: 'stockage',
    level: 'avance',
    title: 'Ceph avancé : performance, tiering, erasure coding',
    icon: 'fa-solid fa-gauge-high',
    step: '32',
    requires: ['ceph-hci'],
    description: 'Au-delà du déploiement, un cluster Ceph se pilote par ses règles CRUSH : les classes de périphériques (ssd, hdd, nvme) dirigent les pools chauds et froids. L\'erasure coding remplace la réplication sur les données volumineuses : k blocs de données + m blocs de parité offrent une capacité utile bien supérieure, au prix d\'écritures plus lourdes. Le cache tiering classique est officiellement déconseillé : on préfère la séparation par pools et classes de périphériques. Le PG autoscaler, les seuils de remplissage et l\'ordre noout pendant la maintenance font enfin la différence entre un cluster sain et un cluster bloqué.',
    cliCommands: [
      `# Classes de périphériques et règle dédiée SSD pour les VMs
ceph osd crush tree
ceph osd crush rule create-replicated hot-ssd default host ssd
ceph osd pool set vms crush_rule hot-ssd`,
      `# Pool d'archive en erasure coding 4+2 sur les HDD (CDC)
ceph osd erasure-code-profile set ec42 k=4 m=2 crush-device-class=hdd
ceph osd pool create archive 32 32 erasure ec42
ceph osd pool set archive allow_ec_overwrites true`,
      `# Observation et garde-fous d'exploitation
ceph df
ceph osd pool autoscale-status
ceph osd set noout          # maintenance : ne pas éjecter les OSDs
ceph osd unset noout
ceph osd pool set vms size 3
ceph osd pool set vms min_size 2`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Ceph → CRUSH</span> → Visualiser la topologie, classes ssd/hdd et règles",
      "<span class='wb-path'>Datacenter → Ceph → Pools → Edit</span> → Règle crush_rule, size, min_size et autoscale",
      "<span class='wb-path'>Datacenter → Ceph → Configuration</span> → Options osd_* : recovery, fills, seuils de remplissage",
      "<span class='wb-path'>Datacenter → Ceph → Health</span> → Exiger HEALTH_OK avant et après toute opération"
    ],
    diagram: 'sto-ceph-advanced',
    terminology: ['Erasure coding', 'Tiering', 'Pool Ceph', 'Placement group', 'CRUSH', 'RBD'],
    concepts: [
      { term: 'Device class', def: "Chaque OSD est étiqueté ssd/hdd/nvme : les règles CRUSH dirigent chaque pool vers sa classe — la base du tiering moderne." },
      { term: 'Erasure coding', def: "k+m blocs répartis (4+2 = ×1,5 d'occupation) : idéal archives et backups, lent en écriture aléatoire — jamais pour les disques système de VMs." },
      { term: 'allow_ec_overwrites', def: "Autorise la réécriture partielle sur un pool EC : prérequis pour y mettre du RBD, au prix de lectures/écritures supplémentaires." },
      { term: 'PG autoscaler', def: "Calcule automatiquement le nombre de placement groups par pool : gardez-le en mode on pour éviter le sous-dimensionnement." },
      { term: 'Maintenance noout', def: "Posez noout avant l'intervention, remplacez l'OSD, vérifiez la remontée des PG : procédure stricte pour ne jamais dégrader les 3 copies." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "L'erasure coding multiplie les lectures/écritures réseau : réservez-le aux données froides (archives, backups) et gardez la réplication size=3 pour les disques de VMs." },
      { type: 'info', icon: 'fa-circle-info', text: "Le cache tiering (cache pools) est déconseillé depuis Luminous : préférez deux pools distincts posés sur deux classes de périphériques CRUSH." }
    ],
    table: {
      headers: ['Technique', 'Occupation', 'Écriture', 'Usage recommandé'],
      rows: [
        ['Répliqué size=3', '×3 (33 % utile)', 'Rapide', 'Disques de VMs/CTs, images chaudes'],
        ['EC 4+2 (k=4 m=2)', '×1,5 (67 % utile)', 'Lourde', 'Archives, backups, médias'],
        ['EC 8+3 (k=8 m=3)', '×1,375 (73 % utile)', 'Lourde', 'Grands volumes froids'],
        ['Tiering par classes', 'Selon pools', 'Transparente', 'Chaud SSD + froid HDD via CRUSH']
      ]
    }
  },

  {
    id: 'lvm-thin',
    track: 'stockage',
    level: 'avance',
    title: 'LVM-Thin : avantages, limites, snapshots',
    icon: 'fa-solid fa-layer-group',
    step: '33',
    requires: ['zfs'],
    description: 'LVM-Thin est le stockage local par défaut d\'une installation Proxmox : un thin pool LVM alloue les blocs à la demande et supporte les snapshots par copy-on-write. Plus simple et moins gourmand en RAM que ZFS, il délivre d\'excellentes performances sur NVMe pour des VMs et conteneurs locaux. Ses limites sont nettes : aucun checksum, aucune compression, aucun RAID intégré et aucun partage multi-nœuds. Il exige une surveillance du remplissage (data% et meta%), car un thin pool plein corrompt les écritures. Le bon choix pour un nœud autonome rapide, jamais pour un cluster HA sans réplication ni Ceph.',
    cliCommands: [
      `# Créer un VG puis un thin pool dédié (chunk 256K, discard)
vgcreate vg-data /dev/sdb
lvcreate --type thin-pool -l 90%FREE -c 256k -n thinpool vg-data
lvs`,
      `# Déclarer le storage LVM-Thin dans Proxmox
pvesm add lvmthin local-thin --vgname vg-data --thinpool thinpool --content images,rootdir

# Grandir le pool ou ses métadonnées avant saturation
lvextend --size +100G vg-data/thinpool
lvextend --poolmetadatasize +2G vg-data/thinpool`,
      `# Snapshots et récupération d'espace
qm snapshot 101 pre-upgrade
qm rollback 101 pre-upgrade
fstrim -av                  # dans le guest : rend les blocs au thin pool
lvremove vg-data/vm-101-disk-0   # suppression d'un disque orphelin`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Disks → LVM-Thin</span> → Create: Thinpool (VG, nom du pool, taille du chunk)",
      "<span class='wb-path'>Datacenter → Storage → Add → LVM-Thin</span> → VG « vg-data », thinpool, content Disk image + Container",
      "<span class='wb-path'>VM → Hardware → Hard Disk → Edit</span> → Cocher Discard pour le TRIM vers le thin pool",
      "<span class='wb-path'>VM → Snapshots → Take Snapshot</span> → Snapshot supporté (contrairement à LVM classique)"
    ],
    diagram: 'sto-lvmthin',
    terminology: ['LVM-Thin', 'Thin provisioning', 'Snapshot', 'Copy-on-write', 'Storage plugin'],
    concepts: [
      { term: 'Thin pool', def: "Deux espaces distincts : data (blocs des volumes) et metadata (carte d'allocation) — chacun peut saturer indépendamment." },
      { term: 'Discard / TRIM', def: "Le guest restitue les blocs supprimés : sans discard coché, le thin pool se remplit de façon irréversible." },
      { term: 'Snapshot COW', def: "Le snapshot fige la carte d'allocation : seuls les blocs modifiés ensuite sont dupliqués — restauration quasi instantanée." },
      { term: 'Local uniquement', def: "Aucun partage entre nœuds : pour le HA, il faut répliquer avec pvesr ou basculer sur Ceph (sections précédentes)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un thin pool à 100 % bloque ou corrompt les écritures des VMs : alertez avant 80 % de data% et de meta%, et gardez 10 % d'espace libre dans le VG." },
      { type: 'info', icon: 'fa-circle-info', text: "Cochez Discard sur chaque disque et planifiez fstrim dans le guest : sans TRIM, l'espace supprimé côté guest n'est jamais rendu au pool." }
    ],
    table: {
      headers: ['Critère', 'LVM-Thin', 'ZFS'],
      rows: [
        ['Snapshots', 'Oui (COW par chunks)', 'Oui (instantanés)'],
        ['Checksums d\'intégrité', 'Non', 'Oui'],
        ['Compression', 'Non', 'LZ4/ZSTD native'],
        ['RAID intégré', 'Non (mdadm ou matériel)', 'Oui (mirror, RAIDZ)'],
        ['RAM consommée', 'Minimale', 'Élevée (ARC)'],
        ['Partage multi-nœuds', 'Non', 'Non (réplication pvesr)']
      ]
    }
  },

  {
    id: 'storage-plugins',
    track: 'stockage',
    level: 'avance',
    title: 'Storage plugins : NFS, iSCSI, CIFS, S3',
    icon: 'fa-solid fa-plug',
    step: '34',
    requires: ['lvm-thin'],
    description: 'Proxmox unifie toutes les technologies derrière des storage plugins déclarés dans /etc/pve/storage.cfg et pilotés par pvesm. Deux familles coexistent : les plugins fichier (NFS, CIFS/SMB, S3 expérimental) montés par le noyau, et les plugins bloc (iSCSI, RBD, ZFS) exposés comme périphériques. Le content type de chaque storage (images, rootdir, iso, vztmpl, backup) détermine ce qu\'il peut héberger : un NAS NFS servira les ISO et les backups, pas les disques de VMs performants. iSCSI expose un LUN brut qu\'on habille d\'un VG LVM avant de créer les volumes. Le plugin S3, apparu avec Proxmox VE 9, cible les datastores PBS plutôt que les disques de VMs.',
    cliCommands: [
      `# Découvrir puis ajouter un partage NFS (ISO et templates)
pvesm scan nfs 192.168.10.60
pvesm add nfs nfs-iso --server 192.168.10.60 --export /export/iso \\
  --content iso,vztmpl --options vers=4.1`,
      `# CIFS pour les backups + iSCSI habillé d'un VG LVM
pvesm add cifs cifs-backup --server 192.168.10.61 --share pve-backup \\
  --username svc-pve --password 'MotDePasse!' --content backup
pvesm add iscsi san-lun0 --portal 192.168.10.70 \\
  --target iqn.2024-01.cfp-cmd.local:storage.lun0 --content images
pvesm add lvm san-lvm --vgname vg-san --base san-lun0 --content images`,
      `# Gestion courante des storages
pvesm status
pvesm set local --content iso,vztmpl,backup
pvesm list nfs-iso
pvesm remove cifs-backup`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Storage → Add → NFS</span> → Serveur, export, content types ISO + Templates",
      "<span class='wb-path'>Datacenter → Storage → Add → CIFS</span> → Partage SMB avec identifiants, content Backup",
      "<span class='wb-path'>Datacenter → Storage → Add → iSCSI</span> → Portal, IQN cible, content Disk image",
      "<span class='wb-path'>Datacenter → Storage → Add → LVM</span> → Base « san-lun0 » pour poser le VG sur le LUN",
      "<span class='wb-path'>Datacenter → Storage</span> → Colonnes Type / Content / Shared : cohérence des rôles"
    ],
    diagram: 'sto-plugins',
    terminology: ['Storage plugin', 'Content type', 'NFS', 'iSCSI', 'RBD', 'PBS'],
    concepts: [
      { term: 'storage.cfg', def: "Fichier central /etc/pve/storage.cfg répliqué sur tout le cluster : chaque storage y est décrit par son plugin et ses options." },
      { term: 'Fichier vs bloc', def: "NFS/CIFS servent des fichiers (ISO, backups) ; iSCSI/RBD exposent des blocs (disques de VMs) — les usages ne se recouvrent pas." },
      { term: 'Sandwich iSCSI + LVM', def: "Le plugin iSCSI ne découpe pas le LUN : on pose un VG LVM dessus (plugin lvm --base) qui crée les volumes par VM." },
      { term: 'S3 (PVE 9)', def: "Backend expérimental orienté sauvegarde via PBS : pas destiné aux disques de VMs ni aux ISO en production." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "NFS/CIFS sur NAS grand public = latence et verrous imprévisibles : réservez-les aux backups et aux ISO, jamais aux disques de VMs en production." },
      { type: 'info', icon: 'fa-circle-info', text: "Un LUN iSCSI exposé à plusieurs nœuds doit rester cohérent : seul le VG LVM déclaré côté Proxmox écrit dessus, jamais un mkfs local." }
    ],
    table: {
      headers: ['Plugin', 'Nature', 'Content types', 'Usage CDC'],
      rows: [
        ['NFS', 'Fichier partagé', 'iso, vztmpl, backup', 'ISO et backups sur NAS'],
        ['CIFS (SMB)', 'Fichier partagé', 'backup, iso', 'Backups vers NAS Windows'],
        ['iSCSI + LVM', 'Bloc SAN', 'images', 'SAN existant, cluster HA'],
        ['RBD (Ceph)', 'Bloc distribué', 'images, rootdir', 'HCI et HA (sections 31-32)'],
        ['S3 (PVE 9)', 'Objet expérimental', 'backup', 'Datastore PBS distant']
      ]
    }
  },

  {
    id: 'migration-stockage',
    track: 'stockage',
    level: 'avance',
    title: 'Migration de stockage : local → partagé',
    icon: 'fa-solid fa-arrows-rotate',
    step: '35',
    requires: ['storage-plugins'],
    description: 'Migrer un stockage local vers un stockage partagé est le passage obligé pour activer HA et migration live sans copie de disques. La méthode : déclarer le storage partagé (Ceph RBD, NFS…), puis déplacer chaque disque de VM ou de CT avec qm move-disk, pct move-volume ou le bouton Move Storage de l\'interface. Le déplacement se fait à chaud sur ZFS, LVM-Thin, RBD et directory, avec choix de conserver ou non le disque source. Une fois tous les volumes sur le stockage partagé, qm migrate --online ne transfère plus que la mémoire : l\'interruption tombe à quelques secondes. pvesm export/import reste l\'outil de secours pour des copies bloc à bloc entre storages exotiques.',
    cliCommands: [
      `# État initial : quels disques sur quels storages ?
pvesm status
qm config 101 | grep -E 'scsi|virtio|efidisk'
pct config 200`,
      `# Déplacer les disques vers le storage partagé (à chaud)
qm move-disk 101 scsi0 ceph-rbd --delete 1
qm move-disk 101 efidisk0 ceph-rbd --delete 1
pct move-volume 200 rootfs ceph-rbd --delete 1
qm rescan`,
      `# Validation puis migration live entre nœuds
qm start 101 && qm status 101
qm migrate 101 pve2 --online
pvesm list ceph-rbd`
    ],
    guiSteps: [
      "<span class='wb-path'>VM → Hardware → Hard Disk → Volume Action → Move Storage</span> → Cible ceph-rbd, cocher Delete source après test",
      "<span class='wb-path'>CT → Resources → Volume Action → Move Volume</span> → Même méthode pour rootfs et mountpoints",
      "<span class='wb-path'>VM → Snapshots</span> → Supprimer les snapshots avant le déplacement (ils ne sont pas copiés)",
      "<span class='wb-path'>VM → Migrate</span> → Migration live : le stockage partagé évite toute copie de disques",
      "<span class='wb-path'>Datacenter → Storage</span> → Vérifier que ceph-rbd est actif sur tous les nœuds"
    ],
    diagram: 'sto-migration',
    terminology: ['Storage migration', 'Storage plugin', 'Content type', 'Nœud (node)', 'RBD', 'Cluster'],
    concepts: [
      { term: 'move-disk vs migrate', def: "move-disk déplace un disque entre storages ; migrate déplace la VM entre nœuds — le stockage partagé dissocie les deux opérations." },
      { term: 'Option --delete', def: "Conserve ou supprime le disque source : validez le démarrage sur la cible avant de libérer l'original (ou décochez Delete)." },
      { term: 'Volumes non déplaçables', def: "ISO, templates et disques sur des storages sans support de move restent locaux : anticipez avant le basculement." },
      { term: 'Zéro copie après bascule', def: "Disques partagés = migration live instantanée côté disques ; la seule donnée transférée est la RAM de la VM." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un disque avec snapshots ne peut pas être déplacé : supprimez-les avant qm move-disk, puis testez le boot de la VM avant de valider --delete." },
      { type: 'success', icon: 'fa-circle-check', text: "Checklist de sortie du parcours : VM 101 et CT 200 intégralement sur ceph-rbd, HA activable, migration live pve1 → pve2 avec moins de 30 s d'interruption." }
    ],
    table: {
      headers: ['Scénario', 'Outil', 'Interruption', 'Remarque'],
      rows: [
        ['Disque local → RBD', 'qm move-disk --delete', 'Aucune (à chaud)', "Supprimer les snapshots d'abord"],
        ['CT rootfs → RBD', 'pct move-volume', 'Aucune (à chaud)', 'Idem pour les mountpoints'],
        ['Nœud → nœud sans partage', 'qm migrate --with-local-disks', 'Copie complète', 'Solution de transition'],
        ['Storage → storage exotique', 'pvesm export / import', 'VM arrêtée', 'Copie bloc à bloc scriptable'],
        ['VM arrêtée', 'qm move-disk', 'Boot suivant', 'Plus rapide qu\'à chaud']
      ]
    }
  }
]);
