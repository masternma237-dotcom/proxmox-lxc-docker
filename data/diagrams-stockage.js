/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-stockage.js — Schémas SVG du parcours Stockage avancé
   7 diagrammes : sto-zfs, sto-ceph, sto-ceph-advanced, sto-lvmthin,
                  sto-plugins, sto-migration, sto-ceph-net (contexte CDC)
   Palette : #E57000 #e74c3c #27ae60 #3498db #8e44ad #16a085 #f39c12 #2c3e50 #1a2530
   Contexte CDC : Ceph public 10.20.20.0/24 · cluster 10.30.30.0/24 · réplication ×3
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* Pool ZFS : vdevs, datasets, caches ARC/L2ARC/SLOG, réplication pvesr */
  'sto-zfs': function () {
    return svgOpen(700, 260, "Architecture d'un pool ZFS Proxmox avec réplication") +
      svgBox(20, 35, 280, 175, '#1a2530', '#0d1117', '') +
      svgText(160, 28, 'Pool ZFS « tank » — ashift=12 · lz4', '#8d97a8', 11) +
      svgBox(40, 55, 240, 45, '#E57000', '#b85500', 'vdev 1 — mirror SSD (sdb + sdc)') +
      svgBox(40, 110, 240, 45, '#E57000', '#b85500', 'vdev 2 — mirror SSD (sdd + sde)') +
      svgBox(40, 165, 240, 34, '#f39c12', '#b8750d', 'zpool scrub · checksums de bout en bout', { fontSize: 10 }) +
      svgBox(350, 45, 150, 60, '#16a085', '#0e6655', 'tank/vmdata\nzvols des VMs') +
      svgBox(350, 120, 150, 60, '#16a085', '#0e6655', 'tank/iso\nimages et vztmpl') +
      svgArrow(300, 90, 350, 78) +
      svgArrow(300, 150, 350, 148) +
      svgBox(550, 35, 130, 55, '#8e44ad', '#6c3483', 'ARC\ncache lecture RAM') +
      svgBox(550, 100, 130, 55, '#8e44ad', '#6c3483', 'L2ARC\nprolonge sur SSD') +
      svgBox(550, 165, 130, 55, '#8e44ad', '#6c3483', 'SLOG\nécritures sync (NVMe)') +
      svgLine(300, 60, 550, 62, '#8d97a8', 2, '5,4') +
      svgLine(300, 130, 550, 127, '#8d97a8', 2, '5,4') +
      svgLine(300, 195, 550, 192, '#8d97a8', 2, '5,4') +
      svgBox(340, 212, 170, 40, '#27ae60', '#1a6a3e', 'pve2 — réplica\npvesr (zfs send/recv)', { fontSize: 10 }) +
      svgArrowGreen(425, 180, 425, 210) +
      svgClose('Les datasets (zvols) hébergent les disques de VMs ; les snapshots instantanés alimentent la réplication pvesr vers pve2');
  },

  /* Cluster Ceph HCI : 3 nœuds, MON/MGR, OSDs, réseaux CDC, size=3 */
  'sto-ceph': function () {
    return svgOpen(700, 260, "Cluster Ceph hyperconvergé sur trois nœuds Proxmox") +
      svgBox(20, 15, 660, 26, '#16a085', '#0e6655', 'Réseau public Ceph 10.20.20.0/24 — clients RBD · MON 6789/3300', { fontSize: 10 }) +
      svgBox(20, 50, 660, 26, '#e74c3c', '#922b21', 'Réseau cluster 10.30.30.0/24 — réplication entre OSDs (port 6800+)', { fontSize: 10 }) +
      svgLine(70, 41, 70, 97, '#8d97a8', 2) +
      svgLine(150, 76, 150, 97, '#8d97a8', 2) +
      svgLine(300, 41, 300, 97, '#8d97a8', 2) +
      svgLine(380, 76, 380, 97, '#8d97a8', 2) +
      svgLine(530, 41, 530, 97, '#8d97a8', 2) +
      svgLine(610, 76, 610, 97, '#8d97a8', 2) +
      svgBox(20, 97, 200, 125, '#2c3e50', '#17202a', '') +
      svgBox(35, 115, 85, 40, '#e74c3c', '#922b21', 'MON 1') +
      svgBox(130, 115, 75, 40, '#f39c12', '#b8750d', 'MGR') +
      svgBox(35, 165, 50, 40, '#16a085', '#0e6655', 'OSD 0', { fontSize: 10 }) +
      svgBox(95, 165, 50, 40, '#16a085', '#0e6655', 'OSD 1', { fontSize: 10 }) +
      svgBox(155, 165, 50, 40, '#16a085', '#0e6655', 'OSD 2', { fontSize: 10 }) +
      svgBox(250, 97, 200, 125, '#2c3e50', '#17202a', '') +
      svgBox(265, 115, 85, 40, '#e74c3c', '#922b21', 'MON 2') +
      svgBox(360, 115, 75, 40, '#f39c12', '#b8750d', 'MGR') +
      svgBox(265, 165, 50, 40, '#16a085', '#0e6655', 'OSD 3', { fontSize: 10 }) +
      svgBox(325, 165, 50, 40, '#16a085', '#0e6655', 'OSD 4', { fontSize: 10 }) +
      svgBox(385, 165, 50, 40, '#16a085', '#0e6655', 'OSD 5', { fontSize: 10 }) +
      svgBox(480, 97, 200, 125, '#2c3e50', '#17202a', '') +
      svgBox(495, 115, 85, 40, '#e74c3c', '#922b21', 'MON 3') +
      svgBox(495, 165, 50, 40, '#16a085', '#0e6655', 'OSD 6', { fontSize: 10 }) +
      svgBox(555, 165, 50, 40, '#16a085', '#0e6655', 'OSD 7', { fontSize: 10 }) +
      svgBox(615, 165, 50, 40, '#16a085', '#0e6655', 'OSD 8', { fontSize: 10 }) +
      svgText(350, 244, 'Pool « vms » : size=3 · min_size=2 — chaque PG répliqué sur 3 OSDs de nœuds différents', '#8d97a8', 11) +
      svgClose('HCI : chaque nœud apporte MON (quorum), MGR et des OSDs ; CRUSH répartit les 3 copies sur des nœuds distincts');
  },

  /* Ceph avancé : réplication vs erasure coding, tiering par classes CRUSH */
  'sto-ceph-advanced': function () {
    return svgOpen(700, 250, "Erasure coding et réplication Ceph comparés") +
      svgBox(20, 35, 280, 30, '#16a085', '#0e6655', 'Pool « vms » — répliqué size=3 (SSD)', { fontSize: 11 }) +
      svgBox(20, 80, 80, 60, '#16a085', '#0e6655', 'Copie 1\nOSD pve1', { fontSize: 10 }) +
      svgBox(120, 80, 80, 60, '#16a085', '#0e6655', 'Copie 2\nOSD pve2', { fontSize: 10 }) +
      svgBox(220, 80, 80, 60, '#16a085', '#0e6655', 'Copie 3\nOSD pve3', { fontSize: 10 }) +
      svgText(160, 162, 'Overhead ×3 — écritures rapides, HA', '#8d97a8', 11) +
      svgBox(390, 35, 290, 30, '#8e44ad', '#6c3483', 'Pool « archive » — erasure coding 4+2 (HDD)', { fontSize: 11 }) +
      svgBox(390, 80, 88, 44, '#8e44ad', '#6c3483', 'bloc K1', { fontSize: 10 }) +
      svgBox(486, 80, 88, 44, '#8e44ad', '#6c3483', 'bloc K2', { fontSize: 10 }) +
      svgBox(582, 80, 88, 44, '#8e44ad', '#6c3483', 'bloc K3', { fontSize: 10 }) +
      svgBox(390, 132, 88, 44, '#8e44ad', '#6c3483', 'bloc K4', { fontSize: 10 }) +
      svgBox(486, 132, 88, 44, '#8e44ad', '#6c3483', 'parité M1', { fontSize: 10 }) +
      svgBox(582, 132, 88, 44, '#8e44ad', '#6c3483', 'parité M2', { fontSize: 10 }) +
      svgText(535, 194, 'Overhead ×1,5 — tolère 2 pertes, écritures plus lourdes', '#8d97a8', 11) +
      svgBox(40, 208, 200, 30, '#f39c12', '#b8750d', 'Chaud → pool SSD « vms »', { fontSize: 11 }) +
      svgBox(480, 208, 200, 30, '#2c3e50', '#17202a', 'Froid → pool HDD « archive »', { fontSize: 11 }) +
      svgText(350, 226, 'Tiering par classes CRUSH (pas de cache tier)', '#8d97a8', 10) +
      svgClose('Réplication = performance ; erasure coding = capacité ; le tiering moderne passe par les classes de périphériques CRUSH');
  },

  /* LVM-Thin : VG, thin pool, volumes, snapshot COW, limites */
  'sto-lvmthin': function () {
    return svgOpen(700, 230, "Thin pool LVM-Thin : volumes, snapshot et limites") +
      svgBox(20, 60, 120, 110, '#2c3e50', '#17202a', 'VG « pve »\nPV : /dev/sda3\n(contenu install)') +
      svgArrow(140, 115, 180, 115) +
      svgBox(180, 40, 230, 150, '#8e44ad', '#6c3483', '') +
      svgText(295, 32, 'Thin pool « data » — thin provisioning', '#8d97a8', 11) +
      svgBox(195, 60, 95, 35, '#f39c12', '#b8750d', 'vm-101-disk-0', { fontSize: 10 }) +
      svgBox(300, 60, 95, 35, '#f39c12', '#b8750d', 'vm-102-disk-0', { fontSize: 10 }) +
      svgBox(195, 105, 95, 35, '#f39c12', '#b8750d', 'vm-103-disk-0', { fontSize: 10 }) +
      svgBox(300, 105, 95, 35, '#f39c12', '#b8750d', 'vm-104-disk-0', { fontSize: 10 }) +
      svgBox(195, 150, 200, 26, '#1a2530', '#0d1117', 'Data% 45 · Meta% 12 — surveiller', { fontSize: 10 }) +
      svgArrowGreen(410, 80, 470, 80) +
      svgBox(470, 50, 200, 60, '#27ae60', '#1a6a3e', 'Snapshot « pre-upgrade »\nCOW — delta seulement') +
      svgBox(470, 125, 200, 65, '#e74c3c', '#922b21', 'Limites : pas de checksum,\npas de compression,\npas de RAID, non partagé', { fontSize: 10 }) +
      svgText(350, 215, 'Discard (TRIM) coché + fstrim périodique dans le guest · qm snapshot pour le rollback', '#8d97a8', 11) +
      svgClose('LVM-Thin = simplicité et vitesse locale : idéal VMs sur NVMe, mais moins riche que ZFS ou Ceph');
  },

  /* Storage plugins : fichier vs bloc derrière storage.cfg, content types */
  'sto-plugins': function () {
    return svgOpen(700, 250, "Plugins de stockage : backends fichier et bloc") +
      svgBox(230, 20, 240, 40, '#E57000', '#b85500', 'storage.cfg — pvesm\n(storage plugins)') +
      svgArrow(300, 60, 110, 93) +
      svgArrow(400, 60, 590, 93) +
      svgBox(20, 95, 160, 40, '#f39c12', '#b8750d', 'NFS — iso · vztmpl', { fontSize: 11 }) +
      svgBox(20, 145, 160, 40, '#f39c12', '#b8750d', 'CIFS — backup', { fontSize: 11 }) +
      svgBox(20, 195, 160, 40, '#f39c12', '#b8750d', 'S3 — backup (PVE 9)', { fontSize: 11 }) +
      svgBox(520, 95, 160, 40, '#16a085', '#0e6655', 'iSCSI + LVM — images', { fontSize: 11 }) +
      svgBox(520, 145, 160, 40, '#16a085', '#0e6655', 'RBD (Ceph) — images', { fontSize: 11 }) +
      svgBox(520, 195, 160, 40, '#16a085', '#0e6655', 'ZFS local — images', { fontSize: 11 }) +
      svgBox(280, 110, 140, 34, '#3498db', '#1a6a9e', 'Content types', { fontSize: 11 }) +
      svgLine(280, 127, 180, 115, '#8d97a8', 2) +
      svgLine(420, 127, 520, 115, '#8d97a8', 2) +
      svgText(350, 168, 'images · rootdir', '#8d97a8', 10) +
      svgText(350, 186, 'iso · vztmpl', '#8d97a8', 10) +
      svgText(350, 204, 'backup', '#8d97a8', 10) +
      svgClose('Les plugins unifient fichier (NFS, CIFS, S3) et bloc (iSCSI, RBD) : le content type décide de ce que chaque storage héberge');
  },

  /* Migration de stockage : local-lvm → ceph-rbd puis migration live */
  'sto-migration': function () {
    return svgOpen(700, 230, "Migration d'un disque VM du local vers le partagé") +
      svgBox(20, 40, 190, 80, '#2c3e50', '#17202a', 'pve1 — VM 101\ndisque sur local-lvm\n(local, non partagé)') +
      svgArrowGreen(210, 80, 300, 80) +
      svgText(255, 66, '1. move-disk', '#27ae60', 10) +
      svgBox(300, 40, 180, 80, '#16a085', '#0e6655', 'ceph-rbd — pool « vms »\npartagé, size=3\nvisible des 3 nœuds', { fontSize: 10 }) +
      svgArrowGreen(480, 80, 570, 80) +
      svgText(525, 66, '2. migrate', '#27ae60', 10) +
      svgBox(570, 40, 110, 80, '#E57000', '#b85500', 'pve2\nVM 101\nactive') +
      svgBox(20, 148, 660, 44, '#1a2530', '#0d1117', 'qm move-disk 101 scsi0 ceph-rbd --delete 1\npct move-volume 200 rootfs ceph-rbd · qm migrate 101 pve2 --online', { fontSize: 11 }) +
      svgText(350, 214, 'Stockage partagé → la migration live ne transfère que la RAM (aucune copie de disques)', '#8d97a8', 11) +
      svgClose('Déplacer d\'abord les disques vers le storage partagé, puis migrer la VM : zéro copie réseau de disques');
  },

  /* Contexte CDC : réseaux Ceph public et cluster du labo */
  'sto-ceph-net': function () {
    return svgOpen(700, 240, "Réseaux Ceph du labo CFP-CMD (CDC)") +
      svgBox(20, 20, 660, 30, '#16a085', '#0e6655', 'Réseau public Ceph — 10.20.20.0/24 (VLAN 30) : clients RBD · MON 6789/3300', { fontSize: 10 }) +
      svgBox(20, 60, 660, 30, '#e74c3c', '#922b21', 'Réseau cluster Ceph — 10.30.30.0/24 (VLAN 40) : réplication/récupération OSD 6800+', { fontSize: 10 }) +
      svgLine(70, 130, 70, 50, '#8d97a8', 2) +
      svgLine(180, 130, 180, 90, '#8d97a8', 2) +
      svgLine(295, 130, 295, 50, '#8d97a8', 2) +
      svgLine(405, 130, 405, 90, '#8d97a8', 2) +
      svgLine(520, 130, 520, 50, '#8d97a8', 2) +
      svgLine(630, 130, 630, 90, '#8d97a8', 2) +
      svgBox(30, 130, 190, 80, '#2c3e50', '#17202a', 'pve1\n10.20.20.11 · 10.30.30.11\nOSD ×2 · MON', { fontSize: 10 }) +
      svgBox(255, 130, 190, 80, '#2c3e50', '#17202a', 'pve2\n10.20.20.12 · 10.30.30.12\nOSD ×2 · MON', { fontSize: 10 }) +
      svgBox(480, 130, 190, 80, '#2c3e50', '#17202a', 'pve3\n10.20.20.13 · 10.30.30.13\nOSD ×2 · MON', { fontSize: 10 }) +
      svgText(350, 232, 'Réplication ×3 : chaque objet traverse le réseau cluster entre OSDs — jamais le réseau public', '#8d97a8', 11) +
      svgClose('CDC : deux réseaux dédiés (public et cluster) isolent le trafic clients de la réplication entre OSDs');
  }
});
