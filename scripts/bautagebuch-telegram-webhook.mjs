/**
 * Meldet die Webhook-Adresse bei Telegram an. Einmal ausführen, nachdem die
 * App unter einer öffentlichen https-Adresse läuft:
 *
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... \
 *   NEXT_PUBLIC_SITE_URL=https://deine-domain.de \
 *   npm run telegram:webhook
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");

if (!token || !secret || !site?.startsWith("https://")) {
  console.error(
    "Bitte TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET und NEXT_PUBLIC_SITE_URL (mit https://) setzen.",
  );
  process.exit(1);
}

const url = `${site}/api/bautagebuch/telegram`;
const api = (methode, body) =>
  fetch(`https://api.telegram.org/bot${token}/${methode}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

const res = await api("setWebhook", {
  url,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
});
if (!res.ok) {
  console.error("Telegram meldet einen Fehler:", res.description);
  process.exit(1);
}

await api("setMyCommands", {
  commands: [
    { command: "baustelle", description: "Baustelle wählen" },
    { command: "hilfe", description: "So funktioniert's" },
  ],
});

console.log(`Fertig. Telegram schickt Nachrichten jetzt an ${url}`);
