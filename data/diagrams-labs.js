/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-labs.js — Schémas SVG du parcours LABS & ÉVALUATION
   Palette CDC : #E57000 #e74c3c #27ae60 #3498db #8e44ad #16a085 #f39c12
                  #2c3e50 #1a2530
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* Lab 0 — topologie du labo : 3 nœuds + réseaux du CDC */
  'lab-topology': function () {
    return svgOpen(720, 360, "Topologie du labo : 3 nœuds Proxmox et réseaux VLAN du CDC") +
      /* trunks verticaux (dessinés d'abord, derrière les barres) */
      svgLine(120, 90, 120, 268, '#8d97a8', 1.5) +
      svgLine(360, 90, 360, 268, '#8d97a8', 1.5) +
      svgLine(600, 90, 600, 268, '#8d97a8', 1.5) +
      /* réseaux du CDC */
      svgBox(30, 130, 660, 36, '#3498db', '#1a6a9e', 'VLAN 10 — Management 192.168.10.0/24 (GUI · SSH · API)') +
      svgBox(30, 176, 660, 36, '#16a085', '#0e6655', 'VLAN 20 — Corosync 10.10.10.0/24 (latence < 5 ms)') +
      svgBox(30, 222, 660, 36, '#f39c12', '#b8750d', 'VLAN 30 — Ceph public 10.20.20.0/24 (MON · OSD · clients RBD)') +
      svgBox(30, 268, 660, 36, '#e74c3c', '#922b21', 'VLAN 40 — Ceph cluster 10.30.30.0/24 (réplication OSD-OSD)') +
      /* nœuds */
      svgBox(30, 20, 180, 70, '#E57000', '#b85500', 'pve1\n192.168.10.11') +
      svgBox(270, 20, 180, 70, '#8e44ad', '#6c3483', 'pve2\n192.168.10.12') +
      svgBox(510, 20, 180, 70, '#2c3e50', '#17202a', 'pve3\n192.168.10.13') +
      /* workloads */
      svgBox(60, 316, 280, 36, '#27ae60', '#1a6a3e', 'VMs Prod — 10.100.0.0/24 (VLAN 100)') +
      svgBox(380, 316, 280, 36, '#1a2530', '#0d1117', 'VMs Test — 10.200.0.0/24 (VLAN 200)') +
      svgClose("Topologie du labo CDC : chaque nœud est raccordé aux 4 réseaux d'infrastructure ; les VMs vivent sur les VLANs 100 (prod) et 200 (test)");
  },

  /* Lab 1 — panne d'un nœud et failover HA */
  'lab-failover': function () {
    return svgOpen(720, 290, "Scénario de panne : failover HA d'une VM avec QDevice") +
      svgBox(250, 15, 220, 36, '#e74c3c', '#922b21', 'Scénario de panne : poweroff -f') +
      svgArrowRed(360, 51, 360, 86) +
      svgBox(30, 90, 180, 80, '#27ae60', '#1a6a3e', 'pve1\nONLINE\nreçoit VM 101') +
      svgBox(270, 90, 180, 80, '#e74c3c', '#922b21', 'pve2\nPANNE\nwatchdog fired') +
      svgBox(510, 90, 180, 80, '#27ae60', '#1a6a3e', 'pve3\nONLINE\nquorum maintenu') +
      svgArrowGreen(268, 110, 212, 110) +
      svgText(240, 102, 'failover', '#27ae60', 10) +
      svgArrowGreen(120, 170, 120, 223) +
      svgBox(30, 225, 180, 50, '#27ae60', '#1a6a3e', 'VM 101 redémarrée\nsur pve1 (CRM)') +
      svgLine(600, 170, 600, 223, '#8d97a8', 2) +
      svgBox(510, 225, 180, 50, '#3498db', '#1a6a9e', 'QDevice 192.168.10.40\ncorde de vote (quorum)') +
      svgText(360, 262, 'Panne d\'un nœud : le CRM détecte (fencing) puis redémarre la ressource HA sur un nœud sain.', '#8d97a8', 11) +
      svgClose('Le QDevice conserve la majorité quand un vote manque ; le quorum perdu arrête proprement les ressources HA');
  },

  /* Lab 2 — Ceph HCI : OSDs, pool répliqué, client RBD */
  'lab-ceph': function () {
    return svgOpen(720, 310, "Ceph HCI : 6 OSD sur 3 nœuds, pool répliqué, client RBD") +
      /* pve1 */
      svgBox(30, 30, 180, 120, '#1a2530', '#0d1117', '') +
      svgText(120, 48, 'pve1', '#E57000', 12) +
      svgBox(45, 58, 72, 40, '#16a085', '#0e6655', 'OSD.0') +
      svgBox(123, 58, 72, 40, '#16a085', '#0e6655', 'OSD.1') +
      svgBox(45, 104, 152, 38, '#3498db', '#1a6a9e', 'MON + MGR') +
      /* pve2 */
      svgBox(270, 30, 180, 120, '#1a2530', '#0d1117', '') +
      svgText(360, 48, 'pve2', '#E57000', 12) +
      svgBox(285, 58, 72, 40, '#16a085', '#0e6655', 'OSD.2') +
      svgBox(363, 58, 72, 40, '#16a085', '#0e6655', 'OSD.3') +
      svgBox(285, 104, 152, 38, '#3498db', '#1a6a9e', 'MON + MGR') +
      /* pve3 */
      svgBox(510, 30, 180, 120, '#1a2530', '#0d1117', '') +
      svgText(600, 48, 'pve3', '#E57000', 12) +
      svgBox(525, 58, 72, 40, '#16a085', '#0e6655', 'OSD.4') +
      svgBox(603, 58, 72, 40, '#16a085', '#0e6655', 'OSD.5') +
      svgBox(525, 104, 152, 38, '#3498db', '#1a6a9e', 'MON + MGR') +
      /* pool répliqué */
      svgArrow(120, 150, 120, 188, '#16a085') +
      svgArrow(360, 150, 360, 188, '#16a085') +
      svgArrow(600, 150, 600, 188, '#16a085') +
      svgBox(30, 190, 660, 44, '#16a085', '#0e6655', 'Pool « rbd-vm » — réplication 3 · size=3 / min_size=2 · placement CRUSH par hôte') +
      svgArrow(360, 234, 360, 256, '#3498db') +
      svgBox(240, 258, 240, 40, '#3498db', '#1a6a9e', 'VM 101 — client RBD (librbd)') +
      svgClose("6 OSDs répartis sur 3 nœuds : chaque objet est répliqué sur 3 OSD de nœuds différents ; la perte d'un OSD ou d'un nœud dégrade mais ne stoppe pas le pool");
  },

  /* Lab 3 — SDN multi-tenant : zones, VNets, isolation */
  'lab-sdn': function () {
    return svgOpen(720, 300, "SDN multi-tenant : zones, VNets et isolation des tenants") +
      svgBox(280, 15, 160, 40, '#2c3e50', '#17202a', 'SDN — Datacenter') +
      svgArrow(340, 55, 130, 68) +
      svgArrow(360, 55, 360, 68) +
      svgArrow(380, 55, 590, 68) +
      svgBox(30, 70, 200, 44, '#E57000', '#b85500', 'Zone vlan-prod\n(type VLAN)') +
      svgBox(260, 70, 200, 44, '#16a085', '#0e6655', 'Zone vlan-test\n(type VLAN)') +
      svgBox(490, 70, 200, 44, '#8e44ad', '#6c3483', 'Zone vxlan-tenants\n(peers pve1/2/3)') +
      svgArrow(130, 114, 130, 132) +
      svgArrow(360, 114, 360, 132) +
      svgArrow(590, 114, 590, 132) +
      svgBox(30, 134, 200, 50, '#f39c12', '#b8750d', 'VNet prod100 · tag 100\nsubnet 10.100.0.0/24') +
      svgBox(260, 134, 200, 50, '#27ae60', '#1a6a3e', 'VNet test200 · tag 200\nsubnet 10.200.0.0/24') +
      svgBox(490, 134, 200, 50, '#3498db', '#1a6a9e', 'VNets tenant-a / tenant-b\ntags 1000 / 1001') +
      svgLine(130, 184, 130, 212, '#8d97a8', 2, '4,4') +
      svgLine(360, 184, 360, 212, '#8d97a8', 2, '4,4') +
      svgLine(590, 184, 590, 212, '#8d97a8', 2, '4,4') +
      svgBox(30, 214, 200, 56, '#1a2530', '#0d1117', 'Tenant A\n172.16.10.0/24 · isolé') +
      svgBox(260, 214, 200, 56, '#1a2530', '#0d1117', 'Tenant B\n172.16.20.0/24 · isolé') +
      svgBox(490, 214, 200, 56, '#e74c3c', '#922b21', 'FRRouting\nroutage inter-zones explicite') +
      svgClose('Isolation multi-tenant : chaque VNet est un segment L2 fermé ; seule la passerelle FRRouting ouvre les flux inter-zones déclarés');
  },

  /* Lab 4 — Docker + Portainer + monitoring dans un LXC */
  'lab-docker': function () {
    return svgOpen(720, 290, "Docker, Portainer et monitoring dans un LXC non privilégié") +
      svgBox(30, 30, 430, 230, '#1a2530', '#0d1117', '') +
      svgText(245, 50, 'CT 300 « docker-01 » — LXC non privilégié (nesting=1)', '#f39c12', 12) +
      svgBox(50, 62, 190, 44, '#3498db', '#1a6a9e', 'Docker Engine\ndockerd + compose') +
      svgBox(250, 62, 190, 44, '#E57000', '#b85500', 'Portainer CE\nUI https://:9443') +
      svgBox(50, 116, 120, 40, '#27ae60', '#1a6a3e', 'nginx :8080') +
      svgBox(180, 116, 120, 40, '#8e44ad', '#6c3483', 'grafana :3000') +
      svgBox(310, 116, 120, 40, '#16a085', '#0e6655', 'prometheus') +
      svgBox(50, 166, 380, 36, '#2c3e50', '#17202a', '/var/lib/docker → dataset ZFS dédié (mp0)') +
      svgBox(50, 212, 380, 36, '#f39c12', '#b8750d', 'eth0 → vmbr0 tag 200 · IP 10.200.0.30/24') +
      svgArrow(460, 84, 488, 84) +
      svgBox(490, 62, 200, 60, '#27ae60', '#1a6a3e', 'Monitoring\nPrometheus + Grafana') +
      svgArrow(590, 122, 590, 138) +
      svgBox(490, 140, 200, 60, '#3498db', '#1a6a9e', 'pve-exporter\nmétriques des 3 nœuds') +
      svgArrow(460, 230, 488, 200, '#8d97a8') +
      svgBox(490, 210, 200, 44, '#2c3e50', '#17202a', 'vzdump 300 — backup du CT') +
      svgClose('Un seul CT non privilégié héberge Docker, Portainer et la stack de monitoring ; les données vivent sur ZFS, sauvegardées par vzdump');
  },

  /* Lab 5 — défense en profondeur */
  'lab-sec': function () {
    return svgOpen(720, 290, "Défense en profondeur : pare-feux, IPS, RBAC et 2FA") +
      svgBox(20, 100, 120, 70, '#e74c3c', '#922b21', 'Attaquant\nnmap · hydra') +
      svgArrow(140, 135, 178, 135) +
      svgBox(180, 100, 150, 70, '#E57000', '#b85500', 'Pare-feu\nDatacenter\npolicy DROP') +
      svgArrow(330, 135, 368, 135) +
      svgBox(370, 100, 150, 70, '#f39c12', '#b8750d', 'Pare-feu\nNœud\nCorosync · Ceph') +
      svgArrow(520, 135, 558, 135) +
      svgBox(560, 100, 140, 70, '#16a085', '#0e6655', 'Pare-feu\nVM / CT\ngroupe « web »') +
      svgLine(255, 203, 255, 172, '#8d97a8', 2, '4,4') +
      svgLine(445, 203, 445, 172, '#8d97a8', 2, '4,4') +
      svgLine(630, 203, 630, 172, '#8d97a8', 2, '4,4') +
      svgBox(180, 205, 150, 56, '#8e44ad', '#6c3483', 'IPS Suricata\naf-packet · alertes') +
      svgBox(370, 205, 150, 56, '#3498db', '#1a6a9e', 'RBAC + 2FA TOTP\nmoindre privilège') +
      svgBox(560, 205, 140, 56, '#2c3e50', '#17202a', 'Journal\njournald · fast.log') +
      svgText(360, 278, 'Tout flux non explicitement autorisé est bloqué (DROP) — la surface résiduelle est mesurée par nmap avant/après.', '#8d97a8', 11) +
      svgClose('Trois niveaux de pare-feu + IPS + RBAC/2FA + journalisation : chaque couche couvre la défaillance de la précédente');
  },

  /* Section 70 — évaluation finale */
  'lab-eval': function () {
    return svgOpen(720, 270, "Parcours d'évaluation : quiz final, seuil et rattrapage") +
      svgBox(20, 90, 150, 80, '#E57000', '#b85500', 'Guide complet\n~70 sections\nlabs inclus') +
      svgArrow(170, 130, 218, 130) +
      svgBox(220, 90, 150, 80, '#3498db', '#1a6a9e', 'Quiz final\n20 questions\naléatoires') +
      svgArrow(370, 130, 418, 130) +
      svgBox(420, 90, 140, 80, '#f39c12', '#b8750d', 'Score ≥ 70 % ?\n(14 / 20)') +
      svgArrowGreen(560, 115, 602, 68) +
      svgBox(600, 35, 100, 66, '#27ae60', '#1a6a3e', 'Validé\nmeilleur score\nmémorisé', { fontSize: 11 }) +
      svgArrowRed(560, 145, 602, 190) +
      svgBox(600, 160, 100, 70, '#e74c3c', '#922b21', 'Rattrapage\nrevoir puis\nretenter', { fontSize: 11 }) +
      svgBox(20, 200, 250, 44, '#2c3e50', '#17202a', 'Journal de labo + checklists') +
      svgText(360, 248, 'Outils 🔧 → Quiz final : tirage dans toutes les banques · seuil 70 % · scores persistants', '#8d97a8', 11) +
      svgClose('L\'évaluation finale combine quiz (70 % requis) et labs validés ; le rattrapage est illimité avec un nouveau tirage');
  }
});
