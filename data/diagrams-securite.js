/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-securite.js — Schémas SVG du parcours SÉCURITÉ (sec-*)
   Palette : '#E57000' '#e74c3c' '#27ae60' '#3498db' '#8e44ad' '#f39c12' '#2c3e50' '#1a2530'
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* Niveaux empilés du pare-feu Proxmox (datacenter → nœud → VM/CT) */
  'sec-firewall-levels': function () {
    return svgOpen(700, 270, "Trois niveaux du pare-feu Proxmox VE") +
      svgBox(20, 20, 190, 60, '#E57000', '#b85500', 'Niveau DATACENTER\ncluster.fw\nrègles communes') +
      svgBox(20, 100, 190, 60, '#e74c3c', '#922b21', 'Niveau NŒUD (host)\nhost.fw\nservices locaux') +
      svgBox(20, 180, 190, 60, '#3498db', '#1a6a9e', 'Niveau VM / CT\n<vmid>.fw\npar machine') +
      svgArrow(210, 50, 300, 115) +
      svgArrow(210, 130, 300, 130) +
      svgArrow(210, 210, 300, 145) +
      svgBox(300, 95, 160, 70, '#2c3e50', '#17202a', 'pve-firewall\ncompilation des\nrègles + ipsets') +
      svgArrow(460, 130, 500, 130) +
      svgBox(500, 95, 180, 70, '#1a2530', '#0d1117', 'Noyau Linux\niptables / nftables\nNFQUEUE (IPS)') +
      svgText(350, 40, 'Les niveaux se cumulent : tout doit ACCEPTER', '#cfd6e4', 11) +
      svgClose('cluster.fw (datacenter) + host.fw (nœud) + <vmid>.fw (VM/CT) : trois couches cumulatives');
  },

  /* Chemin d'évaluation d'un paquet : ACCEPT / REJECT / DROP + politiques */
  'sec-rules-flow': function () {
    return svgOpen(700, 290, "Évaluation d'une règle : ACCEPT, REJECT, DROP") +
      svgBox(20, 110, 130, 60, '#3498db', '#1a6a9e', 'Paquet entrant\n(IN)') +
      svgArrow(150, 140, 200, 140) +
      svgBox(200, 100, 140, 80, '#2c3e50', '#17202a', 'Chaîne pare-feu\npve-firewall\n(INPUT/FORWARD)') +
      svgArrow(340, 120, 390, 55) +
      svgArrow(340, 140, 390, 140) +
      svgArrow(340, 160, 390, 225) +
      svgBox(390, 30, 150, 50, '#27ae60', '#1a6a3e', 'ACCEPT\nrègle explicite') +
      svgBox(390, 115, 150, 50, '#f39c12', '#b8750d', 'REJECT\nréponse RST/ICMP') +
      svgBox(390, 200, 150, 50, '#e74c3c', '#922b21', 'DROP\nsilence total') +
      svgArrow(540, 55, 580, 55, '#27ae60') +
      svgArrow(540, 140, 580, 140, '#f39c12') +
      svgArrow(540, 225, 580, 225, '#e74c3c') +
      svgBox(580, 30, 100, 50, '#1a2530', '#0d1117', 'Service\ndesservi') +
      svgBox(580, 115, 100, 50, '#1a2530', '#0d1117', 'Émetteur\ninformé') +
      svgBox(580, 200, 100, 50, '#1a2530', '#0d1117', 'Paquet\njeté') +
      svgBox(120, 262, 480, 26, '#8e44ad', '#6c3483', 'Aucune correspondance → policy_in / policy_out') +
      svgClose('ACCEPT laisse passer ; REJECT refuse avec réponse ; DROP jette silencieusement (furtif)');
  },

  /* Chaîne de journalisation : règle → noyau (LOGID) → journald → analyse */
  'sec-logging': function () {
    return svgOpen(700, 250, "Chaîne de journalisation du pare-feu Proxmox") +
      svgBox(20, 80, 130, 70, '#2c3e50', '#17202a', 'Paquet bloqué\n-log info\nou log_level_in') +
      svgArrow(150, 115, 195, 115) +
      svgBox(195, 80, 150, 70, '#e74c3c', '#922b21', 'Cible LOG noyau\nDROP: SRC=… DPT=…\nLOGID:7400') +
      svgArrow(345, 115, 390, 115) +
      svgBox(390, 80, 140, 70, '#8e44ad', '#6c3483', 'journald / syslog\nkern.log\nrotation logrotate') +
      svgArrow(530, 115, 570, 115) +
      svgBox(570, 80, 110, 70, '#3498db', '#1a6a9e', 'Analyse\ngrep LOGID\nSIEM') +
      svgArrow(460, 150, 460, 195) +
      svgBox(240, 195, 340, 40, '#1a2530', '#0d1117', 'GUI : Node → Firewall → Log (temps réel)') +
      svgClose('Le LOGID identifie la règle responsable : la clé de toute analyse de drops');
  },

  /* IPS Suricata inline via NFQUEUE + verdicts */
  'sec-suricata': function () {
    return svgOpen(700, 265, "Intégration IPS Suricata via NFQUEUE") +
      svgBox(20, 100, 130, 70, '#3498db', '#1a6a9e', 'Trafic VM/CT\nchaînes INPUT /\nFORWARD') +
      svgArrow(150, 135, 195, 135) +
      svgBox(195, 100, 150, 70, '#e74c3c', '#922b21', 'NFQUEUE\nqueue 1\n--queue-bypass') +
      svgArrow(345, 135, 390, 135) +
      svgBox(390, 100, 150, 70, '#E57000', '#b85500', 'Suricata IPS\nrègles ET/open\ninspection L3-L7') +
      svgArrow(540, 120, 575, 75, '#27ae60') +
      svgArrow(540, 150, 575, 195, '#e74c3c') +
      svgBox(575, 45, 105, 50, '#27ae60', '#1a6a3e', 'Verdict\nACCEPT') +
      svgBox(575, 175, 105, 50, '#1a2530', '#0d1117', 'Verdict\nDROP') +
      svgArrow(465, 170, 465, 210) +
      svgBox(240, 210, 340, 40, '#8e44ad', '#6c3483', 'eve.json : alertes, flux, HTTP, DNS (SIEM)') +
      svgClose('IPS inline = Suricata décide à la place du noyau ; IDS passif = détection seule (af-packet)');
  },

  /* Realms d'authentification + 2FA TOTP */
  'sec-auth': function () {
    return svgOpen(700, 275, "Realms d'authentification et 2FA") +
      svgBox(20, 105, 130, 60, '#2c3e50', '#17202a', 'Administrateur\nhttps://IP:8006') +
      svgArrow(150, 135, 195, 135) +
      svgBox(195, 95, 145, 80, '#E57000', '#b85500', 'pveproxy\nuser@realm\n+ mot de passe') +
      svgArrow(340, 115, 380, 55) +
      svgArrow(340, 135, 380, 135) +
      svgArrow(340, 155, 380, 215) +
      svgBox(380, 25, 155, 55, '#8e44ad', '#6c3483', 'PAM\nusers Unix · root@pam') +
      svgBox(380, 105, 155, 55, '#3498db', '#1a6a9e', 'PVE\nbase interne du cluster') +
      svgBox(380, 185, 155, 55, '#f39c12', '#b8750d', 'LDAP / AD\nannuaire entreprise') +
      svgArrow(535, 52, 575, 115) +
      svgArrow(535, 132, 575, 132) +
      svgArrow(535, 212, 575, 152) +
      svgBox(575, 100, 110, 62, '#e74c3c', '#922b21', '2FA\nTOTP\nobligatoire') +
      svgBox(20, 210, 290, 40, '#1a2530', '#0d1117', "Ticket 2 h + API Token pour l'automatisation") +
      svgClose('Un realm par compte ; TOTP imposée pour les administrateurs (CDC) · mot de passe ≥ 16 caractères');
  },

  /* RBAC : sujet × rôle × chemin d'ACL → permission */
  'sec-rbac': function () {
    return svgOpen(700, 270, "RBAC : sujet, rôle et chemin d'ACL") +
      svgBox(20, 25, 160, 50, '#2c3e50', '#17202a', 'Utilisateur\netu1@pve') +
      svgBox(20, 95, 160, 50, '#3498db', '#1a6a9e', 'Groupe\netudiants') +
      svgBox(20, 165, 160, 50, '#8e44ad', '#6c3483', 'API Token\nops@pve!ci') +
      svgArrow(180, 50, 265, 100) +
      svgArrow(180, 120, 265, 120) +
      svgArrow(180, 190, 265, 140) +
      svgBox(265, 90, 160, 60, '#E57000', '#b85500', 'RÔLE\nPVEVMUser ·\nPVEAuditor') +
      svgArrow(425, 120, 465, 120) +
      svgBox(465, 90, 215, 60, '#e74c3c', '#922b21', "CHEMIN ACL\n/ · /nodes/pve1 · /vms/100\n/storage/local · /pool/lab1") +
      svgArrow(572, 150, 572, 190) +
      svgBox(465, 190, 215, 50, '#27ae60', '#1a6a3e', 'Permission effective\n= privilèges du rôle') +
      svgText(350, 230, 'Héritage de haut en bas, union des droits', '#8d97a8', 11) +
      svgClose("Attribuer les rôles à des GROUPES sur des chemins précis, jamais sur / sans raison");
  },

  /* Certificats ACME : compte, challenges, émission */
  'sec-acme': function () {
    return svgOpen(700, 250, "Certificats ACME et Let's Encrypt") +
      svgBox(20, 85, 140, 70, '#2c3e50', '#17202a', 'Nœud Proxmox\npvenode acme\npveproxy :8006') +
      svgArrow(160, 120, 200, 120) +
      svgBox(200, 85, 150, 70, '#3498db', '#1a6a9e', 'Compte ACME\naccount register\n(e-mail + ToS)') +
      svgArrow(350, 105, 390, 65) +
      svgArrow(350, 135, 390, 175) +
      svgBox(390, 35, 160, 55, '#f39c12', '#b8750d', 'Challenge HTTP-01\nport 80 joignable') +
      svgBox(390, 150, 160, 55, '#8e44ad', '#6c3483', 'Challenge DNS-01\nTXT via plugin') +
      svgArrow(550, 62, 585, 100) +
      svgArrow(550, 177, 585, 140) +
      svgBox(585, 90, 95, 60, '#27ae60', '#1a6a3e', 'Certificat\n+ renew\n~30 j avant') +
      svgBox(200, 195, 340, 40, '#1a2530', '#0d1117', 'Cadenas valide sur https://FQDN:8006 — sans alerte') +
      svgClose('ACME automatise demande et renouvellement ; certificat interne possible via pvenode cert set');
  },

  /* Piliers du durcissement */
  'sec-hardening': function () {
    return svgOpen(700, 265, "Piliers du durcissement du nœud Proxmox") +
      svgBox(270, 100, 160, 70, '#e74c3c', '#922b21', 'NŒUD DURCI\nCFP-CMD') +
      svgArrow(240, 60, 290, 105) +
      svgArrow(460, 60, 410, 105) +
      svgArrow(240, 215, 290, 165) +
      svgArrow(460, 215, 410, 165) +
      svgBox(20, 25, 220, 55, '#3498db', '#1a6a9e', 'SSH : clés seules\nPasswordAuth no · MaxAuthTries 3') +
      svgBox(460, 25, 220, 55, '#f39c12', '#b8750d', 'fail2ban : ban après 3 échecs\njails sshd + proxmox (8006)') +
      svgBox(20, 185, 220, 55, '#27ae60', '#1a6a3e', 'Mises à jour hebdo\ndépôts maîtrisés + reboot planifié') +
      svgBox(460, 185, 220, 55, '#8e44ad', '#6c3483', '2FA TOTP admins\nmots de passe ≥ 16 (CDC)') +
      svgText(350, 250, 'AppArmor confine les LXC · 8006 jamais exposé à Internet', '#8d97a8', 11) +
      svgClose('Quatre piliers complémentaires : accès, brute-force, patchs, second facteur');
  }
});
