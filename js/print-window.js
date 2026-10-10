/* print-window.js — fenêtre d'export PDF du guide Proxmox VE.
   Chargeé par la popup d'export (voir app.js → exportSectionPDF).
   Aucun script inline (CSP stricte) : ce fichier externe déclenche l'impression. */
(function () {
  'use strict';
  function doPrint() {
    try {
      window.focus();
      window.print();
    } catch (e) { /* l'utilisateur peut imprimer manuellement */ }
  }
  if (document.readyState === 'complete') {
    window.setTimeout(doPrint, 350);
  } else {
    window.addEventListener('load', function () {
      window.setTimeout(doPrint, 350);
    });
  }
})();
