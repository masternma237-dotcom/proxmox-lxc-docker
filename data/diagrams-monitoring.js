/* ═══════════════════════════════════════════════════════════════════════════
   data/diagrams-monitoring.js — Schémas SVG du parcours Monitoring
   Helpers : js/diagrams.js (svgBox, svgArrow, svgArrowRed, svgArrowGreen,
   svgLine, svgText, svgOpen, svgClose) — palette CDC CFP-CMD.
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addDiagrams({

  /* Section 43 — chaîne des métriques natives */
  'mon-rrd': function () {
    return svgOpen(700, 225, "Chaîne de métriques natives : pvestatd → rrdcached → RRD → GUI") +
      svgBox(20, 40, 160, 80, '#1a2530', '#0d1117', 'Node Proxmox\npvestatd\ncycle 10 s') +
      svgArrow(180, 80, 240, 80) +
      svgBox(240, 52, 160, 56, '#f39c12', '#b8750d', 'rrdcached\ncache d\'écriture') +
      svgArrow(400, 80, 460, 80) +
      svgBox(460, 30, 220, 46, '#16a085', '#0e6655', 'Fichiers RRD\n/var/lib/rrdcached/db') +
      svgBox(460, 120, 220, 60, '#E57000', '#b85500', 'GUI :8006\nGraphiques Summary\nhour → year') +
      svgArrow(180, 110, 460, 150) +
      svgArrow(570, 78, 570, 118) +
      svgText(350, 215, 'Résolution décroissante : ≈ 1 min (hour) → ≈ 9 h (year) · rétention ≈ 1 an', '#8d97a8', 11) +
      svgClose('pvestatd collecte, rrdcached amortit les écritures, la GUI lit les RRD via rrddata');
  },

  /* Section 44 — pve-exporter → Prometheus → Grafana */
  'mon-exporter': function () {
    return svgOpen(700, 205, "Supervision pull : pve-exporter → Prometheus → Grafana") +
      svgBox(20, 60, 150, 80, '#E57000', '#b85500', 'Proxmox VE\nAPI REST :8006\nmonitor@pve') +
      svgBox(250, 60, 160, 80, '#16a085', '#0e6655', 'pve-exporter\nconfig.yml\n:9221 /metrics') +
      svgArrow(250, 100, 172, 100) +
      svgBox(490, 25, 190, 60, '#2c3e50', '#17202a', 'Prometheus\nscrape 30 s') +
      svgArrow(490, 62, 415, 85, '#27ae60') +
      svgBox(490, 120, 190, 60, '#8e44ad', '#6c3483', 'Grafana\nDashboards pve_*') +
      svgArrow(585, 85, 585, 118) +
      svgText(350, 195, 'Pull model : Prometheus collecte, l\'exporter ne pousse rien · alertes via Alertmanager', '#8d97a8', 11) +
      svgClose('Le compte monitor@pve (PVEAuditor) limite l\'exporter à la lecture de l\'API');
  },

  /* Section 45 — stack InfluxDB + Grafana */
  'mon-stack': function () {
    return svgOpen(700, 230, "Stack push : Proxmox → InfluxDB → Grafana") +
      svgBox(20, 75, 160, 70, '#E57000', '#b85500', 'Proxmox VE\nMetric Server\n(push continu)') +
      svgArrow(180, 95, 250, 60) +
      svgBox(250, 25, 170, 70, '#e74c3c', '#922b21', 'InfluxDB 2.x\nLine protocol\n:8089 HTTP/UDP') +
      svgArrow(420, 60, 500, 60) +
      svgBox(500, 25, 180, 70, '#27ae60', '#1a6a3e', 'Bucket pve2\nrétention 30 j\ndownsampling') +
      svgBox(250, 140, 170, 55, '#3498db', '#1a6a9e', 'Telegraf (optionnel)\nmétriques de l\'hôte') +
      svgArrow(335, 138, 335, 97) +
      svgBox(500, 140, 180, 55, '#8e44ad', '#6c3483', 'Grafana\nFlux → dashboards') +
      svgArrow(560, 138, 560, 97) +
      svgText(620, 120, 'Flux', '#8d97a8', 10) +
      svgText(350, 220, 'Aucun agent côté Proxmox : Datacenter → Metric Server suffit', '#8d97a8', 11) +
      svgClose('Proxmox pousse en Line protocol ; Grafana requête le bucket en Flux');
  },

  /* Section 46 — SNMP : Zabbix poll l'agent snmpd */
  'mon-snmp': function () {
    return svgOpen(700, 215, "Supervision SNMP : Zabbix poll l'agent snmpd du nœud") +
      svgBox(20, 60, 170, 80, '#2c3e50', '#17202a', 'Zabbix Server\npoll GET/GETNEXT\nUDP 161') +
      svgArrow(190, 90, 260, 90, '#27ae60') +
      svgBox(260, 60, 150, 80, '#16a085', '#0e6655', 'snmpd\nagent v2c/v3\n:161') +
      svgBox(490, 20, 190, 70, '#8e44ad', '#6c3483', 'Arborescence MIB\nMIB-2 .1.3.6.1.2.1\nprivate .1.3.6.1.4.1') +
      svgArrow(410, 80, 490, 55) +
      svgBox(490, 110, 190, 70, '#f39c12', '#b8750d', 'UCD-SNMP-MIB\nmémoire · disques\nload averages') +
      svgArrow(410, 120, 490, 145) +
      svgArrowRed(300, 58, 160, 50) +
      svgText(230, 30, 'trap (UDP 162)', '#e74c3c', 10) +
      svgText(350, 205, 'Poll = fiabilité (intervalle fixe) · Trap = réactivité (événement)', '#8d97a8', 11) +
      svgClose('Zabbix interroge les OID et déclenche ses triggers sur les seuils');
  },

  /* Section 47 — journalisation et centralisation */
  'mon-logs': function () {
    return svgOpen(700, 235, "Chaîne de journalisation : journald, rsyslog, centralisation") +
      svgBox(20, 30, 180, 175, '#1a2530', '#0d1117', '') +
      svgText(110, 22, 'Nœud Proxmox — sources', '#8d97a8', 11) +
      svgBox(35, 50, 150, 40, '#e74c3c', '#922b21', 'pveproxy · pvestatd') +
      svgBox(35, 100, 150, 40, '#3498db', '#1a6a9e', 'kernel · qemu-server') +
      svgBox(35, 150, 150, 40, '#f39c12', '#b8750d', 'tâches /var/log/pve') +
      svgArrow(185, 70, 280, 80) +
      svgArrow(185, 120, 280, 88) +
      svgArrow(185, 170, 280, 96) +
      svgBox(280, 60, 140, 55, '#27ae60', '#1a6a3e', 'journald\njournal binaire') +
      svgBox(280, 150, 140, 50, '#8e44ad', '#6c3483', 'rsyslog\ntexte + rotation') +
      svgArrow(350, 115, 350, 148) +
      svgBox(490, 60, 190, 55, '#16a085', '#0e6655', '/var/log/syslog\nlogrotate') +
      svgArrow(420, 165, 490, 112) +
      svgBox(490, 150, 190, 55, '#E57000', '#b85500', 'Central :514 TCP/TLS\nLoki · Graylog') +
      svgArrow(420, 180, 490, 178) +
      svgText(350, 225, 'Centraliser impérativement : les logs doivent survivre à la panne du nœud', '#8d97a8', 11) +
      svgClose('journald capte tout, rsyslog écrit en texte et transfère vers le serveur central');
  },

  /* Section 48 — chaîne d'alerte */
  'mon-alerts': function () {
    return svgOpen(700, 230, "Chaîne d'alerte : seuils, matchers, notification targets") +
      svgBox(20, 70, 150, 70, '#e74c3c', '#922b21', 'Seuil franchi\nCPU > 90 %\n10 min') +
      svgArrow(170, 105, 240, 105) +
      svgBox(240, 70, 150, 70, '#E57000', '#b85500', 'Notifications PVE\nmatchers\n→ routage') +
      svgBox(470, 20, 210, 45, '#27ae60', '#1a6a3e', 'Target Email SMTP\nadmin@cfp-cmd.local') +
      svgBox(470, 85, 210, 45, '#3498db', '#1a6a9e', 'Target Gotify\npush astreinte') +
      svgBox(470, 150, 210, 45, '#f39c12', '#b8750d', 'Target Webhook\nSlack / ITSM') +
      svgArrow(390, 85, 470, 42) +
      svgArrow(390, 105, 470, 107) +
      svgArrow(390, 125, 470, 172) +
      svgBox(20, 160, 220, 45, '#8e44ad', '#6c3483', 'Grafana Alerting / Alertmanager\nrègles de seuil sur séries') +
      svgText(350, 222, 'Une alerte fiable = seuil + durée + canal testé de bout en bout', '#8d97a8', 11) +
      svgClose('Proxmox VE 8.1+ notifie nativement (backup, events) ; Grafana et Alertmanager complètent');
  },

  /* Section 49 — Proxmox Datacenter Manager */
  'mon-pdcm': function () {
    return svgOpen(700, 240, "Proxmox Datacenter Manager : vue centralisée multi-clusters") +
      svgBox(20, 25, 200, 85, '#1a2530', '#0d1117', '') +
      svgText(120, 18, 'Cluster A — 3 nœuds', '#8d97a8', 11) +
      svgBox(35, 42, 80, 28, '#E57000', '#b85500', 'pve1') +
      svgBox(125, 42, 80, 28, '#E57000', '#b85500', 'pve2') +
      svgBox(35, 76, 80, 28, '#E57000', '#b85500', 'pve3') +
      svgBox(20, 135, 200, 75, '#1a2530', '#0d1117', '') +
      svgText(120, 128, 'Cluster B — 2 nœuds', '#8d97a8', 11) +
      svgBox(45, 155, 70, 40, '#E57000', '#b85500', 'pveB1') +
      svgBox(125, 155, 70, 40, '#E57000', '#b85500', 'pveB2') +
      svgArrow(220, 70, 300, 105, '#27ae60') +
      svgArrow(220, 172, 300, 140, '#27ae60') +
      svgBox(300, 80, 170, 90, '#E57000', '#b85500', 'Proxmox\nDatacenter\nManager\nremotes + token') +
      svgBox(550, 40, 130, 60, '#27ae60', '#1a6a3e', 'Dashboard global\nCPU · RAM · stores') +
      svgArrow(470, 100, 550, 75) +
      svgBox(550, 120, 130, 60, '#8e44ad', '#6c3483', 'Remote migration\nVM/CT inter-clusters') +
      svgArrow(470, 140, 550, 150) +
      svgText(350, 230, 'ISO dédiée (alpha) · serveur autonome · compte pdm@pve en PVEAuditor', '#8d97a8', 11) +
      svgClose('PDM agrège les clusters en remotes et permet même de migrer entre clusters');
  }
});
