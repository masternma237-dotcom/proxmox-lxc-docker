/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-backup.js — Schémas SVG du parcours SAUVEGARDE (bak-*)
   Helpers fournis par js/diagrams.js (svgBox, svgArrow, svgLine, svgText…)
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* Modes vzdump : snapshot / suspend / stop vers l'archive */
  'bak-vzdump': function () {
    return svgOpen(700, 245, "Modes de sauvegarde vzdump") +
      svgBox(20, 80, 130, 70, '#E57000', '#b85500', 'VM 100 / CT 200\nen production') +
      svgBox(220, 25, 150, 44, '#27ae60', '#1a6a3e', 'Mode snapshot\nVM active (COW)') +
      svgBox(220, 95, 150, 44, '#f39c12', '#b8750d', 'Mode suspend\nguest figé') +
      svgBox(220, 165, 150, 44, '#e74c3c', '#922b21', 'Mode stop\narrêt complet') +
      svgArrow(150, 100, 220, 47) +
      svgArrow(150, 115, 220, 117) +
      svgArrow(150, 130, 220, 187) +
      svgArrow(370, 47, 425, 100) +
      svgArrow(370, 117, 425, 117) +
      svgArrow(370, 187, 425, 135) +
      svgBox(425, 85, 130, 66, '#2c3e50', '#17202a', 'vzdump\n.vma.zst / .tar.zst') +
      svgArrow(555, 118, 595, 118) +
      svgBox(595, 85, 85, 66, '#3498db', '#1a6a9e', 'Storage\nbackup\n(zstd)') +
      svgText(350, 236, 'Mode snapshot recommandé (ZFS / LVM-Thin / Ceph) · compression zstd · job 02:00', '#8d97a8', 11) +
      svgClose('vzdump adapte sa méthode au backend : COW pour snapshot, pause ou arrêt pour suspend/stop');
  },

  /* Architecture PBS : PVE → port 8007 → datastore */
  'bak-pbs': function () {
    return svgOpen(700, 245, "Architecture Proxmox Backup Server") +
      svgBox(20, 60, 150, 90, '#E57000', '#b85500', 'Cluster Proxmox VE\npve1 · pve2 · pve3') +
      svgArrow(170, 105, 250, 105) +
      svgBox(250, 60, 140, 90, '#2c3e50', '#17202a', 'vzdump /\nproxmox-backup-\nclient') +
      svgArrow(390, 105, 460, 105) +
      svgText(425, 95, 'TCP 8007', '#8d97a8', 10) +
      svgBox(460, 35, 220, 140, '#8e44ad', '#6c3483', '') +
      svgText(570, 55, 'PBS — 192.168.10.20 :8007', '#ffffff', 12) +
      svgBox(475, 65, 190, 45, '#1a2530', '#0d1117', 'Datastore : backup-store') +
      svgBox(475, 118, 190, 45, '#3498db', '#1a6a9e', '/mnt/backup\nchunks dédupliqués') +
      svgLine(320, 150, 320, 180, '#8d97a8', 2) +
      svgBox(250, 180, 140, 44, '#16a085', '#0e6655', 'backup@pbs\nDatastore.Admin') +
      svgLine(570, 175, 570, 190, '#8d97a8', 2) +
      svgBox(460, 190, 220, 40, '#f39c12', '#b8750d', 'Job 02:00 · snapshot · zstd') +
      svgClose('CDC 3.7 : storage pbs déclaré côté PVE, job quotidien protégé (Protected : yes)');
  },

  /* Chunking + déduplication SHA-256 */
  'bak-dedup': function () {
    return svgOpen(700, 240, "Déduplication par chunks PBS") +
      svgBox(20, 90, 130, 60, '#E57000', '#b85500', 'Flux disque\nVM 100') +
      svgArrow(150, 120, 210, 120) +
      svgBox(210, 90, 130, 60, '#f39c12', '#b8750d', 'Chunker\n4 – 8 MiB') +
      svgArrow(340, 120, 400, 120) +
      svgBox(400, 90, 130, 60, '#8e44ad', '#6c3483', 'Hachage\nSHA-256') +
      svgArrow(530, 105, 585, 68, '#27ae60') +
      svgBox(585, 38, 95, 52, '#27ae60', '#1a6a3e', 'Nouveau\nchunk écrit') +
      svgArrow(530, 135, 585, 170, '#e74c3c') +
      svgBox(585, 145, 95, 52, '#e74c3c', '#922b21', 'Existant :\nréférence 0 B') +
      svgLine(465, 150, 465, 175, '#8d97a8', 2) +
      svgBox(20, 175, 660, 45, '#1a2530', '#0d1117', 'Datastore backup-store — chunks uniques · index par snapshot · catalogues') +
      svgClose('Un bloc déjà présent n\'est jamais réécrit : facteur de déduplication typique 10 à 50×');
  },

  /* S3 + rate limiting */
  'bak-s3': function () {
    return svgOpen(700, 240, "S3 comme backend et limitation de débit") +
      svgBox(20, 40, 150, 70, '#E57000', '#b85500', 'Proxmox VE /\nPBS 192.168.10.20') +
      svgArrow(170, 75, 240, 50) +
      svgArrow(170, 90, 240, 115) +
      svgBox(240, 25, 180, 50, '#e74c3c', '#922b21', 'traffic-control PBS\n--rate-in 50MB') +
      svgBox(240, 90, 180, 50, '#3498db', '#1a6a9e', 'bwlimit vzdump\n--rate-in client') +
      svgArrow(420, 50, 480, 85) +
      svgArrow(420, 115, 480, 95) +
      svgBox(480, 45, 200, 90, '#16a085', '#0e6655', 'Bucket S3\nobject storage\nMinIO · Ceph RGW · Wasabi') +
      svgLine(580, 135, 580, 170, '#8d97a8', 2) +
      svgBox(240, 170, 440, 44, '#2c3e50', '#17202a', 'Backend S3 natif (PBS ≥ 4.0, technology preview) · ou bucket monté rclone') +
      svgClose('S3 = copie froide géographiquement séparée ; le rate limiting protège le réseau de production');
  },

  /* Chemins de restauration */
  'bak-restore': function () {
    return svgOpen(700, 255, "Niveaux de restauration") +
      svgBox(20, 30, 150, 55, '#f39c12', '#b8750d', 'vzdump local\nvma.zst / tar.zst') +
      svgBox(20, 110, 150, 55, '#8e44ad', '#6c3483', 'Datastore PBS\nbackup-store') +
      svgArrow(170, 57, 280, 112) +
      svgArrow(170, 137, 280, 130) +
      svgBox(280, 95, 140, 70, '#2c3e50', '#17202a', 'Choix de la\ngranularité\n(GUI / CLI)') +
      svgArrow(420, 110, 480, 55) +
      svgArrow(420, 130, 480, 128) +
      svgArrow(420, 150, 480, 202) +
      svgBox(480, 25, 200, 55, '#27ae60', '#1a6a3e', 'VM complète\nqm restore → VMID 150/910') +
      svgBox(480, 100, 200, 55, '#3498db', '#1a6a9e', 'Fichiers isolés\nfile restore FUSE / GUI') +
      svgBox(480, 175, 200, 55, '#16a085', '#0e6655', 'CT complet\npct restore') +
      svgText(350, 240, 'Écrasement si VMID identique · VMID libre pour les tests · RTO très différent selon la granularité', '#8d97a8', 10.5) +
      svgClose('De la machine entière au fichier unique : chaque besoin a sa méthode et son délai');
  },

  /* Stratégie 3-2-1 */
  'bak-321': function () {
    return svgOpen(700, 250, "Stratégie 3-2-1 appliquée au labo CFP-CMD") +
      svgText(350, 28, '3 copies · 2 supports distincts · 1 hors site minimum', '#8d97a8', 11) +
      svgBox(20, 95, 140, 80, '#E57000', '#b85500', 'Copie 1 —\nproduction\nCeph / ZFS') +
      svgArrow(160, 135, 240, 135, '#27ae60') +
      svgBox(240, 95, 170, 80, '#f39c12', '#b8750d', 'Copie 2 — PBS local\n192.168.10.20\njob 02:00 · Protected') +
      svgArrow(410, 115, 490, 75, '#8e44ad') +
      svgArrow(410, 155, 490, 195) +
      svgBox(490, 45, 190, 60, '#8e44ad', '#6c3483', 'Copie 3a — PBS hors site\nsync-job daily 04:00') +
      svgBox(490, 165, 190, 60, '#1a2530', '#0d1117', 'Copie 3b — froide\nS3 / bande air-gapped') +
      svgClose('La copie hors site survit à la perte complète du site : ransomware, incendie, vol');
  },

  /* Pipeline de tests de restauration */
  'bak-tests': function () {
    return svgOpen(700, 230, "Pipeline trimestriel de tests de restauration") +
      svgBox(20, 85, 115, 70, '#E57000', '#b85500', '1. Plan\ntrimestriel\n(CDC 4.4)') +
      svgArrow(135, 120, 165, 120) +
      svgBox(165, 85, 115, 70, '#f39c12', '#b8750d', '2. Dernier\nbackup\nvm/100') +
      svgArrow(280, 120, 310, 120) +
      svgBox(310, 85, 115, 70, '#3498db', '#1a6a9e', '3. Restore\nsandbox\nVMID 910') +
      svgArrow(425, 120, 455, 120) +
      svgBox(455, 85, 115, 70, '#8e44ad', '#6c3483', '4. Vérif\nservices\n+ RTO') +
      svgArrow(570, 120, 600, 120, '#27ae60') +
      svgBox(600, 85, 80, 70, '#27ae60', '#1a6a3e', '5. Rapport\n+ cleanup', { fontSize: 11 }) +
      svgArrowRed(512, 85, 512, 45) +
      svgText(512, 36, 'échec → correction', '#e74c3c', 10) +
      svgText(350, 205, 'RTO chronométré (time qm restore) · verify-job permanent · rapport horodaté archivé', '#8d97a8', 11) +
      svgClose('Tester, mesurer, documenter : une sauvegarde validée vaut mieux qu\'une hypothèse optimiste');
  }
});
