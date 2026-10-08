import { BetriebNameFormular } from "@/components/bautagebuch/Formulare";
import { Icon } from "@/components/bautagebuch/Icon";
import { listTelegramChats } from "@/lib/bautagebuch/db";
import { basisUrl } from "@/lib/bautagebuch/pdf";
import { brauchtSitzung } from "@/lib/bautagebuch/sitzung";
import { telegramAktiv } from "@/lib/bautagebuch/telegram";
import { codeErneuernAction } from "../../actions";

export const metadata = { title: "Team & Telegram" };

export default async function Team({ searchParams }: { searchParams: Promise<{ neu?: string }> }) {
  const { betrieb } = await brauchtSitzung();
  const { neu } = await searchParams;
  const code = betrieb.zugangscode;
  const loginLink = `${basisUrl()}/bautagebuch/login?code=${code}`;
  const botName = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, "");
  const telegram = telegramAktiv();
  const chats = listTelegramChats(betrieb.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl">Team &amp; Telegram</h1>

      {neu && (
        <div className="btb-notice btb-notice-ok space-y-1">
          <p className="font-semibold">Willkommen! Ihr Betrieb ist angelegt.</p>
          <p className="text-sm">
            Notieren Sie sich den Zugangscode unten. Damit melden Sie sich auf jedem Gerät an - und Ihre Leute auch.
          </p>
        </div>
      )}

      <section className="btb-card p-5 space-y-3">
        <h2 className="text-lg">Zugangscode</h2>
        <p className="select-all rounded-xl px-4 py-3 text-center font-mono text-2xl font-bold tracking-widest" style={{ background: "var(--btb-surface-2)" }} data-testid="zugangscode">
          {code}
        </p>
        <p className="text-sm btb-muted">
          Geben Sie den Code an Ihre Mitarbeiter weiter. Jeder meldet sich mit Code + eigenem Namen an. Oder schicken Sie
          direkt diesen Link per WhatsApp:
        </p>
        <p className="break-all rounded-lg px-3 py-2 font-mono text-xs" style={{ background: "var(--btb-surface-2)" }}>
          {loginLink}
        </p>
        <a
          className="btb-btn btb-btn-secondary w-full"
          href={`https://wa.me/?text=${encodeURIComponent(`Bautagebuch für ${betrieb.name}: ${loginLink}`)}`}
          target="_blank"
          rel="noopener"
        >
          Link per WhatsApp teilen
        </a>
      </section>

      <section className="btb-card p-5 space-y-3">
        <h2 className="flex items-center gap-2 text-lg">
          <Icon name="telegram" /> Per Telegram erfassen
        </h2>
        {telegram && botName ? (
          <>
            <p className="text-sm">
              Ohne App, direkt aus dem Chat: Foto + Sprachnachricht an den Bot schicken, das PDF kommt zurück.
            </p>
            <a className="btb-btn btb-btn-primary w-full" href={`https://t.me/${botName}?start=${code}`} target="_blank" rel="noopener">
              Telegram-Bot verbinden
            </a>
            <p className="text-xs btb-muted">
              Oder im Chat mit @{botName} senden: <code>/start {code}</code>
            </p>
            {chats.length > 0 && (
              <div>
                <span className="btb-label">Verbundene Chats</span>
                <ul className="text-sm">
                  {chats.map((c) => (
                    <li key={c.chatId}>· {c.person}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm btb-muted">
            Der Telegram-Bot ist auf diesem Server noch nicht eingerichtet. Die Anleitung steht in README-BAUTAGEBUCH.md
            (Abschnitt „Telegram-Bot“).
          </p>
        )}
      </section>

      <section className="btb-card p-5 space-y-3">
        <h2 className="text-lg">Betrieb</h2>
        <BetriebNameFormular name={betrieb.name} />
      </section>

      <section className="btb-card p-5 space-y-3">
        <h2 className="text-lg">Code ändern</h2>
        <p className="text-sm btb-muted">
          Hat ein Mitarbeiter den Betrieb verlassen? Ein neuer Code meldet alle Geräte und Telegram-Chats ab. Danach den
          neuen Code wieder ans Team geben.
        </p>
        <form action={codeErneuernAction}>
          <button type="submit" className="btb-btn btb-btn-danger">
            Neuen Zugangscode erzeugen
          </button>
        </form>
      </section>
    </div>
  );
}
