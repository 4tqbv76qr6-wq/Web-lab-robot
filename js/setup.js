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
  document.getElementById('setup-paraphrases').value = setup.paraphrases;
}

function enregistrerSetup() {
  setup.nomUtilisateur = document.getElementById('setup-nom').value.trim();
  setup.nomRobot = document.getElementById('setup-nom-robot').value.trim();
  setup.villeRef = document.getElementById('setup-ville').value.trim() || SETUP_DEFAUT.villeRef;
  setup.paraphrases = document.getElementById('setup-paraphrases').value.trim();
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
