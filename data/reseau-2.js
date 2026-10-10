/* ═══════════════════════════════════════════════════════════════════════════
   data/reseau-2.js — Parcours RÉSEAU (sections 12 → 14)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'vnets-subnets',
    track: 'reseau',
    level: 'avance',
    title: 'VNets et subnets : gestion, isolation, DHCP IPAM',
    icon: 'fa-solid fa-diagram-project',
    step: '12',
    requires: ['sdn-zones'],
    description: 'Le VNet est l\'unité de connexion du SDN Proxmox : un réseau virtuel de niveau 2 rattaché à une zone, identifié pour les zones VLAN par un tag (prod → 100, test → 200 dans le labo). Le subnet complète le VNet en y attachant une plage CIDR et une gateway virtuelle : c\'est lui qui conditionne l\'enregistrement dans l\'IPAM (backend pve local, ou phpIPAM / NetBox externes), la gestion des ranges DHCP et la détection des collisions d\'adresses. Le service DHCP s\'appuie sur dnsmasq, installé sur les nœuds et piloté par le SDN en instances séparées par VNet — chaque interface vnetX reçoit son propre démon. Cette chaîne (subnet → IPAM → dnsmasq) permet à une VM dont l\'interface est branchée sur le VNet d\'obtenir automatiquement une IP, un DNS et une gateway cohérents, y compris après migration entre nœuds.',
    cliCommands: [
      `# /etc/pve/sdn/vnets.cfg puis subnets.cfg (générés depuis la GUI)
vnet: prod
    zone prodzone
    tag 100

subnet: 10.100.0.0/24
    vnet prod
    gateway 10.100.0.1
    dhcp-range start=10.100.0.100,end=10.100.0.200`,
      `# Prérequis DHCP SDN : dnsmasq installé, instance par défaut désactivée
apt install dnsmasq
systemctl disable --now dnsmasq.service
# Le SDN lance lui-même une instance par VNet : dnsmasq@prod (ex.)

# Inspection des objets appliqués et des bails attribués
pvesh get /cluster/sdn/vnets
pvesh get /cluster/sdn/subnets
ip -br addr show vnetprod`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → SDN → VNets → Create</span> → Name prod, Zone prodzone, Tag 100",
      "<span class='wb-path'>Datacenter → SDN → VNets → prod → Subnets → Create</span> → Subnet 10.100.0.0/24, Gateway 10.100.0.1, DHCP range 10.100.0.100-10.100.0.200",
      "<span class='wb-path'>Datacenter → SDN → IPAM</span> → vérifier le backend pve (ou phpipam / netbox pour un IPAM central)",
      "<span class='wb-path'>VM → Hardware → Network Device</span> → Bridge = prod : l\'IP est réservée dans l\'IPAM au premier boot",
      "<span class='wb-path'>Datacenter → SDN</span> → Apply pour générer les interfaces vnetX et les instances dnsmasq"
    ],
    diagram: 'net-vnets',
    terminology: ['VNet', 'Subnet SDN', 'IPAM', 'dnsmasq', 'Zone SDN', 'Tag VLAN', 'Proxmox VE'],
    concepts: [
      { term: 'VNet', def: "Réseau virtuel SDN de niveau 2, rattaché à une zone et portant éventuellement un tag : c'est le bridge à choisir dans la config réseau d'une VM." },
      { term: 'Subnet SDN', def: "Plage CIDR attachée à un VNet : définit la gateway virtuelle, les ranges DHCP et l'allocation IPAM ; un VNet peut porter plusieurs subnets." },
      { term: 'IPAM', def: "IP Address Management : registre des attributions d'adresses — backend pve intégré, ou connecteurs phpIPAM / NetBox pour l'intégrer à une DDI existante." },
      { term: 'dnsmasq', def: "Serveur DHCP/DNS léger utilisé par le SDN : une instance par VNet (dnsmasq@<vnet>) délivre les bails déclarés dans dhcp-range." },
      { term: 'gateway virtuelle', def: "Adresse .1 du subnet, tenue par chaque nœud où existe le VNet : base du routage inter-VNets et du SNAT." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "dnsmasq doit être installé sur tous les nœuds susceptibles d'exécuter la VM : sans lui, une migration interrompt le DHCP du VNet et la VM perd son bail au renouvellement." },
      { type: 'info', icon: 'fa-circle-info', text: "Sans subnet déclaré, un VNet fonctionne encore en L2 pur : l'IPAM et le DHCP sont simplement inopérants et les IP restent à gérer à la main." }
    ],
    table: {
      headers: ['Objet', 'Rôle', 'Exemple labo CFP-CMD'],
      rows: [
        ["Zone", "Transport sous-jacent", "prodzone — VLAN sur vmbr0"],
        ["VNet", "Segment L2 isolé, branchement des VMs", "prod — tag 100 · test — tag 200"],
        ["Subnet", "Plage IP + gateway virtuelle", "10.100.0.0/24 — GW 10.100.0.1"],
        ["IPAM", "Registre central des IP attribuées", "backend pve (local au cluster)"],
        ["DHCP", "Bails dynamiques par VNet", "dnsmasq — range 10.100.0.100-200"]
      ]
    }
  },

  {
    id: 'routage-sdn',
    track: 'reseau',
    level: 'avance',
    title: 'Routage SDN : FRRouting, controllers',
    icon: 'fa-solid fa-arrows-split-up-and-left',
    step: '13',
    requires: ['vnets-subnets'],
    description: 'Dès qu\'un subnet porte une gateway, chaque nœud hébergeant le VNet devient routeur : les VMs d\'un même VNet peuvent joindre les autres subnets déclarés et, avec l\'option SNAT du subnet, sortir vers l\'extérieur en étant traduites derrière l\'IP de management du nœud. Ce routage local suffit pour un cluster homogène ; pour un routage dynamique à l\'échelle du datacenter, Proxmox s\'appuie sur FRRouting (FRR) — daemons zebra et bgpd pilotés automatiquement. Les controllers déclarent la méthode d\'échange des routes : le type evpn installe une fabrique BGP-EVPN (ASN unique, peers = IPs des VTEP) qui propage les MAC/IP et gère les overlays, tandis que le type fx délègue une fabric routing plus simple. La configuration passe par Datacenter → SDN → Controllers, puis se vérifie en CLI dans les tables VRF.',
    cliCommands: [
      `# Déclarer un controller EVPN puis l'associer à une zone VXLAN
pvesh create /cluster/sdn/controllers --type evpn --controller evpnctl \\
    --asn 65000 --peers 192.168.10.11,192.168.10.12,192.168.10.13
pvesh set /cluster/sdn

# Vérifier FRR et les routes EVPN apprises
apt install frr
vtysh -c "show bgp evpn"
vtysh -c "show ip route vrf all"`,
      `# Routage local : tables VRF créées par le SDN (une par zone routable)
ip route show vrf all
ip -br addr show | grep -E "^(vnet|vrf)"

# Option SNAT d'un subnet : la gateway du nœud traduit la sortie
# (à cocher dans Datacenter → SDN → VNets → <vnet> → Subnets → SNAT)`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → SDN → Controllers → Add</span> → Type evpn, ID evpnctl, ASN 65000, Peers = IPs underlay des nœuds",
      "<span class='wb-path'>Datacenter → SDN → Zones → Add → VXLAN</span> → rattacher le controller evpnctl à la zone",
      "<span class='wb-path'>Datacenter → SDN → VNets → prod → Subnets → Edit</span> → cocher SNAT pour la sortie externe",
      "<span class='wb-path'>Node → System → Network</span> → après Apply : interfaces vrf et vnet générées, bridges FRR actifs",
      "<span class='wb-path'>Datacenter → SDN → Status</span> → vérifier que les zones routées remontent bien sur les trois nœuds"
    ],
    diagram: 'net-routing',
    terminology: ['FRRouting', 'Controller', 'Subnet SDN', 'VNet', 'Zone SDN', 'IPAM', 'pvesh'],
    concepts: [
      { term: 'Gateway de subnet', def: "Adresse virtuelle (.1) portée par chaque nœud du VNet : point d'entrée du routage inter-subnets et support du SNAT." },
      { term: 'FRRouting', def: "Suite de routage open source (zebra, bgpd) installée et générée par le SDN dès qu'une zone a besoin d'un protocole dynamique." },
      { term: 'Controller', def: "Objet SDN déclarant le plan de contrôle des zones avancées : type evpn (BGP-EVPN avec ASN et peers) ou type fx (fabric routing)." },
      { term: 'SNAT', def: "Option de subnet : les VMs sortent vers l'extérieur traduites derrière l'IP du nœud — masquerade assurée par la gateway SDN." },
      { term: 'VRF', def: "Table de routage virtuelle isolée par zone : le SDN crée un VRF par zone routable pour cloisonner les routes (ip route show vrf all)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Cocher SNAT sans gateway définie sur le subnet n'a aucun effet : le subnet doit d'abord porter une gateway (10.100.0.1), sinon aucune traduction n'est générée." },
      { type: 'info', icon: 'fa-circle-info', text: "Le controller evpn exige un ASN unique et cohérent sur tout le cluster, et l'underlay entre peers doit être routé (les IPs 192.168.10.11-13 du labo se joignent directement sur vmbr0)." }
    ],
    table: {
      headers: ['Composant', 'Rôle', 'Où le configurer / vérifier'],
      rows: [
        ["Gateway subnet", "Routeur L3 du VNet (.1) sur chaque nœud", "Datacenter → SDN → VNets → Subnets"],
        ["SNAT", "Sortie externe masquerade derrière le nœud", "Option du subnet (checkbox SNAT)"],
        ["FRR (zebra + bgpd)", "Plan de routage dynamique et EVPN", "frr.service — vtysh, généré par le SDN"],
        ["Controller evpn", "Échange des routes BGP-EVPN entre VTEP", "Datacenter → SDN → Controllers"],
        ["Controller fx", "Fabric routing simplifié (IP routes)", "Datacenter → SDN → Controllers"]
      ]
    }
  },

  {
    id: 'sdn-avance',
    track: 'reseau',
    level: 'avance',
    title: 'SDN avancé : VXLAN, multi-tenant, permissions',
    icon: 'fa-solid fa-layer-group',
    step: '14',
    requires: ['routage-sdn'],
    description: 'La zone VXLAN constitue le sommet du SDN Proxmox : chaque nœud du cluster devient un VXLAN VTEP qui encapsule les trames du segment dans des paquets UDP 4789, transportés sur un underlay L3 routé — les VMs d\'un même VNet (un VNI par VNet) se voient en niveau 2 même réparties sur plusieurs sites. L\'en-tête VXLAN coûte 50 octets : il faut soit réduire le MTU des VNets à 1450, soit activer les jumbo frames sur l\'underlay, faute de quoi les paquets sont tronqués ou perdus silencieusement. Combinée aux zones et VNets, cette architecture soutient le multi-tenant : un tenant = une zone (ou un groupe de VNets), avec son subnet, son DHCP et ses règles de pare-feu propres. Les permissions SDN complètent l\'isolation : les rôles PVESDNAdmin et PVESDNUser, appliqués sur les chemins /sdn/zones/…, /sdn/vnets/…, délèguent l\'administration d\'un tenant sans donner l\'accès global au Datacenter.',
    cliCommands: [
      `# Chaîne VXLAN complète : controller + zone + vnet + subnet
pvesh create /cluster/sdn/controllers --type evpn --controller evpnctl \\
    --asn 65000 --peers 192.168.10.11,192.168.10.12,192.168.10.13
pvesh create /cluster/sdn/zones --type vxlan --zone vxzone \\
    --controller evpnctl --bridge vmbr0 --mtu 1450
pvesh create /cluster/sdn/vnets --zone vxzone --vnet vxprod --tag 100
pvesh set /cluster/sdn`,
      `# Vérifier l'overlay : interfaces VXLAN, peers appris et MTU
ip -d link show type vxlan
bridge fdb show dev vxlanprod | grep -i dst
ip link show vmbr0 | grep mtu`,
      `# Multi-tenant : déléguer une zone à un opérateur sans accès global
pveum user add tech1@pve --comment "Opérateur tenant prod"
pveum acl modify /sdn/zones/prodzone --users tech1@pve --roles PVESDNAdmin`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → SDN → Controllers → Add</span> → Type evpn : ASN 65000, Peers 192.168.10.11-13 (underlay mgmt)",
      "<span class='wb-path'>Datacenter → SDN → Zones → Add → VXLAN</span> → Zone vxzone, Controller evpnctl, Bridge vmbr0, MTU 1450",
      "<span class='wb-path'>Datacenter → SDN → VNets → Create</span> → un VNet (VNI) par tenant, puis subnet + range DHCP dédiés",
      "<span class='wb-path'>Datacenter → Firewall</span> → règles d'isolation entre tenants au niveau du cluster et par VNet",
      "<span class='wb-path'>Datacenter → Permissions → Add → User Permission</span> → Path /sdn/zones/vxzone, Rôle PVESDNAdmin",
      "<span class='wb-path'>Node → System → Network</span> → après Apply : vérifier les interfaces vxlanX et le MTU généré"
    ],
    diagram: 'net-vxlan',
    terminology: ['VXLAN', 'VXLAN VTEP', 'Zone SDN', 'Controller', 'MTU', 'RBAC', 'VNet', 'VLAN-aware'],
    concepts: [
      { term: 'VXLAN VTEP', def: "VXLAN Tunnel End Point : entité d'un nœud qui encapsule/désencapsule les trames vers UDP 4789 — chaque nœud d'une zone VXLAN est un VTEP." },
      { term: 'VNI', def: "VXLAN Network Identifier : numéro de 24 bits (≈ 16,7 M de segments) identifiant l'overlay — un VNI par VNet." },
      { term: 'Underlay', def: "Réseau IP routé sur lequel voyagent les paquets VXLAN : doit absorber les 50 octets d'en-tête (MTU 1550 ou jumbo frames)." },
      { term: 'Multi-tenant', def: "Modèle où chaque client/équipe reçoit sa zone ou ses VNets : isolation L2 par tags/VNI, routage contrôlé, DHCP et pare-feu dédiés." },
      { term: 'PVESDNAdmin', def: "Rôle intégré de gestion du SDN, appliquable sur les chemins /sdn/zones/… et /sdn/vnets/… pour déléguer un tenant (complété par PVESDNUser)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "MTU : l'encapsulation VXLAN ajoute 50 octets — réduisez le MTU des VNets à 1450 ou activez le jumbo frame sur tout l'underlay, sinon TCP se dégrade et certains flux disparaissent sans log." },
      { type: 'success', icon: 'fa-circle-check', text: "Les permissions par chemin (/sdn/zones/…, /sdn/vnets/…) + le firewall par VNet offrent une isolation multi-tenant complète : idéal pour le lab final lab3-sdn-multi-tenant du parcours Labs." }
    ],
    table: {
      headers: ['Élément', 'Valeur / objet', 'Note d\'implémentation'],
      rows: [
        ["MTU overlay", "1450", "1500 − 50 octets d'en-tête VXLAN"],
        ["Transport VXLAN", "UDP 4789", "À autoriser entre VTEPs (pare-feu underlay)"],
        ["ASN BGP EVPN", "65000", "ASN privé identique sur tout le cluster"],
        ["Délégation tenant", "PVESDNAdmin", "Path /sdn/zones/<zone> → opérateur dédié"],
        ["Isolation tenant", "1 zone ou 1 VNet par client", "Subnet + DHCP + règles firewall propres"]
      ]
    }
  }
]);
