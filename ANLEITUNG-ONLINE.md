# „Kühl in Mülheim“ online stellen – mit eigener Adresse

Diese Anleitung ist für Menschen ohne Programmierkenntnisse geschrieben. Du
brauchst etwa eine Stunde, davon ist das meiste Warten. Alles, was mit Code zu
tun hat, ist schon vorbereitet.

**Was du am Ende hast:** Die App läuft unter deiner eigenen Adresse, zum
Beispiel `https://kuehl-in-muelheim.de`, mit Schloss-Symbol (verschlüsselt) und
installierbar auf jedem Handy.

**Was es kostet:**

- Adresse (Domain): etwa 1 bis 2 € im Monat
- Server bei Render: 0 € im Plan „Free“, im Plan „Starter“ einige Euro im Monat.
  Den aktuellen Preis findest du auf render.com/pricing.

---

## Schritt 1: Adresse kaufen

1. Such dir einen Anbieter für Domains aus, zum Beispiel INWX, IONOS, Strato
   oder netcup. Alle bieten `.de`-Adressen an.
2. Gib dort den Wunschnamen in die Suche ein, etwa `kuehl-in-muelheim.de`.
   Wenn er frei ist, kauf ihn. Ein Webhosting-Paket brauchst du **nicht**, nur
   die Domain.
3. Wähl keinen Namen, der wie eine Seite der Stadt aussieht, also nichts mit
   „stadt“ oder „muelheim-ruhr“. Die App ist ein Bürgerprojekt.

Merke dir, wo du dich einloggst. In Schritt 5 brauchst du dort die
Einstellung **„DNS“** (manchmal „DNS-Verwaltung“ oder „Nameserver-Einträge“).

## Schritt 2: Die App ins Hauptprojekt übernehmen

Die App liegt noch auf einem Nebenzweig des Projekts „Friday“. Damit Render sie
findet, muss sie in den Hauptzweig.

- Bitte Claude, einen **Pull Request** anzulegen. Auf GitHub klickst du dann auf
  den grünen Knopf **„Merge pull request“** und danach **„Confirm merge“**.

## Schritt 3: Konto bei Render anlegen

1. Öffne <https://render.com> und klick auf **„Get Started“**.
2. Wähl **„GitHub“** zum Anmelden und erlaube Render den Zugriff.
3. Wenn GitHub fragt, auf welche Projekte Render zugreifen darf, wähl
   **„Only select repositories“** und dann **Friday**.

## Schritt 4: Die App starten

1. Klick in Render oben auf **„New“** und dann auf **„Blueprint“**.
2. Wähl das Projekt **Friday**. Render findet die vorbereitete Datei
   `render.yaml` von selbst.
3. Render fragt jetzt nach ein paar Werten. Trag ein:

   | Feld | Was hinein kommt |
   | --- | --- |
   | `ADMIN_PASSWORD` | Ein langes Passwort für die Moderation der Meldungen. Gut aufschreiben! |
   | `KUEHL_HOSTS` | `kuehl-in-muelheim.de,www.kuehl-in-muelheim.de` (deine Adresse, einmal mit und einmal ohne `www.`) |
   | `NEXT_PUBLIC_SITE_URL` | `https://kuehl-in-muelheim.de` |
   | `IMPRESSUM_NAME` | Dein Vor- und Nachname |
   | `IMPRESSUM_ANSCHRIFT` | Deine Anschrift. Zeilen mit einem senkrechten Strich trennen: `Musterstraße 1\|45468 Mülheim an der Ruhr` |
   | `IMPRESSUM_EMAIL` | Eine E-Mail-Adresse, unter der man dich erreicht |

   `SESSION_SECRET` füllt Render selbst aus.

4. Klick auf **„Apply“**. Render baut die App jetzt, das dauert etwa 5 bis 10
   Minuten.
5. Wenn oben **„Live“** steht, klick auf die Adresse, die auf `.onrender.com`
   endet, und häng `/kuehl` an. Jetzt siehst du die App schon im Internet.

## Schritt 5: Deine Adresse verbinden

1. Öffne in Render den Dienst **kuehl-in-muelheim**, dann **„Settings“** und
   scroll zu **„Custom Domains“**.
2. Klick auf **„Add Custom Domain“** und trag `kuehl-in-muelheim.de` ein.
   Wiederhol das mit `www.kuehl-in-muelheim.de`.
3. Render zeigt dir jetzt, welche Einträge du beim Domain-Anbieter machen
   musst. Meistens sind das:
   - für `www`: ein Eintrag vom Typ **CNAME**, der auf die `.onrender.com`-Adresse zeigt
   - für die Adresse ohne `www`: ein Eintrag vom Typ **A** mit einer IP-Adresse,
     die Render anzeigt

   Übernimm die Werte **genau so, wie Render sie anzeigt**.
4. Log dich beim Domain-Anbieter aus Schritt 1 ein, öffne die DNS-Einstellungen
   und leg diese Einträge an. Gibt es dort schon einen A-Eintrag für die Adresse
   ohne `www`, ersetz ihn.
5. Geh zurück zu Render und klick auf **„Verify“**. Es kann ein paar Minuten bis
   einige Stunden dauern, bis die Einträge überall bekannt sind. Danach richtet
   Render die Verschlüsselung (https) von selbst ein.

Fertig. `https://kuehl-in-muelheim.de` führt jetzt direkt zur App.

## Schritt 6: Auf dem Handy installieren

Öffne die Adresse auf dem Handy:

- **iPhone (Safari):** Teilen-Knopf und dann „Zum Home-Bildschirm“
- **Android (Chrome):** Drei-Punkte-Menü und dann „App installieren“ bzw.
  „Zum Startbildschirm hinzufügen“

---

## Später: vom Plan „Free“ auf „Starter“ wechseln

Im Plan „Free“ schläft die App nach etwa 15 Minuten ohne Besucher ein. Der
nächste Aufruf dauert dann bis zu einer Minute. Außerdem gehen Bürgermeldungen
bei jedem Neustart verloren.

Für den echten Betrieb:

1. In Render beim Dienst unter **„Settings“** bei **„Instance Type“** auf
   **„Starter“** wechseln.
2. Unter **„Disks“** eine Disk anlegen: Name `daten`, Mount Path `/data`,
   Größe 1 GB.

Oder du bittest Claude, das in `render.yaml` umzustellen.

## Meldungen prüfen

Öffne `https://kuehl-in-muelheim.de/admin`, melde dich mit dem
`ADMIN_PASSWORD` an und geh dann zu `https://kuehl-in-muelheim.de/kuehl/moderation`.

## Wichtig: Impressum und Datenschutz

Eine öffentliche Webseite in Deutschland braucht in aller Regel ein Impressum
mit Name und einer Anschrift, unter der man Post zustellen kann, sowie eine
Datenschutzerklärung. Beides ist eingebaut (`/kuehl/impressum` und
`/kuehl/datenschutz`) und füllt sich mit deinen Angaben aus Schritt 4.

- Die Anschrift ist danach **öffentlich sichtbar**. Wer seine Wohnadresse nicht
  zeigen möchte, kann einen Impressum-Service mit eigener Geschäftsadresse
  nutzen.
- Die Datenschutzerklärung ist ein sorgfältiger Entwurf, aber **keine
  Rechtsberatung**. Lass sie vor dem Start einmal von jemandem prüfen, der sich
  damit auskennt, zum Beispiel über einen Datenschutz-Generator oder eine
  Beratungsstelle.

## Wenn etwas nicht klappt

| Problem | Lösung |
| --- | --- |
| Render zeigt beim Bauen „Failed“ | Auf „Logs“ klicken, die letzten Zeilen kopieren und Claude zeigen |
| Die eigene Adresse zeigt die Hengst-Seite | Prüfen, ob `KUEHL_HOSTS` genau deine Adresse enthält, ohne `https://` |
| „Verify“ klappt nicht | Ein paar Stunden warten; DNS-Einträge noch einmal mit Render vergleichen |
| Impressum zeigt „noch nicht eingetragen“ | Bei Render unter „Environment“ die drei `IMPRESSUM_`-Felder ausfüllen und auf „Save“ klicken |
