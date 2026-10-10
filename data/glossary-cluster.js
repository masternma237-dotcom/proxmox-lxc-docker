/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-cluster.js — Glossaire (parcours CLUSTERING & HA)
   20 termes propres au parcours — Cluster, Quorum, QDevice, Corosync, Ceph,
   ZFS, PBS… sont DÉJÀ définis dans glossary-fondamentaux.js (non répétés ici).
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'pvecm': "Outil CLI de gestion du cluster Proxmox VE : pvecm create, add, status, nodes, delnode, qdevice.",
  'Vote': "Unité de poids d'un membre du cluster dans le calcul du quorum : chaque nœud vaut 1 vote, un QDevice peut ajouter un vote externe.",
  'corosync.conf': "Fichier de configuration Corosync (/etc/pve/corosync.conf) : totem, nodelist avec ring0_addr/ring1_addr et quorum — à éditer avec la plus grande prudence.",
  'Lien Corosync': "Chemin réseau (link0, link1…) reliant un nœud à l'anneau Corosync ; les liens redondants passent par des NICs et switches distincts.",
  'QNetd': "corosync-qnetd — service serveur du QDevice, exécuté sur une machine indépendante du cluster, qui distribue le vote externe.",
  'HA Manager': "Composant Proxmox assurant la haute disponibilité : supervise les ressources déclarées et orchestre leur redémarrage en cas de panne d'un nœud.",
  'LRM': "Local Resource Manager — agent exécuté sur chaque nœud du cluster, il applique les décisions HA (start, stop, migrate) et rafraîchit le watchdog.",
  'CRM': "Cluster Resource Manager — décisionnaire HA stocké dans pmxcfs : planifie les requêtes, arbitre le failover et coordonne les LRM.",
  'HA Group': "Groupe de nœuds auquel on rattache une ressource HA : définit les priorités (order), les restrictions (restricted) et le nofailback.",
  'Ressource HA': "VM ou CT déclarée au HA Manager (syntaxe vm:100, ct:200) avec un état géré : started, stopped, disabled, ignored.",
  'Failover': "Bascule automatique d'une ressource HA d'un nœud défaillant vers un nœud sain du HA Group, après fencing du nœud en panne.",
  'Fencing': "Isolation forcée d'un nœud suspect avant toute reprise de ses ressources : le watchdog redémarre brutalement le nœud pour éviter le split-brain.",
  'Watchdog': "Minuteur matériel/logiciel qui doit être réarmé en continu par le LRM : s'il expire (nœud figé), le nœud redémarre immédiatement (fencing).",
  'Live migration': "Migration d'une VM allumée vers un autre nœud : la RAM est copiée par itérations, la bascule finale interrompt le service de quelques millisecondes seulement.",
  'Stockage partagé': "Backend de stockage visible de tous les nœuds du cluster (Ceph, NFS, iSCSI) : prérequis du HA et de la live migration sans copie de disques.",
  'pmxcfs': "Proxmox Cluster File System — base de données distribuée (FUSE) montée sur /etc/pve : héberge la configuration du cluster et la réplique via Corosync.",
  'Recovery': "Relance automatique d'une ressource HA sur un nœud sain après le fencing du nœud défaillant — le cœur du failover Proxmox.",
  'Stateful migration': "Migration qui transfère l'état d'exécution de la VM (RAM, périphériques) en plus de son disque : la live migration est une stateful migration.",
  'Latence Corosync': "Temps de propagation entre nœuds du cluster : Proxmox recommande moins de 5 ms ; au-delà, le token timeout expiré provoque des pertes de quorum.",
  'Multi-cluster': "Administration fédérée de plusieurs clusters indépendants, notamment via Proxmox Datacenter Manager (remotes, supervision et migrations inter-clusters)."
});
