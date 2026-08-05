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
| Reviewing officer (any staff except the assignee) | Peer-review the PDF from notifications; complete review or request a revision with comments |
| Approving officer (role `team_lead`) | Approve the report after peer review, or send it back with comments |
| Either | Mark the report **Submitted** once it has gone out to the client |

Rules that decide whether the workflow works:

- **PDF is required going forward.** An optional Drive/share link can sit alongside it.
- **Reviewing Officer** can be any staff member **except the assignee**, and must be
  **different from the Approving Officer**.
- **The approving officer is notified only after Status of Review is Reviewed.**

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
- **Reviewing Officer** — lab peer who reads the PDF before approval. Not the assignee.
- **Approving Officer** — team lead only; notified only after peer review is done.

3. Click **Save Record**.

---

## 2. Work the record

Statuses can be changed two ways:

- **Inline in the table** — Status of Completion and Status of Submission are dropdowns.
  Status of Review is a read-only chip.
- **In the edit panel** — click the pencil icon in the Actions column.

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

- **Open Report** → marks In review and opens the PDF (signed URL) or legacy link
- **Complete review** → sets Reviewed; notifies the approving officer if assigned
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

- **Open Report** → Under review + open PDF/link
- **Approve** → Approved
- **Request changes** → requires a comment; notifies the assignee

Assignee response to changes: fix, then **Resubmit for approval** on the detail page.

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

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Reviewer never notified | Record not Completed, no PDF/link, or no Reviewing Officer |
| Approving officer never notified | Status of Review is not Reviewed yet |
| Can't pick someone as reviewer | They are the assignee, or they are already the approving officer |
| Can't open PDF | Storage signed URL failed; try again or re-upload |
| Revision/change comments missing | Comments live on the detail page under Review Comments and in the notification payload |
