# Service Report Tracker — Step-by-Step Guide

How to record a client sequence analysis from intake to delivery, and how to get a
service report approved by the assigned approving officer.

**Where it lives:** sidebar → **Sequence Analysis → Service Report Tracker**
(`/dashboard/services/tracker`).

---

## 0. Before you start

| You are… | You do |
|---|---|
| Bioinformatician / analyst | Create the record, run the analysis, update statuses, attach the report link, address any review comments and resubmit |
| Approving officer (role `team_lead`) | Review the report from the notification bell, then approve it or send it back with comments |
| Either | Mark the report **Submitted** once it has gone out to the client |

Two things to know up front, because they decide whether the approval step works at all:

- **Only users with the role `team_lead` appear in the Approving Officer dropdown.** If the
  person you need isn't listed, their role has to be changed in the Team module first.
- **The approval notification only fires on an edit, never on creation.** A brand-new record
  saved with everything already filled in will *not* notify anyone. Section 4 explains the
  order to do things in so this never bites you.

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
- **Status of Submission** — leave blank at creation.

**Personnel section**

- **Assignee** — required for the record to appear on the Tasks board. Leave it blank and you'll
  get a toast saying "Assign someone to add this to the task list."
- **Approving Officer** — you can set this now or later; either works. See section 4.

3. Click **Save Record**.

---

## 2. Work the record

Statuses can be changed two ways, and both write straight to the database:

- **Inline in the table** — the coloured pills in the Status of Completion and Status of
  Submission columns are dropdowns. Change one and it saves immediately.
- **In the edit panel** — click the pencil icon in the Actions column.

**Status of Completion** options and what they mean:

| Option | Effect |
|---|---|
| On-going | Active work; appears on the Tasks board |
| On hold (for payment) | Paused; stays visible under the "On Hold" filter |
| Completed | Stamps `completed_at` with the current timestamp and unlocks the report step |
| Cancelled | Removes the linked task from the Tasks board |

Changing the status away from **Completed** clears the completion timestamp, so don't flip it
back and forth casually — it will also re-arm the approval notification (which is sometimes
exactly what you want; see section 6).

---

## 3. Attach the service report link

The approving officer cannot be notified without a report link, so this step is mandatory.

**Option A — paste it directly (works at any time)**

1. Click the pencil icon on the row.
2. Paste the URL into **Service Report Link** under "Links & Notes".
3. Save.

**Option B — use the Generate button (only once completion status is Completed)**

1. Set **Status of Completion** to **Completed**. A **Generate** button appears in the
   Service Report Link column for that row.
2. Click **Generate**. A modal opens.
3. Paste the report URL into **Fallback Report URL link** (required, must be a valid URL).
4. Tick **Client Acknowledged** only if the client has already confirmed receipt. Leave it
   unticked in the normal case — you can mark it acknowledged later from the detail page.
5. Click **Save Fallback Report**.

Option B does more than Option A: as well as writing the link onto the analysis, it creates a
`service_report` delivery record capturing **who** delivered it and **when**, and logs an audit
trail entry. The detail page (click the SR number) then shows Delivered By, Delivered At, and
Client Acknowledged, plus a **Mark as Acknowledged** button.

---

## 4. Get approval from the approving officer

### 4.1 How the notification is triggered

A notification is sent to the approving officer the moment a record **changes into** a state
where all three of these are true at once:

1. **Status of Completion** is `Completed`
2. **Service Report Link** is filled in and not blank
3. **Approving Officer** is set

The word *changes* is doing real work in that sentence. The database trigger runs on **update
only**, and only on the transition from not-ready to ready. Practical consequences:

- Creating a new record with all three already filled in sends **nothing**.
- Editing a record that was already ready (for example, swapping the approving officer, or
  correcting the report link) sends **nothing**, because it was already ready before the edit.

### 4.2 The order that works — analyst's steps

1. **Create and save the record first** (section 1). Set the Approving Officer here if you
   already know who it is, but leave **Status of Completion** as On-going.
2. Do the analysis work.
3. **Set Status of Completion to `Completed`** — inline dropdown or edit panel.
4. **Add the Service Report Link** — Generate button or edit panel (section 3).
5. **Confirm the Approving Officer is set.** Open the edit panel and check the
   **Approving Officer** dropdown under "Personnel". If it says "— Assign later —", pick the
   team lead now and save. That save is the update that fires the notification.

The notification lands in real time — the officer's bell badge increments without a page refresh.

> **If you set all three in a single save on a brand-new record**, no notification goes out.
> Fix it by opening the edit panel, clearing the Approving Officer, saving, then setting the
> officer again and saving a second time. The second save is the transition the trigger is
> watching for.

### 4.3 What the approving officer sees and does

The officer works from either the **bell icon** in the top bar or the full
**Notifications** page (`/dashboard/notifications`). Both offer the same actions.

1. **Open the notification.** It shows the client name, the service report number, when it
   arrived, and a status badge reading **Ready for review**.
2. **Click "Open Report."** This opens the report link in a new tab *and* automatically sets the
   record's Status of Submission to **Under review**. The badge turns amber. No separate step
   is needed to mark it under review.
3. **Review the report** in the opened tab.
4. **Click "Approve."** This does three things at once:
   - sets Status of Submission to **Approved** (the pill in the tracker turns green),
   - appends a line to the record's Notes reading
     `System: Approved by <officer name> on <YYYY-MM-DD>`,
   - marks the notification read and clears it from the unread list.
5. **Or click "Request changes"** if the report isn't ready. See section 4.4.
6. If the officer wants to set it aside without acting, **Mark read** (or **Dismiss** in the bell
   dropdown) hides the notification without changing any status.

Two safeguards worth knowing:

- **Approvals never move backwards.** The statuses are ranked
  For approval (1) → Under review (2) → Approved (3) → Submitted (4), and an action is ignored
  if it would lower the rank. Clicking "Open Report" on an already-approved record will not
  demote it to Under review. **Request changes** is the one deliberate exception — it sits
  outside the ladder precisely so it can hand a report back.
- **Only the assigned officer sees the notification.** Row-level security scopes the
  notifications table to the target user, so no one else — including admins in the UI — will see
  it in their bell.

### 4.4 Sending a report back with comments

When the report needs work before it can be signed off, the officer clicks **Request changes**
instead of Approve. A box opens asking what needs to be addressed; the comment is required.

Submitting it does four things in one go:

- records the comment against the record,
- sets Status of Submission to **Changes requested** (the pill turns orange),
- appends `System: Changes requested by <officer name> on <YYYY-MM-DD>` to the Notes,
- sends a notification to the record's **Assignee**, with the comment in it.

**Changes requested** is the one status you cannot pick from a dropdown. It is only reachable
through this action, because a report parked there without an explanation and without anyone
notified is just a stuck record.

If the record has **no Assignee**, the comment is still saved and the status still changes — the
officer is told that nobody was notified. Set an assignee and tell them directly.

### 4.5 Addressing comments and getting a re-review

The assignee sees the change request in their bell and on the record's detail page, under
**Review Comments**. After fixing what was raised:

1. Open the record's detail page (click the SR number in the tracker).
2. Click **Resubmit for approval** in the Review Comments panel.

That sets Status of Submission back to **For approval**, marks the open comments resolved, and
**re-notifies the approving officer automatically** — no clear-and-reset needed. The comment
history stays on the record so you can see what was asked for in each round.

**The one case that still needs the manual workaround:** if a report was already **Approved** and
you revise it afterwards, nothing re-notifies the officer, because no change was ever requested.
To force a fresh review, open the edit panel and clear the **Approving Officer**
(`— Assign later —`), save, then set the officer again and save. That not-ready → ready round trip
re-fires the trigger. While an **unread** notification for the same record still exists, a
duplicate will not be created — if the officer hasn't opened the first one yet, just ping them.

---

## 5. Close out the record

1. Once the approved report has actually been sent to the client, set **Status of Submission**
   to **Submitted** using the inline dropdown. This is a manual step; nothing sets it for you.
2. If the client confirms receipt, open the record's detail page (click the SR number) and click
   **Mark as Acknowledged** in the Service Report Delivery panel. This only appears when the
   report was created through the **Generate** flow.

At this point the row reads **Completed** / **Submitted** and is done.

---

## 6. Troubleshooting

**The officer never got a notification.**
Check all three conditions in section 4.1 are true right now. If they are, the record was
probably already ready before your last save, so the trigger never saw a transition. Use the
clear-and-reset fix in section 4.4.

**The person I need isn't in the Approving Officer dropdown.**
The dropdown lists only users with the role `team_lead`. Change their role in the Team module.

**The Generate button isn't showing in the Service Report Link column.**
It only appears when the row's Status of Completion is **Completed** *and* the link is still
empty. If a link already exists, the cell shows the link instead — use the edit panel to change it.

**A second notification wasn't created after I re-triggered it.**
An unread notification for that record still exists. Duplicates are suppressed until the officer
reads or acts on the first one.

**"Changes requested" isn't in the Status of Submission dropdown.**
It isn't meant to be. Only the assigned approving officer can put a report there, using
**Request changes** on the notification, so that a comment and an alert always go with it.
A record already sitting in that status will still show it in the dropdown — opening the edit
panel won't silently reset it.

**The Resubmit for approval button isn't showing.**
It only appears on the record's detail page while Status of Submission is **Changes requested**.
Reach it by clicking the SR number in the tracker, or "Open record" on the notification.

**The record isn't on the Tasks board.**
It needs an **Assignee** and a Status of Completion of On-going. Cancelled records are removed
from the board automatically.

**The Client ID shows in amber.**
No client in the Clients module has that ID. It's advisory only and won't block anything — add
the client to the Clients module if you want the link to resolve.
