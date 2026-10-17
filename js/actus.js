// ---- Actualités pour le dialogue (titres + résumés détaillés RSS, texte injectable) ----
// v5bis (17/10/2026) : résumé étendu 3 phrases / 320 caractères au lieu d'une seule.
// La matière RSS était là (descriptions de 2-3 phrases) — premierPhrase() la coupait trop tôt.
// Ordre = priorité décroissante. n = nombre de titres récupérés par flux.
// (BFM et Franceinfo testés le 17/10/2026 : rss2json refuse BFM, renvoie un flux
//  vide pour Franceinfo — à retester dans quelques semaines.)
const FLUX_ACTUS = [
  { url: 'https://www.ouest-france.fr/rss-en-continu.xml', n: 6 },
  { url: 'https://www.france24.com/fr/rss', n: 5 },
  { url: 'https://www.20minutes.fr/feeds/rss-une.xml', n: 5 },
  { url: 'https://www.lemonde.fr/rss/une.xml', n: 4 }
];

// Résumé étendu : jusqu'à 3 phrases / 320 caractères.
// La matière RSS est là — la couper à une phrase privait le LLM des 2/3 du détail disponible.
function resumeEtendu(texte) {
  if (!texte) return '';
  const propre = texte.replace(/<[^>]*>/g, '').trim();
  if (!propre) return '';
  const phrases = propre.split(/(?<=[.!?…])\s/);
  let resultat = '';
  let nbPhrases = 0;
  for (const p of phrases) {
    if (nbPhrases >= 3) break;
    if ((resultat + ' ' + p).trim().length > 320) break;
    resultat += (resultat ? ' ' : '') + p;
    nbPhrases++;
  }
  return resultat.trim();
}

// Ancienne version conservée en secours (une seule phrase) — non utilisée par obtenirActus().
function premierPhrase(texte) {
  if (!texte) return '';
  return texte.replace(/<[^>]*>/g, '').split(/(?<=[.!?…])\s/)[0].trim();
}

async function obtenirActus() {
  const titresParFlux = [];
  for (const flux of FLUX_ACTUS) {
    try {
      const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(flux.url);
      const data = await (await fetch(url)).json();
      if (data.status !== 'ok') {
        console.error('Flux en échec : ' + flux.url + ' (' + (data.message || 'statut non ok') + ')');
        titresParFlux.push(null); continue;
      }
      const nom = (data.feed && data.feed.title) || 'flux';
      const items = (data.items || []).slice(0, flux.n)
        .map(i => ({ titre: i.title, resume: resumeEtendu(i.description) }))
        .filter(i => i.titre);
      if (items.length === 0) {
        console.error('Flux sans titres exploitables : ' + flux.url);
        titresParFlux.push(null); continue;
      }
      titresParFlux.push({ nom: nom, items: items });
    } catch (e) { console.error('Flux en échec : ' + flux.url + ' (' + e.message + ')'); titresParFlux.push(null); }
  }
  const ok = titresParFlux.filter(f => f && f.items.length > 0);
  if (ok.length === 0) return null;
  let texte = 'Actus de presse avec résumés détaillés (jusqu\u2019à 3 phrases par article), récoltées à l\u2019instant (' + new Date().toLocaleString('fr-FR') + ') :';
  ok.forEach(f => {
    texte += '\n' + f.nom + ' :';
    f.items.forEach(i => {
      texte += '\n- ' + i.titre;
      if (i.resume) texte += ' -- ' + i.resume;
    });
  });
  texte += '\nPriorité au flux en continu (Ouest France) pour la fraîcheur ; France 24 apporte l\u2019international ; Le Monde la profondeur.';
  return texte;
}
