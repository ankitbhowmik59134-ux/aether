from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from app.planning_agent import ActivityPlan


def build_city_report_pdf(
    city_name: str,
    state: str,
    latest_aqi: int,
    category: str,
    pm25: float,
    forecast_method: str,
    plan: ActivityPlan,
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title=f"Aether — {city_name}")
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph(f"<b>Aether Air Quality Report</b>", styles["Title"]))
    story.append(Paragraph(f"{city_name}, {state}", styles["Heading2"]))
    story.append(Spacer(1, 12))

    data = [
        ["Metric", "Value"],
        ["AQI", str(latest_aqi)],
        ["Category", category],
        ["PM2.5 (µg/m³)", f"{pm25:.1f}"],
        ["Forecast model", forecast_method],
    ]
    t = Table(data, colWidths=[180, 280])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0d3b3b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 16))
    story.append(Paragraph("<b>Activity plan (rules-based, not medical advice)</b>", styles["Heading3"]))
    story.append(Paragraph(plan.summary, styles["Normal"]))
    for section in plan.sections:
        story.append(Spacer(1, 8))
        story.append(Paragraph(f"<b>{section.title}</b>", styles["Heading4"]))
        story.append(Paragraph(section.body, styles["Normal"]))

    story.append(Spacer(1, 20))
    story.append(
        Paragraph(
            "<i>Seeded historical dataset for academic demo — not a live government feed.</i>",
            styles["Italic"],
        )
    )
    doc.build(story)
    return buffer.getvalue()
