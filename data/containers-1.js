/* ═══════════════════════════════════════════════════════════════════════════
   data/containers-1.js — Parcours DOCKER & LXC (sections 36 → 42)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'lxc-natif',
    track: 'containers',
    level: 'intermediaire',
    title: 'LXC natif : templates, limites, privilèges',
    icon: 'fa-solid fa-box',
    step: '36',
    requires: ['creation-lxc'],
    description: 'Un LXC partage directement le noyau et les ressources de l\'hôte : la densité est maximale, mais sans limites explicites un conteneur défaillant peut affamer toute la plateforme. Les templates officiels (Debian, Ubuntu, Alpine, Rocky) fournissent une base minimale instanciée en quelques secondes via pveam et pct create. Le paramétrage clé couvre les cores et le cpulimit, les cpuunits (poids relatif), la mémoire avec swap, le quota du rootfs et les options de démarrage (onboot, startup order). Le choix privilégié ou non privilégié se pose à la création et conditionne toute la suite : retenez le non privilégié par défaut et réservez le privilégié aux cas techniques documentés (GPU, montages spécifiques).',
    cliCommands: [
      `# 1. Télécharger un template officiel
pveam update
pveam available --section system
pveam download local ubuntu-24.04-standard_24.04-2_amd64.tar.zst

# 2. Créer un CT avec des limites de ressources explicites
pct create 300 local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \\
  --hostname web-front --cores 2 --cpuunits 1024 --cpulimit 1.5 \\
  --memory 2048 --swap 512 \\
  --rootfs local-zfs:16 \\
  --net0 name=eth0,bridge=vmbr0,ip=192.168.10.40/24,gw=192.168.10.1 \\
  --unprivileged 1 --onboot 1`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Shell</span> → pveam update puis pveam download local <template>",
      "<span class='wb-path'>Create CT</span> → General : CT ID 300, hostname web-front, clé SSH",
      "<span class='wb-path'>CPU / Memory</span> → cores=2, cpuunits=1024, memory=2048, swap=512",
      "<span class='wb-path'>Disks</span> → rootfs 16 Go sur local-zfs (quota appliqué par le backend)",
      "<span class='wb-path'>CT 300 → Options</span> → Start at boot, Start/Shutdown order, Protection"
    ],
    diagram: 'ctn-limits',
    terminology: ['Template LXC', 'CT privilégié', 'CT non privilégié', 'LXC features', 'CPU limit LXC', 'Memory swap LXC', 'cgroup', 'pveam'],
    concepts: [
      { term: 'CPU limit LXC', def: "Plafond dur d'usage CPU en cœurs (cpulimit=1.5 → 1,5 cœur maximum) : protège l'hôte des dérives d'un service." },
      { term: 'cpuunits', def: "Poids relatif de partage CPU entre conteneurs concurrents (défaut 1024) : ne plafonne rien, arbitre les priorités." },
      { term: 'Memory swap LXC', def: "Couple memory + swap borné par cgroup : le swap masque les fuites mémoire mais dégrade fortement les performances." },
      { term: 'Quota rootfs', def: "Taille maximale du filesystem du conteneur, appliquée par le backend (quota ZFS sur dataset, volume LVM-Thin)." },
      { term: 'Startup order', def: "Ordre et délais de démarrage/arrêt (order=2,up=30) : garantit l'infrastructure avant les applications." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Un CT privilégié compromis donne le root du nœud : réservez ce mode aux cas documentés (GPU, montages spécifiques) et gardez le nesting dans un conteneur non privilégié pour Docker." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Sans cpulimit ni quota, un seul conteneur peut saturer CPU, RAM ou disque de l'hôte : posez les limites dès la création, avant la mise en production." }
    ],
    table: {
      headers: ['Ressource', 'Paramètre pct', 'Valeur labo', 'Effet'],
      rows: [
        ['CPU', '--cores 2 --cpulimit 1.5', '2 vCPU, 1,5 cœur max', 'Plafond dur de consommation'],
        ['Poids CPU', '--cpuunits 1024', '1024 (défaut)', 'Priorité relative entre CTs'],
        ['Mémoire', '--memory 2048 --swap 512', '2 Go + 512 Mo', 'Bornes cgroup mémoire'],
        ['Disque', '--rootfs local-zfs:16', '16 Go', 'Quota appliqué par le backend'],
        ['Démarrage', '--onboot 1 --startup order=2', 'Après l\'infra', 'Ordre maîtrisé au boot']
      ]
    }
  },

  {
    id: 'lxc-unprivileged',
    track: 'containers',
    level: 'intermediaire',
    title: 'Unprivileged LXC : sécurité, mapping UID/GID',
    icon: 'fa-solid fa-user-lock',
    step: '37',
    requires: ['lxc-natif'],
    description: 'Le mode unprivileged est la colonne vertébrale de la sécurité LXC : le root du conteneur devient l\'UID hôte 100000 via le mapping des user namespaces. Une évasion du conteneur n\'obtient donc qu\'un compte sans aucun droit sur l\'hôte, au lieu d\'un accès root total. Les mappings par défaut couvrent 65536 UIDs (/etc/subuid, /etc/subgid) et peuvent être affinés avec des lxc.idmap personnalisés. Les bind mounts (mp0) restent possibles mais imposent d\'aligner la propriété des dossiers hôtes sur l\'UID remappé (chown 100000:100000).',
    cliCommands: [
      `# 1. Créer un CT non privilégié (mapping UID/GID automatique 100000+)
pct create 310 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \\
  --hostname files-share --cores 2 --memory 1024 \\
  --rootfs local-zfs:20 \\
  --net0 name=eth0,bridge=vmbr0,ip=192.168.10.41/24,gw=192.168.10.1 \\
  --unprivileged 1

# 2. Vérifier le mapping depuis l'intérieur du CT
pct start 310 && pct enter 310
cat /proc/self/uid_map      # 0 → 100000 : root du CT = UID hôte 100000
cat /proc/self/gid_map
id                          # uid=0(root) vu depuis le CT`,
      `# 3. Mapping personnalisé (ex. root du CT = root hôte pour un dossier partagé)
# Prérequis côté hôte : /etc/subuid et /etc/subgid (root:100000:65536)
pct set 310 \\
  --lxc-conf lxc.idmap="u 0 0 1" \\
  --lxc-conf lxc.idmap="u 1 101001 65535" \\
  --lxc-conf lxc.idmap="g 0 0 1" \\
  --lxc-conf lxc.idmap="g 1 101001 65535"
pct reboot 310`,
      `# 4. Bind mount d'un dossier hôte dans le CT (mp0)
chown -R 100000:100000 /tank/share     # propriété alignée sur l'UID remappé
pct set 310 --mp0 /tank/share,mp=/srv/share
pct reboot 310 && pct enter 310 && ls -ln /srv/share`
    ],
    guiSteps: [
      "<span class='wb-path'>Create CT</span> → Général + Template : cocher Unprivileged container (défaut)",
      "<span class='wb-path'>CT 310 → Options → Features</span> → Nesting, keyctl, FUSE uniquement si nécessaire",
      "<span class='wb-path'>CT 310 → Resources → Add → Mount Point</span> → Ajouter un mp0 (bind mount hôte)",
      "<span class='wb-path'>Node → Shell</span> → chown 100000:100000 du dossier hôte puis pct reboot 310",
      "<span class='wb-path'>CT 310 → Console</span> → cat /proc/self/uid_map pour vérifier le mapping"
    ],
    diagram: 'ctn-unpriv',
    terminology: ['CT non privilégié', 'UID mapping', 'Bind mount', 'mp0', 'CT privilégié', 'LXC features'],
    concepts: [
      { term: 'UID mapping', def: "Correspondance user namespace : root du CT (0) ↔ 100000+ sur l'hôte ; visible dans /proc/self/uid_map." },
      { term: 'Bind mount', def: "Dossier hôte monté directement dans le CT (mp0) : idéal pour les données partagées, sans copie ni double stockage." },
      { term: 'subuid / subgid', def: "Plages d'IDs allouées aux namespaces (/etc/subuid, /etc/subgid) : socle des mappings personnalisés." },
      { term: 'Évasion de conteneur', def: "Compromission du noyau depuis le CT : en non privilégié, l'attaquant n'obtient qu'un UID sans droits sur l'hôte." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Un dossier hôte monté en mp0 n'est inscriptible par le root du CT non privilégié que s'il appartient à l'UID hôte 100000 : un simple chown résout le refus Permission denied." },
      { type: 'info', icon: 'fa-circle-info', text: "Avec Proxmox VE 8, Docker fonctionne parfaitement dans un CT non privilégié (nesting=1, keyctl=1) : le mode privilégié n'est plus une justification pour héberger des conteneurs d'applications." }
    ],
    table: {
      headers: ['Élément', 'Vue CT (interne)', 'Vue hôte (réelle)'],
      rows: [
        ['root du CT', 'UID 0 (root)', 'UID 100000'],
        ['Fichiers créés par le CT', 'root:root', '100000:100000'],
        ['rootfs', 'filesystem isolé', 'sous-volume dédié du storage'],
        ['Bind mount mp0', '/srv/share', '/tank/share (chown 100000)'],
        ['Évasion réussie', 'root apparent', 'compte sans aucun droit']
      ]
    }
  },

  {
    id: 'docker-dans-lxc',
    track: 'containers',
    level: 'avance',
    title: 'Docker dans LXC : nesting, prérequis',
    icon: 'fa-solid fa-cubes',
    step: '38',
    requires: ['lxc-unprivileged'],
    description: 'Docker peut tourner directement dans un LXC : la densité reste excellente et l\'isolation est double (conteneur Proxmox puis conteneurs Docker). Le prérequis technique est la feature nesting=1, qui autorise les namespaces imbriqués ; keyctl=1 est conseillé pour les keyrings du noyau utilisés par certaines images. Depuis Proxmox VE 8, le mode non privilégié est pleinement supporté : inutile de repasser en privilégié. L\'installation suit le dépôt officiel Docker (docker-ce, containerd.io, plugin compose) et le stockage repose sur OverlayFS au-dessus du rootfs du CT.',
    cliCommands: [
      `# 1. CT dédié Docker : nesting + keyctl, non privilégié (CDC 3.5)
pct create 400 local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \\
  --hostname docker-host --cores 4 --memory 4096 --swap 1024 \\
  --rootfs local-zfs:32 \\
  --net0 name=eth0,bridge=vmbr0,ip=192.168.10.50/24,gw=192.168.10.1 \\
  --unprivileged 1 \\
  --features nesting=1,keyctl=1
pct start 400 && pct enter 400`,
      `# 2. Installer Docker Engine depuis le dépôt officiel (dans le CT)
apt update && apt install -y ca-certificates curl gnupg
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin`,
      `# 3. Vérifier le daemon et le driver de stockage
docker version
docker info | grep -E 'Storage Driver|Cgroup'
docker run --rm hello-world     # test de bout en bout`
    ],
    guiSteps: [
      "<span class='wb-path'>Create CT</span> → Général + Disks : CT 400, 4 cœurs, 4 Go RAM, rootfs ≥ 32 Go",
      "<span class='wb-path'>CT 400 → Options → Features</span> → Cocher nesting (et keyctl)",
      "<span class='wb-path'>CT 400 → Options → Start at boot</span> → Démarrage automatique avec le nœud",
      "<span class='wb-path'>CT 400 → Console</span> → Installation docker-ce selon la séquence CDC 3.5",
      "<span class='wb-path'>CT 400 → Console</span> → docker run --rm hello-world pour valider"
    ],
    diagram: 'ctn-docker',
    terminology: ['Nesting', 'keyctl', 'Docker Engine', 'Docker socket', 'OverlayFS', 'LXC features', 'CT non privilégié'],
    concepts: [
      { term: 'Nesting', def: "Feature LXC autorisant les namespaces imbriqués : sans elle, Docker refuse de démarrer dans le CT." },
      { term: 'keyctl', def: "Feature exposant les keyrings du noyau au CT : évite des plantages dans certaines images (systemd, Debian 12+)." },
      { term: 'OverlayFS', def: "Système de couches copy-on-write de Docker : les images s'empilent et les écritures vont dans une couche supérieure." },
      { term: 'Docker socket', def: "Interface unix /var/run/docker.sock exposant l'API du daemon : la monter dans un conteneur équivaut au root du CT." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Monter /var/run/docker.sock dans un conteneur (Portainer, CI/CD…) équivaut à donner le root du CT : toute personne contrôlant le socket contrôle le daemon, les volumes et les conteneurs." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le nesting élargit la surface d'attaque du noyau : un seul CT Docker par rôle applicatif, jamais de nesting sur un CT multi-usage exposé au réseau." }
    ],
    table: {
      headers: ['Prérequis', 'Valeur', 'Raison'],
      rows: [
        ['Feature nesting', 'nesting=1', 'Namespaces imbriqués indispensables à Docker'],
        ['Feature keyctl', 'keyctl=1', 'Keyrings noyau utilisés par certaines images'],
        ['Mode du CT', 'unprivileged 1', 'Isolation UID : défaut sécurisé depuis PVE 8'],
        ['Rootfs', '32 Go (ZFS)', 'Les couches Docker consomment vite'],
        ['Mémoire', '4 Go + swap 1 Go', 'À dimensionner selon les piles hébergées']
      ]
    }
  },

  {
    id: 'docker-portainer',
    track: 'containers',
    level: 'avance',
    title: 'Docker + Portainer : installation, UI de gestion',
    icon: 'fa-solid fa-desktop',
    step: '39',
    requires: ['docker-dans-lxc'],
    description: 'Portainer apporte une interface web aux stacks Docker du CT 400 : dashboards, gestion des conteneurs, images, volumes et consoles web. Le déploiement tient en une commande docker run : un volume persistant pour les données, le port HTTPS 9443 et surtout le montage du socket Docker, sans lequel Portainer ne voit rien. La première connexion impose de créer le compte admin dans un délai limité et le certificat auto-signé déclenche un avertissement navigateur à accepter une fois. Par sécurité, l\'accès à 9443 reste réservé au VLAN de gestion.',
    cliCommands: [
      `# 1. Volume persistant + déploiement Portainer CE (CDC 3.5)
docker volume create portainer_data
docker run -d \\
  -p 9443:9443 \\
  --name portainer \\
  --restart=always \\
  -v /var/run/docker.sock:/var/run/docker.sock \\
  -v portainer_data:/data \\
  portainer/portainer-ce:latest`,
      `# 2. Vérifier le conteneur et le port publié
docker ps --filter name=portainer
docker logs portainer | grep -i https
ss -tlnp | grep 9443`
    ],
    guiSteps: [
      "<span class='wb-path'>https://192.168.10.50:9443</span> → Accepter le certificat auto-signé (avertissement navigateur)",
      "<span class='wb-path'>Première connexion</span> → Créer le compte admin dans les minutes suivant le déploiement",
      "<span class='wb-path'>Environments → local</span> → Connexion au daemon via le socket monté",
      "<span class='wb-path'>Dashboard → Containers</span> → Démarrer, arrêter, inspecter et ouvrir les consoles",
      "<span class='wb-path'>CT 400 → Summary</span> → Croiser la consommation du CT avec l'usage des conteneurs"
    ],
    diagram: 'ctn-portainer',
    terminology: ['Portainer', 'Docker socket', 'Port binding', 'Volume Docker', 'Image Docker', 'Docker Engine'],
    concepts: [
      { term: 'Portainer', def: "UI web d'administration Docker : déploiement de stacks, consoles, gestion des volumes et des utilisateurs." },
      { term: 'Port binding', def: "Publication d'un port conteneur sur le CT (-p 9443:9443) : premier maillon de la chaîne d'accès réseau." },
      { term: 'Volume Docker', def: "Stockage géré par Docker (portainer_data → /data) : survit aux recréations du conteneur." },
      { term: 'restart policy', def: "always relance Portainer après un crash ou un redémarrage du daemon Docker du CT." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Le socket Docker monté dans Portainer équivaut au root du CT : ne remplacez jamais ce montage par une exposition TCP (-p 2375) et limitez l'accès à 9443 au VLAN de gestion." },
      { type: 'info', icon: 'fa-circle-info', text: "Le certificat HTTPS de Portainer est auto-signé : l'avertissement navigateur est normal ; un reverse proxy avec ACME le remplace proprement (parcours Sécurité)." }
    ],
    table: {
      headers: ['Option docker run', 'Rôle', 'Valeur labo'],
      rows: [
        ['-p 9443:9443', 'UI HTTPS publiée', 'https://192.168.10.50:9443'],
        ['-v /var/run/docker.sock:…', 'Accès à l\'API Docker', 'Socket local uniquement, jamais TCP'],
        ['-v portainer_data:/data', 'Persistance des réglages', 'Volume nommé dédié'],
        ['--restart=always', 'Résilience', 'Redémarrage automatique après crash'],
        ['--name portainer', 'Identité du conteneur', 'Nom stable pour scripts et logs']
      ]
    }
  },

  {
    id: 'gpu-passthrough',
    track: 'containers',
    level: 'avance',
    title: 'GPU passthrough dans LXC : NVIDIA, toolkit',
    icon: 'fa-solid fa-microchip',
    step: '40',
    requires: ['docker-dans-lxc'],
    description: 'Le GPU passthrough dans un LXC expose des nœuds de périphériques (/dev/dri pour l\'encodage et le calcul, /dev/nvidia* pour CUDA) directement au conteneur : aucune VM intermédiaire, donc overhead minimal pour les charges IA, transcoding ou inférence. Les pilotes noyaux restent sur l\'hôte Proxmox ; le CT ne reçoit que les bibliothèques utilisateur et le NVIDIA Container Toolkit branche le runtime Docker. Pour un CT non privilégié, les permissions des nœuds (UID 100000+) doivent être ajustées côté hôte. Le test final nvidia-smi dans un conteneur CUDA valide toute la chaîne.',
    cliCommands: [
      `# 1. Sur l'HÔTE : pilotes NVIDIA installés et GPU visible
nvidia-smi
ls -l /dev/dri                     # card0 + renderD128

# 2. CT dédié GPU (non privilégié, nesting pour Docker)
pct create 410 local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst \\
  --hostname gpu-worker --cores 4 --memory 8192 \\
  --rootfs local-zfs:32 \\
  --net0 name=eth0,bridge=vmbr0,ip=192.168.10.51/24,gw=192.168.10.1 \\
  --unprivileged 1 --features nesting=1 \\
  --dev0 /dev/dri/card0 --dev1 /dev/dri/renderD128 \\
  --dev2 /dev/nvidia0 --dev3 /dev/nvidiactl --dev4 /dev/nvidia-uvm`,
      `# 3. Dans le CT : NVIDIA Container Toolkit (jamais le pilote noyau !)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' > /etc/apt/sources.list.d/nvidia-container-toolkit.list
apt update && apt install -y nvidia-container-toolkit
nvidia-ctk runtime configure --runtime=docker
systemctl restart docker`,
      `# 4. Test de bout en bout : pilote + toolkit + runtime
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Shell</span> → nvidia-smi et ls -l /dev/dri : vérifier le GPU côté hôte",
      "<span class='wb-path'>CT 410 → Resources → Device Passthrough</span> → Ajouter /dev/dri/card0, renderD128 et /dev/nvidia*",
      "<span class='wb-path'>CT 410 → Console</span> → Installer nvidia-container-toolkit puis nvidia-ctk runtime configure",
      "<span class='wb-path'>CT 410 → Console</span> → docker run --rm --gpus all … nvidia-smi : test final",
      "<span class='wb-path'>Node → Summary</span> → Observer la charge et la VRAM pendant l'inférence"
    ],
    diagram: 'ctn-gpu',
    terminology: ['GPU passthrough', 'NVIDIA Container Toolkit', 'dev/dri', 'daemon.json', 'CT privilégié', 'CT non privilégié'],
    concepts: [
      { term: 'GPU passthrough', def: "Exposition directe des nœuds de périphérique au CT : le calcul s'exécute à vitesse native, sans VM intermédiaire." },
      { term: 'NVIDIA Container Toolkit', def: "Ponte entre Docker et les bibliothèques NVIDIA : injecte libs et runtime au lancement (--gpus all)." },
      { term: 'dev/dri', def: "Nœuds Direct Rendering Infrastructure (card0, renderD128) : accès graphique, encodage et GPGPU partagé (Intel, NVIDIA)." },
      { term: 'Séparation pilote / userspace', def: "Le module noyau vit sur l'hôte ; le CT ne porte que les bibliothèques utilisateur fournies par le toolkit." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Un GPU entier passé à un CT n'est plus disponible pour le nœud ni pour les VMs : console, encodage matériel et autres workloads GPU sont exclus tant que le passthrough est actif." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "N'installez jamais le pilote noyau NVIDIA dans le CT : seul l'hôte charge le module ; le CT exige uniquement nvidia-container-toolkit et les bibliothèques userspace, sinon le démarrage casse." }
    ],
    table: {
      headers: ['Étape', 'Où', 'Objectif'],
      rows: [
        ['Pilote NVIDIA', 'Hôte Proxmox', 'nvidia-smi fonctionnel côté hôte'],
        ['Device passthrough', 'CT 410 (--dev0/--dev1…)', 'Exposer /dev/dri et /dev/nvidia*'],
        ['Permissions', 'Hôte (udev/hookscript)', 'UID 100000+ pour un CT non privilégié'],
        ['Container Toolkit', 'CT 410', 'nvidia-ctk runtime configure --runtime=docker'],
        ['Validation', 'CT 410', 'docker run --gpus all … nvidia-smi']
      ]
    }
  },

  {
    id: 'docker-compose',
    track: 'containers',
    level: 'avance',
    title: 'Docker Compose : déploiement multi-conteneurs',
    icon: 'fa-solid fa-layer-group',
    step: '41',
    requires: ['docker-portainer'],
    description: 'Docker Compose décrit une pile complète — services, réseaux, volumes, dépendances — dans un Compose file versionné à côté du code. Une seule commande docker compose up -d construit le réseau dédié du projet, crée les volumes et lance les conteneurs dans l\'ordre des depends_on. Les mises à jour deviennent déclaratives : docker compose pull puis up -d recrée uniquement les services dont l\'image a changé. Compose et Portainer sont complémentaires : Portainer excelle à observer, Compose à reconstruire proprement.',
    cliCommands: [
      `# 1. Arborescence du projet
mkdir -p /opt/stacks/webapp/nginx/conf.d /opt/stacks/webapp/api
cd /opt/stacks/webapp

# 2. Compose file : trois services, un réseau, un volume
cat > docker-compose.yml <<'EOF'
services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
    depends_on:
      - api
    restart: unless-stopped

  api:
    build: ./api
    environment:
      REDIS_HOST: cache
    expose:
      - "3000"
    restart: unless-stopped

  cache:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
EOF`,
      `# 3. Cycle de vie de la pile
docker compose up -d                            # réseau + volumes + conteneurs
docker compose ps                               # état des services
docker compose logs -f api                      # suivre un service
docker compose pull && docker compose up -d     # mise à jour déclarative
docker compose down                             # arrêt propre (volumes nommés conservés)`
    ],
    guiSteps: [
      "<span class='wb-path'>CT 400 → Console</span> → Créer /opt/stacks/webapp et écrire le Compose file",
      "<span class='wb-path'>https://192.168.10.50:9443</span> → Portainer : Stacks → Add stack → Web editor",
      "<span class='wb-path'>Stack → Web editor</span> → Coller le Compose file puis Deploy the stack",
      "<span class='wb-path'>Stack → Containers</span> → web, api, cache démarrés et sains",
      "<span class='wb-path'>Stack → Editor</span> → Modifier puis Redeploy : recréation ciblée des services"
    ],
    diagram: 'ctn-compose',
    terminology: ['Docker Compose', 'Compose file', 'Volume Docker', 'Port binding', 'Image Docker', 'Bind mount'],
    concepts: [
      { term: 'Compose file', def: "YAML déclaratif décrivant services, réseaux, volumes et dépendances d'une pile (docker-compose.yml)." },
      { term: 'Réseau de projet', def: "Compose crée un réseau isolé par pile : les services se joignent par nom DNS (cache, api) sans port publié." },
      { term: 'depends_on', def: "Ordre de démarrage déclaratif entre services : l'API attend Redis avant de booter." },
      { term: 'Redeploy', def: "Recréation ciblée des services dont l'image ou la configuration a changé : le reste de la pile reste inchangé." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Ne publiez que le front (8080) : Redis et l'API restent internes au réseau de projet — un -p oublié sur Redis est une porte ouverte sur le réseau entier." },
      { type: 'info', icon: 'fa-circle-info', text: "Utilisez docker compose (plugin v2, installé avec docker-compose-plugin) : l'ancien binaire docker-compose avec tiret est en fin de vie." }
    ],
    table: {
      headers: ['Commande', 'Effet'],
      rows: [
        ['docker compose up -d', 'Crée réseau, volumes et conteneurs de la pile'],
        ['docker compose ps', 'État et santé des services'],
        ['docker compose logs -f api', 'Journaux en continu d\'un service'],
        ['docker compose pull', 'Télécharge les images mises à jour'],
        ['docker compose down', 'Arrête et supprime conteneurs + réseau (volume conservé)']
      ]
    }
  },

  {
    id: 'bonnes-pratiques-conteneurs',
    track: 'containers',
    level: 'avance',
    title: 'Bonnes pratiques : sécurité, isolation, ressources',
    icon: 'fa-solid fa-shield-halved',
    step: '42',
    requires: ['docker-compose'],
    description: 'La sécurité des conteneurs se joue sur deux étages imbriqués : le LXC borne le périmètre système (non privilégié, features minimales, cgroups) et Docker raffine à l\'intérieur (capabilities, utilisateur non root, filesystem en lecture seule). Le socket Docker est l\'actif le plus sensible : équivalent au root, il ne quitte jamais le CT et ne se publie jamais en TCP. Les limites de ressources — cpulimit, memory, quota, rotation des logs — protègent l\'hôte de la saturation, première cause d\'incident en production. La règle d\'or : un CT Docker par rôle applicatif, des limites posées dès la création, des images à jour et un backup vzdump régulier.',
    cliCommands: [
      `# 1. Limites côté LXC (cgroups) — l'étage système
pct set 400 --cores 4 --cpulimit 3 --cpuunits 1024
pct set 400 --memory 4096 --swap 1024
pct set 400 --rootfs local-zfs:64 --protection 1`,
      `# 2. Durcissement Docker : rotation des logs, pools d'adresses dédiés
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" },
  "default-address-pools": [{ "base": "172.30.0.0/16", "size": 24 }]
}
EOF
systemctl restart docker`,
      `# 3. Conteneur durci : non-root, capabilities retirées, ressources bornées
docker run -d --name web-durci \\
  --read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges \\
  --memory 512m --cpus 1.5 --pids-limit 200 \\
  -p 8080:80 nginx:1.27-alpine`
    ],
    guiSteps: [
      "<span class='wb-path'>CT 400 → Options → Features</span> → Nesting + keyctl activés, rien d'autre",
      "<span class='wb-path'>CT 400 → Resources</span> → Memory, CPU limit et rootfs quota alignés sur le besoin réel",
      "<span class='wb-path'>Datacenter → Firewall</span> → N'autoriser 9443 que depuis le VLAN de gestion",
      "<span class='wb-path'>CT 400 → Console</span> → daemon.json : rotation des logs, pools d'adresses dédiés",
      "<span class='wb-path'>CT 400 → Backup → Backup now</span> → vzdump régulier du CT Docker entier"
    ],
    diagram: 'ctn-best',
    terminology: ['cgroup', 'CPU limit LXC', 'Memory swap LXC', 'CT non privilégié', 'Docker socket', 'LXC features', 'Nesting'],
    concepts: [
      { term: 'Défense en profondeur', def: "Deux étages isolants (LXC puis Docker) : contourner l'un laisse l'autre opposer ses propres contrôles." },
      { term: 'Cap drop', def: "--cap-drop ALL retire les capabilities Linux : le conteneur ne garde que les syscalls de base." },
      { term: 'no-new-privileges', def: "Empêche tout processus du conteneur d'acquérir des privilèges supplémentaires (setuid bloqué)." },
      { term: 'Rotation des logs', def: "log-opts max-size/max-file dans daemon.json : les logs JSON ne remplissent plus le rootfs du CT." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Le socket Docker équivaut au root du CT (et donc, sur un CT privilégié, de l'hôte) : jamais d'exposition TCP (-p 2375) et un filtrage strict du VLAN de gestion." },
      { type: 'success', icon: 'fa-circle-check', text: "Checklist de sortie du parcours : CT Docker non privilégié, nesting+keyctl seulement, limites cgroups posées, logs rotatés, 9443 filtré, vzdump planifié." }
    ],
    table: {
      headers: ['Risque', 'Contre-mesure', 'Étage'],
      rows: [
        ['Évasion CT → hôte', 'CT non privilégié (UID 100000+)', 'LXC'],
        ['Conteneur malveillant', '--cap-drop ALL, no-new-privileges, read-only', 'Docker'],
        ['Saturation CPU/RAM', 'cpulimit, memory, swap, pids-limit', 'cgroups'],
        ['Disque plein (logs/images)', 'log-opts, docker system prune, quota rootfs', 'LXC + Docker'],
        ['Socket exposé', 'Socket local uniquement, firewall VLAN mgmt', 'Réseau']
      ]
    }
  }
]);
