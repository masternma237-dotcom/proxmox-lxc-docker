/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-fondamentaux.js — Banques de quiz du parcours Fondamentaux
   Format : [question, [options], indexBonneRéponse, explication]
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'introduction': [
    ["Quel hyperviseur Proxmox VE utilise-t-il pour les machines virtuelles ?",
     ["KVM", "Xen", "VirtualBox", "VMware ESXi"], 0,
     "Proxmox VE utilise KVM (Kernel-based Virtual Machine), intégré au noyau Linux."],
    ["Quel type de conteneur Proxmox VE gère-t-il nativement ?",
     ["LXC", "Docker", "Podman", "OpenVZ"], 0,
     "Proxmox gère nativement LXC ; Docker peut être installé À L'INTÉRIEUR d'un conteneur LXC."],
    ["Sur quelle distribution Linux Proxmox VE est-il basé ?",
     ["Debian", "Ubuntu", "RHEL", "Arch Linux"], 0,
     "Proxmox VE est basé sur Debian (version Bookworm pour Proxmox VE 8.x)."],
    ["À quel niveau de l'arborescence configure-t-on les permissions globales ?",
     ["Datacenter", "Node", "VM", "Storage"], 0,
     "Le niveau Datacenter regroupe la configuration globale : permissions, pare-feu, HA, stockage."]
  ],

  'installation': [
    ["Quel dépôt configure-t-on en environnement de formation sans licence ?",
     ["pve-no-subscription", "pve-enterprise", "pve-testing", "pve-legacy"], 0,
     "Le dépôt no-subscription est public et gratuit ; le dépôt entreprise exige un abonnement (erreur 401 sinon)."],
    ["Quel prérequis CPU est indispensable pour exécuter des VMs KVM ?",
     ["VT-x ou AMD-V activé", "4 cartes réseau", "GPU NVIDIA", "RAID matériel"], 0,
     "Les extensions de virtualisation matérielle VT-x (Intel) ou AMD-V doivent être activées dans le BIOS/UEFI."],
    ["Quelle RAM minimale officielle pour Proxmox VE ?",
     ["8 Go", "2 Go", "32 Go", "512 Mo"], 0,
     "8 Go constituent le minimum pratique ; 64 Go sont recommandés pour un labo complet avec Ceph."],
    ["Que se passe-t-il si on laisse le dépôt entreprise actif sans licence ?",
     ["Erreur 401 lors d'apt update", "Les mises à jour fonctionnent", "Proxmox ne démarre plus", "Rien du tout"], 0,
     "apt update échoue avec une erreur 401 Unauthorized : il faut supprimer ou commenter le fichier pve-enterprise.list."]
  ],

  'interface-web': [
    ["Sur quel port l'interface web de Proxmox VE écoute-t-elle ?",
     ["8006", "8080", "443", "9000"], 0,
     "L'interface web et l'API REST sont servies en HTTPS sur le port 8006 par pveproxy."],
    ["Quel outil CLI gère les conteneurs LXC ?",
     ["pct", "qm", "pvecm", "pvesm"], 0,
     "pct (Proxmox Container Toolkit) gère les LXC ; qm gère les VMs KVM."],
    ["Quel est l'intérêt principal d'un API Token par rapport au mot de passe utilisateur ?",
     ["Permissions séparées et révocables", "Connexion plus rapide", "Contourne le pare-feu", "Évite le HTTPS"], 0,
     "Un token a des permissions propres (séparées de l'utilisateur), se révoque sans toucher au compte et s'identifie avec USER@REALM!TOKENID."],
    ["Quelle commande interroge directement l'API REST depuis le shell ?",
     ["pvesh", "pveapi", "curl-pve", "pvecli"], 0,
     "pvesh est le client CLI officiel de l'API (pvesh get /nodes, pvesh set …)."]
  ],

  'stockage-base': [
    ["Quel paramètre ZFS doit être fixé dès la création du pool sur SSD ?",
     ["ashift=12", "compression=off", "recordsize=1M", "sync=disabled"], 0,
     "ashift=12 correspond aux secteurs 4K des SSD modernes ; il ne se modifie plus après création."],
    ["Quel storage permet les snapshots instantanés ET la vérification d'intégrité ?",
     ["ZFS", "Directory ext4", "NFS v3", "iSCSI brut"], 0,
     "ZFS combine copy-on-write (snapshots instantanés) et checksums d'intégrité de bout en bout."],
    ["Quelle commande liste l'état de tous les storages Proxmox ?",
     ["pvesm status", "pct list", "qm list", "zpool status"], 0,
     "pvesm status affiche type, état, capacité et activation de chaque storage déclaré."],
    ["Qu'est-ce qui distingue un storage partagé d'un storage local ?",
     ["Il est visible de tous les nœuds du cluster", "Il est toujours plus rapide", "Il ne supporte pas les backups", "Il exige du NVMe"], 0,
     "Un storage partagé (NFS, Ceph, iSCSI) est monté sur tous les nœuds : prérequis de la migration avec stockage et du HA."]
  ],

  'creation-vm': [
    ["Quel bus de disque privilégier pour les performances d'une VM Linux ?",
     ["VirtIO SCSI single", "IDE", "SATA", "USB"], 0,
     "VirtIO SCSI single offre les meilleures performances, le discard (TRIM) et la file par disque."],
    ["À quoi sert le Qemu Guest Agent ?",
     ["Cohérence des snapshots et remontée d'infos", "Accélérer le CPU", "Chiffrer les disques", "Gérer le pare-feu"], 0,
     "L'agent gèle proprement les filesystems pendant les snapshots/backups et remonte IPs et état à l'interface."],
    ["Quel type de CPU choisir pour des performances maximales sur un cluster homogène ?",
     ["host", "kvm64", "qemu32", "max"], 0,
     "Le type host expose les instructions exactes du CPU hôte ; incompatible entre CPU hétérogènes."],
    ["Que permet cloud-init sur une VM ?",
     ["Injecter IP, hostname et clés SSH au premier boot", "Faire des snapshots", "Migrer la VM", "Créer un cluster"], 0,
     "Cloud-init automatise la configuration initiale depuis une image cloud ou un template avec lecteur CloudInit."]
  ],

  'creation-lxc': [
    ["Quelle différence clé entre un LXC privilégié et non privilégié ?",
     ["Le root du CT non privilégié est remappé (100000+)", "Le privilégié est plus rapide en réseau", "Le non privilégié ne supporte pas Docker", "Aucune différence"], 0,
     "Dans un CT non privilégié, root = UID 100000 de l'hôte : une évasion n'obtient qu'un compte sans droits."],
    ["Quelle feature LXC est requise pour installer Docker dans un conteneur ?",
     ["nesting=1", "fuse=1", "keyctl=1", "mknod=1"], 0,
     "nesting=1 autorise l'exécution de conteneurs dans le conteneur ; keyctl aide pour certaines images."],
    ["Quelle commande télécharge un template LXC ?",
     ["pveam download", "pct pull", "qm importdisk", "wget-template"], 0,
     "pveam update rafraîchit la liste, pveam download local <template> le télécharge sur le storage local."],
    ["Pourquoi privilégier un conteneur LXC plutôt qu'une VM pour un service Linux simple ?",
     ["Overhead quasi nul et démarrage instantané", "Il est plus sécurisé qu'une VM", "Il supporte Windows", "Il n'a pas besoin de réseau"], 0,
     "Un LXC partage le noyau de l'hôte : densité et démarrage instantanés, idéal pour les services Linux."]
  ],

  'snapshots-clones': [
    ["Que fait un snapshot Proxmox ?",
     ["Il fige l'état à un instant T via copy-on-write", "Il copie la VM vers un autre nœud", "Il sauvegarde vers PBS", "Il convertit la VM en template"], 0,
     "Le snapshot utilise le COW du backend (ZFS/LVM-Thin) pour permettre un rollback rapide."],
    ["Pourquoi un snapshot ne remplace-t-il pas une sauvegarde ?",
     ["Il vit sur le même storage que la VM", "Il expire après 24 h", "Il ne contient pas le disque", "Il est illisible"], 0,
     "Une panne du storage détruirait VM et snapshots ensemble : la protection nécessite vzdump/PBS sur un autre support."],
    ["Quelle commande convertit la VM 100 en template ?",
     ["qm template 100", "qm convert 100", "pct template 100", "qm clone 100"], 0,
     "qm template 100 transforme la VM en modèle lecture seule, source de clones."],
    ["Quel clone dépend du template et de son storage ?",
     ["Linked clone", "Full clone", "Backup clone", "Remote clone"], 0,
     "Le linked clone partage les blocs du template (création instantanée) mais ne peut pas quitter son storage."]
  ],

  'validation-fondamentaux': [
    ["Quel service alimente les graphiques de l'interface web ?",
     ["pvestatd", "pveproxy", "pvedaemon", "corosync"], 0,
     "pvestatd collecte les statistiques ; s'il est arrêté, les graphes se figent (restart recommandé)."],
    ["Qu'indique un pool ZFS en état DEGRADED ?",
     ["Un disque est défaillant mais le pool fonctionne", "Le pool est détruit", "Une mise à jour est disponible", "Le pool est plein"], 0,
     "DEGRADED = redondance réduite (un disque HS) : remplacer le disque défaillant avec zpool replace."],
    ["Quelle commande effectue une sauvegarde manuelle de la VM 100 ?",
     ["vzdump 100 --storage local --mode snapshot", "qm backup 100", "pct dump 100", "pvesm backup 100"], 0,
     "vzdump est l'outil natif de sauvegarde : --storage désigne la destination, --mode snapshot la méthode."],
    ["Quelle erreur 401 après apt update révèle-t-elle ?",
     ["Le dépôt entreprise est actif sans licence", "Le certificat ACME a expiré", "Le pare-feu bloque l'apt", "Le disque est plein"], 0,
     "C'est le symptôme classique du dépôt entreprise sans abonnement : le basculer vers no-subscription."]
  ]
});
