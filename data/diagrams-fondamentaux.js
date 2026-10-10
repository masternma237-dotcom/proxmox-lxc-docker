/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-fondamentaux.js — Schémas SVG du parcours Fondamentaux
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  'fd-arch': function () {
    return svgOpen(700, 260, "Architecture globale de Proxmox VE") +
      svgBox(20, 30, 130, 60, '#2c3e50', '#17202a', 'Datacenter\n(cluster)') +
      svgArrow(150, 60, 210, 60) +
      svgBox(210, 20, 150, 80, '#E57000', '#b85500', 'Node\nProxmox VE\nDebian + KVM') +
      svgArrow(360, 45, 420, 45) +
      svgBox(420, 15, 120, 55, '#e74c3c', '#922b21', 'VM KVM') +
      svgBox(420, 80, 120, 55, '#3498db', '#1a6a9e', 'LXC') +
      svgBox(210, 130, 150, 55, '#16a085', '#0e6655', 'Web UI :8006\nAPI REST') +
      svgBox(20, 130, 130, 55, '#8e44ad', '#6c3483', 'Stockage\nZFS / LVM / Ceph') +
      svgLine(95, 130, 260, 110, '#8d97a8', 2) +
      svgLine(285, 130, 285, 100, '#8d97a8', 2) +
      svgBox(210, 200, 330, 44, '#1a2530', '#0d1117', 'Matériel : CPU VT-x/AMD-V · RAM · NICs · Disques') +
      svgClose('Proxmox VE = Debian + noyau KVM + LXC + interface web unifiée');
  },

  'fd-install': function () {
    return svgOpen(700, 200, "Deux chemins d'installation de Proxmox VE") +
      svgBox(20, 30, 160, 110, '#E57000', '#b85500', 'ISO officielle\n(recommandé)\nInstalleur graphique\nZFS proposé') +
      svgBox(20, 30, 160, 0, '#E57000', '#b85500', '') +
      svgBox(520, 30, 160, 110, '#2c3e50', '#17202a', 'Sur Debian 12\n(existant)\napt install proxmox-ve\n(cas particuliers)') +
      svgArrow(180, 85, 300, 85, '#27ae60') +
      svgArrow(520, 85, 400, 85, '#f39c12') +
      svgBox(300, 45, 100, 80, '#1a2530', '#0d1117', 'Proxmox VE\n8.x\nport 8006') +
      svgText(350, 170, 'Post-install : dépôts no-subscription → apt full-upgrade → réseau mgmt', '#8d97a8', 11) +
      svgClose("Voie ISO = installateur complet ; voie Debian = paquets sur un OS existant");
  },

  'fd-interfaces': function () {
    return svgOpen(700, 210, "Les trois canaux d'administration") +
      svgBox(20, 40, 190, 70, '#3498db', '#1a6a9e', 'GUI Web\nhttps://IP:8006') +
      svgBox(20, 130, 190, 60, '#27ae60', '#1a6a3e', 'CLI\nqm · pct · pvesh') +
      svgBox(490, 40, 190, 70, '#8e44ad', '#6c3483', 'API REST\nPOST /access/ticket') +
      svgBox(280, 75, 140, 70, '#E57000', '#b85500', 'Proxmox VE\n(pveproxy)') +
      svgArrow(210, 75, 280, 100) +
      svgArrow(210, 160, 280, 120) +
      svgArrow(490, 75, 420, 100) +
      svgBox(280, 170, 140, 34, '#1a2530', '#0d1117', 'Automatisation') +
      svgClose('Les trois canaux pilotent exactement les mêmes objets et respectent les mêmes permissions');
  },

  'fd-storage': function () {
    return svgOpen(700, 230, "Typologie des storages Proxmox") +
      svgBox(20, 20, 150, 50, '#16a085', '#0e6655', 'ZFS\nsnapshots + intégrité') +
      svgBox(20, 85, 150, 50, '#8e44ad', '#6c3483', 'LVM-Thin\nthin + snapshots') +
      svgBox(20, 150, 150, 50, '#2c3e50', '#17202a', 'Directory\nISO, backups') +
      svgBox(390, 20, 150, 50, '#f39c12', '#b8750d', 'NFS\npartagé multi-nœuds') +
      svgBox(390, 85, 150, 50, '#2980b9', '#1a5276', 'iSCSI\nSAN + LVM') +
      svgBox(390, 150, 150, 50, '#e74c3c', '#922b21', 'Ceph RBD\nHCI, HA') +
      svgBox(230, 80, 120, 60, '#E57000', '#b85500', 'pvesm\nstorage plugins') +
      svgArrow(170, 45, 230, 95) + svgArrow(170, 110, 230, 110) + svgArrow(170, 175, 230, 125) +
      svgArrow(390, 45, 350, 95) + svgArrow(390, 110, 350, 110) + svgArrow(390, 175, 350, 125) +
      svgClose('Toutes les technologies convergent vers une interface unique (pvesm / GUI / API)');
  },

  'fd-vm': function () {
    return svgOpen(700, 220, "Anatomie d'une VM KVM performante") +
      svgBox(20, 30, 150, 160, '#1a2530', '#0d1117', 'Hôte\nProxmox VE') +
      svgBox(40, 50, 110, 40, '#E57000', '#b85500', 'KVM / QEMU') +
      svgBox(40, 100, 110, 34, '#f39c12', '#b8750d', 'vCPU (host)') +
      svgBox(40, 144, 110, 34, '#16a085', '#0e6655', 'RAM + balloon') +
      svgArrow(170, 60, 240, 60) +
      svgArrow(170, 160, 240, 160) +
      svgBox(240, 30, 170, 70, '#e74c3c', '#922b21', 'Disque VirtIO SCSI\nlocal-zfs:32') +
      svgBox(240, 120, 170, 70, '#3498db', '#1a6a9e', 'NIC VirtIO\nbridge=vmbr0') +
      svgArrow(410, 65, 480, 65) +
      svgArrow(410, 155, 480, 155) +
      svgBox(480, 30, 200, 70, '#27ae60', '#1a6a3e', 'Qemu Guest Agent\nsnapshots cohérents + IPs') +
      svgBox(480, 120, 200, 70, '#8e44ad', '#6c3483', 'Cloud-init\nIP, clés SSH, hostname') +
      svgClose('VirtIO partout + agent invité + cloud-init = la combinaison gagnante');
  },

  'fd-lxc': function () {
    return svgOpen(700, 210, "CT privilégié vs non privilégié") +
      svgBox(20, 40, 300, 130, '#1a2530', '#0d1117', '') +
      svgText(170, 30, 'Nœud Proxmox (UID réels)', '#8d97a8', 11) +
      svgBox(40, 60, 120, 90, '#e74c3c', '#922b21', 'CT privilégié\nroot=0\nrisque élevé') +
      svgBox(180, 60, 120, 90, '#27ae60', '#1a6a3e', 'CT non privil.\nroot=100000\nsécurisé') +
      svgArrow(320, 105, 390, 105) +
      svgBox(390, 60, 130, 90, '#8e44ad', '#6c3483', 'Hôte\n/root:0\n/ct-root:100000') +
      svgBox(560, 60, 120, 90, '#E57000', '#b85500', 'Template\npveam\nDebian/Ubuntu') +
      svgClose('Le mapping UID (100000+) isole le root du conteneur du root de l\'hôte');
  },

  'fd-snapshots': function () {
    return svgOpen(700, 200, "Snapshot, rollback et clones") +
      svgBox(20, 60, 110, 70, '#2c3e50', '#17202a', 'VM 100\nétat initial') +
      svgArrow(130, 95, 200, 95) +
      svgBox(200, 60, 120, 70, '#f39c12', '#b8750d', 'SNAPSHOT\n"T" figé (COW)') +
      svgArrow(320, 95, 390, 95) +
      svgBox(390, 60, 120, 70, '#e74c3c', '#922b21', 'Modification\nrisquée') +
      svgArrowRed(450, 55, 450, 30) + svgText(505, 32, 'rollback', '#e74c3c', 10) +
      svgLine(390, 30, 260, 30, '#e74c3c', 2) + svgArrow(260, 30, 260, 58, '#e74c3c') +
      svgArrow(390, 130, 470, 160, '#27ae60') +
      svgBox(470, 135, 110, 60, '#27ae60', '#1a6a3e', 'Clone\nfull/linked') +
      svgBox(590, 135, 100, 60, '#3498db', '#1a6a9e', 'Template\nlecture seule') +
      svgLine(590, 165, 580, 165, '#8d97a8', 2) +
      svgClose('Snapshot = retour arrière ; template + clone = fabrique de machines');
  }
});
