# POWER

A local-first daily discipline dashboard with private cross-device sync.

**P**ray · **O**rganize · **W**rite · **E**xercise · **R**ead

Runs at `dash.biv.xyz`. The interface is a single vanilla-JavaScript page; a Cloudflare Pages Function and D1 provide sync.

---

## Why this exists

Most dashboards die in three weeks because they only display things. This one is a capture surface. Every number on the page got there because I typed it or tapped it. Nothing is pulled from an API, so nothing can break, go stale, or need reauthorizing.

Three layers, no overlap:

| Layer | Job | Where |
|---|---|---|
| Capture | Fastest path from thought to text | This app |
| Store | Search, history, linking | Obsidian |
| Process | Turn raw input into output | Claude Code |

The app never grows a reading view, a search, or an archive. Obsidian already does those better.

---

## The five

**Pray** — three taps, one per prayer. Morning, midday, night.

**Organize** — the idea machine. Ten slots a day. Input disables at ten. Seven through ten are the ones worth having, which is the whole point of the number.

**Write** — ten minutes. Typing starts the timer automatically, while play/pause remains available. Save a thought as a timestamped draft to clear the writing box and continue it later from any synced device.

**Exercise** — three run check-ins and three lifting check-ins, cleared together when the week rolls over. Adding any run or lift marks Exercise complete for the current day; the 3+3 counts remain weekly totals.

**Read** — book and chapter dropdowns covering all 66 books with correct chapter counts. Marking a chapter read checks it off in the Bible tab, advances to the next chapter, and rolls to the next book at the end. The card stays available so multiple chapters can be logged in one sitting. Chapter squares in the Bible tab can also be toggled directly for manual entry or correction without moving the current reading position.

### Completion behavior

Finishing a section mutes its card without disabling it. Completed cards remain visible and usable, while the gold POWER letters keep the day's completion state easy to scan.

The **POWER letters** in the header are buttons. Tap one to mark a discipline done if it happened away from the dashboard. Tap it again to bring the card back.

Completion fires once, on the transition (third prayer, tenth idea, timer hitting zero). Undo sets it back to false and it stays false — it will not silently re-complete itself because the underlying count is still at three.

At the first load after local midnight, all five POWER completion letters reset for the new day. Entered module data and weekly exercise totals are preserved. An open dashboard also checks for a date change when it becomes visible and once per minute.

---

## Data and sync

The app writes immediately to `localStorage` under `power.v2`, with an in-memory fallback when storage is unavailable. That local copy renders first and remains usable offline. The same-origin `/api/sync` Pages Function then exchanges field-level changes, Bible chapters, and independently keyed writing drafts with D1; queued edits replay when the browser comes back online.

Dashboard fields and Bible chapters have independent server revisions, so edits to different items merge without replacing the whole state. Repeated requests are idempotent. If writing or ideas changed on two devices from the same base revision, the app asks whether to keep this device or use the cloud copy.

The first deployment starts with an empty D1 database. On the desktop holding the authoritative `power.v2` state, select **Use this device to initialize sync** once. Other devices then adopt that cloud state after passing Cloudflare Access.

Pray, Organize, Write, and Exercise each have a confirmed Clear action for routine cleanup. Read intentionally keeps its selection because it tracks the next chapter in an ongoing sequence.

Saved state is merged over a defaults object rather than replacing it, so adding fields to the schema won't break existing installs. Bump the key if the shape changes in a way that matters.

### Export

**Download .md** produces a daily note ready to drop in an Obsidian vault:

```markdown
---
date: 2026-08-05
pray: 3/3
organize: 10/10
write: 10m
exercise: 2/3
read_next: Mark 5
power: POWER
---

## Ideas
1. Deterministic schema scoring for Shopify
...

## Ten minutes
...
```

There are also copy buttons on Organize and Write for a faster paste. Both paths exist on purpose — keep whichever one you actually use after a week and delete the other.

---

## Deploy

Cloudflare Pages:

- Build command: none
- Output directory: `/`
- Custom domain: `dash.biv.xyz`
- Pages Function binding: D1 database `power-sync` as `DB`

Create/apply the database and run locally with:

```sh
npm install
npx wrangler d1 migrations apply power-sync --remote
npm run dev
```

`wrangler.jsonc` is the Pages project configuration source of truth. The migration is in `migrations/0001_sync.sql`.

### Lock it down

The page carries `noindex`, which keeps it out of search results and out of nothing else. It holds prayer counts, unedited writing, and raw ideas.

Put Cloudflare Access in front of the entire hostname, including `/api/sync`: Zero Trust → Access → Applications → self-hosted → allow policy on one email address. Protect the production custom domain and any Pages preview domain you intend to use; the function rejects requests that do not carry the Access assertion.

---

## Stack

Plain HTML, CSS, and JavaScript on the client, with a small Pages Function and D1 database. Caveat and JetBrains Mono come from Google Fonts. Design tokens match [biv.xyz](https://biv.xyz).

Keyboard focus is visible, `prefers-reduced-motion` is respected, and the layout collapses to one column under 760px.

---

## Roadmap

Ordered by whether it survives the "will this actually get used" test.

- [ ] Daily rollover at midnight, weekly rollover for the run count
- [ ] Outbound sends counter, once there's a version of it that isn't just another number to look at

### Not doing

Strava, Google Calendar, GitHub activity, revenue charts, and anything else that would let me open the page and change nothing.
