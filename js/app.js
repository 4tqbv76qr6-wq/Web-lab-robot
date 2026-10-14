// ---- Réglages ----
chargerSetup();
afficherSetup();
document.getElementById('btn-setup').addEventListener('click', enregistrerSetup);

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
afficherMemoire();
log('Robot démarré. Mémoire : ' + memoire.faits.length + ' fait(s), ' + memoire.messages.length + ' message(s).');

statusEl.textContent = 'Robot en ligne — ' + Object.keys(modules).length + ' modules';


// Visage météo au démarrage (ville de référence des Réglages)
(async () => {
  try {
    await obtenirMeteo(setup.villeRef);
  } catch (e) { /* visage par défaut */ }
})();
