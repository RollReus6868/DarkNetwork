---
name: "dn-product-studio-dev"
description: "Use when developing, fixing or releasing DN Product Studio (RollReus6868/DN-Product-Studio, tool up sản phẩm lên website), the Python/pywebview desktop tool that publishes ebooks and Spring POD products to the Dark Network site and shows its orders, analytics, carts, email sign-ups and customer chat."
---

# DN Product Studio development

A copy of this skill lives in the website repo at `.claude/skills/dn-product-studio-dev/SKILL.md` (with `darknetwork-site-workflow` and `ebook-listing-from-pdf`); keep both copies in sync. It replaces the older duplicate skill `tool-up-sản-phẩm-lên-website`.

Desktop tool for the owner of the Dark Network site (Vietnamese user, not a developer: reply in Vietnamese, plainly, short). It turns a folder of PDFs + cover images, or Spring links, into **draft** products on the website, and lets the owner watch orders, visitors, carts and email sign-ups and answer customer chat without opening the site. Windows and macOS, built on GitHub, self-updating, Youwee house style UI. Version 1.4.0 as of 23/10/2026 (check `app_info.py`, the single source of the version).

## Starting on a new Claude account
The repo is public, so `git clone https://github.com/RollReus6868/DN-Product-Studio /home/claude/dn-product-studio` works for reading; pushing, `gh api` and releases need `add_repo` owner `RollReus6868` repo `DN-Product-Studio` access `push` (the GitHub connector must be added in the new account). Create the venv: `python3 -m venv /home/claude/venv && /home/claude/venv/bin/pip install -r requirements.txt`. Changes on the site side (`toolApi`) follow the `darknetwork-site-workflow` skill, which lists the connectors the account needs.

## Pages and what they do (decisions the user made)
- **Ebook**: scan a folder, pair each PDF with the image of the same file name, read the PDF, build a ready prompt the user pastes into Claude/ChatGPT, paste the JSON answer back, set price (default + per-row edit), compress the cover, upload, create the record as draft. The tool never sends `sort_order`, so on the site a new book has 0 and shows FIRST on the home page and Books page until the owner arranges the list (site rule since 23/10/2026, `src/lib/displayOrder.js`).
- **No AI API** inside the tool: prompt out, JSON in.
- **POD**: the user only pastes Spring links; the tool reads name, price and photos from the page.
- **Lemon Squeezy**: its API cannot create products, so every ebook shares one variant id; the website sets name and price at checkout.
- **Restore PDFs**: after a scan the tool lists books on the site whose file is still an old Base44 address (`mp/private/...`) and uploads the same-named PDFs from the folder (main PDFs only, not bonus files).
- PDFs are uploaded under their **original file name**; buyers see that name when downloading.
- **Đơn hàng** (read-only): one row per order (a cart order lists all its books): email, date, books, total, paid/refunded, account or guest; totals on top. New orders are checked every minute; red badge on the icon; opening the page resets it (first run marks old orders seen).
- **Phân tích** (1.4.0, replaced "Lượt truy cập"): GA-style users, new users, sessions, views, engagement time and rate vs previous period; daily chart; active in last 30 min; countries; pages; channels; sources; 7 / 28 / 90 days. Data from the site's own tables (`page_view`, `site_event`, recorded richer from 12/10/2026) through SQL `tool_analytics`.
- **Giỏ & thanh toán** (1.4.0): add-to-cart, checkout opened, paid; funnel; per book; each checkout attempt and its result.
- **Email đăng ký** (1.4.0): count, new, list, copy all.
- **Tin nhắn**: the same inbox as the website's Admin > Tin nhắn and the /studio phone app. Click a customer to read (marks read), Enter to reply; red badge with waiting customers; a toast on new messages.
- **Cài đặt** (site address, token, default price, shared variant id, theme, updates) and **Hướng dẫn**.

## Facts
- Repo `RollReus6868/DN-Product-Studio` (public), branch `main`, clone at `/home/claude/dn-product-studio` (`git pull` first: other sessions release too). Python venv at `/home/claude/venv`.
- Python 3.12, pywebview (Windows forced `gui="edgechromium"`, WKWebView on macOS), stdlib `ThreadingHTTPServer` on 127.0.0.1 with a per-run session key (`X-Session`), vanilla JS/CSS in `ui/` (`index.html`, `app.js`, `app.css`, local Nunito fonts, `lucide.min.js`), pypdf, Pillow, requests, keyring. Env prefix `DNPS_`.
- Modules: `app_info.py` (name, id, version, repo), `storage.py` (config, items, token in keyring), `scan.py`, `pdfread.py`, `prompts.py`, `spring.py`, `webstore.py` (site client + publish; not `site.py`, which shadows the stdlib), `server.py` (routes under `/api/`), `updater.py`, `selfcheck.py`, `main.py`, `launcher.py`.
- The site side is the Supabase edge function `toolApi` (`https://qztnndbhauzawchfhcui.supabase.co/functions/v1/toolApi`), code in the website repo `RollReus6868/DarkNetwork`, live branch `claude/chuyen-sang-supabase` (skill `darknetwork-site-workflow` for deploying it). Header `X-Tool-Token` = secret `TOOL_API_TOKEN` (the user generates it in the tool's Cài đặt and pastes it into Supabase > Edge Functions > Secrets themselves). Actions used by `webstore.py`: `ping`, `list`, `upsert {entity, data, id, overwrite}`, `upload_url {name, private}`, `orders`, `analytics {days}`, `chat_list`, `chat_thread`, `chat_reply`, `pending_pdfs`, `attach_pdf` (the site still answers `traffic` for tool versions before 1.4.0). `upsert` never changes `status` of an existing record and answers 409 when the slug exists unless `overwrite`. A new tool feature that needs data usually needs a new action there too: change and deploy the site function first, then release the tool.
- Uploads go straight to storage through a signed upload URL (multipart PUT with `cacheControl: 31536000`, names are unique), max 50 MB each. Ebook covers are compressed to fit 640x960 (`COVER_BOX`, about 150 KB); POD photos keep 1000x1500. This keeps Supabase free-plan bandwidth low.
- Data dir: `%APPDATA%\DNProductStudio` / `~/Library/Application Support/DNProductStudio`.

## Test
```bash
cd /home/claude/dn-product-studio
/home/claude/venv/bin/python -m unittest discover -s tests      # pytest is not installed
/home/claude/venv/bin/python tests/smoke_ui.py <scratchpad>/shots # real UI in headless Chromium, fails on console errors or overflow
/home/claude/venv/bin/python tools/check_repo.py
```
- `tools/fake_site.py` stands in for `toolApi` (all actions above). Add new actions there when the site gains them. The sandbox cannot reach supabase.co, so a change in what the tool sends is proven only against the fake: say so, and ask the user to try it on the real site. The site's own `tools/local-stack` runs the real `toolApi` locally if you need the real server behaviour.
- Look at the screenshots after UI changes (light and dark, 1200 and 900 wide).

## Release
1. Bump the version in `app_info.py`, `README.md`, `VERSION.txt`, `RELEASE_NOTES.md` (notes in Vietnamese, for the user; newest on top, older versions summarised below as "Từ bản x.y.z").
2. Commit with the attribution trailers from the session reminder, `git push origin main`. Wait for the push build to go green.
3. Pushing a tag from the sandbox fails with 403. Publish with the workflow instead:
   `gh api -X POST repos/RollReus6868/DN-Product-Studio/actions/workflows/build.yml/dispatches -f ref=main -F 'inputs[publish]=true'`
4. Poll `gh api repos/RollReus6868/DN-Product-Studio/actions/runs/<id>` until `completed`, then confirm `gh api repos/RollReus6868/DN-Product-Studio/releases/latest` shows the new tag with 5 assets: `DNProductStudio-<ver>-windows-setup.exe`, `-windows-portable.exe`, `-mac-arm64.zip`, `-mac-x64.zip`, `SHA256SUMS.txt`. The updater depends on these exact names.
5. `gh run watch`, `gh release view` and `gh workflow run` use GraphQL, which is blocked here: use `gh api` (REST) only.
6. Tell the user: open the tool > Cài đặt > Kiểm tra cập nhật.

## Lessons
- HTTP server: always read the POST body before answering 403, or keep-alive breaks with "Bad request syntax".
- Tests must not depend on order (set the default price explicitly).
- UI: toasts top-right, keep scroll position across pages, item rows wrap at 1040 px.
- pip with the system Python fails building `proxy_tools`: use the venv.
- The server-side name sanitiser keeps `A-Za-z0-9._-`, turns other characters into `-` and keeps the last 80 characters, so do not slugify PDF names in the tool.
- When the user reports "published but X does not work" or "a new book does not show on the home page", check the site first (skill `darknetwork-site-workflow`): a sale once went unrecorded because of a site webhook bug, and new books once stayed off the home page because of the site's row limit and ordering, not the tool.
- Orders, analytics, carts and emails stay read-only in the tool; refunds and edits happen in Lemon Squeezy or the site's Admin.

## Rules
- Never ask for or type the tool token, API keys or passwords; the user enters them.
- Products are always saved as draft; an existing slug asks before overwriting.
- Not yet verified on real data: Spring scraping on a live link.
