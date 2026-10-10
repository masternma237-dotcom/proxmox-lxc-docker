#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   tools/validate.js — Validation complète des données du guide Proxmox VE
   Usage : node tools/validate.js   (depuis la racine du projet)
   Vérifie : intégrité du registre PV, ids, étapes, prérequis, diagrammes,
   terminologie ↔ glossaire, quiz, glossaire global, shape des données.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

const errors = [];
function fail(msg) { errors.push(msg); }
function ok(msg) { process.stdout.write('  ✓ ' + msg + '\n'); }

/* ── Sandbox minimal (window + helpers SVG globaux) ─────────────────────── */
const sandbox = { window: {}, console: console };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.createContext(sandbox);
function load(rel) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { fail(`Fichier manquant : ${rel}`); return; }
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: rel });
}

/* ── 1. Registre + helpers ──────────────────────────────────────────────── */
console.log('\n=== 1. Registre PV et helpers ===');
load('js/registry.js');
load('js/diagrams.js');
const PV = sandbox.window.PV;
if (!PV) { console.error('FATAL : registre PV introuvable'); process.exit(1); }
ok('Registre PV chargé (v' + PV.version + ')');

/* ── 2. Données (ordre d'injection identique à index.html) ──────────────── */
console.log('\n=== 2. Chargement des données ===');
const DATA_ORDER = [
  'data/core.js',
  'data/diagrams-fondamentaux.js', 'data/glossary-fondamentaux.js', 'data/quiz-fondamentaux.js',
  'data/reseau-1.js', 'data/reseau-2.js', 'data/diagrams-reseau.js', 'data/glossary-reseau.js', 'data/quiz-reseau.js',
  'data/securite-1.js', 'data/securite-2.js', 'data/diagrams-securite.js', 'data/glossary-securite.js', 'data/quiz-securite.js',
  'data/cluster-1.js', 'data/diagrams-cluster.js', 'data/glossary-cluster.js', 'data/quiz-cluster.js',
  'data/stockage-1.js', 'data/diagrams-stockage.js', 'data/glossary-stockage.js', 'data/quiz-stockage.js',
  'data/containers-1.js', 'data/diagrams-containers.js', 'data/glossary-containers.js', 'data/quiz-containers.js',
  'data/monitoring-1.js', 'data/diagrams-monitoring.js', 'data/glossary-monitoring.js', 'data/quiz-monitoring.js',
  'data/backup-1.js', 'data/diagrams-backup.js', 'data/glossary-backup.js', 'data/quiz-backup.js',
  'data/automatisation-1.js', 'data/diagrams-automatisation.js', 'data/glossary-automatisation.js', 'data/quiz-automatisation.js',
  'data/labs.js', 'data/diagrams-labs.js', 'data/glossary-labs.js', 'data/quiz-labs.js'
];
for (const f of DATA_ORDER) { load(f); }
ok(DATA_ORDER.length + ' fichiers data chargés sans exception');

/* ── 3. Sections ────────────────────────────────────────────────────────── */
console.log('\n=== 3. Sections ===');
const sections = PV.sections;
if (sections.length !== 71) { fail(`Nombre de sections attendu 71, obtenu ${sections.length}`); }
else ok('71 sections enregistrées');

const kebab = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const seenSteps = new Set();
let lastStep = -1;
for (const s of sections) {
  if (!kebab.test(s.id)) fail(`id non kebab-case : ${s.id}`);
  if (!PV.sectionById[s.id]) fail(`section non indexée : ${s.id}`);
  const stepNum = parseInt(s.step, 10);
  if (String(stepNum).padStart(2, '0') !== String(s.step)) fail(`step non normalisé : ${s.id} (${s.step})`);
  if (seenSteps.has(stepNum)) fail(`step en doublon : ${s.step}`);
  seenSteps.add(stepNum);
  if (stepNum <= lastStep) fail(`steps non triés : ${s.id} (${s.step} après ${lastStep})`);
  lastStep = stepNum;
  if (!PV.tracks[s.track]) fail(`track inconnue : ${s.track}`);
  if (!PV.levels[s.level]) fail(`niveau inconnu : ${s.level}`);
  if (!s.title || typeof s.title !== 'string') fail(`titre manquant : ${s.id}`);
  if (!s.icon || !/^fa-(solid|brands) fa-/.test(s.icon)) fail(`icône invalide : ${s.id} (${s.icon})`);
  if (!s.description || s.description.length < 80) fail(`description trop courte (<80 c.) : ${s.id}`);
  if (/<(script|iframe|img)/i.test(s.description)) fail(`HTML interdit dans description : ${s.id}`);
  if (!Array.isArray(s.cliCommands)) fail(`cliCommands non tableau : ${s.id}`);
  else if (s.cliCommands.some(c => typeof c !== 'string' || !c.trim())) fail(`bloc CLI vide/non string : ${s.id}`);
  if (!Array.isArray(s.guiSteps)) fail(`guiSteps non tableau : ${s.id}`);
  else {
    s.guiSteps.forEach((g, i) => {
      if (typeof g !== 'string') fail(`guiStep non string : ${s.id}[${i}]`);
      else if (/on(click|load|error)=/i.test(g)) fail(`event inline interdit : ${s.id}[${i}]`);
    });
  }
  if (!Array.isArray(s.terminology)) fail(`terminology non tableau : ${s.id}`);
  if (!Array.isArray(s.concepts)) fail(`concepts non tableau : ${s.id}`);
  else s.concepts.forEach((c, i) => {
    if (!c || !c.term || !c.def) fail(`concept mal formé : ${s.id}[${i}]`);
  });
  if (!Array.isArray(s.alerts)) fail(`alerts non tableau : ${s.id}`);
  else s.alerts.forEach((a, i) => {
    if (!a || !['warning', 'info', 'danger', 'success'].includes(a.type)) fail(`alert type invalide : ${s.id}[${i}]`);
    if (!a.text) fail(`alert sans texte : ${s.id}[${i}]`);
  });
  if (s.table) {
    if (!Array.isArray(s.table.headers) || !Array.isArray(s.table.rows)) fail(`table mal formée : ${s.id}`);
    else s.table.rows.forEach((r, i) => {
      if (!Array.isArray(r) || r.length !== s.table.headers.length) fail(`ligne de table ${i} ≠ headers : ${s.id}`);
    });
  }
  for (const r of s.requires || []) {
    const dep = PV.sectionById[r];
    if (!dep) { fail(`prérequis inexistant : ${s.id} → ${r}`); continue; }
    if (parseInt(dep.step, 10) >= stepNum) fail(`prérequis non antérieur : ${s.id} → ${r} (${dep.step})`);
  }
}
if (!errors.length) ok('Ids, steps, niveaux, prérequis, descriptions, tables : conformes');

/* ── 4. Diagrammes ──────────────────────────────────────────────────────── */
console.log('\n=== 4. Diagrammes SVG ===');
let diagramCount = 0;
for (const [id, fn] of Object.entries(PV.diagrams)) {
  try {
    const html = fn();
    if (typeof html !== 'string' || !html.includes('<svg')) fail(`diagramme sans SVG : ${id}`);
    if (/on(click|load)=/i.test(html)) fail(`event inline dans diagramme : ${id}`);
    diagramCount++;
  } catch (e) { fail(`diagramme en erreur : ${id} → ${e.message}`); }
}
for (const s of sections) {
  if (s.diagram && !PV.diagrams[s.diagram]) fail(`diagramme référencé inexistant : ${s.id} → ${s.diagram}`);
}
if (!errors.length) ok(diagramCount + ' diagrammes exécutés sans erreur, toutes références résolues');

/* ── 5. Terminologie ↔ glossaire ────────────────────────────────────────── */
console.log('\n=== 5. Terminologie et glossaire ===');
const glossaryCount = Object.keys(PV.glossary).length;
if (glossaryCount < 150) fail(`glossaire trop petit : ${glossaryCount} < 150 termes`);
for (const s of sections) {
  for (const t of s.terminology || []) {
    if (!(t in PV.glossary)) fail(`terme non défini : ${s.id} → "${t}"`);
  }
}
if (!errors.length) ok(`glossaire global : ${glossaryCount} termes, toute la terminologie des ${sections.length} sections est couverte`);

/* ── 6. Quiz ────────────────────────────────────────────────────────────── */
console.log('\n=== 6. Quiz ===');
let quizTotal = 0;
for (const s of sections) {
  const bank = PV.quiz[s.id];
  if (!bank || bank.length < 2) { fail(`quiz < 2 questions : ${s.id}`); continue; }
  bank.forEach((q, i) => {
    if (!Array.isArray(q) || q.length < 4) fail(`question mal formée : ${s.id}[${i}]`);
    else {
      if (!q[0] || typeof q[0] !== 'string') fail(`énoncé invalide : ${s.id}[${i}]`);
      if (!Array.isArray(q[1]) || q[1].length < 2) fail(`options insuffisantes : ${s.id}[${i}]`);
      if (typeof q[2] !== 'number' || q[2] < 0 || q[2] >= (q[1] ? q[1].length : 0)) fail(`index réponse invalide : ${s.id}[${i}]`);
      if (!q[3] || typeof q[3] !== 'string' || q[3].length < 10) fail(`explication absente/trop courte : ${s.id}[${i}]`);
    }
  });
  quizTotal += bank.length;
}
if (!errors.length) ok(quizTotal + ' questions de quiz validées (≥ 2 par section)');

/* ── 7. Labs ────────────────────────────────────────────────────────────── */
console.log('\n=== 7. Labs (steps + checklists) ===');
for (const s of sections.filter(x => x.track === 'labs' && x.id !== 'quiz-final')) {
  if (!s.steps || s.steps.length < 4) fail(`lab sans déroulé suffisant : ${s.id}`);
  if (!s.checklist || s.checklist.length < 4) fail(`lab sans checklist suffisante : ${s.id}`);
  (s.steps || []).forEach((st, i) => {
    if (!st || !st.title) fail(`step sans titre : ${s.id}[${i}]`);
  });
}
if (!errors.length) ok('Tous les labs ont déroulé numéroté + checklist de validation');

/* ── 8. Récapitulatif par parcours ──────────────────────────────────────── */
console.log('\n=== 8. Récapitulatif des 10 parcours ===');
for (const [trackId, track] of Object.entries(PV.tracks)) {
  const secs = sections.filter(s => s.track === trackId);
  const q = secs.reduce((a, s) => a + ((PV.quiz[s.id] || []).length), 0);
  if (!secs.length) { fail(`parcours vide : ${trackId}`); continue; }
  process.stdout.write(`  ${trackId.padEnd(15)} ${String(secs.length).padStart(2)} sections · ${String(q).padStart(2)} questions\n`);
}

/* ── 9. Cohérence index.html ────────────────────────────────────────────── */
console.log('\n=== 9. Cohérence index.html ===');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
for (const f of DATA_ORDER) {
  if (!indexHtml.includes(f)) fail(`script absent de index.html : ${f}`);
}
if (!indexHtml.includes('js/app.js')) fail('app.js non chargé dans index.html');
if (!/Content-Security-Policy/.test(indexHtml)) fail('CSP absente de index.html');
if (!/id="splash"/.test(indexHtml)) fail('splash screen absent de index.html');
if (!errors.length) ok('Tous les scripts sont câblés dans index.html (CSP + splash présents)');

/* ── Verdict ────────────────────────────────────────────────────────────── */
console.log('\n════════════════════════════════════════');
if (errors.length) {
  console.error(`✗ VALIDATION ÉCHOUÉE — ${errors.length} erreur(s) :`);
  errors.forEach(e => console.error('  ✗ ' + e));
  process.exit(1);
} else {
  console.log(`✓ VALIDATION RÉUSSIE — ${sections.length} sections · ${diagramCount} diagrammes · ${glossaryCount} termes · ${quizTotal} questions`);
}
