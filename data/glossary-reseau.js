/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-reseau.js — Glossaire du parcours RÉSEAU
   (les termes déjà définis dans glossary-fondamentaux.js ne sont pas repris)
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'Linux Bridge': "Switch logiciel de niveau 2 du noyau Linux : relie les interfaces tap des VMs, les veth des LXC et les NICs physiques dans un même domaine de diffusion.",
  'vmbr0': "Bridge par défaut créé à l'installation de Proxmox VE ; il porte l'IP de management du nœud (192.168.10.0/24 dans le labo CFP-CMD).",
  'Bond': "Agrégation de plusieurs NICs en une interface logique pour la redondance et/ou l'augmentation de débit (modes balance-rr, active-backup, LACP…).",
  'LACP': "Link Aggregation Control Protocol (IEEE 802.3ad, mode 4) : négociation dynamique d'un port-channel avec le switch pour agréger les liens.",
  'active-backup': "Mode de bond 1 : une seule NIC active à la fois, l'autre prend le relais en cas de défaillance — aucune configuration switch requise.",
  'balance-rr': "Mode de bond 0 (round-robin) : transmission séquentielle des paquets sur chaque esclave — débit cumulé mais paquets potentiellement désordonnés.",
  'VLAN': "Virtual LAN (IEEE 802.1Q) : segmentation logique du réseau de niveau 2 par tags, isolant les domaines de diffusion sur la même infrastructure physique.",
  'VLAN-aware': "Mode du Linux Bridge traitant directement les tags 802.1Q : un seul bridge suffit pour porter plusieurs VLANs, choisis par interface VM.",
  'Trunk': "Port réseau transportant plusieurs VLANs simultanément (tags 802.1Q), avec éventuellement un VLAN natif circulant sans tag.",
  'Tag VLAN': "Identifiant de 12 bits (1-4094) inséré dans l'en-tête 802.1Q pour marquer l'appartenance d'une trame à un VLAN.",
  'Zone SDN': "Objet SDN Proxmox définissant le transport des VNets : simple, VLAN, QinQ ou VXLAN — déclarée via Datacenter → SDN → Zones.",
  'Zone simple': "Zone SDN sans isolation de transport : chaque VNet devient un bridge local ; compatible avec l'ajout ultérieur d'un overlay EVPN.",
  'Zone QinQ': "Zone SDN à double étiquetage 802.1ad : une S-VLAN de service encapsule les C-VLAN clients — isolation multi-tenant à très grande échelle.",
  'Subnet SDN': "Plage CIDR attachée à un VNet : définit la gateway virtuelle, les ranges DHCP et l'enregistrement des IP dans l'IPAM.",
  'IPAM': "IP Address Management : registre des attributions d'adresses (backend pve local, ou phpIPAM / NetBox externes) piloté par le SDN.",
  'dnsmasq': "Serveur DHCP/DNS léger utilisé par le SDN pour délivrer les bails dynamiques dans les VNets (une instance dnsmasq@<vnet> par VNet).",
  'Controller': "Objet SDN déclarant le plan de contrôle des zones avancées : type evpn (BGP-EVPN via FRR, avec ASN et peers) ou type fx (fabric routing).",
  'MTU': "Maximum Transmission Unit : taille maximale des trames — l'en-tête VXLAN coûte 50 octets, à compenser (MTU 1450 ou jumbo frames sur l'underlay).",
  'bridge-ports': "Directive d'/etc/network/interfaces listant les interfaces membres d'un bridge (ex. bridge-ports enp1s0 ou bridge-ports bond0).",
  'bridge-fd': "Directive fixant le forward delay du spanning tree du bridge (bridge-fd 0 : passage immédiat en forwarding — valeur standard sur Proxmox).",
  'ifreload': "Commande ifupdown2 (ifreload -a) appliquant à chaud les modifications de /etc/network/interfaces, sans coupure des liens inchangés.",
  'VXLAN VTEP': "VXLAN Tunnel End Point : nœud qui encapsule/désencapsule les trames VXLAN (UDP 4789) — chaque nœud d'une zone VXLAN est un VTEP."
});
