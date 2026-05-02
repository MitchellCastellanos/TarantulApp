import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = path.join(__dirname, "..");

const v58 = fs.readFileSync(
  path.join(base, "backend/src/main/resources/db/migration/V58__beta_agreement_and_demo_seed.sql"),
  "utf8",
);
const v59 = fs.readFileSync(
  path.join(base, "backend/src/main/resources/db/migration/V59__expand_beta_demo_seeds.sql"),
  "utf8",
);
const v60 = fs.readFileSync(
  path.join(base, "backend/src/main/resources/db/migration/V60__demo_seeds_english_us_market.sql"),
  "utf8",
);

const hdr = `-- =============================================================================
-- Beta DEMO seed data — idempotent SQL for Supabase SQL Editor (or psql)
-- =============================================================================
-- Purpose:
--   Applies the same data changes as Flyway V58 + V59 + V60 when you want parity without
--   waiting for a deploy, or to repair a partially failed migration.
--
-- Safe usage:
--   - Requires species rows from normal migrations (e.g. Brachypelma hamorii, …).
--   - partner_listings.availability/status MUST use IN_STOCK / ACTIVE etc.
--     (see migration V52 — matches JPA EnumType.STRING).
--   - marketplace_listings.status stays lowercase: active, sold, …
--   - activity_posts.visibility: only 'private' | 'public' (V44); seeds use 'public'.
--
-- NOT included (do not paste blindly):
--   - Full schema CREATE TABLE (use Flyway from the app).
--   - flyway_schema_history rows — let Flyway manage versions on Railway.
--
-- After running: redeploy so Flyway skips already-applied versions, or repair history.
-- =============================================================================

`;

const repair = `

-- -----------------------------------------------------------------------------
-- Optional repair: partner_listings written with lowercase enums (fails CHECK).
-- Run only if you see chk_partner_listings_* violations. Same logic as V52.
-- -----------------------------------------------------------------------------
/*
UPDATE partner_listings
SET availability = CASE lower(availability)
    WHEN 'in_stock' THEN 'IN_STOCK'
    WHEN 'out_of_stock' THEN 'OUT_OF_STOCK'
    ELSE 'UNKNOWN'
END
WHERE availability IS NOT NULL;

UPDATE partner_listings
SET status = CASE lower(status)
    WHEN 'active' THEN 'ACTIVE'
    WHEN 'stale' THEN 'STALE'
    ELSE 'HIDDEN'
END
WHERE status IS NOT NULL;
*/
`;

const out =
  hdr +
  "\n\n" +
  v58.trimEnd() +
  "\n\n" +
  v59.trimEnd() +
  "\n\n" +
  v60.trimEnd() +
  repair +
  "\n";

const dest = path.join(base, "docs/operations/supabase-beta-demo-data.sql");
fs.writeFileSync(dest, out, "utf8");
console.log("Wrote", dest, `(${out.length} chars)`);
