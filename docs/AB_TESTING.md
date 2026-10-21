# Planora A/B Testing

## Participant URLs

Serve the repository root with a static HTTP server, then use:

- Prototype A: `http://localhost:8000/prototype-a/`
- Prototype B: `http://localhost:8000/prototype-b/`
- Public landing page: `http://localhost:8000/` (enters Prototype A by default)

For example:

```sh
python3 -m http.server 8000
```

Each participant folder contains all HTML route shells so direct page loads and refreshes work. Links remain relative and therefore stay inside the assigned prototype.

## Intended experimental differences

| Area | Prototype A | Prototype B |
| --- | --- | --- |
| Conflict resolution | Verified-dates table followed by an expandable pending-review list | Two side-by-side conflict cards with direct reschedule/TBD actions |
| Source evidence | Compact filename and excerpt modal | PDF print-preview viewer with highlighted representative source text and extracted fields |
| Task list | Inline row editing, separate view arrow, and the original delete control | Add-event-style edit popup, whole-card Calendar detail navigation, trash icon, and in-app deletion confirmation |
| Calendar editing | Full-page edit route | Prefilled edit-event popup over the Calendar detail view |

All remaining upload, calendar, dashboard, search, authentication, and settings behavior stays equivalent unless a test brief explicitly assigns a difference to one prototype.

## File ownership

Shared:

- `assets/`, `css/theme.css`, and `vendor/bootstrap/`
- Root `index.html`, which remains the public landing page

Prototype A:

- `prototype-a/*.html`
- `prototype-a/js/*.js` (complete Prototype A JavaScript)

Prototype B:

- `prototype-b/*.html`
- `prototype-b/js/*.js` (complete Prototype B JavaScript)

HTML and JavaScript are intentionally self-contained within each prototype. Assets, styling, and vendored Bootstrap remain shared to avoid duplicating static resources that do not affect experiment behavior.

## Variant and state isolation

Each prototype's `js/config.js` loads before its local `js/store.js` and fixes the assignment:

- A uses `planora.prototype-a.v1`
- B uses `planora.prototype-b.v1`

Prototype-specific flash messages use separate keys as well. `Planora.setVariant()` is ignored and `?ab=` cannot override a route's assignment. The toggle under **Settings → Demo tools → Prototype version** explicitly navigates to the corresponding prototype route and copies the current tab's demo state to that prototype so comparisons can continue without signing in or recreating changes.

## Problems found and fixed

- Both variants previously shared one set of root URLs and one session state.
- Participants could change variants through Settings or `?ab=`.
- `review.js` referenced a Version B renderer that did not exist or load.
- `edit.js` referenced an undefined `from` variable, breaking full-page editing at runtime.
- Conflict-origin editing lost its return context.
- `conflict.js` declared its conflict group twice.
- Nested prototype pages initially required corrected asset paths, including the dynamically rendered navbar logo.

## Validation performed

The application was served over local HTTP and tested in headless Chrome at desktop and 390 px mobile widths.

- All static HTML page and asset references resolve.
- Every JavaScript file passes `node --check`.
- All 12 HTML routes exist under both participant folders.
- Public index, login, and signup pages load in both variants.
- Authenticated dashboard, calendar, tasks, upload, search, settings, conflict, edit, and review pages load in both variants.
- Internal links stay within the active participant folder.
- The Settings prototype toggle switches in both directions, preserves the signed-in session and carries current demo changes across.
- A and B state remain separate across navigation and refreshes.
- Prototype A keep-both conflict handling persists.
- Prototype B rescheduling persists.
- Upload-to-review confirmation works in both variants.
- Prototype A inline task edits update the matching Calendar event.
- Prototype B popup task edits update the matching Calendar event; cards open that event's Calendar detail view and confirmed deletion removes it from both pages.
- The PDF-style Source Evidence viewer is present only in Prototype B.
- The root landing page links into Prototype A without referencing removed legacy routes.
- No uncaught JavaScript exceptions, console errors, local HTTP failures, or representative mobile page overflow were observed.

## Prototype limitations

- Data is browser-session mock data; there is no backend.
- Syllabus extraction and calendar integrations are simulated.
- Google Fonts require network access, with system-font fallbacks when unavailable.
