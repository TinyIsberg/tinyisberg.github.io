"""Generate the one-page CV; fail if either text column exceeds its space."""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

root = Path(__file__).resolve().parents[1]
target = root / "dist/assets/Filip-Isberg-CV.pdf"
font_dir = root / "scripts/fonts"
for name, weight in [("CV", "Regular"), ("CVBold", "Bold")]:
    pdfmetrics.registerFont(TTFont(name, str(font_dir / f"AtkinsonHyperlegibleNext-{weight}.ttf")))
pdfmetrics.registerFontFamily("CV", normal="CV", bold="CVBold")

ink, muted, accent, soft, line = "#302B40", "#666075", "#5A4987", "#EDE8F6", "#E1DCE9"
styles = {
    "intro": ParagraphStyle("intro", fontName="CV", fontSize=10.6, leading=14, textColor=ink),
    "body": ParagraphStyle("body", fontName="CV", fontSize=9.5, leading=13.5, textColor=ink),
    "small": ParagraphStyle("small", fontName="CV", fontSize=8.8, leading=12.6, textColor=muted),
    "item": ParagraphStyle("item", fontName="CVBold", fontSize=10.2, leading=14, textColor=ink),
    "side": ParagraphStyle("side", fontName="CV", fontSize=9.1, leading=13, textColor=ink),
}
c = canvas.Canvas(str(target), pagesize=A4, initialFontName="CV")
c.setTitle("Filip Isberg - Mjukvarutestare")
c.setAuthor("Filip Isberg")
c.setSubject("CV: manuell testning, testautomation och tillgänglighet")
width, height = A4
main_x, main_w, side_x, side_w = 38, 306, 370, 187


def text(value, x, y, size=9.5, font="CV", color=ink):
    c.setFont(font, size)
    c.setFillColor(colors.HexColor(color))
    c.drawString(x, y, value)


def paragraph(value, x, top, available, style="body", gap=6):
    p = Paragraph(value, styles[style])
    _, used = p.wrap(available, height)
    p.drawOn(c, x, top - used)
    return top - used - gap


def section(value, x, top, available):
    text(value, x, top - 10, 9, "CVBold", accent)
    c.setStrokeColor(colors.HexColor(line))
    c.setLineWidth(0.6)
    c.line(x, top - 17, x + available, top - 17)
    return top - 23


def item(title, period, description, x, top, available):
    top = paragraph(title, x, top, available, "item", 2)
    top = paragraph(period, x, top, available, "small", 4)
    return paragraph(description, x, top, available, gap=6)


# A quiet portrait header shares the portfolio's violet palette.
c.setFillColor(colors.HexColor("#F7F6FB"))
c.rect(0, 712, width, height - 712, fill=1, stroke=0)
c.saveState()
clip = c.beginPath()
clip.roundRect(38, 727, 69, 92, 9)
c.clipPath(clip, stroke=0, fill=0)
c.drawImage(str(root / "dist/assets/filip-isberg.jpg"), 38, 727, 69, 92,
            preserveAspectRatio=True, anchor="c", mask="auto")
c.restoreState()
text("Filip Isberg", 125, 793, 29, "CVBold")
text("Mjukvarutestare", 126, 771, 13, color=accent)
text("Tillgänglig från 1 februari 2027", 126, 747, 9.3)
text("IT-Högskolan, Göteborg", 126, 732, 9.3, color=muted)
text("Examen 29 januari 2027", 126, 719, 9.3, color=muted)
paragraph('<link href="mailto:isberget23@gmail.com" color="' + accent + '">isberget23@gmail.com</link><br/>'
          '<link href="tel:+46793571858" color="' + accent + '">079-357 18 58</link><br/>'
          '<link href="https://www.linkedin.com/in/filip-isberg-b20226267/" color="' + accent + '">LinkedIn</link>'
          ' &nbsp; | &nbsp; <link href="https://tinyisberg.github.io/" color="' + accent + '">tinyisberg.github.io</link>',
          side_x, 813, side_w, "side")
paragraph("Göteborgsregionen<br/><b>Språk</b> · Svenska, norska och engelska",
          side_x, 755, side_w, "side")
c.setStrokeColor(colors.HexColor(accent))
c.setLineWidth(1.5)
c.line(38, 711, width - 38, 711)

intro_bottom = paragraph(
    "Just nu utbildar jag mig till mjukvarutestare på IT-Högskolan i Göteborg. "
    "Jag är inne på de sista månaderna av utbildningen och gör min praktik på Sportson. "
    "Där jobbar jag bland annat med acceptanstester, automatiserar testfall och testar manuellt. "
    "Jag har också tagit fram egna verktyg för att göra mina manuella tester mer effektiva.",
    38, 696, width - 76, "intro", 5)
intro_bottom = paragraph(
    "Tidigare i mitt yrkesliv jobbade jag som kock i restaurangkök och storkök. "
    "Där arbetade jag både i team och självständigt. Jag hade huvudansvaret på helgerna och lärde upp nyanställda. "
    "Jag bestämde mig för att byta bana för att få jobba med IT och kvalitet, två områden jag brinner för.",
    38, intro_bottom, width - 76, "intro", 10)

body_top = intro_bottom
c.setFillColor(colors.HexColor(soft))
c.roundRect(side_x - 16, 52, side_w + 31, body_top - 48, 9, fill=1, stroke=0)

y = section("ERFARENHET AV TESTNING", main_x, body_top, main_w)
y = item("Testare (LIA) - Sportson", "14 september 2026 - 29 januari 2027",
         "<b>Manuell testning:</b> Tar fram acceptanstester från krav. Stämde av sökkravet med produktägaren, "
         "valde testdata och kontrollerade att sökning på produktnamn gav förväntad träff.<br/>"
         "<b>Testautomation:</b> Automatiserar testfall. När en datumkontroll stoppade testet anpassade jag den "
         "med AI-stöd. Båda berörda testerna gick igenom vid omkörning.<br/>"
         "<b>Tillgänglighet:</b> När jag testade huvudmenyn med tangentbord försvann fokusmarkeringen på vissa "
         "länkar. Jag rapporterade felet till utvecklaren. Efter rättningen testade jag igen och såg vilken länk jag stod på.", main_x, y, main_w)

y = section("EGNA PROJEKT", main_x, y + 1, main_w)
y = paragraph("Firefox-tillägg för tillgänglighet", main_x, y, main_w, "item", 5)
y = paragraph("<b>Text Contrast Checker</b> samlar textfärg, bakgrundsfärg och kontrastvärde för markerad text i en ruta.",
              main_x, y, main_w, gap=6)
y = paragraph("<b>Zoom Profiles</b> sparar zoomnivåer så att jag kan upprepa layoutkontroller med samma inställningar.",
              main_x, y, main_w, gap=5)

y = section("VERKTYG OCH TEKNIK", main_x, y, main_w)
for group in [
    "<b>Testautomation</b> · Playwright och Robot Framework",
    "<b>Enhetstest</b> · JUnit och Mockito. JaCoCo för kodtäckning.",
    "<b>Krav och testhantering</b> · ReQtest, Jira och Azure DevOps",
    "<b>Programmering</b> · Java, Python, Go (Golang), HTML och JavaScript",
    "<b>Utvecklingsmiljöer</b> · VS Code, PyCharm, IntelliJ IDEA och Zed",
    "<b>Versionshantering och byggmiljöer</b> · Git, GitHub, Docker, Jenkins och CI/CD-pipelines",
    "<b>Övrig teknik</b> · Windows, olika Linuxdistributioner, hemmaserver med TrueNAS och QNAP samt 3D-utskrift",
]:
    y = paragraph(group, main_x, y, main_w, gap=3)

y = section("LITE OM MIG", main_x, y, main_w)
y = paragraph("På fritiden mekar jag gärna med min hemmaserver, 3D-printar och spelar tv-spel. "
              "Jag har mycket energi, gillar att samarbeta och drivs av att utforska nya saker och lära mig mer.",
              main_x, y, main_w, gap=0)

s = section("UTBILDNING", side_x, body_top - 10, side_w)
s = paragraph("<b>Mjukvarutestare</b><br/>IT-Högskolan, Göteborg", side_x, s, side_w, "side", 5)
s = paragraph("Augusti 2025 - januari 2027<br/>Examensdatum 29 januari 2027", side_x, s, side_w, "small", 6)
for course in [
    "Testmetodik, kravhantering och testning i agila team.",
    "Testautomation med Playwright och Robot Framework.",
    "Java, enhetstestning och testdriven utveckling.",
    "API-testning.",
    "Embedded systems och AI: testmiljöer, CAN-kommunikation och testning av AI-system.",
]:
    s = paragraph(course, side_x, s, side_w, "side", 2)
s -= 4
s = paragraph("<b>Kock och servitör</b><br/>Lörenskog Gymnasiet, Norge", side_x, s, side_w, "side", 4)
s = paragraph("2015-2019<br/>Teori och restaurangpraktik.", side_x, s, side_w, "small", 7)
s = section("TIDIGARE YRKESERFARENHET", side_x, s, side_w)
s = item("Kock - Akershus Universitetssykehus", "Lörenskog, Norge | november 2020 - september 2024",
         "Ansvarade för att lära upp nya medarbetare. Teamledare på helger och vid behov på vardagar.",
         side_x, s, side_w)
s = item("Kock - Trattoria Popolare", "Oslo, Norge | augusti 2017 - september 2020",
         "Samarbete i kök, lunchservering och förberedelser för kvällsservice.", side_x, s, side_w)
s = paragraph("<b>Köksassistent - Losby Gods Hotel</b><br/>"
              "Lörenskog, Norge | november 2015 - juli 2017", side_x, s, side_w, "small", 0)

assert min(y, s) >= 63, f"CV column overflow: main={y:.1f}, sidebar={s:.1f}"
text("Filip Isberg  /  CV", 38, 28, 8, color=muted)
c.setFont("CV", 8)
c.drawRightString(width - 38, 28, "1 / 1")
c.showPage()
c.save()
print(f"{target}\nColumn bottoms: main={y:.1f}, sidebar={s:.1f}")
