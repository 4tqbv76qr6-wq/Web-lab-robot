// ---- Actualités pour le dialogue (titres RSS frais, texte injectable) ----
// Ordre = priorité décroissante. n = nombre de titres récupérés par flux.
const FLUX_ACTUS = [
  { url: 'https://www.bfmtv.com/rss/actualites/', n: 8 },
  { url: 'https://www.lemonde.fr/rss/une.xml', n: 4 },
  { url: 'https://www.ouest-france.fr/rss-en-continu.xml', n: 4 }
];

async function obtenirActus() {
  const titresParFlux = [];
  for (const flux of FLUX_ACTUS) {
    try {
      const url = 'https://api.rss2json.com/v1/api.json?rss_url=' + encodeURIComponent(flux.url);
      const data = await (await fetch(url)).json();
      if (data.status !== 'ok') { titresParFlux.push(null); continue; }
      const nom = (data.feed && data.feed.title) || 'flux';
      const titres = (data.items || []).slice(0, flux.n).map(i => i.title);
      titresParFlux.push({ nom: nom, titres: titres });
    } catch (e) { titresParFlux.push(null); }
  }
  const ok = titresParFlux.filter(f => f && f.titres.length > 0);
  if (ok.length === 0) return null;
  let texte = 'Titres de presse recoltes a l instant (' + new Date().toLocaleString('fr-FR') + ') :';
  ok.forEach(f => {
    texte += '\n' + f.nom + ' :';
    f.titres.forEach(t => { texte += '\n- ' + t; });
  });
  texte += '\nPriorite aux titres BFMTV (info en continu, les plus recents) ; les autres flux apportent la profondeur.';
  return texte;
}
