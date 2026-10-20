// ---- Mémoire persistante ----
// faits : connaissances structurees (moteur style Labo 2)
// messages : transcription des dialogues (archive)
// Format canonique des faits : « cle : valeur » — lisible, injectable.
// Cles uniques (une femme, un lieu) : la nouvelle valeur remplace l ancienne.
// Cles multiples (freres, cousins, amis...) : empilement, anti-doublon cle+valeur.
const memoire = { faits: [], messages: [] };

// Cles pouvant avoir PLUSIEURS valeurs (on peut avoir plusieurs freres, amis, etc.)
const CLES_MULTIPLES = ['frère', 'sœur', 'neveu', 'nièce', 'oncle', 'tante', 'cousin', 'cousine',
  'grand-père', 'grand-mère', 'petit-fils', 'petite-fille', 'beau-fils', 'belle-fille',
  'ami', 'amie', 'collègue', 'voisin', 'voisine', 'fils', 'fille',
  'habitude', 'aime', 'aime pas', 'adore', 'déteste', 'objectif', 'événement'];

// v3 — cles composees : role|attribut (ex : pere|prenom) ou role:Prenom|attribut (ex : frere:Stephane|habite).
// Le test de multiplicite porte sur le ROLE seul (avant | et :), pas sur la cle entiere.
// pere|prenom → unique ; frere|prenom → multiple (plusieurs freres) ; frere:Stephane|habite → unique.
function estCleMultiple(cle) {
  const role = String(cle).split('|')[0].split(':')[0].trim().toLowerCase();
  return CLES_MULTIPLES.includes(role);
}

// Stockage canonique d un fait : gere unique vs multiple, dedupe, met a jour.
// Retourne 'apris' | 'maj' | 'deja' | null.
function stockerFait(type, cle, valeur) {
  const texte = cle + ' : ' + valeur;
  const cleMin = cle.toLowerCase();
  const texteMin = texte.toLowerCase();

  if (estCleMultiple(cleMin)) {
    // Cle multiple : empilement, anti-doublon sur cle + valeur
    const existe = memoire.faits.some(f => f.text.toLowerCase() === texteMin);
    if (existe) return 'deja';
    memoire.faits.push({ type: type, text: texte, date: new Date().toISOString().slice(0, 10) });
    return 'apris';
  }
  // Cle unique : la nouvelle valeur remplace l ancienne
  const index = memoire.faits.findIndex(f => f.text.toLowerCase().startsWith(cleMin + ' :'));
  if (index >= 0) {
    if (memoire.faits[index].text.toLowerCase() === texteMin) return 'deja';
    memoire.faits[index] = { type: type, text: texte, date: new Date().toISOString().slice(0, 10) };
    return 'maj';
  }
  memoire.faits.push({ type: type, text: texte, date: new Date().toISOString().slice(0, 10) });
  return 'apris';
}

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

// ---- Apprentissage automatique passe 1 : extraction de faits par règles ----
// Chaque règle produit un fait canonique « cle : valeur ».
// Ordre des règles = priorité : « aime pas » AVANT « aime », etc.
function extraireFaits(saisie) {
// Garde anti-interrogatif : une question n'est jamais une info à mémoriser
// (le « ? » est le signal infaillible, quelle que soit la formulation)
if (saisie.includes('?')) return false;
if (/^\s*(quel|quelle|quels|quelles|qui|quoi|ou|où|quand|comment|pourquoi|combien|est-ce|dis-moi|tu\s+peux|peux-tu|donne-moi|raconte)\b/i.test(saisie.trim())) return false;
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
        // Famille — cercle proche (v3 : l'attribut prénom a sa propre cle, unique par role)
    { type: 'famille', cle: 'femme|prénom',        motif: /ma\s+femme\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'mari|prénom',         motif: /mon\s+mari\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'compagne|prénom',     motif: /ma\s+(?:compagne|partenaire)\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'compagnon|prénom',    motif: /mon\s+(?:compagnon|partenaire)\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'fils|prénom',         motif: /mon\s+fils\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'fille|prénom',        motif: /ma\s+fille\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    // Famille — cercle élargi (cles multiples : on peut avoir plusieurs freres, cousins...)
    { type: 'famille', cle: 'frère|prénom',        motif: /mon\s+fr[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'sœur|prénom',         motif: /ma\s+s[œoe]ur\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'père|prénom',         motif: /mon\s+p[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'mère|prénom',         motif: /ma\s+m[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'neveu|prénom',        motif: /mon\s+neveu\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'nièce|prénom',        motif: /ma\s+ni[eè]ce\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'oncle|prénom',        motif: /mon\s+oncle\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'tante|prénom',        motif: /ma\s+tante\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'cousin|prénom',       motif: /mon\s+cousin\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'cousine|prénom',      motif: /ma\s+cousine\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'grand-père|prénom',   motif: /mon\s+grand-p[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'grand-mère|prénom',   motif: /ma\s+grand-m[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'petit-fils|prénom',   motif: /mon\s+petit-fils\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'petite-fille|prénom', motif: /ma\s+petite-fille\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'beau-fils|prénom',    motif: /mon\s+beau-fils\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'belle-fille|prénom',  motif: /ma\s+belle-fille\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'beau-père|prénom',     motif: /mon\s+beau-p[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'famille', cle: 'belle-mère|prénom',   motif: /ma\s+belle-m[eè]re\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    // Famille — états (v3) : « mon père est décédé » → père|état (le role est capturé, la cle est fabriquée)
    { type: 'famille', cleDynamique: 'état', motif: /(mon|ma)\s+(p[eè]re|m[eè]re|femme|mari|fils|fille|fr[eè]re|s[œoe]ur|beau-p[eè]re|belle-m[eè]re)\s+est\s+(d[eé]c[eé]d[eé]e?|malade|hospitalis[eé]e?)\b/i },
    // Famille — quantités (inchangé)
    { type: 'famille', cle: 'enfants',        motif: /j['’ ]ai\s+(\d+)\s*enfants/i },
    { type: 'famille', cle: 'petits-enfants', motif: /j['’ ]ai\s+(\d+)\s*petits-enfants/i },
    // Relations sociales (cles multiples — v3 : attribut prénom)
    { type: 'relations', cle: 'ami|prénom',      motif: /mon\s+(?:meilleur\s+)?ami\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'relations', cle: 'amie|prénom',     motif: /ma\s+(?:meilleure\s+)?amie\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'relations', cle: 'collègue|prénom', motif: /mon\s+coll[eè]gue\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'relations', cle: 'voisin|prénom',   motif: /mon\s+voisin\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    { type: 'relations', cle: 'voisine|prénom',  motif: /ma\s+voisine\s+(?:s['’ ]appelle|est)\s+([^.!?]+)/i },
    // Sante
    { type: 'sante', cle: 'santé', motif: /je\s+suis\s+allergique\s+(?:à|a)?\s*([^.!?]+)/i },
    { type: 'sante', cle: 'santé', motif: /je\s+souffre\s+(?:de|d['’ ])\s*([^.!?]+)/i },
    // Habitudes (cle multiple : on peut avoir plusieurs habitudes)
    { type: 'habitude', cle: 'habitude', motif: /chaque\s+(?:matin|soir|jour|semaine)\s*,?\s*je\s+([^.!?]+)/i },
    { type: 'habitude', cle: 'habitude', motif: /tous\s+les\s+(?:matins|soirs|jours)\s*,?\s*je\s+([^.!?]+)/i },
    // Travail
    { type: 'travail', cle: 'travail', motif: /je\s+travaille\s+(?:sur|chez|dans|comme)?\s*([^.!?]+)/i },
    { type: 'travail', cle: 'travail', motif: /je\s+suis\s+(retrait[eé][^.!?]*)/i },
    // Objectifs (cle multiple)
        // Objectifs (cle multiple) — exclusion des politesses : « je veux bien », « je veux savoir »...
    { type: 'objectif', cle: 'objectif', motif: /(?:je\s+veux|mon\s+objectif\s+est\s+(?:de\s+)?)\s*([^.!?]+)/i,
      exclus: /^(bien|savoir|continuer|ça|ca|oui|d['’]accord|dacord)\b/i },
    { type: 'objectif', cle: 'objectif', motif: /j['’ ]aimerais\s+(?:bien\s+)?(?:apprendre\s+)?([^.!?]+)/i,
      exclus: /^(bien|savoir|continuer|ça|ca|oui|d['’]accord|dacord)\b/i },
    // Evenements (cle multiple)
    { type: 'evenement', cle: 'anniversaire', motif: /mon\s+anniversaire\s+est\s+(?:le\s+)?([^.!?]+)/i },
    { type: 'evenement', cle: 'événement',    motif: /je\s+pars\s+(?:en|à|a|au|aux|pour)?\s*([^.!?]+)/i }
  ];
  let auMoinsUn = false;
  regles.forEach(r => {
    const m = saisie.match(r.motif);
    if (!m) return;
    const valeur = (m[1] || '').trim().replace(/\s+/g, ' ');
    if (!valeur || valeur.length < 2) return;
    if (r.exclus && r.exclus.test(valeur)) return;
     // Garde nom propre : un lien de famille/relations ne mémorise que des noms (majuscule),
    // jamais un état (« décédé », « en vie », « malade »...) — même empilé, ce n'est pas mobilisable
    if ((r.type === 'famille' || r.type === 'relations') && /^[a-zà-ÿ]/.test(valeur)) return;
    const resultat = stockerFait(r.type, r.cle, valeur);
    if (resultat === 'apris') log('🔎 Appris automatiquement (' + r.type + ') : ' + r.cle + ' : ' + valeur);
    else if (resultat === 'maj') log('🔎 Fait mis à jour (' + r.type + ') : ' + r.cle + ' : ' + valeur);
    if (resultat === 'apris' || resultat === 'maj') auMoinsUn = true;
  });
  if (auMoinsUn) { sauvegarderMemoire(); afficherMemoire(); }
  return auMoinsUn; // indique a l orchestrateur si la passe 1 a capture quelque chose
}

// ---- Extraction hybride : passe 2 LLM pour les tournures imprévues ----
// Declenchee seulement si : pre-filtre premiere personne OK + aucune regex n a matche.
// Le LLM propose, le moteur valide et stocke (gouvernance cote code).

const TYPES_MEMOIRE_AUTORISES = ['identite', 'lieu', 'gout', 'famille', 'relations', 'sante', 'habitude', 'travail', 'objectif', 'evenement', 'fait'];

// Pre-filtre bon marche : la phrase parle-t-elle de l utilisateur (1re personne / possessif) ?
function estInfoPersonnelle(saisie) {
  return /\b(je\s+(?:suis|m['’ ]appelle|habite|vis|aime|adore|d[eé]teste|pr[eé]f[eè]re|veux|aimerais|travaille|souffre|suis\s+allergique|pars|ai)\b|j'’\b|chaque\s+(?:matin|soir|jour)|tous\s+les\s+(?:matins|soirs|jours)|mon\s+|ma\s+|mes\s+)/i.test(saisie);
}

async function extraireFaitsLLM(saisie) {
// Garde anti-interrogatif : une question n'est jamais une info à mémoriser
// (le « ? » est le signal infaillible, quelle que soit la formulation)
if (saisie.includes('?')) return false;
if (/^\s*(quel|quelle|quels|quelles|qui|quoi|ou|où|quand|comment|pourquoi|combien|est-ce|dis-moi|tu\s+peux|peux-tu|donne-moi|raconte)\b/i.test(saisie.trim())) return false;

    const consigne = `Le message suivant vient de l utilisateur et parle de lui en premiere personne. `
    + `Extrait, si present, le fait durable le concernant et reponds STRICTEMENT en JSON sur une seule ligne : `
    + `{"type": "...", "cle": "...", "valeur": "..."} `
    + `ou type est pris dans [identite, lieu, gout, famille, relations, sante, habitude, travail, objectif, evenement, fait]. `
    + `REGLES STRICTES : `
    + `1) valeur doit contenir SEULEMENT le nom, le prenom ou le fait essentiel, JAMAIS une phrase complete ni de preambule. `
    + `Exemple : pour "Mon pere s'appelle Ferdinand", reponds {"type": "famille", "cle": "pere", "valeur": "Ferdinand"}. `
    + `2) Tout lien de parente (pere, mere, frere, soeur, beau-pere, belle-mere, oncle, tante, cousin, neveu, niece, grand-parent...) `
    + `donne TOUJOURS type "famille". `
    + `3) cle est le role ou la nature du fait en un ou deux mots (ex : "femme", "habite", "aime", "beau-pere"). `
    + `S il n y a aucune information durable sur l utilisateur (question, salutation, opinion passagere, action en cours), `
    + `reponds STRICTEMENT {"rien": true}. En cas de doute, reponds {"rien": true}.`;


  let brut = '';
  try {
    // Relais principal : Puter
    try {
      if (typeof puter === 'undefined') throw new Error('Puter non charge');
      const rep = await puter.ai.chat([
        { role: 'system', content: consigne },
        { role: 'user', content: saisie }
      ]);
      brut = typeof rep === 'string' ? rep : String(rep?.message?.content ?? rep?.text ?? rep ?? '');
    } catch (ePuter) {
      // Relais secours : Pollinations
      const res = await fetch('https://text.pollinations.ai/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: consigne },
            { role: 'user', content: saisie }
          ],
          model: 'openai'
        })
      });
      if (!res.ok) return false;
      const data = await res.json();
      brut = (data.choices?.[0]?.message?.content ?? '').trim();
    }

    // Extraction du JSON (tolere les fences ``` et le texte parasite)
    const match = brut.match(/\{[^{}]*\}/);
    if (!match) return false;
    const extrait = JSON.parse(match[0]);

    // Garde-fous : validation stricte avant tout stockage
    if (extrait && extrait.rien === true) return false;
    if (!extrait || !TYPES_MEMOIRE_AUTORISES.includes(extrait.type)) return false;
    const cle = String(extrait.cle || '').trim().replace(/\s+/g, ' ');
    const valeur = String(extrait.valeur || '').trim().replace(/\s+/g, ' ');
    if (cle.length < 2 || valeur.length < 2) return false;
    // Garde nom propre (miroir de celle des regex) : famille/relations ne mémorise
    // que des noms (majuscule), jamais un état (« décédé », « malade »...)
    if ((extrait.type === 'famille' || extrait.type === 'relations') && /^[a-zà-ÿ]/.test(valeur)) return false;
    // Stockage canonique (unique vs multiple) : meme gouvernance que les regex
    const resultat = stockerFait(extrait.type, cle, valeur);
    if (resultat === 'apris') log('🔎 Appris — LLM (' + extrait.type + ') : ' + cle + ' : ' + valeur);
    else if (resultat === 'maj') log('🔎 Fait mis à jour — LLM (' + extrait.type + ') : ' + cle + ' : ' + valeur);
    if (resultat === 'apris' || resultat === 'maj') {
      sauvegarderMemoire();
      afficherMemoire();
      return true;
    }
    return false; // 'deja' connu
  } catch (e) {
    // JSON malforme, reseau, etc. : on ignore silencieusement, jamais de fait corrompu
    return false;
  }
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
