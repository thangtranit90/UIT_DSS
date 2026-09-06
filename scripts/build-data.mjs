// Precompute product data from the supplied CSV files.
// Ported from the reference utils/data_loader.py so the mapping stays faithful.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const readCsv = (f) =>
  Papa.parse(fs.readFileSync(path.join(ROOT, "data", f), "utf8"), {
    header: true,
    skipEmptyLines: true,
  }).data;

const num = (v, d = 0) => {
  const m = String(v ?? "").match(/\d+(?:[.,]\d+)?/);
  return m ? parseFloat(m[0].replace(",", ".")) : d;
};

// ---- Laptop mappings ----
const cpuScore = (v) => {
  const t = String(v).toLowerCase();
  for (const [k, s] of [["i7", 90], ["ryzen 7", 88], ["i5", 72], ["ryzen 5", 70], ["i3", 48], ["ryzen 3", 45], ["celeron", 22]])
    if (t.includes(k)) return s;
  return 35;
};
const gpuScore = (v) => {
  const t = String(v).toLowerCase();
  for (const [k, s] of [["rtx 4060", 100], ["rtx 4050", 88], ["rtx 3050", 70], ["gtx", 55], ["iris", 30], ["uhd", 18]])
    if (t.includes(k)) return s;
  return 12;
};

function loadLaptops() {
  return readCsv("laptop.csv")
    .map((r, i) => {
      const inch = num(r["Screen"], 15);
      const price = num(r["Final Price"], 0);
      if (!price) return null;
      return {
        id: `lp-${i}`,
        category: "laptop",
        product: r["Laptop"],
        brand: r["Brand"],
        price,
        criteria: {
          price,
          cpu: cpuScore(r["CPU"]),
          ram: num(r["RAM"]),
          gpu: gpuScore(r["GPU"]),
          storage: num(r["Storage"]),
          display: inch * 5 + 40,
          portability: Math.max(1, 3.2 + (inch - 15) * 0.35),
          battery: Math.max(40, 58 - (inch - 14) * 2),
        },
        raw: {
          cpu: r["CPU"] || "—",
          ram: `${num(r["RAM"])} GB`,
          gpu: r["GPU"] || "Tích hợp",
          storage: `${num(r["Storage"])} GB ${r["Storage type"] || "SSD"}`.trim(),
          screen: `${inch} inch`,
          touch: (r["Touch"] || "").toLowerCase() === "yes" ? "Có" : "Không",
          status: (r["Status"] || "").toLowerCase() === "new" ? "Mới" : r["Status"] || "—",
        },
      };
    })
    .filter(Boolean);
}

// ---- Phone mappings ----
const phonePerf = (v) => {
  const t = String(v).toLowerCase();
  for (const [k, s] of [["iphone 14", 95], ["phone (2)", 91], ["note 12 pro", 76], ["9 pro", 68], ["c55", 56], ["m23", 52], ["m4", 45], ["m13", 40], ["c31", 35], ["e32", 30]])
    if (t.includes(k)) return s;
  return 42;
};
const cameraScore = (v) => {
  const t = String(v).toLowerCase();
  for (const [k, s] of [["iphone 14", 95], ["phone (2)", 85], ["note 12 pro", 78], ["9 pro", 72], ["c55", 60], ["m23", 55], ["m4", 45], ["m13", 42]])
    if (t.includes(k)) return s;
  return 38;
};
const phoneDisplay = (v) => (/iphone 14|phone \(2\)/.test(String(v).toLowerCase()) ? 90 : 65);
const durability = (v) => (/iphone 14|phone \(2\)/.test(String(v).toLowerCase()) ? 3 : 1);

function loadPhones() {
  return readCsv("smartphone.csv")
    .map((r, i) => {
      const name = r["Smartphone"] || r["﻿Smartphone"];
      const ram = num(r["RAM"]);
      const storage = num(r["Storage"]);
      const price = num(r["Final Price"], 0);
      if (!name || !price) return null;
      return {
        id: `ph-${i}`,
        category: "phone",
        product: name,
        brand: r["Brand"],
        price,
        criteria: {
          price,
          performance: phonePerf(name),
          storageRam: ram * 4 + storage,
          camera: cameraScore(name),
          display: phoneDisplay(name),
          battery: 45 + ram * 2,
          durability: durability(name),
        },
        raw: {
          brand: r["Brand"] || "—",
          model: r["Model"] || "—",
          ram: `${ram} GB`,
          storage: `${storage} GB`,
          color: r["Color"] || "—",
          free: (r["Free"] || "").toLowerCase() === "yes" ? "Có (máy trần)" : "Không",
        },
      };
    })
    .filter(Boolean);
}

const data = { laptop: loadLaptops(), phone: loadPhones() };
const outDir = path.join(ROOT, "lib");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "products.generated.json"), JSON.stringify(data));
console.log(`build-data: ${data.laptop.length} laptops, ${data.phone.length} phones -> lib/products.generated.json`);
