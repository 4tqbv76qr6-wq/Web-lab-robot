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

// ---- Phonétisation (v4) : un mot réduit à son squelette sonore ----
// On tape ce qu'on entend : « téléphonne » et « téléphone » sonnent pareil.
// En dernier recours après l'exact — jamais seul. Mots de 4+ lettres.
function phonetiserMot(mot) {
  let s = String(mot).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
             .replace(/[^a-z]/g, '');
  if (s.length < 4) return s; // trop court : la phonétique fait plus de bruit que de signal
  s = s.replace(/ph/g, 'f').replace(/qu/g, 'k').replace(/th/g, 't')
       .replace(/eau/g, 'o').replace(/(?![lnr])ai/g, 'e')
       .replace(/ent$/g, 'an').replace(/[st]$/g, '').replace(/e$/g, '');
  s = s.replace(/(.)\1+/g, '$1'); // lettres doublées → une seule
  return s;
}

// Normalisation par paraphrases : remplace chaque expression par sa forme canonique
// AVANT toute interprétation (extraction, intentions, LLM).
// v4 — 3 passes : 1a) multi-mots plein-texte  1b) mots seuls token par token
// (jamais un morceau de mot : « franginage » ne matche pas « frangin »)
// 2) fallback PHONÉTIQUE token par token, 5+ lettres (« franginn » → « frère »)
function normaliserParaphrases(saisie) {
  let texte = String(saisie || '');
  const lignes = String(setup.paraphrases || '').split('\n').map(l => l.trim()).filter(Boolean);
  const paires = lignes.map(l => {
    const i = l.indexOf('=');
    return i > 0 ? { de: l.slice(0, i).trim(), vers: l.slice(i + 1).trim() } : null;
  }).filter(Boolean);
  paires.sort((a, b) => b.de.length - a.de.length);

  // Passe 1a : expressions multi-mots — remplacement plein-texte
  for (const p of paires.filter(p => /\s/.test(p.de))) {
    texte = texte.replace(new RegExp(p.de.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), p.vers);
  }

  // Passe 1b (exact) + Passe 2 (phonétique) : token par token
  const unMot = paires.filter(p => !/\s/.test(p.de) && p.de.length >= 3);
  const ciblesPhono = paires.filter(p => !/\s/.test(p.de) && p.de.length >= 5)
                             .map(p => ({ phono: phonetiserMot(p.de), vers: p.vers }));
  texte = texte.split(/(\s+)/).map(tok => {
    if (!tok.trim()) return tok;
    const nu = tok.replace(/[^\p{L}\p{N}']/gu, '');
    if (nu.length < 3) return tok;
    const bas = nu.toLowerCase();
    for (const p of unMot) {                          // 1b : exact, mot entier
      if (bas === p.de.toLowerCase()) return tok.replace(nu, p.vers);
    }
    if (nu.length >= 5) {                             // 2 : phonétique
      for (const c of ciblesPhono) {
        if (phonetiserMot(nu) === c.phono && bas !== c.vers.toLowerCase()) return tok.replace(nu, c.vers);
      }
    }
    return tok;
  }).join('');
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
