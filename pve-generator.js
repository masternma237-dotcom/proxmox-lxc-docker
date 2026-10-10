/* ═══════════════════════════════════════════════════════════════════════════
   pve-generator.js — Générateur de configuration Proxmox VE (outil du guide)
   Équivalent du rsc-generator.js (MikroTik) : formulaire → script commenté.
   Validation stricte : listes blanches, IP/CIDR, chevauchements, secrets ≥ 16,
   refus des injections, placeholders non quotés si champ vide.
   Expose aussi ses fonctions pures pour tools/test-generator.js (Node).
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var PV = root.PV;

  /* ═══════════════════ 1. VALIDATEURS (fonctions pures) ═══════════════════ */

  var RE_HOSTNAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  var RE_CLUSTER_NAME = /^[A-Z][A-Z0-9-]{2,14}$/;
  var RE_IFACE = /^[a-zA-Z0-9@:._-]{1,15}$/;
  var RE_BRIDGE = /^vmbr\d{1,3}$/;
  var RE_VNET = /^[a-zA-Z][a-zA-Z0-9_-]{0,11}$/;
  var RE_ZONE = /^[a-zA-Z][a-zA-Z0-9_-]{0,11}$/;
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  var RE_INJECTION = /[;"`$\\\r\n<>|&]/;
  var RE_INT = /^\d{1,4}$/;

  function isStr(v) { return typeof v === 'string'; }

  /** Nom d'hôte / interface : liste blanche alphanumérique + tiret */
  function validateHostname(value) {
    if (!isStr(value) || !value.length) { return 'Champ requis.'; }
    if (value.length > 63) { return '63 caractères maximum.'; }
    if (!RE_HOSTNAME.test(value)) { return 'Caractères autorisés : lettres, chiffres, tirets (pas de point final).'; }
    return null;
  }

  function validateClusterName(value) {
    if (!isStr(value) || !value.length) { return 'Champ requis.'; }
    if (!RE_CLUSTER_NAME.test(value)) {
      return '3 à 15 caractères : MAJUSCULES, chiffres et tirets uniquement (ex. PROXMOX-CFP).';
    }
    return null;
  }

  function validateIface(value) {
    if (!isStr(value) || !value.length) { return 'Champ requis (ex. eno1, ens18, bond0).'; }
    if (!RE_IFACE.test(value) || value.indexOf(' ') !== -1) { return 'Nom d\'interface Linux invalide.'; }
    return null;
  }

  function validateBridge(value) {
    if (!isStr(value) || !RE_BRIDGE.test(value)) { return 'Format attendu : vmbr0, vmbr1…'; }
    return null;
  }

  function validateVNet(value) {
    if (!isStr(value) || !RE_VNET.test(value)) { return '1 à 12 caractères alphanumériques (ex. vnet-prod1).'; }
    return null;
  }

  function validateZone(value) {
    if (!isStr(value) || !RE_ZONE.test(value)) { return '1 à 12 caractères alphanumériques (ex. zone-prod).'; }
    return null;
  }

  function validateVlanTag(value) {
    if (!RE_INT.test(value)) { return 'Identifiant numérique attendu.'; }
    var n = parseInt(value, 10);
    if (n < 1 || n > 4094) { return 'Le tag VLAN doit être compris entre 1 et 4094.'; }
    return null;
  }

  /** IPv4 stricte : 4 octets 0-255 */
  function validateIP(value) {
    if (!isStr(value) || !value.length) { return 'Adresse IP requise.'; }
    var parts = value.split('.');
    if (parts.length !== 4) { return 'Format IPv4 attendu (a.b.c.d).'; }
    for (var i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(parts[i])) { return 'Octet invalide : ' + parts[i]; }
      var n = parseInt(parts[i], 10);
      if (n < 0 || n > 255) { return 'Octet hors bornes (0-255) : ' + parts[i]; }
    }
    return null;
  }

  /** CIDR IPv4 : IP + préfixe 0-32 ; renvoie {error} ou {network, prefix, size} */
  function parseCIDR(value) {
    if (!isStr(value) || value.indexOf('/') === -1) {
      return { error: 'Format CIDR attendu (ex. 192.168.10.0/24).' };
    }
    var idx = value.indexOf('/');
    var ip = value.slice(0, idx);
    var prefixStr = value.slice(idx + 1);
    var ipErr = validateIP(ip);
    if (ipErr) { return { error: 'IP invalide : ' + ipErr }; }
    if (!/^\d{1,2}$/.test(prefixStr)) { return { error: 'Préfixe invalide.' }; }
    var prefix = parseInt(prefixStr, 10);
    if (prefix < 0 || prefix > 32) { return { error: 'Le préfixe doit être compris entre 0 et 32.' }; }
    var maskInt = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    var o = ip.split('.').map(function (x) { return parseInt(x, 10); });
    var ipInt = (((o[0] << 24) >>> 0) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
    return {
      error: null,
      network: (ipInt & maskInt) >>> 0,
      broadcast: (ipInt | (~maskInt >>> 0)) >>> 0,
      prefix: prefix,
      ipInt: ipInt >>> 0
    };
  }

  function validateCIDR(value) {
    var p = parseCIDR(value);
    return p.error;
  }

  function cidrOverlap(cidrA, cidrB) {
    var a = parseCIDR(cidrA), b = parseCIDR(cidrB);
    if (a.error || b.error) { return false; }
    return a.network <= b.broadcast && b.network <= a.broadcast;
  }

  function intToIP(n) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }

  /** Vérifie les chevauchements d'un jeu de réseaux nommés */
  function checkOverlaps(networks) {
    var errs = [];
    for (var i = 0; i < networks.length; i++) {
      for (var j = i + 1; j < networks.length; j++) {
        if (networks[i].cidr && networks[j].cidr && cidrOverlap(networks[i].cidr, networks[j].cidr)) {
          errs.push('Chevauchement entre « ' + networks[i].label + ' » (' + networks[i].cidr + ') et « ' +
            networks[j].label + ' » (' + networks[j].cidr + ').');
        }
      }
    }
    return errs;
  }

  /** Secret : pas d'injection, échappement pour le shell (simple quote) */
  function sanitizeSecret(value) {
    if (!isStr(value)) { return ''; }
    if (RE_INJECTION.test(value)) { return ''; }
    return value.replace(/'/g, "'\\''");
  }

  function secretOrPlaceholder(value, placeholderName, minLength) {
    minLength = minLength || 16;
    if (!isStr(value) || value.length === 0) {
      return '<' + placeholderName + '>'; /* placeholder NON quoté, à remplacer à la main */
    }
    if (value.length < minLength) {
      return { error: 'Secret trop court (' + value.length + ' caractères, ' + minLength + ' requis).' };
    }
    if (RE_INJECTION.test(value)) {
      return { error: 'Caractères interdits dans un secret : ; " ` $ \\ < > | & et retours ligne.' };
    }
    return { value: "'" + sanitizeSecret(value) + "'" };
  }

  /** Secret prêt pour le shell : placeholder non quoté si vide, quoté si fourni, quoté si erreur */
  function secretShell(value, placeholderName, minLength) {
    var r = secretOrPlaceholder(value, placeholderName, minLength);
    if (r && typeof r === 'object') { return "'<" + placeholderName + ">'"; } /* erreur → placeholder quoté */
    return r; /* '<PLACEHOLDER>' non quoté OU 'valeur' quotée */
  }

  function validateEmail(value) {
    if (!isStr(value) || !value.length) { return 'Adresse e-mail requise pour ACME/Let\'s Encrypt.'; }
    if (!RE_EMAIL.test(value)) { return 'Adresse e-mail invalide.'; }
    return null;
  }

  function validatePort(value) {
    if (!RE_INT.test(value)) { return 'Port numérique attendu.'; }
    var n = parseInt(value, 10);
    if (n < 1 || n > 65535) { return 'Port entre 1 et 65535.'; }
    return null;
  }

  function validateNodeCount(value) {
    if (!RE_INT.test(value)) { return 'Nombre de nœuds numérique attendu.'; }
    var n = parseInt(value, 10);
    if (n < 1 || n > 32) { return 'Entre 1 et 32 nœuds.'; }
    return null;
  }

  /* ═══════════════════ 2. GÉNÉRATION DU SCRIPT (pure) ═════════════════════ */

  function line() { return Array.prototype.join.call(arguments, '\n'); }

  function generateScript(cfg) {
    var L = [];
    var cluster = cfg.cluster || {};
    var net = cfg.network || {};
    var sdn = cfg.sdn || {};
    var sto = cfg.storage || {};
    var sec = cfg.security || {};
    var bak = cfg.backup || {};
    var mon = cfg.monitoring || {};

    var nodes = parseInt(cluster.nodes || '3', 10);
    var mgmt = cluster.mgmtCidr || '192.168.10.10/24';
    var gw = cluster.gateway || '192.168.10.1';
    var csNet = cluster.corosyncCidr || '10.10.10.0/24';
    var pwdVal = secretShell(sec.adminPassword, 'MOT_DE_PASSE_FORT_ADMIN', 16);

    L.push('# ════════════════════════════════════════════════════════════');
    L.push('# Configuration générée par le Guide Interactif Proxmox (CFP-CMD)');
    L.push('# Cible : Proxmox VE 8.x — À RELIRE avant application');
    L.push('# Cluster : ' + (cluster.name || 'PROXMOX-CFP') + ' · ' + nodes + ' nœud(s)');
    L.push('# Généré le : ' + new Date().toISOString().slice(0, 19).replace('T', ' '));
    L.push('# ════════════════════════════════════════════════════════════');
    L.push('');

    /* — Dépôts — */
    L.push('# ─── 1. Préparation des dépôts ───');
    L.push('echo "deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription" \\');
    L.push('  > /etc/apt/sources.list.d/pve.list');
    L.push('apt update && apt full-upgrade -y');
    L.push('');

    /* — Réseau — */
    L.push('# ─── 2. Réseau : bridges, bond, VLANs (/etc/network/interfaces) ───');
    L.push('cat > /etc/network/interfaces <<\'EOF\'');
    L.push('auto lo');
    L.push('iface lo inet loopback');
    L.push('');
    var mgmtBridge = (net.bridges && net.bridges[0]) || { name: 'vmbr0', ports: 'eno1', vlanAware: true };
    var vmBridge = (net.bridges && net.bridges[1]) || { name: 'vmbr1', ports: 'eno2', vlanAware: true };
    var bondEnabled = net.bond && net.bond.enabled;
    if (bondEnabled) {
      L.push('auto bond0');
      L.push('iface bond0 inet manual');
      L.push('    bond-slaves ' + (net.bond.ports || 'eno1 eno2'));
      L.push('    bond-miimon 100');
      L.push('    bond-mode ' + (net.bond.mode || '802.3ad'));
      L.push('    bond-xmit-hash-policy layer2+3');
      L.push('');
      mgmtBridge = { name: mgmtBridge.name, ports: 'bond0', vlanAware: mgmtBridge.vlanAware };
    }
    L.push('auto ' + mgmtBridge.name);
    L.push('iface ' + mgmtBridge.name + ' inet static');
    L.push('    address ' + mgmt);
    L.push('    gateway ' + gw);
    L.push('    bridge-ports ' + (mgmtBridge.ports || 'eno1'));
    L.push('    bridge-stp off');
    L.push('    bridge-fd 0');
    if (mgmtBridge.vlanAware) { L.push('    bridge-vlan-aware yes'); L.push('    bridge-vids 2-4094'); }
    L.push('');
    L.push('auto ' + vmBridge.name);
    L.push('iface ' + vmBridge.name + ' inet manual');
    L.push('    bridge-ports ' + (vmBridge.ports || 'eno2'));
    L.push('    bridge-stp off');
    L.push('    bridge-fd 0');
    if (vmBridge.vlanAware) { L.push('    bridge-vlan-aware yes'); L.push('    bridge-vids 2-4094'); }
    L.push('');
    L.push('source /etc/network/interfaces.d/*');
    L.push('EOF');
    L.push('ifreload -a');
    L.push('');

    /* — Cluster — */
    L.push('# ─── 3. Cluster : Corosync (réseau dédié ' + csNet + ') ───');
    L.push('# Nœud 1 (à exécuter uniquement sur le premier nœud) :');
    L.push('pvecm create ' + (cluster.name || 'PROXMOX-CFP'));
    L.push('');
    L.push('# Nœuds suivants (2..' + nodes + ') :');
    L.push('pvecm add <IP_DU_NOEUD_1> --link0 <IP_COROSYNC_LOCALE>');
    if (cluster.qdevice && cluster.qdevice.enabled) {
      L.push('');
      L.push('# QDevice (vote externe — recommandé si ' + nodes + ' <= 2 nœuds) :');
      L.push('apt install corosync-qdevice');
      L.push('pvecm qdevice setup ' + (cluster.qdevice.ip || '<IP_QNETD>'));
    }
    L.push('pvecm status && pvecm nodes');
    L.push('');

    /* — SDN — */
    if (sdn && sdn.vnets && sdn.vnets.length) {
      L.push('# ─── 4. SDN : zones, VNets, subnets (via GUI ou /etc/pve/sdn/) ───');
      L.push('apt install libpve-network-perl dnsmasq frr-pythontools');
      L.push('systemctl disable --now dnsmasq');
      L.push('');
      sdn.vnets.forEach(function (v) {
        var zname = v.zone || 'zone1';
        var ztype = v.zoneType || 'vlan';
        L.push('# VNet ' + v.name + ' → zone ' + zname + ' (' + ztype + ')' +
          (v.tag ? ' · tag ' + v.tag : '') + (v.subnet ? ' · subnet ' + v.subnet : ''));
      });
      L.push('# Appliquer : Datacenter → SDN → zones/VNets/subnets puis "Apply"');
      if (sdn.vnets.some(function (v) { return v.dhcp; })) {
        L.push('# DHCP IPAM : activer dnsmasq (zone → IPAM = pve, subnet → DHCP range)');
      }
      L.push('');
    }

    /* — Stockage — */
    L.push('# ─── 5. Stockage ───');
    if (sto.zfs && sto.zfs.enabled) {
      L.push('# ZFS : pool local-zfs (' + (sto.zfs.raid || 'mirror') + ')');
      L.push('zpool create -f -o ashift=12 local-zfs ' + (sto.zfs.raid || 'mirror') + ' ' + (sto.zfs.disks || '/dev/sdb /dev/sdc'));
      L.push('zfs set compression=lz4 local-zfs');
      L.push('pvesm add zfspool local-zfs --pool local-zfs --content images,rootdir');
      L.push('');
    }
    if (sto.lvmthin && sto.lvmthin.enabled) {
      L.push('# LVM-Thin (généralement déjà présent après l\'installation ISO) :');
      L.push('pvesm status | grep local-lvm || lvcreate -L 90%FREE -n data pve && \\');
      L.push('  vgchange -an pve/data && lvconvert --type thin-pool pve/data');
      L.push('');
    }
    if (sto.nfs && sto.nfs.enabled) {
      L.push('# NFS :');
      L.push('pvesm add nfs nfs-backup --server ' + (sto.nfs.server || '<IP_SERVEUR_NFS>') +
        ' --export ' + (sto.nfs.export || '/export/pve') + ' --content backup --options vers=4.1');
      L.push('');
    }
    if (sto.ceph && sto.ceph.enabled) {
      L.push('# Ceph HCI (sur CHAQUE nœud) :');
      L.push('pveceph install');
      L.push('pveceph init --network ' + (sto.ceph.network || '10.20.20.0/24'));
      L.push('pveceph mon create');
      L.push('pveceph osd create ' + (sto.ceph.osds || '/dev/sdb'));
      L.push('pveceph pool create ceph-pool --size 3 --min_size 2 --pg_num 128');
      L.push('pvesm add cephfs cephfs-ha --content images,rootdir');
      L.push('');
    }

    /* — Sécurité — */
    L.push('# ─── 6. Sécurité : RBAC, 2FA, pare-feu, ACME ───');
    L.push('# Utilisateur admin + groupe + rôle (moindre privilège) :');
    L.push('pveum user add admin@pve -comment "Administrateur CFP-CMD"');
    L.push('pveum passwd admin@pve ' + pwdVal);
    L.push('pveum acl modify / -users admin@pve -roles Administrator');
    if (sec.twoFA) {
      L.push('# 2FA (TOTP) obligatoire pour les admins :');
      L.push('pveum tfa add admin@pve -type totp');
      L.push('# Datacenter → Permissions → Two Factor → "Enforce TFA"');
    }
    if (sec.firewall) {
      L.push('');
      L.push('# Pare-feu datacenter (/etc/pve/firewall/cluster.fw) :');
      L.push('cat > /etc/pve/firewall/cluster.fw <<\'EOF\'');
      L.push('[OPTIONS]');
      L.push('enable: 1');
      L.push('policy_in: DROP');
      L.push('policy_out: ACCEPT');
      L.push('');
      L.push('[RULES]');
      L.push('IN ACCEPT -p tcp -dport 8006 -source ' + (mgmt.split('/')[0]) + '/24 # Web UI');
      L.push('IN ACCEPT -p tcp -dport 22 -source ' + (mgmt.split('/')[0]) + '/24 # SSH');
      L.push('IN ACCEPT -p tcp -dport 5900:5999 # VNC/SPICE');
      L.push('IN ACCEPT -p udp -dport 5404:5405 # Corosync');
      L.push('IN ACCEPT -p tcp -dport 3300:3300 # Ceph MON v2');
      L.push('IN ACCEPT -p tcp -dport 6789:6789 # Ceph MON');
      L.push('IN ACCEPT -p tcp -dport 6800:7300 # Ceph OSD');
      L.push('EOF');
      L.push('# GUI : Datacenter → Firewall → Options → Input Policy = DROP');
    }
    if (sec.acme && sec.acme.enabled) {
      L.push('');
      L.push('# Certificats ACME / Let\'s Encrypt :');
      L.push('pvenode acme account register default ' + (sec.acme.email || '<EMAIL_ADMIN>') + ' --directory https://acme-v02.api.letsencrypt.org/directory');
      L.push('pvenode config set --acme domains=' + (sec.acme.domain || 'pve.example.local') + '');
      L.push('pvenode acme cert order && systemctl reload pveproxy');
    }
    L.push('');

    /* — Sauvegarde — */
    if (bak.pbs && bak.pbs.enabled) {
      L.push('# ─── 7. Sauvegarde : Proxmox Backup Server ───');
      L.push('pvesm add pbs pbs-backup \\');
      L.push('  --server ' + (bak.pbs.server || '<IP_PBS>') + ' \\');
      L.push('  --datastore ' + (bak.pbs.datastore || 'backup-store') + ' \\');
      L.push('  --username ' + (bak.pbs.user || 'backup@pbs') + ' \\');
      L.push('  --password ' + secretShell(bak.pbs.password, 'MOT_DE_PASSE_PBS', 16) + ' \\');
      L.push('  --fingerprint "<EMPREINTE_PBS>" --content backup');
      L.push('');
      L.push('# Planification (02:00, mode snapshot, compression zstd) :');
      L.push('vzdump --all 1 --storage pbs-backup --mode snapshot --compress zstd \\');
      L.push("  --notes-template '{{guestname}} — {{node}}' --quiet 1");
      L.push('# GUI : Datacenter → Backup → Add (Schedule : 02:00, Retention : 7 jours)');
      L.push('');
    }
    if (bak.s3 && bak.s3.enabled) {
      L.push('# S3 comme backend (PBS 4.x / proxmox-backup s3) :');
      L.push('proxmox-backup-manager s3 endpoint add s3-main \\');
      L.push('  --endpoint ' + (bak.s3.endpoint || '<ENDPOINT_S3>') + ' --bucket ' + (bak.s3.bucket || '<BUCKET>'));
      L.push('# Rate limiting conseillé : Datacenter → Storage → pbs → Bandwidth limit');
      L.push('');
    }

    /* — Monitoring — */
    L.push('# ─── 8. Monitoring ───');
    if (mon.influx && mon.influx.enabled) {
      L.push('# Export des métriques vers InfluxDB :');
      L.push('pvesh set /cluster/metric-server/influxdb \\');
      L.push('  --server ' + (mon.influx.endpoint || '<IP_INFLUXDB>') + ' --organization pve --bucket proxmox \\');
      L.push("  --token '<TOKEN_INFLUXDB>' --proto udp");
      L.push('# Grafana : import du dashboard "Proxmox VE" (ID 10048) puis sélection de la source.');
      L.push('');
    }
    if (mon.exporter && mon.exporter.enabled) {
      L.push('# pve-exporter (Prometheus) :');
      L.push('pveum user add monitor@pve --comment "Supervision en lecture seule"');
      L.push('pveum acl modify / -users monitor@pve -roles PVEAuditor');
      L.push('# Lancer pve-exporter puis ajouter la cible dans prometheus.yml :');
      L.push('#   - job_name: proxmox');
      L.push('#     static_configs:');
      L.push('#       - targets: ["<IP_PVE_EXPORTER>:' + (mon.exporter.port || '9221') + '"]');
      L.push('');
    }

    L.push('# ════════════════════════════════════════════════════════════');
    L.push('# Fin du script — relire chaque section avant application.');
    L.push('# Remplacer TOUS les placeholders <ENTRE_CHEVRONS> par vos valeurs.');
    L.push('# ════════════════════════════════════════════════════════════');
    return L.join('\n');
  }

  root.PVEGenerator = {
    validateHostname: validateHostname,
    validateClusterName: validateClusterName,
    validateIface: validateIface,
    validateBridge: validateBridge,
    validateVNet: validateVNet,
    validateZone: validateZone,
    validateVlanTag: validateVlanTag,
    validateIP: validateIP,
    validateCIDR: validateCIDR,
    parseCIDR: parseCIDR,
    cidrOverlap: cidrOverlap,
    checkOverlaps: checkOverlaps,
    sanitizeSecret: sanitizeSecret,
    secretOrPlaceholder: secretOrPlaceholder,
    secretShell: secretShell,
    validateEmail: validateEmail,
    validatePort: validatePort,
    validateNodeCount: validateNodeCount,
    generateScript: generateScript
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.PVEGenerator;
  }
})(typeof window !== 'undefined' ? window : globalThis);

/* ═══════════════════ 3. OUTIL : FORMULAIRE INTERACTIF ═════════════════════ */
(function () {
  'use strict';
  if (typeof window === 'undefined' || !window.PV || !window.document) { return; }

  var G = window.PVEGenerator;
  var U = window.PV.util;

  function field(labelText, id, value, placeholder, type, hint) {
    var wrap = document.createElement('div');
    wrap.className = 'gen-field';
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.textContent = labelText;
    var input = document.createElement(type === 'select' ? 'select' : 'input');
    if (type === 'select') {
      (value || []).forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        input.appendChild(o);
      });
    } else {
      input.type = type || 'text';
      input.value = value === undefined || value === null ? '' : value;
      if (placeholder) { input.placeholder = placeholder; }
    }
    input.id = id;
    input.dataset.genField = id;
    var err = document.createElement('span');
    err.className = 'field-error';
    err.textContent = hint || '';
    wrap.appendChild(lab);
    wrap.appendChild(input);
    wrap.appendChild(err);
    return wrap;
  }

  function check(labelText, id, checked) {
    var wrap = document.createElement('div');
    wrap.className = 'gen-field-check';
    var input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.dataset.genCheck = id;
    input.checked = !!checked;
    var lab = document.createElement('label');
    lab.setAttribute('for', id);
    lab.textContent = labelText;
    wrap.appendChild(input);
    wrap.appendChild(lab);
    return wrap;
  }

  function fieldset(title, icon) {
    var fs = document.createElement('fieldset');
    fs.className = 'gen-fieldset';
    var legend = document.createElement('legend');
    legend.innerHTML = '<i class="' + icon + '" aria-hidden="true"></i> ' + title;
    fs.appendChild(legend);
    return fs;
  }

  function grid(parent, fields) {
    var g = document.createElement('div');
    g.className = 'gen-grid';
    fields.forEach(function (f) { g.appendChild(f); });
    parent.appendChild(g);
    return g;
  }

  function val(id) {
    var elx = document.getElementById(id);
    return elx ? elx.value.trim() : '';
  }
  function chk(id) {
    var elx = document.getElementById(id);
    return elx ? elx.checked : false;
  }

  function setError(id, message) {
    var elx = document.getElementById(id);
    if (!elx) { return; }
    var wrap = elx.closest('.gen-field');
    if (!wrap) { return; }
    if (message) {
      wrap.classList.add('has-error');
      elx.classList.add('is-invalid');
      var err = wrap.querySelector('.field-error');
      if (err) { err.textContent = message; }
    } else {
      wrap.classList.remove('has-error');
      elx.classList.remove('is-invalid');
    }
  }

  window.PV.addTool({
    id: 'pve-generator',
    name: 'Générateur de configuration',
    icon: 'fa-solid fa-wand-magic-sparkles',
    description: 'Produit un script d\'installation Proxmox VE complet (réseau, cluster, SDN, stockage, sécurité, sauvegarde, monitoring) à partir de vos paramètres.',
    render: function (body) {
      var form = document.createElement('div');
      form.className = 'gen-form';

      /* — Cluster & management — */
      var fs1 = fieldset('Cluster & management', 'fa-solid fa-server');
      grid(fs1, [
        field('Nom du cluster', 'gen-cluster-name', 'PROXMOX-CFP', 'PROXMOX-CFP'),
        field('Nombre de nœuds', 'gen-nodes', '3', '3'),
        field('IP mgmt (CIDR)', 'gen-mgmt-cidr', '192.168.10.10/24', '192.168.10.10/24'),
        field('Passerelle', 'gen-gateway', '192.168.10.1', '192.168.10.1'),
        field('Réseau Corosync (CIDR)', 'gen-corosync-cidr', '10.10.10.0/24', '10.10.10.0/24')
      ]);
      fs1.appendChild(check('Activer un QDevice (vote externe, clusters ≤ 2 nœuds)', 'gen-qdevice-on', false));
      grid(fs1, [field('IP du serveur QNetd', 'gen-qdevice-ip', '', '192.168.10.50')]);

      /* — Réseau — */
      var fs2 = fieldset('Bridges & bonds', 'fa-solid fa-network-wired');
      grid(fs2, [
        field('Port physique vmbr0', 'gen-vmbr0-ports', 'eno1', 'eno1'),
        field('Port physique vmbr1', 'gen-vmbr1-ports', 'eno2', 'eno2')
      ]);
      fs2.appendChild(check('Bond (agrégation LACP / active-backup) sur vmbr0', 'gen-bond-on', false));
      grid(fs2, [
        field('Mode du bond', 'gen-bond-mode', ['802.3ad', 'active-backup', 'balance-rr'], null, 'select'),
        field('Ports du bond', 'gen-bond-ports', 'eno1 eno2', 'eno1 eno2')
      ]);

      /* — SDN — */
      var fs3 = fieldset('SDN — zone, VNet, subnet', 'fa-solid fa-sitemap');
      grid(fs3, [
        field('Nom de la zone', 'gen-zone-name', 'zone-prod', 'zone-prod'),
        field('Type de zone', 'gen-zone-type', ['vlan', 'simple', 'qinq', 'vxlan'], null, 'select'),
        field('Nom du VNet', 'gen-vnet-name', 'vnet-prod', 'vnet-prod'),
        field('Tag VLAN du VNet', 'gen-vnet-tag', '100', '100'),
        field('Subnet (CIDR)', 'gen-vnet-subnet', '10.100.0.0/24', '10.100.0.0/24')
      ]);
      fs3.appendChild(check('DHCP IPAM sur ce subnet (dnsmasq)', 'gen-vnet-dhcp', true));

      /* — Stockage — */
      var fs4 = fieldset('Stockage', 'fa-solid fa-database');
      fs4.appendChild(check('ZFS local', 'gen-zfs-on', true));
      grid(fs4, [
        field('Niveau RAID ZFS', 'gen-zfs-raid', ['mirror', 'raidz', 'raidz2', 'raid10', 'single'], null, 'select'),
        field('Disques ZFS', 'gen-zfs-disks', '/dev/sdb /dev/sdc', '/dev/sdb /dev/sdc')
      ]);
      fs4.appendChild(check('LVM-Thin (par défaut après installation ISO)', 'gen-lvmthin-on', true));
      fs4.appendChild(check('NFS externe (sauvegardes)', 'gen-nfs-on', false));
      grid(fs4, [
        field('Serveur NFS', 'gen-nfs-server', '', '192.168.10.60'),
        field('Export NFS', 'gen-nfs-export', '/export/pve', '/export/pve')
      ]);
      fs4.appendChild(check('Ceph HCI', 'gen-ceph-on', false));
      grid(fs4, [
        field('Réseau Ceph (CIDR)', 'gen-ceph-network', '10.20.20.0/24', '10.20.20.0/24'),
        field('Disques OSD', 'gen-ceph-osds', '/dev/sdb /dev/sdc', '/dev/sdb /dev/sdc')
      ]);

      /* — Sécurité — */
      var fs5 = fieldset('Sécurité', 'fa-solid fa-shield-halved');
      fs5.appendChild(check('Pare-feu datacenter (DROP entrant, règles 8006/22/Corosync/Ceph)', 'gen-fw-on', true));
      fs5.appendChild(check('2FA TOTP obligatoire pour les administrateurs', 'gen-2fa-on', true));
      fs5.appendChild(check('Certificats ACME / Let\'s Encrypt', 'gen-acme-on', false));
      grid(fs5, [
        field('E-mail ACME', 'gen-acme-email', '', 'admin@cfp-cmd.edu'),
        field('Domaine du nœud', 'gen-acme-domain', '', 'pve1.cfp-cmd.edu'),
        field('Mot de passe admin (≥ 16 caractères)', 'gen-admin-pwd', '', 'Laisser vide → placeholder', 'password')
      ]);

      /* — Sauvegarde — */
      var fs6 = fieldset('Sauvegarde', 'fa-solid fa-cloud-arrow-up');
      fs6.appendChild(check('Proxmox Backup Server', 'gen-pbs-on', true));
      grid(fs6, [
        field('Serveur PBS', 'gen-pbs-server', '192.168.10.20', '192.168.10.20'),
        field('Datastore', 'gen-pbs-datastore', 'backup-store', 'backup-store'),
        field('Utilisateur', 'gen-pbs-user', 'backup@pbs', 'backup@pbs'),
        field('Mot de passe PBS (≥ 16 caractères)', 'gen-pbs-pwd', '', 'Laisser vide → placeholder', 'password')
      ]);
      fs6.appendChild(check('Backend S3', 'gen-s3-on', false));
      grid(fs6, [
        field('Endpoint S3', 'gen-s3-endpoint', '', 's3.example.com'),
        field('Bucket S3', 'gen-s3-bucket', '', 'pve-backups')
      ]);

      /* — Monitoring — */
      var fs7 = fieldset('Monitoring', 'fa-solid fa-chart-line');
      fs7.appendChild(check('pve-exporter (Prometheus)', 'gen-exporter-on', true));
      grid(fs7, [field('Port d\'écoute', 'gen-exporter-port', '9221', '9221')]);
      fs7.appendChild(check('InfluxDB + Grafana', 'gen-influx-on', true));
      grid(fs7, [
        field('Serveur InfluxDB', 'gen-influx-endpoint', '192.168.10.30', '192.168.10.30'),
        field('Token InfluxDB (≥ 16 caractères)', 'gen-influx-token', '', 'Laisser vide → placeholder', 'password')
      ]);

      /* — Actions — */
      var actions = document.createElement('div');
      actions.className = 'gen-actions';
      var genBtn = document.createElement('button');
      genBtn.type = 'button';
      genBtn.className = 'btn btn-primary';
      genBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Générer le script';
      actions.appendChild(genBtn);
      form.appendChild(fs1);
      form.appendChild(fs2);
      form.appendChild(fs3);
      form.appendChild(fs4);
      form.appendChild(fs5);
      form.appendChild(fs6);
      form.appendChild(fs7);
      form.appendChild(actions);

      var output = document.createElement('div');
      output.className = 'gen-output';
      genBtn.addEventListener('click', function () {
        var errors = [];

        /* Validation : cluster & réseau */
        [['gen-cluster-name', G.validateClusterName(val('gen-cluster-name'))],
         ['gen-nodes', G.validateNodeCount(val('gen-nodes'))],
         ['gen-mgmt-cidr', G.validateCIDR(val('gen-mgmt-cidr'))],
         ['gen-gateway', G.validateIP(val('gen-gateway'))],
         ['gen-corosync-cidr', G.validateCIDR(val('gen-corosync-cidr'))],
         ['gen-vmbr0-ports', G.validateIface(val('gen-vmbr0-ports'))],
         ['gen-vmbr1-ports', G.validateIface(val('gen-vmbr1-ports'))]
        ].forEach(function (pair) { setError(pair[0], pair[1]); if (pair[1]) { errors.push(pair[1]); } });

        if (chk('gen-bond-on')) {
          var bondPorts = val('gen-bond-ports').split(/\s+/).filter(Boolean);
          if (bondPorts.length < 2) {
            setError('gen-bond-ports', 'Un bond requiert au moins 2 interfaces.');
            errors.push('Bond : 2 interfaces minimum.');
          } else if (bondPorts.some(function (p) { return G.validateIface(p); })) {
            setError('gen-bond-ports', 'Nom d\'interface invalide.');
            errors.push('Bond : interface invalide.');
          } else { setError('gen-bond-ports', null); }
        } else { setError('gen-bond-ports', null); }

        /* Validation : SDN */
        var sdnErrs = [
          ['gen-zone-name', G.validateZone(val('gen-zone-name'))],
          ['gen-vnet-name', G.validateVNet(val('gen-vnet-name'))],
          ['gen-vnet-tag', G.validateVlanTag(val('gen-vnet-tag'))],
          ['gen-vnet-subnet', G.validateCIDR(val('gen-vnet-subnet'))]
        ];
        sdnErrs.forEach(function (pair) { setError(pair[0], pair[1]); if (pair[1]) { errors.push(pair[1]); } });

        /* Validation : stockage */
        if (chk('gen-nfs-on')) {
          var nfsErr = G.validateIP(val('gen-nfs-server'));
          setError('gen-nfs-server', nfsErr);
          if (nfsErr) { errors.push('NFS : ' + nfsErr); }
        } else { setError('gen-nfs-server', null); }
        if (chk('gen-ceph-on')) {
          var cephErr = G.validateCIDR(val('gen-ceph-network'));
          setError('gen-ceph-network', cephErr);
          if (cephErr) { errors.push('Ceph : ' + cephErr); }
        } else { setError('gen-ceph-network', null); }

        /* Validation : sécurité */
        if (chk('gen-acme-on')) {
          var mailErr = G.validateEmail(val('gen-acme-email'));
          setError('gen-acme-email', mailErr);
          if (mailErr) { errors.push('ACME : ' + mailErr); }
          var domErr = G.validateHostname(val('gen-acme-domain').split('.')[0]);
          setError('gen-acme-domain', domErr);
          if (domErr) { errors.push('ACME : ' + domErr); }
        } else { setError('gen-acme-email', null); setError('gen-acme-domain', null); }
        var pwd = G.secretOrPlaceholder(val('gen-admin-pwd'), 'MOT_DE_PASSE_FORT_ADMIN', 16);
        if (pwd && pwd.error) { setError('gen-admin-pwd', pwd.error); errors.push('Admin : ' + pwd.error); }
        else { setError('gen-admin-pwd', null); }

        /* Validation : sauvegarde & monitoring */
        if (chk('gen-pbs-on')) {
          var srvErr = G.validateIP(val('gen-pbs-server'));
          setError('gen-pbs-server', srvErr);
          if (srvErr) { errors.push('PBS : ' + srvErr); }
          var pbsPwd = G.secretOrPlaceholder(val('gen-pbs-pwd'), 'MOT_DE_PASSE_PBS', 16);
          if (pbsPwd && pbsPwd.error) { setError('gen-pbs-pwd', pbsPwd.error); errors.push('PBS : ' + pbsPwd.error); }
          else { setError('gen-pbs-pwd', null); }
        } else { setError('gen-pbs-server', null); setError('gen-pbs-pwd', null); }
        var portErr = G.validatePort(val('gen-exporter-port') || '9221');
        setError('gen-exporter-port', portErr);
        if (portErr) { errors.push('Monitoring : ' + portErr); }
        var tok = G.secretOrPlaceholder(val('gen-influx-token'), 'TOKEN_INFLUXDB', 16);
        if (tok && tok.error) { setError('gen-influx-token', tok.error); errors.push('InfluxDB : ' + tok.error); }
        else { setError('gen-influx-token', null); }

        /* Chevauchements de réseaux */
        var nets = [
          { label: 'Management', cidr: val('gen-mgmt-cidr') },
          { label: 'Corosync', cidr: val('gen-corosync-cidr') },
          { label: 'Subnet VNet', cidr: val('gen-vnet-subnet') }
        ];
        if (chk('gen-ceph-on')) { nets.push({ label: 'Ceph', cidr: val('gen-ceph-network') }); }
        var overlaps = G.checkOverlaps(nets);
        overlaps.forEach(function (o) { errors.push(o); });

        if (errors.length) {
          output.innerHTML = '<div class="alert alert-danger"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div><strong>Script non généré :</strong> corrigez les champs signalés.<br>' +
            errors.map(function (e) { return '• ' + U.escapeHTML(e); }).join('<br>') + '</div></div>';
          var firstBad = form.querySelector('.is-invalid');
          if (firstBad) { firstBad.focus(); }
          window.toastHelper ? window.toastHelper('Validation échouée : ' + errors.length + ' erreur(s).', 'error') : null;
          return;
        }

        var cfg = {
          cluster: {
            name: val('gen-cluster-name'), nodes: val('gen-nodes'),
            mgmtCidr: val('gen-mgmt-cidr'), gateway: val('gen-gateway'),
            corosyncCidr: val('gen-corosync-cidr'),
            qdevice: { enabled: chk('gen-qdevice-on'), ip: val('gen-qdevice-ip') }
          },
          network: {
            bridges: [
              { name: 'vmbr0', ports: val('gen-vmbr0-ports'), vlanAware: true },
              { name: 'vmbr1', ports: val('gen-vmbr1-ports'), vlanAware: true }
            ],
            bond: { enabled: chk('gen-bond-on'), mode: val('gen-bond-mode'), ports: val('gen-bond-ports') }
          },
          sdn: {
            vnets: [{
              name: val('gen-vnet-name'), zone: val('gen-zone-name'),
              zoneType: val('gen-zone-type'), tag: val('gen-vnet-tag'),
              subnet: val('gen-vnet-subnet'), dhcp: chk('gen-vnet-dhcp')
            }]
          },
          storage: {
            zfs: { enabled: chk('gen-zfs-on'), raid: val('gen-zfs-raid'), disks: val('gen-zfs-disks') },
            lvmthin: { enabled: chk('gen-lvmthin-on') },
            nfs: { enabled: chk('gen-nfs-on'), server: val('gen-nfs-server'), export: val('gen-nfs-export') },
            ceph: { enabled: chk('gen-ceph-on'), network: val('gen-ceph-network'), osds: val('gen-ceph-osds') }
          },
          security: {
            firewall: chk('gen-fw-on'), twoFA: chk('gen-2fa-on'),
            acme: { enabled: chk('gen-acme-on'), email: val('gen-acme-email'), domain: val('gen-acme-domain') },
            adminPassword: val('gen-admin-pwd')
          },
          backup: {
            pbs: { enabled: chk('gen-pbs-on'), server: val('gen-pbs-server'), datastore: val('gen-pbs-datastore'), user: val('gen-pbs-user'), password: val('gen-pbs-pwd') },
            s3: { enabled: chk('gen-s3-on'), endpoint: val('gen-s3-endpoint'), bucket: val('gen-s3-bucket') }
          },
          monitoring: {
            exporter: { enabled: chk('gen-exporter-on'), port: val('gen-exporter-port') },
            influx: { enabled: chk('gen-influx-on'), endpoint: val('gen-influx-endpoint'), token: val('gen-influx-token') }
          }
        };

        var script = G.generateScript(cfg);
        output.innerHTML = '<h3><i class="fa-solid fa-file-code" aria-hidden="true"></i> Script généré (' + script.split('\n').length + ' lignes)</h3>' +
          '<div class="alert alert-warning"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><div>Remplacez tous les placeholders <code>&lt;ENTRE_CHEVRONS&gt;</code> et relisez chaque section avant application. Secrets laissés vides → placeholders non quotés.</div></div>';
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        code.textContent = script;
        pre.appendChild(code);
        output.appendChild(pre);
        var copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'btn btn-success';
        copyBtn.style.marginTop = '10px';
        copyBtn.innerHTML = '<i class="fa-solid fa-copy" aria-hidden="true"></i> Copier le script complet';
        copyBtn.addEventListener('click', function () {
          if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(script).then(function () { window.toastHelper('Script copié (' + script.length + ' caractères).', 'success'); },
              function () { window.toastHelper('Copie impossible.', 'error'); });
          } else {
            var ta = document.createElement('textarea');
            ta.value = script;
            ta.style.position = 'fixed'; ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            var ok = document.execCommand('copy');
            document.body.removeChild(ta);
            window.toastHelper(ok ? 'Script copié.' : 'Copie impossible.', ok ? 'success' : 'error');
          }
        });
        output.appendChild(copyBtn);
      });

      body.appendChild(form);
      body.appendChild(output);
    }
  });
})();
