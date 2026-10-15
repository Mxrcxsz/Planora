# Planora — The Smart Extractor (prototype)

A clickable, fully functional prototype of Planora: upload a syllabus, review the deadlines it finds, then manage them on a calendar, task list and dashboard. Plain HTML, Bootstrap 5.3 and vanilla JS. No build step and no backend; all data is mock data kept in your browser's `localStorage`.

## Run it
Open `index.html`, or serve the folder:

```
npx serve .          # or: python3 -m http.server 8000
```

Bootstrap is vendored in `vendor/bootstrap`, so it works offline. Fonts (Fraunces, Public Sans) load from Google Fonts and fall back to system fonts if blocked.

## Try the flows
- **Demo account:** Log in with any email and the password `demo1234` (or "Continue with Google"). You get a full semester of sample data (CS301, MATH210, ENG110, HIST220). "Today" is fixed at **Tue 21 Oct 2025** so the data always lines up.
- **First-run account:** Sign up with any details. You start with no data, see the empty dashboard, then upload a syllabus (use *Choose a file* or *Use a sample syllabus*) → review → add to calendar.
- **Upload errors:** a non-PDF/Word/image file, a file over 20MB, or a filename containing "scan" shows the "Couldn't read that file" state.
- **Conflict:** the demo data has one (CS301 Midterm vs MATH210 pop quiz, 28 Oct). Resolve it from the dashboard banner, a calendar day, or Tasks.
- **Search:** click the search icon in the nav (or press `/`). The search bar appears over the nav; Enter goes to the results page.
- **Calendar:** Month / Week / Day views, filters, mini calendar, Create menu (Event, Exam, Import course schedule), day details, event detail with edit / mark done / delete. Week and Day show a 00:00–23:00 time grid that opens scrolled to 09:00.
- **Reset:** Settings → Account → *Prototype tools* → Reset demo data / Clear all data.

## Structure
```
index.html login.html signup.html          marketing + auth
upload.html review.html edit.html          upload → review → edit a deadline
dashboard.html calendar.html tasks.html    core app
search.html conflict.html settings.html
css/theme.css                              design tokens + Bootstrap overrides
js/store.js                                mock data, localStorage, fake extraction
js/app.js                                  nav, search overlay, toasts, add-event modal
js/<page>.js                               one script per page
```
State key: `planora.v1`. Extraction is faked from seed data (CS301 for an empty account, PHYS101 once you already have deadlines).
