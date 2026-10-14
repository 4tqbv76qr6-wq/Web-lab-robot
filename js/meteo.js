// ---- Météo pour le dialogue (retourne un texte injectable dans le contexte LLM) ----
async function obtenirMeteo(ville) {
  const geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name='
    + encodeURIComponent(ville) + '&count=1&language=fr&format=json';
  const geoData = await (await fetch(geoUrl)).json();
  if (!geoData.results || geoData.results.length === 0) return null;
  const { latitude, longitude, name } = geoData.results[0];

  const meteoUrl = 'https://api.open-meteo.com/v1/forecast?latitude=' + latitude
    + '&longitude=' + longitude
    + '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code'
    + '&timezone=auto';
  const c = (await (await fetch(meteoUrl)).json()).current;
  const codes = {
    0: 'ciel dégagé', 1: 'peu nuageux', 2: 'partiellement nuageux', 3: 'couvert',
    45: 'brouillard', 48: 'brouillard givrant', 51: 'bruine légère', 53: 'bruine',
    55: 'bruine forte', 61: 'pluie légère', 63: 'pluie', 65: 'pluie forte',
    71: 'neige légère', 73: 'neige', 75: 'neige forte', 80: 'averses légères',
    81: 'averses', 82: 'averses fortes', 95: 'orage', 96: 'orage avec grêle',
    99: 'orage violent avec grêle'
  };

  appliquerMeteoVisage(c.weather_code);
  return 'Données météo réelles à ' + name + ' : ' + (codes[c.weather_code] || 'conditions inconnues')
    + ', ' + c.temperature_2m + '°C, humidité ' + c.relative_humidity_2m + '%, vent ' + c.wind_speed_10m + ' km/h.';

}
