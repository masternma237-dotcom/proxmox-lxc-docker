/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-containers.js — Glossaire du parcours DOCKER & LXC (20 termes)
   Les termes du socle (LXC, Nesting, Template LXC, CT privilégié/non privilégié,
   UID mapping…) restent définis dans glossary-fondamentaux.js.
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'Bind mount': "Montage d'un dossier hôte directement dans le CT ou un conteneur (mp0, -v /chemin:/chemin) : pas de copie, les données restent sur l'hôte.",
  'mp0': "Premier point de montage supplémentaire d'un LXC, déclaré via --mp0 : souvent un bind mount d'un répertoire du nœud Proxmox.",
  'CPU limit LXC': "Plafond dur d'usage CPU d'un conteneur (cpulimit, exprimé en cœurs) appliqué par les cgroups — distinct du poids relatif cpuunits.",
  'Memory swap LXC': "Couple de limites mémoire d'un CT : memory (plafond de RAM) + swap toléré avant que l'OOM killer n'intervienne.",
  'Docker Engine': "Daemon et CLI qui construisent, exécutent et supervisent les conteneurs Docker (dockerd, containerd, API unix).",
  'Docker Compose': "Outil déclaratif pilotant des piles multi-conteneurs depuis un Compose file (docker compose up/down).",
  'Portainer': "Interface web d'administration Docker (édition CE) : stacks, conteneurs, images, volumes et consoles via le socket Docker.",
  'Docker socket': "Fichier unix /var/run/docker.sock exposant l'API du daemon Docker : le contrôler équivaut au root du CT.",
  'NVIDIA Container Toolkit': "Composants NVIDIA (libnvidia-container, nvidia-ctk) connectant le runtime Docker aux bibliothèques GPU installées sur l'hôte.",
  'GPU passthrough': "Exposition directe des nœuds de périphérique GPU (/dev/dri, /dev/nvidia*) à un CT ou une VM, sans VM intermédiaire.",
  'cgroup': "Control group du noyau Linux bornant CPU, mémoire, I/O et nombre de PID d'un processus ou d'un conteneur.",
  'OverlayFS': "Système de fichiers en couches copy-on-write utilisé par Docker (driver overlay2) pour empiler les images.",
  'Volume Docker': "Stockage géré par Docker (/var/lib/docker/volumes) qui survit à la recréation des conteneurs (docker volume create).",
  'keyctl': "Feature LXC exposant les keyrings du noyau au CT : utile pour Docker et certaines images s'appuyant sur systemd.",
  'daemon.json': "Fichier de configuration du daemon Docker (/etc/docker/daemon.json) : logs, runtimes, pools d'adresses, registries.",
  'Compose file': "YAML (docker-compose.yml) décrivant les services, réseaux, volumes et dépendances d'une pile Docker.",
  'Port binding': "Publication d'un port de conteneur sur l'hôte (-p 8080:80) : premier point d'accès réseau d'un service.",
  'LXC features': "Options de conteneur activables dans Proxmox (nesting, keyctl, fuse, mknod) : chacune élargit les capacités ET la surface d'attaque.",
  'dev/dri': "Nœuds Direct Rendering Infrastructure (/dev/dri/card0, renderD128) donnant l'accès GPU : graphisme, encodage matériel et GPGPU.",
  'Image Docker': "Modèle immuable en couches d'un conteneur (format OCI), téléchargé depuis un registre ou construit via un Dockerfile."
});
