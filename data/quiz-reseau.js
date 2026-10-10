/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-reseau.js — Banques de quiz du parcours RÉSEAU (sections 08 → 14)
   Format : [question, [options], indexBonneRéponse, explication]
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'linux-bridges': [
    ["Quel composant Proxmox joue le rôle de switch logiciel de niveau 2 ?",
     ["Le Linux Bridge (vmbrX)", "Corosync", "pveproxy", "Le storage ZFS"], 0,
     "Le Linux Bridge commmute les trames entre tap (VMs), veth (LXC) et NICs physiques, comme un switch matériel."],
    ["Quelle directive liste les interfaces membres d'un bridge ?",
     ["bridge-ports", "bridge-vids", "bond-slaves", "vlan-raw-device"], 0,
     "bridge-ports désigne les membres du bridge (enp1s0, bond0…) ; bridge-vids limite les VLANs acceptés."],
    ["Que fait la commande ifreload -a ?",
     ["Elle applique à chaud les changements de /etc/network/interfaces", "Elle redémarre le nœud", "Elle recharge pveproxy", "Elle crée un snapshot de la config"], 0,
     "ifreload -a (ifupdown2) applique les différences détectées sans coupure des liens inchangés."],
    ["Sur le labo CFP-CMD, quel réseau porte vmbr0 ?",
     ["192.168.10.0/24 — management", "10.100.0.0/24 — VLAN 100 prod", "10.20.20.0/24 — Ceph public", "10.10.10.0/24 — Corosync"], 0,
     "vmbr0 est le bridge de management (192.168.10.11/24 côté pve1) ; les VLANs prod/test passent par le même port en taggé."],
    ["Quand les modifications réseau faites dans la GUI deviennent-elles actives ?",
     ["Après le bouton Apply Configuration", "Immédiatement à la validation de la boîte de dialogue", "Après un reboot obligatoire", "À la prochaine sauvegarde"], 0,
     "La GUI marque les changements « Pending » : seul Apply Configuration (ou ifreload -a) les active."]
  ],

  'bonds': [
    ["Quel mode de bond exige un port-channel configuré sur le switch ?",
     ["LACP 802.3ad (mode 4)", "active-backup (mode 1)", "balance-rr (mode 0)", "balance-tlb (mode 5)"], 0,
     "LACP négocie dynamiquement l'agrégation : la configuration doit être symétrique (bond + port-channel côté switch)."],
    ["Quel bond choisir quand le switch n'est pas administrable ?",
     ["active-backup (mode 1)", "802.3ad (mode 4)", "broadcast (mode 3)", "balance-alb (mode 6)"], 0,
     "active-backup fonctionne sur n'importe quel switch : une NIC transmet, l'autre prend le relais en cas de panne."],
    ["Que fournit le mode balance-rr (mode 0) ?",
     ["Un débit cumulé avec paquets potentiellement désordonnés", "Un seul lien actif à la fois", "Une négociation dynamique avec le switch", "Un hash par flux TCP"], 0,
     "Le round-robin envoie séquentiellement sur chaque esclave : débit cumulé mais trames possiblement hors ordre."],
    ["Comment exposer le trafic des VMs à travers un bond ?",
     ["En le branchant dans un bridge : bridge-ports bond0", "En montant le bond directement dans la VM", "En l'ajoutant à corosync", "En le déclarant dans /etc/hosts"], 0,
     "Le bond est un lien agrégé : il devient membre d'un bridge (vmbr0) qui héberge les tap/veth des machines."],
    ["À quoi sert bond-miimon 100 ?",
     ["À surveiller les liens toutes les 100 ms et basculer en cas de perte", "À limiter le débit à 100 Mbps", "À fixer le MTU à 100", "À régler la fréquence CPU"], 0,
     "miimon interroge le driver NIC toutes les 100 ms : c'est lui qui déclenche le failover sur perte de carrier."]
  ],

  'vlans': [
    ["Que fait le mode VLAN-aware d'un Linux Bridge ?",
     ["Il traite les tags 802.1Q : un seul bridge porte plusieurs VLANs", "Il crée automatiquement un bridge par VLAN", "Il supprime tous les tags des trames", "Il chiffre les trames taguées"], 0,
     "Avec bridge-vlan-aware yes, le tag est choisi par VM (netX: tag=) et traité par le bridge lui-même."],
    ["Qu'est-ce qu'un port trunk ?",
     ["Un port transportant plusieurs VLANs tagués simultanément", "Un VLAN par défaut du switch", "L'interface de management du nœud", "Un tunnel chiffré entre sites"], 0,
     "Le trunk transporte VLAN 100, 200… tagués, avec éventuellement un VLAN natif circulant sans tag."],
    ["Sur le labo CFP-CMD, quel VLAN héberge les VMs de production ?",
     ["VLAN 100 — 10.100.0.0/24", "VLAN 200 — 10.200.0.0/24", "VLAN 10 — 192.168.10.0/24", "VLAN 4094 — plan de secours"], 0,
     "CDC : prod = VLAN 100 (10.100.0.0/24), test = VLAN 200 (10.200.0.0/24), mgmt = VLAN natif 10 (192.168.10.0/24)."],
    ["Une VM est bien configurée côté Proxmox mais injoignable hors de son nœud : cause la plus probable ?",
     ["Le port du switch n'autorise pas le VLAN sur le trunk", "Le snapshot est corrompu", "La VM manque de vCPU", "Le storage est plein"], 0,
     "Le VLAN doit être autorisé de bout en bout : liste allowed du trunk côté switch, bridge-vids côté Proxmox."]
  ],

  'sdn-zones': [
    ["Où crée-t-on et applique-t-on les zones SDN ?",
     ["Datacenter → SDN → Zones, puis bouton Apply", "Node → System → Network → Restart", "Datacenter → Storage → Add → SDN", "VM → Options → Network"], 0,
     "Les zones/VNets se déclarent au niveau Datacenter → SDN ; rien n'est actif tant que Apply n'est pas cliqué."],
    ["Quelle zone utiliser pour porter des VNets tagués sur un switch administrable ?",
     ["Zone VLAN", "Zone simple", "Zone QinQ", "Zone VXLAN"], 0,
     "La zone VLAN adosse les VNets à un vmbrX existant : un tag 802.1Q par VNet, cohérent avec le trunk du switch."],
    ["Quel type de zone apporte l'isolation multi-tenant par double tag 802.1ad ?",
     ["QinQ", "VLAN", "Simple", "VXLAN"], 0,
     "QinQ encapsule les C-VLAN clients dans une S-VLAN de service : ≈ 16,7 M de tenants possibles."],
    ["Quelle zone étend un segment L2 au-dessus d'un réseau L3 routé ?",
     ["VXLAN", "VLAN", "QinQ", "Simple"], 0,
     "VXLAN encapsule le L2 dans de l'UDP 4789 : les VMs partagent le même segment même entre sites routés."],
    ["Que génère concrètement le SDN côté nœud après Apply ?",
     ["Des bridges et interfaces dédiés (fichiers /etc/network/interfaces.d/sdn)", "Un nouveau kernel", "Des règles iptables uniquement", "Des machines virtuelles"], 0,
     "Le SDN écrit sa config dans /etc/pve/sdn/*.cfg puis génère les interfaces locales (vnets, VRF, VXLAN…)."]
  ],

  'vnets-subnets': [
    ["À quoi sert un subnet SDN ?",
     ["À définir la plage CIDR et la gateway d'un VNet", "À chiffrer le trafic du VNet", "À créer un bond sur le nœud", "À remplacer le pare-feu"], 0,
     "Le subnet attache CIDR + gateway au VNet : c'est la base de l'IPAM, du DHCP et du routage."],
    ["Quel composant fournit le DHCP dans les VNets ?",
     ["dnsmasq, piloté par le SDN (une instance par VNet)", "kea-core global", "dhcpd du cluster", "Corosync"], 0,
     "Le SDN lance dnsmasq@<vnet> sur les nœuds où le VNet existe, à partir des dhcp-range du subnet."],
    ["Quel backend IPAM est disponible par défaut ?",
     ["pve (local au cluster)", "phpIPAM uniquement", "NetBox uniquement", "Aucun backend par défaut"], 0,
     "Le backend pve stocke les attributions dans la config du cluster ; phpIPAM et NetBox sont des connecteurs optionnels."],
    ["Sans subnet déclaré sur un VNet, que perd-on ?",
     ["L'IPAM et le DHCP : les IP restent manuelles", "Le tag VLAN du VNet", "La zone de rattachement", "Le bridge sous-jacent"], 0,
     "Le VNet continue de commuter en L2, mais sans subnet pas de gateway, pas d'IPAM ni de range DHCP."],
    ["Où l'IP d'une VM branchée sur un VNet est-elle réservée ?",
     ["Dans l'IPAM, au premier boot de la VM", "Dans /etc/hosts du nœud", "Dans le certificat du nœud", "Dans la base corosync"], 0,
     "L'interface vnetX de la VM alimente l'IPAM (backend pve) : l'attribution suit la VM lors des migrations."]
  ],

  'routage-sdn': [
    ["Quel logiciel assure le routage avancé du SDN Proxmox ?",
     ["FRRouting (FRR)", "Quagga", "Bird", "iproute2 seul"], 0,
     "Proxmox génère la configuration FRR (zebra + bgpd) dès qu'une zone a besoin de routage dynamique ou d'EVPN."],
    ["Où déclare-t-on un controller EVPN ?",
     ["Datacenter → SDN → Controllers", "Node → System → Network", "Datacenter → Permissions", "Datacenter → Storage"], 0,
     "Les controllers (evpn ou fx) se déclarent au niveau du Datacenter, puis sont rattachés aux zones."],
    ["Que permet l'option SNAT d'un subnet ?",
     ["De sortir vers l'extérieur en traduisant derrière l'IP du nœud", "De chiffrer les routes EVPN", "De créer un VLAN de secours", "De dupliquer le VNet sur un autre cluster"], 0,
     "SNAT = masquerade assurée par la gateway SDN du nœud : les VMs accèdent à l'extérieur via 192.168.10.x."],
    ["Quels daemons FRR sont mobilisés pour l'EVPN ?",
     ["zebra et bgpd", "ospfd et ripd", "pimd et ldpd", "staticd seul"], 0,
     "zebra gère les tables (VRF) et bgpd échange les routes EVPN (type-2 MAC/IP, type-5 préfixes)."],
    ["Quelle adresse sert de gateway aux VMs d'un subnet 10.100.0.0/24 ?",
     ["10.100.0.1, portée virtuellement par chaque nœud du VNet", "192.168.10.254 exclusivement", "L'IP de Corosync", "10.20.20.1"], 0,
     "La gateway déclarée dans le subnet (.1) est tenue par les nœuds hébergeant le VNet : c'est le routeur SDN."]
  ],

  'sdn-avance': [
    ["Quelle surcharge MTU ajoute l'encapsulation VXLAN ?",
     ["50 octets", "4 octets", "8 octets", "1500 octets"], 0,
     "En-tête VXLAN + UDP + IP externe ≈ 50 octets : MTU overlay 1450 ou jumbo frames sur l'underlay."],
    ["Sur quel port UDP le VXLAN transporte-t-il ses trames ?",
     ["4789", "5405", "8006", "3260"], 0,
     "Le port standard VXLAN est UDP 4789 : à autoriser entre tous les VTEP (5405 = Corosync, 8006 = GUI, 3260 = iSCSI)."],
    ["Qu'est-ce qu'un VTEP ?",
     ["Le point d'encapsulation/désencapsulation VXLAN d'un nœud", "Un type de storage Ceph", "Un daemon de sauvegarde", "Un certificat TLS du cluster"], 0,
     "Chaque nœud d'une zone VXLAN est un VTEP : il encapsule les trames du VNet vers UDP 4789 et les décapsule à l'arrivée."],
    ["Quel rôle délègue l'administration d'une zone SDN à un opérateur ?",
     ["PVESDNAdmin sur le path /sdn/zones/<zone>", "PVEVMUser sur le Datacenter", "Administrator sur /storage", "pveaudit"], 0,
     "PVESDNAdmin + PVESDNUser appliqués sur /sdn/zones/… ou /sdn/vnets/… isolent un tenant sans accès global."],
    ["Dans une architecture multi-tenant SDN, que reçoit typiquement chaque tenant ?",
     ["Sa zone (ou ses VNets) + subnet + DHCP + règles firewall dédiés", "Un nœud physique exclusif obligatoire", "Un cluster corosync séparé", "Une licence spécifique"], 0,
     "L'isolation combine L2 (tags/VNI), L3 (subnets), services (IPAM/DHCP), pare-feu et permissions par chemin."]
  ]
});
