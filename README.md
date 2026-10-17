# Planora — The Smart Extractor (prototype)

A clickable, fully functional prototype of Planora: upload a syllabus, review the deadlines it finds, then manage them on a calendar, task list and customizable dashboard. Plain HTML, Bootstrap 5.3 and vanilla JS. No build step and no backend; all data is mock data kept in the browser.

## Run it

Open `index.html`, or serve the folder:

```
npx serve .          # or: python3 -m http.server 8000
```

Bootstrap is vendored in `vendor/bootstrap`, so it works offline. Fonts (Fraunces, Public Sans) load from Google Fonts and fall back to system fonts if blocked.

## Running a test session

Everything a tester does (resolving a conflict, editing, deleting, uploading, rearranging the dashboard) is saved and shows up on every page. Data lives in `sessionStorage`, so:

- Changes last across pages and refreshes **while the tab stays open**.
- **Closing the tab** brings back the original demo scenario, signed out.
- Each tab is its own session. Keep a tester in one tab; a new tab starts fresh.

Between testers, either close the tab or use **Settings → Demo tools**:

- **Restart demo:** restores the original scenario, signs out and returns to the landing page.
- **Reset data:** restores the sample semester but stays signed in.
- **Clear all data:** an empty account, for testing the first-run flow.

### A/B testing
**Settings → Demo tools → A/B test version** switches between Version A and Version B. Only these pages differ; the rest of the flow is identical:

| Page | Version A | Version B |
|---|---|---|
| Resolve a conflict | verified dates table + expandable *Pending dates for your review* list (`js/conflict-a.js`) | side-by-side cards (`js/conflict.js`) |
| Review | current list | in progress (separate developer) |
| Task list | same in both | same in both |

The version is saved per device in `localStorage` (`planora.variant`), so it survives *Restart demo* and closing the tab. Adding `?ab=A` or `?ab=B` to any page URL also sets it, which is handy for links sent to remote testers. In code, read it with `Planora.variant()`.

**Review version B hook:** `js/review.js` is version A. Version B defines `window.PlReviewB = function (review) { … }` in its own script, loaded in `review.html` before `review.js`; when the device is on version B, `review.js` hands over to it. `review` is the pending review (`Planora.state.review`).

## Try the flows

- **Demo account:** log in with any email and the password `demo1234` (or "Continue with Google"). You get a full semester of sample data (CS301, MATH210, ENG110, HIST220). "Today" is fixed at **Tue 21 Oct 2025** so the data always lines up.
- **First-run account:** sign up with any details. You start with no data, see the empty dashboard, then upload a syllabus (*Choose a file* or *Use a sample syllabus*) → review → add to calendar.
- **Upload errors:** a non-PDF/Word/image file, a file over 20MB, or a filename containing "scan" shows the "Couldn't read that file" state.
- **Conflict:** the demo data has one (CS301 Midterm vs MATH210 pop quiz, 28 Oct, 10:00). Open it from the dashboard banner, a calendar day or Tasks. Each item can be moved to a new date or marked TBD; you can also keep both (acknowledge the clash) or review later.
- **Dashboard:** click **Customize** to edit the layout. Drag widgets from the left panel onto the dashboard (or click to add), drag to reorder, drag back to the panel or use the trash icon to remove, pick a size (S/M/L/XL/Full), and use the gear for options such as time range, course, type and rows shown. Presets: Compact, Focused, Full detail. *Save layout* keeps it; *Cancel* discards; *Reset to default* restores the original layout.
- **Calendar:** Month / Week / Day views, filters, mini calendar, Create menu (Event, Exam, Import course schedule), a day panel that slides in, and event detail with edit / mark done / delete. Week and Day show a 00:00–23:00 time grid that opens scrolled to 09:00.
- **Search:** click the search icon in the nav (or press `/`) and the search bar sweeps across the nav; Enter goes to the results page. Results can be filtered by type and time period (presets or a custom From/To range); a custom range is kept in the URL.

## Design notes

- **Navbar:** the same full-width navbar on every signed-in page, with the logo centred over the sidebar column. The active tab is a sliding pill. Login and signup use a header with only the logo, centred.
- **Login / signup:** marketing copy and decorative mini-mockups of core features (week view, syllabus extraction, conflict alert, event detail) on either side of the form. They hide below 1180px wide.
- **Motion:** pages fade up on load and fade out on internal links; the calendar slides between periods and views; dashboard widgets animate when moved or resized. Everything respects the OS "reduce motion" setting.

## Structure

```
index.html login.html signup.html          marketing + auth
upload.html review.html edit.html          upload → review → edit a deadline
dashboard.html calendar.html tasks.html    core app
search.html conflict.html settings.html
css/theme.css                              design tokens, Bootstrap overrides, page styles, motion
js/store.js                                mock data, sessionStorage, activity log, fake extraction
js/app.js                                  nav, search sweep, page transitions, toasts, add-event modal, login/signup artwork
js/dashboard.js                            widget catalog, layouts and presets, edit mode, drag and drop
js/<page>.js                               one script per page
```

State key: `planora.v1` (in `sessionStorage`). The dashboard layout is stored in it as `ui.dashLayout`. Extraction is faked from seed data (CS301 for an empty account, PHYS101 once you already have deadlines).
