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
