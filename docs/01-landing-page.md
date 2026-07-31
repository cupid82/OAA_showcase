# 01 — Landing Page

Public marketing page at `/`. No authentication. No real data — placeholder images
and realistic dummy content until the backend exists.

> Drafted from the Step 4 brief in `plans.md`. Replace with your Obsidian note if it
> has more detail.

## Global

- Mobile-first responsive. Nothing may overflow horizontally at 320px.
- Sticky top navigation with smooth-scroll anchors to each section.
- Three login entry points — **Student**, **Teacher**, **Admin** — each routing to
  `/login` with that tab preselected (`/login?role=student`).
- Tailwind only. No additional UI library.

## Sections, in order

1. **Hero** — college name, one-line positioning, primary CTA (Student login),
   secondary CTA (explore courses), background image.
2. **About** — 2–3 paragraphs on the institution, founding year, accreditation
   badges, quick facts strip.
3. **Principal's message** — portrait, name, designation, signed message.
4. **Statistics** — animated counters: students, faculty, courses, placement rate.
5. **Departments** — card grid, one per department, with icon, name, short blurb.
6. **Courses** — programme cards grouped by level (UG / PG), duration, seats.
7. **Gallery** — responsive image grid, lightbox optional.
8. **Latest news** — 3–4 news cards with date, title, excerpt, "read more".
9. **Upcoming events** — event list with date chip, title, venue, type.
10. **Placement statistics** — highest / average package, top recruiters logo row,
    placement percentage by department.
11. **Testimonials** — alumni quotes with photo, name, batch, current company.
12. **Contact** — address, phone, email, map placeholder, contact form (UI only —
    no submit endpoint yet).
13. **Footer** — quick links, department links, social icons, copyright.

## TODO — fill from your notes

- TODO: real college name, tagline, address, contact details
- TODO: actual department and course lists
- TODO: real placement numbers, or confirm dummy numbers are acceptable for demo
- TODO: does the contact form need to actually send mail, or is UI-only fine?
