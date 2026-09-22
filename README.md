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

**Pray** — morning, midday, night, each toggling on its own. Tapping Night marks Night, not all three; they are distinct times, not a running count. One prayer is enough to complete P for the day, because three is the target and one is still a day I prayed.

**Organize** — the idea machine. Five slots a day. Input disables at five. Four and five are the ones worth having, which is the whole point of the number.

**Write** — ten minutes. A subject line on top, the body underneath. Typing in the body starts the timer automatically, while play/pause remains available; the subject never starts it. A saved draft keeps its subject and lists under it. Save a thought as a timestamped draft to clear the writing box and continue it later from any synced device.

**Exercise** — three run check-ins and three lifting check-ins. The 3+3 counts are weekly totals and clear themselves on Monday. Adding any run or lift marks Exercise complete for the current day.

**Read** — book and chapter dropdowns covering all 66 books with correct chapter counts. Marking a chapter read checks it off in the Bible tab, advances to the next chapter, and rolls to the next book at the end. The card stays available so multiple chapters can be logged in one sitting. Chapter squares in the Bible tab can also be toggled directly for manual entry or correction without moving the current reading position. A compact **Verse to meditate on** lookup accepts a single verse or same-chapter range, retrieves its World English Bible text, and syncs the one saved passage across devices until it is replaced or cleared.

### Completion behavior

Finishing a section mutes its card without disabling it. Completed cards remain visible and usable, while the gold POWER letters keep the day's completion state easy to scan.

The **POWER letters** in the header are buttons. Tap one to mark a discipline done if it happened away from the dashboard. Tap it again to bring the card back.

Completion fires once, on the transition (first prayer, fifth idea, timer hitting zero). Undo sets it back to false and it stays false; it will not silently re-complete itself just because a prayer is still ticked.

Two rollovers, on different clocks. At the first load after local midnight, all five POWER completion letters reset for the new day; entered module data and the weekly exercise totals are preserved, because a day starting fresh is not the same as a week starting fresh. At the first load in a new week, Monday, the run and lift counts clear. Either one fires on its own, so a dashboard left open across Sunday midnight still rolls the week without needing the day to change. An open dashboard also checks for a date change when it becomes visible and once per minute. **Clear day** provides a confirmed manual reset for prayers, ideas, writing, its timer, and POWER completion while preserving weekly exercise totals, Bible progress, and saved drafts.

---

## The week

A **Week** tab beside Today and Bible. Monday through Sunday, no paging.

**Targets** come first, because they're the reason to open the page on a Thursday: ideas, write minutes, runs, lifts, and chapters, each against a weekly goal with the days remaining in the corner. The numbers live in one `WEEK_TARGETS` object at the top of the script... change a goal on one line.

**The grid** is five rows by seven days, and every cell is a toggle. Forgot to tick Read on Tuesday, tick it Tuesday. Future days are inert.

One rule keeps that from getting confusing: **today is owned by the Today tab, every prior day is owned by history.** Clicking today's column in the grid runs the same code as tapping the letter in the header, timestamp and all. Clicking any earlier day writes straight to that day's record.

**Streaks** are per letter, not one number for all five. An all-five streak would sit at zero permanently, because Exercise is 3+3 weekly and is false most days by design.

---

## Marriage

A **Marriage** tab, separate from the five. It is not a POWER letter, it is not in the header meter, it is not a row in the week grid, and it has no streak.

It also never writes anything to send. There is no drafting of messages, no composing on my behalf, no model in the loop at any point. The feature surfaces a prompt; the writing is mine.

**Prompt.** One item a day from the Gottman 7-week fondness and admiration exercise, in the printed order. The task shows big, the belief statement sits under it as the subhead, and one box takes the response. Saving records it and holds the day; the next item appears tomorrow, not on a second save.

**Date night.** The Gottman items are prompts, not date ideas, so the ideas here are mine. A text field takes them the way Organize does, and they collect in a pool that persists. Each month I drag three out of the pool into a shortlist, pick one, and note how it went and when. A picked idea is marked with the month it was used and dimmed in the pool rather than deleted, because it still has to render in History.

Dragging is built on pointer events rather than HTML5 drag-and-drop, which never fires on touch and would have left the feature dead on a phone. Tapping an idea sends it to the first free slot, for when a drag misses.

**History.** Every response is kept, and each month's picked date night lands there too, with its note and the date we went. After item 35 the cycle restarts at item 1 with a blank box and a new pass number, so a reprise never shows the old answer in place. History sorts by date, mixing responses and date nights, or groups by prompt with the date nights collected under one heading.

The 35 items live in `marriage-items.js`, transcribed verbatim and carrying no tags of my own. That text is copyright Dr. John M. Gottman and Dr. Julie Schwartz Gottman, distributed under license by The Gottman Institute. It is here for personal use on one private dashboard, not for distribution.

---

## Data and sync

The app writes immediately to `localStorage` under `power.v2`, with an in-memory fallback when storage is unavailable. Each day gets one record in `history`, keyed `YYYY-MM-DD`, holding the five completion letters plus that day's idea count, seconds written, and chapters read. Today's record is mirrored out of live state on every save, so the week view and the streaks read one source. That local copy renders first and remains usable offline. The same-origin `/api/sync` Pages Function then exchanges field-level changes, Bible chapters, and independently keyed writing drafts with D1; queued edits replay when the browser comes back online.

On load, and whenever the tab regains focus, the app pulls the cloud copy before pushing its own, so coming back to a tab left open on one device shows what the other device did. Focus pulls are throttled to one every fifteen seconds.

`done`, `seen`, `at` and `prayers` are single fields holding several keys each, and two devices legitimately change different keys of them on the same day. They merge per key rather than per field: the cloud copy is taken and only the sub-keys this device actually changed are laid on top. Without that, checking P on the desktop and W on the phone left whichever pushed last as the only survivor, silently, while the footer read "Synced just now". Merging is last-write-wins per key, not a union, so un-checking a letter still propagates.

Dashboard fields, Bible chapters, drafts, **each history day**, and **each marriage response** have independent server revisions, so edits to different items merge without replacing the whole state. History is deliberately not one blob field: a blob would let one device's offline edits clobber the other device's entire history on the automatic conflict retry, where a per-day row can only ever lose the one day both devices touched. Repeated requests are idempotent. If writing or ideas changed on two devices from the same base revision, the app asks whether to keep this device or use the cloud copy.

The first deployment starts with an empty D1 database. On the desktop holding the authoritative `power.v2` state, select **Use this device to initialize sync** once. Other devices then adopt that cloud state after passing Cloudflare Access.

Pray, Organize, Write, and Exercise each have a confirmed Clear action for routine cleanup. Read intentionally keeps its selection because it tracks the next chapter in an ongoing sequence.

Saved state is merged over a defaults object rather than replacing it, so adding fields to the schema won't break existing installs. Bump the key if the shape changes in a way that matters.

### Export

**Download .md** produces a daily note ready to drop in an Obsidian vault:

```markdown
---
date: 2026-08-05
pray: 3/3
organize: 5/5
write: 10m
exercise: 2/3
read_next: Mark 5
power: POWER
title: "schema scoring is not a moat"
---

## Ideas
1. Deterministic schema scoring for Shopify
...

## schema scoring is not a moat
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

### The sync passphrase

Sync is gated by one passphrase, checked in the Pages Function. It is not in the page source: it is typed once per device, kept in `localStorage` under `power.key.v1`, and sent as an `x-power-key` header. It is deliberately not part of the synced state, so it never reaches D1.

Set it on the deployment once:

```
npx wrangler pages secret put SYNC_SECRET --project-name power
```

`authenticated()` fails closed. With no `SYNC_SECRET` set it accepts `localhost` only, so an unconfigured deployment rejects everything rather than serving open. Comparison is over SHA-256 digests via `crypto.subtle.timingSafeEqual`, so a wrong passphrase cannot be narrowed by timing.

A device with no passphrase, or the wrong one, gets a banner with a masked field and syncs nothing until it is right. The footer says the same thing; it will not claim "Synced" while it is blocked.

For local development, put `SYNC_SECRET=...` in `.dev.vars`, which is gitignored. With no `.dev.vars`, `localhost` skips the check entirely.

This replaced Cloudflare Access. Access worked on the desktop but its one-time PIN could not be completed on mobile: Cloudflare's own documentation notes that mail security tooling follows the emailed link and consumes the single-use code before you can type it, which is exactly what Gmail was doing. The alternative was registering a Google Cloud OAuth app to use Google as the identity provider. For a single-user dashboard this was the cheaper trade.

**If an Access application is still in front of the hostname it must be removed**, or the API keeps 302ing to a login page and the passphrase never arrives. The app detects that case specifically and says so.

The page carries `noindex`. Without Access the page shell is publicly reachable, but it holds no data: prayer counts, writing and ideas all live behind the passphrase.

---

## Stack

Plain HTML, CSS, and JavaScript on the client, with a small Pages Function and D1 database. Caveat and JetBrains Mono come from Google Fonts. Design tokens match [biv.xyz](https://biv.xyz).

Keyboard focus is visible, `prefers-reduced-motion` is respected, and the layout collapses to one column under 760px.

---

## Roadmap

Ordered by whether it survives the "will this actually get used" test.

- [ ] Outbound sends counter, once there's a version of it that isn't just another number to look at

### Not doing

Strava, Google Calendar, GitHub activity, revenue charts, and anything else that would let me open the page and change nothing.
