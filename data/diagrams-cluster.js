/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-cluster.js — Schémas SVG du parcours CLUSTERING & HA (clu-*)
   Palette : '#E57000','#e74c3c','#27ae60','#3498db','#8e44ad',
             '#16a085','#f39c12','#2c3e50','#1a2530'
   svgArrowGreen = flux sains · svgArrowRed = pannes / failover
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* Création du cluster PROXMOX-CFP : pvecm create + add, quorum n/2+1 */
  'clu-creation': function () {
    return svgOpen(700, 240, "Création du cluster PROXMOX-CFP avec pvecm") +
      svgBox(20, 40, 160, 70, '#E57000', '#b85500', 'pve1\npvecm create\nPROXMOX-CFP') +
      svgBox(300, 30, 150, 90, '#1a2530', '#0d1117', 'Cluster\npmxcfs\n/etc/pve répliqué') +
      svgBox(540, 20, 140, 56, '#3498db', '#1a6a9e', 'pve2\npvecm add') +
      svgBox(540, 96, 140, 56, '#8e44ad', '#6c3483', 'pve3\npvecm add') +
      svgArrowGreen(180, 75, 300, 75) +
      svgArrowGreen(540, 48, 450, 60) +
      svgArrowGreen(540, 124, 450, 100) +
      svgBox(300, 152, 150, 50, '#f39c12', '#b8750d', 'Quorum n/2+1\n3 nœuds → 2 votes') +
      svgBox(20, 152, 240, 50, '#16a085', '#0e6655', 'Réseau corosync dédié\nlink0 — 10.10.10.0/24') +
      svgLine(95, 152, 100, 110, '#16a085', 2) +
      svgLine(200, 165, 300, 110, '#16a085', 2) +
      svgLine(375, 152, 375, 120, '#f39c12', 2) +
      svgClose('pvecm create sur pve1 puis pvecm add depuis pve2/pve3 : la config (pmxcfs) se réplique via Corosync et le quorum exige n/2+1 votes');
  },

  /* Corosync : 3 nœuds, 2 liens redondants, latence faible */
  'clu-corosync': function () {
    return svgOpen(700, 250, "Corosync : liens redondants et latence maîtrisée") +
      svgBox(40, 25, 160, 56, '#E57000', '#b85500', 'pve1\nnodeid 1') +
      svgBox(270, 25, 160, 56, '#E57000', '#b85500', 'pve2\nnodeid 2') +
      svgBox(500, 25, 160, 56, '#E57000', '#b85500', 'pve3\nnodeid 3') +
      svgLine(180, 81, 180, 172, '#8e44ad', 2) +
      svgLine(420, 81, 420, 172, '#8e44ad', 2) +
      svgLine(600, 81, 600, 172, '#8e44ad', 2) +
      svgBox(40, 172, 620, 36, '#8e44ad', '#6c3483', 'link1 — 192.168.10.0/24 (VLAN 10) — lien de secours') +
      svgArrowGreen(90, 81, 90, 120) +
      svgArrowGreen(320, 81, 320, 120) +
      svgArrowGreen(550, 81, 550, 120) +
      svgBox(40, 120, 620, 36, '#27ae60', '#1a6a3e', 'link0 — 10.10.10.0/24 (VLAN 20) — NIC dédiée, latence < 5 ms') +
      svgText(350, 232, 'knet bascule automatiquement sur link1 si link0 tombe — UDP 5404-5405', '#8d97a8', 11) +
      svgClose('Chaque nœud emprunte link0 (chemin dédié, faible latence) et link1 (secours) : la panne d\'un switch n\'isole plus le cluster');
  },

  /* QDevice : 3e vote externe pour un cluster de 2 nœuds */
  'clu-qdevice': function () {
    return svgOpen(700, 230, "QDevice : vote externe pour un cluster de 2 nœuds") +
      svgBox(60, 40, 170, 60, '#3498db', '#1a6a9e', 'pve1\nvote 1') +
      svgBox(60, 130, 170, 60, '#8e44ad', '#6c3483', 'pve2\nvote 1') +
      svgBox(450, 55, 210, 70, '#f39c12', '#b8750d', 'QDevice — QNetd\n192.168.10.60 (hors cluster)\nvote 1 dynamique') +
      svgArrowGreen(230, 70, 450, 80) +
      svgArrowGreen(230, 160, 450, 105) +
      svgBox(280, 165, 170, 46, '#E57000', '#b85500', 'Quorum : 2/3 votes\n(n/2+1 sur 3 votants)') +
      svgArrowRed(145, 130, 145, 105) +
      svgText(210, 112, 'panne de pve2', '#e74c3c', 10) +
      svgText(350, 226, 'Même avec un nœud en panne, le cluster garde 2/3 votes : quorum préservé', '#8d97a8', 11) +
      svgClose('Le QDevice (corosync-qnetd) apporte le vote décisif d\'un cluster pair : installez-le HORS du cluster, sur une machine indépendante');
  },

  /* HA Manager : CRM, LRM, watchdog/fencing, failover */
  'clu-ha': function () {
    return svgOpen(700, 250, "HA Manager : CRM, LRM et failover") +
      svgBox(260, 20, 180, 50, '#1a2530', '#0d1117', 'CRM (pmxcfs)\ndécisions HA') +
      svgLine(310, 70, 125, 120, '#8d97a8', 2) +
      svgLine(350, 70, 350, 120, '#8d97a8', 2) +
      svgLine(390, 70, 575, 120, '#8d97a8', 2) +
      svgBox(30, 120, 190, 54, '#3498db', '#1a6a9e', 'LRM pve1\nwatchdog-mux') +
      svgBox(255, 120, 190, 54, '#3498db', '#1a6a9e', 'LRM pve2\nwatchdog-mux') +
      svgBox(480, 120, 190, 54, '#3498db', '#1a6a9e', 'LRM pve3\nwatchdog-mux') +
      svgArrowRed(445, 147, 480, 147) +
      svgText(462, 137, 'failover', '#e74c3c', 10) +
      svgBox(30, 200, 230, 40, '#27ae60', '#1a6a3e', 'Ressource : vm:100 → HA Group prod') +
      svgBox(480, 200, 190, 40, '#e74c3c', '#922b21', 'Watchdog + fencing\nnœud figé = reboot') +
      svgClose('Le CRM planifie, chaque LRM exécute sous watchdog : un nœud figé est fenced (reboot) puis ses ressources HA redémarrent sur un autre nœud');
  },

  /* Live migration : RAM itérative, disque sur stockage partagé */
  'clu-migration': function () {
    return svgOpen(700, 240, "Live migration d'une VM sur stockage partagé") +
      svgBox(40, 40, 190, 100, '#E57000', '#b85500', 'pve1 — source') +
      svgBox(60, 68, 150, 60, '#e74c3c', '#922b21', 'VM 100\nRAM 8 Go\nrunning') +
      svgBox(470, 40, 190, 100, '#2c3e50', '#17202a', 'pve2 — cible') +
      svgBox(490, 68, 150, 60, '#27ae60', '#1a6a3e', 'VM 100\nRAM 8 Go\narrivée') +
      svgArrowGreen(230, 70, 470, 70) +
      svgText(350, 58, 'copie RAM (dirty pages)', '#27ae60', 10) +
      svgArrowGreen(470, 115, 230, 115) +
      svgText(350, 132, 'I/O disque via stockage partagé', '#27ae60', 10) +
      svgBox(240, 172, 220, 46, '#16a085', '#0e6655', 'Stockage partagé\nCeph RBD — vm-100-disk-0') +
      svgLine(140, 140, 280, 172, '#16a085', 2) +
      svgLine(560, 140, 420, 172, '#16a085', 2) +
      svgText(350, 234, 'Bascule finale en millisecondes : IP conservée, uptime continu', '#8d97a8', 11) +
      svgClose('La live migration copie la RAM itération après itération ; le disque reste sur le stockage partagé, l\'interruption est quasi nulle');
  },

  /* Stockage partagé : Ceph, NFS, iSCSI vus par les 3 nœuds */
  'clu-shared': function () {
    return svgOpen(700, 240, "Storages partagés : socle du HA") +
      svgBox(40, 25, 160, 52, '#E57000', '#b85500', 'pve1') +
      svgBox(270, 25, 160, 52, '#E57000', '#b85500', 'pve2') +
      svgBox(500, 25, 160, 52, '#E57000', '#b85500', 'pve3') +
      svgArrowGreen(100, 77, 130, 150) +
      svgArrowGreen(350, 77, 355, 150) +
      svgArrowGreen(600, 77, 565, 150) +
      svgBox(40, 150, 180, 62, '#e74c3c', '#922b21', 'Ceph RBD — HCI\nrépliqué 3× · HA natif\n10.20.20.0/24') +
      svgBox(280, 150, 150, 62, '#f39c12', '#b8750d', 'NFS\nNAS partagé\nbackups + VMs') +
      svgBox(470, 150, 190, 62, '#3498db', '#1a6a9e', 'iSCSI + LVM\nSAN existant (bloc)\n--shared 1') +
      svgText(350, 232, 'vm-100-disk-0 est vu par les 3 nœuds : le failover n\'a rien à copier', '#8d97a8', 11) +
      svgClose('Ceph (répliqué + snapshots), NFS (simplicité) et iSCSI+LVM (SAN) sont partagés : sans eux, ni HA ni live migration rapide');
  },

  /* Datacenter Manager : fédération multi-clusters */
  'clu-pdcm': function () {
    return svgOpen(700, 240, "Proxmox Datacenter Manager : vue multi-clusters") +
      svgBox(250, 20, 200, 60, '#E57000', '#b85500', 'Proxmox Datacenter Manager\nhttps://IP_PDCM:8443') +
      svgArrow(300, 80, 180, 130, '#8d97a8') +
      svgArrow(400, 80, 520, 130, '#8d97a8') +
      svgText(198, 108, 'API Token', '#8d97a8', 10) +
      svgText(502, 108, 'API Token', '#8d97a8', 10) +
      svgBox(40, 130, 280, 80, '#1a2530', '#0d1117', 'Cluster PROXMOX-CFP\npve1 · pve2 · pve3\nCeph + HA') +
      svgBox(430, 130, 230, 80, '#2c3e50', '#17202a', 'Cluster distant\npve-a · pve-b + QDevice') +
      svgArrowGreen(320, 178, 430, 178) +
      svgText(375, 166, 'migration inter-clusters', '#27ae60', 10) +
      svgText(350, 232, 'Chaque cluster reste autonome : le PDCM observe et pilote, il ne remplace pas le quorum local', '#8d97a8', 11) +
      svgClose('Le PDCM agrège plusieurs clusters via des remotes (API Token) : supervision fédérée et migrations inter-clusters');
  }

});
