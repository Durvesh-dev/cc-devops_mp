from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


OUTPUT_FILE = Path(__file__).resolve().parent / "Autonomous_AI_DevOps_Viva_Notes.pdf"


def add_title(story, text, style):
    story.append(Paragraph(text, style))
    story.append(Spacer(1, 0.15 * inch))


def add_heading(story, text, style):
    story.append(Paragraph(text, style))
    story.append(Spacer(1, 0.08 * inch))


def add_para(story, text, style):
    story.append(Paragraph(text, style))
    story.append(Spacer(1, 0.06 * inch))


def add_bullets(story, items, bullet_style):
    flow = ListFlowable(
        [ListItem(Paragraph(item, bullet_style), leftIndent=10) for item in items],
        bulletType="bullet",
        start="circle",
        leftPadding=18,
        bulletFontSize=8,
    )
    story.append(flow)
    story.append(Spacer(1, 0.08 * inch))


def build_pdf():
    doc = SimpleDocTemplate(
        str(OUTPUT_FILE),
        pagesize=A4,
        leftMargin=0.65 * inch,
        rightMargin=0.65 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="Autonomous AI DevOps Engineer - Viva Notes",
        author="CC_MP Team",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleCustom",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=20,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=10,
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        textColor=colors.HexColor("#334155"),
        leading=14,
    )
    h_style = ParagraphStyle(
        "HeadingCustom",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=8,
    )
    p_style = ParagraphStyle(
        "BodyCustom",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#111827"),
    )
    bullet_style = ParagraphStyle(
        "BulletCustom",
        parent=p_style,
        leftIndent=8,
    )

    story = []

    add_title(story, "Autonomous AI DevOps Engineer", title_style)
    add_para(story, "Judge Viva Notes - Detailed Explanation (What, How, Why)", subtitle_style)
    add_para(story, "Prepared for detailed project defense, architecture walkthrough, and AWS design justification.", subtitle_style)

    add_heading(story, "1. One-line Project Definition", h_style)
    add_para(
        story,
        "This project is a self-healing AIOps platform that continuously ingests logs, detects anomalies using ML plus rules, creates alerts, applies automated recovery workflows, stores everything persistently, and visualizes the full lifecycle live on a dashboard.",
        p_style,
    )

    add_heading(story, "2. Problem Statement and Why This Project", h_style)
    add_bullets(
        story,
        [
            "Traditional monitoring is mostly reactive; teams detect issues late and fix manually.",
            "Manual diagnosis creates alert fatigue and slows incident response.",
            "Our system turns this into a closed loop: Observe -> Detect -> Alert -> Heal -> Verify -> Visualize.",
            "Goal: reduce time-to-detect (MTTD) and time-to-recover (MTTR) using autonomous workflows.",
        ],
        bullet_style,
    )

    add_heading(story, "3. Technology Stack (What is used)", h_style)
    stack_data = [
        ["Layer", "Technology", "Why chosen"],
        ["Frontend", "Next.js + React + TailwindCSS", "Fast UI development, reusable components, modern dashboard UX"],
        ["Backend", "Node.js + Express", "Simple API orchestration, easy integration with Python and AWS SDK"],
        ["ML", "Python + Scikit-learn Isolation Forest", "Unsupervised anomaly detection for log behavior"],
        ["Realtime", "SSE (Server-Sent Events)", "Lightweight one-way server-to-client live updates"],
        ["Cloud", "AWS SNS, DynamoDB, S3, CloudWatch", "Managed alerting, persistence, object storage, and log ecosystem"],
    ]
    table = Table(stack_data, colWidths=[1.2 * inch, 1.9 * inch, 3.6 * inch])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8.6),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#94A3B8")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F8FAFC"), colors.HexColor("#EEF2FF")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.12 * inch))

    add_heading(story, "4. End-to-End Execution Flow (How system works)", h_style)
    add_bullets(
        story,
        [
            "Log enters system from watcher or log generator.",
            "Backend preprocesses and classifies metadata (service, severity, issue type).",
            "ML service predicts anomaly score; decision engine combines ML signal and rule signal.",
            "If anomaly=true, healingService creates alert + healing action.",
            "Records are saved in DynamoDB tables (logs, anomalies, alerts, auto-healing).",
            "SSE emits events: log, prediction, alert, healing, status.",
            "Frontend receives events and updates metrics/timeline instantly.",
            "Health service recomputes system state from recent windows (healthy/degraded/critical).",
        ],
        bullet_style,
    )

    add_heading(story, "5. How user knows the issue is healed (Direct viva answer)", h_style)
    add_para(
        story,
        "User confirmation is visible as an incident lifecycle in the Live Pipeline timeline and metrics.",
        p_style,
    )
    add_bullets(
        story,
        [
            "Step 1 shown in UI: Issue found (anomaly detected by ML + rules).",
            "Step 2 shown in UI: Healing initiated (alert/remediation workflow started).",
            "Step 3 shown in UI: Issue healed (auto-healing action executed).",
            "Auto-Healing metric count increases, and status events continue updating system health.",
            "If subsequent critical anomalies reduce and warn/error pressure is below threshold, health moves toward healthy/degraded instead of critical.",
        ],
        bullet_style,
    )
    add_para(
        story,
        "Important honesty point for judges: this project implements autonomous remediation orchestration and tracking. The recovery action is generated and recorded by workflow logic (e.g., restart DB, retry transaction), not direct production Kubernetes/ECS restart command execution in this demo build.",
        p_style,
    )

    add_heading(story, "6. AWS Services Used, Why Used, and How Used", h_style)
    aws_data = [
        ["AWS Service", "Why this service", "How it is used in project"],
        [
            "Amazon DynamoDB",
            "Low-latency managed NoSQL for event records and counters",
            "Stores anomalies, alerts, auto-healing actions, and supports status/stats APIs for dashboard",
        ],
        [
            "Amazon SNS",
            "Managed pub/sub alerting, simple incident notification fan-out",
            "Publishes anomaly alerts, mainly for ERROR/CRITICAL; if unavailable, local fallback logging is kept",
        ],
        [
            "Amazon S3",
            "Durable object store for logs/model artifacts",
            "Used for raw log/model artifact storage and optional model synchronization flow",
        ],
        [
            "Amazon CloudWatch (integration support)",
            "Standard AWS observability sink",
            "Supports routing generated logs to cloud monitoring pipelines",
        ],
        [
            "AWS Lambda + API Gateway (optional target)",
            "Serverless deployment path for backend APIs",
            "Design supports migration from local Express runtime to Lambda-based execution",
        ],
    ]
    aws_table = Table(aws_data, colWidths=[1.35 * inch, 1.95 * inch, 3.4 * inch])
    aws_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3A53")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9),
                ("FONTSIZE", (0, 1), (-1, -1), 8.5),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#93C5FD")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#F0F9FF"), colors.HexColor("#ECFEFF")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.append(aws_table)
    story.append(Spacer(1, 0.12 * inch))

    add_heading(story, "7. Key Backend Modules (Explainable by file responsibility)", h_style)
    add_bullets(
        story,
        [
            "logWatcher.js: monitors appended log lines and runs autonomous pipeline.",
            "decisionEngine.js: fuses ML anomaly and rule-based detection into final decision.",
            "healingService.js: creates alerts and service-specific healing plans.",
            "dynamoStore.js: persistence abstraction for DynamoDB reads/writes and counters.",
            "healthService.js: computes overall system health from recent data windows.",
            "opsRoutes.js/logRoutes.js: exposes APIs and SSE stream for frontend.",
        ],
        bullet_style,
    )

    add_heading(story, "8. Key Frontend Modules", h_style)
    add_bullets(
        story,
        [
            "useDevopsData.jsx: central state hook for polling + SSE + timeline persistence.",
            "dashboard/page.jsx: KPI cards, charts, and Live Pipeline view.",
            "ActivityTimeline.jsx: grouped timeline with filters and severity-aware rendering.",
            "alerts/logs/insights pages: dedicated operational drill-down pages.",
        ],
        bullet_style,
    )

    add_heading(story, "9. Judge Questions and Ready Answers", h_style)
    qa_items = [
        "Q: Why ML plus rules together?  A: ML catches unknown patterns; rules provide deterministic safety and explainability.",
        "Q: Why SSE and not WebSockets?  A: Our use case is mostly server-to-client streaming; SSE is lighter and simpler.",
        "Q: How do you prove healing happened?  A: Timeline transitions to Issue healed, auto-healing count increments, and health trend updates.",
        "Q: What if AWS service fails?  A: Flow continues with local fallback logging and robust status reporting.",
        "Q: Why DynamoDB and not SQL?  A: Event-style data, high write/read throughput, and managed scalability fit this use case.",
        "Q: Is this production ready?  A: Core architecture is production-oriented; direct infra actuation and stronger auth are next steps.",
    ]
    add_bullets(story, qa_items, bullet_style)

    add_heading(story, "10. Limitations and Honest Next Steps", h_style)
    add_bullets(
        story,
        [
            "Current healing is orchestration-level simulation, not direct cluster command execution.",
            "Need role-based access and stronger security hardening for full production.",
            "Can add SQS/EventBridge for higher throughput decoupling and retry policies.",
            "Can add model drift metrics, precision/recall dashboards, and canary rollout strategy.",
        ],
        bullet_style,
    )

    add_heading(story, "11. 60-second Demo Script", h_style)
    add_para(
        story,
        "We start watcher plus log generator. New logs are ingested and analyzed by ML plus rules. If anomaly is detected, the backend creates alert and healing workflow, persists records in DynamoDB, and streams events via SSE. Dashboard updates instantly with Issue found -> Healing initiated -> Issue healed. This demonstrates closed-loop autonomous DevOps with cloud-integrated observability and remediation tracking.",
        p_style,
    )

    add_heading(story, "12. Final Closing Line", h_style)
    add_para(
        story,
        "This project demonstrates practical AIOps: intelligent incident detection, automated remediation workflows, persistent cloud-backed operations data, and clear operator visibility in one integrated platform.",
        p_style,
    )

    doc.build(story)


if __name__ == "__main__":
    build_pdf()
    print(f"PDF generated: {OUTPUT_FILE}")
