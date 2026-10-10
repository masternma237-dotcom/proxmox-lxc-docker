/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-labs.js — Banques de quiz du parcours LABS & ÉVALUATION
   Format : [question, [options], indexBonneRéponse, explication]
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'lab0-preparation': [
    ["Quelle IP de management attribue-t-on à pve1 selon le plan d'adressage du CDC ?",
     ["192.168.10.11/24 (VLAN 10)", "10.10.10.11/24 (VLAN 20)", "10.20.20.11/24 (VLAN 30)", "10.100.0.11/24 (VLAN 100)"], 0,
     "pve1 utilise 192.168.10.11/24 sur le VLAN 10 de management ; pve2 et pve3 prennent .12 et .13."],
    ["Quel réseau du labo est dédié au battement Corosync ?",
     ["10.10.10.0/24 (VLAN 20)", "192.168.10.0/24 (VLAN 10)", "10.30.30.0/24 (VLAN 40)", "10.200.0.0/24 (VLAN 200)"], 0,
     "Le VLAN 20 (10.10.10.0/24) est réservé à Corosync pour garantir une latence faible et stable."],
    ["Pourquoi transformer le nœud de référence en template ?",
     ["Pour dériver des clones lab et reconstruire la maquette en quelques minutes", "Pour économiser de la RAM sur pve1", "Pour activer le HA sur ce nœud", "Pour autoriser Docker dans les VMs"], 0,
     "Un template ne démarre pas : il sert uniquement de source à des clones lab dans un état connu et validé."],
    ["Quelle précaution prend-on avant chaque lab risqué ?",
     ["Un snapshot « lab-sain » de chaque nœud pour pouvoir revenir en arrière", "Une mise à jour du firmware des disques", "L'activation de Ballooning sur les VMs", "La suppression des sauvegardes vzdump"], 0,
     "Le snapshot « lab-sain » marque l'état validé de la maquette : le rollback permet de repartir proprement après un scénario de panne."]
  ],

  'lab1-cluster-ha': [
    ["Quelle commande crée le cluster « cfp-cmd » sur pve1 avec le lien dédié ?",
     ["pvecm create cfp-cmd --link0 10.10.10.11", "pvecm add cfp-cmd 10.10.10.11", "qm create cluster cfp-cmd", "ha-manager create cfp-cmd"], 0,
     "pvecm create crée le cluster ; --link0 pointe l'anneau principal sur le VLAN 20 dédié (10.10.10.11 pour pve1)."],
    ["Quel est le rôle du QDevice dans ce lab ?",
     ["Fournir un vote externe qui garantit le quorum quand un nœud manque", "Sauvegarder la configuration du cluster", "Répliquer les disques des VMs", "Servir d'interface web alternative"], 0,
     "corosync-qnetd ajoute un vote externe (192.168.10.40) : avec 2 nœuds + QDevice, la majorité est préservée."],
    ["Que deviennent les ressources HA quand le cluster perd le quorum ?",
     ["Elles sont arrêtées et /etc/pve passe en lecture seule", "Elles continuent normalement", "Elles migrent automatiquement vers pve1", "Elles basculent en lecture seule sur les VMs"], 0,
     "Sans quorum, le cluster se met en sécurité : /etc/pve en lecture seule et ressources HA arrêtées (anti split-brain)."],
    ["Comment teste-t-on concrètement le failover HA ?",
     ["En coupant brutalement le nœud qui héberge la VM et en chronométrant son redémarrage ailleurs", "En mettant la VM en pause depuis la GUI", "En supprimant le groupe HA", "En débranchant uniquement le câble de management"], 0,
     "Le scénario de panne n° 1 : poweroff -f sur pve2, puis watch ha-manager status pour observer la bascule de VM 101."]
  ],

  'lab2-ceph-hci': [
    ["Pourquoi la réplication 3 avec min_size=2 est-elle le réglage conseillé du pool ?",
     ["Les écritures restent garanties tant que 2 répliques sont en ligne", "Elle triple la capacité utile du pool", "Elle supprime le besoin de MON", "Elle limite le pool à un seul nœud"], 0,
     "size=3 réplique chaque objet sur 3 OSD de nœuds différents ; min_size=2 autorise les écritures avec 2 répliques, sans risque d'incohérence."],
    ["Quelle commande donne l'état de santé global du cluster Ceph ?",
     ["ceph -s", "pvecm status", "zpool status", "pvesm status"], 0,
     "ceph -s affiche HEALTH_OK/WARN/ERR, le quorum des MON, les OSD et l'activité des PG."],
    ["Quel outil mesure les IOPS et la latence du pool RBD depuis une VM ?",
     ["fio", "iperf3", "nmap", "htop"], 0,
     "fio (Flexible I/O Tester) génère des charges 4K aléatoires ou séquentielles et mesure IOPS, débit et latence."],
    ["Qu'apporte la migration à chaud d'une VM dont le disque est sur Ceph ?",
     ["Aucune copie de disque : seul l'état mémoire transite entre nœuds", "Une copie complète du disque sur le nœud cible", "Un arrêt obligatoire de quelques secondes", "Une conversion du disque en VMDK"], 0,
     "Le stockage étant partagé (RBD visible de tous les nœuds), qm migrate --online ne déplace que la RAM et l'état d'exécution."]
  ],

  'lab3-sdn-multi-tenant': [
    ["Quel objet SDN regroupe des VNets sous un même mécanisme d'encapsulation ?",
     ["La zone (VLAN ou VXLAN)", "Le subnet", "L'IPAM", "Le bridge vmbr0"], 0,
     "La zone définit l'encapsulation commune : les VNets d'une zone VLAN sont taggés, ceux d'une zone VXLAN étendus entre nœuds."],
    ["Quel protocole étend un segment L2 entre les trois nœuds du labo ?",
     ["VXLAN", "STP", "iSCSI", "ARP"], 0,
     "La zone vxlan-tenants encapsule les trames : un VNet (tag 1000/1001) garde la même connectivité L2 quel que soit le nœud."],
    ["Que faut-il faire après avoir modifié zones, VNets ou subnets ?",
     ["Cliquer Apply pour générer la configuration sur tous les nœuds", "Redémarrer les trois nœuds", "Recréer les VMs", "Reinstall Ceph"], 0,
     "Le SDN est déclaratif : rien n'est appliqué tant que le bouton Apply n'a pas généré /etc/network/interfaces.d/sdn sur chaque nœud."],
    ["Comment l'isolation multi-tenant est-elle garantie dans le lab ?",
     ["Un VNet par tenant, sans routage entre eux sauf flux explicitement autorisés", "Un seul VNet partagé avec des VLANs internes", "Un pare-feu par VM uniquement", "Des IP publiques différentes"], 0,
     "Tenant A et Tenant B vivent dans des VNets distincts (tags 1000/1001) : l'isolation L2 est native, le routage inter-zones reste un choix explicite via FRRouting."]
  ],

  'lab4-docker-portainer': [
    ["Quelle feature LXC est indispensable pour exécuter Docker dans un CT ?",
     ["nesting=1", "fuse=1", "link=1", "cron=1"], 0,
     "nesting=1 autorise l'exécution de conteneurs dans le conteneur ; keyctl=1 peut s'ajouter pour certaines images."],
    ["Quel type de conteneur choisit-on pour héberger Docker dans le lab ?",
     ["Non privilégié (root remappé 100000+)", "Privilégié (root = root hôte)", "Privilégié avec nesting seulement", "Peu importe"], 0,
     "Le CT non privilégié empêche le root de Docker de devenir root sur l'hôte : c'est le choix sécurisé par défaut."],
    ["Sur quel port Portainer CE expose-t-il son interface HTTPS ?",
     ["9443", "9000", "8006", "2375"], 0,
     "Portainer CE sert l'UI en HTTPS sur 9443 (8000 reste le port du tunnel Edge Agent)."],
    ["Quel outil compare le débit réseau d'un CT face à une VM ?",
     ["iperf3", "fio", "pvesh", "suricata"], 0,
     "iperf3 mesure le débit TCP/UDP entre le CT et la VM : le lab montre l'overhead réseau quasi nul de LXC."]
  ],

  'lab5-securite': [
    ["Quelle politique d'entrée recommande-t-on au niveau datacenter après le lab ?",
     ["DROP, avec des règles explicites pour les flux autorisés", "ACCEPT, avec des règles de blocage ciblées", "REJECT sans aucune règle", "Pas de politique (désactivé)"], 0,
     "Le mode whitelisting (policy_in: DROP + règles explicites) réduit la surface d'attaque à ce qui est vraiment nécessaire."],
    ["Combien de niveaux de pare-feu Proxmox VE le lab configure-t-il ?",
     ["Trois : datacenter, nœud et VM/CT", "Un seul : datacenter", "Deux : nœud et VM", "Quatre, avec l'IPS en quatrième niveau"], 0,
     "Le pare-feu Proxmox s'applique aux trois niveaux : règles globales (cluster.fw), par nœud (host.fw) et par VM/CT (vm.fw)."],
    ["Quel composant joue le rôle d'IPS dans le lab ?",
     ["Suricata en mode af-packet sur vmbr0", "fail2ban sur pveproxy", "Le QDevice", "pve-exporter"], 0,
     "Suricata inspecte les flux (af-packet), remonte les alertes dans fast.log et détecte les scans générés par le poste d'attaque."],
    ["Que permet le rôle PVEVMAdmin attribué sur /pool/labo ?",
     ["Gérer les VMs du pool, sans accéder aux nœuds ni aux VMs hors pool", "Administrer tous les nœuds du cluster", "Modifier la configuration du datacenter", "Créer d'autres utilisateurs"], 0,
     "C'est le moindre privilège RBAC : les permissions sont limitées au chemin /pool/labo ; le reste de l'arborescence reste invisible."]
  ],

  'quiz-final': [
    ["Quel est le seuil de réussite du quiz final ?",
     ["70 % (14 bonnes réponses sur 20)", "50 %", "90 %", "100 %"], 0,
     "Comme pour les quiz de section, le moteur applique un seuil de 70 % : 14/20 au quiz final."],
    ["Combien de questions le quiz final tire-t-il, et d'où ?",
     ["20 questions au hasard dans toutes les banques du guide", "20 questions uniquement dans le parcours Labs", "10 questions dans la section courante", "Toutes les questions du guide, dans l'ordre"], 0,
     "L'outil « Quiz final » construit un tirage aléatoire sur toutes les sections : fondamentaux, réseau, sécurité, cluster, stockage, conteneurs, monitoring, sauvegarde, automatisation et labs."],
    ["Où trouve-t-on l'outil « Quiz final » dans l'interface ?",
     ["Dans le menu Outils 🔧 de la barre supérieure", "Dans l'onglet Storage", "Dans le journal de labo", "Sur chaque page de diagramme"], 0,
     "Le menu Outils 🔧 regroupe les outils transversaux, dont le Quiz final (20 questions, seuil 70 %)."],
    ["Que conserve le guide entre deux sessions de travail ?",
     ["Meilleurs scores, checklists cochées et progression dans le navigateur", "Rien : tout est perdu à la fermeture", "Les réponses exactes du quiz final", "Le contenu des VMs du labo"], 0,
     "Les scores, cases de checklist et sections visitées sont mémorisés localement (localStorage) ; la réinitialisation reste possible depuis les paramètres."],
    ["Quelle combinaison valide officiellement le parcours Labs CFP-CMD ?",
     ["Quiz final ≥ 70 % + checklists des labs complétées + journal de labo", "Uniquement la lecture des sections 64 à 70", "Un score de 50 % au quiz final", "La réussite du lab 4 seulement"], 0,
     "L'évaluation combine théorie et pratique : quiz final au-dessus du seuil, checklists des labs cochées et journal de labo à jour."]
  ]
});
