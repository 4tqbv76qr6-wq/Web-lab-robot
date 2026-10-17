// ---- Mémoire persistante ----
// faits : connaissances structurees (moteur style Labo 2)
// messages : transcription des dialogues (archive)
// Format canonique des faits : « cle : valeur » — lisible, injectable, anti-doublon par cle.
const memoire = { faits: [], messages: [] };

function sauvegarderMemoire() {
  try {
    localStorage.setItem(CONFIG.cleMemoire, JSON.stringify({ faits: memoire.faits, messages: memoire.messages }));
  } catch (e) {
    log('Erreur sauvegarde mémoire : ' + e.message);
  }
}

function chargerMemoire() {
  try {
    const brut = localStorage.getItem(CONFIG.cleMemoire);
    if (!brut) return;
    const data = JSON.parse(brut);
    // Compatibilite : ancien format = tableau de messages seul
    if (Array.isArray(data)) { memoire.messages = data; return; }
    if (Array.isArray(data.faits)) memoire.faits = data.faits;
    if (Array.isArray(data.messages)) memoire.messages = data.messages;
  } catch (e) {
    log('Mémoire locale illisible, on repart de zéro.');
  }
}

function reinitialiserMemoire() {
  memoire.faits = [];
  memoire.messages = [];
  localStorage.removeItem(CONFIG.cleMemoire);
  log('🧠 Mémoire effacée.');
}

// ---- Normalisation (inspirée Labo 2 : minuscule, sans accent) ----
function normaliser(texte) {
  return texte.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/).filter(m => m.length > 2);
}

// ---- Mémorisation sur instruction (€) : typage élargi ----
function typerFait(texte) {
  const t = texte.toLowerCase();
  if (/(nom|prenom|m'appelle|je suis)/.test(t)) return 'identite';
  if (/(habite|demeure|vis a|maison|ville)/.test(t)) return 'lieu';
  if (/(ami|amie|collegue|coll[eè]gue|voisin|voisine|relations)/.test(t)) return 'relations';
  if (/(femme|mari|fils|fille|frere|fr[eè]re|soeur|s[œoe]ur|neveu|niece|ni[eè]ce|oncle|tante|cousin|pere|p[eè]re|mere|m[eè]re|famille|beau-|belle-|grand-|petit-)/.test(t)) return 'famille';
  if (/(allerg|souffre|sante|sant[eé]|medecin|m[eé]decin)/.test(t)) return 'sante';
  if (/(chaque matin|tous les jours|habitude|routine)/.test(t)) return 'habitude';
  if (/(travaille|retraite|m[eé]tier)/.test(t)) return 'travail';
  if (/(objectif|je veux|projet|labo)/.test(t)) return 'objectif';
  if (/(aime|prefere|pr[eé]f[eè]re|deteste|d[eé]teste|adore|gout|go[uû]t)/.test(t)) return 'gout';
  if (/(anniversaire|je pars|week-end|vacances|samedi|dimanche)/.test(t)) return 'evenement';
  return 'fait';
}

function memoriser(texte) {
  const f = { type: typerFait(texte), text: texte.trim(), date: new Date().toISOString().slice(0, 10) };
  memoire.faits.push(f);
  sauvegarderMemoire();
  log('€ Mémorisé (' + f.type + ') : ' + f.text);
  log('🧠 ' + memoire.faits.length + ' fait(s) en mémoire.');
  afficherMemoire();
}

// ---- Apprentissage automatique : extraction de faits par règles ----
// Chaque règle produit un fait canonique « cle : valeur ».
// Anti-doublon par cle : une nouvelle valeur sur une cle existante remplace l'ancienne.
// Ordre des règles = priorité : « aime pas » AVANT « aime », etc.
function extraireFaits(saisie) {
  const regles = [
    // Identite
    { type: 'identite', cle: 'prénom', motif: /je\s+m['’ ]appelle\s+([^.!?]+)/i },
    { type: 'identite', cle: 'prénom', motif: /mon\s+(?:nom|pr[eé]nom)\s+est\s+([^.!?]+)/i },
    { type: 'identite', cle: 'âge',     motif: /j['’ ]ai\s+(\d+\s*(?:ans?|ann[eé]es?))\b/i },
    // Lieu
    { type: 'lieu', cle: 'habite', motif: /j['’ ]habite\s+(?:à|a|en|dans)?\s*([^.!?]+)/i },
    { type: 'lieu', cle: 'habite', motif: /je\s+(?:vis|demeure)\s+(?:à|a|en)?\s*([^.!?]+)/i },
    // Gouts (ordre : négatifs d'abord)
    { type: 'gout', cle: 'aime pas', motif: /j['’ ]aime\s+(?:bien\s+)?pas\s+([^.!?]+)/i },
    { type: 'gout', cle: 'déteste',  motif: /je\s+d[eé]teste\s+([^.!?]+)/i },
    { type: 'gout', cle: 'préfère',  motif: /je\s+pr[eé]f[eè]re\s+([^.!?]+)/i },
    { type: 'gout', cle: 'adore',    motif: /j['’ ]adore\s+([^.!?]+)/i },
    { type: 'gout', cle: 'aime',     motif: /j['’ ]aime\s+(?:bien\s+)?([^.!?]+)/i },
    // Famille — cercle proche
    { type: 'famille', cle: 'femme',        motif: /ma\s+femme\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'mari',         motif: /mon\s+mari\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'compagne',     motif: /ma\s+(?:compagne|partenaire)\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'compagnon',    motif: /mon\s+(?:compagnon|partenaire)\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'fils',         motif: /mon\s+fils\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'fille',        motif: /ma\s+fille\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    // Famille — cercle élargi
    { type: 'famille', cle: 'frère',        motif: /mon\s+fr[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'sœur',         motif: /ma\s+s[œoe]ur\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'père',         motif: /mon\s+p[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'mère',         motif: /ma\s+m[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'neveu',        motif: /mon\s+neveu\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'nièce',        motif: /ma\s+ni[eè]ce\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'oncle',        motif: /mon\s+oncle\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'tante',        motif: /ma\s+tante\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'cousin',       motif: /mon\s+cousin\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'cousine',      motif: /ma\s+cousine\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'grand-père',   motif: /mon\s+grand-p[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'grand-mère',   motif: /ma\s+grand-m[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'petit-fils',   motif: /mon\s+petit-fils\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'petite-fille', motif: /ma\s+petite-fille\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'beau-fils',    motif: /mon\s+beau-fils\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'belle-fille',  motif: /ma\s+belle-fille\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    // Famille — quantités
    { type: 'famille', cle: 'enfants',        motif: /j['’ ]ai\s+(\d+)\s*enfants/i },
    { type: 'famille', cle: 'petits-enfants', motif: /j['’ ]ai\s+(\d+)\s*petits-enfants/i },
    // Relations sociales
    { type: 'relations', cle: 'ami',      motif: /mon\s+(?:meilleur\s+)?ami\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'relations', cle: 'amie',     motif: /ma\s+(?:meilleure\s+)?amie\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'relations', cle: 'collègue', motif: /mon\s+coll[eè]gue\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'relations', cle: 'voisin',   motif: /mon\s+voisin\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'relations', cle: 'voisine',  motif: /ma\s+voisine\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    // Sante
    { type: 'sante', cle: 'santé', motif: /je\s+suis\s+allergique\s+(?:à|a)?\s*([^.!?]+)/i },
    { type: 'sante', cle: 'santé', motif: /je\s+souffre\s+(?:de|d['’ ])\s*([^.!?]+)/i },
    // Habitudes
    { type: 'habitude', cle: 'habitude', motif: /chaque\s+(?:matin|soir|jour|semaine)\s*,?\s*je\s+([^.!?]+)/i },
    { type: 'habitude', cle: 'habitude', motif: /tous\s+les\s+(?:matins|soirs|jours)\s*,?\s*je\s+([^.!?]+)/i },
    // Travail
    { type: 'travail', cle: 'travail', motif: /je\s+travaille\s+(?:sur|chez|dans|comme)?\s*([^.!?]+)/i },
    { type: 'travail', cle: 'travail', motif: /je\s+suis\s+(retrait[eé][^.!?]*)/i },
    // Objectifs
    { type: 'objectif', cle: 'objectif', motif: /(?:je\s+veux|mon\s+objectif\s+est\s+(?:de\s+)?)\s*([^.!?]+)/i },
    { type: 'objectif', cle: 'objectif', motif: /j['’ ]aimerais\s+(?:apprendre\s+)?([^.!?]+)/i },
    // Evenements
    { type: 'evenement', cle: 'anniversaire', motif: /mon\s+anniversaire\s+est\s+(?:le\s+)?([^.!?]+)/i },
    { type: 'evenement', cle: 'événement',    motif: /je\s+pars\s+(?:en|à|a|au|aux|pour)?\s*([^.!?]+)/i }
  ];
  regles.forEach(r => {
    const m = saisie.match(r.motif);
    if (!m) return;
    const valeur = (m[1] || '').trim().replace(/\s+/g, ' ');
    if (!valeur || valeur.length < 2) return;
    const texte = r.cle + ' : ' + valeur;
    // Anti-doublon par cle : la nouvelle valeur remplace l'ancienne (memoire propre)
    const index = memoire.faits.findIndex(f => f.text.toLowerCase().startsWith(r.cle.toLowerCase() + ' :'));
    if (index >= 0) {
      if (memoire.faits[index].text.toLowerCase() === texte.toLowerCase()) return; // deja connu
      memoire.faits[index] = { type: r.type, text: texte, date: new Date().toISOString().slice(0, 10) };
      log('🔎 Fait mis à jour (' + r.type + ') : ' + texte);
    } else {
      memoire.faits.push({ type: r.type, text: texte, date: new Date().toISOString().slice(0, 10) });
      log('🔎 Appris automatiquement (' + r.type + ') : ' + texte);
    }
    sauvegarderMemoire();
    afficherMemoire();
  });
}

// ---- Visualisation de la mémoire ----
const memoireListe = document.getElementById('memoire-liste');

function afficherMemoire() {
  memoireListe.innerHTML = '';
  const info = document.getElementById('memoire-info');
  if (memoire.faits.length === 0) {
    info.textContent = 'Aucun fait mémorisé pour l\'instant.';
    const vide = document.createElement('div');
    vide.className = 'vide';
    vide.textContent = 'Dis par exemple : « je m\'appelle Jean-Louis » ou utilise la commande €';
    memoireListe.appendChild(vide);
    return;
  }
  info.textContent = memoire.faits.length + ' fait(s) mémorisé(s) — cliquer sur ✖ pour supprimer un fait.';
  memoire.faits.forEach((f, i) => {
    const ligne = document.createElement('div');
    ligne.className = 'fait';

    const badge = document.createElement('span');
    badge.className = 'badge ' + f.type;
    badge.textContent = f.type;

    const texte = document.createElement('span');
    texte.className = 'texte';
    texte.textContent = f.text;

    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = f.date;

    const suppr = document.createElement('button');
    suppr.className = 'suppr';
    suppr.textContent = '✖';
    suppr.title = 'Supprimer ce fait';
    suppr.addEventListener('click', () => {
      if (!confirm('Supprimer ce fait : « ' + f.text + ' » ?')) return;
      memoire.faits.splice(i, 1);
      sauvegarderMemoire();
      afficherMemoire();
      log('🗑️ Fait supprimé : ' + f.text);
    });

    ligne.appendChild(badge);
    ligne.appendChild(texte);
    ligne.appendChild(date);
    ligne.appendChild(suppr);
    memoireListe.appendChild(ligne);
  });
}

// ---- Sélection des faits pertinents pour une question (recherche par mots-clés) ----
function faitsPertinents(question, max) {
  const motsQ = normaliser(question);
  if (motsQ.length === 0) return memoire.faits.slice(-max);

  // Detection du type vise par la question (ex : « comment je m'appelle ? » → identite)
  const q = motsQ.join(' ');
  const typesVises = [];
  if (/(appelle|nom|prenom|qui suis)/.test(q)) typesVises.push('identite');
  if (/(habite|demeure|ville|vis)/.test(q)) typesVises.push('lieu');
  if (/(aime|prefere|deteste|adore|gouts?)/.test(q)) typesVises.push('gout');
  if (/(famille|femme|mari|fils|fille|frere|soeur|neveu|niece|oncle|tante|cousin|pere|mere|grand)/.test(q)) typesVises.push('famille');
  if (/(ami|amie|collegue|voisin|voisine|relations)/.test(q)) typesVises.push('relations');
  if (/(sante|allergique|souffre|medecin)/.test(q)) typesVises.push('sante');
  if (/(habitude|routine|matin|chaque)/.test(q)) typesVises.push('habitude');
  if (/(travaille|retraite|metier)/.test(q)) typesVises.push('travail');
  if (/(objectif|veux|projet|labo)/.test(q)) typesVises.push('objectif');
  if (/(anniversaire|vacances|week-end|evenement)/.test(q)) typesVises.push('evenement');

  const scores = memoire.faits.map(f => {
    const motsF = new Set(normaliser(f.text + ' ' + f.type));
    let s = 0;
    motsQ.forEach(m => { if (motsF.has(m)) s++; });
    // Bonus : le fait appartient au type vise par la question
    if (typesVises.includes(f.type)) s += 2;
    return { f, s };
  });
  const retenus = scores.filter(x => x.s > 0).sort((a, b) => b.s - a.s).slice(0, max);
  if (retenus.length === 0) return [];
  return retenus.map(x => x.f);
}

// ---- Export / Import ----
function exporterMemoire() {
  try {
    const blob = new Blob([JSON.stringify({ faits: memoire.faits, messages: memoire.messages }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'memoire-web-lab-robot.json';
    a.click();
    URL.revokeObjectURL(a.href);
    log('📤 Mémoire exportée (' + memoire.faits.length + ' faits, ' + memoire.messages.length + ' messages).');
  } catch (e) {
    log('Erreur export : ' + e.message);
  }
}

function importerMemoire(fichier) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const nb = (memoire.faits.length + memoire.messages.length);
      if (nb > 0 && !confirm('Remplacer la mémoire actuelle par celle du fichier ?')) return;
      if (Array.isArray(data)) { memoire.messages = data; }
      else {
        memoire.faits = Array.isArray(data.faits) ? data.faits : [];
        memoire.messages = Array.isArray(data.messages) ? data.messages : [];
      }
      sauvegarderMemoire();
      log('📥 Mémoire importée (' + memoire.faits.length + ' faits, ' + memoire.messages.length + ' messages).');
    } catch (e) {
      log('Erreur import : fichier illisible.');
    }
  };
  reader.readAsText(fichier);
}
