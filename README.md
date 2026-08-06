# POWER

A daily discipline dashboard. Five things, one page, no integrations.

**P**ray · **O**rganize · **W**rite · **E**xercise · **R**ead

Runs at `dash.biv.xyz`. Single `index.html`, vanilla JS, no build step, no dependencies except two Google fonts.

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

**Write** — ten minutes. Start and stop the timer explicitly, with word count on the way out.

**Exercise** — three run check-ins and three lifting check-ins, cleared together when the week rolls over.

**Read** — book and chapter dropdowns covering all 66 books with correct chapter counts. Marking a chapter read checks it off in a collapsed GitHub-style Bible activity grid, advances to the next chapter, and rolls to the next book at the end.

### Completion behavior

Finishing a section slides its card off to the right and drops it out of the grid, so the page shrinks to what's left. Completed items collect in a **Done today** strip with a timestamp and an Undo button.

The **POWER letters** in the header are buttons. Tap one to mark a discipline done if it happened away from the dashboard. Tap it again to bring the card back.

Completion fires once, on the transition (third prayer, tenth idea, timer hitting zero). Undo sets it back to false and it stays false — it will not silently re-complete itself because the underlying count is still at three.

---

## Data

Everything lives in `localStorage` under the key `power.v2`, with an in-memory fallback when storage is unavailable (private windows, sandboxed iframes).

Pray, Organize, Write, and Exercise each have a confirmed Clear action for routine cleanup. Read intentionally keeps its selection because it tracks the next chapter in an ongoing sequence.

Saved state is merged over a defaults object rather than replacing it, so adding fields to the schema won't break existing installs. Bump the key if the shape changes in a way that matters.

Nothing leaves the browser. There is no backend.

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

Cloudflare Pages, static:

- Build command: none
- Output directory: `/`
- Custom domain: `dash.biv.xyz`

### Lock it down

The page carries `noindex`, which keeps it out of search results and out of nothing else. It holds prayer counts, unedited writing, and raw ideas.

Put Cloudflare Access in front of it: Zero Trust → Access → Applications → self-hosted → allow policy on one email address. One-time PIN, no code to write.

---

## Stack

Plain HTML, CSS, and JavaScript in one file. Caveat and JetBrains Mono from Google Fonts. Design tokens match [biv.xyz](https://biv.xyz).

Keyboard focus is visible, `prefers-reduced-motion` is respected, and the layout collapses to one column under 760px.

---

## Roadmap

Ordered by whether it survives the "will this actually get used" test.

- [ ] Real seven-day history (the week view currently runs on sample data)
- [ ] Daily rollover at midnight, weekly rollover for the run count
- [ ] KV queue so the phone can write and the Mac can pull, with a visible last-synced timestamp
- [ ] Outbound sends counter, once there's a version of it that isn't just another number to look at

### Not doing

Strava, Google Calendar, GitHub activity, revenue charts, and anything else that would let me open the page and change nothing.
