#!/usr/bin/env node
/**
 * Descarga fotos de referencia desde iNaturalist (CC0 / CC-BY / CC-BY-SA).
 * Uso: node scripts/download-inat-catalog-photos.mjs
 *      node scripts/download-inat-catalog-photos.mjs --include-nc
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INAT_BASE = "https://api.inaturalist.org/v1";
const USER_AGENT = "TarantulApp-catalog-script/1.0";
const COMMERCIAL_LICENSES = new Set(["cc0", "cc-by", "cc-by-sa"]);
const DEFAULT_SPECIES_FILE = path.join(__dirname, "client-catalog-species.json");
const DEFAULT_OUT_DIR = path.join(__dirname, "output", "client-catalog-photos");

function parseArgs(argv) {
  const opts = { speciesFile: DEFAULT_SPECIES_FILE, outDir: DEFAULT_OUT_DIR, includeNc: false, delayMs: 350 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--include-nc") opts.includeNc = true;
    else if (a === "--out" && argv[i + 1]) opts.outDir = path.resolve(argv[++i]);
    else if (a === "--species-file" && argv[i + 1]) opts.speciesFile = path.resolve(argv[++i]);
    else if (a === "--help" || a === "-h") {
      console.log("node scripts/download-inat-catalog-photos.mjs [--out dir] [--include-nc]");
      process.exit(0);
    }
  }
  return opts;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slugify = (s) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function licenseOk(code, includeNc) {
  if (!code) return false;
  const lic = code.toLowerCase();
  return COMMERCIAL_LICENSES.has(lic) || (includeNc && lic === "cc-by-nc");
}

function normalizeName(name) {
  return (name || "").trim().toLowerCase();
}

function taxonMatchesQuery(taxonName, acceptedNames) {
  const t = normalizeName(taxonName);
  const accepted = acceptedNames.map(normalizeName);
  if (accepted.includes(t)) return true;
  return accepted.some((a) => {
    if (a.startsWith(t) || t.startsWith(a)) return true;
    return a.split(/\s+/)[0] === t.split(/\s+/)[0] && a.split(/\s+/)[0].length > 3;
  });
}

function photoUrlLarge(url) {
  return url?.replace("/square.", "/large.").replace("/small.", "/large.").replace("/medium.", "/large.") || null;
}

async function inatGet(pathname, params = {}) {
  const url = new URL(INAT_BASE + pathname);
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!res.ok) throw new Error(`iNaturalist ${res.status} ${url}`);
  return res.json();
}

async function resolveTaxon(scientificName) {
  for (const rank of ["species", null]) {
    const params = { q: scientificName, per_page: 8, order: "desc", order_by: "observations_count" };
    if (rank) params.rank = rank;
    const data = await inatGet("/taxa", params);
    const wanted = normalizeName(scientificName);
    const taxon = data.results?.find((t) => normalizeName(t.name) === wanted) ?? data.results?.[0];
    if (taxon) return taxon;
  }
  return null;
}

function buildAttribution(photo) {
  const name = photo.attribution_name || photo.attribution || "iNaturalist contributor";
  return photo.attribution || `${name}${photo.license_code ? ` (${photo.license_code})` : ""}`;
}

function pickPhotoFromObservation(obs, includeNc) {
  for (const photo of obs.photos || []) {
    if (!licenseOk(photo.license_code, includeNc)) continue;
    const url = photoUrlLarge(photo.url);
    if (!url) continue;
    return {
      url,
      licenseCode: photo.license_code,
      attribution: buildAttribution(photo),
      observationId: obs.id,
      observationUrl: `https://www.inaturalist.org/observations/${obs.id}`,
      taxonMatched: obs.taxon?.name,
      qualityGrade: obs.quality_grade,
      source: "observation",
    };
  }
  return null;
}

function pickPhotoFromTaxon(taxon, includeNc) {
  const photo = taxon?.default_photo;
  if (!photo || !licenseOk(photo.license_code, includeNc)) return null;
  const url = photoUrlLarge(photo.medium_url || photo.url);
  if (!url) return null;
  return {
    url,
    licenseCode: photo.license_code,
    attribution: buildAttribution(photo),
    observationId: null,
    observationUrl: taxon.id ? `https://www.inaturalist.org/taxa/${taxon.id}` : null,
    taxonMatched: taxon.name,
    qualityGrade: "taxon_default",
    source: "taxon_default",
  };
}

async function findBestPhoto(scientificNames, includeNc) {
  const tried = [];
  for (const name of scientificNames) {
    tried.push(name);
    const taxon = await resolveTaxon(name);
    if (!taxon || !taxonMatchesQuery(taxon.name, scientificNames)) continue;
    const licenseFilter = includeNc ? "cc0,cc-by,cc-by-sa,cc-by-nc" : "cc0,cc-by,cc-by-sa";
    for (const quality of ["research", "needs_id"]) {
      const obsData = await inatGet("/observations", {
        taxon_id: taxon.id,
        iconic_taxa: "Arachnida",
        photos: true,
        photo_license: licenseFilter,
        quality_grade: quality,
        order: "desc",
        order_by: "votes",
        per_page: 30,
      });
      for (const obs of obsData.results || []) {
        if (!taxonMatchesQuery(obs.taxon?.name, scientificNames)) continue;
        const pick = pickPhotoFromObservation(obs, includeNc);
        if (pick) return { ...pick, scientificNameQueried: name, taxonId: taxon.id, taxonName: taxon.name };
      }
    }
    const taxonPick = pickPhotoFromTaxon(taxon, includeNc);
    if (taxonPick) return { ...taxonPick, scientificNameQueried: name, taxonId: taxon.id, taxonName: taxon.name };
  }
  return {
    status: "not_found",
    triedNames: tried,
    message: includeNc
      ? "Sin foto con licencia en iNaturalist."
      : "Sin foto CC0/CC-BY/CC-BY-SA. Usa --include-nc solo como referencia o baja manual.",
  };
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return buf.length;
}

function buildAttributionMarkdown(entries) {
  const lines = [
    "# Atribución — fotos catálogo cliente",
    "",
    "| Especie | Archivo | Licencia | Atribución | Enlace |",
    "|---------|---------|----------|------------|--------|",
  ];
  for (const e of entries) {
    if (e.status !== "ok") {
      lines.push(`| ${e.commonName || e.id} | — | — | ${e.message || "No encontrada"} | — |`);
      continue;
    }
    const link = e.observationUrl ? `[link](${e.observationUrl})` : "—";
    lines.push(`| ${e.commonName} | \`${e.fileName}\` | ${e.licenseCode} | ${e.attribution} | ${link} |`);
  }
  lines.push("", `Generado: ${new Date().toISOString()}`);
  return lines.join("\n");
}

async function main() {
  const opts = parseArgs(process.argv);
  const speciesList = JSON.parse(await fs.readFile(opts.speciesFile, "utf8"));
  await fs.mkdir(opts.outDir, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    commercialLicensesOnly: !opts.includeNc,
    outputDir: opts.outDir,
    species: [],
  };

  console.log(`Salida: ${opts.outDir}\n`);

  for (const entry of speciesList) {
    const names = entry.scientificNames || [];
    process.stdout.write(`→ ${entry.commonName || entry.id} … `);
    const result = await findBestPhoto(names, opts.includeNc);
    await sleep(opts.delayMs);

    if (result.status === "not_found") {
      console.log("sin foto");
      manifest.species.push({ id: entry.id, commonName: entry.commonName, status: "not_found", ...result });
      continue;
    }

    const fileName = `${entry.id || slugify(result.taxonName)}.jpg`;
    const filePath = path.join(opts.outDir, fileName);
    try {
      const bytes = await downloadImage(result.url, filePath);
      const commercialUseOk = COMMERCIAL_LICENSES.has((result.licenseCode || "").toLowerCase());
      manifest.species.push({
        id: entry.id,
        commonName: entry.commonName,
        status: "ok",
        fileName,
        bytes,
        commercialUseOk,
        ...result,
      });
      console.log(commercialUseOk ? `✓ ${fileName}` : `⚠ NC ${fileName}`);
    } catch (err) {
      console.log(`error: ${err.message}`);
      manifest.species.push({ id: entry.id, status: "download_error", message: err.message });
    }
  }

  await fs.writeFile(path.join(opts.outDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  await fs.writeFile(path.join(opts.outDir, "ATTRIBUTION.md"), buildAttributionMarkdown(manifest.species));
  const ok = manifest.species.filter((s) => s.status === "ok").length;
  const commercial = manifest.species.filter((s) => s.commercialUseOk).length;
  console.log(`\nListo: ${ok} imágenes (${commercial} aptas catálogo comercial)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
