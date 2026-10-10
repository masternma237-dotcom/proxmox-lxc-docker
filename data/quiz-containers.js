/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-containers.js — Banques de quiz du parcours DOCKER & LXC
   Format : [question, [options], indexBonneRéponse, explication]
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'lxc-natif': [
    ["Quel paramètre plafonne DUREMENT l'usage CPU d'un LXC en nombre de cœurs ?",
     ["cpulimit", "cpuunits", "cores", "cpushares"], 0,
     "cpulimit=1.5 plafonne le CT à 1,5 cœur ; cpuunits ne définit qu'un poids relatif face aux autres CTs."],
    ["Que définit le paramètre cpuunits dans pct create ?",
     ["Un poids relatif de partage CPU entre conteneurs", "Un nombre de cœurs maximal", "Une fréquence CPU imposée", "Un quota de temps réel"], 0,
     "cpuunits (défaut 1024) arbitre les priorités quand les CTs se disputent le CPU ; il ne plafonne rien."],
    ["Quel outil télécharge les templates LXC officiels ?",
     ["pveam download", "pct pull", "qm importdisk", "pvesm fetch"], 0,
     "pveam update rafraîchit la liste puis pveam download local <template> installe l'archive tar.zst."],
    ["Quel risque couvre le couple --memory --swap dans un LXC ?",
     ["La saturation de la RAM de l'hôte par un CT défaillant", "La perte du rootfs", "Un conflit d'UID", "La défaillance du bridge vmbr0"], 0,
     "Les bornes cgroup memory + swap empêchent un conteneur d'affamer l'hôte ; l'OOM killer intervient au dépassement."]
  ],

  'lxc-unprivileged': [
    ["Quel UID hôte correspond au root d'un CT non privilégié ?",
     ["100000", "0", "65536", "999"], 0,
     "Le mapping user namespace traduit le root du CT (0) en UID hôte 100000 : une évasion n'obtient qu'un compte sans droits."],
    ["Quelle commande vérifie le mapping UID depuis l'intérieur du CT ?",
     ["cat /proc/self/uid_map", "pct config", "uname -r", "ls -l /etc/subuid"], 0,
     "/proc/self/uid_map affiche la table de correspondance (0 → 100000) vue depuis le conteneur."],
    ["Qui doit posséder un dossier hôte monté en mp0 pour être inscriptible par le root du CT non privilégié ?",
     ["L'UID hôte 100000 (chown 100000:100000)", "Le root de l'hôte (0)", "L'utilisateur www-data", "N'importe qui"], 0,
     "Les écritures du root du CT arrivent sur l'hôte sous l'UID 100000 : le dossier doit lui appartenir."],
    ["Que garantit le mode unprivileged en cas d'évasion du conteneur ?",
     ["Un simple compte sans droits sur l'hôte", "Un accès root immédiat", "La destruction du pool ZFS", "Le contournement du pare-feu"], 0,
     "L'attaquant sort du namespace avec l'UID 100000+ : aucun privilège réel sur le nœud Proxmox."]
  ],

  'docker-dans-lxc': [
    ["Quelles features LXC faut-il activer pour exécuter Docker dans un CT ?",
     ["nesting=1 (keyctl=1 conseillé)", "fuse=1 seul", "mknod=1 seul", "Aucune"], 0,
     "nesting=1 autorise les namespaces imbriqués ; keyctl=1 évite les plantages liés aux keyrings du noyau."],
    ["Pourquoi nesting=1 est-il indispensable à Docker ?",
     ["Il autorise l'exécution de conteneurs dans le conteneur", "Il accélère le réseau", "Il monte les volumes NFS", "Il active le GPU"], 0,
     "Docker crée ses propres namespaces : sans nesting, ces namespaces imbriqués sont refusés par LXC."],
    ["Quel filesystem empile les couches d'images Docker ?",
     ["OverlayFS (driver overlay2)", "ext4 brut", "FAT32", "tmpfs"], 0,
     "Docker empile les couches read-only des images via OverlayFS ; les écritures vont dans une couche supérieure."],
    ["Quelle commande teste le bon fonctionnement du daemon Docker dans le CT ?",
     ["docker run --rm hello-world", "pct doctor", "systemctl start lxc", "docker init"], 0,
     "hello-world télécharge une image, crée un conteneur et l'exécute : validation de bout en bout de la chaîne."]
  ],

  'docker-portainer': [
    ["Quel port expose l'UI HTTPS de Portainer CE ?",
     ["9443", "9000", "8006", "2375"], 0,
     "9443 sert l'UI en HTTPS (certificat auto-signé) ; 9000 est le port HTTP historique."],
    ["Quel montage permet à Portainer de piloter le daemon Docker ?",
     ["/var/run/docker.sock:/var/run/docker.sock", "/etc/passwd:/etc/passwd", "/dev/dri:/dev/dri", "/boot:/boot"], 0,
     "Le socket unix expose l'API Docker à Portainer : un accès équivalent au root du CT, à réserver au VLAN de gestion."],
    ["Quel est le rôle de --restart=always dans le déploiement de Portainer ?",
     ["Relancer le conteneur après crash ou redémarrage du daemon", "Chiffrer les communications", "Limiter la mémoire", "Dupliquer le conteneur"], 0,
     "La restart policy always garantit que l'UI de gestion revient seule après un incident ou un boot du CT."],
    ["Où Portainer persiste-t-il ses réglages et utilisateurs ?",
     ["Dans le volume nommé portainer_data monté sur /data", "Dans l'image Docker", "Sur le nœud Proxmox", "Dans /etc/portainer"], 0,
     "Le volume portainer_data → /data survit à la recréation du conteneur : comptes et configuration conservés."]
  ],

  'gpu-passthrough': [
    ["Où doivent être installés les pilotes NVIDIA pour Docker dans LXC ?",
     ["Sur l'hôte Proxmox (module noyau)", "Dans chaque conteneur Docker", "Dans le CT LXC", "Sur le PBS"], 0,
     "Le module noyau vit sur l'hôte ; le CT ne reçoit que les nœuds /dev et les bibliothèques userspace via le toolkit."],
    ["Quel composant branche le runtime NVIDIA sur Docker ?",
     ["nvidia-ctk runtime configure --runtime=docker", "pct set --gpu 1", "systemctl enable nvidia", "docker plugin nvidia"], 0,
     "nvidia-container-toolkit + nvidia-ctk enregistrent le runtime nvidia dans daemon.json, utilisable avec --gpus all."],
    ["Quels nœuds de périphérique donnent accès au GPU d'un LXC ?",
     ["/dev/dri/card0 et /dev/dri/renderD128", "/dev/sda et /dev/sdb", "/dev/vhost-net", "/dev/net/tun"], 0,
     "Les nœuds DRI (card0, renderD128) et /dev/nvidia* sont exposés au CT via --dev0/--dev1… (device passthrough)."],
    ["Que valide la commande docker run --rm --gpus all … nvidia-smi ?",
     ["Toute la chaîne : pilote hôte, devices, toolkit et runtime", "Uniquement le pilote hôte", "Uniquement le réseau", "La licence NVIDIA"], 0,
     "Si nvidia-smi s'exécute dans le conteneur CUDA, chaque maillon de la chaîne GPU est fonctionnel."]
  ],

  'docker-compose': [
    ["Quelle commande déploie la pile complète décrite par le Compose file ?",
     ["docker compose up -d", "docker run all", "docker start stack", "compose install"], 0,
     "docker compose up -d crée le réseau du projet, les volumes nommés et les conteneurs dans l'ordre des depends_on."],
    ["Comment les services d'une pile se joignent-ils entre eux ?",
     ["Par nom DNS sur le réseau de projet isolé", "Via l'IP publique du CT", "Par le socket Docker", "Via PBS"], 0,
     "Compose crée un réseau dédié (ex. webapp_default) : api atteint cache directement par son nom, sans port publié."],
    ["Que fait docker compose down ?",
     ["Arrête et supprime conteneurs + réseau, en conservant les volumes nommés", "Supprime tout y compris les volumes nommés", "Met à jour les images", "Redémarre les conteneurs"], 0,
     "down démonte la pile proprement ; les volumes nommés survivent sauf option --volumes explicite."],
    ["Où persiste la donnée Redis déclarée par redis-data:/data ?",
     ["Dans le volume nommé redis-data défini dans la section volumes", "Dans le Compose file", "Dans /tmp du CT", "Dans l'image nginx"], 0,
     "La section volumes du Compose file déclare le volume géré par Docker, monté dans /data du conteneur cache."]
  ],

  'bonnes-pratiques-conteneurs': [
    ["Pourquoi le socket Docker est-il l'actif le plus sensible d'un CT ?",
     ["Il équivaut au root du CT via l'API du daemon", "Il consomme beaucoup de RAM", "Il ouvre le port 80", "Il contient les mots de passe des images"], 0,
     "Contrôler /var/run/docker.sock permet de créer des conteneurs privilégiés et monter le filesystem : root du CT (et de l'hôte si privilégié)."],
    ["Quel couple de limites empêche un conteneur d'affamer l'hôte ?",
     ["--memory et --cpus (ou cpulimit côté LXC)", "--restart et --name", "-p et --network", "--read-only et --tmpfs"], 0,
     "Les bornes cgroup (RAM, CPU, pids-limit) protègent l'hôte : première contre-mesure avant tout déploiement."],
    ["À quoi sert log-opts max-size/max-file dans daemon.json ?",
     ["Empêcher les logs JSON de remplir le rootfs", "Chiffrer les logs", "Accélérer le réseau", "Envoyer les logs vers PBS"], 0,
     "Sans rotation, les logs JSON illimités d'un conteneur verbeux saturent le disque du CT : max-size + max-file bornent la croissance."],
    ["Que fait --cap-drop ALL sur un conteneur Docker ?",
     ["Retirer toutes les capabilities Linux", "Désactiver le réseau", "Supprimer les logs", "Bloquer le démarrage"], 0,
     "Le conteneur ne garde que les syscalls de base : combiné à no-new-privileges et --read-only, il réduit drastiquement la surface d'attaque."]
  ]
});
