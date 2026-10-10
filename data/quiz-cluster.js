/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-cluster.js — Banques de quiz du parcours CLUSTERING & HA
   Format : [question, [options], indexBonneRéponse, explication]
   4 questions par section (23 → 29)
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'creation-cluster': [
    ["Quelle commande crée un cluster sur le premier nœud ?",
     ["pvecm create PROXMOX-CFP --link0 10.10.10.11", "pvecm join 10.10.10.11", "pvecm add pve1", "qm create cluster"], 0,
     "pvecm create initialise le cluster sur le premier nœud ; pvecm add sert ensuite aux nœuds qui rejoignent."],
    ["Quel est le quorum minimal d'un cluster de 3 nœuds ?",
     ["2 votes (n/2+1)", "1 vote", "3 votes", "4 votes"], 0,
     "La règle n/2+1 impose 2 votes sur 3 : un seul nœud peut tomber sans perte de quorum."],
    ["Où la configuration du cluster est-elle stockée ?",
     ["Dans pmxcfs, montée sur /etc/pve", "Dans /etc/proxmox.cfg", "Dans une base MySQL", "Uniquement sur le premier nœud"], 0,
     "pmxcfs est une base de données distribuée répliquée via Corosync : la config est identique sur tous les nœuds."],
    ["Que se passe-t-il si le quorum est perdu ?",
     ["pmxcfs passe en lecture seule, plus de démarrage ni de migration", "Les VMs s'arrêtent immédiatement", "Le cluster se dissout", "Rien, tout continue normalement"], 0,
     "Sans quorum, les écritures de configuration sont figées ; les VMs déjà démarrées continuent, mais rien ne peut être démarré ou migré."]
  ],

  'corosync': [
    ["Quelle latence Proxmox recommande-t-il entre les nœuds pour Corosync ?",
     ["Inférieure à 5 ms", "Inférieure à 50 ms", "Inférieure à 200 ms", "Peu importe"], 0,
     "Corosync exige un temps réel : cible < 5 ms ; au-delà de ~10 ms, le token timeout peut expirer et faire perdre le quorum."],
    ["Quels ports réseau utilise Corosync ?",
     ["UDP 5404-5405", "TCP 8006", "TCP 3306", "UDP 53"], 0,
     "Corosync écoute en UDP sur 5404-5405 : ces ports doivent rester ouverts entre tous les nœuds sur chaque lien."],
    ["Pourquoi multiplier les liens Corosync (link0 + link1) ?",
     ["Survivre à la panne d'un switch ou d'une NIC", "Doubler le nombre de votes", "Accélérer les VMs", "Réduire la RAM consommée"], 0,
     "knetswitch bascule le trafic sur le lien sain : un seul lien serait un SPOF capable de faire perdre le quorum."],
    ["Quel fichier décrit la nodelist et les liens Corosync ?",
     ["/etc/pve/corosync.conf", "/etc/pve/storage.cfg", "/etc/network/interfaces", "/etc/pve/datacenter.cfg"], 0,
     "corosync.conf contient totem, la nodelist (ring0_addr/ring1_addr) et la section quorum — à éditer avec prudence."]
  ],

  'qdevice': [
    ["Quel problème résout un QDevice ?",
     ["Le quorum impossible à tenir dans un cluster de 2 nœuds", "Le manque de RAM sur un nœud", "La lenteur de Ceph", "Le certificat expiré de l'UI"], 0,
     "Avec 2 nœuds, il faut 2/2 votes : la première panne perd le quorum. Le QDevice ajoute un 3ᵉ vote externe."],
    ["Où installe-t-on corosync-qnetd ?",
     ["Sur une machine indépendante du cluster (Debian dédiée…)", "Sur les 2 nœuds du cluster", "Uniquement sur pve1", "Dans chaque VM"], 0,
     "QNetd doit être hors cluster pour que ses pannes ne soient pas corrélées à celles des nœuds ; les clients (corosync-qdevice) s'installent sur les nœuds."],
    ["Quelle commande déploie le QDevice côté cluster ?",
     ["pvecm qdevice setup 192.168.10.60", "pvecm create qdevice", "qm set 0 --qdevice", "corosync --add-vote"], 0,
     "pvecm qdevice setup <IP> installe clés TLS et configuration : pvecm status affiche ensuite le QDevice avec 1 vote."],
    ["Que se passe-t-il si le QDevice tombe en panne ?",
     ["Le cluster pair fonctionne tant que les 2 nœuds sont vivants", "Le cluster perd immédiatement le quorum", "Les VMs redémarrent", "Corosync s'arrête"], 0,
     "Sans le QDevice, le quorum redevient 2/2 : plus de tolérance de panne, mais aucune interruption tant que les deux nœuds répondent."]
  ],

  'ha-manager': [
    ["Quel composant prend les décisions HA à l'échelle du cluster ?",
     ["Le CRM (dans pmxcfs)", "Le LRM local", "Le watchdog", "QNetd"], 0,
     "Le CRM planifie les requêtes et arbitre le failover ; chaque LRM exécute les actions sur son nœud."],
    ["Quel est le rôle du watchdog et du fencing ?",
     ["Redémarrer brutalement un nœud figé pour éviter le split-brain", "Sauvegarder les VMs", "Accélérer la migration", "Distribuer les votes"], 0,
     "Si le LRM ne réarme plus le watchdog, le nœud est fenced (reboot) : ses ressources HA peuvent alors être relancées ailleurs (recovery)."],
    ["Sur quel type de stockage une ressource HA doit-elle résider ?",
     ["Un stockage partagé (Ceph, NFS, iSCSI)", "Un disque local ext4", "Une clé USB", "N'importe lequel"], 0,
     "Sans stockage partagé, le disque reste sur le nœud mort : la ressource ne peut pas être relancée ailleurs."],
    ["Quelle commande ajoute la VM 100 en HA avec le groupe prod ?",
     ["ha-manager add vm:100 --group prod --state started", "qm ha add 100", "pvecm add vm:100", "pct ha 100"], 0,
     "ha-manager add déclare la ressource (vm:ID ou ct:ID) avec son groupe et son état géré (started)."]
  ],

  'migration-chaud': [
    ["Que copie principalement une live migration sur stockage partagé ?",
     ["La RAM de la VM, par itérations (dirty pages)", "Les disques de la VM", "Le certificat du nœud", "La configuration du cluster"], 0,
     "Avec un stockage partagé, seuls l'état mémoire et les périphériques voyagent : le disque reste en place."],
    ["Quelle option migre une VM avec ses disques locaux ?",
     ["--with-local-disks 1", "--copy-all", "--local-storage", "--move-disks"], 0,
     "qm migrate <vm> <cible> --online --with-local-disks 1 copie les disques locaux : opération plus longue et plus risquée."],
    ["Quelle configuration isole le trafic de migration sur une NIC dédiée ?",
     ["migration: network=CIDR dans /etc/pve/datacenter.cfg", "net0 dans la VM", "ring0_addr dans corosync.conf", "pvesm add migration"], 0,
     "L'option migration: network= de datacenter.cfg contraint le trafic de migration à la plage indiquée (NIC 10 Gbps recommandée)."],
    ["Pourquoi le CPU type host complique-t-il les migrations ?",
     ["Il expose les instructions exactes du CPU, incompatibles entre générations différentes", "Il consomme trop de RAM", "Il désactive le réseau", "Il n'existe pas dans Proxmox"], 0,
     "Sur un cluster hétérogène, utilisez x86-64-v2-AES ; sur le labo PROXMOX-CFP (nœuds identiques), host reste possible."]
  ],

  'stockage-partage': [
    ["Quel est le prérequis du HA côté stockage ?",
     ["Un storage partagé vu par tous les nœuds", "Un SSD NVMe par nœud", "Un RAID matériel", "Un storage local par nœud"], 0,
     "Ceph, NFS ou iSCSI : le failover n'a rien à copier si le disque de la VM est visible de tous les nœuds."],
    ["Quel backend partagé est intégré nativement dans Proxmox pour l'hyperconvergence ?",
     ["Ceph RBD", "VMFS", "GlusterFS", "Dell EqualLogic"], 0,
     "Ceph RBD est répliqué (3× par défaut), supporte snapshots et HA : c'est le choix du labo PROXMOX-CFP."],
    ["Quelle commande déplace le disque d'une VM vers le storage partagé ceph-rbd ?",
     ["qm move-disk 100 scsi0 ceph-rbd --delete 1", "qm clone 100 ceph-rbd", "pvesm migrate 100", "rsync /var/lib/vz"], 0,
     "qm move-disk transfère le disque vers le storage cible (--delete supprime l'original) : la VM devient migrable et HA-able."],
    ["Quelle limite d'un NFS isolé pour le HA ?",
     ["Le NAS devient un point de défaillance unique", "Il interdit les snapshots", "Il ne supporte pas les CTs", "Il force le CPU type kvm64"], 0,
     "Le failover déplace la VM, mais si le NAS meurt, tout s'arrête : prévoyez un NFS redondé ou Ceph répliqué."]
  ],

  'datacenter-manager': [
    ["Quel est le rôle du Proxmox Datacenter Manager ?",
     ["Fédérer plusieurs clusters Proxmox dans une seule interface", "Remplacer le quorum local", "Héberger des VMs", "Sauvegarder les clusters"], 0,
     "Le PDCM agrège les clusters déclarés comme remotes : vue unifiée, mises à jour, métriques et migrations inter-clusters."],
    ["Comment un cluster se connecte-t-il au PDCM ?",
     ["Via un utilisateur et un API Token dédiés (HTTPS)", "En join cluster classique", "Via un câble série", "Avec pvecm add"], 0,
     "Chaque remote est ajouté avec host, utilisateur (pdm-sync@pve), token et fingerprint TLS — privilèges minimum requis."],
    ["Que devient un cluster si le PDCM tombe en panne ?",
     ["Il reste pleinement autonome et opérationnel", "Il perd le quorum", "Ses VMs s'arrêtent", "Il se dissout automatiquement"], 0,
     "Le PDCM observe et pilote : aucune décision HA locale ne dépend de lui."],
    ["Sur quel port l'interface du Datacenter Manager est-elle servie ?",
     ["8443", "8006", "5405", "9090"], 0,
     "Le PDCM expose son UI en HTTPS sur le port 8443 ; les nœuds Proxmox, eux, restent sur 8006."]
  ]

});
