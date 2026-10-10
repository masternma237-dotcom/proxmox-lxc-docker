/* ═══════════════════════════════════════════════════════════════════════════
   diagrams.js — Helpers SVG + schémas de base du guide Proxmox VE
   CSP stricte : tout est généré par fonctions, aucun script inline.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Échappe le texte inséré dans les SVG */
  function esc(t) {
    return String(t)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Boîte rectangulaire avec label centré (multi-lignes via \n).
   * svgBox(x, y, w, h, fill, stroke, label, opts)
   */
  function svgBox(x, y, w, h, fill, stroke, label, opts) {
    opts = opts || {};
    var tc = opts.textColor || '#ffffff';
    var fs = opts.fontSize || 12;
    var rx = typeof opts.rx === 'number' ? opts.rx : 8;
    var lines = String(label).split('\n');
    var cx = x + w / 2;
    var cy = y + h / 2;
    var startY = cy - ((lines.length - 1) * (fs + 3)) / 2;
    var txt = lines.map(function (ln, i) {
      return '<text x="' + cx + '" y="' + (startY + i * (fs + 3) + fs / 3) +
        '" text-anchor="middle" font-size="' + fs + '" font-weight="' + (opts.bold === false ? '400' : '700') +
        '" fill="' + tc + '" font-family="Segoe UI, sans-serif">' + esc(ln) + '</text>';
    }).join('');
    var opacity = typeof opts.opacity === 'number' ? opts.opacity : 1;
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h +
      '" rx="' + rx + '" ry="' + rx + '" fill="' + fill + '" stroke="' + stroke +
      '" stroke-width="1.6" opacity="' + opacity + '"/>' + txt;
  }

  /** Flèche (ligne + pointe triangulaire) */
  function svgArrow(x1, y1, x2, y2, color) {
    color = color || '#8d97a8';
    var dx = x2 - x1, dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;
    var hx = x2 - ux * 9, hy = y2 - uy * 9; /* base de la pointe */
    var px = -uy, py = ux;                  /* perpendiculaire */
    var head = (x2) + ',' + (y2) + ' ' + (hx + px * 4.5) + ',' + (hy + py * 4.5) + ' ' + (hx - px * 4.5) + ',' + (hy - py * 4.5);
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + hx + '" y2="' + hy +
      '" stroke="' + color + '" stroke-width="2"/>' +
      '<polygon points="' + head + '" fill="' + color + '"/>';
  }

  /** Flèche rouge (flux critique : panne, blocage, réplication d'urgence) */
  function svgArrowRed(x1, y1, x2, y2) {
    return svgArrow(x1, y1, x2, y2, '#e74c3c');
  }

  /** Flèche verte (flux validé / réussite) */
  function svgArrowGreen(x1, y1, x2, y2) {
    return svgArrow(x1, y1, x2, y2, '#27ae60');
  }

  /** Ligne simple (sans pointe) */
  function svgLine(x1, y1, x2, y2, stroke, width, dash) {
    stroke = stroke || '#8d97a8';
    width = width || 2;
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 +
      '" stroke="' + stroke + '" stroke-width="' + width + '"' +
      (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  }

  /** Texte libre dans un SVG */
  function svgText(x, y, label, color, size, weight) {
    return '<text x="' + x + '" y="' + y + '" fill="' + (color || '#8d97a8') +
      '" font-size="' + (size || 11) + '" font-weight="' + (weight || '600') +
      '" font-family="Segoe UI, sans-serif" text-anchor="middle">' + esc(label) + '</text>';
  }

  /** Ouvre un conteneur de diagramme */
  function svgOpen(w, h, ariaLabel) {
    return '<div class="diagram-placeholder"><svg width="100%" height="' + h +
      '" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="' + esc(ariaLabel) +
      '" preserveAspectRatio="xMidYMid meet">';
  }
  function svgClose(caption) {
    return '</svg><p>' + esc(caption) + '</p></div>';
  }

  /* Expose les helpers pour les fichiers data */
  window.svgBox = svgBox;
  window.svgArrow = svgArrow;
  window.svgArrowRed = svgArrowRed;
  window.svgArrowGreen = svgArrowGreen;
  window.svgLine = svgLine;
  window.svgText = svgText;
  window.svgOpen = svgOpen;
  window.svgClose = svgClose;

  /* ── Schémas de base partagés par plusieurs parcours ─────────────────── */
  window.PV.addDiagrams({

    /* Plan d'adressage global du labo CFP-CMD (CDC 8.1) */
    'base-address-plan': function () {
      return svgOpen(700, 250, "Plan d'adressage du laboratoire Proxmox") +
        svgBox(20, 20, 200, 44, '#E57000', '#b85500', '192.168.10.0/24 — Mgmt (VLAN 10)') +
        svgBox(20, 74, 200, 44, '#8e44ad', '#6c3483', '10.10.10.0/24 — Corosync (VLAN 20)') +
        svgBox(20, 128, 200, 44, '#16a085', '#0e6655', '10.20.20.0/24 — Ceph Public (VLAN 30)') +
        svgBox(20, 182, 200, 44, '#c0392b', '#7b241c', '10.30.30.0/24 — Ceph Cluster (VLAN 40)') +
        svgBox(380, 20, 200, 44, '#2980b9', '#1a5276', '10.100.0.0/24 — VMs Prod (VLAN 100)') +
        svgBox(380, 74, 200, 44, '#27ae60', '#1a6a3e', '10.200.0.0/24 — VMs Test (VLAN 200)') +
        svgBox(300, 105, 120, 60, '#2c3e50', '#17202a', 'Proxmox VE\nCluster') +
        svgLine(120, 64, 320, 110, '#8d97a8', 2) +
        svgLine(120, 96, 320, 118, '#8d97a8', 2) +
        svgLine(120, 150, 320, 130, '#8d97a8', 2) +
        svgLine(120, 204, 320, 142, '#8d97a8', 2) +
        svgLine(380, 42, 380, 110, '#8d97a8', 2) +
        svgLine(380, 96, 380, 118, '#8d97a8', 2) +
        svgClose('Plan d\'adressage officiel du labo (CDC — annexe 8.1)');
    },

    /* Ports à ouvrir (CDC 8.2) */
    'base-ports': function () {
      return svgOpen(700, 200, "Ports réseau de Proxmox VE") +
        svgBox(20, 60, 130, 70, '#2c3e50', '#17202a', 'Poste admin') +
        svgArrow(150, 95, 240, 95, '#27ae60') +
        svgBox(240, 45, 180, 100, '#E57000', '#b85500', 'Proxmox VE\nHost') +
        svgText(330, 34, '8006 UI · 22 SSH', '#cfd6e4', 11) +
        svgArrow(420, 75, 520, 55, '#8d97a8') +
        svgArrow(420, 95, 520, 95, '#8d97a8') +
        svgArrow(420, 115, 520, 135, '#8d97a8') +
        svgBox(520, 25, 150, 44, '#8e44ad', '#6c3483', 'Corosync 5404-5405') +
        svgBox(520, 80, 150, 44, '#16a085', '#0e6655', 'Ceph 6789/3300/6800+') +
        svgBox(520, 135, 150, 44, '#2980b9', '#1a5276', 'VNC/SPICE 5900-5999') +
        svgClose('Ports officiels : 8006 (UI), 22 (SSH), 5404-5405 UDP (Corosync), 6789/3300 (Ceph MON), 5900-5999 (VNC)');
    }
  });
})();
