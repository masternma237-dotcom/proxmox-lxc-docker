/* ═══════════════════════════════════════════════════════════════════════════
   data/glossary-labs.js — Glossaire (parcours LABS & ÉVALUATION)
   10 termes propres au parcours — ne redéfinit aucun terme des autres tracks
   ═══════════════════════════════════════════════════════════════════════════ */
window.PV.addGlossary({
  'Lab isolé': "Environnement de travaux pratiques coupé du réseau de production : VLANs dédiés (CDC 8.1), aucun routage sortant, snapshots de retour arrière. Condition indispensable pour provoquer des pannes et des attaques sans risque.",
  'Clone lab': "Copie réutilisable d'une machine de référence (nœud, VM ou CT transformé en template) servant à reconstruire rapidement le laboratoire dans un état connu et validé.",
  'Scénario de panne': "Défaillance provoquée volontairement (poweroff d'un nœud, OSD détruit, câble retiré, mauvaise configuration appliquée) pour observer la réaction de l'infrastructure et mesurer les temps de bascule.",
  'Journal de labo': "Document vivant tenu pendant les labs : plan d'adressage, commandes saisies, mesures (fio, iperf3, nmap), incidents et conclusions. Il sert de preuve de validation et de mémo pour la production.",
  'Test de charge': "Génération de trafic ou d'IO mesurés (fio, iperf3, nmap) pour quantifier les performances d'un composant avant, pendant et après un incident ou une modification.",
  'fio': "Flexible I/O Tester — outil de référence pour mesurer IOPS, débit et latence d'un stockage (4K aléatoire, séquentiel, profondeur de file) ; utilisé ici contre le pool RBD Ceph.",
  'iperf3': "Outil client/serveur mesurant le débit TCP/UDP disponible entre deux machines ; employé sur les VLANs dédiés (corosync, Ceph, VMs test) pour valider le câblage et comparer CT vs VM.",
  'Évaluation': "Mesure des acquis du guide : quiz de section, quiz final de 20 questions tirées de toutes les sections (seuil 70 %) et validation des checklists pratiques des labs.",
  'Rattrapage': "Nouvelle tentative d'évaluation autorisée après un échec : le tirage de questions est régénéré à chaque essai et seul le meilleur score est mémorisé.",
  'Chemin de progression': "Suite ordonnée de sections reliées par des prérequis (champ requires) : chaque parcours se débloque logiquement, du socle fondamental jusqu'aux labs et au quiz final."
});
