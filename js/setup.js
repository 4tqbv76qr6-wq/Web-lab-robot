// setup.js — Paramètres du robot (distincts des faits appris)
const SETUP_DEFAUT = {
  nomUtilisateur: '',
  nomRobot: 'Web Lab Robot',
  villeRef: 'Plouay'
};
let setup = { ...SETUP_DEFAUT };

function sauvegarderSetup() {
  localStorage.setItem('robotSetup', JSON.stringify(setup));
}

function chargerSetup() {
  try {
    const brut = localStorage.getItem('robotSetup');
    if (brut) setup = { ...SETUP_DEFAUT, ...JSON.parse(brut) };
  } catch (e) { /* défaut conservé */ }
}

function afficherSetup() {
  document.getElementById('setup-nom').value = setup.nomUtilisateur;
  document.getElementById('setup-nom-robot').value = setup.nomRobot;
  document.getElementById('setup-ville').value = setup.villeRef;
}

function enregistrerSetup() {
  setup.nomUtilisateur = document.getElementById('setup-nom').value.trim();
  setup.nomRobot = document.getElementById('setup-nom-robot').value.trim();
  setup.villeRef = document.getElementById('setup-ville').value.trim() || SETUP_DEFAUT.villeRef;
  sauvegarderSetup();
  log('⚙️ Réglages enregistrés : ' + (setup.nomUtilisateur || 'utilisateur sans nom')
    + ' — ' + setup.nomRobot + ' — référence : ' + setup.villeRef);
}
