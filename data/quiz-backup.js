/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-backup.js — Banques de quiz du parcours SAUVEGARDE
   Format : [question, [options], indexBonneRéponse, explication]
   4 questions par section (vzdump, pbs-installation, pbs-avance, s3-backend,
   restauration, strategie-321, tests-restauration).
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'vzdump': [
    ["Quel mode vzdump maintient la VM active pendant la sauvegarde ?",
     ["Mode snapshot", "Mode suspend", "Mode stop", "Mode raw"], 0,
     "Le mode snapshot s'appuie sur le copy-on-write du backend (ZFS, LVM-Thin, Ceph) : la VM continue de tourner."],
    ["Quelle compression offre le meilleur compromis vitesse / taux de réduction ?",
     ["zstd", "gzip", "bzip2", "xz"], 0,
     "zstd est le choix conseillé : une vitesse proche de lzo pour un taux proche de gzip."],
    ["Où configure-t-on un job de sauvegarde planifié à 02:00 ?",
     ["Datacenter → Backup → Add", "Node → System → Time", "VM → Options", "PBS → Administration"], 0,
     "Les backup jobs se gèrent au niveau Datacenter → Backup ; le CDC fixe le schedule à 02:00 avec mode snapshot et zstd."],
    ["Quel type d'archive vzdump produit-il pour un conteneur LXC ?",
     ["Un tar.zst", "Un vma.zst", "Un qcow2", "Un raw segment"], 0,
     "vzdump produit des archives .vma.zst pour les VMs KVM et .tar.zst pour les conteneurs LXC."]
  ],

  'pbs-installation': [
    ["Sur quel port l'interface web de Proxmox Backup Server écoute-t-elle ?",
     ["8007", "8006", "9000", "443"], 0,
     "PBS sert son interface en HTTPS sur le port 8007 ; le 8006 reste réservé à Proxmox VE."],
    ["Quelle commande crée le datastore prévu par le CDC 3.7 ?",
     ["proxmox-backup-manager datastore create backup-store /mnt/backup", "pvesm add pbs backup-store", "vzdump --create /mnt/backup", "proxmox-backup-client init backup-store"], 0,
     "proxmox-backup-manager datastore create <nom> <chemin> initialise le datastore côté serveur PBS."],
    ["Quel utilisateur de service connecte Proxmox VE au datastore PBS ?",
     ["backup@pbs", "root@pam", "backup@pve", "pvebackup@pbs"], 0,
     "backup@pbs est l'utilisateur de service standard, limité au datastore via les rôles Datastore.Backup / Datastore.Admin."],
    ["Dans Datacenter → Storage → Add, quel type déclare un serveur PBS ?",
     ["Proxmox Backup Server", "NFS", "ZFS", "Ceph FS"], 0,
     "Le type « Proxmox Backup Server » demande server (192.168.10.20), datastore (backup-store), username et fingerprint."]
  ],

  'pbs-avance': [
    ["Quelle est la taille typique d'un chunk PBS ?",
     ["4 à 8 MiB", "4 à 8 Ko", "512 octets", "1 Go"], 0,
     "PBS découpe les flux en chunks de 4 à 8 MiB hachés en SHA-256 : unité de déduplication et de vérification."],
    ["Que fait le garbage collection de PBS ?",
     ["Il libère les chunks orphelins (mark/sweep)", "Il chiffre les sauvegardes", "Il restaure une VM", "Il réplique vers un remote"], 0,
     "Le GC marque les chunks référencés puis supprime, au moins 24 h + 5 min après le dernier accès, ceux devenus orphelins."],
    ["Où s'effectue le chiffrement des sauvegardes PBS ?",
     ["Côté client, avant transfert", "Côté datastore uniquement", "Dans le réseau (VPN)", "Côté OS invité"], 0,
     "Le chiffrement est réalisé par le client (AES-256, clé protégée par KDF pbkdf2) : PBS ne stocke que du chiffré."],
    ["À quoi sert un verify job ?",
     ["Détecter la corruption silencieuse des chunks", "Accélérer la déduplication", "Nettoyer les index de prune", "Changer le fingerprint"], 0,
     "Le verify relit chaque chunk et vérifie son SHA-256 : il révèle le bit rot sur les disques de sauvegarde."]
  ],

  's3-backend': [
    ["Quel mécanisme PBS limite le débit des flux de sauvegarde ?",
     ["Traffic control (proxmox-backup-manager)", "systemd-resolved", "pve-firewall", "corosync-qnetd"], 0,
     "proxmox-backup-manager traffic-control add définit rate-in / rate-out par réseau et par plage horaire."],
    ["Quel statut porte le backend S3 natif des datastores PBS ?",
     ["Technology preview", "Stable LTS", "Deprecated", "Enterprise only"], 0,
     "Le datastore sur backend S3 (PBS ≥ 4.0) est annoncé en technology preview : à valider avant toute production critique."],
    ["Quel paramètre vzdump plafonne la bande passante d'une sauvegarde ?",
     ["--bwlimit", "--maxspeed", "--throttle", "--qos"], 0,
     "--bwlimit (en KiB/s) plafonne le débit vzdump ; le client PBS propose --rate-in / --burst-in."],
    ["Quelle caractéristique du stockage objet impose un dimensionnement préalable ?",
     ["Facturation par requêtes API et latence", "Absence de chiffrement possible", "Impossibilité de dédupliquer", "Taille d'objet limitée à 5 Go"], 0,
     "Chaque chunk génère des PUT/GET facturés, et la latence dégrade les débits : estimez volume et coût avant migration."]
  ],

  'restauration': [
    ["Quelle commande restaure une VM complète depuis PBS vers le VMID 150 ?",
     ["qm restore pbs-backup:backup/vm/100/2025-06-01T00:00:00Z 150", "vzdump --restore 100 150", "pct restore 150 pbs", "proxmox-backup-manager restore 150"], 0,
     "qm restore <archive|storage:backup/…> <vmid> remonte une VM complète sur le storage choisi."],
    ["Quel outil extrait un seul fichier d'une archive PBS ?",
     ["File restore (GUI FUSE) / proxmox-backup-client", "pvesm diff", "qm guest exec", "zfs send"], 0,
     "Le file-restore daemon monte l'archive en lecture seule ; catalog shell / restore --pattern extraient finement."],
    ["Que se passe-t-il si l'on restaure sur le VMID d'origine ?",
     ["La VM existante est écrasée", "La restauration est refusée", "Un VMID libre est choisi", "La VM est clonée"], 0,
     "Restaurer sur le VMID source écrase la machine existante : pour tester, ciblez toujours un VMID libre."],
    ["Quelle commande restaure un conteneur depuis un dump tar.zst ?",
     ["pct restore 250 vzdump-lxc-200-…tar.zst", "qm restore 250 vzdump-lxc", "pct import 250", "lxc-restore 250"], 0,
     "pct restore <vmid> <archive> recrée le conteneur ; --unprivileged 1 remappe les UIDs à la restauration."]
  ],

  'strategie-321': [
    ["Que signifie la règle 3-2-1 ?",
     ["3 copies, 2 supports, 1 hors site", "3 sauvegardes par jour, 2 rétentions, 1 PBS", "3 VMs, 2 nœuds, 1 cluster", "3 rétentions, 2 datastores, 1 GC"], 0,
     "Au moins 3 copies des données, sur 2 supports différents, dont 1 hors site : la base de la continuité d'activité."],
    ["Quel mécanisme PBS réplique un datastore vers un PBS distant ?",
     ["Sync job", "Prune job", "Verify job", "Backup job"], 0,
     "Le sync-job tire les snapshots d'un remote PBS : copie indépendante et dédupliquée pour l'hors site."],
    ["Quel RPO implique un job de sauvegarde quotidien à 02:00 ?",
     ["Environ 24 heures", "1 heure", "7 jours", "Aucun RPO n'est défini"], 0,
     "RPO = perte maximale tolérée : une sauvegarde quotidienne borne la perte possible à ~24 h."],
    ["À quoi sert le flag Protected sur un snapshot PBS ?",
     ["Le prémunir d'un prune ou d'une suppression accidentelle", "Le chiffrer davantage", "L'accélérer en lecture", "Le verrouiller en lecture seule dans la GUI"], 0,
     "Protected interdit la suppression par prune/GC : réservé aux snapshots clés (mensuels, archives CDC)."]
  ],

  'tests-restauration': [
    ["Quelle fréquence de tests de restauration impose le CDC (4.4) ?",
     ["Trimestrielle", "Hebdomadaire", "Tous les 5 ans", "Une seule fois à l'installation"], 0,
     "Le CDC exige des tests de restauration trimestriels, documentés et horodatés."],
    ["Quel VMID utiliser pour une restauration de test sans risque ?",
     ["Un VMID sandbox libre (plage 9xx)", "Le VMID d'origine", "Le VMID du PBS", "Aucun : le test reste théorique"], 0,
     "On restaure vers un VMID libre (910…), on vérifie les services, puis on détruit : la production reste intacte."],
    ["Comment mesurer le RTO réel d'une restauration ?",
     ["Chronométrer qm restore puis le démarrage du service", "Lire le fichier de configuration", "Diviser la taille du disque par 100", "Demander au datastore"], 0,
     "Le RTO se mesure : time qm restore, démarrage, test applicatif — puis consignation dans le rapport horodaté."],
    ["Quel filet permanent détecte un backup corrompu entre deux tests ?",
     ["Le verify job PBS", "Le garbage collection", "Le sync job", "Le prune job"], 0,
     "Le verify job revalide les SHA-256 de chaque chunk en continu : la corruption est détectée sans restaurer."]
  ]
});
