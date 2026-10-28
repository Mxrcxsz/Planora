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

Use the independent participant entry points when running the experiment:

- Prototype A: `/prototype-a/`
- Prototype B: `/prototype-b/`

Each participant route keeps normal navigation inside its own prototype folder and uses a separate session-storage key. The repository root contains only the public landing page; its calls-to-action enter Prototype A by default.

The prototypes are identical except for one intentionally contained difference:

| Page | Version A | Version B |
|---|---|---|
| Review extracted deadlines | syllabus source side by side: PDF-style viewer next to a numbered list (`prototype-a/js/review.js`) | card list with a Source evidence modal per row (`prototype-b/js/review.js`) |

Both Review pages share the same mock deadlines, conflict detection, Edit modal and "Resolve now / Review later" pop-up (`js/review-core.js`), and ignore what was uploaded. Calendar, Conflict resolution and the Task list use the same layout in both (red date box on conflicted days, side-by-side conflict cards, grouped cards).

Use **Settings → Demo tools → Prototype version** to switch between A and B. The switch opens the matching page in the other prototype and carries the current tab's demo state across for immediate comparison. Query parameters cannot override a prototype route. See [`docs/AB_TESTING.md`](docs/AB_TESTING.md) for ownership, test procedure, and validation details.

## Try the flows

- **Demo account:** log in with any email and the password `demo1234` (or "Continue with Google"). You get a full semester of sample data (CS301, MATH210, ENG110, HIST220). "Today" is fixed at **Tue 21 Oct 2025** so the data always lines up.
- **First-run account:** sign up with any details. You start with no data, see the empty dashboard, then upload a syllabus (*Choose a file* or *Use a sample syllabus*) → review → add to calendar.
- **Upload (mock):** choosing files, dropping them or *Use a sample syllabus* always "finds" the same 6 deadlines from the demo semester's syllabi (CS301, MATH210, ENG110, HIST220; defined in `js/review-core.js`), including the 28 Oct clash. File names only change the heading. Up to 5 files at a time.
- **Upload errors:** a non-PDF/Word/image file, a file over 20MB, or a filename containing "scan" shows the "Couldn't read that file" state.
- **Conflict:** the demo data has one (CS301 Midterm vs MATH210 pop quiz, 28 Oct, 10:00), and every upload shows it again on the Review page (two courses on the same date count as a clash). Confirming uses the same ids as the preloaded events, so it updates them in place instead of adding copies: on the demo account the calendar stays the same size, and after *Clear all data* the upload adds exactly those 6 deadlines. If the tester moves one of them on the Review page, the clash is cleared on the calendar too. Open the conflict from the dashboard banner, a calendar day or Tasks; each item can be moved to a new date or marked TBD, or you can keep both or review later.
- **Dashboard:** click **Customize** to edit the layout. Drag widgets from the left panel onto the dashboard (or click to add), drag to reorder, drag back to the panel or use the trash icon to remove, pick a size (S/M/L/XL/Full), and use the gear for options such as time range, course, type and rows shown. Presets: Compact, Focused, Full detail. *Save layout* keeps it; *Cancel* discards; *Reset to default* restores the original layout.
- **Calendar:** Month / Week / Day views, filters, mini calendar, Create menu (Event, Exam, Import course schedule), a day panel that slides in, and event detail with edit / mark done / delete. Week and Day show a 00:00–23:00 time grid that opens scrolled to 09:00.
- **Search:** click the search icon in the nav (or press `/`) and the search bar sweeps across the nav; Enter goes to the results page. Results can be filtered by type and time period (presets or a custom From/To range); a custom range is kept in the URL.

## Design notes

- **Navbar:** the same full-width navbar on every signed-in page, with the logo centred over the sidebar column. The active tab is a sliding pill. Login and signup use a header with only the logo, centred.
- **Login / signup:** marketing copy and decorative mini-mockups of core features (week view, syllabus extraction, conflict alert, event detail) on either side of the form. They hide below 1180px wide.
- **Motion:** pages fade up on load and fade out on internal links; the calendar slides between periods and views; dashboard widgets animate when moved or resized. Everything respects the OS "reduce motion" setting.

## Structure

```
index.html                                 public landing page; defaults to Prototype A
prototype-a/*.html                         complete Prototype A routes
prototype-b/*.html                         complete Prototype B routes
prototype-a/js/ prototype-b/js/            complete, independent JavaScript copies
css/theme.css                              design tokens, Bootstrap overrides, page styles, motion
prototype-*/js/store.js                    mock data, sessionStorage, activity log, fake extraction
prototype-*/js/app.js                      nav, transitions, toasts, forms and shared artwork
prototype-*/js/<page>.js                   one script per page, owned by that prototype
```

State keys: `planora.prototype-a.v1` and `planora.prototype-b.v1` (in `sessionStorage`). The dashboard layout is stored in each prototype state as `ui.dashLayout`. Uploads are faked: `js/review-core.js` holds the mock deadlines the Upload and Review pages show.
