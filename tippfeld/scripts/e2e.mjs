/*
 * Durchklick-Prüfung: startet einen echten Browser und geht die wichtigsten
 * Wege der App durch - anmelden, tippen, Spieler wählen, Liga gründen,
 * beitreten, Rangliste, Hellmodus, Adminbereich.
 *
 * Voraussetzung: die App läuft bereits.
 *   Fenster 1:  npm run build && npm run start
 *   Fenster 2:  npm run e2e
 *
 * Andere Adresse:  BASIS=http://localhost:3100 npm run e2e
 */
import { chromium } from 'playwright';
const B = process.env.BASIS ?? 'http://localhost:3000';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
let fehler = 0;
const pruefe = async (name, fn) => {
  try { await fn(); console.log('ok      ' + name); }
  catch (e) { fehler++; console.error('FEHLER  ' + name + '\n        ' + e.message.split('\n')[0]); }
};
const text = async () => (await p.locator('body').innerText());
// Labels werden per CSS in Versalien gesetzt - deshalb ohne Rücksicht auf Groß- und Kleinschreibung.
const enthaelt = async (s) => { if (!(await text()).toLowerCase().includes(s.toLowerCase())) throw new Error(`"${s}" fehlt auf ${p.url()}`); };

await pruefe('Ohne Anmeldung leitet die Startseite weiter', async () => {
  await p.goto(B + '/', { waitUntil: 'networkidle' });
  if (!p.url().includes('/anmelden')) throw new Error('keine Weiterleitung: ' + p.url());
});

await pruefe('Anmeldung als Mira', async () => {
  await p.fill('#name', 'Mira');
  await p.click('button[type=submit]');
  await p.waitForURL(B + '/', { timeout: 15000 });
  await enthaelt('Mira');
});

await pruefe('Startseite zeigt Punkte, Ligen und Schnellzugriff', async () => {
  await enthaelt('Punkte gesamt');
  await enthaelt('Deine Platzierungen');
  await enthaelt('KI-Analyse');
  await enthaelt('Demo-Daten');
});

await pruefe('Untere Navigation führt zu Spielen', async () => {
  await p.click('.untenleiste__knopf:has-text("Spiele")');
  await p.waitForURL(/\/spiele/, { timeout: 15000 });
  await enthaelt('Spieltag');
});

let spielUrl = null;
await pruefe('Ein tippbares Spiel ist erreichbar', async () => {
  const karte = p.locator('.spielkarte', { hasText: 'Spiel tippen' }).first();
  await karte.waitFor({ timeout: 10000 });
  spielUrl = await karte.getAttribute('href');
  await karte.click();
  await p.waitForURL(/\/spiele\//, { timeout: 15000 });
  await enthaelt('Dein Tipp');
  await enthaelt('Statistische Prognose');
});

await pruefe('KI-Analyse zeigt Prozente, Faktoren und Unsicherheiten', async () => {
  await enthaelt('Unsicherheiten');
  await enthaelt('Erwartete Tore');
  await enthaelt('Häufigste Ergebnisse');
  const balken = await p.locator('.tf-balken__fuellung').count();
  if (balken < 3) throw new Error('weniger als drei Wahrscheinlichkeitsbalken');
});

await pruefe('Tipp abgeben wird gespeichert', async () => {
  await p.fill('#toreHeim', '3');
  await p.fill('#toreGast', '1');
  await p.click('button:has-text("Tipp abgeben"), button:has-text("Tipp ändern")');
  await p.waitForSelector('text=Dein Tipp wurde gespeichert', { timeout: 15000 });
});

await pruefe('Tipp bleibt nach dem Neuladen erhalten', async () => {
  await p.reload({ waitUntil: 'networkidle' });
  const h = await p.inputValue('#toreHeim');
  const g = await p.inputValue('#toreGast');
  if (h !== '3' || g !== '1') throw new Error(`gespeichert war ${h}:${g}`);
});

await pruefe('Spielerauswahl wird gespeichert', async () => {
  for (const pos of ['TW', 'ABW', 'MIT', 'ANG']) {
    const sel = p.locator(`#spieler-${pos}`);
    const werte = await sel.locator('option').evaluateAll((os) => os.map((o) => o.value).filter(Boolean));
    await sel.selectOption(werte[0]);
  }
  await p.click('button:has-text("Spielerauswahl speichern")');
  await p.waitForSelector('text=Spielerauswahl gespeichert', { timeout: 15000 });
});

await pruefe('Abgelaufene Tippfrist sperrt das Formular', async () => {
  await p.goto(B + '/spiele?spieltag=24', { waitUntil: 'networkidle' });
  await p.locator('.spielkarte').first().click();
  await p.waitForURL(/\/spiele\//, { timeout: 15000 });
  await enthaelt('Die Tippfrist ist abgelaufen');
  if (await p.locator('#toreHeim').count() > 0) throw new Error('Eingabefeld trotz abgelaufener Frist sichtbar');
});

await pruefe('Tipp-Historie zeigt Tendenz, Tordifferenz und exakt', async () => {
  await p.goto(B + '/tipps', { waitUntil: 'networkidle' });
  await enthaelt('Tendenz');
  await enthaelt('Tordifferenz');
  await enthaelt('Exakt');
  await enthaelt('Ausgewertet');
});

await pruefe('Liga mit Rangliste und QR-Code', async () => {
  await p.goto(B + '/ligen', { waitUntil: 'networkidle' });
  await p.locator('.spielkarte').first().click();
  await p.waitForURL(/\/ligen\/\d+/, { timeout: 15000 });
  await enthaelt('Rangliste');
  await enthaelt('Punktesystem dieser Liga');
  const zeilen = await p.locator('.tf-rangliste tbody tr').count();
  if (zeilen < 5) throw new Error('Rangliste hat nur ' + zeilen + ' Zeilen');
  if (await p.locator('.qr-flaeche svg').count() === 0) throw new Error('kein QR-Code gezeichnet');
});

await pruefe('Spieltags-Rangliste lässt sich umschalten', async () => {
  await p.click('a:has-text("Spieltag")');
  await p.waitForURL(/spieltag=/, { timeout: 15000 });
  await enthaelt('Rangliste');
});

let neuerCode = null;
await pruefe('Neue Liga gründen', async () => {
  await p.goto(B + '/ligen/neu', { waitUntil: 'networkidle' });
  await p.fill('#name', 'Testrunde Nord');
  await p.fill('#beschreibung', 'Vom automatischen Durchlauf angelegt.');
  await p.check('input[value="oeffentlich"]');
  await p.click('button:has-text("Liga gründen")');
  await p.waitForURL(/\/ligen\/\d+/, { timeout: 15000 });
  await enthaelt('Testrunde Nord');
  neuerCode = (await p.locator('.code-anzeige').innerText()).trim();
  if (!/^[A-Z0-9]{6}$/.test(neuerCode)) throw new Error('unerwarteter Code: ' + neuerCode);
});

await pruefe('Öffentliche Liga ist auffindbar und filterbar', async () => {
  await p.goto(B + '/ligen/entdecken?suche=Testrunde', { waitUntil: 'networkidle' });
  await enthaelt('Testrunde Nord');
  await p.goto(B + '/ligen/entdecken?suche=gibtesnicht', { waitUntil: 'networkidle' });
  await enthaelt('Keine öffentliche Liga passt');
});

await pruefe('Zweites Konto tritt über den Code bei', async () => {
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const q = await ctx2.newPage();
  await q.goto(B + '/anmelden', { waitUntil: 'networkidle' });
  await q.fill('#name', 'Testkonto');
  await q.click('button[type=submit]');
  await q.waitForURL(B + '/', { timeout: 15000 });
  await q.goto(B + '/ligen/beitreten/' + neuerCode, { waitUntil: 'networkidle' });
  await q.click('button:has-text("Liga beitreten")');
  await q.waitForURL(/\/ligen\/\d+/, { timeout: 15000 });
  const inhalt = await q.locator('body').innerText();
  if (!inhalt.includes('Testkonto')) throw new Error('Beitritt nicht in der Rangliste sichtbar');
  await ctx2.close();
});

await pruefe('Hellmodus lässt sich einstellen', async () => {
  await p.goto(B + '/profil', { waitUntil: 'networkidle' });
  await p.check('input[name="thema"][value="hell"]');
  await p.click('button:has-text("Einstellungen speichern")');
  await p.waitForSelector('text=Einstellungen wurden gespeichert', { timeout: 15000 });
  await p.reload({ waitUntil: 'networkidle' });
  const thema = await p.getAttribute('html', 'data-theme');
  if (thema !== 'light') throw new Error('data-theme ist ' + thema);
  await p.screenshot({ path: 'pruefbilder/app-hell.png', fullPage: true });
  await p.check('input[name="thema"][value="dunkel"]');
  await p.click('button:has-text("Einstellungen speichern")');
  await p.waitForSelector('text=Einstellungen wurden gespeichert', { timeout: 15000 });
});

await pruefe('Adminbereich ist ohne Passwort gesperrt', async () => {
  await p.goto(B + '/admin', { waitUntil: 'networkidle' });
  if (!p.url().includes('/admin/anmelden')) throw new Error('kein Schutz: ' + p.url());
});

await pruefe('Adminanmeldung und Ergebniskorrektur', async () => {
  await p.fill('#passwort', 'tippfeld-admin');
  await p.click('button:has-text("Anmelden")');
  await p.waitForURL(B + '/admin', { timeout: 15000 });
  await enthaelt('Datenquelle');
  await enthaelt('Standard-Punktesystem');
  await p.goto(B + '/admin?spieltag=24', { waitUntil: 'networkidle' });
  const erstes = p.locator('form:has(select[name="status"])').first();
  await erstes.locator('input[name="toreHeim"]').fill('7');
  await erstes.locator('input[name="toreGast"]').fill('0');
  await erstes.locator('select[name="status"]').selectOption('beendet');
  await erstes.locator('button:has-text("Sichern")').click();
  await p.waitForSelector('text=Ergebnis gespeichert', { timeout: 15000 });
  await p.reload({ waitUntil: 'networkidle' });
  await enthaelt('von Hand gesetzt');
});

await pruefe('Falsches Adminpasswort wird abgewiesen', async () => {
  const ctx3 = await b.newContext();
  const q = await ctx3.newPage();
  await q.goto(B + '/admin/anmelden', { waitUntil: 'networkidle' });
  await q.fill('#passwort', 'falsch');
  await q.click('button:has-text("Anmelden")');
  await q.waitForSelector('text=Das Passwort stimmt nicht', { timeout: 15000 });
  await ctx3.close();
});

await pruefe('Kein seitliches Scrollen auf schmalen Geräten', async () => {
  for (const pfad of ['/', '/spiele', '/tipps', '/ligen', '/profil', '/analyse']) {
    await p.goto(B + pfad, { waitUntil: 'networkidle' });
    const ueber = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (ueber > 1) throw new Error(pfad + ' scrollt ' + ueber + 'px zur Seite');
  }
});

await p.goto(B + '/', { waitUntil: 'networkidle' });
await p.screenshot({ path: 'pruefbilder/app-start.png', fullPage: true });
await p.goto(B + '/spiele', { waitUntil: 'networkidle' });
await p.screenshot({ path: 'pruefbilder/app-spiele.png', fullPage: true });
if (spielUrl) { await p.goto(B + spielUrl, { waitUntil: 'networkidle' }); await p.screenshot({ path: 'pruefbilder/app-spiel.png', fullPage: true }); }

await b.close();
console.log(fehler === 0 ? '\nAlle Prüfungen bestanden.' : `\n${fehler} Prüfung(en) fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
