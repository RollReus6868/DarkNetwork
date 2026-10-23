---
name: "ebook-listing-from-pdf"
description: "Use when turning an ebook PDF and cover image into a complete, honest store listing (description, learn points, FAQ, SEO) and adding it to the Dark Network site as a draft."
---

# Ebook listing from PDF

For the Dark Network site (Supabase + Cloudflare; repo, deploy and admin details are in the `darknetwork-site-workflow` skill, which also says how to set up a new Claude account). A copy of this skill lives in the website repo at `.claude/skills/ebook-listing-from-pdf/SKILL.md`; keep both in sync. Talk to the user in Vietnamese; write listing copy in English (everything visitors see is English).

## Two routes: pick one with the user
- **DN Product Studio** (the owner's desktop tool, skill `dn-product-studio-dev`): the tool scans a folder, builds a prompt from each PDF, takes back a JSON answer and uploads the cover and PDF itself. If the user uses the tool, your job is only to write that JSON answer (fields below) and they paste it in.
- **Directly** (this skill, steps below): you read the book, write the listing, and create a **draft** row in table `ebook` with the Supabase connector; the user then uploads the cover and PDF in Admin. The sandbox cannot reach supabase.co storage, so you cannot upload files yourself.

## Steps (direct route)
1. **Get the files.** The chat must be linked to the user's computer (Claude desktop app). The user connects a folder (for example `E:\BOOK_1`): list it with `device_list_dir`, bring PDFs and covers with `device_stage_files` (they land in `/mnt/user-data/uploads/<folder>/`; wait a second before reading). Not linked: ask the user to attach the PDF and cover in the chat.
2. **Read the book.** `pdftotext -layout file.pdf <scratchpad>/x.txt`, `pdfinfo` for page count. Read the front matter (copyright, license, contents), the intro claim and any closing chapter. View the cover with Read.
3. **Classify each file.** Check the license page. A companion guide that says "may be copied and shared, may not be sold" is a FREE RESOURCE (table `free_resource`, Admin tab "Tài liệu miễn phí", `resource_type: Study Guide`). The main book is the paid EBOOK.
4. **Write the listing from the book only.**
   - `title`, `slug` (lowercase, hyphens, unique: check `select slug from ebook`), `subtitle`
   - Series books are titled `<Series> - Part N` (home page groups them into one row per series, parts ascending; titles without "Part N", or `edition_type` `full`, go in the "Full Editions" row). Keep that pattern when the user has a series.
   - `description` as HTML (`<p>`, `<h3>`, `<ul>`): opening hook, what it is, what is inside (real chapter/part counts, appendices, tools), an "honest edition" note, format and page count. Plain spaces only (no `&nbsp;`: it once made a phone page 2,700 px wide).
   - `what_you_learn` (about 9 short strings), `who_for` (HTML list), `faq` (5-7 `{question, answer}`), `seo_title`, `meta_description` (<= 160 chars)
   - Delivery wording must match the site: buyers sign in, open **My Account** (`/account`) and press Download; guests get the link in their receipt email. Do not promise anything else.
   - Do not invent reviews (`reviews` stays empty). Do not overclaim. Repeat limits the book states itself ("not a new translation", "pre-publication manuscript") and flag them to the user.
   - Price: suggest one, keep the user's existing price if set, say it is editable. `original_price` only for a real discount (shows SAVE x%).
5. **Prepare the cover.** Admin compresses covers to WebP on upload, so the original is fine; to save a ready copy anyway: Pillow `im.convert("RGB"); im.thumbnail((640, 960)); save WEBP quality 80` (about 150 KB). Covers display at 5:7.
6. **Create the draft row** with `mcp__Supabase__execute_sql` (project ref `qztnndbhauzawchfhcui`):
   - First look for an existing row with the same or similar title or slug; update it instead of duplicating.
   - Always set `status = 'draft'`: the column default is `published`, so an insert without it goes live with no cover, file or variant.
   - Leave `sort_order` unset (default 0): unnumbered books show FIRST on the home page and Books page, newest first. Leave `featured` false unless asked.
   - `what_you_learn`, `faq`, `preview_images`, `related_ebook_ids` are jsonb arrays (`'[...]'::jsonb`); use dollar quoting (`$q$...$q$`) for HTML. `cover_image` can stay empty for a draft.
   - Set `lemon_squeezy_variant_id` to the variant the other books use (`select lemon_squeezy_variant_id, count(*) from ebook group by 1`): one shared variant serves every book, the checkout takes name and price from the row.
   - Free resources go in `free_resource` the same way (`download_url` is the public file).
7. **Save copies** of the listing JSON (`<slug>.ebook.json`, array, `status: draft`) in the repo `seed/` and, if the user wants, back to their folder (`device_commit_files`, stage under `/mnt/user-data/outputs/` first).
8. **Tell the user what remains** in `/admin` > tab Ebook > the book's pencil button (Sửa): upload the cover (Ảnh bìa), upload the PDF as the private file ("File ebook (riêng tư)"; buyers download it under its file name), check price and variant id, then set Trạng thái to `published` and Lưu. Give these as clicks.

## Gotchas
- A published ebook without a variant id or private PDF shows a broken Buy Now; a published free resource without `download_url` delivers nothing. Say so if the user publishes early.
- Bulk import in Admin is per tab (Ebook JSON in the Ebook tab) and creates duplicates if the slug already exists.
- Check the copyright page for notes such as "reviews still required before print" and tell the user.
- The NEW badge appears by itself on books added in the last 30 days (Admin > Cài đặt switches it off or changes the days).
