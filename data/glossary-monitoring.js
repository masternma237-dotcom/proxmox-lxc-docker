/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-monitoring.js — Glossaire (parcours Monitoring)
   20 termes dédiés — ne redéfinit PAS pve-exporter (déjà dans fondamentaux).
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'RRD': "Round Robin Database — base circulaire compacte stockant des séries temporelles dont la résolution diminue avec l'âge ; alimente les graphiques natifs de Proxmox VE.",
  'RRDcached': "Daemon de mise en cache d'écriture RRD : agrège les mises à jour de pvestatd pour limiter les I/O disque sur les nœuds.",
  'Prometheus': "Base de séries temporelles et système de supervision pull-based : scrape les exporters à intervalle fixe, évalue des règles et alerte via Alertmanager.",
  'Exporter': "Programme exposant des métriques brutes au format texte Prometheus sur un endpoint HTTP /metrics (ex. pve-exporter pour Proxmox).",
  'Scrape': "Action pour Prometheus de collecter (tirer) les métriques d'un exporter selon l'intervalle scrape_interval configuré.",
  'Grafana': "Plateforme open source de visualisation : dashboards interactifs alimentés par InfluxDB, Prometheus, Loki… avec alerting intégré.",
  'Dashboard': "Ensemble de panneaux visuels (graphiques, jauges, tables) organisé en une vue unique, partageable et importable (JSON).",
  'InfluxDB': "Base de données de séries temporelles (TSDB) recevant les métriques poussées par Proxmox VE via le Metric Server en Line protocol.",
  'Telegraf': "Agent de collecte InfluxData : plugins d'entrée/sortie, il complète la supervision de l'hôte et envoie vers InfluxDB en Line protocol.",
  'SNMP': "Simple Network Management Protocol — protocole standard de supervision des équipements : agents (UDP 161), MIB, OID, traps (UDP 162).",
  'OID': "Object Identifier — identifiant numérique hiérarchique (.1.3.6.1…) désignant une métrique précise dans l'arborescence MIB.",
  'MIB': "Management Information Base — base descriptive de la structure et de la signification des OID d'un équipement (MIB-2, UCD-SNMP-MIB…).",
  'Zabbix': "Solution open source de supervision enterprise : agents, SNMP, templates, triggers, escalades et dashboards.",
  'journald': "Daemon de systemd journalisant en binaire indexé les messages du noyau et des services ; consultation via journalctl.",
  'syslog': "Protocole et format standard de journalisation texte (RFC 5424) : facility, gravité, horodatage — port historique 514.",
  'rsyslog': "Implémentation syslog performante de Debian : filtres, rotation (logrotate) et transfert centralisé en TCP/TLS 514.",
  'Metric server': "Configuration Proxmox VE (Datacenter → Metric Server) définissant un serveur externe InfluxDB ou Graphite recevant les métriques du cluster en push.",
  'Notification target': "Destination de notification Proxmox VE 8.1+ (email SMTP, Gotify, webhook) recevant les événements système et les rapports de jobs.",
  'Matcher': "Règle Proxmox VE qui route les notifications vers une ou plusieurs targets selon la gravité, l'origine ou un calendrier.",
  'Line protocol': "Format texte d'écriture InfluxDB : measurement,tag=value field=value timestamp — utilisé par Proxmox pour pousser les métriques."
});
