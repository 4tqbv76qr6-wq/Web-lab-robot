// Web Lab Robot — moteur avec modules Horloge, Météo (Open-Meteo) et RSS (rss2json)
const consoleEl = document.getElementById('console');
const statusEl = document.getElementById('status');

function log(msg) {
  const time = new Date().toLocaleTimeString('fr-FR');
  consoleEl.textContent += '[' + time + '] ' + msg + '\n';
}

// ---- Configuration des modules ----
const CONFIG = {
  // Ville par défaut pour la météo
  ville: 'Paris',
  // Flux RSS par défaut (URL complète du flux)
  rss: 'https://www.lemonde.fr/rss/une.xml'
};

// ---- Modules externes ----
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
        // 1. Géocodage : ville -> coordonnées
        const geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name='
          + encodeURIComponent(CONFIG.ville)
          + '&count=1&language=fr&format=json';
        const geoRes = await fetch(geoUrl);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
          log('Ville introuvable.');
          return;
        }
        const { latitude, longitude, name, country } = geoData.results[0];
        log('Ville trouvée : ' + name + ' (' + country + ')');

        // 2. Météo : coordonnées -> conditions actuelles
        const meteoUrl = 'https://api.open-meteo.com/v1/forecast?latitude='
          + latitude + '&longitude=' + longitude
          + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
          + '&timezone=auto';
        const meteoRes = await fetch(meteoUrl);
        const meteoData = await meteoRes.json();
        const c = meteoData.current;

        // 3. Traduction du code météo
        const codes = {
          0: 'Ciel dégagé', 1: 'Peu nuageux', 2: 'Partiellement nuageux', 3: 'Couvert',
          45: 'Brouillard', 48: 'Brouillard givrant',
          51: 'Bruine légère', 53: 'Bruine', 55: 'Bruine forte',
          61: 'Pluie légère', 63: 'Pluie', 65: 'Pluie forte',
          71: 'Neige légère', 73: 'Neige', 75: 'Neige forte',
          80: 'Averses légères', 81: 'Averses', 82: 'Averses fortes',
          95: 'Orage', 96: 'Orage avec grêle', 99: 'Orage violent avec grêle'
        };
        const desc = codes[c.weather_code] || 'Conditions inconnues (code ' + c.weather_code + ')';

        log('--- Météo à ' + name + ' ---');
        log('Conditions : ' + desc);
        log('Température : ' + c.temperature_2m + '°C');
        log('Humidité : ' + c.relative_humidity_2m + '%');
        log('Vent : ' + c.wind_speed_10m + ' km/h');
      } catch (e) {
        log('Erreur météo : ' + e.message);
      }
    }
  },
  rss: {
    label: 'Flux RSS',
    run: async () => {
      try {
        log('Chargement du flux : ' + CONFIG.rss);
        // Service relais : convertit le RSS en JSON lisible par le navigateur
        const url = 'https://api.rss2json.com/v1/api.json?rss_url='
          + encodeURIComponent(CONFIG.rss);
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== 'ok') {
          log('Flux inaccessible : ' + (data.message || 'erreur inconnue'));
          return;
        }

        log('Flux : ' + (data.feed?.title || 'sans titre'));
        const items = (data.items || []).slice(0, 5);
        if (items.length === 0) {
          log('Aucun article trouvé.');
          return;
        }
        items.forEach((item, i) => {
          log((i + 1) + '. ' + item.title);
        });
      } catch (e) {
        log('Erreur RSS : ' + e.message);
      }
    }
  }
};

// ---- Câblage des boutons ----
document.querySelectorAll('#connections li').forEach(li => {
  li.addEventListener('click', async () => {
    const mod = modules[li.dataset.app];
    if (mod) {
      log('--- ' + mod.label + ' ---');
      await mod.run();
    }
  });
});

statusEl.textContent = 'Robot en ligne — ' + Object.keys(modules).length + ' modules';
log('Robot démarré.');
