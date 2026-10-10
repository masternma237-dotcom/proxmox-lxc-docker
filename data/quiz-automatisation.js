/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-automatisation.js — Banques de quiz du parcours Automatisation & API
   Format : [question, [options], indexBonneRéponse, explication]
   (questions et options sont mélangées au rendu par le moteur quiz.js)
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'api-rest': [
    ["Quel endpoint fournit un ticket d'authentification API ?",
     ["POST /api2/json/access/ticket", "GET /api2/json/version", "POST /api2/json/nodes", "GET /api2/json/access/users"], 0,
     "Le ticket s'obtient par POST /api2/json/access/ticket avec username et password : il est valable 2 heures."],
    ["Quel en-tête ajoute-t-on aux requêtes POST/PUT/DELETE authentifiées par ticket ?",
     ["CSRFPreventionToken", "X-Forwarded-For", "Bearer", "Content-Hash"], 0,
     "Le CSRF token (renvoyé avec le ticket) protège contre les requêtes falsifiées : obligatoire pour toute écriture via ticket."],
    ["Quelle syntaxe identifie un API Token Proxmox ?",
     ["USER@REALM!TOKENID", "USER-REALM.TOKENID", "REALM!USER=TOKENID", "token://USER@REALM"], 0,
     "Un API Token s'écrit utilisateur@realm!tokenid (ex. auto@pve!terraform) et se signe avec son secret."],
    ["Quel avantage offre l'API Token face au mot de passe utilisateur ?",
     ["Permissions séparées et révocable sans toucher au compte", "Il contourne le pare-feu", "Il ne demande pas de HTTPS", "Il n'expire jamais et remplace RBAC"], 0,
     "Le token possède ses propres permissions (Privilege Separation) et se révoque indépendamment du compte utilisateur."]
  ],

  'pvesh': [
    ["Quel verbe pvesh correspond à la méthode HTTP POST ?",
     ["create", "set", "get", "delete"], 0,
     "pvesh mappe get → GET, create → POST, set → PUT, delete → DELETE : les paramètres portent les noms exacts de l'API."],
    ["Quelle option force une sortie JSON exploitable par jq ?",
     ["--output-format json", "--json", "-o json", "--format=json"], 0,
     "--output-format json (ou json-pretty) rend les réponses structurées et stables pour le scripting."],
    ["Où pvesh est-il disponible nativement ?",
     ["Sur chaque nœud Proxmox VE", "Uniquement sur un poste d'administration Windows", "Dans l'interface web du navigateur", "Sur Proxmox Backup Server seulement"], 0,
     "pvesh est installé sur chaque nœud : il parle à l'API locale sans exposer le trafic sur le réseau."],
    ["Que fait pvesh delete /nodes/pve1/qemu/130 ?",
     ["Il supprime réellement la VM 130", "Il met la VM 130 en pause", "Il liste la configuration de la VM 130", "Il renomme la VM 130"], 0,
     "delete exécute la méthode DELETE : suppression immédiate, sans confirmation ni corbeille — prudence en production."]
  ],

  'terraform': [
    ["Quel provider est la référence communautaire pour piloter Proxmox avec Terraform ?",
     ["bpg/proxmox", "hashicorp/proxmox", "terraform-proxmox-official", "pve/vm"], 0,
     "Le provider bpg/proxmox est celui de référence : source = \"bpg/proxmox\" dans le bloc required_providers."],
    ["Que calcule terraform plan ?",
     ["Le diff entre l'état et le code, sans rien modifier", "Il applique directement les changements", "Il supprime le fichier d'état", "Il télécharge le provider bpg/proxmox"], 0,
     "plan compare l'état (tfstate) au code HCL et affiche les actions prévues : création, modification, destruction."],
    ["Pourquoi ne jamais commiter terraform.tfstate dans Git ?",
     ["Il contient des secrets et fait foi pour les diffs", "Git refuse les fichiers JSON", "Il expire après 24 heures", "Il est trop volumineux pour un dépôt"], 0,
     "L'état embarque des secrets (tokens, mots de passe Cloud-init) et sert de base au calcul des diffs : backend distant verrouillé obligatoire."],
    ["Que signifie l'idempotence du cycle plan/apply ?",
     ["Relancer sans changement ne modifie rien", "Chaque apply recrée toutes les VMs", "L'état est chiffré automatiquement", "L'API est toujours appelée deux fois"], 0,
     "Si le code HCL et l'état concordent, apply ne fait rien : répétition prévisible et sûre du pipeline."]
  ],

  'ansible': [
    ["Quel module community.general crée et pilote des VMs KVM ?",
     ["community.general.proxmox_kvm", "community.general.pve_vm", "ansible.builtin.proxmox_vm", "community.vmware.proxmox"], 0,
     "proxmox_kvm clone, crée, démarre ou arrête les VMs via l'API REST (api_host, api_user, api_token…)."],
    ["Que contient un inventory Ansible ?",
     ["La liste des hôtes ciblés, organisée en groupes", "Les mots de passe chiffrés", "La liste des modules installés", "Le journal d'exécution des tasks"], 0,
     "L'inventaire (statique INI/YAML ou dynamique via le plugin Proxmox) liste les hôtes et groupes ciblés par les playbooks."],
    ["Quel outil chiffre les secrets dans Ansible ?",
     ["ansible-vault", "ansible-crypt", "openssl-vault", "git-crypt uniquement"], 0,
     "ansible-vault (create, encrypt_string) chiffre fichiers et variables sensibles ; le mot de passe vault se saisit à l'exécution (--ask-vault-pass)."],
    ["Que garantit l'idempotence d'un playbook ?",
     ["Relancer le playbook ne change rien si l'état est conforme", "Le playbook s'exécute plus vite", "Les variables sont chiffrées", "L'inventaire se met à jour automatiquement"], 0,
     "Chaque task décrit un état attendu : si l'état est déjà atteint, Ansible ne fait rien — d'où des relances sans effet de bord."]
  ],

  'python-sdk': [
    ["Quelle bibliothèque Python encapsule l'API REST Proxmox ?",
     ["proxmoxer", "pveapi", "proxlib", "requests-proxmox"], 0,
     "proxmoxer s'installe avec pip et expose ProxmoxAPI : ticket ou API Token gérés, endpoints en syntaxe objet."],
    ["Comment proxmoxer navigue-t-il dans l'API ?",
     ["En reproduisant l'arborescence des endpoints en objets Python", "Avec des requêtes SQL sur la base Proxmox", "Uniquement via SSH sur le nœud", "En lisant des fichiers YAML locaux"], 0,
     "prox.nodes('pve1').qemu(141).config.get() correspond exactement à GET /nodes/pve1/qemu/141/config."],
    ["Quel avantage a l'API Token face au mot de passe dans un script ?",
     ["Permissions séparées et révocation sans toucher au compte", "Il accélère le réseau", "Il contourne le certificat auto-signé", "Il supprime le besoin de HTTPS"], 0,
     "Le token a ses propres permissions (Privilege Separation) et se révoque seul : idéal pour les services automatisés."],
    ["Qu'est-ce que proxcli ?",
     ["Une CLI construite sur proxmoxer", "Un module Ansible officiel", "Le nom interne de l'API v2", "Un outil de sauvegarde de PBS"], 0,
     "proxcli s'appuie sur proxmoxer pour offrir des commandes d'administration prêtes à l'emploi (cluster, VMs)."]
  ],

  'cloud-init': [
    ["Quelle datasource Proxmox utilise-t-il pour le disque CloudInit ?",
     ["NoCloud", "EC2", "Azure", "OpenStack"], 0,
     "Proxmox écrit la configuration dans un disque CloudInit (ide2 local:cloudinit) consommé par la datasource NoCloud au premier boot."],
    ["Quand la configuration cloud-init est-elle lue par la VM ?",
     ["Au premier démarrage de la VM", "À chaque snapshot", "Toutes les heures", "Au clonage, jamais exécutée"], 0,
     "cloud-init s'exécute au boot (principalement le premier) et applique hostname, utilisateurs, clés SSH et réseau."],
    ["Quelle commande injecte utilisateur, clés SSH et IP sur une VM ?",
     ["qm set 9001 --ciuser cfp --sshkeys k.pub --ipconfig0 ip=10.100.0.21/24,gw=10.100.0.1", "qm cloudinit push 9001", "pct set 9001 --ciuser cfp", "pvesh inject --vmid 9001"], 0,
     "qm set alimente la configuration cloud-init de la VM : ciuser, sshkeys, ipconfig0 — puis régénération du lecteur."],
    ["Quel type d'image faut-il pour bénéficier de cloud-init ?",
     ["Une image cloud (ex. Ubuntu cloud image, Debian generic-cloud)", "Une ISO d'installation classique", "N'importe quelle ISO Windows", "Un template LXC Debian"], 0,
     "Les images cloud embarquent cloud-init, l'agent QEMU et la console série : les ISO classiques ignorent le lecteur CloudInit."]
  ],

  'cicd': [
    ["Qu'est-ce que le pattern GitOps appliqué à Proxmox ?",
     ["Le dépôt Git est la source de vérité appliquée par pipeline", "Git remplace l'hyperviseur", "Les sauvegardes sont stockées dans Git", "On versionne les ISO du cluster"], 0,
     "L'infrastructure est déclarée en code (HCL) : tout changement passe par un commit revu, appliqué par le pipeline via l'API REST."],
    ["Pourquoi garder l'étape apply en when: manual dans GitLab CI ?",
     ["Pour valider humainement le diff avant modification réelle", "Parce que le runner est trop lent", "Pour économiser des minutes de pipeline", "Parce que plan ne fonctionne pas automatisé"], 0,
     "L'apply modifie le cluster réel : le gate humain laisse relire le plan et évite les destructions accidentelles."],
    ["Où stocker le secret du token Proxmox dans GitLab CI ?",
     ["Dans une variable CI protégée et masquée", "En dur dans .gitlab-ci.yml", "Dans le README du dépôt", "Dans le nom du runner"], 0,
     "Les variables Protected + Masked sont injectées en environnement du job et masquées dans les logs — jamais dans le code."],
    ["Que risque-t-on sans backend d'état distant verrouillé ?",
     ["Deux applies parallèles avec des états divergents", "Rien, c'est purement cosmétique", "Le plan devient impossible", "Le runner perd l'accès réseau"], 0,
     "Sans backend distant (PostgreSQL, S3, Consul) avec verrou, plusieurs runners appliquent des états divergents : corruption garantie."]
  ]
});
