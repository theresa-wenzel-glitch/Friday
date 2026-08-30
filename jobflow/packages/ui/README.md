# packages/ui — noch nicht gebaut

Hier sollen spaeter die UI-Komponenten liegen, die sich Mobile- und Web-App
teilen.

**Warum noch nicht:** Solange es nur eine Oberflaeche gibt, waere ein
gemeinsames Paket eine Abstraktion ohne zweiten Verwender — und damit
zuverlaessig die falsche. Die Komponenten liegen deshalb vorerst direkt in
`apps/mobile/components/`.

**Was schon geteilt wird:** Die Design-Tokens. Farben, Abstaende, Radien und
Schriftgroessen stehen in `@jobflow/config` und werden von der Mobile-App nur
noch verwendet, nicht mehr definiert. Damit laesst sich das Branding an einer
Stelle aendern, und die Web-App wird spaeter dieselben Werte benutzen.

Sobald `apps/web` existiert, wandern die Komponenten hierher, die beide
Oberflaechen wirklich gemeinsam haben.
