/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-stockage.js — Banques de quiz du parcours Stockage avancé
   Format : [question, [options], indexBonneRéponse, explication]
   (les options sont mélangées à l'affichage par js/quiz.js)
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'zfs': [
    ["Quel paramètre ZFS fixe-t-on impérativement à la création du pool ?",
     ["ashift=12 (secteurs 4K)", "recordsize=1M", "compression=off", "quota=0"], 0,
     "ashift conditionne l'alignement des secteurs : figé à la création, 12 correspond aux SSD modernes 4K."],
    ["Que fait la réplication pvesr ?",
     ["Elle envoie périodiquement les snapshots ZFS d'un volume vers un autre nœud", "Elle copie les VMs vers PBS", "Elle duplique le pool sur le même nœud", "Elle sauvegarde l'ARC sur disque"], 0,
     "pvesr s'appuie sur zfs send/recv des snapshots : le volume existe en double sur les deux nœuds."],
    ["Quelle caractéristique ZFS manque à LVM-Thin ?",
     ["Checksums et compression native", "Thin provisioning", "Snapshots", "Support des disques de VMs"], 0,
     "LVM-Thin fait du thin et des snapshots, mais sans checksum, compression ni auto-réparation."],
    ["Quel composant accélère les écritures synchrones de ZFS ?",
     ["Le SLOG sur NVMe", "Le L2ARC", "Le dataset", "Le zvol"], 0,
     "Le SLOG journalise les écritures sync sur un média rapide ; le L2ARC ne concerne que la lecture."]
  ],

  'ceph-hci': [
    ["Quel facteur de réplication le CDC impose-t-il aux pools Ceph du labo ?",
     ["size=3, min_size=2", "size=2, min_size=1", "size=6, min_size=4", "Erasure coding 4+2"], 0,
     "3 copies réparties sur des nœuds distincts : la perte d'un OSD, voire d'un nœud, reste transparente."],
    ["Quel daemon maintient le quorum et la carte du cluster Ceph ?",
     ["MON", "OSD", "MDS", "RGW"], 0,
     "Les MON maintiennent le monmap : 3 minimum pour le quorum ; le MDS ne concerne que CephFS."],
    ["Que gère un OSD Ceph ?",
     ["Un disque : stockage, réplication et récupération des objets", "La carte CRUSH", "Les métadonnées CephFS", "L'interface web Proxmox"], 0,
     "Un OSD = un disque en bluestore ; les OSDs échangent les objets via le réseau cluster."],
    ["Sur quel réseau le labo place-t-il la réplication entre OSDs ?",
     ["10.30.30.0/24 (réseau cluster)", "10.20.20.0/24 (réseau public)", "192.168.10.0/24 (mgmt)", "10.100.0.0/24 (VMs)"], 0,
     "CDC : le réseau cluster 10.30.30.0/24 porte la réplication ; le public 10.20.20.0/24 sert aux clients RBD."]
  ],

  'ceph-avance': [
    ["Quel overhead d'occupation un pool erasure coding 4+2 entraîne-t-il ?",
     ["×1,5 (67 % utile)", "×3 (33 % utile)", "×2 (50 % utile)", "Aucun"], 0,
     "k=4, m=2 : 6 blocs pour 4 utiles → ×1,5 ; la réplication size=3 coûte ×3."],
    ["Pourquoi le cache tiering classique est-il déconseillé ?",
     ["Latence imprévisible et complexité : on préfère les classes CRUSH", "Il n'existe plus dans Ceph", "Il consomme de la RAM", "Il interdit les snapshots"], 0,
     "Les cache pools ont un comportement erratique : la recommandation moderne est deux pools sur deux classes de périphériques."],
    ["Quelle option permet de stocker des images RBD sur un pool erasure coding ?",
     ["allow_ec_overwrites true", "min_size 1", "pg_autoscale_mode off", "noscrub"], 0,
     "allow_ec_overwrites autorise la réécriture partielle ; les lectures restent distribuées sur les k+m blocs."],
    ["Quelle commande crée une règle CRUSH dirigeant un pool vers les SSD ?",
     ["ceph osd crush rule create-replicated hot-ssd default host ssd", "ceph osd set ssd-only", "crush tunables optimal", "osd pool set class=ssd"], 0,
     "La règle contraint le placement à la classe ssd : on l'applique ensuite au pool avec crush_rule."]
  ],

  'lvm-thin': [
    ["Que surveille-t-on en priorité sur un thin pool LVM ?",
     ["data% et meta%", "L'ARC", "Le quorum", "Les checksums"], 0,
     "data et metadata peuvent saturer séparément : à 100 %, les écritures des VMs échouent ou se corrompent."],
    ["Quelle fonctionnalité libère l'espace côté guest ?",
     ["Discard (TRIM) + fstrim", "Ballooning", "Compression lz4", "Les snapshots"], 0,
     "Le drapeau Discard sur le disque et fstrim périodique rendent les blocs supprimés au thin pool."],
    ["LVM-Thin supporte-t-il le partage multi-nœuds ?",
     ["Non, stockage local uniquement", "Oui, via clvm", "Oui, avec NFS", "Oui, avec corosync"], 0,
     "Un thin pool n'est vu que de son nœud : le HA exige une réplication pvesr ou Ceph."],
    ["Quel avantage LVM-Thin a-t-il sur ZFS ?",
     ["Consommation RAM minimale", "Checksums d'intégrité", "Compression native", "RAID intégré"], 0,
     "Sans ARC ni calculs de parité, LVM-Thin est très léger en mémoire — au prix de l'intégrité."]
  ],

  'storage-plugins': [
    ["Où sont déclarés les storages Proxmox ?",
     ["/etc/pve/storage.cfg", "/etc/fstab", "/etc/pve/qemu-server/", "/etc/hosts"], 0,
     "storage.cfg, répliqué sur tout le cluster, décrit chaque storage : plugin, serveur, content types."],
    ["Quels content types conviennent à un NAS NFS pour ISO et templates ?",
     ["iso, vztmpl", "images, rootdir", "backup uniquement", "Aucun"], 0,
     "NFS sert bien les fichiers statiques (iso, vztmpl, backup) ; les disques de VMs exigent un backend bloc performant."],
    ["Que faut-il poser sur un LUN iSCSI pour créer des disques de VMs ?",
     ["Un VG LVM (plugin lvm --base)", "Un filesystem ext4", "Du RAIDZ", "Un pool Ceph"], 0,
     "Le plugin iSCSI n'expose que le LUN brut : le VG LVM par-dessus découpe les volumes par VM."],
    ["À quoi sert le plugin S3 de Proxmox VE 9 ?",
     ["Datastores PBS (expérimental)", "Disques de VMs performants", "ISO partagés", "Quorum du cluster"], 0,
     "S3 est expérimental et cible les sauvegardes via PBS, pas les images de disques."]
  ],

  'migration-stockage': [
    ["Quelle commande déplace le disque scsi0 de la VM 101 vers ceph-rbd ?",
     ["qm move-disk 101 scsi0 ceph-rbd", "qm migrate 101 pve2", "pvesm move ceph-rbd", "qm disk-move 101"], 0,
     "qm move-disk copie le disque vers le storage cible, à chaud, puis met à jour la configuration de la VM."],
    ["Que transfère une migration live quand tous les disques sont sur un storage partagé ?",
     ["Seulement la RAM de la VM", "Les disques et la RAM", "Seulement la configuration", "Les snapshots"], 0,
     "Avec un storage partagé, aucun disque ne bouge : seul l'état mémoire bascule — interruption de quelques secondes."],
    ["Pourquoi supprimer les snapshots avant un move-disk ?",
     ["Le déplacement refuse un disque comportant des snapshots", "Les snapshots ralentissent le TRIM", "Les snapshots bloquent le réseau", "Pour libérer l'ARC"], 0,
     "qm/pct move-disk exigent un volume sans snapshot : supprimez-les sinon l'opération échoue."],
    ["Quelle approche conserve le disque source après un déplacement ?",
     ["Omettre --delete", "--force 1", "--keep 1", "--mirror 1"], 0,
     "Sans --delete, le volume source reste sur l'ancien storage : idéal pour valider le boot avant nettoyage."]
  ]
});
