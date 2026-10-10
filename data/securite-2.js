/* ═══════════════════════════════════════════════════════════════════════════
   data/securite-2.js — Parcours SÉCURITÉ (sections 19 → 22 : accès et durcissement)
   Guide Interactif Proxmox VE — CFP-CMD · MASTER NMA
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addSections([

  {
    id: 'authentification',
    track: 'securite',
    level: 'avance',
    title: 'Authentification : PAM, PVE, LDAP/AD, 2FA',
    icon: 'fa-solid fa-key',
    step: '19',
    requires: ['pare-feu-proxmox'],
    description: 'Proxmox VE authentifie chaque connexion via un realm : PAM pour les utilisateurs Unix locaux (root@pam), PVE pour la base interne dédiée, LDAP ou Active Directory pour déléguer à l\'annuaire d\'entreprise. La bonne pratique consiste à créer un compte d\'administration nominatif avec un mot de passe d\'au moins 16 caractères, puis à réserver root@pam aux dépannages. La 2FA — TOTP ou WebAuthn — doit être activée pour tous les comptes d\'administration et imposée au niveau du realm (CDC CFP-CMD). Chaque connexion aboutit à un ticket de 2 heures ; pour l\'automatisation, on préfère des API Tokens avec permissions séparées.',
    cliCommands: [
      `# 1. Créer un admin nominatif dans le realm PVE (mot de passe ≥ 16 caractères)
pveum user add admin-cmd@pve --comment 'Admin CFP-CMD' --enable 1
pveum passwd admin-cmd@pve

# 2. Lister les realms disponibles
pveum realm list`,
      `# 3. Ajouter un realm LDAP (--type ad pour Active Directory)
pveum realm add corp-ldap --type ldap \\
  --server1 ldaps://dc01.corp.local \\
  --base-dn 'OU=Users,DC=corp,DC=local' \\
  --user-attr sAMAccountName

# 4. Tester la synchronisation de l'annuaire
pveum realm sync corp-ldap --dry-run`,
      `# 5. 2FA : TOTP sur le compte, puis obligation sur tout le realm
pveum tfa add admin-cmd@pve --type totp --description 'TOTP admin'
pveum realm modify pve --tfa 'type=two-factor'`
    ],
    guiSteps: [
      "<span class='wb-path'>https://IP:8006</span> → Login : choisir le realm (PAM, PVE, LDAP) et saisir le code TOTP",
      "<span class='wb-path'>Datacenter → Permissions → Users</span> → Add : utilisateur, realm, mot de passe, expiration",
      "<span class='wb-path'>Datacenter → Permissions → Realms</span> → Add : LDAP / AD (serveur, base DN, attribut)",
      "<span class='wb-path'>Datacenter → Permissions → Two Factor</span> → Add TOTP : scanner le QR code avec l'application authenticator",
      "<span class='wb-path'>Datacenter → Permissions → Realms → Edit</span> → TFA : type=two-factor (obligatoire pour les admins)"
    ],
    diagram: 'sec-auth',
    terminology: ['PAM', 'Realm', 'LDAP', '2FA', 'TOTP', 'Port 8006'],
    concepts: [
      { term: 'root@pam', def: "Superadministrateur Unix local : à réserver aux urgences, jamais partagé ni utilisé pour l'administration quotidienne." },
      { term: 'Compte nominatif', def: "Un compte par administrateur : traçabilité des actions dans les logs, révocation individuelle, audit propre." },
      { term: 'Mot de passe maître', def: "≥ 16 caractères (CDC) : privilégier la longueur (phrase de passe) et l'unicité plutôt que la complexité seule." },
      { term: 'WebAuthn', def: "Second facteur matériel ou biométrique (clé USB, Touch ID) plus résistant au phishing que TOTP ; TOTP reste le standard du labo." },
      { term: 'API Token', def: "Identifiant USER@REALM!TOKENID avec permissions séparées de l'utilisateur : conçu pour Terraform, Ansible et les scripts." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "N'imposez jamais la 2FA sur un realm avant d'avoir enrollé au moins DEUX administrateurs : en cas de perte du téléphone, la GUI resterait inaccessible (le CLI root@pam serait le seul recours)." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "LDAP/AD : testez toujours la synchronisation en --dry-run et conservez un compte PVE local actif en secours si l'annuaire tombe." }
    ],
    table: {
      headers: ['Realm', 'Source des comptes', '2FA', 'Usage recommandé'],
      rows: [
        ['PAM', 'Utilisateurs Unix (/etc/shadow)', 'TOTP, WebAuthn', 'root + compte de secours'],
        ['PVE', 'Base interne Proxmox', 'TOTP, WebAuthn', 'Admins et étudiants du labo'],
        ['LDAP', 'Annuaire OpenLDAP', 'Selon annuaire', 'Entreprise avec annuaire Linux'],
        ['AD', 'Active Directory', 'Selon politique AD', 'Entreprise Windows'],
        ['OpenID', 'Fournisseur externe (SSO)', 'Selon IdP', 'SSO entreprise avancé']
      ]
    }
  },

  {
    id: 'rbac',
    track: 'securite',
    level: 'avance',
    title: 'RBAC : utilisateurs, groupes, rôles, permissions',
    icon: 'fa-solid fa-user-shield',
    step: '20',
    requires: ['authentification'],
    description: 'Le RBAC de Proxmox croise trois briques : un sujet (utilisateur, groupe ou API Token), un rôle (ensemble de privilèges) et un chemin d\'ACL (/ pour tout le datacenter, /nodes/pve1, /vms/100, /storage/local…). Les permissions se propagent de haut en bas et se combinent par union : un utilisateur hérite des droits de ses groupes et de chacun de ses rôles sur chaque chemin. On privilégie les rôles intégrés (PVEVMUser, PVEAuditor) ou un rôle personnalisé minimal, attribués à des groupes plutôt qu\'aux utilisateurs. Au CFP-CMD, chaque étudiant reçoit un rôle limité sur /vms/<id> ou sur un pool, jamais sur /.',
    cliCommands: [
      `# 1. Groupe + utilisateur
pveum group add etudiants --comment 'Étudiants CFP-CMD'
pveum user add etu1@pve --group etudiants

# 2. Rôle personnalisé minimal (privilèges précis)
pveum role add Etudiant --privs VM.Audit VM.PowerMgmt VM.Console Datastore.AllocateSpace

# 3. Attributions ACL (chemin + sujet + rôle)
pveum acl modify /vms/100 --users etu1@pve --roles PVEVMUser
pveum acl modify / --groups etudiants --roles PVEAuditor
pveum acl modify /pool/lab1 --groups etudiants --roles Etudiant`,
      `# 4. Vérifier utilisateurs, rôles et ACL effectives
pveum user list
pveum role list
pveum acl list`
    ],
    guiSteps: [
      "<span class='wb-path'>Datacenter → Permissions → Users</span> → Add : créer etu1@pve",
      "<span class='wb-path'>Datacenter → Permissions → Groups</span> → Créer le groupe etudiants et y ajouter les membres",
      "<span class='wb-path'>Datacenter → Permissions → Roles</span> → Consulter les rôles intégrés ou créer un rôle minimal",
      "<span class='wb-path'>Datacenter → Permissions → Add → User Permission</span> → Chemin /vms/100, utilisateur etu1@pve, rôle PVEVMUser",
      "<span class='wb-path'>Datacenter → Permissions → Add → Group Permission</span> → Chemin /, groupe etudiants, rôle PVEAuditor",
      "<span class='wb-path'>VM → Permissions</span> → Vérifier la permission effective sur l'objet"
    ],
    diagram: 'sec-rbac',
    terminology: ['RBAC', 'PVEVMUser', 'PVEAuditor', 'Realm', 'PAM'],
    concepts: [
      { term: 'Chemin d\'ACL', def: "Arborescence d'objets du datacenter : /, /nodes/{node}, /vms/{vmid}, /storage/{storeid}, /pool/{poolid}, /sdn/…" },
      { term: 'Union des permissions', def: "Les droits s'additionnent entre groupes et chemins mais ne se soustraient jamais : pour restreindre, il faut changer de chemin." },
      { term: 'Groupe avant utilisateur', def: "Attribuer les rôles à des groupes : maintenance, onboarding et audit nettement plus simples qu'avec des ACL individuelles." },
      { term: 'Privilège', def: "Unité atomique de permission (VM.PowerMgmt, Datastore.AllocateSpace, Sys.Console…) qui compose les rôles." },
      { term: 'Pool', def: "Conteneur logique regroupant VMs et CTs partageable par ACL (/pool/<id>) : idéal pour les projets étudiants." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "N'attribuez jamais un rôle à tous privilèges (Administrator) sur / à un compte automatisé : créez un rôle dédié avec les privilèges exacts du cas d'usage." },
      { type: 'info', icon: 'fa-circle-info', text: "L'option Propagate d'une ACL peut être décochée pour appliquer un rôle au chemin seul, sans descendre sur les objets enfants." }
    ],
    table: {
      headers: ['Rôle intégré', 'Portée des droits', 'Typique pour'],
      rows: [
        ['PVEAuditor', 'Lecture seule sur tous les objets', 'Supervision, audit'],
        ['PVEVMUser', 'VM : power, console, snapshot d\'usage', 'Étudiants, exploitants'],
        ['PVEVMAdmin', 'VM : configuration, migration, snapshots', 'Admins de VMs'],
        ['PVEDatastoreAdmin', 'Storages : créer/supprimer volumes', 'Admins stockage'],
        ['PVESysAdmin', 'Nœuds : services, logs, console hôte', 'Admins système'],
        ['PVEAdmin', 'Presque tout sauf modifier les permissions', 'Admins intermédiaires']
      ]
    }
  },

  {
    id: 'certificats',
    track: 'securite',
    level: 'avance',
    title: "Certificats : ACME, Let's Encrypt, certificats internes",
    icon: 'fa-solid fa-certificate',
    step: '21',
    requires: ['authentification'],
    description: 'Par défaut, pveproxy sert l\'interface en HTTPS sur le port 8006 avec un certificat auto-signé, source d\'alertes navigateur. Proxmox intègre un client ACME : on enregistre un compte Let\'s Encrypt, on déclare le FQDN du nœud, puis le certificat est émis et renouvelé automatiquement environ 30 jours avant expiration. Le challenge HTTP-01 exige que le port 80 du nœud soit joignable depuis Internet ; en réseau fermé, le challenge DNS-01 via un plugin (API du registrar) ou une ACME interne fait le travail. Les certificats internes d\'entreprise restent possibles en déposant manuellement la clé et le CRT émis par la PKI.',
    cliCommands: [
      `# 1. Enregistrer un compte ACME (accepter les ToS)
pvenode acme account register default admin@cfp-cmd.local

# 2. Déclarer les domaines du nœud
pvenode config set --acme domains=pve1.cfp-cmd.local

# 3. Commander (ou renouveler) le certificat
pvenode acme cert order

# 4. Vérifier le certificat installé
pvenode cert info`,
      `# Certificat interne d'entreprise (CRT + clé fournis par la PKI)
pvenode cert set pve1.crt pve1.key --force --restart

# Recharger pveproxy si nécessaire (sinon automatique)
systemctl restart pveproxy`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Certificates</span> → ACME Account → Edit → Register/Use account (e-mail + ToS)",
      "<span class='wb-path'>Node → Certificates</span> → ACME Domains → Add : pve1.cfp-cmd.local, Challenge Type HTTP-01",
      "<span class='wb-path'>Node → Certificates</span> → Order Certificate Now → attendre le TASK OK",
      "<span class='wb-path'>Node → Certificates</span> → Upload Custom Certificate (PKI interne : CRT + clé)",
      "<span class='wb-path'>https://pve1.cfp-cmd.local:8006</span> → Cadenas valide, plus d'alerte navigateur"
    ],
    diagram: 'sec-acme',
    terminology: ['ACME', 'ACME Challenge', 'Port 8006', 'FQDN'],
    concepts: [
      { term: 'Auto-signé', def: "Certificat généré à l'installation : le chiffrement est correct mais aucune identité n'est vérifiée — d'où l'alerte navigateur." },
      { term: 'HTTP-01', def: "Let's Encrypt interroge http://<fqdn>/.well-known/acme-challenge/ : le port 80 doit être ouvert en entrée du nœud." },
      { term: 'DNS-01', def: "Preuve par enregistrement TXT _acme-challenge via un plugin DNS : aucune exposition Internet requise et gestion des wildcards." },
      { term: 'Renouvellement', def: "Planification quotidienne intégrée : renouvellement automatique ~30 jours avant échéance, rechargement de pveproxy sans coupure." }
    ],
    alerts: [
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le challenge HTTP-01 exige le port 80 ouvert au monde : sur un labo non exposé, préférez DNS-01 ou une ACME interne, et ne NATtez jamais le port 8006 vers Internet." },
      { type: 'info', icon: 'fa-circle-info', text: "Après un order, pveproxy recharge le certificat à chaud : aucun redémarrage des VMs ni du nœud n'est nécessaire." }
    ],
    table: {
      headers: ['Critère', 'HTTP-01', 'DNS-01'],
      rows: [
        ['Prérequis réseau', 'Port 80 joignable depuis Internet', 'API registrar / serveur DNS'],
        ['Exposition du nœud', 'Oui (80 en entrée)', 'Aucune'],
        ['Wildcard', 'Non', 'Oui'],
        ['Plugin requis', 'Aucun (standalone)', 'Plugin DNS du registrar'],
        ['Cas CFP-CMD', 'Labo exposé (si autorisé)', 'Réseau fermé (recommandé)']
      ]
    }
  },

  {
    id: 'durcissement',
    track: 'securite',
    level: 'avance',
    title: 'Durcissement : SSH, fail2ban, mises à jour',
    icon: 'fa-solid fa-lock',
    step: '22',
    requires: ['rbac'],
    description: 'Le durcissement du nœud Proxmox repose sur quatre piliers : SSH restreint aux clés, fail2ban contre le brute-force, mises à jour régulières et 2FA obligatoire pour les administrateurs. Sur SSH, on interdit l\'authentification par mot de passe (PasswordAuthentication no) et on limite les tentatives ; fail2ban bannit les IP qui échouent sur SSH ou sur l\'interface du port 8006. Les mises à jour passent par des dépôts maîtrisés (no-subscription au labo) selon un cycle hebdomadaire documenté, avec une fenêtre de reboot planifiée pour le noyau. Enfin, AppArmor confine les conteneurs LXC et réduit l\'impact d\'une évasion potentielle.',
    cliCommands: [
      `# 1. Durcissement SSH — /etc/ssh/sshd_config.d/99-hardening.conf
cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
LoginGraceTime 20
X11Forwarding no
EOF
sshd -t && systemctl reload ssh`,
      `# 2. fail2ban : bannir les IP après échecs répétés (SSH + GUI 8006)
apt install -y fail2ban

cat > /etc/fail2ban/filter.d/proxmox.conf <<'EOF'
[Definition]
failregex = pvedaemon\\[.*authentication failure; rhost=<HOST> user=.*
ignoreregex =
EOF

cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled  = true
port     = 22
maxretry = 3
bantime  = 3600

[proxmox]
enabled  = true
port     = 8006
filter   = proxmox
logpath  = /var/log/daemon.log
maxretry = 3
bantime  = 3600
EOF

systemctl restart fail2ban && fail2ban-client status sshd`,
      `# 3. Mises à jour maîtrisées (cycle hebdomadaire au labo)
apt update && apt full-upgrade -y
pveversion   # vérifier la version après montée

# 4. Confinement AppArmor des conteneurs LXC
aa-status | head -10
pct config 200 | grep -i apparmor   # profil 'generated' par défaut`
    ],
    guiSteps: [
      "<span class='wb-path'>Node → Shell</span> → Déposer la clé publique (ssh-copy-id) puis appliquer 99-hardening.conf",
      "<span class='wb-path'>Node → Shell</span> → apt install fail2ban, jails sshd + proxmox, fail2ban-client status",
      "<span class='wb-path'>Node → Updates → Repositories</span> → Vérifier les dépôts (no-subscription au labo)",
      "<span class='wb-path'>Node → Updates</span> → Refresh puis Upgrade (cycle hebdomadaire documenté)",
      "<span class='wb-path'>Datacenter → Permissions → Two Factor</span> → 2FA TOTP pour tous les admins (CDC)"
    ],
    diagram: 'sec-hardening',
    terminology: ['SSH key-only', 'fail2ban', 'AppArmor', '2FA', 'PAM', 'Port 8006'],
    concepts: [
      { term: 'Clé ed25519', def: "Format SSH moderne recommandé : ssh-keygen -t ed25519, passphrase sur la clé, déploiement par ssh-copy-id vers le nœud." },
      { term: 'Bannissement', def: "fail2ban lit les logs et bannit par iptables : calibrer maxretry et bantime selon l'audience (3600 s au labo)." },
      { term: 'Cycle de mise à jour', def: "apt full-upgrade planifié + fenêtre de reboot pour le noyau : documenter les deltas avant/après (CDC)." },
      { term: 'Surface minimale', def: "Moins de services exposés = moins de risques : auditer régulièrement avec ss -tulpn ce qui écoute sur le nœud." }
    ],
    alerts: [
      { type: 'danger', icon: 'fa-bolt', text: "Ouvrez une NOUVELLE session SSH après avoir posé PasswordAuthentication no : se couper avant d'avoir validé la clé est l'erreur n°1 du durcissement." },
      { type: 'warning', icon: 'fa-triangle-exclamation', text: "Le port 8006 ne doit jamais être publié sur Internet : accès via VPN ou réseau de management uniquement (CDC CFP-CMD)." }
    ],
    table: {
      headers: ['Pilier', 'Mesure', 'Vérification'],
      rows: [
        ['SSH', 'Clé seule, MaxAuthTries 3', 'sshd -t + nouvelle session'],
        ['Brute-force', 'fail2ban jails sshd + proxmox', 'fail2ban-client status'],
        ['Mises à jour', 'apt full-upgrade hebdomadaire', 'pveversion, journal apt'],
        ['2FA', 'TOTP imposée aux admins', 'Connexion GUI de test'],
        ['Mots de passe', '≥ 16 caractères (CDC)', 'Politique realm + audit'],
        ['LXC', 'AppArmor generated', 'aa-status, pct config']
      ]
    }
  }
]);
