/**
 * Richtet die App für den ersten Start ein.
 *
 *   npm run setup
 *
 * Legt eine .env.local mit einem zufälligen SESSION_SECRET und einem
 * Admin-Passwort an. Eine vorhandene Datei wird nie ohne Rückfrage
 * überschrieben.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

const ENV_PATH = path.join(process.cwd(), ".env.local");

const rl = readline.createInterface({ input: stdin, output: stdout });

let inputClosed = false;
rl.once("close", () => {
  inputClosed = true;
});

/**
 * Wie rl.question, bricht aber sauber ab, wenn die Eingabe endet.
 * Ohne das bliebe das Skript hängen, sobald stdin geschlossen wird
 * (etwa wenn die Antworten per Pipe hereinkommen).
 */
function ask(prompt) {
  return new Promise((resolve) => {
    if (inputClosed) return resolve("");

    let settled = false;
    const finish = (value) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };

    rl.question(prompt).then(finish, () => finish(""));
    rl.once("close", () => finish(""));
  });
}

function line(text = "") {
  console.log(text);
}

line();
line("  Westernhengste - Einrichtung");
line("  ============================");
line();

if (fs.existsSync(ENV_PATH)) {
  line("  Es gibt bereits eine Datei .env.local.");
  const answer = (await ask("  Überschreiben? Dann bitte 'ja' eingeben: "))
    .trim()
    .toLowerCase();

  if (answer !== "ja" && answer !== "j") {
    line();
    line("  Abgebrochen - die vorhandene Datei bleibt unverändert.");
    rl.close();
    process.exit(0);
  }
  line();
}

line("  Für den Moderationsbereich unter /admin brauchst du ein Passwort.");
line("  Damit gibst du neue Hengste frei und bearbeitest Korrekturmeldungen.");
line();
line("  Einfach Enter drücken - dann wird ein sicheres Passwort erzeugt.");
line();

const entered = (await ask("  Passwort: ")).trim();
rl.close();

// Ein erzeugtes Passwort ist gut lesbar und trotzdem stark genug.
const generated = crypto.randomBytes(12).toString("base64url");
const password = entered || generated;

if (entered && entered.length < 8) {
  line();
  line("  Hinweis: Das Passwort ist recht kurz. Acht Zeichen oder mehr wären besser.");
}

const sessionSecret = crypto.randomBytes(32).toString("hex");

const contents = `# Automatisch erzeugt von "npm run setup".
# Diese Datei enthält Geheimnisse und gehört NICHT ins Repository.
# (Sie ist in .gitignore bereits ausgenommen.)

# Passwort für den Moderationsbereich unter /admin
ADMIN_PASSWORD=${password}

# Signiert das Anmelde-Cookie. Ändern meldet alle angemeldeten Geräte ab.
SESSION_SECRET=${sessionSecret}

# Öffentliche Adresse der Seite - erst beim Online-Stellen nötig.
# NEXT_PUBLIC_SITE_URL=https://eure-domain.de
`;

fs.writeFileSync(ENV_PATH, contents, { mode: 0o600 });

line();
line("  Fertig. Die Datei .env.local wurde angelegt.");
line();
line("  ----------------------------------------------------");
line(`  Dein Admin-Passwort:  ${password}`);
line("  ----------------------------------------------------");
line();
if (!entered) {
  line("  Bitte jetzt notieren - es steht sonst nur in der .env.local.");
  line();
}
line("  Weiter geht es mit:");
line();
line("      npm run dev");
line();
line("  Danach im Browser öffnen:  http://localhost:3000");
line("  Moderationsbereich:        http://localhost:3000/admin");
line();
