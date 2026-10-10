#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   tools/test-generator.js — Tests unitaires du générateur de configuration
   Couvre les cas hostiles : injections, IP/CIDR invalides, chevauchements,
   secrets trop courts, placeholders non quotés, nom de cluster, script final.
   Usage : node tools/test-generator.js
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const G = require('../js/tools/pve-generator.js');

let passed = 0, failed = 0;
function check(label, actual, expected) {
  const okk = actual === expected;
  if (okk) { passed++; process.stdout.write('  ✓ ' + label + '\n'); }
  else { failed++; console.error(`  ✗ ${label}\n      attendu: ${JSON.stringify(expected)}\n      obtenu : ${JSON.stringify(actual)}`); }
}
function checkTruthy(label, actual) { check(label, !!actual, true); }
function checkFalsy(label, actual) { check(label, actual === null || actual === undefined || actual === false, true); }

console.log('\n=== validateHostname (liste blanche) ===');
checkFalsy('hostname simple', G.validateHostname('pve1'));
checkFalsy('hostname avec tirets', G.validateHostname('pve-node-01'));
checkTruthy('vide', G.validateHostname(''));
checkTruthy('espaces', G.validateHostname('pve 1'));
checkTruthy('injection point-virgule', G.validateHostname('pve1;rm'));
checkTruthy('accents', G.validateHostname('pvé1'));
checkTruthy('symboles', G.validateHostname('pve$1'));
checkTruthy('trop long (>63)', G.validateHostname('a'.repeat(64)));

console.log('\n=== validateClusterName ===');
checkFalsy('PROXMOX-CFP', G.validateClusterName('PROXMOX-CFP'));
checkFalsy('LAB1', G.validateClusterName('LAB1'));
checkTruthy('minuscules', G.validateClusterName('proxmox'));
checkTruthy('commence par chiffre', G.validateClusterName('1LAB'));
checkTruthy('injection newline', G.validateClusterName('LAB\nX'));
checkTruthy('trop long', G.validateClusterName('A'.repeat(16)));

console.log('\n=== validateIP / parseCIDR ===');
checkFalsy('192.168.10.1', G.validateIP('192.168.10.1'));
checkFalsy('0.0.0.0', G.validateIP('0.0.0.0'));
checkFalsy('255.255.255.255', G.validateIP('255.255.255.255'));
checkTruthy('octet > 255', G.validateIP('192.168.300.1'));
checkTruthy('3 octets', G.validateIP('192.168.10'));
checkTruthy('lettres', G.validateIP('192.168.10.a'));
checkFalsy('CIDR /24', G.validateCIDR('192.168.10.0/24'));
checkFalsy('CIDR /32', G.validateCIDR('10.10.10.5/32'));
checkTruthy('préfixe 33', G.validateCIDR('10.0.0.0/33'));
checkTruthy('sans slash', G.validateCIDR('10.0.0.0'));

console.log('\n=== parseCIDR : calcul réseau ===');
const ipToInt = (a, b, c, d) => a * 16777216 + b * 65536 + c * 256 + d;
check('réseau de 192.168.10.77/24', G.parseCIDR('192.168.10.77/24').network >>> 0, ipToInt(192, 168, 10, 0));
check('broadcast de 192.168.10.77/24', G.parseCIDR('192.168.10.77/24').broadcast >>> 0, ipToInt(192, 168, 10, 255));
check('réseau de 10.220.30.1/8', G.parseCIDR('10.220.30.1/8').network >>> 0, ipToInt(10, 0, 0, 0));

console.log('\n=== cidrOverlap / checkOverlaps ===');
checkTruthy('192.168.10.0/24 ∩ 192.168.10.128/25', G.cidrOverlap('192.168.10.0/24', '192.168.10.128/25'));
checkFalsy('192.168.10.0/24 ∩ 192.168.20.0/24', G.cidrOverlap('192.168.10.0/24', '192.168.20.0/24'));
checkTruthy('10.0.0.0/8 ∩ 10.10.10.0/24', G.cidrOverlap('10.0.0.0/8', '10.10.10.0/24'));
const overlapErrors = G.checkOverlaps([
  { label: 'Mgmt', cidr: '192.168.10.0/24' },
  { label: 'Corosync', cidr: '10.10.10.0/24' },
  { label: 'Subnet VNet', cidr: '192.168.10.0/25' }
]);
check('chevauchement mgmt/vnet détecté', overlapErrors.length, 1);

console.log('\n=== sanitizeSecret / secretOrPlaceholder ===');
check('sanitize retire rien de propre', G.sanitizeSecret('Mot2PasseFort!2024'), 'Mot2PasseFort!2024');
checkTruthy('sanitize neutralise quote', G.sanitizeSecret("mo'tdepasse").includes("'\\''"));
check('placeholder si vide (NON quoté)', G.secretOrPlaceholder('', 'MOT_DE_PASSE_FORT_ADMIN', 16), '<MOT_DE_PASSE_FORT_ADMIN>');
checkTruthy('erreur si trop court', typeof G.secretOrPlaceholder('court', 'X', 16) === 'object');
checkFalsy('accepte 16 caractères', (G.secretOrPlaceholder('Aa1!aaaaAa1!aaaa', 'X', 16) || {}).error);
checkTruthy('refuse injection $', typeof G.secretOrPlaceholder('Aa1!aaaaAa1!a$(rm -rf)', 'X', 16) === 'object');
checkTruthy('refuse injection backtick', typeof G.secretOrPlaceholder('Aa1!aaaaAa1!aa`id`', 'X', 16) === 'object');
checkTruthy('refuse injection ;', typeof G.secretOrPlaceholder('Aa1!aaaaAa1!aa;id', 'X', 16) === 'object');
checkTruthy('refuse injection double-quote', typeof G.secretOrPlaceholder('Aa1!aaaaAa1!aa"id"', 'X', 16) === 'object');

console.log('\n=== validateEmail / validatePort / validateNodeCount ===');
checkFalsy('email valide', G.validateEmail('admin@cfp-cmd.edu'));
checkTruthy('email invalide', G.validateEmail('admin@@x'));
checkFalsy('port 9221', G.validatePort('9221'));
checkTruthy('port 0', G.validatePort('0'));
checkTruthy('port 70000', G.validatePort('70000'));
checkFalsy('3 nœuds', G.validateNodeCount('3'));
checkTruthy('0 nœud', G.validateNodeCount('0'));
checkTruthy('33 nœuds', G.validateNodeCount('33'));

console.log('\n=== generateScript (structure et placeholders) ===');
const cfg = {
  cluster: { name: 'PROXMOX-CFP', nodes: '3', mgmtCidr: '192.168.10.10/24', gateway: '192.168.10.1',
    corosyncCidr: '10.10.10.0/24', qdevice: { enabled: false, ip: '' } },
  network: { bridges: [{ name: 'vmbr0', ports: 'eno1', vlanAware: true }, { name: 'vmbr1', ports: 'eno2', vlanAware: true }],
    bond: { enabled: true, mode: '802.3ad', ports: 'eno1 eno2' } },
  sdn: { vnets: [{ name: 'vnet-prod', zone: 'zone-prod', zoneType: 'vlan', tag: '100', subnet: '10.100.0.0/24', dhcp: true }] },
  storage: { zfs: { enabled: true, raid: 'mirror', disks: '/dev/sdb /dev/sdc' }, lvmthin: { enabled: true },
    nfs: { enabled: false, server: '', export: '' }, ceph: { enabled: false, network: '10.20.20.0/24', osds: '/dev/sdb' } },
  security: { firewall: true, twoFA: true, acme: { enabled: false, email: '', domain: '' }, adminPassword: '' },
  backup: { pbs: { enabled: true, server: '192.168.10.20', datastore: 'backup-store', user: 'backup@pbs', password: '' },
    s3: { enabled: false, endpoint: '', bucket: '' } },
  monitoring: { exporter: { enabled: true, port: '9221' }, influx: { enabled: true, endpoint: '192.168.10.30', token: '' } }
};
const script = G.generateScript(cfg);
check('script non vide', script.length > 1000, true);
checkTruthy('bandeau CFP-CMD', script.includes('Guide Interactif Proxmox (CFP-CMD)'));
checkTruthy('pvecm create PROXMOX-CFP', script.includes('pvecm create PROXMOX-CFP'));
checkTruthy('bond 802.3ad', script.includes('bond-mode 802.3ad'));
checkTruthy('vmbr0 address', script.includes('address 192.168.10.10/24'));
checkTruthy('pool ZFS mirror', script.includes('zpool create -f -o ashift=12 local-zfs mirror'));
checkTruthy('VNet documenté', script.includes('# VNet vnet-prod'));
checkTruthy('cluster.fw policy_in DROP', script.includes('policy_in: DROP'));
checkTruthy('PBS datastore', script.includes('--datastore backup-store'));
checkTruthy('placeholder admin NON quoté', script.includes("'<MOT_DE_PASSE_FORT_ADMIN>'") === false && script.includes('<MOT_DE_PASSE_FORT_ADMIN>'));
checkTruthy('placeholder PBS', script.includes('<MOT_DE_PASSE_PBS>'));
checkTruthy('placeholder InfluxDB', script.includes('<TOKEN_INFLUXDB>'));
checkTruthy('2FA documentée', script.includes('pveum tfa add admin@pve -type totp'));
checkTruthy('pve-exporter mentionné', script.includes('pve-exporter') || script.includes('monitor@pve'));
checkFalsy('aucun secret réel', /[Aa]a1!aaaa/.test(script));

console.log('\n════════════════════════════════════════');
if (failed) {
  console.error(`✗ TESTS ÉCHOUÉS : ${failed} échec(s), ${passed} réussi(s)`);
  process.exit(1);
}
console.log(`✓ ${passed} tests réussis, 0 échec — générateur conforme`);
