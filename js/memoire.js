// ---- Mémoire persistante ----
// faits : connaissances structurees (moteur style Labo 2)
// messages : transcription des dialogues (archive)
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

// ---- Mémorisation sur instruction (€) ----
function typerFait(texte) {
  const t = texte.toLowerCase();
  if (/(nom|prenom|m'appelle|je suis)\b/.test(t)) return 'identite';
  if (/(habite|demeure|vis a|maison|larmor)/.test(t)) return 'lieu';
  if (/(prefere|j'aime|j'aime pas|deteste)/.test(t)) return 'preference';
  if (/(projet|labo|robot|travaille)/.test(t)) return 'contexte';
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
function extraireFaits(saisie) {
  const regles = [
    { type: 'identite',   motif: /je\s+m['’ ]appelle\s+([^.!?]+)/i },
    { type: 'identite',   motif: /mon\s+(?:nom|pr[eé]nom)\s+est\s+([^.!?]+)/i },
    { type: 'lieu',       motif: /j['’ ]habite\s+(?:à|a|en|dans)?\s*([^.!?]+)/i },
    { type: 'lieu',       motif: /je\s+(?:vis|demeure)\s+(?:à|a|en)?\s*([^.!?]+)/i },
    { type: 'preference', motif: /j['’ ]aime\s+(?:bien\s+)?pas\s+([^.!?]+)/i, negatif: true },
    { type: 'preference', motif: /je\s+(?:déteste|deteste)\s+([^.!?]+)/i, negatif: true },
    { type: 'preference', motif: /j['’ ]aime\s+(?:bien\s+)?([^.!?]+)/i },
    { type: 'preference', motif: /je\s+pr[eé]f[eè]re\s+([^.!?]+)/i },
    { type: 'contexte',   motif: /je\s+travaille\s+(?:sur|chez|dans)?\s*([^.!?]+)/i },
    { type: 'contexte',   motif: /mon\s+projet\s+(?:est\s+)?([^.!?]+)/i }
  ];
  regles.forEach(r => {
    const m = saisie.match(r.motif);
    if (!m) return;
    const valeur = m[1].trim().replace(/\s+/g, ' ');
    if (!valeur || valeur.length < 2) return;
    const texte = r.negatif
      ? 'n\u2019aime pas ' + valeur
      : valeur;
    // Anti-doublon : ne pas re-mémoriser un fait identique
    const existe = memoire.faits.some(f => f.text.toLowerCase() === texte.toLowerCase());
    if (existe) return;
    memoire.faits.push({ type: r.type, text: texte, date: new Date().toISOString().slice(0, 10) });
    sauvegarderMemoire();
    log('🔎 Appris automatiquement (' + r.type + ') : ' + texte);
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
  if (/(aime|prefere|deteste|adore|gouts?)/.test(q)) typesVises.push('preference');
  if (/(projet|travaille|labo|contexte)/.test(q)) typesVises.push('contexte');

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
