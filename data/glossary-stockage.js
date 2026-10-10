/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-stockage.js — Glossaire (parcours Stockage avancé)
   20 termes — NE PAS redéfinir les termes de glossary-fondamentaux.js
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'Pool ZFS': "Ensemble de vdevs (mirror, RAIDZ) géré par ZFS : l'unité de stockage de plus haut niveau, créée avec zpool create.",
  'Dataset': "Sous-arbre ZFS (type filesystem) avec ses propres propriétés héritables (compression, quota, recordsize) — l'équivalent d'un volume découpé dans un pool.",
  'ARC': "Adaptive Replacement Cache — cache lecture en RAM de ZFS, dimensionné par défaut à la moitié de la mémoire de l'hôte.",
  'ashift': "Taille de secteur logique du pool (ashift=12 pour 4K) : fixée à la création, elle conditionne définitivement les performances disque.",
  'RAIDZ': "RAID logiciel ZFS à parité distribuée (RAIDZ1 = 1 disque de parité, RAIDZ2 = 2, RAIDZ3 = 3) sans risque d'écriture en trou.",
  'SLOG': "Log d'écriture synchrone de ZFS (disque dédié type NVMe) : accélère les écritures sync comme celles de la DB d'une VM.",
  'L2ARC': "Cache lecture secondaire de ZFS sur SSD : prolonge l'ARC en RAM quand le working set dépasse la mémoire disponible.",
  'zpool': "Outil CLI d'administration des pools ZFS : zpool create, status, scrub, replace, destroy.",
  'OSD': "Object Storage Device — daemon Ceph qui gère un disque (données + réplication) sur un nœud du cluster.",
  'MON': "Ceph Monitor — daemon maintenant la carte du cluster (monmap) et le quorum : 3 MON minimum recommandés.",
  'MDS': "Metadata Server — daemon Ceph qui expose les métadonnées d'un filesystem CephFS (inutile pour RBD seul).",
  'CRUSH': "Algorithme Ceph de placement des données : calcule où répliquer chaque objet selon la topologie et les règles (rules) du cluster.",
  'Placement group': "Groupe de placement (PG) — intermédiaire entre objets et OSDs : les objets sont mappés dans des PG, les PG dans des OSDs.",
  'Pool Ceph': "Partition logique du cluster Ceph (répliquée ou erasure coded) avec sa règle CRUSH, son nombre de PG et son facteur de réplication.",
  'Erasure coding': "Codage à effacement Ceph : objets découpés en k blocs de données + m de parité (ex. 4+2) — capacité utile supérieure, écritures plus lourdes.",
  'Tiering': "Hiérarchisation du stockage : données chaudes sur des pools rapides (SSD/NVMe), données froides sur des pools lents (HDD) via classes CRUSH.",
  'Thin provisioning': "Provisionnement allégé : les blocs ne sont alloués qu'à la première écriture — capacité apparente supérieure à la capacité physique.",
  'pvesr': "Proxmox VE Storage Replication — service de réplication ZFS périodique des volumes d'une VM/CT vers un autre nœud (jobs 101-1 → pve2).",
  'RBD': "RADOS Block Device — disque bloc distribué Ceph : chaque image RBD est découpée en objets répliqués sur les OSDs.",
  'Storage migration': "Déplacement d'un disque de VM/CT d'un storage vers un autre (qm move-disk, pct move-volume, Move Storage GUI) — localement ou avec migration de nœud."
});
