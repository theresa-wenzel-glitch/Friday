# packages/ui — noch nicht gebaut

Hier sollen später die UI-Komponenten liegen, die sich Mobile- und Web-App
teilen.

**Warum noch nicht:** Solange es nur eine Oberfläche gibt, wäre ein
gemeinsames Paket eine Abstraktion ohne zweiten Verwender — und damit
zuverlässig die falsche. Die Komponenten liegen deshalb vorerst direkt in
`apps/mobile/components/`.

**Was schon geteilt wird:** Die Design-Tokens. Farben, Abstände, Radien und
Schriftgrößen stehen in `@jobflow/config` und werden von der Mobile-App nur
noch verwendet, nicht mehr definiert. Damit lässt sich das Branding an einer
Stelle ändern, und die Web-App wird später dieselben Werte benutzen.

Sobald `apps/web` existiert, wandern die Komponenten hierher, die beide
Oberflächen wirklich gemeinsam haben.
