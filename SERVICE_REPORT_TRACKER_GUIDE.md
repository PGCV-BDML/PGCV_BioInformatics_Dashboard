# Service Report Tracker — Step-by-Step Guide

How to record a client sequence analysis from intake to delivery, including peer
review of the PDF and approving-officer sign-off.

**Where it lives:** sidebar → **Sequence Analysis → Service Report Tracker**
(`/dashboard/services/tracker`).

---

## 0. Before you start

| You are… | You do |
|---|---|
| Bioinformatician / analyst | Create the record, run the analysis, upload the PDF, assign officers, address revision/change comments and resubmit |
| Reviewing officer (`reviewing_officer`, or staff) | Peer-review the PDF from **Notifications** only; complete review or request a revision with comments |
| Approving officer (`approving_officer`, or `team_lead`) | Approve the report after peer review from **Notifications**, or send it back with comments |
| Either staff role | Mark the report **Submitted** once it has gone out to the client |

External reviewing/approving officers are **not** bioinformatics staff. After sign-in they
only see the **Notifications** tab (same scoped-portal pattern as trainees/interns). They
open the PDF, e-sign, and act from the notification card — they cannot open the Service
Report Tracker.

Rules that decide whether the workflow works:

- **PDF is required going forward.** An optional Drive/share link can sit alongside it.
- **Reviewing Officer** can be a `reviewing_officer` or staff member **except the assignee**,
  and must be **different from the Approving Officer**.
- **Approving Officer** can be an `approving_officer` or a `team_lead`.
- **The approving officer is notified only after Status of Review is Reviewed.**
- Seed officer accounts with `scripts/promote-service-report-officer.sql` after applying
  migration `20260812140000_service_report_officer_roles.sql`.

---

## 1. Create the service report record

1. Open **Service Report Tracker** and click **Add Analysis** (top right).
2. The slide-over panel opens. Fill in what you know — **every field is optional except the
   "Others" specify box**, so a record can start as a stub and be completed later.

**Service Report section**

- **Service Report Number** — prefilled with the next number in sequence, formatted
  `PGCV-BIOINFO-SR-YYYY-NNN`. The sequence is global (it does not restart each January) and
  the year is the current year. You can overwrite it if you need to backfill an old report.
- **Date (Service Report)** — defaults to today.

**Analysis section**

- **Analysis Classification** — pick from the 12 options (Amplicon, Whole Genome Assembly,
  16s Metabarcoding, eDNA Analysis, Phylogenetics, Transcriptomics, CapSeq, mtDNA, cpDNA,
  Shotgun Metagenomics, Population Genetics, Others). Choosing **Others: specify** reveals a
  free-text box that is required.
- **Sample Type** and **RUN ID** — the RUN ID is what links this record to the Repositories
  module. If a repository row shares the same run ID, the tracker turns the RUN ID cell into a
  clickable link to that repository.

**Client & Project section**

- **Client**, **Client Type**, **Client ID**, **Project ID** are plain text.
- The **Client ID** is soft-matched against the Clients module. A match renders green and links
  through to the client; no match renders amber with a "no matching client" tooltip. Nothing
  breaks either way — it's an advisory link, not a foreign key.
- **Linked Project** is optional. Link it if you want samples and tasks to roll up to a project.

**Status section**

- **Status of Completion** — new records default to **On-going**, which is what puts the item
  on the Tasks board.
- **Status of Review** — read-only; the reviewing officer moves this.
- **Status of Submission** — leave blank at creation.

**Personnel section**

- **Assignee** — required for the record to appear on the Tasks board.
- **Reviewing Officer** — peer who reads the PDF before approval (`reviewing_officer` or
  staff). Not the assignee. External officers work from Notifications only.
- **Approving Officer** — `approving_officer` or team lead; notified only after peer review
  is done. External officers work from Notifications only.

3. Click **Save Record**.

---

## 2. Work the record

Statuses can be changed two ways:

- **Inline in the table** — Status of Completion and Status of Submission are dropdowns.
  Status of Review is a read-only chip.
- **In the edit panel** — click the pencil icon in the first column, next to the service report number.

**Status of Completion** options:

| Option | Effect |
|---|---|
| On-going | Active work; appears on the Tasks board |
| On hold (for payment) | Paused; stays visible under the "On Hold" filter |
| Completed | Stamps `completed_at` and unlocks PDF upload |
| Cancelled | Removes the linked task from the Tasks board |

---

## 3. Upload the service report PDF

Once Status of Completion is **Completed**:

1. Click **Upload** in the Service Report column (or attach the PDF in the edit panel).
2. Drop or browse for a PDF (max 25 MB). Optionally add a Drive/share URL alongside it.
3. Saving stores the file in private storage and writes the delivery row.

The PDF is the artifact that goes through review. Legacy rows that only have a link still
work, but new reports should upload a file.

---

## 4. Peer review (Status of Review)

When the record is **Completed**, has a report (PDF or legacy link), and has a Reviewing
Officer, Status of Review opens as **For review** and that person is notified.

| Status of Review | Meaning |
|---|---|
| For review | Waiting on the reviewing officer |
| In review | Reviewer opened the PDF |
| Revision requested | Sent back to the assignee with comments |
| Reviewed | Signed off — approval stage can open |

Reviewer actions (bell / Notifications page):

- **Open Report** → marks In review and opens the full PDF (signed URL) or legacy link. After you have signed, Open Report shows the **last page** of the stamped PDF so you can check the signature.
- **Complete review** → last-page preview of your e-signature under **Reviewed by**; confirm (drag/resize if needed) to stamp and set Reviewed; notifies the approving officer if assigned. The notification then stores that signed PDF.
- **Request revision** → requires a comment; notifies the assignee

Assignee response to a revision:

1. Fix the PDF / content.
2. On the detail page, click **Resubmit for review**.
3. The reviewing officer is notified again.

---

## 5. Approval (Status of Submission)

Only after Status of Review is **Reviewed** does Status of Submission open as
**For approval** (when an Approving Officer is assigned). That officer is notified then —
not earlier.

| Status of Submission | Meaning |
|---|---|
| For approval | Waiting on the approving officer |
| Under review | Officer opened the report |
| Changes requested | Sent back to the assignee with comments |
| Approved | Signed off |
| Submitted | Delivered to the client |

Officer actions:

- **Open Report** → Under review + open the full PDF/link. After you have approved, Open Report shows the **last page** of the signed PDF.
- **Approve** → last-page preview of your e-signature under **Approved for Release**; confirm (drag/resize if needed) to stamp and set Approved; notifies the assignee when one is set. The notification then stores the signed PDF.
- **Request changes** → requires a comment; notifies the assignee

Assignee response to changes:

1. Fix the comments. If the PDF itself does not change, click **Resubmit for approval**.
2. If you **replace the PDF**, Status of Review goes back to **For review** and the reviewing officer is notified immediately — the previous e-signature lived on the old file. After they **Complete review**, the approving officer is notified again (**For approval**).

When approval completes, the assignee receives a **Report approved** notification
with the signed PDF (last page on Open Report). The reviewing and approving
officers' stored notification attachments are updated to that same signed file.
Mark **Submitted** in the tracker once the client has the report.

---

## 6. Submit and acknowledge

1. After approval, set Status of Submission to **Submitted** when the client has the report.
2. On the detail page, mark **Client Acknowledged** when they confirm receipt.

---

## Column order (tracker table)

1. Service Report Number  
2. Date  
3. Analysis Classification  
4. Client fields / Sample Type / RUN ID  
5. **Status of Completion**  
6. **Status of Review**  
7. **Status of Submission**  
8. Service Report (PDF / Upload / legacy link)  
9. Client Sequences Link  
10. Notes / Actions  

---

## Electronic signatures

Reviewing and approving officers must upload a PNG of their handwritten signature
before they can complete review or approve a report.

- **Where:** sidebar profile menu → **My signature** (any logged-in staff user)
- **On Complete review:** a last-page preview opens so you can see the stamp on the signature page; after you confirm, the reviewer’s signature is stamped under **Reviewed by**
- **On Approve:** the same last-page preview for **Approved for Release** (the reviewer stamp is already on the page and cannot be moved)
- Drag or resize your own stamp in that preview. Nothing is written to the stored PDF until you confirm.
- Printed names on the PDF are not changed — only the signature image is added
- If no signature is on file, the action is blocked and an upload prompt appears
- Replacing the PDF after **Reviewed** voids the reviewer stamp and sends the new file back for peer review. Officer signature stamps (Complete review / Approve) do not.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Reviewer never notified | Record not Completed, no PDF/link, or no Reviewing Officer |
| Approving officer never notified | Status of Review is not Reviewed yet |
| Can't pick someone as reviewer | They are the assignee, or they are already the approving officer |
| Can't complete review / approve | No e-signature uploaded yet (profile menu → My signature) |
| Signature looks misplaced | Drag or resize the stamp in the confirm-signature preview before you complete review or approve |
| Notification still has the unsigned PDF | After sign-off, Open Report uses the current stamped file and shows its last page. Apply `20260827120000_sync_notification_signed_report.sql` so stored payloads are updated too |
| Can't open PDF | Storage signed URL failed; try again or re-upload |
| Revision/change comments missing | Comments live on the detail page under Review Comments and in the notification payload |
| Replacing the PDF after approval changes skipped the reviewer | Migration `20260813120000_invalidate_review_on_pdf_replace.sql` not applied |
