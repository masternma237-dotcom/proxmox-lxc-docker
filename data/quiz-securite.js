/* ═══════════════════════════════════════════════════════════════════════════
   data/quiz-securite.js — Banques de quiz du parcours SÉCURITÉ
   Format : [question, [options], indexBonneRéponse, explication] — 4 × 8 sections
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addQuiz({

  'pare-feu-proxmox': [
    ["Quels fichiers portent la configuration du pare-feu Proxmox aux trois niveaux ?",
     ["cluster.fw, host.fw et <vmid>.fw", "iptables.conf, nftables.conf, firewalld.conf", "fw.conf, node.dat, vm.rules", "Un seul fichier pve-fw.conf"], 0,
     "Trois fichiers cumulatifs : /etc/pve/firewall/cluster.fw, /etc/pve/nodes/<node>/host.fw et /etc/pve/firewall/<vmid>.fw."],
    ["Quel port ouvre-t-on pour les consoles VNC des VMs ?",
     ["5900:5999 TCP", "3389 TCP", "6080 UDP", "8006 TCP"], 0,
     "Les consoles VNC écoutent sur la plage 5900:5999 TCP ; 8006 est réservé à l'interface web et à l'API."],
    ["Que risque-t-on en activant le pare-feu du datacenter sans aucune règle ?",
     ["L'interface 8006 et le SSH deviennent inaccessibles (policy_in DROP)", "Rien, tout reste ouvert", "Seules les VMs redémarrent", "Les logs disparaissent"], 0,
     "Sans règles ACCEPT explicites, la politique policy_in DROP bloque tout, y compris la GUI (8006) et le SSH (22)."],
    ["Quelle commande compile les règles pour vérifier leur syntaxe ?",
     ["pve-firewall compile", "pve-firewall --test", "iptables-restore -d", "pvesm compile"], 0,
     "pve-firewall compile génère les règles effectives et signale les erreurs avant activation."]
  ],

  'regles-politiques': [
    ["Quelle action refuse un paquet tout en informant l'émetteur ?",
     ["REJECT", "DROP", "ACCEPT", "LOG"], 0,
     "REJECT renvoie un TCP RST ou un ICMP unreachable ; DROP jette en silence et ACCEPT laisse passer."],
    ["Quelle politique par défaut est recommandée en entrée ?",
     ["policy_in: DROP", "policy_in: ACCEPT", "policy_in: REJECT", "policy_in: LOG"], 0,
     "DROP en entrée = tout fermé sauf les flux explicitement acceptés : principe de moindre privilège réseau."],
    ["Comment référencer une IP set nommée admin_hosts dans une règle ?",
     ["-source +admin_hosts", "-source admin_hosts", "-ipset admin_hosts", "-source @admin_hosts"], 0,
     "Les IP sets se citent avec le préfixe + : -source +admin_hosts."],
    ["Dans quel ordre les règles sont-elles évaluées ?",
     ["De haut en bas, la première correspondance décide", "De bas en haut", "Par ordre alphabétique", "Toutes en parallèle, la plus restrictive gagne"], 0,
     "Évaluation séquentielle de haut en bas : placer les ACCEPT fins avant les DROP larges."]
  ],

  'logging-firewall': [
    ["Où le pare-feu Proxmox écrit-il ses messages de drop ?",
     ["Dans le journal du noyau (kern.log / journald -k)", "Dans /var/log/auth.log", "Dans une base de données PVE", "Dans eve.json"], 0,
     "La cible LOG du noyau écrit dans kern.log / journald ; la GUI les présente dans Node → Firewall → Log."],
    ["À quoi sert le LOGID d'une ligne de log du pare-feu ?",
     ["Identifier la règle ou l'origine du drop", "Chiffrer la ligne de log", "Compter les paquets", "Classer uniquement par gravité"], 0,
     "Le LOGID pointe vers la règle ou la fonction responsable : la clé de toute analyse de drops."],
    ["Quel niveau de log conseillé pour les DROP en fonctionnement normal ?",
     ["warning", "debug", "nolog", "emerg"], 0,
     "warning suffira en régime croisière ; debug est trop verbeux et nolog ne trace rien."],
    ["Quelle commande suit les drops du pare-feu en temps réel ?",
     ["journalctl -k -f | grep DROP", "tail -f /etc/pve/firewall/cluster.fw", "pve-firewall log --follow", "watch iptables -L"], 0,
     "Les messages sont des logs noyau : journalctl -k -f filtré sur DROP/REJECT/LOGID."]
  ],

  'ips-suricata': [
    ["Quel mécanisme permet à Suricata de décider ACCEPT/DROP inline ?",
     ["NFQUEUE", "SPAN mirroir", "IPVS", "eBPF map"], 0,
     "NFQUEUE met les paquets dans une file que Suricata traite puis renvoie avec son verdict ; le SPAN/miroir ne sert qu'au mode IDS."],
    ["Que se passe-t-il si Suricata s'arrête avec l'option --queue-bypass ?",
     ["Les paquets repassent sans inspection (disponibilité)", "Tout le trafic est bloqué", "Le pare-feu Proxmox redémarre", "Les VMs sont migrées"], 0,
     "--queue-bypass laisse passer les paquets si la file n'a pas de consommateur : fail-open assumé."],
    ["Quel fichier centralise les alertes JSON de Suricata ?",
     ["/var/log/suricata/eve.json", "/var/log/suricata.pid", "/var/log/kern.log", "/etc/suricata/alerts.db"], 0,
     "eve.json est le journal JSON structuré (alertes, flux, HTTP, DNS) exploitable par un SIEM."],
    ["Quelle commande met à jour les jeux de règles de Suricata ?",
     ["suricata-update", "suricata rules sync", "apt upgrade suricata-rules", "pveam update"], 0,
     "suricata-update télécharge et agrège les règles (emerging-threats…) vers /var/lib/suricata/rules/."]
  ],

  'authentification': [
    ["Que désigne le realm PAM ?",
     ["Les utilisateurs Unix locaux authentifiés via /etc/shadow", "Une base SQL externe", "Active Directory", "Un serveur RADIUS"], 0,
     "PAM = Pluggable Authentication Modules : le realm des comptes système, dont root@pam."],
    ["Quelle longueur minimale de mot de passe admin impose le CDC CFP-CMD ?",
     ["16 caractères", "8 caractères", "12 caractères", "6 caractères"], 0,
     "Le CDC exige ≥ 16 caractères : la longueur prime sur la complexité seule."],
    ["Un code TOTP se régénère toutes les combien de temps ?",
     ["30 secondes", "2 minutes", "1 seconde", "5 minutes"], 0,
     "TOTP = Time-based One-Time Password : code de 6 chiffres renouvelé toutes les 30 s."],
    ["Quelle commande ajoute un second facteur TOTP à un utilisateur ?",
     ["pveum tfa add admin-cmd@pve --type totp", "pveum otp new admin-cmd@pve", "pvesh set /access/tfa", "pveum user totp admin-cmd@pve"], 0,
     "pveum tfa add gère les enrollments 2FA ; l'imposition se fait ensuite au niveau du realm (pveum realm modify)."]
  ],

  'rbac': [
    ["De quoi se compose une permission effective en RBAC Proxmox ?",
     ["Sujet (user/groupe/token) + rôle + chemin d'ACL", "Un simple mot de passe", "Une IP source + un port", "Un certificat client"], 0,
     "Permission = sujet × rôle × chemin : /, /nodes/pve1, /vms/100, /storage/local…"],
    ["Quel rôle intégré offre une lecture seule sur tout le datacenter ?",
     ["PVEAuditor", "PVEVMUser", "PVEAdmin", "PVEDatastoreUser"], 0,
     "PVEAuditor autorise tout voir et rien modifier : parfait pour supervision et audit."],
    ["Comment les permissions se combinent-elles entre plusieurs ACL ?",
     ["Par union : elles s'additionnent, jamais se soustraient", "La dernière gagne", "La plus restrictive gagne", "Elles s'annulent"], 0,
     "Les droits hérités et multiples se cumulent par union : pour restreindre, changer de chemin d'ACL."],
    ["Quelle commande attribue PVEVMUser à etu1@pve sur la VM 100 ?",
     ["pveum acl modify /vms/100 --users etu1@pve --roles PVEVMUser", "pveum user grant etu1@pve 100", "pvesh set /vms/100/permissions", "pveum role assign PVEVMUser /vms/100"], 0,
     "pveum acl modify relie un chemin, un sujet et un rôle — c'est la brique de base du RBAC."]
  ],

  'certificats': [
    ["Sur quel port le challenge HTTP-01 doit-il être joignable ?",
     ["80", "443", "8006", "22"], 0,
     "Let's Encrypt interroge http://<fqdn>/.well-known/acme-challenge/ sur le port 80."],
    ["Quelle commande enregistre un compte ACME sur un nœud ?",
     ["pvenode acme account register default admin@cfp-cmd.local", "pvenode cert new-account", "pveum acme register", "acme --register"], 0,
     "pvenode acme account register crée le compte (e-mail + ToS), prerequisite des commandes de certificat."],
    ["Quel challenge choisir sur un réseau fermé sans exposition Internet ?",
     ["DNS-01 via plugin", "HTTP-01 sur 8006", "Aucun, impossible", "TLS-SNI"], 0,
     "DNS-01 prouve le contrôle du domaine par un enregistrement TXT : aucune ouverture Internet nécessaire."],
    ["Que fait Proxmox ~30 jours avant l'expiration d'un certificat ACME ?",
     ["Il le renouvelle automatiquement et recharge pveproxy", "Il désactive pveproxy", "Il envoie un e-mail sans rien faire", "Il régénère un auto-signé"], 0,
     "Le renouvellement ACME est planifié : nouveau certificat puis rechargement à chaud de pveproxy."]
  ],

  'durcissement': [
    ["Quelle directive SSH interdit la connexion root par mot de passe ?",
     ["PermitRootLogin prohibit-password", "PermitRootLogin yes", "AllowRootLogin no", "RootPasswordAuth yes"], 0,
     "prohibit-password autorise root uniquement par clé : cœur du SSH key-only (CDC)."],
    ["Que fait fail2ban après maxretry échecs sur une prison ?",
     ["Il bannit l'IP source via iptables pour la durée bantime", "Il redémarre le service ciblé", "Il change le port d'écoute", "Il envoie un e-mail seulement"], 0,
     "fail2ban lit les journaux, compte les échecs et bannit l'IP par iptables (3600 s au labo)."],
    ["Quel profil AppArmor les conteneurs LXC Proxmox utilisent-ils par défaut ?",
     ["generated", "désactivé", "docker-default", "unconfined"], 0,
     "Proxmox génère un profil AppArmor par CT (lxc.apparmor.profile: generated) : ne pas le retirer."],
    ["Quelle commande valide la configuration SSH avant rechargement ?",
     ["sshd -t", "ssh -c", "systemctl test ssh", "sshconfig verify"], 0,
     "sshd -t vérifie la syntaxe ; toujours le lancer avant systemctl reload ssh."]
  ]
});
