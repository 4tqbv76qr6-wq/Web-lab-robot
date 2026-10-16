// ---- Wikipédia pour le dialogue (retourne un texte injectable dans le contexte LLM) ----
async function obtenirResumeWiki(sujet) {
  // 1. Recherche du titre d'article (opensearch, CORS ouvert via origin=*)
  const rechUrl = 'https://fr.wikipedia.org/w/api.php?action=opensearch&search='
    + encodeURIComponent(sujet) + '&limit=1&format=json&origin=*';
  const rech = await (await fetch(rechUrl)).json();
  const titre = (rech[1] && rech[1][0]) || null;
  if (!titre) return null;

  // 2. Résumé de l'article (API REST, 2-3 phrases)
  const sumUrl = 'https://fr.wikipedia.org/api/rest_v1/page/summary/'
    + encodeURIComponent(titre);
  const page = await (await fetch(sumUrl)).json();
  if (!page.extract) return null;

  const lien = (page.content_urls && page.content_urls.desktop && page.content_urls.desktop.page) || '';
  return 'Donnee encyclopedique Wikipedia sur « ' + page.title + ' » : ' + page.extract
    + (lien ? ' (Source : ' + lien + ')' : '');
}
