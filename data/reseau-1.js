/* ═══════════════════════════════════════════════════════════════════════════
   data/reseau-1.js — Parcours RÉSEAU (sections 08 → 11)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'linux-bridges',
    track: 'reseau',
    level: 'intermediaire',
    title: 'Linux Bridges : vmbr0, configuration, VLAN-aware',
    icon: 'fa-solid fa-network-wired',
    step: '08',
    requires: ['interface-web'],
    description: 'Le Linux Bridge est un switch logiciel de niveau 2 intégré au noyau Linux : il commmute les trames entre les interfaces tap des VMs, les veth des conteneurs LXC et les NICs physiques, exactement comme un switch matériel. Proxmox VE crée vmbr0 dès l\'installation : ce bridge porte l\'adresse IP de management du nœud (192.168.10.11/24 dans le labo CFP-CMD) et sert de point d\'ancrage par défaut à toutes les interfaces réseau des machines virtuelles. La configuration vit dans /etc/network/interfaces, gérée par ifupdown2, et ne s\'applique qu\'à chaud via ifreload -a ou le bouton Apply de l\'interface web. Deux modes existent : le bridge standard, qui exige une sous-interface par VLAN, et le mode VLAN-aware, où un seul bridge traite directement les tags 802.1Q. Maîtriser ce socle est indispensable avant d\'aborder bonds, VLANs et SDN.',
    cliCommands: [
      `# /etc/network/interfaces — bridge standard avec IP de management
auto vmbr0
iface vmbr0 inet static
    address 192.168.10.11/24
    gateway 192.168.10.254
    bridge-ports enp1s0
    bridge-stp off
    bridge-fd 0

# Appliquer à chaud (sans coupure des liens inchangés)
ifreload -a

# Inspecter le bridge et ses ports membres
bridge link show
ip -br link show master vmbr0`,
      `# Variante VLAN-aware : un seul bridge pour tous les VLANs
auto vmbr0
iface vmbr0 inet static
    address 192.168.10.11/24
    gateway 192.168.10.254
    bridge-ports enp1s0
    bridge-vlan-aware yes
    bridge-vids 2-4094
    bridge-stp off
    bridge-fd 0
# Les VMs portent alors leur tag dans net0: vmbr0,tag=100`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → System → Network</span> → vue des interfaces : vmbr0, enp1s0, bonds et indicateurs Active/Pending",
      "<span class='wb-path'>Node → System → Network → Create → Linux Bridge</span> → nom vmbr1, IPv4/CIDR, gateway, bridge-ports",
      "<span class='wb-path'>Node → System → Network → Edit vmbr0</span> → cocher VLAN aware et renseigner bridge-vids 2-4094",
      "<span class='wb-path'>Node → System → Network</span> → bouton Apply Configuration pour activer les changements en attente",
      "<span class='wb-path'>VM → Hardware → Network Device</span> → choisir le bridge, le tag VLAN et le modèle VirtIO"
    ],
    diagram: 'net-bridges',
    terminology: ['Linux Bridge', 'vmbr0', 'bridge-ports', 'bridge-fd', 'VLAN-aware', 'MTU', 'ifreload', 'Proxmox VE'],
    concepts: [
      { term: 'Linux Bridge', def: "Switch logiciel de niveau 2 du noyau Linux (module bridge) : relie tap des VMs, veth des LXC et NICs physiques dans un même domaine de diffusion." },
      { term: 'vmbr0', def: "Bridge créé automatiquement à l'installation de Proxmox VE ; il porte l'IP de management du nœud et le trafic par défaut des VMs." },
      { term: 'bridge-ports', def: "Directive d'/etc/network/interfaces listant les interfaces membres du bridge (enp1s0, bond0…)." },
      { term: 'VLAN-aware', def: "Mode du bridge traitant les tags 802.1Q nativement : le tag est choisi par VM (netX: tag=) au lieu de créer un bridge par VLAN." },
      { term: 'tap / veth', def: "Interface virtuelle côté hôte : tap pour une VM KVM, veth pour un conteneur LXC — branchées sur le bridge comme des ports de switch." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Éditer /etc/network/interfaces à la main n'applique rien tant que ifreload -a n'est pas exécuté ; via la GUI, les changements restent « Pending » jusqu'au clic sur Apply Configuration." },
      { type: 'danger', icon: 'fa-bolt', text: "Une erreur de syntaxe réseau, une gateway erronée ou un bridge-ports mal orthographié peut couper l'accès management : gardez une session SSH ouverte et un accès console/IPMI de secours." }
    ],
    table: {
      headers: ['Paramètre', 'Rôle', 'Valeur labo CFP-CMD'],
      rows: [
        ["Bridge management", "Accès GUI, SSH et API du nœud", "vmbr0 — 192.168.10.11/24, GW .254"],
        ["bridge-ports", "NICs physiques membres du bridge", "enp1s0 (vmbr0)"],
        ["bridge-vlan-aware", "Traitement natif des tags 802.1Q", "yes + bridge-vids 2-4094"],
        ["bridge-stp / bridge-fd", "Spanning tree et forward delay", "off / 0 (labo sans boucle L2)"],
        ["Interface VM", "NIC VirtIO attachée au bridge", "net0: vmbr0, tag 100 (prod)"]
      ]
    }
  },

  {
    id: 'bonds',
    track: 'reseau',
    level: 'intermediaire',
    title: 'Bonds : LACP, active-backup, balance-rr',
    icon: 'fa-solid fa-link',
    step: '09',
    requires: ['linux-bridges'],
    description: 'Un Bond agrège plusieurs NICs physiques en une interface logique : on gagne de la redondance (survie à la panne d\'un câble ou d\'un port switch) et parfois du débit cumulé. Le noyau Linux propose sept modes ; Proxmox VE expose les principaux dans la GUI : balance-rr (mode 0, round-robin), active-backup (mode 1), balance-xor (mode 2), broadcast (mode 3), 802.3ad (mode 4, LACP), balance-tlb et balance-alb (modes 5 et 6). Le choix dépend du matériel : LACP 802.3ad exige un port-channel configuré côté switch, tandis qu\'active-backup fonctionne partout et constitue la valeur sûre du management. Un bond seul ne connecte pas les VMs : il devient un membre du bridge via bridge-ports bond0. Dans le labo CFP-CMD, un bond0 actif-backup alimente vmbr0 pour fiabiliser le management des trois nœuds.',
    cliCommands: [
      `# Bond LACP 802.3ad sur deux NICs, porté par le bridge vmbr0
auto bond0
iface bond0 inet manual
    bond-slaves enp1s0 enp2s0
    bond-miimon 100
    bond-mode 802.3ad
    bond-xmit-hash-policy layer3+4

auto vmbr0
iface vmbr0 inet static
    address 192.168.10.11/24
    gateway 192.168.10.254
    bridge-ports bond0`,
      `# Variante active-backup : aucune configuration switch requise
iface bond0 inet manual
    bond-slaves enp1s0 enp2s0
    bond-mode active-backup
    bond-primary enp1s0
    bond-miimon 100

# Vérifier l'état du bond, des esclaves et du lien actif
cat /proc/net/bonding/bond0
ip -br link show
ifreload -a`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → System → Network → Create → Linux Bond</span> → Slaves enp1s0, enp2s0 et Mode 802.3ad",
      "<span class='wb-path'>Node → System → Network → Edit bond0</span> → bond-miimon 100, xmit hash policy layer3+4",
      "<span class='wb-path'>Node → System → Network → Edit vmbr0</span> → bridge-ports bond0 à la place de la NIC seule",
      "<span class='wb-path'>Node → System → Network</span> → Apply Configuration puis contrôle sur le switch (port-channel Up)",
      "<span class='wb-path'>Node → System → Network → Create → Linux Bridge</span> → si besoin d'un second bridge isolé sur le même bond"
    ],
    diagram: 'net-bonds',
    terminology: ['Bond', 'LACP', 'active-backup', 'balance-rr', 'Linux Bridge', 'MTU', 'ifreload'],
    concepts: [
      { term: 'Bond', def: "Interface logique agrégeant plusieurs NICs pour la tolérance de panne et/ou l'agrégation de débit (drivers bonding du noyau Linux)." },
      { term: 'LACP', def: "Link Aggregation Control Protocol (IEEE 802.3ad, mode 4) : négociation dynamique d'un port-channel avec le switch — la configuration doit être symétrique des deux côtés." },
      { term: 'active-backup', def: "Mode 1 : une seule NIC transmet, l'autre prend le relais automatiquement (miimon détecte la panne) — aucune exigence côté switch." },
      { term: 'bond-miimon', def: "Fréquence de surveillance du lien en millisecondes (100 ms recommandé) : déclenche le basculement dès la perte de carrier." },
      { term: 'bond-xmit-hash-policy', def: "Politique de répartition des flux pour les modes agrégés : layer2, layer2+3 ou layer3+4 (cohérence requise avec le switch)." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "LACP 802.3ad sans port-channel configuré côté switch laisse les esclaves en défaut (churn) : le trafic ne passe pas alors que Proxmox semble bien configuré." },
      { type: 'info', icon: 'fa-circle-info', text: "active-backup est le seul mode universel : privilégiez-le pour vmbr0 (management) si le switch du labo n'est pas administrable ; balance-rr est réservé aux liens point-à-point dédiés (trames désordonnées possibles)." }
    ],
    table: {
      headers: ['Mode', 'Nom', 'Configuration switch', 'Usage recommandé'],
      rows: [
        ["0", "balance-rr", "Aucune (mais liens dédiés)", "Débit cumulé sur liens point-à-point (ex. interconnexion directe)"],
        ["1", "active-backup", "Aucune", "Management, labo CFP-CMD, switch non administrable"],
        ["2", "balance-xor", "Statique (hash côté switch)", "Répartition par flux, sans protocole dynamique"],
        ["4", "LACP 802.3ad", "Port-channel dynamique requis", "Production : agrégation + redondance négociées"],
        ["5/6", "balance-tlb / alb", "Aucune", "Répartition asymétrique, cas spécifiques"]
      ]
    }
  },

  {
    id: 'vlans',
    track: 'reseau',
    level: 'intermediaire',
    title: 'VLANs : taggé, natif, trunk',
    icon: 'fa-solid fa-tags',
    step: '10',
    requires: ['linux-bridges'],
    description: 'Le VLAN (IEEE 802.1Q) segmente un réseau de niveau 2 en domaines de diffusion isolés grâce à un tag de 12 bits (1 à 4094) inséré dans l\'en-tête Ethernet. Proxmox VE propose trois méthodes pour taguer le trafic des VMs : renseigner un tag par interface VM sur un bridge standard (Proxmox crée alors la sous-interface), activer le mode VLAN-aware et porter le tag directement dans netX, ou construire des sous-interfaces système (vmbr0.100) alimentant des bridges dédiés. Un port trunk transporte plusieurs VLANs simultanément, avec éventuellement un VLAN natif circulant sans tag — c\'est le cas du management 192.168.10.0/24 (VLAN 10) du labo. Dans le CDC, les VMs de production vivent dans le VLAN 100 (10.100.0.0/24) et les VMs de test dans le VLAN 200 (10.200.0.0/24) : la cohérence entre la config Proxmox et le switch reste la clé du succès.',
    cliCommands: [
      `# Méthode 1 (recommandée) : bridge VLAN-aware, tag choisi par VM
auto vmbr0
iface vmbr0 inet static
    address 192.168.10.11/24
    gateway 192.168.10.254
    bridge-ports enp1s0
    bridge-vlan-aware yes
    bridge-vids 2-4094
# VM prod  → net0: vmbr0,tag=100 (10.100.0.0/24)
# VM test  → net0: vmbr0,tag=200 (10.200.0.0/24)`,
      `# Méthode 2 : sous-interface VLAN + bridge dédié (setups historiques)
auto vmbr0v100
iface vmbr0v100 inet manual
    vlan-raw-device vmbr0

auto vmbr1
iface vmbr1 inet manual
    bridge-ports vmbr0v100

# Vérifier la table de VLANs apprise par le bridge
bridge vlan show
ifreload -a`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → System → Network → Edit vmbr0</span> → activer VLAN aware, bridge-vids 2-4094, Apply",
      "<span class='wb-path'>Node → System → Network → Create → Linux VLAN</span> → sous-interface vmbr0.100, raw device vmbr0, tag 100",
      "<span class='wb-path'>VM → Hardware → Network Device</span> → Bridge vmbr0 + VLAN Tag 100 (prod) ou 200 (test)",
      "<span class='wb-path'>LXC → Resources → Network → Edit net0</span> → VLAN Tag 200 pour les conteneurs de test",
      "<span class='wb-path'>Switch physique</span> → port du nœud en mode trunk : allowed 10, 100, 200 — natif 10",
      "<span class='wb-path'>Node → System → Network</span> → Apply puis bridge vlan show en CLI pour valider"
    ],
    diagram: 'net-vlans',
    terminology: ['VLAN', 'VLAN-aware', 'Trunk', 'Tag VLAN', 'Linux Bridge', 'vmbr0', 'MTU'],
    concepts: [
      { term: 'VLAN', def: "Segment logique de niveau 2 défini par IEEE 802.1Q : isole les domaines de diffusion sur la même infrastructure physique." },
      { term: 'Tag VLAN', def: "Identifiant de 12 bits (1-4094) inséré dans l'en-tête Ethernet ; VLAN 1 est souvent réservé, 4095 est invalide." },
      { term: 'Trunk', def: "Port transportant plusieurs VLANs tagués ; le VLAN natif circule lui sans tag — une erreur de config native est une source classique d'incident." },
      { term: 'Sous-interface VLAN', def: "Interface virtuelle vmbr0.100 créée par le noyau pour extraire le VLAN 100 d'un port physique ou d'un bridge." },
      { term: 'bridge-vids', def: "Liste des VLANs acceptés par un bridge VLAN-aware (2-4094 par défaut à la main) ; un tag hors liste est rejeté silencieusement." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Sur un bridge VLAN-aware, un tag hors bridge-vids est ignoré sans message d'erreur : la VM paraît bien connectée mais n'obtient jamais de trafic." },
      { type: 'danger', icon: 'fa-bolt', text: "Si le port du switch n'autorise pas le VLAN (pas de trunk ou liste allowed incomplète), le trafic est blackholé alors que la configuration Proxmox est correcte : vérifiez toujours le switch en premier." }
    ],
    table: {
      headers: ['Méthode', 'Où se pose le tag', 'Avantage', 'Limite'],
      rows: [
        ["Tag par VM (bridge standard)", "Sous-interface créée par Proxmox", "Simple, explicite par NIC", "Fichiers de config plus verbeux"],
        ["Bridge VLAN-aware", "Traité par le bridge lui-même", "Un seul bridge, flexible à chaud", "Discipline bridge-vids requise"],
        ["Sous-interface vmbrX.Y", "Interface système dédiée", "Compatible anciens setups, bridges séparés", "Plus d'objets à maintenir"],
        ["VLAN natif (sans tag)", "Aucun tag 802.1Q sur le trunk", "Trafic mgmt hérité", "Risque de confusion access/trunk"]
      ]
    }
  },

  {
    id: 'sdn-zones',
    track: 'reseau',
    level: 'intermediaire',
    title: 'SDN : zones simple, VLAN, QinQ, VXLAN',
    icon: 'fa-solid fa-sitemap',
    step: '11',
    requires: ['vlans'],
    description: 'Le module SDN (Software-Defined Networking) de Proxmox VE 8 déporte la conception réseau au niveau du Datacenter : on y déclare des zones, des VNets et des subnets, puis un clic sur Apply génère automatiquement la configuration des bridges et des interfaces sur chaque nœud. La zone est l\'abstraction de transport et se décline en quatre types : simple (VNets sans tag, bridge local, base pour l\'overlay), VLAN (tags 802.1Q sur un vmbrX existant), QinQ (double étiquetage 802.1ad, une S-VLAN de service encapsulant les C-VLAN clients, pensé pour le multi-tenant d\'opérateur) et VXLAN (overlay L2 sur réseau L3 routé, en passe d\'être piloté par un controller EVPN). Les fichiers générés vivent sous /etc/pve/sdn/ (zones.cfg, vnets.cfg, subnets.cfg) et le résultat s\'inspecte via pvesh. Dans le labo CFP-CMD, une zone VLAN nommée prodzone portera les VNets prod (tag 100) et test (tag 200).',
    cliCommands: [
      `# /etc/pve/sdn/zones.cfg — zone VLAN adossée à vmbr0
vlan: prodzone
    bridge vmbr0

# Déclarer puis inspecter via l'API (équivalent GUI Datacenter → SDN)
pvesh get /cluster/sdn/zones
pvesh get /cluster/sdn/status

# Générer et appliquer la configuration SDN en attente (bouton Apply)
pvesh set /cluster/sdn`,
      `# Ce que le SDN génère côté nœud (zones VLAN : bridges dédiés par VNet)
ip -br link show | grep -E "^(vmbr|vnet|tap)"
cat /etc/network/interfaces.d/sdn`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → SDN → Zones → Add</span> → choisir le type Simple, VLAN, QinQ ou VXLAN",
      "<span class='wb-path'>Datacenter → SDN → Zones → Add → VLAN</span> → ID prodzone, Bridge vmbr0, baselayer vide",
      "<span class='wb-path'>Datacenter → SDN → VNets</span> → créer les VNets rattachés à la zone (voir section suivante)",
      "<span class='wb-path'>Datacenter → SDN</span> → bouton Apply : génération de zones.cfg et des interfaces sur les nœuds",
      "<span class='wb-path'>Datacenter → SDN → Status</span> → contrôle visuel des zones et VNets appliqués par nœud"
    ],
    diagram: 'net-zones',
    terminology: ['SDN', 'Zone SDN', 'Zone simple', 'Zone QinQ', 'VNet', 'VLAN', 'VXLAN', 'Datacenter'],
    concepts: [
      { term: 'Zone SDN', def: "Objet SDN définissant le transport des VNets : simple, VLAN, QinQ ou VXLAN — déclarée au niveau Datacenter et appliquée à tous les nœuds." },
      { term: 'Zone simple', def: "Zone sans isolation de transport : chaque VNet devient un bridge local ; compatible avec l'ajout d'un overlay EVPN ultérieur." },
      { term: 'Zone QinQ', def: "Zone à double étiquetage 802.1ad : une S-VLAN de service encapsule les C-VLAN clients — échelle multi-tenant (16,7 M de services)." },
      { term: 'Zone VXLAN', def: "Zone construisant un overlay L2 au-dessus d'un underlay L3 : chaque nœud devient un VTEP et les VMs partagent le même segment." },
      { term: 'Apply SDN', def: "Action générant la configuration finale (fichiers /etc/pve/sdn/*.cfg puis interfaces locales) — sans elle, les changements restent en attente." }
    ],
    alerts: [
      { type: 'info', icon: 'fa-circle-info', text: "Le SDN ne remplace pas la configuration existante : vmbr0 (management) reste géré dans /etc/network/interfaces ; les zones VLAN s'adossent à ce bridge sans le toucher." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Zones, VNets et subnets ne s'activent qu'après Apply (ou pvesh set /cluster/sdn) : une zone créée mais non appliquée n'existe sur aucun nœud." }
    ],
    table: {
      headers: ['Zone', 'Transport', 'Isolation', 'Usage typique'],
      rows: [
        ["Simple", "Bridge local, sans tag", "VNets isolés localement", "Labo mono-nœud, base EVPN future"],
        ["VLAN", "Trunk 802.1Q sur vmbrX", "Un tag VLAN par VNet", "Switch administrable — labo CFP-CMD (prodzone)"],
        ["QinQ", "S-VLAN 802.1ad encapsulée", "C-VLAN clients × S-VLAN service", "Multi-tenant opérateur, hébergement"],
        ["VXLAN", "Overlay UDP 4789 sur L3", "VNI par VNet, VTEP par nœud", "Clusters étendus, multi-site, sous-réseaux L3"]
      ]
    }
  }
]);
