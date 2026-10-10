/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-securite.js — Glossaire (parcours SÉCURITÉ)
   24 termes spécifiques — ne redéfinit JAMAIS les termes de glossary-fondamentaux.js
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'Pare-feu Proxmox': "Pare-feu stateful intégré basé sur iptables/nftables, piloté par le service pve-firewall et configurable aux trois niveaux datacenter, nœud et VM/CT.",
  'cluster.fw': "Fichier de configuration global du pare-feu (/etc/pve/firewall/cluster.fw) : options, politiques, règles, groupes et IP sets partagés par tout le cluster.",
  'policy_in': "Politique par défaut appliquée au trafic entrant d'un objet lorsqu'aucune règle ne correspond (DROP conseillé au labo CFP-CMD).",
  'policy_out': "Politique par défaut appliquée au trafic sortant d'un objet lorsqu'aucune règle ne correspond (ACCEPT conseillé pour ne pas casser apt/DNS).",
  'DROP': "Action de pare-feu qui jette le paquet silencieusement : aucune réponse n'est retournée à l'émetteur (furtivité, scans ralentis).",
  'REJECT': "Action de pare-feu qui refuse le paquet en notifiant l'émetteur (TCP RST ou ICMP unreachable) : diagnostic plus facile que DROP.",
  'Security Group': "Groupe de règles nommé et réutilisable, applicable à plusieurs VM/CT en une ligne depuis Datacenter → Firewall → Security Group.",
  'IP set': "Liste nommée d'adresses ou de réseaux (ipset) citable avec le préfixe + comme source ou destination dans les règles du pare-feu.",
  'LOGID': "Identifiant numérique des messages de journalisation du pare-feu Proxmox (ex. 7400) qui permet de retrouver la règle à l'origine d'un drop.",
  'Suricata': "Moteur IDS/IPS open source d'inspection profonde des paquets (L3-L7), utilisable en IPS inline avec Proxmox via NFQUEUE.",
  'NFQUEUE': "Cible iptables/nftables qui transmet les paquets à un traitement en espace utilisateur (Suricata) pour verdict ACCEPT/DROP.",
  'PAM': "Pluggable Authentication Modules — realm Unix local de Proxmox : utilisateurs système (root@pam) authentifiés via /etc/shadow.",
  'Realm': "Domaine d'authentification Proxmox (pam, pve, ldap, ad, openid) choisi à la connexion sous la forme utilisateur@realm.",
  'LDAP': "Lightweight Directory Access Protocol — protocole d'annuaire permettant de déléguer l'authentification à un serveur type OpenLDAP.",
  '2FA': "Two-Factor Authentication — second facteur (TOTP, WebAuthn) exigé en plus du mot de passe ; obligatoire pour les administrateurs (CDC CFP-CMD).",
  'TOTP': "Time-based One-Time Password — code à usage unique de 6 chiffres régénéré toutes les 30 secondes (Google Authenticator, FreeOTP).",
  'PVEVMUser': "Rôle Proxmox intégré : visualiser, allumer/éteindre, console et snapshot d'usage des VMs — sans modifier la configuration.",
  'PVEAuditor': "Rôle Proxmox intégré en lecture seule sur tous les objets : idéal pour la supervision et l'audit.",
  'fail2ban': "Cadriciel de bannissement IP qui surveille les journaux (SSH, pvedaemon) et bloque via iptables les sources multipliant les échecs d'authentification.",
  'ACME Challenge': "Preuve de contrôle du domaine demandée par Let's Encrypt : HTTP-01 (port 80 joignable) ou DNS-01 (enregistrement TXT via plugin).",
  'Port 8006': "Port HTTPS de l'interface web et de l'API REST Proxmox (pveproxy) : à exposer uniquement au réseau de management, jamais à Internet.",
  'Corosync auth': "Clé symétrique partagée (/etc/pve/corosync/authkey) qui authentifie et protège les échanges Corosync sur les ports UDP 5404-5405.",
  'SSH key-only': "Durcissement SSH : PasswordAuthentication no, authentification exclusivement par clés publiques (PermitRootLogin prohibit-password).",
  'AppArmor': "Module de sécurité Linux de contrôle d'accès obligatoire qui confine les conteneurs LXC (profil 'generated' par défaut dans Proxmox)."
});
