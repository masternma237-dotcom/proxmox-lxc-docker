/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-containers.js — Schémas SVG du parcours DOCKER & LXC
   Palette : #E57000 #e74c3c #27ae60 #3498db #8e44ad #16a085 #f39c12 #2c3e50 #1a2530
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* 36 — Limites de ressources d'un LXC */
  'ctn-limits': function () {
    return svgOpen(700, 240, "Limites de ressources d'un conteneur LXC") +
      svgBox(20, 60, 150, 110, '#1a2530', '#0d1117', 'Nœud Proxmox\nCPU · RAM · ZFS') +
      svgArrow(170, 115, 220, 115) +
      svgBox(220, 35, 200, 160, '#E57000', '#b85500', 'CT 300\nweb-front\n(unprivileged)') +
      svgArrow(420, 60, 470, 42) +
      svgArrow(420, 95, 470, 96) +
      svgArrow(420, 135, 470, 150) +
      svgArrow(420, 170, 470, 199) +
      svgBox(470, 20, 210, 44, '#3498db', '#1a6a9e', 'cores=2 · cpulimit=1.5') +
      svgBox(470, 74, 210, 44, '#16a085', '#0e6655', 'memory=2048 · swap=512') +
      svgBox(470, 128, 210, 44, '#f39c12', '#b8750d', 'rootfs quota : 16 Go (ZFS)') +
      svgBox(470, 182, 210, 34, '#8e44ad', '#6c3483', 'cpuunits=1024 · onboot=1') +
      svgText(350, 226, 'cgroups du noyau : chaque limite est un plafond dur', '#8d97a8', 11) +
      svgClose('Les cgroups plafonnent CPU, RAM, swap et disque : un LXC reste borné même en cas de fuite');
  },

  /* 37 — Mapping UID d'un CT non privilégié + bind mount */
  'ctn-unpriv': function () {
    return svgOpen(700, 240, "Mapping UID d'un CT non privilégié et bind mount") +
      svgBox(20, 40, 190, 100, '#27ae60', '#1a6a3e', 'CT 310\nnon privilégié\nroot interne = 0') +
      svgText(315, 32, 'uid_map : 0 → 100000', '#8d97a8', 11) +
      svgArrow(210, 90, 400, 90, '#27ae60') +
      svgBox(400, 40, 190, 100, '#1a2530', '#0d1117', 'Hôte\nroot = 0\nroot CT = 100000') +
      svgBox(20, 180, 220, 44, '#f39c12', '#b8750d', 'mp0 : /srv/share (bind mount)') +
      svgLine(240, 202, 400, 202, '#8d97a8', 2) +
      svgBox(400, 180, 280, 44, '#8e44ad', '#6c3483', '/tank/share → chown 100000:100000') +
      svgClose('Le mapping isole le root du CT ; les bind mounts doivent appartenir à l\'UID hôte 100000');
  },

  /* 38 — Docker dans LXC : pile imbriquée */
  'ctn-docker': function () {
    return svgOpen(700, 260, "Docker imbriqué dans un conteneur LXC") +
      svgBox(20, 20, 660, 50, '#E57000', '#b85500', 'Nœud Proxmox VE — noyau Linux partagé') +
      svgBox(60, 85, 580, 155, '#1a2530', '#0d1117', '') +
      svgText(350, 80, 'CT 400 docker-host · non privilégié · features nesting=1, keyctl=1', '#8d97a8', 11) +
      svgBox(90, 100, 200, 50, '#3498db', '#1a6a9e', 'Docker Engine\n(overlay2 · cgroups)') +
      svgBox(320, 100, 100, 50, '#27ae60', '#1a6a3e', 'portainer') +
      svgBox(435, 100, 90, 50, '#8e44ad', '#6c3483', 'nginx') +
      svgBox(540, 100, 80, 50, '#f39c12', '#b8750d', 'redis') +
      svgArrow(290, 125, 320, 125) +
      svgArrow(290, 140, 435, 140) +
      svgArrow(290, 155, 540, 155) +
      svgBox(90, 165, 530, 55, '#2c3e50', '#17202a', 'OverlayFS : couches d\'images en copy-on-write\n/var/lib/docker sur rootfs ZFS (quota 32 Go)') +
      svgClose('Nesting autorise les namespaces imbriqués, keyctl les keyrings du noyau : Docker tourne dans le LXC');
  },

  /* 39 — Portainer pilote Docker via le socket */
  'ctn-portainer': function () {
    return svgOpen(700, 230, "Portainer pilotant Docker via le socket") +
      svgBox(20, 45, 150, 70, '#2c3e50', '#17202a', 'Admin\nNavigateur') +
      svgText(230, 38, 'HTTPS :9443', '#8d97a8', 10) +
      svgArrow(170, 70, 320, 80, '#27ae60') +
      svgBox(300, 15, 380, 190, '#1a2530', '#0d1117', '') +
      svgText(490, 33, 'CT 400 · Docker Engine', '#8d97a8', 11) +
      svgBox(320, 45, 160, 60, '#3498db', '#1a6a9e', 'Portainer CE\n9443 → 9443') +
      svgBox(510, 45, 150, 60, '#27ae60', '#1a6a3e', 'web (nginx)\n8080 → 80') +
      svgBox(320, 125, 160, 60, '#8e44ad', '#6c3483', 'portainer_data\nvolume persistant') +
      svgBox(510, 125, 150, 60, '#f39c12', '#b8750d', 'docker.sock\nAPI Docker') +
      svgArrow(450, 90, 545, 125, '#e74c3c') +
      svgText(555, 115, 'root équivalent', '#e74c3c', 10) +
      svgClose('Portainer pilote l\'API Docker via le socket monté : un accès à restreindre au VLAN de gestion');
  },

  /* 40 — Chaîne GPU passthrough vers conteneurs Docker */
  'ctn-gpu': function () {
    return svgOpen(700, 235, "Chaîne GPU passthrough dans un LXC") +
      svgBox(20, 40, 150, 100, '#1a2530', '#0d1117', 'Hôte Proxmox\npilote NVIDIA\nnoyau') +
      svgBox(220, 30, 170, 50, '#f39c12', '#b8750d', '/dev/dri/card0\nrenderD128') +
      svgBox(220, 100, 170, 50, '#E57000', '#b85500', '--dev0/--dev1\n→ CT 410') +
      svgBox(440, 30, 240, 50, '#3498db', '#1a6a9e', 'NVIDIA Container Toolkit\nruntime docker') +
      svgBox(440, 100, 240, 50, '#27ae60', '#1a6a3e', 'docker run --gpus all\nworkload CUDA') +
      svgArrow(170, 65, 220, 55) +
      svgArrow(170, 115, 220, 125) +
      svgArrow(390, 55, 440, 55) +
      svgArrow(390, 125, 440, 125) +
      svgBox(220, 175, 460, 40, '#2c3e50', '#17202a', 'Pilote noyau sur l\'HÔTE · toolkit + libs userspace dans le CT') +
      svgClose('nvidia-smi fonctionne dans les conteneurs grâce à la chaîne pilote hôte → devices → toolkit → runtime');
  },

  /* 41 — Docker Compose : une pile déclarative */
  'ctn-compose': function () {
    return svgOpen(700, 265, "Docker Compose : déploiement déclaratif d'une pile") +
      svgBox(20, 20, 180, 70, '#8e44ad', '#6c3483', 'docker-compose.yml\nweb · api · cache') +
      svgArrow(110, 90, 110, 130, '#27ae60') +
      svgBox(20, 130, 180, 60, '#3498db', '#1a6a9e', 'docker compose up -d\nréseau + volumes créés') +
      svgBox(300, 25, 160, 60, '#E57000', '#b85500', 'web\nnginx:1.27-alpine\n8080 → 80') +
      svgBox(300, 105, 160, 60, '#27ae60', '#1a6a3e', 'api\nbuild ./api\n:3000 interne') +
      svgBox(300, 185, 160, 60, '#f39c12', '#b8750d', 'cache\nredis:7-alpine\n:6379 interne') +
      svgBox(520, 90, 160, 90, '#1a2530', '#0d1117', 'réseau\nwebapp_default\nDNS interne') +
      svgBox(520, 195, 160, 44, '#16a085', '#0e6655', 'redis-data\n(volume nommé)') +
      svgArrow(460, 55, 530, 105) +
      svgArrow(460, 135, 530, 135) +
      svgArrow(460, 215, 530, 165) +
      svgClose('Une seule commande déploie la pile : réseaux, volumes et dépendances déclarés dans le Compose file');
  },

  /* 42 — Bonnes pratiques : quatre couches de défense */
  'ctn-best': function () {
    return svgOpen(700, 250, "Bonnes pratiques conteneurs : quatre couches de défense") +
      svgText(350, 16, 'Défense en profondeur d\'un CT Docker', '#8d97a8', 11) +
      svgBox(60, 28, 580, 44, '#e74c3c', '#922b21', '1 · CT non privilégié + features minimales (nesting seulement si Docker)') +
      svgBox(60, 82, 580, 44, '#f39c12', '#b8750d', '2 · Socket Docker local uniquement — jamais de TCP 2375') +
      svgBox(60, 136, 580, 44, '#3498db', '#1a6a9e', '3 · Limites cgroups : cpulimit, memory+swap, quota rootfs, log-opts') +
      svgBox(60, 190, 580, 44, '#27ae60', '#1a6a3e', '4 · Images à jour, non-root, --cap-drop ALL, --read-only, restart policy') +
      svgClose('Quatre couches indépendantes : l\'échec d\'une ne compromet pas les autres');
  }
});
