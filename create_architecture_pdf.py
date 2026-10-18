from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Flowable, Frame, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)
from pypdf import PdfReader


OUT = Path(__file__).with_name("Warranty_Receipt_Vault_Architecture.pdf")
NAVY = colors.HexColor("#10243A")
BLUE = colors.HexColor("#125B8E")
TEAL = colors.HexColor("#087E82")
PALE = colors.HexColor("#EAF4F7")
LIGHT = colors.HexColor("#F3F6F9")
MUTED = colors.HexColor("#526476")
LINE = colors.HexColor("#D8E2E9")
WHITE = colors.white
PAGE_W, PAGE_H = A4
LEFT = RIGHT = 19 * mm
CONTENT_W = PAGE_W - LEFT - RIGHT


styles = {
    "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=23, leading=27,
                            textColor=NAVY, spaceAfter=8),
    "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=10.2, leading=14,
                               textColor=MUTED, spaceAfter=16),
    "h1": ParagraphStyle("h1", fontName="Helvetica-Bold", fontSize=14.2, leading=18,
                         textColor=NAVY, spaceBefore=4, spaceAfter=8),
    "h2": ParagraphStyle("h2", fontName="Helvetica-Bold", fontSize=11, leading=14,
                         textColor=BLUE, spaceBefore=9, spaceAfter=4),
    "body": ParagraphStyle("body", fontName="Helvetica", fontSize=9.35, leading=13.4,
                           textColor=NAVY, spaceAfter=5),
    "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8.2, leading=11.2,
                            textColor=NAVY, spaceAfter=2),
    "tiny": ParagraphStyle("tiny", fontName="Helvetica", fontSize=7.15, leading=9.4,
                           textColor=NAVY, spaceAfter=1),
    "label": ParagraphStyle("label", fontName="Helvetica-Bold", fontSize=7.1, leading=9,
                            textColor=TEAL, spaceAfter=3),
    "tablehead": ParagraphStyle("tablehead", fontName="Helvetica-Bold", fontSize=7.8,
                                leading=10.5, textColor=WHITE),
    "table": ParagraphStyle("table", fontName="Helvetica", fontSize=8.1,
                            leading=11, textColor=NAVY),
    "callout": ParagraphStyle("callout", fontName="Helvetica-Bold", fontSize=9.3,
                              leading=13.2, textColor=NAVY),
}


def P(text, style="body"):
    return Paragraph(text, styles[style])


def bullet(text, style="body"):
    return P("<font color='#087E82'>&#8226;</font>  " + text, style)


def section(title, text=None):
    arr = [P(title, "h2")]
    if text:
        arr.append(P(text))
    return arr


def box(text, bg=PALE, pad=10, style="callout"):
    t = Table([[P(text, style)]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), pad),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
    ]))
    return t


def data_table(headers, rows, widths, font=7.65):
    data = [[P(x, "tablehead") for x in headers]]
    data.extend([[P(str(x), "table") for x in row] for row in rows])
    t = Table(data, colWidths=widths, repeatRows=1, hAlign="LEFT")
    ts = [
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.3, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    t.setStyle(TableStyle(ts))
    return t


class ArchitectureDiagram(Flowable):
    def __init__(self, width=CONTENT_W, height=164):
        super().__init__()
        self.width, self.height = width, height

    def draw(self):
        c = self.canv
        W, H = self.width, self.height
        c.setFillColor(LIGHT)
        c.roundRect(0, 0, W, H, 8, stroke=0, fill=1)

        def node(x, y, w, h, heading, lines, color):
            c.setFillColor(color)
            c.roundRect(x, y, w, h, 7, stroke=0, fill=1)
            c.setFillColor(WHITE)
            c.setFont("Helvetica-Bold", 9.5)
            c.drawCentredString(x + w/2, y + h - 18, heading)
            c.setFont("Helvetica", 7.4)
            for j, line in enumerate(lines):
                c.drawCentredString(x + w/2, y + h - 33 - j*11, line)

        def arrow(x1, y1, x2, y2, label=None):
            c.setStrokeColor(BLUE)
            c.setFillColor(BLUE)
            c.setLineWidth(1.3)
            c.line(x1, y1, x2, y2)
            if x2 > x1:
                pts = [x2, y2, x2-5, y2+3, x2-5, y2-3]
            else:
                pts = [x2, y2, x2+5, y2+3, x2+5, y2-3]
            p = c.beginPath(); p.moveTo(pts[0], pts[1]); p.lineTo(pts[2], pts[3]); p.lineTo(pts[4], pts[5]); p.close()
            c.drawPath(p, fill=1, stroke=0)
            if label:
                c.setFont("Helvetica", 6.7)
                c.setFillColor(MUTED)
                c.drawCentredString((x1+x2)/2, y1+6, label)

        node(12, 71, 132, 72, "REACT CLIENT", ["Forms / dashboard / search", "Receipt preview / settings"], BLUE)
        node(194, 71, 138, 72, "EXPRESS API", ["Auth / ownership / validation", "Warranty and receipt logic"], NAVY)
        node(382, 71, 138, 72, "MONGODB", ["Users / products / jobs", "GridFS private receipts"], TEAL)
        arrow(146, 107, 191, 107, "HTTPS / JSON")
        arrow(334, 107, 379, 107, "queries / streams")
        c.setFillColor(NAVY)
        c.setFont("Helvetica-Bold", 7.4)
        c.drawString(195, 48, "Scheduled worker")
        c.setFont("Helvetica", 7.2)
        c.drawString(195, 37, "checks due jobs, retries and logs attempts")
        c.setStrokeColor(BLUE)
        c.line(264, 69, 264, 56)
        c.setFillColor(TEAL)
        c.roundRect(382, 15, 138, 39, 6, stroke=0, fill=1)
        c.setFillColor(WHITE)
        c.setFont("Helvetica-Bold", 8.6)
        c.drawCentredString(451, 37, "EMAIL PROVIDER")
        c.setFont("Helvetica", 7.1)
        c.drawCentredString(451, 25, "expiry notifications")
        arrow(332, 34, 379, 34)


class ProjectDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(str(filename), pagesize=A4, leftMargin=LEFT, rightMargin=RIGHT,
                         topMargin=20*mm, bottomMargin=17*mm,
                         title="Roof - Project Definition and Architecture",
                         author="Project architecture proposal")
        frame = Frame(LEFT, 17*mm, CONTENT_W, PAGE_H - 37*mm,
                      leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
        self.addPageTemplates(PageTemplate(id="normal", frames=[frame], onPage=self.decor))

    def decor(self, canvas, doc):
        canvas.saveState()
        canvas.setFillColor(NAVY)
        canvas.rect(0, PAGE_H - 9*mm, PAGE_W, 9*mm, stroke=0, fill=1)
        canvas.setFont("Helvetica-Bold", 7)
        canvas.setFillColor(WHITE)
        canvas.drawString(LEFT, PAGE_H - 6.1*mm, "ROOF / WARRANTY & RECEIPT VAULT")
        canvas.setStrokeColor(LINE)
        canvas.line(LEFT, 14*mm, PAGE_W-RIGHT, 14*mm)
        canvas.setFillColor(MUTED)
        canvas.setFont("Helvetica", 7)
        canvas.drawString(LEFT, 10*mm, "College project | Architecture proposal | 18 Oct 2026")
        canvas.drawRightString(PAGE_W-RIGHT, 10*mm, f"{doc.page} / 4")
        canvas.restoreState()


story = []

# PAGE 1 - product idea and source validation
story += [P("Roof", "title"),
          P("Warranty &amp; Receipt Vault  |  Project definition and architecture proposal  |  React + Node.js/Express + MongoDB", "subtitle"),
          box("<b>The product:</b> a responsive personal web app that keeps purchase records and receipt files in one private account, calculates warranty dates, shows what is expiring, emails reminders, and stores service-center contacts."),
          Spacer(1, 10), P("01  Refined idea and scope", "h1"),
          P("A user registers, adds a purchased product, enters the warranty terms, and optionally attaches a receipt. The app shows the coverage status and provides the receipt and support contact when the user needs them. This directly addresses the SRS problem: lost proof of purchase and missed warranty deadlines."),
          data_table(["MVP capability", "What the finished app must do"], [
              ("1. Accounts and isolation", "Register, log in/out; every product, receipt, contact and reminder belongs to its authenticated owner."),
              ("2. Product and warranty", "Create, read, edit and delete products; calculate an end date from start date and duration; allow correction for manufacturer terms."),
              ("3. Receipt vault", "Attach optional PDF/image receipts; validate, privately store, preview and download them."),
              ("4. Dashboard and search", "Show totals for active, expiring soon, expired and incomplete warranties; search name/brand and filter status."),
              ("5. Email reminders", "Choose reminder offsets; schedule, send, retry and record outcomes without duplicate sends."),
              ("6. Service contacts", "Save and view product-linked service-center name, phone, address and website."),
          ], [126, CONTENT_W-126]),
          P("Validated design decisions", "h2"),
          bullet("<b>MongoDB is fixed</b> as the database, replacing the SRS's undecided database; MongoDB GridFS stores private receipt bytes."),
          bullet("<b>Email is the MVP notification channel.</b> The SRS mentions channels generally, while the requested build specifies email."),
          bullet("<b>Receipt upload is optional.</b> A product can be saved without a receipt. A failed upload is reported and can be retried."),
          bullet("<b>No admin interface in the MVP.</b> The SRS describes an administrator but gives no required admin workflows. Operational monitoring remains server-side."),
          P("Outside this release: OCR, automatic claim filing, family sharing, retailer integrations, and push notifications. Warranty status is an aid; manufacturer terms remain authoritative.", "small"),
          PageBreak()]

# PAGE 2 - architecture
story += [P("02  System architecture", "h1"),
          P("One React browser client talks to an Express REST API. The API owns business rules and authorization. MongoDB stores structured records and GridFS receipt files. A Node.js worker handles scheduled email jobs; an external email provider delivers them."),
          ArchitectureDiagram(), Spacer(1, 9),
          data_table(["Layer", "Responsibility and implementation"], [
              ("React + JavaScript", "Responsive routes for auth, dashboard, product form/detail, receipt preview, search, reminder settings and contacts. Show loading, validation and failed-operation states."),
              ("Node.js + Express", "REST routes, schema validation, password hashing, session handling, user-scoped queries, warranty calculation, upload/download streaming and error responses."),
              ("MongoDB", "Collections and indexes for users, products, receipts, contacts, preferences and jobs; GridFS for private receipt content."),
              ("Background worker", "Find due jobs, claim them atomically, send through the configured email provider, log attempts, and retry failures with a limit."),
          ], [116, CONTENT_W-116]),
          P("Privacy and reliability rules", "h2"),
          bullet("Hash passwords (Argon2id or bcrypt); use server-managed sessions in HttpOnly, Secure cookies over HTTPS. Protect write requests against CSRF."),
          bullet("Never trust a client-supplied user ID. Scope every database query to the session's user ID and check ownership before streaming a receipt."),
          bullet("Allow only approved PDF/JPEG/PNG types and a documented size limit; inspect file content, generate internal storage names, and never expose GridFS directly."),
          bullet("Keep secrets in environment variables. Back up MongoDB, including GridFS; record failed uploads and email attempts. Use indexes for user-scoped lists and due jobs."),
          P("Deployment shape", "h2"),
          P("Host the React build as static assets, run the Express API and reminder worker as separate Node processes, and connect them to a persistent MongoDB instance. Configure an email provider, HTTPS, environment secrets, backups and a recovery check. Local development can run the same three services with a test mailbox."),
          PageBreak()]

# PAGE 3 - model and rules
story += [P("03  Data model and warranty rules", "h1"),
          P("The supplied ER diagram is a useful starting point. These additions make the six requested capabilities implementable and keep ownership explicit."),
          data_table(["MongoDB collection", "Essential fields / relationship"], [
              ("users", "_id, name, unique email, passwordHash, timeZone, createdAt. One user owns many products."),
              ("products", "_id, userId, name, brand, model, purchaseDate, warrantyStartDate, warrantyMonths, warrantyEndDate, endDateSource, terms, createdAt/updatedAt."),
              ("receipts", "_id, userId, productId, gridFsFileId, originalName, mimeType, size, uploadedAt. A product may have zero or more receipts."),
              ("serviceCenters", "_id, userId, productId, name, phone, address, website. A product may have zero or more contacts."),
              ("reminderPreferences", "userId, enabled, offsetsDays (for example 30, 7, 1), updatedAt. One setting per user."),
              ("reminderJobs", "userId, productId, warrantyEndDate, offsetDays, scheduledFor, status, attempts, lastError, sentAt; unique key prevents duplicate jobs."),
          ], [112, CONTENT_W-112]),
          P("Warranty calculation contract", "h2"),
          bullet("The user enters a start date and a duration in whole months; start date defaults to purchase date but can be changed."),
          bullet("The calculated <b>last covered day</b> is the calendar-month anniversary minus one day. For short target months, clamp the anniversary to the month's last day. Show the computed result before save."),
          bullet("Users can enter the manufacturer-stated end date instead. Store whether the date was calculated or manually entered, plus any terms/notes. Do not invent an end date when data is missing."),
          bullet("Treat dates as date-only values. In the user's configured time zone, status is <b>active</b> through the end date, <b>expiring soon</b> in the final 30 days, <b>expired</b> after it, or <b>incomplete</b> without an end date."),
          P("Data integrity and lifecycle", "h2"),
          P("Validate dates, duration, file type and size at the API. On warranty edits, cancel obsolete pending jobs and regenerate future jobs. On product deletion, remove linked receipts/GridFS files, contacts and pending jobs; keep only minimal delivery audit entries if a retention policy requires them. A cleanup task reconciles failed partial deletions."),
          P("Indexes: unique users.email; products(userId, name/brand), products(userId, warrantyEndDate); receipts(userId, productId); contacts(userId, productId); jobs(status, scheduledFor) plus a unique job identity on productId, warrantyEndDate and offsetDays.", "small"),
          PageBreak()]

# PAGE 4 - contract and done criteria
story += [P("04  User flows, API and completion criteria", "h1"),
          P("Core flows", "h2"),
          bullet("<b>Add product:</b> React form &rarr; API validation &rarr; warranty calculation &rarr; owner-linked product saved. A receipt may be uploaded now or later. This refines the supplied activity diagram."),
          bullet("<b>Retrieve receipt:</b> user opens a product &rarr; API checks product and receipt ownership &rarr; GridFS stream returns a preview or download."),
          bullet("<b>Send reminder:</b> worker claims a due job &rarr; verifies current product expiry and preference &rarr; emails the user &rarr; records success/failure and bounded retry."),
          P("Proposed REST surface", "h2"),
          data_table(["Area", "Endpoints (all private routes require authentication)"], [
              ("Auth", "POST /api/auth/register, /login, /logout; GET /api/auth/me"),
              ("Products", "GET /api/products?search=&amp;status=; POST /api/products; GET/PATCH/DELETE /api/products/:id"),
              ("Receipts", "POST /api/products/:id/receipts; GET /api/receipts/:id/file; DELETE /api/receipts/:id"),
              ("Dashboard", "GET /api/dashboard/summary (counts and upcoming expiries)"),
              ("Reminders", "GET/PUT /api/reminder-preferences; GET /api/reminders/history"),
              ("Contacts", "GET/POST /api/products/:id/service-centers; PATCH/DELETE /api/service-centers/:id"),
          ], [91, CONTENT_W-91]),
          P("Definition of a working college-project release", "h2"),
          bullet("Two test users can sign in; neither can read or change the other's product, receipt, contact or reminder by altering an ID."),
          bullet("Product CRUD, valid/invalid receipt upload, preview/download, date calculation, manual correction, dashboard counts, search and filters work end to end."),
          bullet("A test email is sent for a due warranty; a failed send is recorded and retried; duplicate sends are prevented after a worker restart."),
          bullet("Deleting a product removes linked private data. Missing warranty details remain incomplete, and invalid inputs produce clear errors."),
          P("Build sequence", "h2"),
          P("1) MongoDB schemas, auth and ownership &nbsp;&rarr;&nbsp; 2) product/warranty API and React screens &nbsp;&rarr;&nbsp; 3) GridFS receipts &nbsp;&rarr;&nbsp; 4) dashboard/search and contacts &nbsp;&rarr;&nbsp; 5) worker/email and integration tests &nbsp;&rarr;&nbsp; 6) deployment, backups and demo data.", "small"),
          Spacer(1, 7),
          box("<b>Source alignment:</b> Based on the supplied SRS (draft v1.0), UC-01 to UC-03, activity diagram and ER diagram. This document is the refined build specification; it does not claim the software is already implemented.", bg=PALE, pad=8, style="small")]


ProjectDoc(OUT).build(story)
pages = len(PdfReader(str(OUT)).pages)
if pages != 4:
    raise RuntimeError(f"Expected four pages, got {pages}")
print(f"Created {OUT} ({pages} pages, {OUT.stat().st_size} bytes)")
