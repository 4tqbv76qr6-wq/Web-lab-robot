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
}

// ---- Sélection des faits pertinents pour une question (recherche par mots-clés) ----
function faitsPertinents(question, max) {
  const motsQ = normaliser(question);
  if (motsQ.length === 0) return memoire.faits.slice(-max);
  const scores = memoire.faits.map(f => {
    const motsF = new Set(normaliser(f.text + ' ' + f.type));
    let s = 0;
    motsQ.forEach(m => { if (motsF.has(m)) s++; });
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

        log('💬 Toi : ' + saisie);
        memoire.messages.push({ role: 'user', content: saisie });

        // Sélection des faits pertinents (moteur style Labo 2)
        const retenus = faitsPertinents(saisie, 5);
        if (retenus.length > 0) {
          log('🧠 Faits mobilisés : ' + retenus.length);
        }

        let contexteSysteme = CONFIG.systemPrompt;
        if (retenus.length > 0) {
          contexteSysteme += '\n\nConnaissances memorisees sur l utilisateur :\n'
            + retenus.map(f => '- (' + f.type + ') ' + f.text).join('\n');
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
          if (!res.ok) { log('Erreur LLM (HTTP ' + res.status + ') — les deux relais ont échoué.'); return; }
          const brut = await res.text();
          try {
            const data = JSON.parse(brut);
            reponse = (data.choices?.[0]?.message?.content || '').trim();
          } catch (err) { reponse = brut.trim(); }
        }

        if (!reponse) { log('Réponse LLM vide.'); return; }

        memoire.messages.push({ role: 'assistant', content: reponse });
        sauvegarderMemoire();
        log('🤖 Robot : ' + reponse);
      } catch (e) { log('Erreur dialogue : ' + e.message); }
    }
  }
};

// ---- Boutons modules ----
document.querySelectorAll('#connections li').forEach(li => {
  li.addEventListener('click', async () => {
    const mod = modules[li.dataset.app];
    if (mod) {
      log('--- ' + mod.label + ' ---');
      await mod.run();
    }
  });
});

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
log('Robot démarré. Mémoire : ' + memoire.faits.length + ' fait(s), ' + memoire.messages.length + ' message(s).');
statusEl.textContent = 'Robot en ligne — ' + Object.keys(modules).length + ' modules';
