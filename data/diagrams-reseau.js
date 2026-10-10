/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-reseau.js — Schémas SVG du parcours RÉSEAU (net-*)
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* vmbr0 : VMs + LXC branchés sur le bridge, NIC physique vers le switch */
  'net-bridges': function () {
    return svgOpen(700, 260, "Linux Bridge vmbr0 : VMs, conteneurs et NIC physique") +
      svgBox(20, 30, 130, 46, '#e74c3c', '#922b21', 'VM 100\n10.100.0.51') +
      svgBox(20, 92, 130, 46, '#3498db', '#1a6a9e', 'VM 200\n10.200.0.51') +
      svgBox(20, 154, 130, 46, '#27ae60', '#1a6a3e', 'CT 210\n10.100.0.60') +
      svgArrow(150, 53, 233, 95) +
      svgArrow(150, 115, 233, 115) +
      svgArrow(150, 177, 233, 135) +
      svgBox(233, 40, 180, 150, '#E57000', '#b85500', 'vmbr0\nLinux Bridge\n192.168.10.11/24\nbridge-ports enp1s0', { fontSize: 11 }) +
      svgArrow(413, 115, 465, 115) +
      svgBox(465, 80, 115, 70, '#2c3e50', '#17202a', 'enp1s0\nNIC physique') +
      svgArrow(580, 115, 618, 115) +
      svgBox(618, 80, 62, 70, '#1a2530', '#0d1117', 'Switch') +
      svgText(350, 232, "tap (VM) et veth (LXC) sont branchés sur le bridge comme des ports d'un switch logiciel", '#8d97a8', 11) +
      svgClose('vmbr0 = switch L2 logiciel : management du nœud (192.168.10.0/24) + trafic des VMs');
  },

  /* Bond : deux esclaves, port-channel LACP, plus les 3 modes clés */
  'net-bonds': function () {
    return svgOpen(700, 270, "Bond LACP 802.3ad : deux NICs, un port-channel") +
      svgBox(40, 55, 150, 90, '#E57000', '#b85500', 'bond0\nmode 802.3ad\nLACP rate fast\nmiimon 100', { fontSize: 11 }) +
      svgArrow(190, 80, 250, 65) +
      svgArrow(190, 120, 250, 135) +
      svgBox(250, 35, 130, 46, '#2c3e50', '#17202a', 'enp1s0\n(esclave 1)', { fontSize: 11 }) +
      svgBox(250, 125, 130, 46, '#2c3e50', '#17202a', 'enp2s0\n(esclave 2)', { fontSize: 11 }) +
      svgArrowGreen(380, 58, 450, 75) +
      svgArrowGreen(380, 148, 450, 125) +
      svgBox(450, 55, 180, 90, '#16a085', '#0e6655', 'Switch physique\nport-channel LACP\ndébit agrégé +\nredondance de lien', { fontSize: 11 }) +
      svgBox(40, 185, 200, 44, '#f39c12', '#b8750d', 'active-backup (mode 1)\nsans config switch', { fontSize: 10 }) +
      svgBox(255, 185, 200, 44, '#3498db', '#1a6a9e', 'balance-rr (mode 0)\ndébit cumulé, point-à-point', { fontSize: 10 }) +
      svgBox(470, 185, 200, 44, '#8e44ad', '#6c3483', '802.3ad LACP (mode 4)\nproduction avec port-channel', { fontSize: 10 }) +
      svgClose("Le bond se branche ensuite dans un bridge : bridge-ports bond0");
  },

  /* VLAN-aware : tags par VM, trunk vers le switch, VLAN natif */
  'net-vlans': function () {
    return svgOpen(700, 250, "VLAN taggé, natif et trunk sur un bridge VLAN-aware") +
      svgBox(20, 25, 140, 46, '#E57000', '#b85500', 'VM prod\ntag=100') +
      svgBox(20, 87, 140, 46, '#3498db', '#1a6a9e', 'VM test\ntag=200') +
      svgBox(20, 149, 140, 46, '#27ae60', '#1a6a3e', 'Hôte mgmt\nVLAN natif 10') +
      svgArrow(160, 48, 223, 80) +
      svgArrow(160, 110, 223, 110) +
      svgArrow(160, 172, 223, 140) +
      svgBox(223, 40, 175, 145, '#2c3e50', '#17202a', 'vmbr0\nVLAN-aware yes\nbridge-vids 2-4094\n(tag traité au L2)', { fontSize: 11 }) +
      svgArrow(398, 112, 448, 112, '#f39c12') +
      svgText(423, 94, 'Trunk 10,100,200', '#f39c12', 10) +
      svgBox(448, 40, 100, 145, '#8e44ad', '#6c3483', 'Switch\nports trunk', { fontSize: 11 }) +
      svgArrow(548, 70, 588, 70) +
      svgArrow(548, 155, 588, 155) +
      svgBox(588, 45, 100, 50, '#E57000', '#b85500', 'VLAN 100\n10.100.0.0/24', { fontSize: 10 }) +
      svgBox(588, 130, 100, 50, '#3498db', '#1a6a9e', 'VLAN 200\n10.200.0.0/24', { fontSize: 10 }) +
      svgText(350, 228, "Le VLAN natif circule sans tag 802.1Q ; les VLANs 100 et 200 sont tagués dans le trunk", '#8d97a8', 11) +
      svgClose("Un bridge VLAN-aware remplace N bridges : le tag est choisi par VM (netX: tag=)");
  },

  /* Les 4 types de zones SDN */
  'net-zones': function () {
    return svgOpen(700, 270, "Les quatre types de zones SDN de Proxmox") +
      svgBox(240, 15, 220, 40, '#1a2530', '#0d1117', 'Datacenter → SDN → Zones') +
      svgLine(350, 55, 350, 78, '#8d97a8', 2) +
      svgLine(95, 78, 601, 78, '#8d97a8', 2) +
      svgLine(95, 78, 95, 100, '#8d97a8', 2) +
      svgLine(262, 78, 262, 100, '#8d97a8', 2) +
      svgLine(430, 78, 430, 100, '#8d97a8', 2) +
      svgLine(601, 78, 601, 100, '#8d97a8', 2) +
      svgBox(20, 100, 150, 80, '#2c3e50', '#17202a', 'Zone simple\nVNets sans tag\nbridge local par VNet', { fontSize: 10 }) +
      svgBox(187, 100, 150, 80, '#E57000', '#b85500', 'Zone VLAN\ntag 802.1Q\nporté par vmbrX', { fontSize: 10 }) +
      svgBox(355, 100, 150, 80, '#f39c12', '#b8750d', 'Zone QinQ\nS-VLAN 802.1ad\n× C-VLAN clients', { fontSize: 10 }) +
      svgBox(522, 100, 158, 80, '#8e44ad', '#6c3483', 'Zone VXLAN\noverlay VNI\nau-dessus du L3', { fontSize: 10 }) +
      svgText(350, 215, "Labo CFP-CMD : zone VLAN prodzone → VNet prod (tag 100 · 10.100.0.0/24) + VNet test (tag 200 · 10.200.0.0/24)", '#8d97a8', 11) +
      svgText(350, 237, "Chaque zone se matérialise en bridges/interfaces générés par le SDN après Apply", '#8d97a8', 11) +
      svgClose("La zone choisit le transport ; le VNet choisit l'isolant (tag, S-VLAN ou VNI)");
  },

  /* VNets + subnets dans la zone, pilotés par IPAM et dnsmasq */
  'net-vnets': function () {
    return svgOpen(700, 260, "VNets, subnets, IPAM et DHCP dnsmasq") +
      svgBox(20, 90, 130, 60, '#8e44ad', '#6c3483', 'Zone VLAN\nprodzone', { fontSize: 11 }) +
      svgArrow(150, 120, 178, 120) +
      svgBox(180, 20, 310, 205, '#1a2530', '#0d1117', '') +
      svgText(335, 42, "Contenu généré par le SDN (après Apply)", '#8d97a8', 10) +
      svgBox(200, 60, 130, 55, '#E57000', '#b85500', 'VNet prod\ntag 100', { fontSize: 11 }) +
      svgBox(340, 60, 130, 55, '#3498db', '#1a6a9e', 'VNet test\ntag 200', { fontSize: 11 }) +
      svgBox(200, 150, 130, 60, '#16a085', '#0e6655', 'Subnet\n10.100.0.0/24\nGW 10.100.0.1', { fontSize: 10 }) +
      svgBox(340, 150, 130, 60, '#27ae60', '#1a6a3e', 'Subnet\n10.200.0.0/24\nGW 10.200.0.1', { fontSize: 10 }) +
      svgLine(265, 115, 265, 150, '#8d97a8', 2) +
      svgLine(405, 115, 405, 150, '#8d97a8', 2) +
      svgArrow(490, 95, 520, 85) +
      svgBox(520, 55, 160, 60, '#f39c12', '#b8750d', 'IPAM backend pve\nregistre des IP', { fontSize: 11 }) +
      svgArrow(490, 180, 520, 185) +
      svgBox(520, 155, 160, 60, '#2c3e50', '#17202a', 'dnsmasq par VNet\nbails DHCP dynamiques', { fontSize: 11 }) +
      svgClose("Subnet = condition de l'IPAM et du DHCP : sans gateway déclarée, tout reste manuel");
  },

  /* Routage : gateway de subnet + SNAT, controllers evpn/fx */
  'net-routing': function () {
    return svgOpen(700, 260, "Routage SDN : gateway de subnet et FRRouting") +
      svgBox(20, 30, 140, 55, '#E57000', '#b85500', 'VNet prod\n10.100.0.0/24', { fontSize: 11 }) +
      svgBox(20, 145, 140, 55, '#3498db', '#1a6a9e', 'VNet test\n10.200.0.0/24', { fontSize: 11 }) +
      svgArrow(160, 57, 240, 95) +
      svgArrow(160, 172, 240, 135) +
      svgBox(240, 80, 180, 70, '#16a085', '#0e6655', 'Nœud Proxmox\nGW virtuelle .1\n+ FRR (zebra, bgpd)', { fontSize: 10 }) +
      svgArrow(420, 115, 470, 115) +
      svgBox(470, 85, 110, 60, '#f39c12', '#b8750d', 'SNAT\nsortie via mgmt\n192.168.10.0/24', { fontSize: 10 }) +
      svgArrow(580, 115, 615, 115) +
      svgBox(615, 85, 70, 60, '#1a2530', '#0d1117', 'WAN', { fontSize: 11 }) +
      svgBox(470, 20, 215, 40, '#8e44ad', '#6c3483', 'Controller evpn → BGP-EVPN (FRR)', { fontSize: 10 }) +
      svgLine(420, 90, 470, 40, '#8d97a8', 2) +
      svgBox(470, 180, 215, 40, '#27ae60', '#1a6a3e', 'Controller fx → fabric routing statique', { fontSize: 10 }) +
      svgLine(420, 140, 470, 200, '#8d97a8', 2) +
      svgText(350, 240, "La gateway .1 de chaque subnet route localement sur le nœud ; FRR étend le routage (EVPN) au cluster", '#8d97a8', 10) +
      svgClose("Gateway de subnet = routage local ; controllers = plan de contrôle FRR (evpn) ou fabric (fx)");
  },

  /* Overlay VXLAN entre trois VTEP */
  'net-vxlan': function () {
    return svgOpen(700, 260, "Overlay VXLAN entre les VTEP de trois nœuds") +
      svgBox(210, 20, 280, 50, '#8e44ad', '#6c3483', 'VNet vxprod — VNI 100\nsegment L2 étendu au cluster', { fontSize: 11 }) +
      svgLine(300, 70, 110, 150, '#8d97a8', 2) +
      svgLine(350, 70, 350, 150, '#8d97a8', 2) +
      svgLine(400, 70, 590, 150, '#8d97a8', 2) +
      svgBox(40, 150, 140, 65, '#E57000', '#b85500', 'pve1\nVTEP\n192.168.10.11', { fontSize: 10 }) +
      svgBox(280, 150, 140, 65, '#E57000', '#b85500', 'pve2\nVTEP\n192.168.10.12', { fontSize: 10 }) +
      svgBox(520, 150, 140, 65, '#E57000', '#b85500', 'pve3\nVTEP\n192.168.10.13', { fontSize: 10 }) +
      svgLine(180, 182, 280, 182, '#e74c3c', 2, '6,4') +
      svgLine(420, 182, 520, 182, '#e74c3c', 2, '6,4') +
      svgText(230, 172, 'UDP 4789', '#e74c3c', 10) +
      svgText(470, 172, 'UDP 4789', '#e74c3c', 10) +
      svgText(350, 240, "Underlay : 192.168.10.0/24 (mgmt) — MTU VXLAN 1450 ou jumbo frames sur l'underlay", '#8d97a8', 11) +
      svgClose("Chaque nœud devient un VTEP : les VMs d'un même VNet se voient en L2, quel que soit le nœud");
  }
});
