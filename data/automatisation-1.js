/* ═══════════════════════════════════════════════════════════════════════════
   data/automatisation-1.js — Parcours AUTOMATISATION & API (sections 57 → 63)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'api-rest',
    track: 'automatisation',
    level: 'avance',
    title: 'API REST Proxmox : authentification, endpoints',
    icon: 'fa-solid fa-code',
    step: '57',
    requires: ['interface-web'],
    description: 'L\'API REST de Proxmox VE expose l\'intégralité des fonctionnalités de l\'interface web en HTTPS sur le port 8006, sous le préfixe /api2/json. Toute opération suit le même schéma : authentification par ticket (POST /api2/json/access/ticket, valable 2 heures) ou par API Token de la forme USER@REALM!TOKENID, puis appels GET en lecture et POST/PUT/DELETE en écriture avec l\'en-tête CSRFPreventionToken. Les endpoints sont hiérarchisés selon l\'arborescence de la GUI : /nodes/{node}, /nodes/{node}/qemu/{vmid}, /storage, /access… Chaque objet manipulé plus tard par Terraform, Ansible ou Python transite par ces mêmes routes, sous les permissions RBAC du compte utilisé. Maîtriser cette section conditionne toutes les suivantes du parcours.',
    cliCommands: [
      `# 1. Obtenir un ticket d'authentification (valable 2 h) puis extraire le CSRF
RESP=$(curl -sk -d "username=<UTILISATEUR>@pam&password=<MOT_DE_PASSE>" \\
  https://<IP_NOEUD>:8006/api2/json/access/ticket)
TICKET=$(echo "$RESP" | jq -r '.data.ticket')
CSRF=$(echo "$RESP" | jq -r '.data.CSRFPreventionToken')

# 2. Appel authentifié par ticket : cookie + en-tête CSRF
curl -sk -b "PVEAuthCookie=$TICKET" \\
  -H "CSRFPreventionToken: $CSRF" \\
  https://<IP_NOEUD>:8006/api2/json/nodes`,
      `# API Token : pas de ticket, pas de CSRF, idéal pour les scripts
curl -sk -H "Authorization: PVEAPIToken=<UTILISATEUR>@pam!<TOKEN_ID>=<TOKEN_SECRET>" \\
  https://<IP_NOEUD>:8006/api2/json/version

# Écriture avec un token : l'en-tête CSRF n'est PAS requis
curl -sk -X POST \\
  -H "Authorization: PVEAPIToken=<UTILISATEUR>@pam!<TOKEN_ID>=<TOKEN_SECRET>" \\
  -d "name=auto-ct&ostemplate=local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst" \\
  https://<IP_NOEUD>:8006/api2/json/nodes/pve1/lxc`,
      `# Explorer la hiérarchie des endpoints (même arborescence que la GUI)
curl -sk -H "Authorization: PVEAPIToken=<UTILISATEUR>@pam!<TOKEN_ID>=<TOKEN_API>" \\
  https://<IP_NOEUD>:8006/api2/json/nodes/pve1/qemu
curl -sk -H "Authorization: PVEAPIToken=<UTILISATEUR>@pam!<TOKEN_ID>=<TOKEN_API>" \\
  https://<IP_NOEUD>:8006/api2/json/nodes/pve1/qemu/100/config
curl -sk -H "Authorization: PVEAPIToken=<UTILISATEUR>@pam!<TOKEN_ID>=<TOKEN_API>" \\
  https://<IP_NOEUD>:8006/api2/json/storage`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Permissions → Users → Add</span> → créer un compte dédié à l'automatisation (auto@pve, realm PVE)",
      "<span class='wb-path'>Datacenter → API Tokens → Add</span> → USER@REALM!TOKENID avec Privilege Separation cochée",
      "<span class='wb-path'>Datacenter → Permissions → Add → API Token Permission</span> → rôle minimal (PVEAuditor en lecture, PVEVMUser pour créer)",
      "<span class='wb-path'>Navigateur → https://IP:8006/api2/json/version</span> → réponse JSON brute : preuve que l'API est vivante",
      "<span class='wb-path'>Datacenter → Permissions</span> → revoir la matrice : utilisateur, token, rôles et chemins"
    ],
    diagram: 'aut-api',
    terminology: ['API REST', 'Endpoint', "Ticket d'authentification", 'CSRF token', 'PVE User', 'RBAC'],
    concepts: [
      { term: 'Endpoint', def: "URI précise de l'API (ex. /nodes/pve1/qemu/100/config) : chaque endpoint combine une méthode HTTP et des paramètres documentés." },
      { term: 'CSRF token', def: "Jeton anti-requête falsifiée (CSRFPreventionToken) renvoyé avec le ticket : obligatoire en en-tête pour toute écriture authentifiée par ticket." },
      { term: 'API Token', def: "Identifiant USER@REALM!TOKENID avec son propre secret et ses propres permissions : révocable sans toucher au compte utilisateur." },
      { term: 'PVE User', def: "Compte interne Proxmox du realm PVE (auto@pve), distinct du compte système root@pam : à dédier aux outils d'automatisation." },
      { term: 'RBAC', def: "Rôle-Based Access Control : chaque appel API hérite des permissions (rôle + chemin) du compte ou du token utilisé." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le secret d'un API Token n'est affiché qu'une seule fois à sa création : copiez-le immédiatement dans votre gestionnaire de secrets. En cas de fuite, révoquez-le dans Datacenter → API Tokens, sans toucher au compte utilisateur." },
      { type: 'info', icon: 'fa-circle-info', text: "Sans Privilege Separation, le token hérite de TOUS les droits de l'utilisateur : cochez toujours la séparation et attribuez un rôle minimal au token lui-même." }
    ],
    table: {
      headers: ['Méthode HTTP', 'Usage', 'En-têtes requis'],
      rows: [
        ['GET', 'Lecture : état, configuration, métriques', 'Ticket (cookie) ou API Token'],
        ['POST', 'Création : VM, CT, clone, ticket, démarrage', 'Ticket + CSRFPreventionToken — ou API Token seul'],
        ['PUT', 'Modification de configuration existante', 'Ticket + CSRFPreventionToken — ou API Token seul'],
        ['DELETE', 'Suppression d\'objets (VM, CT, snapshot…)', 'Ticket + CSRFPreventionToken — ou API Token seul']
      ]
    }
  },

  {
    id: 'pvesh',
    track: 'automatisation',
    level: 'avance',
    title: 'pvesh : CLI de l\'API, scripting',
    icon: 'fa-solid fa-terminal',
    step: '58',
    requires: ['api-rest'],
    description: 'pvesh est le client CLI officiel de l\'API REST : installé sur chaque nœud, il reproduit exactement les endpoints HTTP sans passer par le réseau, ce qui en fait l\'outil idéal du scripting shell local. Les verbes get, create, set et delete correspondent aux méthodes GET, POST, PUT et DELETE, et les paramètres portent les noms exacts de l\'API. Couplé à --output-format json et à jq, il alimente des scripts d\'inventaire, de vérification ou de correction en quelques lignes. Sur le labo CFP-CMD, pvesh sert de brouillon rapide avant d\'industrialiser en Terraform ou en Ansible.',
    cliCommands: [
      `# Explorer les endpoints depuis un nœud
pvesh get /nodes
pvesh get /nodes/pve1/status
pvesh get /nodes/pve1/qemu --output-format json-pretty

# Inventaire JSON des VMs filtré avec jq
pvesh get /nodes/pve1/qemu --output-format json | jq '.data[] | {vmid, name, status}'`,
      `# Écrire via pvesh : verbes create (POST), set (PUT), delete (DELETE)
pvesh create /nodes/pve1/qemu --vmid 130 --name auto-vm \\
  --cores 2 --memory 2048 --net0 virtio,bridge=vmbr0
pvesh set /nodes/pve1/qemu/130 --description "VM creee par pvesh"
pvesh create /nodes/pve1/qemu/130/status/start
pvesh delete /nodes/pve1/qemu/130   # suppression réelle !`,
      `# Authentification explicite avec un API Token (au lieu du compte du shell)
pvesh get /version \\
  --auth-token "PVEAPIToken=auto@pve!<TOKEN_ID>=<TOKEN_SECRET>"

# Aide contextuelle : noms exacts des paramètres d'un endpoint
pvesh help get /nodes/{node}/qemu --verbose`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Shell</span> → pvesh get /nodes : la CLI reflète l'arborescence exacte de l'interface",
      "<span class='wb-path'>Node → Shell</span> → pvesh help <endpoint> --verbose : noms de paramètres documentés",
      "<span class='wb-path'>Datacenter → API Tokens</span> → un token dédié évite d'exécuter les scripts sous root@pam",
      "<span class='wb-path'>Datacenter → Permissions</span> → vérifier le rôle du compte utilisé par le script",
      "<span class='wb-path'>Node → Shell</span> → tester en cascade : pvesh → qm/pct → même résultat"
    ],
    diagram: 'aut-pvesh',
    terminology: ['pvesh', 'Endpoint', 'API REST', "Ticket d'authentification", 'CSRF token', 'GUI'],
    concepts: [
      { term: 'pvesh', def: "Client CLI de l'API REST installé sur chaque nœud : get, create, set, delete, help et usage couvrent tout l'arbre d'endpoints." },
      { term: 'Verbes pvesh', def: "get → GET (lecture), create → POST (création/action), set → PUT (modification), delete → DELETE (suppression)." },
      { term: 'JSON', def: "Format de sortie structurée de l'API : --output-format json rend les réponses exploitables par jq ou un parseur." },
      { term: 'jq', def: "Outil CLI de filtrage JSON : jq '.data[] | {vmid, name}' extrait proprement les champs utiles dans un script." },
      { term: 'Idempotence (scripting)', def: "Un script pvesh bien écrit vérifie l'état avant d'agir : relancer le script ne doit pas créer d'objets en doublon." }
    ],
    alerts: [
      { type: 'info', icon: 'fa-circle-info', text: "--output-format json est indispensable en scripting : la sortie texte par défaut est réservée à la lecture humaine et peut changer entre versions de Proxmox." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "pvesh delete supprime réellement l'objet, sans corbeille ni confirmation : testez toujours vos scripts sur une VM de labo avant de les exécuter en production." }
    ],
    table: {
      headers: ['Verbe pvesh', 'Méthode HTTP', 'Exemple'],
      rows: [
        ['get', 'GET', 'pvesh get /nodes/pve1/qemu'],
        ['create', 'POST', 'pvesh create /nodes/pve1/qemu --vmid 130 …'],
        ['set', 'PUT', 'pvesh set /nodes/pve1/qemu/130 --memory 4096'],
        ['create (action)', 'POST', 'pvesh create /nodes/pve1/qemu/130/status/start'],
        ['delete', 'DELETE', 'pvesh delete /nodes/pve1/qemu/130']
      ]
    }
  },

  {
    id: 'terraform',
    track: 'automatisation',
    level: 'avance',
    title: 'Terraform : provider bpg/proxmox, module SDN',
    icon: 'fa-solid fa-cubes',
    step: '59',
    requires: ['api-rest'],
    description: 'Terraform décrit l\'infrastructure en HCL et la réconcilie avec le réel grâce à son fichier d\'état : c\'est l\'outil de référence de l\'Infrastructure as Code côté Proxmox. Le provider communautaire bpg/proxmox pilote l\'API REST : création de VMs et de conteneurs, clonage de templates, Cloud-init, stockage et même les objets SDN (zones, VNets) via ses ressources dédiées. Le cycle plan → apply garantit la prévisibilité : Terraform calcule un diff, l\'affiche, puis applique les changements de manière idempotente — relancer sans modification ne change rien. Sur le labo, un dépôt Git contenant le code Terraform devient la source de vérité de l\'infrastructure.',
    cliCommands: [
      `# main.tf — provider bpg/proxmox + VM clonée depuis un template cloud-init
terraform {
  required_providers {
    proxmox = { source = "bpg/proxmox", version = ">= 0.55" }
  }
}

provider "proxmox" {
  endpoint  = "https://<IP_NOEUD>:8006/"
  api_token = "<TOKEN_ID>@pam!<TOKEN_SECRET>"   # idéalement via variable TF_
  insecure  = true                              # labo : certificat auto-signé
}

resource "proxmox_virtual_environment_vm" "web" {
  name      = "web-01"
  node_name = "pve1"
  clone {
    vm_id = 9000
  }
  cpu {
    cores = 2
  }
  memory {
    dedicated = 2048
  }
  disk {
    datastore_id = "local-zfs"
    size         = 20
  }
  network_device {
    bridge = "vmbr0"
  }
}`,
      `# Cycle Terraform complet
terraform init                 # télécharge le provider bpg/proxmox
terraform validate             # vérifie la syntaxe HCL
terraform plan -out=tfplan     # calcule le diff (lecture seule)
terraform apply tfplan         # applique via l'API REST
terraform destroy              # (labo) supprime tout ce que gère l'état`,
      `# Le provider pilote aussi le SDN : zones, VNets, subnets
# (ressources disponibles selon la version du provider)
resource "proxmox_virtual_environment_sdn_zone_vlan" "lab" {
  id     = "labzone"
  bridge = "vmbr0"
}

resource "proxmox_virtual_environment_sdn_vnet" "apps" {
  zone = proxmox_virtual_environment_sdn_zone_vlan.lab.id
  tag  = 110
}`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → API Tokens → Add</span> → token dédié à Terraform, séparation des privilèges activée",
      "<span class='wb-path'>Datacenter → Permissions → Add → API Token Permission</span> → rôle minimal (PVEVMAdmin) sur le pool cible",
      "<span class='wb-path'>VM → Summary</span> → après terraform apply, la VM clonée et son lecteur CloudInit apparaissent",
      "<span class='wb-path'>Datacenter → SDN → Zones / VNets</span> → vérifier les objets SDN créés par les ressources dédiées",
      "<span class='wb-path'>VM → Hardware</span> → comparer le matériel réel avec les arguments HCL du fichier main.tf"
    ],
    diagram: 'aut-terraform',
    terminology: ['Terraform', 'bpg/proxmox', 'HCL', 'State Terraform', 'Terraform plan', 'Terraform apply', 'Idempotence'],
    concepts: [
      { term: 'bpg/proxmox', def: "Provider Terraform communautaire de référence : déclare la configuration Proxmox dans main.tf et parle à l'API REST /api2/json." },
      { term: 'HCL', def: "HashiCorp Configuration Language : blocs déclaratifs (terraform, provider, resource, variable) décrivant l'état voulu, pas les commandes." },
      { term: 'State Terraform', def: "terraform.tfstate mémorise les ressources gérées et leurs attributs : base du calcul des diffs — à garder dans un backend distant verrouillé." },
      { term: 'Terraform plan', def: "Étape de calcul du diff entre code HCL et état réel, sans rien modifier : toujours la relire avant d'appliquer." },
      { term: 'Terraform apply', def: "Exécution du diff via l'API : crée, modifie ou détruit les ressources Proxmox, puis met à jour l'état." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "terraform.tfstate contient des secrets (tokens, mots de passe Cloud-init) et fait foi pour le calcul des diffs : stockez-le dans un backend distant verrouillé (PostgreSQL, S3, Consul) et ne le commitez JAMAIS dans Git." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "terraform apply modifie le cluster réel : exécutez toujours plan d'abord, relisez le diff, et en production faites valider l'apply par une revue humaine (gate du pipeline, section 63)." }
    ],
    table: {
      headers: ['Commande', 'Rôle', 'Contacte l\'API Proxmox ?'],
      rows: [
        ['terraform init', 'Télécharge le provider bpg/proxmox, prépare le backend', 'Non (registre + backend)'],
        ['terraform validate', 'Vérifie la syntaxe HCL et la cohérence des blocs', 'Non'],
        ['terraform plan', 'Calcule le diff état ↔ code, écriture impossible', 'Oui (lecture)'],
        ['terraform apply', 'Applique le diff : création / modification / destruction', 'Oui (écriture)'],
        ['terraform destroy', 'Supprime toutes les ressources gérées par l\'état', 'Oui (écriture)']
      ]
    }
  },

  {
    id: 'ansible',
    track: 'automatisation',
    level: 'avance',
    title: 'Ansible : modules Proxmox, playbooks',
    icon: 'fa-solid fa-gears',
    step: '60',
    requires: ['api-rest'],
    description: 'Ansible automatise la configuration par des playbooks YAML exécutés depuis un nœud de contrôle, sans agent sur les cibles : les tâches ciblent un inventory et respectent l\'idempotence. Pour Proxmox, la collection community.general fournit des modules qui passent par l\'API REST : proxmox_kvm crée et pilote les VMs, proxmox gère les conteneurs LXC, proxmox_template télécharge ISO et templates. Le schéma gagnant combine Terraform et Ansible : Terraform provisionne l\'infrastructure, Ansible configure les machines. Les secrets (mots de passe, secrets de tokens) se rangent dans Ansible Vault, jamais en clair dans les playbooks.',
    cliCommands: [
      `# inventory/proxmox.yml — inventaire statique (extrait)
[proxmox_nodes]
pve1 ansible_host=192.168.10.11
pve2 ansible_host=192.168.10.12

[vms]
web-01 ansible_host=10.100.0.21
web-02 ansible_host=10.100.0.22`,
      `# playbook-vm.yml — création d'une VM via community.general.proxmox_kvm
- name: Provisionner une VM sur Proxmox
  hosts: localhost
  gather_facts: false
  vars:
    api_host: <IP_NOEUD>
    api_user: auto@pve
    api_token_id: <TOKEN_ID>
  tasks:
    - name: Cloner le template cloud-init
      community.general.proxmox_kvm:
        api_host: "{{ api_host }}"
        api_user: "{{ api_user }}"
        api_token_id: "{{ api_token_id }}"
        api_token_secret: "{{ vault_token_secret }}"   # vient de Vault
        node: pve1
        clone: ubuntu-2404-template
        newid: 140
        name: web-02
        cores: 2
        memory: 2048
        net: virtio,bridge=vmbr0
        state: present`,
      `# Chiffrer le secret puis lancer le playbook
ansible-galaxy collection install community.general
ansible-vault encrypt_string '<TOKEN_SECRET>' --name vault_token_secret
ansible-playbook -i inventory/proxmox.yml playbook-vm.yml --ask-vault-pass`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Permissions → Users → Add</span> → compte ansible@pve dédié aux playbooks",
      "<span class='wb-path'>Datacenter → Permissions → Add → User Permission</span> → rôle minimal sur le pool ou la plage de VMIDs ciblée",
      "<span class='wb-path'>Datacenter → API Tokens</span> → les modules Proxmox acceptent api_token_id + api_token_secret",
      "<span class='wb-path'>Datacenter → Storage → local</span> → vérifier la présence des ISO/templates téléchargés par proxmox_template",
      "<span class='wb-path'>VM → Summary</span> → suivre la VM créée par le playbook (clonage, démarrage, agent)"
    ],
    diagram: 'aut-ansible',
    terminology: ['Playbook', 'Inventory', 'Variable Ansible', 'Vault', 'Idempotence', 'PVE User'],
    concepts: [
      { term: 'Playbook', def: "Fichier YAML Ansible listant des tasks idempotentes : name, module, arguments, état attendu (present, started, stopped)." },
      { term: 'Inventory', def: "Liste des hôtes ciblés (INI ou YAML) : groupes proxmox_nodes, vms… ou générée dynamiquement par le plugin d'inventaire Proxmox." },
      { term: 'Variable Ansible', def: "Valeurs nommées (vars, group_vars, host_vars, --extra-vars) qui paramètrent les tasks : api_host, vmid, cores…" },
      { term: 'Ansible Vault', def: "Chiffrement des fichiers et variables sensibles : ansible-vault create/encrypt_string, mot de passe vault demandé à l'exécution." },
      { term: 'community.general', def: "Collection officielle regroupant les modules Proxmox : proxmox_kvm, proxmox (LXC), proxmox_template, proxmox_disk…" }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Ne stockez jamais api_token_secret en clair dans un playbook ou un inventaire : utilisez Ansible Vault, ou passez la valeur par une variable protégée du pipeline (section 63)." },
      { type: 'info', icon: 'fa-circle-info', text: "Ansible reste agentless : seule la machine de contrôle a besoin de Python et de la collection community.general (ansible-galaxy collection install community.general)." }
    ],
    table: {
      headers: ['Module / plugin', 'Cible', 'Usage typique'],
      rows: [
        ['community.general.proxmox_kvm', 'VMs KVM', 'Clonage de template, création, démarrage, arrêt (state)'],
        ['community.general.proxmox', 'Conteneurs LXC', 'Création et gestion des CTs (ostemplate, rootfs, net)'],
        ['community.general.proxmox_template', 'Storage local', 'Télécharger ISO et templates LXC sur le nœud'],
        ['community.general.proxmox_disk', 'Disques de VM', 'Redimensionner ou créer des disques attachés'],
        ['Inventaire dynamique proxmox', 'VMs / CTs', 'Découvrir automatiquement les cibles depuis l\'API']
      ]
    }
  },

  {
    id: 'python-sdk',
    track: 'automatisation',
    level: 'avance',
    title: 'Python : proxmoxer, proxcli',
    icon: 'fa-brands fa-python',
    step: '61',
    requires: ['api-rest'],
    description: 'Python s\'interface avec Proxmox via proxmoxer, un client léger qui encapsule l\'API REST : authentification par mot de passe (ticket géré automatiquement) ou par API Token, puis appels orientés objets qui suivent l\'arborescence des endpoints. Les réponses JSON arrivent directement en dictionnaires Python et les erreurs HTTP lèvent des exceptions exploitables. proxcli, construit au-dessus de proxmoxer, offre une CLI prête à l\'emploi pour administrer sans écrire de script. C\'est le choix naturel des équipes qui intègrent Proxmox dans des outils maison : portails, inventaires, bots ou jobs Python.',
    cliCommands: [
      `# Installation dans un environnement virtuel isolé
python3 -m venv .venv && source .venv/bin/activate
pip install proxmoxer requests

# Connexion avec API Token (recommandé pour les scripts)
from proxmoxer import ProxmoxAPI
prox = ProxmoxAPI(
    "<IP_NOEUD>",
    user="auto@pve",
    token_name="<TOKEN_ID>",
    token_value="<TOKEN_SECRET>",
    verify_ssl=False,        # labo : certificat auto-signé
)
print(prox.version.get())`,
      `# Lecture : inventaire des nœuds puis des VMs
for node in prox.nodes.get():
    print(node["node"], node["status"])
for vm in prox.nodes("pve1").qemu.get():
    print(vm["vmid"], vm["name"], vm["status"])

# Écriture : création d'une VM (POST) puis démarrage
prox.nodes("pve1").qemu.post(
    vmid=141, name="py-vm", cores=2, memory=2048,
    net0="virtio,bridge=vmbr0")
prox.nodes("pve1").qemu(141).status.start.post()`,
      `# proxcli : CLI prête à l'emploi construite sur proxmoxer
pip install proxcli
proxcli --help          # sous-commandes disponibles selon la version
proxcli cluster status  # état du cluster via l'API REST`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → API Tokens → Add</span> → token pour le service Python, Privilege Separation cochée",
      "<span class='wb-path'>Datacenter → Permissions → Add → API Token Permission</span> → PVEAuditor pour la lecture, PVEVMUser pour créer",
      "<span class='wb-path'>VM → Summary</span> → vérifier la VM créée par le script (nom, ressources, IP)",
      "<span class='wb-path'>Datacenter → Summary</span> → observer la charge du cluster pendant les scripts (clonages multiples)"
    ],
    diagram: 'aut-python',
    terminology: ['proxmoxer', 'proxcli', 'API REST', 'Endpoint', "Ticket d'authentification", 'PVE User'],
    concepts: [
      { term: 'proxmoxer', def: "Bibliothèque Python encapsulant l'API REST Proxmox : ProxmoxAPI() gère le ticket ou le token, et chaque attribut reproduit un segment d'endpoint." },
      { term: 'proxcli', def: "CLI Python construite sur proxmoxer : commandes d'administration (cluster, VMs) sans écrire de script." },
      { term: 'requests', def: "Bibliothèque HTTP Python utilisée sous le capot par proxmoxer pour dialoguer avec pveproxy en HTTPS." },
      { term: 'Ticket automatique', def: "Avec user + password, proxmoxer obtient et renouvelle seul le ticket d'authentification ; avec un token, aucun ticket n'est nécessaire." },
      { term: 'verify_ssl', def: "Paramètre proxmoxer/requests contrôlant la vérification du certificat : False en labo (certificat auto-signé), à bannir en production." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Ne codez jamais le secret du token en dur dans le script : chargez-le depuis une variable d'environnement (os.environ) ou un gestionnaire de secrets, et remplacez verify_ssl=False par un certificat ACME en production." },
      { type: 'info', icon: 'fa-circle-info', text: "proxmoxer reproduit l'arborescence de l'API : prox.nodes('pve1').qemu(141).config.get() correspond exactement à GET /nodes/pve1/qemu/141/config." }
    ],
    table: {
      headers: ['Mode d\'authentification', 'Atout', 'Limite'],
      rows: [
        ['Mot de passe (ticket auto)', 'Simple à mettre en œuvre, renouvellement géré', 'Expiration 2 h, CSRF géré en interne, secret principal exposé'],
        ['API Token', 'Permissions séparées, révocable, sans CSRF', 'Le secret du token doit être protégé (env var, vault)'],
        ['Backend SSH (paramiko)', 'Fonctionne sans exposition HTTP de l\'API', 'Nécessite un accès SSH au nœud, moins performant']
      ]
    }
  },

  {
    id: 'cloud-init',
    track: 'automatisation',
    level: 'avance',
    title: 'Cloud-init : templates, automatisation VM',
    icon: 'fa-solid fa-cloud',
    step: '62',
    requires: ['creation-vm'],
    description: 'Cloud-init standardise le premier démarrage d\'une VM : hostname, utilisateur, clés SSH, adresse IP et commandes initiales sont injectés par l\'hyperviseur au boot, sans intervention manuelle. Proxmox matérialise ce mécanisme par un disque CloudInit attaché à la VM (datasource NoCloud) dans lequel la GUI ou la CLI écrit la configuration (ciuser, sshkeys, ipconfig0). La stratégie de référence consiste à maintenir une image cloud (Ubuntu, Debian) transformée en template, puis à cloner à volonté : chaque clone reçoit ses propres paramètres et démarre immédiatement exploitable. C\'est la brique commune à toutes les méthodes du parcours : Terraform, Ansible et les scripts Python s\'appuient sur ce même socle.',
    cliCommands: [
      `# 1. Préparer une VM depuis une image cloud puis la convertir en template
qm create 9000 --name ubuntu-tpl --cores 2 --memory 2048 \\
  --net0 virtio,bridge=vmbr0 --agent enabled=1
qm importdisk 9000 noble-server-cloudimg-amd64.img local-zfs
qm set 9000 --scsihw virtio-scsi-single \\
  --scsi0 local-zfs:vm-9000-disk-0,discard=on,ssd=1
qm set 9000 --ide2 local:cloudinit --boot order=scsi0 \\
  --serial0 socket --vga serial0
qm template 9000`,
      `# 2. Cloner puis injecter la configuration à chaque déploiement
qm clone 9000 9001 --name web-01 --full 1
qm set 9001 --ciuser cfp \\
  --sshkeys /root/.ssh/id_ed25519.pub \\
  --ipconfig0 ip=10.100.0.21/24,gw=10.100.0.1
qm start 9001

# Inspecter la configuration cloud-init générée
qm cloudinit dump 9001 vm`,
      `# 3. user-data avancé (format #cloud-config) — consommé par cloud-init
#cloud-config
hostname: web-01
users:
  - name: cfp
    sudo: ALL=(ALL) NOPASSWD:ALL
    shell: /bin/bash
    ssh_authorized_keys:
      - ssh-ed25519 <CLE_PUBLIQUE>
packages:
  - qemu-guest-agent
  - nginx
runcmd:
  - systemctl enable --now qemu-guest-agent`
    ],
    guiSteps: [
      "<span class='wb-path'>VM → Hardware → Add → CloudInit Drive</span> → choisir le storage (local-zfs)",
      "<span class='wb-path'>VM → Cloud-Init</span> → User, Password, DNS domain, SSH public key, Upgrade packages",
      "<span class='wb-path'>VM → Cloud-Init → IP Config</span> → ipconfig0 : DHCP ou IP statique + gateway",
      "<span class='wb-path'>VM → Cloud-Init → Regenerate Image</span> → réécrire le lecteur après chaque modification",
      "<span class='wb-path'>VM → Convert to template</span> → puis Template → Clone pour décliner les déploiements"
    ],
    diagram: 'aut-cloudinit',
    terminology: ['Cloud-init', 'NoCloud', 'Datasource cloud-init', 'Template', 'Linked clone', 'PVE User'],
    concepts: [
      { term: 'NoCloud', def: "Datasource utilisée par Proxmox : la configuration est écrite dans un disque CloudInit (ide2 local:cloudinit) lu par la VM au premier boot." },
      { term: 'Datasource cloud-init', def: "Source des données de configuration (NoCloud, ConfigDrive, EC2…) : détermine où la VM trouve user-data et network-config." },
      { term: 'user-data', def: "Document #cloud-config décrivant hostname, users, packages, runcmd… : YAML interprété par cloud-init au démarrage." },
      { term: 'ipconfig0', def: "Paramètre Proxmox injecté au lecteur CloudInit : ip=DHCP ou ip=ADRESSE/MASQUE,gw=PASSERELLE pour la première NIC." },
      { term: 'Image cloud', def: "Image disque officielle embarquant cloud-init et l'agent QEMU (Ubuntu cloud images, Debian generic-cloud) : la matière première des templates." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Toute modification de la configuration Cloud-init (qm set ou GUI) doit être suivie d'une régénération du lecteur (bouton Regenerate Image, ou redémarrage) : les paramètres ne sont lus qu'au premier boot par la datasource." },
      { type: 'info', icon: 'fa-circle-info', text: "Utilisez uniquement des images « cloud » : les ISO d'installation classiques ne contiennent pas cloud-init et ignorent le lecteur CloudInit (section 04 du parcours Fondamentaux)." }
    ],
    table: {
      headers: ['Clé cloud-init', 'Rôle', 'Exemple'],
      rows: [
        ['hostname', 'Nom de machine de la VM', 'hostname: web-01'],
        ['users', 'Comptes créés au premier boot (sudo, shell)', 'name: cfp + sudo: ALL=(ALL) NOPASSWD:ALL'],
        ['ssh_authorized_keys', 'Clés SSH injectées pour les utilisateurs', 'ssh-ed25519 AAAA…'],
        ['packages', 'Paquets installés au premier démarrage', '- qemu-guest-agent'],
        ['runcmd', 'Commandes exécutées en fin de boot', 'systemctl enable --now nginx'],
        ['write_files', 'Fichiers générés (configs) avant les services', 'path + content + permissions']
      ]
    }
  },

  {
    id: 'cicd',
    track: 'automatisation',
    level: 'avance',
    title: 'CI/CD : intégration Proxmox dans les pipelines',
    icon: 'fa-solid fa-arrows-rotate',
    step: '63',
    requires: ['terraform'],
    description: 'Intégrer Proxmox dans un pipeline CI/CD transforme l\'infrastructure en artefact versionné : un commit Git déclenche la validation HCL, le terraform plan, puis un apply contrôlé vers l\'API REST. Le pattern GitOps fait du dépôt la source de vérité : tout changement d\'infrastructure passe par une merge request, avec revue et traçabilité. Les secrets (tokens, mots de passe Vault) vivent dans les variables protégées du runner, jamais dans le code ni dans les logs. Combiné à Ansible pour la configuration post-provisionnement, le pipeline couvre le cycle complet : créer, configurer, vérifier.',
    cliCommands: [
      `# .gitlab-ci.yml — pipeline Terraform → Proxmox (GitLab CI)
stages: [validate, plan, apply]

# Le secret du token se déclare côté GitLab :
# Settings → CI/CD → Variables → TF_TOKEN_API (Protected + Masked)

tf-validate:
  stage: validate
  image: hashicorp/terraform:1.9
  script:
    - terraform init -backend=false
    - terraform validate

tf-plan:
  stage: plan
  image: hashicorp/terraform:1.9
  script:
    - terraform init
    - terraform plan -out=tfplan
  artifacts:
    paths: [tfplan]
    expire_in: 1 week

tf-apply:
  stage: apply
  image: hashicorp/terraform:1.9
  script:
    - terraform init
    - terraform apply -auto-approve tfplan
  when: manual                # déclenchement humain obligatoire
  environment: production`,
      `# Stage optionnel : post-configuration Ansible après l'apply
tf-ansible:
  stage: apply
  image: cytopia/ansible:latest
  needs: [tf-apply]
  script:
    - ansible-playbook -i inventory/proxmox.yml configure-vms.yml
  when: on_success`,
      `# Variables CI/CD (GitLab → Settings → CI/CD → Variables)
# TF_TOKEN_API            : secret du token Proxmox (Protected + Masked)
# TF_VAR_endpoint         : https://<IP_NOEUD>:8006/
# ANSIBLE_VAULT_PASSWORD  : déverrouillage des secrets Ansible`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Permissions → Users → Add</span> → compte pipeline dédié (ci-cd@pve) pour le runner",
      "<span class='wb-path'>Datacenter → Permissions → Add → User Permission</span> → privilèges minimaux : un pool ou une plage de VMIDs uniquement",
      "<span class='wb-path'>Datacenter → API Tokens</span> → un token par environnement (dev, labo, prod), révocable séparément",
      "<span class='wb-path'>GitLab → Settings → CI/CD → Variables</span> → déclarer TF_TOKEN_API en Protected + Masked",
      "<span class='wb-path'>GitLab → Build → Pipelines</span> → dérouler validate → plan → apply (manuel)"
    ],
    diagram: 'aut-cicd',
    terminology: ['Pipeline', 'GitOps', 'Runner CI', 'Terraform plan', 'Terraform apply', 'Idempotence', 'Vault'],
    concepts: [
      { term: 'Pipeline', def: "Chaîne d'étapes automatisées (validate, plan, apply, post-config) déclenchée par un événement Git : commit ou merge request." },
      { term: 'Runner CI', def: "Agent qui exécute les jobs du pipeline : il détient les variables protégées et contacte l'API Proxmox lors des applies." },
      { term: 'GitOps', def: "Le dépôt Git est la source de vérité : l'infrastructure déclarée en HCL est appliquée par le pipeline après revue de la merge request." },
      { term: 'Backend Terraform', def: "Stockage distant et verrouillé de l'état (PostgreSQL, S3, Consul) : indispensable pour que plusieurs runners ne s'écrasent pas." },
      { term: 'Variables protégées', def: "Secrets déclarés dans GitLab (Protected + Masked) : injectés dans le job en variable d'environnement, masqués dans les logs." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Un pipeline avec -auto-approve peut créer comme détruire l'infrastructure : gardez l'étape apply en when: manual, limitez le token CI à un pool et une plage de VMIDs, et journalisez chaque apply." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Sans backend d'état distant verrouillé, deux runners appliquent en parallèle avec deux états divergents : configurez le backend avant toute industrialisation." }
    ],
    table: {
      headers: ['Stage', 'Rôle', 'Échec possible'],
      rows: [
        ['validate', 'Syntaxe HCL et cohérence des blocs', 'Erreur de syntaxe dans main.tf'],
        ['plan', 'Diff état ↔ code, artefact tfplan conservé', 'Drift détecté (état divergent du code)'],
        ['apply', 'Création réelle via l\'API REST Proxmox', 'Permissions insuffisantes, conflit d\'état'],
        ['post-config (Ansible)', 'Configuration interne des VMs déployées', 'Playbook en échec, secrets Vault manquants'],
        ['tests de fumée', 'Vérifier la VM (ping, ports, agent)', 'VM non joignable, IP incorrecte']
      ]
    }
  }
]);
