
const consoleEl = document.getElementById('console');
const statusEl = document.getElementById('status');

function log(msg) {
  const time = new Date().toLocaleTimeString('fr-FR');
  const line = document.createElement('div');
  line.textContent = '[' + time + '] ' + msg;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function logLink(texte, url) {
  const time = new Date().toLocaleTimeString('fr-FR');
  const line = document.createElement('div');
  const stamp = document.createElement('span');
  stamp.textContent = '[' + time + '] ';
  const link = document.createElement('a');
  link.textContent = texte;
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener';
  line.appendChild(stamp);
  line.appendChild(link);
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}
