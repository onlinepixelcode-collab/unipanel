# UnipanelSA · Luxury European Surfaces

Flagship site, 3D Surface Studio and "Ask Unipanel" concierge. Next.js 15 (App Router, TypeScript strict), Tailwind 4, three.js via React Three Fiber, Zustand, Lenis + GSAP.

Served under the base path `/unipanel` (e.g. `demo.pixelcode.co.za/unipanel`).

**Live demo:** https://onlinepixelcode-collab.github.io/unipanel/ (static build on GitHub Pages: the concierge answers on-device and forms open the showroom email; deploy with `npm run build && npm start` and an `ANTHROPIC_API_KEY` for the full AI concierge).

### Update the demo

```bash
NEXT_PUBLIC_SITE_URL=https://onlinepixelcode-collab.github.io STATIC_EXPORT=1 npx next build && touch out/.nojekyll
# then publish the contents of out/ to the gh-pages branch
```

## Run

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY for the concierge
npm run dev                  # http://localhost:3000/unipanel/
npm test                     # catalogue, every finish × every zone, share links, showroom hours
npm run build && npm start   # full build with the concierge and form API
npm run build:static         # static export to ./out (concierge runs in offline mode)
```

### Environment variables (server side only)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Enables the AI concierge (`/api/concierge`). Never exposed to the browser. |
| `ANTHROPIC_MODEL` | Optional model override. Default `claude-opus-5-5`. |
| `FORM_WEBHOOK_URL` | Optional. Forms POST JSON here (Zapier, Make, Formspree, a CRM). Without it, forms open a pre-addressed email to the chosen showroom. |
| `NEXT_PUBLIC_BASE_PATH` | Default `/unipanel`. |
| `NEXT_PUBLIC_SITE_URL` | Origin used for sitemap, canonical URLs and schema. Default `https://demo.pixelcode.co.za`. |

## Deploy

- **With the concierge (recommended):** `npm run build`, then run `npm start` (Node 20+) behind your web server, proxying `/unipanel` to it.
- **Static only:** `npm run build:static` and upload the contents of `out/` to the `/unipanel/` folder. The concierge answers basics offline (hours, specs-on-request, samples); forms open the showroom email.

## The catalogue

All 96 finishes come from the live site's WooCommerce Store API, one entry per finish even when it is cross-listed in several collections.

- `scripts/scrape-catalogue.mjs` (`npm run scrape`) re-reads every product and downloads any new swatch render into `catalogue/swatches/`.
- `scripts/process-assets.mjs` (`npm run assets`) crops the flat door face out of each render, divides out the studio lighting, writes web textures and normal maps into `public/`, measures colour and tone, and generates `src/data/catalogue.records.ts`.
- `src/data/catalogue.ts` adds PBR presets per surface type, texture URLs and pairings. Hand-picked pairings live in `src/data/catalogue-curation.ts`.

### Add a new finish

1. Publish it on unipanelsa.co.za as usual (with its product render).
2. `npm run scrape && npm run assets`
3. `npm test` (fails if a finish, texture or zone is missing), then rebuild.

To add one by hand instead: drop the render in `catalogue/swatches/`, add the product to `catalogue/products.json` (name, categories, image URL ending in that filename), and run `npm run assets`.

### Swap a texture

Replace the image in `catalogue/swatches/` (same filename) and run `npm run assets`. For a finish rendered as a solid colour (gloss, glass, metal, plain matte), the colour is sampled from the unlit lower-left of the face; to override it, edit `hex` after generation or adjust `FLAT` in `process-assets.mjs`. Real-world texture scale per surface type is `TEX_MM` in the same script.

## The Studio

- Geometry is parametric, in millimetres (`src/lib/studio/layout.ts`): 18mm boards, 150mm plinth, 720mm carcass, 900mm worktop, 2mm reveals. UVs are authored in mm, so grain and veins keep their real size and flow across neighbouring doors; bookmatch mirrors alternate doors at the joint.
- Materials: `src/components/three/materials.ts` (one shared `MeshPhysicalMaterial` per finish). Lighting moods: `Lighting.tsx` (GPU-rendered softboxes, no HDRI download).
- Scheme state is a short versioned code in `?s=`, so every share link, spec sheet and "send to showroom" reopens the exact scheme.
- Scenes: kitchen (straight, L, U, galley, island, L + island, peninsula), walk-in wardrobe, media wall, vanity, and **Whole home** (all four rooms joined by doorways, with a dollhouse view and a walk mode: drag to look, W A S D / arrows / scroll to walk).
- **Designs:** eight curated looks in `DESIGN_PRESETS` (`src/lib/studio/scheme.ts`); add more there (tests check every finish id).
- **Design A / B:** two editable designs; Compare shows them side by side from the same camera.
- **Client spec sheet:** branded multi-page PDF (`src/lib/studio/specSheet.ts`): cover with client and project details, rendered views, full finish schedule, finish and care cards, sign-off page, optionally both designs.
- Quality tiers: add `?q=0|1|2` to force low / mid / high for testing.

## Product catalogue (flip book + PDF)

`npm run catalogue` (macOS, needs Google Chrome) rebuilds the downloadable catalogue from the live data:

- designs an A4 landscape document from `src/data/catalogue.records.ts`, the swatch renders and the specs published in the June 2025 brochure (`src/data/brochure-specs.ts`)
- prints it to `public/catalogue/UnipanelSA-Product-Catalogue.pdf` with headless Chrome
- renders each page to `public/catalogue/pages/` for the 3D flip book at `/catalogue/`

Run it again after `npm run scrape && npm run assets` so new finishes appear in the catalogue.

## Content still needed from UnipanelSA

- Company history, milestones and team photography (marked placeholders on `/about`).
- Ceramic finishes (the Exclusive Range lists Ceramic, but no Ceramic products are online yet).
- Per-finish applications if they differ from "kitchen doors, panels, wardrobes, interiors".
- Which finishes appear in each Inspiration photo (only the Titan images name theirs).
- Review of the POPIA privacy wording by the Information Officer.
- KTX2/Basis compression of textures (currently JPEG/WebP, 1024px desktop and 512px mobile).
