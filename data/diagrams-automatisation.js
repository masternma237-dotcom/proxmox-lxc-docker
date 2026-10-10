/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-automatisation.js — Schémas SVG du parcours Automatisation & API
   Préfixe : aut-  (7 diagrammes : aut-api, aut-pvesh, aut-terraform,
   aut-ansible, aut-python, aut-cloudinit, aut-cicd)
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* Authentification API REST : ticket + CSRF vs API Token */
  'aut-api': function () {
    return svgOpen(700, 235, "Authentification de l'API REST Proxmox VE") +
      svgBox(20, 50, 150, 80, '#2c3e50', '#17202a', 'Client\ncurl · pvesh\nSDK Python') +
      svgArrow(170, 90, 220, 90) +
      svgBox(220, 40, 170, 100, '#E57000', '#b85500', 'API REST\nhttps://IP:8006\n/api2/json/…') +
      svgArrow(390, 65, 460, 55) +
      svgBox(460, 25, 210, 60, '#8e44ad', '#6c3483', 'POST /access/ticket\n→ Ticket (2 h) + CSRF token') +
      svgArrow(390, 115, 460, 125) +
      svgBox(460, 95, 210, 60, '#3498db', '#1a6a9e', 'Authorization:\nPVEAPIToken=USER@REALM!ID=SECRET') +
      svgBox(220, 165, 450, 40, '#1a2530', '#0d1117', 'GET lecture · POST/PUT/DELETE écriture (CSRF requis sauf token)') +
      svgLine(305, 140, 305, 165, '#8d97a8', 2) +
      svgText(170, 200, 'Permissions RBAC appliquées à chaque appel', '#8d97a8', 11) +
      svgClose("Deux voies d'authentification : ticket éphémère + CSRF, ou API Token permanent et révocable");
  },

  /* pvesh : verbes CLI mappés sur les méthodes HTTP */
  'aut-pvesh': function () {
    return svgOpen(700, 240, "pvesh : verbes CLI mappés sur les méthodes HTTP") +
      svgBox(20, 70, 140, 90, '#16a085', '#0e6655', 'Shell du nœud\npvesh\n--output-format json') +
      svgBox(210, 15, 150, 44, '#3498db', '#1a6a9e', 'pvesh get → GET') +
      svgBox(210, 69, 150, 44, '#27ae60', '#1a6a3e', 'pvesh create → POST') +
      svgBox(210, 123, 150, 44, '#f39c12', '#b8750d', 'pvesh set → PUT') +
      svgBox(210, 177, 150, 44, '#e74c3c', '#922b21', 'pvesh delete → DELETE') +
      svgArrow(160, 115, 210, 45) +
      svgArrow(160, 115, 210, 90) +
      svgArrow(160, 115, 210, 145) +
      svgArrow(160, 115, 210, 199) +
      svgBox(420, 70, 120, 100, '#E57000', '#b85500', 'API locale\npveproxy\n/api2/json') +
      svgLine(360, 37, 420, 95, '#8d97a8', 2) +
      svgLine(360, 91, 420, 105, '#8d97a8', 2) +
      svgLine(360, 145, 420, 125, '#8d97a8', 2) +
      svgLine(360, 199, 420, 140, '#8d97a8', 2) +
      svgArrow(540, 120, 580, 120) +
      svgBox(580, 70, 100, 100, '#1a2530', '#0d1117', '/nodes\n/qemu · /lxc\n/storage\n/access') +
      svgClose('pvesh reproduit exactement les méthodes HTTP : brouillon idéal du scripting shell');
  },

  /* Cycle Terraform : plan → state → apply → API → ressources */
  'aut-terraform': function () {
    return svgOpen(700, 240, "Cycle Terraform avec le provider bpg/proxmox") +
      svgBox(20, 60, 120, 80, '#2c3e50', '#17202a', 'main.tf\nHCL\nresources') +
      svgArrow(140, 100, 175, 100) +
      svgBox(175, 60, 110, 80, '#f39c12', '#b8750d', 'terraform\nplan\ndiff (lecture)') +
      svgArrow(285, 100, 320, 100) +
      svgBox(320, 60, 115, 80, '#8e44ad', '#6c3483', 'State\nterraform.tfstate\nsource de vérité') +
      svgArrow(435, 100, 470, 100) +
      svgBox(470, 60, 105, 80, '#e74c3c', '#922b21', 'terraform\napply\n(gate humain)') +
      svgArrow(575, 100, 605, 100) +
      svgBox(605, 30, 80, 70, '#E57000', '#b85500', 'API REST\nport 8006') +
      svgArrow(645, 100, 645, 140) +
      svgBox(560, 140, 125, 60, '#27ae60', '#1a6a3e', 'VMs · CTs\nSDN zones / VNets') +
      svgBox(20, 170, 480, 40, '#1a2530', '#0d1117', 'Idempotence : re-run sans changement = 0 ajout · State en backend distant') +
      svgClose('Le state mémorise ce que Terraform gère : plan prévoit, apply exécute via l\'API REST');
  },

  /* Ansible : nœud de contrôle → modules Proxmox → API → objets */
  'aut-ansible': function () {
    return svgOpen(700, 235, "Ansible et les modules community.general Proxmox") +
      svgBox(20, 60, 150, 100, '#8e44ad', '#6c3483', 'Nœud de contrôle\nplaybook YAML\ninventory\nansible-vault') +
      svgArrow(170, 85, 210, 45) +
      svgArrow(170, 110, 210, 110) +
      svgArrow(170, 135, 210, 175) +
      svgBox(210, 20, 185, 50, '#3498db', '#1a6a9e', 'community.general\nproxmox_kvm (VMs)') +
      svgBox(210, 85, 185, 50, '#16a085', '#0e6655', 'community.general\nproxmox (LXC)') +
      svgBox(210, 150, 185, 50, '#f39c12', '#b8750d', 'community.general\nproxmox_template (ISO)') +
      svgArrow(395, 110, 440, 110) +
      svgBox(440, 70, 110, 80, '#E57000', '#b85500', 'API REST\nport 8006\nagentless') +
      svgArrow(550, 95, 585, 75) +
      svgArrow(550, 125, 585, 145) +
      svgBox(585, 45, 95, 55, '#27ae60', '#1a6a3e', 'VMs clonées') +
      svgBox(585, 120, 95, 55, '#2c3e50', '#17202a', 'CTs créés') +
      svgText(350, 225, 'Idempotence : relancer le playbook ne duplique rien · secrets dans Vault', '#8d97a8', 11) +
      svgClose('Ansible pilote Proxmox par l\'API REST sans agent : Terraform provisionne, Ansible configure');
  },

  /* Python : proxmoxer / proxcli → API → réponses JSON */
  'aut-python': function () {
    return svgOpen(700, 210, "Python : proxmoxer et proxcli face à l'API REST") +
      svgBox(20, 30, 170, 60, '#3498db', '#1a6a9e', 'Script Python\nproxmoxer (ProxmoxAPI)') +
      svgBox(20, 120, 170, 60, '#16a085', '#0e6655', 'proxcli\nCLI construite sur proxmoxer') +
      svgArrow(190, 60, 280, 90) +
      svgArrow(190, 150, 280, 120) +
      svgBox(280, 65, 160, 80, '#E57000', '#b85500', 'API REST\nHTTPS : 8006\n/api2/json') +
      svgArrow(440, 85, 490, 60) +
      svgArrow(440, 125, 490, 150) +
      svgBox(490, 30, 190, 55, '#8e44ad', '#6c3483', 'Arborescence miroir\n.nodes().qemu().config') +
      svgBox(490, 125, 190, 55, '#27ae60', '#1a6a3e', 'Réponses JSON\ndictionnaires Python') +
      svgText(350, 185, 'Token en variable d\'environnement · jamais de secret en dur', '#8d97a8', 11) +
      svgClose('proxmoxer transforme chaque endpoint en objet Python : lisibilité et gestion d\'erreurs');
  },

  /* Cloud-init : template → clone → injection → VM prête */
  'aut-cloudinit': function () {
    return svgOpen(700, 235, "Chaîne cloud-init : template, clone, injection, VM prête") +
      svgBox(20, 40, 145, 85, '#E57000', '#b85500', 'Template 9000\nimage cloud\n+ disque CloudInit') +
      svgArrow(165, 82, 200, 82) +
      svgBox(200, 40, 145, 85, '#3498db', '#1a6a9e', 'Clone\nqm clone 9001\n--full 1') +
      svgArrow(345, 82, 380, 82) +
      svgBox(380, 40, 145, 85, '#8e44ad', '#6c3483', 'Injection NoCloud\nciuser · sshkeys\nipconfig0 · runcmd') +
      svgArrow(525, 82, 560, 82) +
      svgBox(560, 40, 120, 85, '#27ae60', '#1a6a3e', 'VM prête\nIP fixe + clés SSH\nagent actif') +
      svgBox(200, 160, 325, 40, '#1a2530', '#0d1117', 'Datasource NoCloud : lecteur CloudInit lu au 1er boot') +
      svgLine(452, 125, 452, 160, '#8d97a8', 2) +
      svgText(350, 222, 'Régénérer le lecteur CloudInit après chaque modification (qm set / GUI)', '#f39c12', 11) +
      svgClose('Un template bien préparé = des clones exploitables dès le premier démarrage');
  },

  /* CI/CD : dépôt Git → pipeline GitLab → API Proxmox */
  'aut-cicd': function () {
    return svgOpen(700, 240, "Pipeline CI/CD intégrant Proxmox (GitOps)") +
      svgBox(20, 60, 120, 60, '#2c3e50', '#17202a', 'Git\ndépôt IaC') +
      svgArrow(140, 90, 175, 90) +
      svgBox(175, 60, 125, 60, '#16a085', '#0e6655', 'Merge request\nrevue + traçabilité') +
      svgArrow(300, 90, 335, 90) +
      svgBox(335, 25, 130, 44, '#3498db', '#1a6a9e', '1. validate (HCL)') +
      svgBox(335, 82, 130, 44, '#f39c12', '#b8750d', '2. plan (diff)') +
      svgBox(335, 139, 130, 44, '#e74c3c', '#922b21', '3. apply (manuel)') +
      svgArrow(400, 69, 400, 82) +
      svgArrow(400, 126, 400, 139) +
      svgArrow(465, 161, 520, 161, '#27ae60') +
      svgBox(520, 135, 160, 55, '#27ae60', '#1a6a3e', 'Proxmox API\nVMs · SDN déployées') +
      svgBox(520, 25, 160, 55, '#8e44ad', '#6c3483', 'Runner GitLab\nvariables protégées\nTF_TOKEN_API') +
      svgLine(600, 80, 600, 135, '#8d97a8', 2) +
      svgText(280, 215, 'GitOps : le dépôt est la source de vérité · apply gated · secrets jamais dans le code', '#8d97a8', 11) +
      svgClose('Changement d\'infrastructure = commit revu, plan relu, apply déclenché par un humain');
  }
});
