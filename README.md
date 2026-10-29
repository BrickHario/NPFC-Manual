# NPFC

Next.js-Projekt mit Supabase. Tailwind ist entfernt; CSS-Variablen stehen in `app/variables.css`.

## Seiten

- `/` – Startseite mit Links zu NPFC Manual und NPFC Combo Maker
- `/marketplace` – bisherige Spielerseite (Spielersuche, Bilder, Skills und Potentialgraph)
- `/combo-maker` – vorerst leere Seite mit Titel

Die Navigation und der Footer sind in `app/layout.tsx` definiert und erscheinen auf allen Seiten.

**Wichtige Routing-Anpassung:** Die Spielersuche navigiert jetzt zu `/marketplace?id=...` statt `/?id=...`. Sonst ist die Spiellogik unverändert. Beim Verschieben von `page.tsx` wurden lediglich die relativen Importe korrigiert.

## Start

Kopiere deine vorhandene `.env.local` in den Projektordner und führe aus:

```bash
npm install
npm run dev
```

`node_modules`, `.next` und `.env.local` werden nicht mitgeliefert.
