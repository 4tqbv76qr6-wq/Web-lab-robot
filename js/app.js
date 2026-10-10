// Web Lab Robot — Horloge, Météo, RSS, Dialogue LLM
// Mémoire persistante (localStorage) + export / import
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
  systemPrompt: 'Tu es Web Lab Robot, un robot de laboratoire web. Reponds en francais, de facon concise et sympathique, en 3 phrases maximum.',
  cleMemoire: 'webLabRobot.memoire'
};

// ---- Mémoire persistante (localStorage) ----
const memoire = { messages: [] };

function sauvegarderMemoire() {
  try {
    localStorage.setItem(CONFIG.cleMemoire, JSON.stringify(memoire.messages));
  } catch (e) {
    log('Erreur sauvegarde mémoire : ' + e.message);
  }
}

function chargerMemoire() {
  try {
    const brut = localStorage.getItem(CONFIG.cleMemoire);
    if (!brut) return;
    const data = JSON.parse(brut);
    if (Array.isArray(data)) memoire.messages = data;
  } catch (e) {
    log('Mémoire locale illisible, on repart de zéro.');
  }
}

function reinitialiserMemoire() {
  memoire.messages = [];
  localStorage.removeItem(CONFIG.cleMemoire);
  log('🧠 Mémoire effacée.');
}

function exporterMemoire() {
  try {
    const blob = new Blob([JSON.stringify(memoire.messages, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'memoire-web-lab-robot.json';
    a.click();
    URL.revokeObjectURL(a.href);
    log('📤 Mémoire exportée (' + memoire.messages.length + ' messages).');
  } catch (e) {
    log('Erreur export : ' + e.message);
  }
}

function importerMemoire(fichier) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data)) { log('Fichier invalide : ce n est pas une mémoire.'); return; }
      if (memoire.messages.length > 0 && !confirm('Remplacer la mémoire actuelle par celle du fichier ?')) return;
      memoire.messages = data;
      sauvegarderMemoire();
      log('📥 Mémoire importée (' + data.length + ' messages).');
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
    run: async (question) => {
      try {
        log('💬 Toi : ' + question);
        memoire.messages.push({ role: 'user', content: question });

        // Requête POST standard : consigne système + 10 derniers messages
        const messages = [
          { role: 'system', content: CONFIG.systemPrompt },
          ...memoire.messages.slice(-10)
        ];

        const res = await fetch('https://text.pollinations.ai/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages,
            model: 'openai'
          })
        });
        if (!res.ok) { log('Erreur LLM (HTTP ' + res.status + ')'); return; }
        const reponse = (await res.text()).trim();

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
log('Robot démarré. Mémoire : ' + memoire.messages.length + ' messages enregistrés.');
statusEl.textContent = 'Robot en ligne — ' + Object.keys(modules).length + ' modules';
