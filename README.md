# CV och testportfolio

Webbplats: https://tinyisberg.github.io/

Detta repository är originalet för fortsatta ändringar. Webbplatsen består av statisk HTML, CSS och JavaScript i `dist/`. GitHub Actions publicerar den mappen till samma GitHub Pages-adress när `main` uppdateras.

## Ändra innehållet

- `dist/index.html` och `dist/en.html`: presentation, kontaktuppgifter och kortens texter på svenska respektive engelska. Uppdatera båda när innehållet ändras.
- `dist/app.js`: projektdialogernas texter och sidans interaktioner.
- `dist/styles.css`: utseende och responsiv layout.
- `dist/assets/`: porträtt, PDF-CV och testunderlag.
- `scripts/build-cv.py`: PDF-generator som använder ReportLab och typsnitten i `scripts/fonts/`.

Rubriker som visas både på ett kort och i en dialog finns i språkversionens HTML och i `app.js`.

## Förhandsvisa och kontrollera

```sh
npm ci
npx playwright install chromium firefox
npm run preview
```

Öppna http://127.0.0.1:4173/. Kör `npm test` i en annan terminal medan servern är igång. Kontrollerna uppdaterar den sparade rapporten på svenska i `dist/kontroller.html` och engelska i `dist/checks.html` samt deras gemensamma underlag. De är inte en fullständig WCAG-granskning.

## Publicera ändringar

Kontrollera ändringarna, skapa en commit och pusha till `main`. Arbetsflödet i `.github/workflows/pages.yml` publicerar endast `dist/`. Ingen separat byggprocess behövs. Följ körningen under Actions och kontrollera den publicerade sidan efteråt.

## Sökbarhet

Ägaren har valt `noindex, nofollow, noimageindex` på alla HTML-sidor. Behåll inställningen även i generatorn för kontrollrapporten. Ingen sitemap används. `robots.txt` ber sökmotorer att inte läsa CV-PDF:en.

Detta är ingen åtkomstkontroll. Repositoryt och publicerade filer är offentliga. PDF-regeln hindrar läsning av innehållet för sökmotorer som följer den, men en PDF-adress eller innehåll i det publika repositoryt kan ändå hittas.

## Innehåll

Sportson-exemplen använder anonymiserade utdrag och Filips bekräftade testresultat. Interna adresser, konton och produktuppgifter ska inte läggas till. Ändringar i krav eller resultat ska bygga på bekräftade uppgifter.
