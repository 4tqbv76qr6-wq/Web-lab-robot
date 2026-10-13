// Web Lab Robot — Horloge, Météo, RSS, Dialogue LLM
// Mémoire hybride : faits structurés (style Labo 2) + LLM comme formateur de réponse
const consoleEl = document.getElementById('console');
const statusEl = document.getElementById('status');

function log(msg) {
  const time = new Date().toLocaleTimeString('fr-FR');
  const line = document.createElement('div');
  line.textContent = '[' + time + '] ' + msg;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function logLink(texte, url) {
  const time = new Date().toLocaleTimeString('fr-FR');
  const line = document.createElement('div');
  const stamp = document.createElement('span');
  stamp.textContent = '[' + time + '] ';
  const link = document.createElement('a');
  link.textContent = texte;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  line.appendChild(stamp);
  line.appendChild(link);
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

// ---- Visage du robot (états : neutre / pense / parle / erreur) ----
const visage = {
  el: document.getElementById('visage'),
  oeils: [document.getElementById('visage-oeil-g'), document.getElementById('visage-oeil-d')],
  bouche: document.getElementById('visage-bouche'),
  antenne: document.getElementById('visage-antenne'),
  joie: [document.getElementById('visage-joie-g'), document.getElementById('visage-joie-d')],
  etat: 'neutre',
  minuteur: null,

  appliquer() {
    const conf = {
      neutre:  { couleur: '#4ad6a5', bouche: 'M 40 64 Q 50 70 60 64', joie: 0, antenne: '#4a9edd' },
      pense:  { couleur: '#f5c451', bouche: 'M 42 66 Q 50 62 58 66', joie: 0, antenne: '#f5c451' },
      parle:  { couleur: '#4ad6a5', bouche: 'M 38 62 Q 50 74 62 62', joie: 1, antenne: '#4ad6a5' },
      erreur: { couleur: '#e8746a', bouche: 'M 40 68 Q 50 60 60 68', joie: 0, antenne: '#e8746a' }
    }[this.etat];
    this.oeils.forEach(o => o.setAttribute('fill', conf.couleur));
    this.bouche.setAttribute('d', conf.bouche);
    this.bouche.setAttribute('stroke', conf.couleur);
    this.antenne.setAttribute('fill', conf.antenne);
    this.joie.forEach(j => j.setAttribute('opacity', conf.joie));
  },

  set(etat, retourAuto) {
    this.etat = etat;
    this.appliquer();
    clearTimeout(this.minuteur);
    if (retourAuto) {
      this.minuteur = setTimeout(() => { this.etat = 'neutre'; this.appliquer(); }, retourAuto);
    }
  },

  clier() {  // clignement des yeux (seulement quand neutre)
    if (this.etat !== 'neutre') return;
    this.oeils.forEach(o => o.setAttribute('ry', 1));
    setTimeout(() => {
      if (this.etat === 'neutre') this.oeils.forEach(o => o.setAttribute('ry', 8));
    }, 140);
  },

  init() {
    setInterval(() => this.clier(), 3200 + Math.random() * 2600);
  }
};
visage.init();
// ---- Visage réactif à la météo (transposition du Labo 2) ----
// soleil → lunettes ; pluie → gouttes + parapluie ; nuages → nuages dérivants ; neige → flocons ; orage → éclair
function appliquerMeteoVisage(code) {
  const g = document.getElementById('visage-meteo');
  if (!g) return;
  let svg = '';
  if (code === 0 || code === 1) {
    // Soleil : lunettes de soleil sur les yeux
    svg = '<g><rect x="28" y="44" width="18" height="11" rx="4" fill="#1e2a38" stroke="#f5c451" stroke-width="1.5"/>'
        + '<rect x="54" y="44" width="18" height="11" rx="4" fill="#1e2a38" stroke="#f5c451" stroke-width="1.5"/>'
        + '<line x1="46" y1="49" x2="54" y2="49" stroke="#f5c451" stroke-width="2"/></g>';
  } else if ((code >= 51 && code <= 65) || (code >= 80 && code <= 82)) {
    // Pluie : gouttes qui tombent + parapluie
    svg = '<g fill="#7db9ff" opacity="0.85">'
        + [24, 40, 56, 72].map((x, i) =>
            '<ellipse cx="' + x + '" cy="20" rx="1.8" ry="3.5">'
          + '<animate attributeName="cy" values="12;90" dur="1.1s" begin="' + (i * 0.28) + 's" repeatCount="indefinite"/>'
          + '<animate attributeName="opacity" values="0;0.9;0" dur="1.1s" begin="' + (i * 0.28) + 's" repeatCount="indefinite"/>'
          + '</ellipse>').join('')
        + '</g>'
        + '<g><path d="M 8 22 Q 8 -6 50 -6 Q 92 -6 92 22 Z" fill="#4a6a9e"/>'
        + '<line x1="50" y1="-6" x2="50" y2="12" stroke="#2f3d5c" stroke-width="2.5"/></g>';
  } else if (code >= 71 && code <= 77) {
    // Neige : flocons qui tombent
    svg = '<g fill="#e6ecf7" opacity="0.9">'
        + [24, 40, 56, 72].map((x, i) =>
            '<circle cx="' + x + '" cy="20" r="2.5">'
          + '<animate attributeName="cy" values="12;90" dur="2s" begin="' + (i * 0.5) + 's" repeatCount="indefinite"/>'
          + '<animate attributeName="opacity" values="0;0.9;0" dur="2s" begin="' + (i * 0.5) + 's" repeatCount="indefinite"/>'
          + '</circle>').join('')
        + '</g>';
  } else if (code >= 95) {
    // Orage : éclair sur la joue + nuage sombre
    svg = '<g><ellipse cx="50" cy="14" rx="20" ry="6" fill="#3a3f55">'
        + '<animateTransform attributeName="transform" type="translate" values="0 0; 5 0; 0 0" dur="5s" repeatCount="indefinite"/></ellipse>'
        + '<path d="M 50 6 L 44 18 L 49 18 L 45 28 L 54 16 L 49 16 Z" fill="#f5c451">'
        + '<animate attributeName="opacity" values="0.4;1;0.4" dur="1.5s" repeatCount="indefinite"/></path></g>';
  } else {
    // Nuages / couvert / brouillard : nuages qui dérivent
    svg = '<g fill="#8a97ad" opacity="0.85">'
        + '<g><ellipse cx="30" cy="14" rx="10" ry="4.5"/><ellipse cx="38" cy="11" rx="7" ry="3.5"/>'
        + '<animateTransform attributeName="transform" type="translate" values="0 0; 8 0; 0 0" dur="7s" repeatCount="indefinite"/></g>'
        + '<g><ellipse cx="68" cy="18" rx="9" ry="4"/><ellipse cx="75" cy="15.5" rx="6" ry="3"/>'
        + '<animateTransform attributeName="transform" type="translate" values="0 0; -8 0; 0 0" dur="9s" repeatCount="indefinite"/></g>'
        + '</g>';
  }
  g.innerHTML = svg;
}

// ---- Configuration ----
const CONFIG = {
  ville: 'Paris',
  rss: 'https://www.lemonde.fr/rss/une.xml',
  systemPrompt: 'Tu es Web Lab Robot, un robot de laboratoire web. Reponds en francais, de facon concise et sympathique, en 3 phrases maximum. Tu disposes de connaissances memorisees sur l utilisateur, citees plus bas : sers-t en quand elles sont pertinentes.',
  cleMemoire: 'webLabRobot.memoire'
};

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

// ---- Météo pour le dialogue (retourne un texte injectable dans le contexte LLM) ----
async function obtenirMeteo(ville) {
  const geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name='
    + encodeURIComponent(ville) + '&count=1&language=fr&format=json';
  const geoData = await (await fetch(geoUrl)).json();
  if (!geoData.results || geoData.results.length === 0) return null;
  const { latitude, longitude, name } = geoData.results[0];

  const meteoUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + latitude
    + '&longitude=' + longitude
    + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
    + '&timezone=auto';
  const c = (await (await fetch(meteoUrl)).json()).current;
  const codes = {
    0: 'ciel dégagé', 1: 'peu nuageux', 2: 'partiellement nuageux', 3: 'couvert',
    45: 'brouillard', 48: 'brouillard givrant', 51: 'bruine légère', 53: 'bruine',
    55: 'bruine forte', 61: 'pluie légère', 63: 'pluie', 65: 'pluie forte',
    71: 'neige légère', 73: 'neige', 75: 'neige forte', 80: 'averses légères',
    81: 'averses', 82: 'averses fortes', 95: 'orage', 96: 'orage avec grêle',
    99: 'orage violent avec grêle'
  };

  appliquerMeteoVisage(c.weather_code);
  return 'Données météo réelles à ' + name + ' : ' + (codes[c.weather_code] || 'conditions inconnues')
    + ', ' + c.temperature_2m + '°C, humidité ' + c.relative_humidity_2m + '%, vent ' + c.wind_speed_10m + ' km/h.';

}

// ---- Modules ----
const modules = {
  horloge: {
    label: 'Horloge',
    run: async () => {
      const now = new Date().toLocaleString('fr-FR');
      log('Il est ' + now);
    }
  },
  meteo: {
    label: 'Météo',
    run: async () => {
      try {
        log('Recherche de la ville : ' + CONFIG.ville + '...');
        const geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name='
          + encodeURIComponent(CONFIG.ville) + '&count=1&language=fr&format=json';
        const geoData = await (await fetch(geoUrl)).json();
        if (!geoData.results || geoData.results.length === 0) { log('Ville introuvable.'); return; }
        const { latitude, longitude, name, country } = geoData.results[0];
        log('Ville trouvée : ' + name + ' (' + country + ')');

        const meteoUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + latitude
          + '&longitude=' + longitude
          + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
          + '&timezone=auto';
        const c = (await (await fetch(meteoUrl)).json()).current;
        const codes = {
          0: 'Ciel dégagé', 1: 'Peu nuageux', 2: 'Partiellement nuageux', 3: 'Couvert',
          45: 'Brouillard', 48: 'Brouillard givrant', 51: 'Bruine légère', 53: 'Bruine',
          55: 'Bruine forte', 61: 'Pluie légère', 63: 'Pluie', 65: 'Pluie forte',
          71: 'Neige légère', 73: 'Neige', 75: 'Neige forte', 80: 'Averses légères',
          81: 'Averses', 82: 'Averses fortes', 95: 'Orage', 96: 'Orage avec grêle',
          99: 'Orage violent avec grêle'
        };
        const desc = codes[c.weather_code] || 'Conditions inconnues';
        log('--- Météo à ' + name + ' ---');
        log('Conditions : ' + desc);
        log('Température : ' + c.temperature_2m + '°C');
        log('Humidité : ' + c.relative_humidity_2m + '%');
        log('Vent : ' + c.wind_speed_10m + ' km/h');
      } catch (e) { log('Erreur météo : ' + e.message); }
    }
  },
  rss: {
    label: 'Flux RSS',
    run: async () => {
      try {
        log('Chargement du flux : ' + CONFIG.rss);
        const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(CONFIG.rss);
        const data = await (await fetch(url)).json();
        if (data.status !== 'ok') { log('Flux inaccessible : ' + (data.message || 'erreur')); return; }
        log('Flux : ' + (data.feed?.title || 'sans titre'));
        (data.items || []).slice(0, 5).forEach((item, i) => {
          logLink((i + 1) + '. ' + item.title, item.link);
        });
      } catch (e) { log('Erreur RSS : ' + e.message); }
    }
  },
      dialogue: {
    label: 'Dialogue',
    run: async (saisie) => {
      try {
        // Commande € : mémorisation sur instruction (pas de LLM)
        if (saisie.startsWith('€')) {
          const f = saisie.slice(1).trim();
          if (!f) { log('Usage : € suivi du fait à mémoriser.'); return; }
          memoriser(f);
          return;
        }

        visage.set('pense');
        // Apprentissage automatique : repérer les infos durables
        extraireFaits(saisie);
        log('💬 Toi : ' + saisie);
        memoire.messages.push({ role: 'user', content: saisie });

        // Interconnexion météo : la question porte sur le temps → données réelles
        let contexteMeteo = '';
        if (/\b(m[eé]t[eé]o|temps|temp[eé]rature|pleuvoir|pleut|soleil|il fait)\b/i.test(saisie)) {
          let ville = (saisie.match(/\b(?:à|a|sur|pour)\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\-' ]*)/i) || [])[1];
          if (ville) ville = ville.trim().split(/\s+/).slice(0, 3).join(' ');
          if (!ville) {
            const fLieu = memoire.faits.filter(f => f.type === 'lieu').pop();
            if (fLieu) ville = fLieu.text;
          }
          if (!ville) ville = CONFIG.ville;
          try {
            const m = await obtenirMeteo(ville);
            if (m) { contexteMeteo = m; log('🌤️ Météo récupérée pour : ' + ville); }
          } catch (e) { log('Météo indisponible : ' + e.message); }
        }

        // Sélection des faits pertinents (moteur style Labo 2)
        const retenus = faitsPertinents(saisie, 5);
        if (retenus.length > 0) {
          log('🧠 Faits mobilisés : ' + retenus.length);
        }

        // Construction du contexte système (faits + météo)
        let contexteSysteme = CONFIG.systemPrompt;
        if (retenus.length > 0) {
          contexteSysteme += '\n\nConnaissances memorisees sur l utilisateur :\n'
            + retenus.map(f => '- (' + f.type + ') ' + f.text).join('\n');
        }
        if (contexteMeteo) {
          contexteSysteme += '\n\n' + contexteMeteo + ' Sers-toi de ces données réelles et actuelles pour répondre.';
        }

        // Construction du contexte de dialogue (3 derniers échanges max)
        const derniers = memoire.messages.slice(-6);
        const messages = [
          { role: 'system', content: contexteSysteme },
          ...derniers
        ];

        // Tentative 1 : Puter.js (relais principal)
        let reponse = '';
        try {
          if (typeof puter === 'undefined') throw new Error('Puter.js non chargé');
          const rep = await puter.ai.chat(messages);
          if (typeof rep === 'string') {
            reponse = rep.trim();
          } else if (rep && rep.message && rep.message.content) {
            reponse = String(rep.message.content).trim();
          } else if (rep && rep.text) {
            reponse = String(rep.text).trim();
          } else if (rep) {
            reponse = String(rep).trim();
          }
        } catch (ePuter) {
          log('⚠️ Puter indisponible (' + ePuter.message + '), essai Pollinations...');

          // Tentative 2 : Pollinations en secours
          const res = await fetch('https://text.pollinations.ai/openai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messages, model: 'openai' })
          });
          if (!res.ok) { visage.set('erreur', 5000); log('Erreur LLM (HTTP ' + res.status + ') — les deux relais ont échoué.'); return; }
          const brut = await res.text();
          try {
            const data = JSON.parse(brut);
            reponse = (data.choices?.[0]?.message?.content || '').trim();
          } catch (err) { reponse = brut.trim(); }
        }

        if (!reponse) { log('Réponse LLM vide.'); return; }

        memoire.messages.push({ role: 'assistant', content: reponse });
        sauvegarderMemoire();
        visage.set('parle', 4000);
        log('🤖 Robot : ' + reponse);
      } catch (e) { log('Erreur dialogue : ' + e.message); }
    }
  }
};

// ---- Boutons modules ----
//document.querySelectorAll('#connections li').forEach(li => {
  //li.addEventListener('click', async () => {
    //const mod = modules[li.dataset.app];
    //if (mod) {
      //log('--- ' + mod.label + ' ---');
      //await mod.run();
    //}
  //});
//});

// ---- Zone de dialogue ----
const dialogueInput = document.getElementById('dialogue-input');
const dialogueSend = document.getElementById('dialogue-send');

async function envoyerDialogue() {
  const q = dialogueInput.value.trim();
  if (!q) return;
  dialogueInput.value = '';
  dialogueSend.disabled = true;
  await modules.dialogue.run(q);
  dialogueSend.disabled = false;
  dialogueInput.focus();
}

dialogueSend.addEventListener('click', envoyerDialogue);
dialogueInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') envoyerDialogue();
});

// ---- Mémoire : boutons ----
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnReset = document.getElementById('btn-reset');
const fichierImport = document.getElementById('fichier-import');

btnExport.addEventListener('click', exporterMemoire);
btnReset.addEventListener('click', () => {
  if (confirm('Effacer toute la mémoire du robot ?')) reinitialiserMemoire();
});
btnImport.addEventListener('click', () => fichierImport.click());
fichierImport.addEventListener('change', () => {
  if (fichierImport.files && fichierImport.files[0]) {
    importerMemoire(fichierImport.files[0]);
  }
});

// ---- Démarrage ----
chargerMemoire();
afficherMemoire();
log('Robot démarré. Mémoire : ' + memoire.faits.length + ' fait(s), ' + memoire.messages.length + ' message(s).');

statusEl.textContent = 'Robot en ligne — ' + Object.keys(modules).length + ' modules';

// Visage météo au démarrage (ville du fait lieu si mémorisée, sinon CONFIG.ville)
(async () => {
  try {
    const fLieu = memoire.faits.filter(f => f.type === 'lieu').pop();
    await obtenirMeteo(fLieu ? fLieu.text : CONFIG.ville);
  } catch (e) { /* visage par défaut */ }
})();
