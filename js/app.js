// Web Lab Robot — moteur de base
const consoleEl = document.getElementById('console');
const statusEl = document.getElementById('status');

function log(msg) {
  const time = new Date().toLocaleTimeString('fr-FR');
  consoleEl.textContent += '[' + time + '] ' + msg + '\n';
}

// Modules externes (à activer un par un)
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
      log('Module météo : non connecté (à venir).');
    }
  },
  rss: {
    label: 'Flux RSS',
    run: async () => {
      log('Module RSS : non connecté (à venir).');
    }
  }
};

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
