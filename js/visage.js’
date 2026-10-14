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

    // Soleil : disque scintillant en haut à droite + lunettes de soleil sur les yeux
    svg = '<g>'
        // Soleil : halo qui pulse
        + '<circle cx="84" cy="14" r="9" fill="#f5c451" opacity="0.35">'
        + '<animate attributeName="r" values="9;12;9" dur="2.5s" repeatCount="indefinite"/>'
        + '<animate attributeName="opacity" values="0.35;0.15;0.35" dur="2.5s" repeatCount="indefinite"/></circle>'
        // Rayons qui scintillent en rotation lente
        + '<g stroke="#f5c451" stroke-width="2" stroke-linecap="round" opacity="0.9">'
        + '<line x1="84" y1="1" x2="84" y2="5"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" repeatCount="indefinite"/></line>'
        + '<line x1="84" y1="23" x2="84" y2="27"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin="0.4s" repeatCount="indefinite"/></line>'
        + '<line x1="71" y1="14" x2="75" y2="14"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin="0.8s" repeatCount="indefinite"/></line>'
        + '<line x1="93" y1="14" x2="97" y2="14"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin="1.2s" repeatCount="indefinite"/></line>'
        + '<line x1="75" y1="5" x2="78" y2="8"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin="0.2s" repeatCount="indefinite"/></line>'
        + '<line x1="90" y1="20" x2="93" y2="23"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin="0.6s" repeatCount="indefinite"/></line>'
        + '<line x1="93" y1="5" x2="90" y2="8"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin="1s" repeatCount="indefinite"/></line>'
        + '<line x1="78" y1="20" x2="75" y2="23"><animate attributeName="opacity" values="0.4;1;0.4" dur="1.6s" begin="1.4s" repeatCount="indefinite"/></line>'
        + '</g>'
        // Disque central avec brillance
        + '<circle cx="84" cy="14" r="6" fill="#f5c451">'
        + '<animate attributeName="r" values="6;6.8;6" dur="2.5s" repeatCount="indefinite"/></circle>'
        // Petit reflet sur le disque (scintillement)
        + '<circle cx="82" cy="12" r="1.5" fill="#fff3c4" opacity="0.9">'
        + '<animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.8s" repeatCount="indefinite"/></circle>'
        // Lunettes de soleil sur les yeux
        + '<rect x="28" y="44" width="18" height="11" rx="4" fill="#1e2a38" stroke="#f5c451" stroke-width="1.5"/>'
        + '<rect x="54" y="44" width="18" height="11" rx="4" fill="#1e2a38" stroke="#f5c451" stroke-width="1.5"/>'
        + '<line x1="46" y1="49" x2="54" y2="49" stroke="#f5c451" stroke-width="2"/>'
        + '</g>';




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
