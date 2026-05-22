#!/usr/bin/env node
/**
 * Descarga fotos de referencia (adultas, en lo posible) desde iNaturalist
 * con licencias aptas para uso en catálogo comercial (CC0, CC-BY, CC-BY-SA).
 *
 * No descarga CC-BY-NC ni fotos sin licencia por defecto.
 *
 * Uso:
 *   node scripts/download-inat-catalog-photos.mjs
 *   node scripts/download-inat-catalog-photos.mjs --out ./mis-fotos
 *   node scripts/download-inat-catalog-photos.mjs --include-nc   # solo referencia interna
 *
 * Salida: imágenes + manifest.json + ATTRIBUTION.md
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INAT_BASE = "https://api.inaturalist.org/v1";
const USER_AGENT = "TarantulApp-catalog-script/1.0 (contact: ops@tarantulapp.com)";

/** Licencias que permiten uso comercial (con atribución / share-alike según aplique). */
const COMMERCIAL_LICENSES = new Set(["cc0", "cc-by", "cc-by-sa"]);

const DEFAULT_SPECIES_FILE = path.join(__dirname, "client-catalog-species.json");
const DEFAULT_OUT_DIR = path.join(__dirname, "output", "client-catalog-photos");

function parseArgs(argv) {
  const opts = {
    speciesFile: DEFAULT_SPECIES_FILE,
    outDir: DEFAULT_OUT_DIR,
    includeNc: false,
    perSpecies: 1,
    delayMs: 350,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--include-nc") opts.includeNc = true;
    else if (a === "--out" && argv[i + 1]) opts.outDir = path.resolve(argv[++i]);
    else if (a === "--species-file" && argv[i + 1]) {
      opts.speciesFile = path.resolve(argv[++i]);
    } else if (a === "--count" && argv[i + 1]) {
      opts.perSpecies = Math.max(1, parseInt(argv[++i], 10) || 1);
    } else if (a === "--help" || a === "-h") {
      console.log(`Uso: node scripts/download-inat-catalog-photos.mjs [opciones]

Opciones:
  --out <dir>           Carpeta de salida (default: scripts/output/client-catalog-photos)
  --species-file <json> Lista de especies (default: scripts/client-catalog-species.json)
  --count <n>           Fotos por especie (default: 1)
  --include-nc        Incluir CC-BY-NC si no hay otra (NO usar en catálogo comercial)
  --help                Esta ayuda
`);
      process.exit(0);
    }
  }
  return opts;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function slugify(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function licenseOk(code, includeNc) {
  if (!code) return false;
  const lic = code.toLowerCase();
  if (COMMERCIAL_LICENSES.has(lic)) return true;
  return includeNc && lic === "cc-by-nc";
}

function normalizeName(name) {
  return (name || "").trim().toLowerCase();
}

function taxonMatchesQuery(taxonName, acceptedNames) {
  const t = normalizeName(taxonName);
  if (!t) return false;
  const accepted = acceptedNames.map(normalizeName);
  if (accepted.includes(t)) return true;
  // "Phlogiellus sp. Moniqueverdezae" vs "Phlogiellus moniqueverdezae"
  return accepted.some((a) => {
    if (a.startsWith(t) || t.startsWith(a)) return true;
    const genusA = a.split(/\s+/)[0];
    const genusT = t.split(/\s+/)[0];
    return genusA === genusT && genusA.length > 3;
  });
}

function photoUrlLarge(url) {
  if (!url) return null;
  return url
    .replace("/square.", "/large.")
    .replace("/small.", "/large.")
    .replace("/medium.", "/large.");
}

async function inatGet(pathname, params = {}) {
  const url = new URL(INAT_BASE + pathname);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`iNaturalist ${res.status} ${url}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function resolveTaxon(scientificName) {
  const exact = await inatGet("/taxa", {
    q: scientificName,
    rank: "species",
    per_page: 8,
    order: "desc",
    order_by: "observations_count",
  });
  const wanted = scientificName.trim().toLowerCase();
  let taxon =
    exact.results?.find((t) => t.name?.trim().toLowerCase() === wanted) ?? null;
  if (!taxon && exact.results?.length) taxon = exact.results[0];

  if (!taxon) {
    const broad = await inatGet("/taxa", {
      q: scientificName,
      per_page: 8,
      order: "desc",
      order_by: "observations_count",
    });
    taxon =
      broad.results?.find((t) => t.name?.trim().toLowerCase() === wanted) ??
      broad.results?.[0] ??
      null;
  }
  return taxon;
}

function pickPhotoFromObservation(obs, includeNc) {
  if (!obs?.photos?.length) return null;
  const sorted = [...obs.photos].sort((a, b) => {
    const score = (p) => (licenseOk(p.license_code, includeNc) ? 10 : 0);
    return score(b) - score(a);
  });
  for (const photo of sorted) {
    if (!licenseOk(photo.license_code, includeNc)) continue;
    const url = photoUrlLarge(photo.url || photo.medium_url);
    if (!url) continue;
    return {
      url,
      licenseCode: photo.license_code,
      attribution: photo.attribution || buildAttribution(photo),
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
  if (!photo) return null;
  if (!licenseOk(photo.license_code, includeNc)) return null;
  const url = photoUrlLarge(photo.medium_url || photo.url);
  if (!url) return null;
  return {
    url,
    licenseCode: photo.license_code,
    attribution: photo.attribution || buildAttribution(photo),
    observationId: null,
    observationUrl: taxon.id
      ? `https://www.inaturalist.org/taxa/${taxon.id}`
      : null,
    taxonMatched: taxon.name,
    qualityGrade: "taxon_default",
    source: "taxon_default",
  };
}

function buildAttribution(photo) {
  const name = photo.attribution_name || photo.attribution || "iNaturalist contributor";
  const lic = photo.license_code ? ` (${photo.license_code})` : "";
  return `${name}${lic}`;
}

async function findBestPhoto(scientificNames, includeNc) {
  const tried = [];
  for (const name of scientificNames) {
    tried.push(name);
    const taxon = await resolveTaxon(name);
    if (!taxon) continue;
    if (!taxonMatchesQuery(taxon.name, scientificNames)) continue;

    const licenseFilter = includeNc
      ? "cc0,cc-by,cc-by-sa,cc-by-nc"
      : "cc0,cc-by,cc-by-sa";

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
        if (pick) {
          return {
            ...pick,
            scientificNameQueried: name,
            taxonId: taxon.id,
            taxonName: taxon.name,
          };
        }
      }
    }

    const taxonPick = pickPhotoFromTaxon(taxon, includeNc);
    if (taxonPick) {
      return {
        ...taxonPick,
        scientificNameQueried: name,
        taxonId: taxon.id,
        taxonName: taxon.name,
      };
    }
  }
  return {
    status: "not_found",
    triedNames: tried,
    message: includeNc
      ? "Sin foto con licencia conocida en iNaturalist."
      : "Sin foto CC0/CC-BY/CC-BY-SA en iNaturalist. Prueba --include-nc solo para referencia interna o busca otra fuente.",
  };
}

async function downloadImage(url, destPath) {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`Download ${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return { bytes: buf.length, contentType: res.headers.get("content-type") };
}

function buildAttributionMarkdown(entries) {
  const lines = [
    "# Atribución — fotos catálogo cliente",
    "",
    "Imágenes obtenidas desde [iNaturalist](https://www.inaturalist.org) con licencias abiertas.",
    "Para uso comercial del cliente, usar solo entradas con licencia **CC0**, **CC-BY** o **CC-BY-SA**",
    "(CC-BY-SA puede exigir compartir derivados bajo la misma licencia).",
    "",
    "| Especie | Archivo | Licencia | Atribución | Enlace |",
    "|---------|---------|----------|------------|--------|",
  ];
  for (const e of entries) {
    if (e.status !== "ok") {
      lines.push(
        `| ${e.commonName || e.id} | — | — | ${e.message || "No encontrada"} | — |`,
      );
      continue;
    }
    const link = e.observationUrl ? `[observación](${e.observationUrl})` : "—";
    lines.push(
      `| ${e.commonName} (${e.taxonName}) | \`${e.fileName}\` | ${e.licenseCode} | ${e.attribution} | ${link} |`,
    );
  }
  lines.push(
    "",
    "---",
    "",
    "**Importante:** Esto no sustituye revisión legal. Si la licencia es CC-BY-SA, el catálogo",
    "del cliente podría necesitar publicar derivados bajo la misma licencia.",
    "No uses entradas marcadas como `cc-by-nc` en material comercial.",
    "",
    `Generado: ${new Date().toISOString()}`,
  );
  return lines.join("\n");
}

async function main() {
  const opts = parseArgs(process.argv);
  const speciesList = JSON.parse(await fs.readFile(opts.speciesFile, "utf8"));
  await fs.mkdir(opts.outDir, { recursive: true });

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: "iNaturalist",
    commercialLicensesOnly: !opts.includeNc,
    outputDir: opts.outDir,
    species: [],
  };

  console.log(`Especies: ${speciesList.length}`);
  console.log(`Salida: ${opts.outDir}`);
  console.log(
    opts.includeNc
      ? "Modo: incluye CC-BY-NC (solo referencia, no catálogo comercial)"
      : "Modo: solo CC0 / CC-BY / CC-BY-SA",
  );
  console.log("");

  for (const entry of speciesList) {
    const names = entry.scientificNames || [entry.scientificName];
    if (!names?.length) {
      console.log(`⚠ ${entry.id}: sin scientificNames`);
      continue;
    }

    process.stdout.write(`→ ${entry.commonName || entry.id} … `);
    const result = await findBestPhoto(names, opts.includeNc);
    await sleep(opts.delayMs);

    if (result.status === "not_found") {
      console.log("sin foto apta");
      manifest.species.push({
        id: entry.id,
        commonName: entry.commonName,
        world: entry.world,
        status: "not_found",
        triedNames: result.triedNames,
        message: result.message,
        notes: entry.notes,
      });
      continue;
    }

    const ext = ".jpg";
    const baseName = entry.id || slugify(result.taxonName || names[0]);
    const fileName = `${baseName}${ext}`;
    const filePath = path.join(opts.outDir, fileName);

    try {
      const dl = await downloadImage(result.url, filePath);
      const record = {
        id: entry.id,
        commonName: entry.commonName,
        world: entry.world,
        status: "ok",
        fileName,
        filePath,
        bytes: dl.bytes,
        licenseCode: result.licenseCode,
        attribution: result.attribution,
        imageUrl: result.url,
        observationUrl: result.observationUrl,
        observationId: result.observationId,
        taxonName: result.taxonName,
        taxonId: result.taxonId,
        scientificNameQueried: result.scientificNameQueried,
        qualityGrade: result.qualityGrade,
        source: result.source,
        notes: entry.notes,
        commercialUseOk: COMMERCIAL_LICENSES.has(
          (result.licenseCode || "").toLowerCase(),
        ),
      };
      manifest.species.push(record);
      const flag = record.commercialUseOk ? "✓" : "⚠ NC/revisar";
      console.log(`${flag} ${fileName} (${result.licenseCode}, ${result.taxonName})`);
    } catch (err) {
      console.log(`error descarga: ${err.message}`);
      manifest.species.push({
        id: entry.id,
        commonName: entry.commonName,
        status: "download_error",
        message: err.message,
        ...result,
      });
    }
  }

  const manifestPath = path.join(opts.outDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

  const md = buildAttributionMarkdown(manifest.species);
  await fs.writeFile(path.join(opts.outDir, "ATTRIBUTION.md"), md, "utf8");

  const ok = manifest.species.filter((s) => s.status === "ok").length;
  const commercial = manifest.species.filter((s) => s.commercialUseOk).length;
  console.log("");
  console.log(`Listo: ${ok}/${speciesList.length} imágenes en ${opts.outDir}`);
  console.log(`Uso comercial directo (CC0/BY/SA): ${commercial}`);
  console.log(`manifest.json + ATTRIBUTION.md generados.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
