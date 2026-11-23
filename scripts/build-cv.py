"""Generate the one-page CV; fail if either text column exceeds its space."""
import argparse
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--lang", choices=("sv", "en"), default="sv")
lang = parser.parse_args().lang
copy = json.loads((root / "scripts" / f"cv-{lang}.json").read_text(encoding="utf-8"))
filename = "Filip-Isberg-CV-EN.pdf" if lang == "en" else "Filip-Isberg-CV.pdf"
target = root / "dist/assets" / filename
font_dir = root / "scripts/fonts"
for name, weight in [("CV", "Regular"), ("CVBold", "Bold")]:
    pdfmetrics.registerFont(TTFont(name, str(font_dir / f"AtkinsonHyperlegibleNext-{weight}.ttf")))
pdfmetrics.registerFontFamily("CV", normal="CV", bold="CVBold")

ink, muted, accent, soft, line = "#302B40", "#666075", "#5A4987", "#EDE8F6", "#E1DCE9"
styles = {
    "intro": ParagraphStyle("intro", fontName="CV", fontSize=10.6, leading=14, textColor=ink),
    "body": ParagraphStyle("body", fontName="CV", fontSize=9.5, leading=13, textColor=ink),
    "small": ParagraphStyle("small", fontName="CV", fontSize=8.8, leading=12.6, textColor=muted),
    "item": ParagraphStyle("item", fontName="CVBold", fontSize=10.2, leading=14, textColor=ink),
    "side": ParagraphStyle("side", fontName="CV", fontSize=9.1, leading=13, textColor=ink),
}
c = canvas.Canvas(str(target), pagesize=A4, initialFontName="CV", lang=lang)
c.setTitle("Filip Isberg - " + copy["role"])
c.setAuthor("Filip Isberg")
c.setCreator("Filip Isberg")
c.setSubject(copy["subject"])
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


def item(entry, x, top, available):
    top = paragraph(entry["title"], x, top, available, "item", 2)
    top = paragraph(entry["period"], x, top, available, "small", 4)
    return paragraph(entry["description"], x, top, available, gap=6)


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
text(copy["role"], 126, 771, 13, color=accent)
text(copy["availability"], 126, 747, 9.3)
text(copy["school"], 126, 732, 9.3, color=muted)
text(copy["graduation"], 126, 719, 9.3, color=muted)
paragraph(f'<link href="mailto:isberget23@gmail.com" color="{accent}">isberget23@gmail.com</link><br/>'
          f'<link href="tel:+46793571858" color="{accent}">{copy["phone"]}</link><br/>'
          f'<link href="https://www.linkedin.com/in/filip-isberg-b20226267/" color="{accent}">LinkedIn</link>'
          f' &nbsp; | &nbsp; <link href="{copy["portfolio_url"]}" color="{accent}">tinyisberg.github.io</link>',
          side_x, 813, side_w, "side")
paragraph(copy["location_languages"],
          side_x, 755, side_w, "side")
c.setStrokeColor(colors.HexColor(accent))
c.setLineWidth(1.5)
c.line(38, 711, width - 38, 711)

intro_bottom = paragraph(
    copy["intro"],
    38, 696, width - 76, "intro", 5)
intro_bottom = paragraph(
    copy["career_change"],
    38, intro_bottom, width - 76, "intro", 10)

body_top = intro_bottom
c.setFillColor(colors.HexColor(soft))
c.roundRect(side_x - 16, 52, side_w + 31, body_top - 48, 9, fill=1, stroke=0)

y = section(copy["testing_heading"], main_x, body_top, main_w)
y = item(copy["internship"], main_x, y, main_w)

y = section(copy["projects_heading"], main_x, y + 1, main_w)
y = paragraph(copy["project_subheading"], main_x, y, main_w, "item", 5)
y = paragraph(copy["contrast_project"],
              main_x, y, main_w, gap=6)
y = paragraph(copy["zoom_project"],
              main_x, y, main_w, gap=5)

y = section(copy["tools_heading"], main_x, y, main_w)
for group in copy["tools"]:
    y = paragraph(group, main_x, y, main_w, gap=3)

y = section(copy["personal_heading"], main_x, y, main_w)
y = paragraph(copy["personal"],
              main_x, y, main_w, gap=0)

s = section(copy["education_heading"], side_x, body_top - 10, side_w)
s = paragraph(copy["testing_course"], side_x, s, side_w, "side", 5)
s = paragraph(copy["course_dates"], side_x, s, side_w, "small", 6)
for course in copy["courses"]:
    s = paragraph(course, side_x, s, side_w, "side", 2)
s -= 4
s = paragraph(copy["culinary_course"], side_x, s, side_w, "side", 4)
s = paragraph(copy["culinary_dates"], side_x, s, side_w, "small", 7)
s = section(copy["experience_heading"], side_x, s, side_w)
s = item(copy["hospital"],
         side_x, s, side_w)
s = item(copy["restaurant"], side_x, s, side_w)
s = paragraph(copy["assistant"], side_x, s, side_w, "small", 0)

assert min(y, s) >= 63, f"CV column overflow: main={y:.1f}, sidebar={s:.1f}"
text("Filip Isberg  /  CV", 38, 28, 8, color=muted)
c.setFont("CV", 8)
c.drawRightString(width - 38, 28, "1 / 1")
c.showPage()
c.save()
print(f"{target}\nColumn bottoms: main={y:.1f}, sidebar={s:.1f}")
