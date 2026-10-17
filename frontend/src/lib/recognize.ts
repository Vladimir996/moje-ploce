// Prepoznavanje ploče sa fotografije — sve se izvršava u browseru, besplatno:
// barkod (zxing-wasm) i tekst sa etikete/omota (Tesseract OCR).
// Biblioteke se učitavaju tek kad se prvi put slika, da ne usporavaju formu.

import type { Worker } from "tesseract.js";

export type PhotoReading = {
  barcode: string | null;
  /** Sav pročitan tekst (za traženje kataloškog broja) */
  text: string;
  /** Riječi u koje je OCR siguran, od najkrupnijih ka sitnijim (naslov i izvođač su obično najkrupniji) */
  words: string[];
};

export type Progress = { step: "barcode" | "ocr-load" | "ocr"; percent?: number };

const MAX_SIDE = 2000;
const MIN_OCR_SIDE = 1400;

let workerPromise: Promise<Worker> | null = null;
let onOcrProgress: ((percent: number) => void) | null = null;

export async function readPhoto(file: File, onProgress: (p: Progress) => void): Promise<PhotoReading> {
  const bitmap = await createImageBitmap(file);

  onProgress({ step: "barcode" });
  const barcode = await readBarcode(drawScaled(bitmap, MAX_SIDE));
  if (barcode) return { barcode, text: "", words: [] };

  onProgress({ step: "ocr-load" });
  const worker = await getWorker();
  onOcrProgress = (percent) => onProgress({ step: "ocr", percent });

  const canvas = preprocessForOcr(bitmap);
  const { PSM } = await import("tesseract.js");
  const texts: string[] = [];
  const words: { text: string; conf: number; height: number }[] = [];

  // Dva prolaza: automatski raspored (redovi naslova) + "razbacan tekst" (sitni natpisi, kataloški broj)
  for (const psm of [PSM.AUTO, PSM.SPARSE_TEXT]) {
    await worker.setParameters({ tessedit_pageseg_mode: psm });
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
    texts.push(data.text);
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          for (const word of line.words) {
            words.push({ text: word.text, conf: word.confidence, height: word.bbox.y1 - word.bbox.y0 });
          }
        }
      }
    }
  }
  onOcrProgress = null;

  return { barcode: null, text: texts.join("\n"), words: rankWords(words) };
}

function rankWords(words: { text: string; conf: number; height: number }[]): string[] {
  const best = new Map<string, { text: string; height: number }>();
  for (const w of words) {
    const text = w.text.replace(/^[^\p{L}\d]+|[^\p{L}\d]+$/gu, ""); // skini interpunkciju sa krajeva
    if (w.conf < 60 || !/^[\p{L}]{3,}$/u.test(text)) continue;
    const key = text.toLowerCase();
    const existing = best.get(key);
    if (!existing || existing.height < w.height) best.set(key, { text, height: w.height });
  }
  return [...best.values()].sort((a, b) => b.height - a.height).map((w) => w.text);
}

async function readBarcode(canvas: HTMLCanvasElement): Promise<string | null> {
  const { readBarcodes, prepareZXingModule } = await import("zxing-wasm/reader");
  // wasm se servira sa našeg sajta (public/zxing_reader.wasm), ne sa CDN-a
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) => (path.endsWith(".wasm") ? "/zxing_reader.wasm" : prefix + path),
    },
  });

  const ctx = canvas.getContext("2d")!;
  const results = await readBarcodes(ctx.getImageData(0, 0, canvas.width, canvas.height), {
    formats: ["EANUPC"],
    tryHarder: true,
    tryRotate: true,
    maxNumberOfSymbols: 1,
  });
  return results.find((r) => r.isValid)?.text ?? null;
}

function getWorker(): Promise<Worker> {
  workerPromise ??= import("tesseract.js").then(({ createWorker }) =>
    // Srpska latinica + ćirilica + engleski. Jezički podaci (~10 MB) se skidaju
    // samo prvi put, browser ih zatim čuva.
    createWorker(["srp_latn", "srp", "eng"], undefined, {
      logger: (m) => {
        if (m.status === "recognizing text") onOcrProgress?.(Math.round(m.progress * 100));
      },
    }),
  );
  workerPromise.catch(() => (workerPromise = null));
  return workerPromise;
}

function drawScaled(bitmap: ImageBitmap, maxSide: number, minSide = 0): HTMLCanvasElement {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > maxSide ? maxSide / longest : longest < minSide ? minSide / longest : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

// Sivo + razvlačenje kontrasta: OCR mnogo bolje čita tekst preko fotografija na etiketi
function preprocessForOcr(bitmap: ImageBitmap): HTMLCanvasElement {
  const canvas = drawScaled(bitmap, MAX_SIDE, MIN_OCR_SIDE);
  const ctx = canvas.getContext("2d")!;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = image.data;

  const gray = new Uint8ClampedArray(px.length / 4);
  const histogram = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    const g = Math.round(0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]);
    gray[i] = g;
    histogram[g]++;
  }

  // Granice na 1% i 99% piksela, da pojedinačni odsjaji ne pokvare razvlačenje
  const cut = gray.length * 0.01;
  let low = 0;
  let high = 255;
  for (let sum = 0; low < 255 && sum + histogram[low] < cut; low++) sum += histogram[low];
  for (let sum = 0; high > 0 && sum + histogram[high] < cut; high--) sum += histogram[high];
  const range = Math.max(1, high - low);

  for (let i = 0; i < gray.length; i++) {
    const v = ((gray[i] - low) * 255) / range;
    px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
