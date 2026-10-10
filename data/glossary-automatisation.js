/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-automatisation.js — Glossaire du parcours Automatisation & API
   20 termes complémentaires du glossaire Fondamentaux (pas de redéfinition :
   Terraform, API REST, Cloud-init, pvesh, Ticket d'authentification… déjà là).
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'Endpoint': "URI précise d'une API REST (ex. /nodes/pve1/qemu/100/config) : chaque endpoint combine une méthode HTTP et des paramètres documentés.",
  'CSRF token': "Jeton anti-requête falsifiée (CSRFPreventionToken) renvoyé avec le ticket : obligatoire en en-tête des requêtes POST/PUT/DELETE authentifiées par ticket.",
  'bpg/proxmox': "Provider Terraform communautaire de référence pour Proxmox VE : crée VMs, conteneurs, stockage et objets SDN via l'API REST.",
  'State Terraform': "Fichier terraform.tfstate mémorisant les ressources réellement gérées et leurs attributs : base du calcul des diffs, à stocker dans un backend distant verrouillé.",
  'HCL': "HashiCorp Configuration Language — langage déclaratif de Terraform : blocs provider, resource, variable décrivant l'état voulu de l'infrastructure.",
  'Playbook': "Fichier YAML Ansible listant des tasks idempotentes (module, arguments, état attendu) appliquées aux hôtes d'un inventory.",
  'Inventory': "Inventaire Ansible : liste des hôtes ciblés, statique (INI/YAML) ou dynamique (plugin Proxmox), organisée en groupes pour les playbooks.",
  'proxmoxer': "Bibliothèque Python encapsulant l'API REST Proxmox : authentification ticket ou API Token, endpoints appelés en syntaxe orientée objets.",
  'proxcli': "CLI Python construite sur proxmoxer : commandes d'administration Proxmox (cluster, VMs) prêtes à l'emploi, sans écrire de script.",
  'NoCloud': "Datasource cloud-init utilisée par Proxmox : la configuration est écrite dans le disque CloudInit attaché à la VM et lue au premier démarrage.",
  'Datasource cloud-init': "Source des données de configuration cloud-init (NoCloud, ConfigDrive, EC2…) : détermine où la VM trouve user-data et network-config.",
  'Pipeline': "Chaîne automatisée d'étapes CI/CD (build, validate, plan, apply, tests) déclenchée par un événement Git : commit ou merge request.",
  'GitOps': "Pratique où le dépôt Git est la source de vérité : tout changement d'infrastructure passe par un commit revu, appliqué par le pipeline vers l'API cible.",
  'Idempotence': "Propriété d'une opération qui produit le même résultat répétée plusieurs fois : socle des playbooks Ansible et du cycle plan/apply de Terraform.",
  'Terraform plan': "Étape (terraform plan) calculant le diff entre l'état enregistré et le code HCL, sans rien modifier ; l'artefact peut être conservé pour l'apply.",
  'Terraform apply': "Étape (terraform apply) appliquant le diff calculé via l'API REST de Proxmox : crée, modifie ou détruit les ressources, puis met à jour l'état.",
  'Variable Ansible': "Valeur nommée paramétrant un playbook (vars, group_vars, host_vars, --extra-vars) : évite la duplication dans les tasks.",
  'Vault': "Fonction Ansible (ansible-vault) chiffrant fichiers et variables sensibles (mots de passe, secrets de tokens) grâce à un mot de passe vault.",
  'Runner CI': "Agent exécutant les jobs du pipeline (ex. GitLab Runner) : il détient les variables protégées et contacte l'API Proxmox lors des applies.",
  'PVE User': "Compte utilisateur interne Proxmox du realm PVE (ex. auto@pve), géré dans /etc/pve/user.cfg : à dédier aux outils d'automatisation, distinct de root@pam."
});
