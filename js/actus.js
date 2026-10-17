
// ---- Actualités pour le dialogue (titres + résumés RSS frais, texte injectable) ----
// Ordre = priorité décroissante. n = nombre de titres récupérés par flux.
// (BFM et Franceinfo testes le 17/10/2026 : rss2json refuse BFM, renvoie un flux
//  vide pour Franceinfo — a retester dans quelques semaines.)
const FLUX_ACTUS = [
  { url: 'https://www.ouest-france.fr/rss-en-continu.xml', n: 7 },
  { url: 'https://www.lemonde.fr/rss/une.xml', n: 5 }
];

// Premiere phrase de la description : assez de matiere pour le LLM, pas trop de contexte
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
        console.error('Flux en echec : ' + flux.url + ' (' + (data.message || 'statut non ok') + ')');
        titresParFlux.push(null); continue;
      }
      const nom = (data.feed && data.feed.title) || 'flux';
      const items = (data.items || []).slice(0, flux.n)
        .map(i => ({ titre: i.title, resume: premierPhrase(i.description) }))
        .filter(i => i.titre);
      if (items.length === 0) {
        console.error('Flux sans titres exploitables : ' + flux.url);
        titresParFlux.push(null); continue;
      }
      titresParFlux.push({ nom: nom, items: items });
    } catch (e) { console.error('Flux en echec : ' + flux.url + ' (' + e.message + ')'); titresParFlux.push(null); }
  }
  const ok = titresParFlux.filter(f => f && f.items.length > 0);
  if (ok.length === 0) return null;
  let texte = 'Titres de presse accompagnes de leur resume, recoltes a l instant (' + new Date().toLocaleString('fr-FR') + ') :';
  ok.forEach(f => {
    texte += '\n' + f.nom + ' :';
    f.items.forEach(i => {
      texte += '\n- ' + i.titre;
      if (i.resume) texte += ' -- ' + i.resume;
    });
  });
  texte += '\nPriorite au flux en continu (Ouest France) pour la fraicheur ; Le Monde apporte la profondeur.';
  return texte;
}
