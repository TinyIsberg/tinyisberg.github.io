"""Generate the one-page CV; fail if either text column exceeds its space."""
from pathlib import Path
import subprocess

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

root = Path(__file__).resolve().parents[1]
target = root / "dist/assets/Filip-Isberg-CV.pdf"
for name, query in [("CV", "DejaVu Sans"), ("CVBold", "DejaVu Sans:style=Bold")]:
    font = subprocess.check_output(["fc-match", "-f", "%{file}", query], text=True)
    pdfmetrics.registerFont(TTFont(name, font))
pdfmetrics.registerFontFamily("CV", normal="CV", bold="CVBold")

ink, muted, accent, soft, line = "#302B40", "#666075", "#5A4987", "#EDE8F6", "#E1DCE9"
styles = {
    "intro": ParagraphStyle("intro", fontName="CV", fontSize=10.6, leading=15.8, textColor=ink),
    "body": ParagraphStyle("body", fontName="CV", fontSize=9.5, leading=13.5, textColor=ink),
    "small": ParagraphStyle("small", fontName="CV", fontSize=8.8, leading=12.6, textColor=muted),
    "item": ParagraphStyle("item", fontName="CVBold", fontSize=10.2, leading=14, textColor=ink),
    "side": ParagraphStyle("side", fontName="CV", fontSize=9.1, leading=13, textColor=ink),
}
c = canvas.Canvas(str(target), pagesize=A4)
c.setTitle("Filip Isberg - Mjukvarutestare")
c.setAuthor("Filip Isberg")
c.setSubject("CV: manuell testning, testautomation och tillgänglighet")
width, height = A4


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
    c.line(x, top - 19, x + available, top - 19)
    return top - 30


def item(title, period, description, x, top, available):
    top = paragraph(title, x, top, available, "item", 2)
    top = paragraph(period, x, top, available, "small", 4)
    return paragraph(description, x, top, available, gap=11)


# A quiet portrait header shares the portfolio's violet palette.
c.setFillColor(colors.HexColor("#F7F6FB"))
c.rect(0, 652, width, height - 652, fill=1, stroke=0)
c.saveState()
clip = c.beginPath()
clip.roundRect(38, 683, 83, 114, 9)
c.clipPath(clip, stroke=0, fill=0)
c.drawImage(str(root / "dist/assets/filip-isberg.jpg"), 38, 683, 83, 114,
            preserveAspectRatio=True, anchor="c", mask="auto")
c.restoreState()
text("Filip Isberg", 142, 779, 32, "CVBold")
text("Mjukvarutestare under utbildning", 143, 754, 13, color=accent)
text("Manuell testning  /  Testautomation  /  Tillgänglighet", 143, 731, 9.3, color=muted)
text("IT-Högskolan, Göteborg - Examen januari 2027", 143, 710, 9.3, color=muted)
paragraph('<link href="mailto:isberget23@gmail.com" color="' + accent + '">isberget23@gmail.com</link>'
          ' &nbsp; | &nbsp; <link href="tel:+46793571858" color="' + accent + '">079-357 18 58</link>',
          143, 694, 414, "small")
paragraph('Göteborgsregionen &nbsp; | &nbsp; <link href="https://www.linkedin.com/in/filip-isberg-b20226267/" color="' + accent + '">LinkedIn: Filip Isberg</link>',
          143, 676, 414, "small")
c.setStrokeColor(colors.HexColor(accent))
c.setLineWidth(1.5)
c.line(38, 651, width - 38, 651)

intro_bottom = paragraph(
    "Jag läser till mjukvarutestare på IT-Högskolan i Göteborg och gör min LIA hos Sportson. "
    "Där tar jag fram acceptanstester, automatiserar testfall och testar tillgänglighet.",
    38, 630, width - 76, "intro", 19)

main_x, main_w, side_x, side_w = 38, 310, 389, 145
body_top = intro_bottom
c.setFillColor(colors.HexColor(soft))
c.roundRect(side_x - 16, 52, side_w + 31, body_top - 48, 9, fill=1, stroke=0)

y = section("ERFARENHET AV TESTNING", main_x, body_top, main_w)
y = item("Testare (LIA) - Sportson", "14 september 2026 - 29 januari 2027",
         "<b>Manuell testning:</b> Tar fram acceptanstester från krav och lyfter frågor när det förväntade beteendet är oklart.<br/>"
         "<b>Testautomation:</b> Automatiserar testfall och undersöker vad som orsakar ett misslyckat test.<br/>"
         "<b>Tillgänglighet:</b> Följer webbflöden med tangentbord och kontrollerar att fokus syns och hamnar rätt.", main_x, y, main_w)

y = section("EGNA PROJEKT", main_x, y + 1, main_w)
y = paragraph("Firefox-tillägg för tillgänglighet", main_x, y, main_w, "item", 5)
y = paragraph("<b>Text Contrast Checker</b> - kontroll av kontrast och färgvärden för markerad text. "
              "Visar när resultatet behöver granskas manuellt.", main_x, y, main_w, gap=6)
y = paragraph("<b>Zoom Profiles</b> - sparar zoomnivåer så att jag kan återvända till samma lägen när jag testar.",
              main_x, y, main_w, gap=5)
y = paragraph("Jag har beskrivit behoven och följt upp hur tilläggen fungerar. Utvecklingen har skett med AI-stöd.",
              main_x, y, main_w, "small", 14)

y = section("TIDIGARE YRKESERFARENHET", main_x, y, main_w)
y = item("Kock - Akershus Universitetssykehus", "Lörenskog, Norge | november 2020 - september 2024",
         "Ansvarade för att lära upp nya medarbetare. Teamledare på helger och vid behov på vardagar.",
         main_x, y, main_w)
y = item("Kock - Trattoria Popolare", "Oslo, Norge | augusti 2017 - september 2020",
         "Samarbete i kök, lunchservering och förberedelser för kvällsservice.", main_x, y, main_w)
y = paragraph("<b>Köksassistent - Losby Gods Hotel</b><br/>"
              "Lörenskog, Norge | november 2015 - juli 2017", main_x, y, main_w, "small", 0)

s = section("UTBILDNING", side_x, body_top - 14, side_w)
s = paragraph("<b>Mjukvarutestare</b><br/>IT-Högskolan, Göteborg", side_x, s, side_w, "side", 5)
s = paragraph("Augusti 2025 - januari 2027<br/>Planerad examen 29 januari 2027", side_x, s, side_w, "small", 11)
for course in [
    "Testmetodik, kravhantering och testning i agila team.",
    "Testautomation med Playwright och Robot Framework.",
    "Java, enhetstestning och testdriven utveckling.",
    "API-testning.",
    "Embedded systems och AI: testmiljöer, CAN-kommunikation och testning av AI-system.",
]:
    s = paragraph(course, side_x, s, side_w, "side", 8)
s -= 5
s = paragraph("<b>Kock och servitör</b><br/>Lörenskog Gymnasiet, Norge", side_x, s, side_w, "side", 4)
s = paragraph("2015-2019<br/>Teori och restaurangpraktik.", side_x, s, side_w, "small", 16)
s = section("SPRÅK", side_x, s, side_w)
s = paragraph("Svenska, norska och engelska", side_x, s, side_w, "side", 0)

assert min(y, s) >= 63, f"CV column overflow: main={y:.1f}, sidebar={s:.1f}"
text("Filip Isberg  /  CV", 38, 28, 8, color=muted)
c.setFont("CV", 8)
c.drawRightString(width - 38, 28, "1 / 1")
c.showPage()
c.save()
print(f"{target}\nColumn bottoms: main={y:.1f}, sidebar={s:.1f}")
