/* ═══════════════════════════════════════════════════════════════════════════
   data/backup-1.js — Parcours SAUVEGARDE (sections 50 → 56)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   CDC 3.7 : PBS 192.168.10.20 · datastore backup-store (/mnt/backup) ·
   backup@pbs · job 02:00 · mode snapshot · compression zstd · Protected: yes
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'vzdump',
    track: 'backup',
    level: 'intermediaire',
    title: 'vzdump : modes, compression, planification',
    icon: 'fa-solid fa-floppy-disk',
    step: '50',
    requires: ['stockage-base'],
    description: 'vzdump est l\'outil de sauvegarde natif de Proxmox VE : il capture chaque VM (archive .vma.zst) et chaque conteneur (.tar.zst) vers un storage de type backup. Trois modes sont disponibles — snapshot (machine active via copy-on-write), suspend (guest figé) et stop (arrêt complet, cohérence maximale) — à choisir selon le backend et la fenêtre de maintenance. La compression zstd offre le meilleur compromis vitesse/taux, avec lzo en alternative rapide et gzip pour la portabilité. La planification passe par un backup job au niveau Datacenter (Schedule 02:00 sur le labo CFP-CMD) ou par pvesh/cron pour les cas particuliers. Les options bwlimit, notes-template et exclude-path affinent chaque job.',
    cliCommands: [
      `# Sauvegarde manuelle de la VM 100 (mode snapshot, compression zstd)
vzdump 100 --storage local --mode snapshot --compress zstd \\
  --notes-template '{{guestname}} - {{node}} - manuel'

# Les trois modes (vers un storage de type backup)
vzdump 101 --mode stop     --storage local   # arrêt complet, cohérence maximale
vzdump 102 --mode suspend  --storage local   # guest figé pendant la copie
vzdump 103 --mode snapshot --storage local   # VM active (ZFS / LVM-Thin / Ceph)`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Backup → Add</span> → Job : Node All, Storage pbs-backup, Schedule 02:00 (CDC)",
      "<span class='wb-path'>Datacenter → Backup → Edit</span> → Mode snapshot, Compression zstd, destinataire e-mail et notifications",
      "<span class='wb-path'>Datacenter → Backup → Retention</span> → Keep Last 7 · Keep Daily 7 · Keep Monthly 3",
      "<span class='wb-path'>VM → Backup → Backup now</span> → Sauvegarde manuelle immédiate (mode, destination, notes)",
      "<span class='wb-path'>Datacenter → Storage → local → Edit</span> → Vérifier le content type Backup et la rétention du storage"
    ],
    diagram: 'bak-vzdump',
    terminology: ['vzdump', 'Mode snapshot', 'Mode suspend', 'Mode stop', 'Backup job', 'Retention', 'Content type'],
    concepts: [
      { term: 'vzdump', def: "Outil natif de sauvegarde : produit des archives vma.zst (VM KVM) ou tar.zst (CT) vers un storage de content type backup." },
      { term: 'Backup job', def: "Tâche planifiée du Datacenter : storage, schedule, mode, compression, sélection des guests et notification e-mail." },
      { term: 'Retention', def: "Politique de conservation appliquée en fin de job : keep-last, keep-daily, keep-weekly, keep-monthly, keep-yearly." },
      { term: 'notes-template', def: "Modèle de description injecté dans chaque archive ({{guestname}}, {{node}}, {{job-id}}…) pour identifier les dumps." },
      { term: 'bwlimit', def: "Plafond de débit en KiB/s pour ne pas saturer le réseau ni le storage pendant la fenêtre de sauvegarde." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le mode snapshot exige un backend copy-on-write : sur un storage directory, vzdump bascule implicitement en stop pour les VMs et suspend pour les CTs — prévoyez ZFS ou LVM-Thin pour la sauvegarde à chaud." },
      { type: 'info', icon: 'fa-circle-info', text: "Fenêtre 02:00 côté labo : vérifiez que la durée cumulée des jobs ne mord pas sur les heures de pointe ; l'option bwlimit protège le réseau de production." }
    ],
    table: {
      headers: ['Mode', 'Principe', 'VM active ?', 'Points clés'],
      rows: [
        ['stop', 'Arrêt total → copie → redémarrage', 'Non', 'Cohérence maximale ; downtime égal à la durée de copie'],
        ['suspend', 'Guest figé pendant la copie', 'Non (processus en pause)', 'Alternative pour les CTs sur storage sans snapshot'],
        ['snapshot', 'Copy-on-write du backend', 'Oui', 'Exige ZFS, LVM-Thin ou Ceph ; agent invité pour la cohérence'],
        ['Compression zstd', 'Flux compressé à la volée', '—', 'Meilleur compromis vitesse/taux ; lzo plus rapide, gzip plus portable']
      ]
    }
  },

  {
    id: 'pbs-installation',
    track: 'backup',
    level: 'intermediaire',
    title: 'Proxmox Backup Server : installation, datastore',
    icon: 'fa-solid fa-cloud-arrow-up',
    step: '51',
    requires: ['vzdump'],
    description: 'Proxmox Backup Server est le socle de sauvegarde moderne de l\'écosystème Proxmox : déduplication par chunks, compression, chiffrement et vérification d\'intégrité natives. Il s\'installe depuis son ISO dédiée ou en paquets sur une Debian 12, puis expose une interface web sur le port 8007. Le datastore (backup-store sur /mnt/backup au labo) héberge les données dédupliquées et sert de cible au storage pbs-backup déclaré côté cluster via le serveur 192.168.10.20. Un utilisateur de service backup@pbs, limité au datastore, sécurise l\'accès, et le fingerprint du certificat authentifie le serveur auprès des clients. Le job quotidien de 02:00 en mode snapshot avec compression zstd et Protected: yes découle directement du CDC 3.7.',
    cliCommands: [
      `# Sur le serveur PBS (192.168.10.20) : installation via les dépôts Debian
apt update && apt install -y proxmox-backup-server
systemctl status proxmox-backup-proxy proxmox-backup --no-pager
proxmox-backup-manager version`,

      `# Datastore du CDC 3.7 + utilisateur de service
proxmox-backup-manager datastore create backup-store /mnt/backup
proxmox-backup-manager datastore list

proxmox-backup-manager user create backup@pbs
proxmox-backup-manager acl update /datastore/backup-store Datastore.Admin \\
  --auth-id backup@pbs

# Empreinte du certificat (à recopier côté Proxmox VE)
openssl x509 -in /etc/proxmox-backup/proxy.crt -noout -fingerprint -sha256`,

      `# Côté Proxmox VE : déclarer le storage PBS puis vérifier (CDC 3.7)
pvesm add pbs pbs-backup --server 192.168.10.20 --datastore backup-store \\
  --username backup@pbs --fingerprint <FP_PBS> --password '<MOT_DE_PASSE>'
pvesm status`
    ],
    guiSteps: [
      "<span class='wb-path'>https://192.168.10.20:8007</span> → Connexion à l'interface PBS (root / PAM)",
      "<span class='wb-path'>PBS → Administration → Disks</span> → Préparer le disque dédié (ext4/xfs) qui hébergera /mnt/backup",
      "<span class='wb-path'>PBS → Datastore → Add Datastore</span> → Nom backup-store, chemin /mnt/backup",
      "<span class='wb-path'>PBS → Configuration → Access Control</span> → Créer backup@pbs + ACL Datastore.Admin sur /datastore/backup-store",
      "<span class='wb-path'>Datacenter → Storage → Add → Proxmox Backup Server</span> → Server 192.168.10.20, Datastore backup-store, backup@pbs, fingerprint",
      "<span class='wb-path'>Datacenter → Backup → Add</span> → Storage pbs-backup, Schedule 02:00, Mode snapshot, Compression zstd"
    ],
    diagram: 'bak-pbs',
    terminology: ['PBS', 'Datastore', 'vzdump', 'Chunk', 'Fingerprint', 'Backup job'],
    concepts: [
      { term: 'PBS', def: "Proxmox Backup Server : serveur dédié de sauvegarde avec déduplication, compression, chiffrement et vérification ; interface web sur le port 8007." },
      { term: 'Datastore', def: "Espace de stockage géré par PBS (ex. backup-store sur /mnt/backup) : chunks dédupliqués, index par snapshot et catalogues." },
      { term: 'Fingerprint', def: "Empreinte SHA-256 du certificat PBS : recopiée dans le storage PVE pour authentifier le serveur au premier contact." },
      { term: 'backup@pbs', def: "Utilisateur de service PBS limité au datastore (rôles Datastore.Backup / Datastore.Admin) — jamais root@pam pour les clients." },
      { term: 'Chunk', def: "Tranche de 4 à 8 MiB hachée en SHA-256 : unité de déduplication, de chiffrement et de vérification de PBS." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "N'hébergez jamais le PBS sur les mêmes disques que les guests qu'il sauvegarde : une VM PBS dans le cluster qu'il protège perd toute résilience en cas de sinistre du site." },
      { type: 'info', icon: 'fa-circle-info', text: "Notez le fingerprint du certificat PBS lors de l'ajout du storage : remplacer le certificat invalide la connexion de tous les clients jusqu'à mise à jour du fingerprint." }
    ],
    table: {
      headers: ['Élément', 'Valeur labo CFP-CMD', 'Rôle'],
      rows: [
        ['Serveur PBS', '192.168.10.20 (port 8007)', 'Reçoit, déduplique et vérifie les sauvegardes'],
        ['Datastore', 'backup-store → /mnt/backup', 'Contient les chunks, index et catalogues'],
        ['Utilisateur client', 'backup@pbs', 'Compte de service limité au datastore'],
        ['Storage PVE', 'pbs-backup (type pbs)', "Point d'entrée vzdump côté cluster"],
        ['Job CDC 3.7', 'Schedule 02:00 · snapshot · zstd', 'Sauvegarde quotidienne de tous les guests'],
        ['Protection', 'Protected : yes', "Préserve les archives d'une suppression accidentelle"]
      ]
    }
  },

  {
    id: 'pbs-avance',
    track: 'backup',
    level: 'avance',
    title: 'PBS avancé : déduplication, chiffrement, vérification',
    icon: 'fa-solid fa-fingerprint',
    step: '52',
    requires: ['pbs-installation'],
    description: 'L\'efficacité de PBS repose sur le découpage des flux en chunks de 4 à 8 MiB hachés SHA-256 : un bloc déjà présent dans le datastore n\'est jamais réécrit, d\'où un facteur de déduplication souvent supérieur à 10×. Le prune applique la politique de rétention (keep-daily, keep-weekly, keep-monthly…) en supprimant des index de sauvegardes, puis le garbage collection libère réellement les chunks orphelins selon son cycle mark/sweep de 24 h + 5 min. Le chiffrement s\'effectue côté client (AES-256, clé protégée par KDF pbkdf2) : PBS ne stocke alors que du chiffré et la clé reste sous votre contrôle exclusif. Les verify jobs relisent périodiquement chaque chunk pour détecter la corruption silencieuse (bit rot). Ces trois tâches — prune, GC, vérification — s\'automatisent depuis la GUI ou proxmox-backup-manager.',
    cliCommands: [
      `# Rétention : prune job quotidien (7 jours / 4 semaines / 3 mois)
proxmox-backup-manager prune-job add prune-daily \\
  --store backup-store --schedule daily \\
  --keep-daily 7 --keep-weekly 4 --keep-monthly 3

# Garbage collection : libérer les chunks orphelins
proxmox-backup-manager garbage-collection start backup-store
proxmox-backup-manager garbage-collection status backup-store`,

      `# Vérification d'intégrité planifiée (le samedi à 02:30)
proxmox-backup-manager verify-job add verify-weekly \\
  --store backup-store --schedule 'sat 02:30'
proxmox-backup-manager verify-job run verify-weekly   # premier passage manuel`,

      `# Chiffrement client (AES-256, KDF pbkdf2) puis sauvegarde chiffrée
proxmox-backup-client key create --kdf pbkdf2 \\
  /etc/proxmox-backup/encryption-key.json
proxmox-backup-client backup root.pxar:/ \\
  --repository backup@pbs@192.168.10.20:backup-store \\
  --keyfile /etc/proxmox-backup/encryption-key.json \\
  --fingerprint <FP_PBS>`
    ],
    guiSteps: [
      "<span class='wb-path'>PBS → Datastore → backup-store → Prune & GC</span> → Politique keep-* et lancement manuel du GC",
      "<span class='wb-path'>PBS → Datastore → Prune Jobs → Add</span> → prune-daily : 7 daily, 4 weekly, 3 monthly",
      "<span class='wb-path'>PBS → Datastore → Verify Jobs → Add</span> → verify-weekly : schedule sat 02:30",
      "<span class='wb-path'>Datacenter → Backup → Edit</span> → Chiffrement : Encrypted (Auto ou clé par VM)",
      "<span class='wb-path'>PBS → Administration → Task Log</span> → Suivi prune/GC/verify et facteur de déduplication"
    ],
    diagram: 'bak-dedup',
    terminology: ['PBS', 'Déduplication', 'Chunk', 'Prune', 'Garbage collection', 'Chiffrement PBS', 'Vérification PBS', 'Fingerprint'],
    concepts: [
      { term: 'Déduplication', def: "Un chunk haché déjà présent n'est jamais réécrit : seul un nouvel index de snapshot est ajouté (facteur typique 10 à 50×)." },
      { term: 'Prune', def: "Supprime des sauvegardes entières selon la rétention (keep-daily 7, keep-weekly 4…) en libérant leurs index — pas leurs chunks partagés." },
      { term: 'Garbage collection', def: "Cycle mark/sweep : identifie les chunks référencés puis supprime les orphelins au moins 24 h + 5 min après leur dernier accès." },
      { term: 'Chiffrement PBS', def: "AES-256 côté client avec clé protégée par KDF pbkdf2 : PBS stocke du chiffré, la clé reste hors du serveur." },
      { term: 'Vérification PBS', def: "Verify job relisant chaque chunk et recalculant son SHA-256 pour détecter bit rot et supports défaillants." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Une clé de chiffrement perdue rend les sauvegardes définitivement illisibles : exportez-la hors du site (gestionnaire de secrets, impression scellée) dès sa création." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Ne réduisez jamais la rétention à zéro « pour tester » : le prune supprime les index immédiatement et le GC détruit les chunks sous 24 h — l'opération est irréversible." }
    ],
    table: {
      headers: ['Tâche', 'Objectif', 'Commande / GUI', 'Fréquence conseillée'],
      rows: [
        ['Prune job', 'Appliquer la rétention', 'Datastore → Prune Jobs (keep-*)', 'Quotidienne'],
        ['Garbage collection', 'Libérer les chunks orphelins', 'proxmox-backup-manager garbage-collection start', 'Hebdomadaire'],
        ['Verify job', "Contrôler l'intégrité SHA-256", 'Datastore → Verify Jobs → Add', 'Hebdomadaire'],
        ['Chiffrement', 'Confidentialité de bout en bout', 'proxmox-backup-client key create', 'À la mise en place'],
        ['Déduplication', "Économiser l'espace", 'Automatique (chunks SHA-256)', 'Permanente']
      ]
    }
  },

  {
    id: 's3-backend',
    track: 'backup',
    level: 'avance',
    title: 'S3 comme backend : configuration, rate limiting',
    icon: 'fa-solid fa-bucket',
    step: '53',
    requires: ['pbs-installation'],
    description: 'Le stockage objet S3 (buckets, clés, API HTTP) étend la stratégie de sauvegarde au-delà du site : PBS 4.0 introduit un backend S3 en technology preview pour les datastores, tandis qu\'un bucket monté via rclone offre une alternative simple au labo. S3 apporte durabilité élevée, réplication géographique et tarification à l\'usage, mais la latence, les coûts de requêtes API et la cohérence éventuelle imposent de dimensionner avant toute migration. Le rate limiting protège alors la production : traffic control côté PBS (--rate-in/--rate-out), bwlimit côté vzdump et --rate-in/--burst-in côté proxmox-backup-client. Sur le labo CFP-CMD, la copie froide S3 complète le PBS local 192.168.10.20 sans jamais le remplacer.',
    cliCommands: [
      `# Rate limiting côté PBS : plafond par réseau et plage horaire
proxmox-backup-manager traffic-control add wan-lim \\
  --rate-in 50MB --rate-out 50MB --burst-in 100MB \\
  --network 192.168.10.0/24 --timeframe 60

# Côté client / PVE : mêmes objectifs, autres leviers
vzdump 100 --storage pbs-backup --bwlimit 50000   # KiB/s
proxmox-backup-client backup root.pxar:/ \\
  --repository backup@pbs@192.168.10.20:backup-store \\
  --rate-in 20MB --burst-in 40MB`,

      `# PBS >= 4.0 : datastore directement sur un bucket S3 (technology preview)
# GUI : PBS → Configuration → S3 Endpoints → Add (endpoint, access/secret key)
#       PBS → Datastore → Add → Backend : S3, bucket pbs-lab
proxmox-backup-manager datastore list   # vérifier le backend du datastore`,

      `# Variante labo : bucket S3 monté comme répertoire de backups
apt install -y rclone
rclone config                          # remote 's3lab' : MinIO, Wasabi, AWS…
mkdir -p /mnt/s3-pbs
rclone mount s3lab:pbs-lab /mnt/s3-pbs --vfs-cache-mode writes --daemon
pvesm add dir s3-backup --path /mnt/s3-pbs --content backup`
    ],
    guiSteps: [
      "<span class='wb-path'>PBS → Configuration → Traffic Control → Add</span> → Rate in 50MB / Rate out 50MB, réseau et plages horaires",
      "<span class='wb-path'>PBS → Configuration → S3 Endpoints → Add</span> → Endpoint, access key, secret key (PBS ≥ 4.0)",
      "<span class='wb-path'>PBS → Datastore → Add Datastore</span> → Backend S3 + bucket pbs-lab (technology preview)",
      "<span class='wb-path'>Datacenter → Backup → Edit</span> → Bandwidth limit (KiB/s) pour ne pas saturer le WAN",
      "<span class='wb-path'>Datacenter → Storage → Add → Directory</span> → Point de montage rclone (content : Backup)"
    ],
    diagram: 'bak-s3',
    terminology: ['S3', 'Rate limiting', 'PBS', 'Datastore', 'Storage plugin', 'Retention'],
    concepts: [
      { term: 'S3', def: "Protocole objet (buckets, clés, API REST HTTP) : MinIO, Ceph RGW, Wasabi, AWS S3 — durabilité élevée et scalabilité quasi illimitée." },
      { term: 'Backend S3 natif', def: "PBS ≥ 4.0 permet de créer un datastore directement sur un bucket S3 (technology preview) : valider latence et coûts avant production." },
      { term: 'Rate limiting', def: "Traffic control PBS (rate-in/rate-out par réseau), bwlimit vzdump (KiB/s) et --rate-in/--burst-in du client plafonnent les débits." },
      { term: 'Copie froide', def: "Niveau S3 ou bande destiné à l'hors site : accès rare, coûts optimisés, restaurations plus longues (RTO supérieur)." },
      { term: 'rclone', def: "Outil CLI de synchronisation vers plus de 70 backends cloud : rclone mount expose un bucket S3 comme répertoire (variante labo)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Chaque chunk poussé vers S3 génère des requêtes PUT/GET facturées : estimez le volume mensuel (chunks × sauvegardes) avant de basculer un datastore complet." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le backend S3 natif reste une technology preview : conservez un PBS local comme copie principale et testez la restauration depuis S3 avant d'y ranger des données critiques." }
    ],
    table: {
      headers: ['Cible', 'Technologie', 'Atouts', 'Limites'],
      rows: [
        ['PBS local', 'Datastore dédupliqué (disque)', 'Restaurations rapides, déduplication', 'Reste sur site'],
        ['S3 natif', 'Datastore PBS sur bucket (PBS ≥ 4.0)', 'Durabilité, réplication géographique', 'Technology preview, coûts API'],
        ['Bucket monté', 'rclone / s3fs + storage directory', 'Simple au labo, aucun client PBS requis', 'Pas de déduplication native, latence'],
        ['NFS hors site', 'pvesm add nfs (content backup)', 'Intégré à PVE, débit LAN prévisible', 'Dépend du site distant']
      ]
    }
  },

  {
    id: 'restauration',
    track: 'backup',
    level: 'avance',
    title: 'Restauration : VM, CT, fichiers individuels',
    icon: 'fa-solid fa-clock-rotate-left',
    step: '54',
    requires: ['pbs-installation'],
    description: 'La restauration est le moment de vérité d\'une stratégie de sauvegarde : elle doit couvrir la VM complète, le conteneur et le simple fichier perdu. Une VM se restaure avec qm restore (ou le bouton Restore de la GUI) vers son VMID d\'origine — écrasement — ou vers un VMID libre, pratique clé des tests. Les conteneurs suivent le même schéma avec pct restore et l\'option Unprivileged pour remapper les UIDs. Le file restore de PBS explore l\'arborescence d\'une archive (daemon FUSE, proxmox-backup-client map/catalog shell) et extrait un fichier en quelques secondes sans remonter la machine entière. Chaque méthode impacte différemment le RTO : connaître ces délais à l\'avance est un objectif de cette section.',
    cliCommands: [
      `# VM / CT complets depuis un dump vzdump local (vma.zst / tar.zst)
qm restore /mnt/pve/nfs-backup/dump/vzdump-qemu-100-2025_06_01-02_00_00.vma.zst 150 \\
  --storage local-zfs --name web-prod-restored
pct restore 250 /mnt/pve/nfs-backup/dump/vzdump-lxc-200-2025_06_01-02_00_00.tar.zst \\
  --storage local-zfs --unprivileged 1`,

      `# VM complète depuis PBS : <storage>:backup/vm/<vmid>/<snapshot>
qm restore pbs-backup:backup/vm/100/2025-06-01T00:00:00Z 150 \\
  --storage local-zfs --name web-prod-restored

# Lister les archives PBS disponibles
pvesh get /nodes/pve1/storage/pbs-backup/content --content backup`,

      `# Fichiers individuels : shell interactif sur le catalogue
proxmox-backup-client catalog shell vm/100/2025-06-01T00:00:00Z root.pxar \\
  --repository backup@pbs@192.168.10.20:backup-store

# Extraction ciblée ou montage lecture seule (FUSE)
proxmox-backup-client restore vm/100/2025-06-01T00:00:00Z root.pxar /mnt/restaure \\
  --repository backup@pbs@192.168.10.20:backup-store --pattern 'etc/nginx/**'
proxmox-backup-client map vm/100/2025-06-01T00:00:00Z root.pxar \\
  --repository backup@pbs@192.168.10.20:backup-store`
    ],
    guiSteps: [
      "<span class='wb-path'>VM → Backup → Restore</span> → VMID cible, storage de destination, Start after restore",
      "<span class='wb-path'>Datacenter → Storage → pbs-backup → Backups</span> → Sélectionner un snapshot → File Restore (arborescence + téléchargement)",
      "<span class='wb-path'>CT → Backup → Restore</span> → Option Unprivileged, storage cible",
      "<span class='wb-path'>Node → Shell</span> → proxmox-backup-client map / catalog shell pour l'extraction manuelle",
      "<span class='wb-path'>VM → Snapshots → Rollback</span> → À ne PAS confondre avec une restauration PBS (snapshot ≠ sauvegarde)"
    ],
    diagram: 'bak-restore',
    terminology: ['PBS', 'vzdump', 'File restore', 'RTO', 'Rollback', 'Snapshot'],
    concepts: [
      { term: 'qm restore', def: "Restaure une VM complète depuis une archive vzdump ou PBS vers un VMID choisi (écrasement si le VMID existe déjà)." },
      { term: 'pct restore', def: "Recrée un conteneur depuis un tar.zst : --unprivileged 1 remappe les UIDs, --storage/--rootfs choisissent la destination." },
      { term: 'File restore', def: "Exploration de l'arborescence d'une archive sans restauration complète : GUI (file-restore daemon) ou proxmox-backup-client map / catalog shell." },
      { term: 'Catalogue PBS', def: "Index de fichiers de chaque snapshot : alimente le navigateur du file restore et la recherche dans l'archive." },
      { term: 'RTO', def: "Durée réelle mesurée entre le lancement de la restauration et le service remis — chaque méthode a un RTO différent." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Restaurer vers le VMID d'origine écrase la machine existante sans confirmation : pour un test ou une vérification, ciblez toujours un VMID libre." },
      { type: 'info', icon: 'fa-circle-info', text: "Le file restore nécessite FUSE sur l'hôte (fuse3) : l'archive PBS est montée en lecture seule et se démonte automatiquement après inactivité." }
    ],
    table: {
      headers: ['Besoin', 'Méthode', 'Granularité', 'Délai indicatif'],
      rows: [
        ['VM complète', 'GUI Restore / qm restore', 'Machine entière', 'Minutes (dépend du volume)'],
        ['Fichiers isolés', 'File restore GUI / proxmox-backup-client', 'Fichier ou dossier', 'Secondes'],
        ['CT complet', 'GUI Restore / pct restore', 'Conteneur entier', 'Minutes'],
        ['Config VM seule', 'qm config / catalogue PBS', 'Fichier .conf', 'Secondes'],
        ['Config CT seule', 'pct config', 'Fichier .conf', 'Secondes']
      ]
    }
  },

  {
    id: 'strategie-321',
    track: 'backup',
    level: 'intermediaire',
    title: 'Stratégie 3-2-1 : local, distant, hors site',
    icon: 'fa-solid fa-chess-board',
    step: '55',
    requires: ['pbs-installation'],
    description: 'La règle 3-2-1 reste la référence : au moins 3 copies des données, sur 2 supports distincts, dont 1 hors site. Au labo CFP-CMD : les données de production (Ceph/ZFS), la copie PBS locale 192.168.10.20 (job 02:00) et une copie distante répliquée par sync-job vers un PBS hors site, complétée d\'une copie froide NFS/S3. Le flag Protected protège les snapshots clés d\'un prune accidentel, et la copie hors site survit à un ransomware qui chiffrerait le site entier. Le couple RPO/RTO impose la fenêtre de réplication : un sync-job quotidien à 04:00 borne le RPO de la copie distante à 24 h. Une stratégie se documente et se teste autant que la production elle-même.',
    cliCommands: [
      `# Copie hors site : déclarer le PBS distant puis un sync-job quotidien
proxmox-backup-manager remote add pbs-offsite backup@10.40.0.20 \\
  --fingerprint <FP_OFFSITE>
proxmox-backup-manager sync-job add sync-offsite \\
  --store backup-store --remote pbs-offsite --remote-store backup-store \\
  --schedule 'daily 04:00' --remove-vanished false
proxmox-backup-manager sync-job run sync-offsite   # premier transfert manuel`,

      `# Troisième copie froide : export NFS hors site déclaré côté PVE
pvesm add nfs offsite-cold --server 10.40.0.60 --export /export/cold \\
  --content backup --options vers=4.1

# Protection anti-prune (CDC : Protected yes) — PBS GUI :
#   Datastore → backup-store → Content → snapshot → Protect
proxmox-backup-client status vm/100/2025-06-01T00:00:00Z \\
  --repository backup@pbs@192.168.10.20:backup-store`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Backup</span> → Copie 2 : job 02:00 vers pbs-backup, mensuelles marquées Protected",
      "<span class='wb-path'>PBS → Datastore → Sync Jobs → Add</span> → Copie 3a : vers le PBS hors site, schedule daily 04:00",
      "<span class='wb-path'>PBS → Datastore → Content</span> → Clic Protect sur les snapshots mensuels clés",
      "<span class='wb-path'>Datacenter → Storage → Add → NFS</span> → Copie 3b froide hors site (content : Backup)",
      "<span class='wb-path'>PBS → Datastore → Verify Jobs</span> → Vérifier le datastore local ET les copies distantes"
    ],
    diagram: 'bak-321',
    terminology: ['Stratégie 3-2-1', 'PBS', 'Sync job', 'RPO', 'RTO', 'Retention', 'vzdump'],
    concepts: [
      { term: 'Stratégie 3-2-1', def: "3 copies des données, 2 supports différents, 1 hors site : la base de toute politique de continuité d'activité." },
      { term: 'Sync job', def: "Réplication planifiée d'un datastore PBS vers un remote : la copie hors site possède sa propre déduplication et son propre cycle de vie." },
      { term: 'RPO', def: "Perte de données maximale acceptée : ~24 h avec le job 02:00 ; réduit par des sauvegardes horaires sur les guests critiques." },
      { term: 'RTO', def: "Délai maximal de rétablissement : piloté par la méthode de restauration (VM complète vs file restore)." },
      { term: 'Air gap', def: "Copie physiquement déconnectée (bande, bucket figé, snapshot immuable) : seule arme contre un ransomware disposant des droits admin." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un sync-job vers un PBS sur le même VLAN que la production ne fait pas d'hors site : un ransomware avec des droits admin peut chiffrer tout le segment — visez un site ou un segment distinct, voire une copie air-gapped." },
      { type: 'info', icon: 'fa-circle-info', text: "Marquez Protected les snapshots mensuels du PBS local : ils survivent à une erreur de prune et servent d'ancrage stable à la règle 3-2-1." }
    ],
    table: {
      headers: ['Copie', 'Destination', 'Fenêtre', 'Rôle'],
      rows: [
        ['Copie 1', 'Production (Ceph / ZFS)', 'Temps réel', 'Données actives + réplication'],
        ['Copie 2', 'PBS local 192.168.10.20', 'Job 02:00', 'Restauration rapide (RTO court)'],
        ['Copie 3a', 'PBS hors site (sync-job 04:00)', 'Quotidienne', 'Survie au sinistre du site'],
        ['Copie 3b', 'S3 froid / bande air-gapped', 'Hebdomadaire ou mensuelle', 'Dernier recours immuable']
      ]
    }
  },

  {
    id: 'tests-restauration',
    track: 'backup',
    level: 'avance',
    title: 'Tests de restauration : procédures, automatisation',
    icon: 'fa-solid fa-vial-circle-check',
    step: '56',
    requires: ['restauration'],
    description: 'Une sauvegarde jamais restaurée n\'est qu\'une hypothèse : le CDC impose des tests de restauration trimestriels (4.4). La procédure standard restaure le dernier backup vers un VMID sandbox (plage 9xx), démarre la machine, vérifie les services et les données, mesure le RTO réel puis détruit l\'environnement de test. Les verify jobs de PBS servent de filet permanent en contrôlant l\'intégrité de chaque chunk entre deux tests. L\'automatisation (script + cron, exécution mensuelle) transforme le test en routine qui ne dépend plus d\'une personne. Chaque test produit un rapport horodaté : c\'est la preuve exigée lors d\'un audit ou d\'un sinistre réel.',
    cliCommands: [
      `# 1. Lister les archives disponibles du VM 100
pvesh get /nodes/pve1/storage/pbs-backup/content --content backup \\
  | grep 'vm/100'

# 2. Restaurer vers un VMID sandbox puis démarrer
qm restore pbs-backup:backup/vm/100/2025-06-01T00:00:00Z 910 \\
  --storage local-zfs --name test-restore-vm100
qm start 910`,

      `# 3. Vérifier le service restauré, mesurer, puis nettoyer
time qm restore pbs-backup:backup/vm/100/2025-06-01T00:00:00Z 910 \\
  --storage local-zfs
qm agent 910 ping && echo 'Guest OK'
qm shutdown 910 && qm destroy 910

# Filet permanent : contrôle d'intégrité du datastore
proxmox-backup-manager verify-job run verify-weekly`,

      `# Automatisation mensuelle : /usr/local/sbin/test-restore.sh
cat > /usr/local/sbin/test-restore.sh <<'EOF'
#!/bin/bash
set -e
LOG=/var/log/test-restore.log
echo "[$(date -Is)] test restauration VM 100" >> $LOG
qm restore pbs-backup:backup/vm/100/2025-06-01T00:00:00Z 910 \\
  --storage local-zfs --name auto-test >> $LOG 2>&1
qm start 910 && sleep 60
qm agent 910 ping >> $LOG 2>&1 && echo "[$(date -Is)] OK" >> $LOG
qm shutdown 910 && qm destroy 910
EOF
chmod +x /usr/local/sbin/test-restore.sh
# crontab -e : 0 5 1 * * /usr/local/sbin/test-restore.sh`
    ],
    guiSteps: [
      "<span class='wb-path'>VM → Backup → Restore</span> → Cible VMID 910 (sandbox), storage de test",
      "<span class='wb-path'>VM test → Console</span> → Boot, services, données applicatives",
      "<span class='wb-path'>PBS → Datastore → Verify Jobs → Run now</span> → Contrôle d'intégrité immédiat",
      "<span class='wb-path'>Node → Shell</span> → time qm restore … pour mesurer le RTO réel",
      "<span class='wb-path'>PBS → Administration → Task Log</span> → Joindre les logs au rapport horodaté"
    ],
    diagram: 'bak-tests',
    terminology: ['RTO', 'RPO', 'File restore', 'Vérification PBS', 'Backup job', 'PBS'],
    concepts: [
      { term: 'VMID sandbox', def: "Identifiant libre (plage 9xx au labo) réservé aux restaurations de test : aucun risque pour la production." },
      { term: 'Vérification PBS', def: "Contrôle permanent des chunks (SHA-256) : détecte la corruption entre deux tests trimestriels." },
      { term: 'RTO mesuré', def: "Chronométrage réel (time qm restore, démarrage, test applicatif) confronté à l'objectif contractuel." },
      { term: 'Rapport de test', def: "Document horodaté : snapshot restauré, étapes, durée, anomalies, actions correctives — exigé par le CDC 4.4." },
      { term: 'Automatisation', def: "Script + cron (mensuel) exécutant restore → contrôle → destruction, avec journal dans /var/log." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Un test de restauration n'est pas optionnel : le CDC l'impose chaque trimestre ; en cas de sinistre réel, l'absence de preuve de test documentée est une faute d'administration." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Automatisez la destruction du sandbox (qm destroy 910) après chaque test : un VMID 9xx oublié consomme storage et ressources et pollue l'inventaire." }
    ],
    table: {
      headers: ['Étape', 'Action', 'Outil', 'Critère de réussite'],
      rows: [
        ['Sélection', 'Choisir le dernier snapshot sain', 'pvesh get …content --content backup', 'Snapshot < 24 h'],
        ['Restauration', 'Restore vers le VMID 910', 'qm restore / GUI', 'VM démarre'],
        ['Vérification', 'Services + données applicatives', 'Console, curl, qm agent ping', 'Service répond'],
        ['Mesure', 'Chronométrer le RTO réel', 'time qm restore …', 'RTO ≤ objectif'],
        ['Rapport', 'Archiver journal + conclusion', 'Journal + PBS Task Log', 'Rapport horodaté']
      ]
    }
  }
]);
