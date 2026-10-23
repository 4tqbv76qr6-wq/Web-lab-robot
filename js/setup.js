// setup.js — Paramètres du robot (distincts des faits appris)
const SETUP_DEFAUT = {
  nomUtilisateur: '',
  nomRobot: 'Web Lab Robot',
  villeRef: 'Plouay',
  paraphrases: ''
};
let setup = { ...SETUP_DEFAUT };

function sauvegarderSetup() {
  localStorage.setItem('robotSetup', JSON.stringify(setup));
}

function chargerSetup() {
  try {
    const brut = localStorage.getItem('robotSetup');
    if (brut) setup = { ...SETUP_DEFAUT, ...JSON.parse(brut) };
  } catch (e) { /* défaut conservé */ }
}

function afficherSetup() {
  document.getElementById('setup-nom').value = setup.nomUtilisateur;
  document.getElementById('setup-nom-robot').value = setup.nomRobot;
  document.getElementById('setup-ville').value = setup.villeRef;
   
}

function enregistrerSetup() {
  setup.nomUtilisateur = document.getElementById('setup-nom').value.trim();
  setup.nomRobot = document.getElementById('setup-nom-robot').value.trim();
  setup.villeRef = document.getElementById('setup-ville').value.trim() || SETUP_DEFAUT.villeRef;
   
  sauvegarderSetup();
  log('⚙️ Réglages enregistrés : ' + (setup.nomUtilisateur || 'utilisateur sans nom')
    + ' — ' + setup.nomRobot + ' — référence : ' + setup.villeRef);
}
// Normalisation par paraphrases : remplace chaque expression par sa forme canonique
// AVANT toute interprétation (extraction, intentions, LLM) — le labo de l'utilisateur
// écrit comme il parle, le robot comprend sa langue. Une paraphrase par ligne : frangin = frère.
function normaliserParaphrases(saisie) {
  let texte = String(saisie || '');
  const lignes = String(setup.paraphrases || '').split('\n').map(l => l.trim()).filter(Boolean);
  const paires = lignes.map(l => {
    const i = l.indexOf('=');
    return i > 0 ? { de: l.slice(0, i).trim(), vers: l.slice(i + 1).trim() } : null;
  }).filter(Boolean);
  paires.sort((a, b) => b.de.length - a.de.length); // la plus longue d'abord (frangine avant frangin !)
  for (const p of paires) {
    const motif = new RegExp(p.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    texte = texte.replace(motif, p.vers);
  }
  return texte;
}

// ---- Carte Paraphrases : gestion ergonomique de la liste ----
// Source de vérité inchangée : setup.paraphrases (une paraphrase par ligne, "de = vers")
function parseParaphrases() {
  return String(setup.paraphrases || '').split('\n').map(l => l.trim()).filter(Boolean);
}

function afficherParaphrases() {
  const zone = document.getElementById('paraphrases-liste');
  if (!zone) return;
  const lignes = parseParaphrases();
  if (!lignes.length) {
    zone.innerHTML = '';
    const vide = document.createElement('p');
    vide.textContent = 'Aucune paraphrase pour l\u2019instant. Exemple : frangin = frère';
    zone.appendChild(vide);
    return;
  }
  zone.innerHTML = '';
  lignes.forEach((l, i) => {
    const j = l.indexOf('=');
    const de = j > 0 ? l.slice(0, j).trim() : l;
    const vers = j > 0 ? l.slice(j + 1).trim() : '\u26a0 signe = manquant';
    const ligne = document.createElement('div');
    ligne.className = 'para-ligne';
    const sDe = document.createElement('span');
    sDe.textContent = de;
    const fleche = document.createElement('span');
    fleche.textContent = ' \u2192 ';
    const sVers = document.createElement('span');
    sVers.textContent = vers;
    const bouton = document.createElement('button');
    bouton.textContent = '\u2716';
    bouton.title = 'Supprimer cette paraphrase';
    bouton.addEventListener('click', () => supprimerParaphrase(i));
    ligne.append(sDe, fleche, sVers, bouton);
    zone.appendChild(ligne);
  });
}

function ajouterParaphrase() {
  const de = document.getElementById('para-de').value.trim();
  const vers = document.getElementById('para-vers').value.trim();
  if (!de || !vers || de.includes('=')) {
    log('⚠️ Paraphrase invalide : deux champs remplis, sans signe = à gauche');
    return;
  }
  const lignes = parseParaphrases();
  lignes.push(de + ' = ' + vers);
  setup.paraphrases = lignes.join('\n');
  document.getElementById('para-de').value = '';
  document.getElementById('para-vers').value = '';
  sauvegarderSetup();
  afficherParaphrases();
  log('🔄 Paraphrase ajoutée : ' + de + ' \u2192 ' + vers);
}

function supprimerParaphrase(i) {
  const lignes = parseParaphrases();
  if (i < 0 || i >= lignes.length) return;
  const supprimee = lignes.splice(i, 1)[0];
  setup.paraphrases = lignes.join('\n');
  sauvegarderSetup();
  afficherParaphrases();
  log('🔄 Paraphrase supprimée : ' + supprimee);
}
