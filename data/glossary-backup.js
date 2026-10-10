/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-backup.js — Glossaire du parcours SAUVEGARDE (20 termes)
   Ne redéfinit PAS les termes déjà présents dans glossary-fondamentaux.js
   (vzdump, PBS, ZFS, NFS, Snapshot, Rollback…).
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'Mode snapshot': "Mode vzdump où la VM/CT reste active : le snapshot copy-on-write du backend (ZFS, LVM-Thin, Ceph) fige les blocs pendant la copie.",
  'Mode suspend': "Mode vzdump pour conteneurs : le guest est mis en pause pendant la copie puis repris — downtime court, fonctionne sans storage copy-on-write.",
  'Mode stop': "Mode vzdump le plus cohérent : la machine est arrêtée, sauvegardée à froid puis redémarrée (downtime total pendant la copie).",
  'Prune': "Suppression sélective des sauvegardes obsolètes selon la rétention (keep-last, keep-daily, keep-weekly…) : retire des index de snapshots, pas les chunks partagés.",
  'Garbage collection': "Nettoyage PBS en deux phases (mark/sweep) qui libère les chunks orphelins : un chunk n'est supprimé que 24 h et 5 min après son dernier accès.",
  'Datastore': "Espace de stockage géré par PBS (ex. backup-store sur /mnt/backup) : contient les chunks dédupliqués, les index par snapshot et les catalogues.",
  'Déduplication': "Élimination des blocs identiques entre sauvegardes : seuls les chunks uniques sont écrits, d'où un facteur de réduction typique de 10 à 50×.",
  'Chunk': "Tranche de données de 4 à 8 MiB en moyenne, hachée en SHA-256 par PBS : unité de déduplication, de chiffrement et de vérification.",
  'Chiffrement PBS': "Chiffrement AES-256 côté client, avant transfert : la clé (protégée par KDF pbkdf2) reste sous contrôle de l'administrateur, PBS ne stocke que du chiffré.",
  'Vérification PBS': "Verify job relisant chaque chunk du datastore et recalculant son SHA-256 pour détecter la corruption silencieuse (bit rot) des supports.",
  'Fingerprint': "Empreinte SHA-256 du certificat PBS, recopiée dans les clients pour authentifier le serveur (modèle TOFU) et contrer un MITM.",
  'S3': "Protocole de stockage objet (buckets, clés, API REST HTTP) popularisé par AWS : MinIO, Ceph RGW, Wasabi… backend de datastore PBS en technology preview (≥ 4.0).",
  'Rate limiting': "Limitation du débit des sauvegardes : traffic control PBS (--rate-in/--rate-out), bwlimit vzdump (KiB/s) et --rate-in/--burst-in du client PBS.",
  'File restore': "Restauration de fichiers individuels depuis une archive : navigation de l'arborescence dans la GUI (file-restore daemon FUSE) ou proxmox-backup-client restore.",
  'Stratégie 3-2-1': "Référence de sauvegarde : 3 copies des données, sur 2 supports différents, dont 1 hors site (PBS distant via sync-job, S3 froid, bande air-gapped).",
  'RTO': "Recovery Time Objective — durée maximale acceptable pour rétablir un service après un sinistre ; se mesure réellement lors des tests de restauration.",
  'RPO': "Recovery Point Objective — perte de données maximale tolérée, déterminée par la fréquence des sauvegardes (job quotidien 02:00 → RPO ≈ 24 h).",
  'Backup job': "Tâche planifiée côté Proxmox VE (Datacenter → Backup) définissant storage, schedule, mode, compression et sélection des guests.",
  'Retention': "Politique de conservation des sauvegardes (keep-last 7, keep-daily, keep-weekly, keep-monthly…) appliquée par le prune sur le storage ou le datastore.",
  'Sync job': "Réplication planifiée d'un datastore PBS vers un remote (PBS hors site) : copie indépendante et dédupliquée qui matérialise l'hors site de la règle 3-2-1."
});
