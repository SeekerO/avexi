import { NextRequest, NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";


type Mode = "image" | "text" | "hybrid";

// ─────────────────────────────────────────────
// HELPER: Render a PDF page to base64 PNG
// Uses pdf.js on the server via canvas
// ─────────────────────────────────────────────
async function renderPageToBase64(
  pdf: any,
  pageNum: number,
  dpi = 150,
): Promise<string> {
  const { createCanvas } = await import("canvas");
  const page = await pdf.getPage(pageNum);
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d") as any;

  await page.render({ canvasContext: context, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1]; // return base64 only
}

// ─────────────────────────────────────────────
// HELPER: Extract text lines from a PDF page
// Groups items by Y position → rows
// ─────────────────────────────────────────────
async function extractTextLines(pdf: any, pageNum: number): Promise<string[]> {
  const page = await pdf.getPage(pageNum);
  const content = await page.getTextContent();

  const rowMap = new Map<number, string[]>();
  content.items.forEach((item: any) => {
    const y = Math.round(item.transform[5]);
    if (!rowMap.has(y)) rowMap.set(y, []);
    rowMap.get(y)!.push(item.str);
  });

  return [...rowMap.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, cols]) => cols.join(" ").trim())
    .filter(Boolean);
}

// ─────────────────────────────────────────────
// HELPER: Parse page range spec e.g. "1-5,8,10"
// Returns array of 1-based page numbers
// ─────────────────────────────────────────────
function parsePageRange(spec: string, total: number): number[] {
  const pages: number[] = [];
  for (const part of spec.split(",")) {
    const trimmed = part.trim();
    if (trimmed.includes("-")) {
      const [a, b] = trimmed.split("-").map(Number);
      for (let i = a; i <= Math.min(b, total); i++) pages.push(i);
    } else {
      const n = parseInt(trimmed);
      if (n >= 1 && n <= total) pages.push(n);
    }
  }
  return [...new Set(pages)].sort((a, b) => a - b);
}

// ─────────────────────────────────────────────
// SLIDE BUILDERS
// ─────────────────────────────────────────────

function buildImageSlide(
  prs: PptxGenJS,
  slide: PptxGenJS.Slide,
  imgBase64: string,
) {
  slide.background = { color: "0A0A0A" };
  slide.addImage({
    data: `image/png;base64,${imgBase64}`,
    x: 0,
    y: 0,
    w: 13.33,
    h: 7.5,
    sizing: { type: "contain", w: 13.33, h: 7.5 },
  });
}

function buildTextSlide(
  prs: PptxGenJS,
  slide: PptxGenJS.Slide,
  lines: string[],
  pageNum: number,
  total: number,
) {
  slide.background = { color: "F8F9FB" };

  // Title bar
  slide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.55,
    fill: { color: "1E2761" },
    line: { type: "none" },
  });

  // Accent line
  slide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 0.55,
    w: 13.33,
    h: 0.04,
    fill: { color: "4A90D9" },
    line: { type: "none" },
  });

  slide.addText(`Page ${pageNum}  /  ${total}`, {
    x: 0.3,
    y: 0,
    w: 12,
    h: 0.55,
    fontSize: 12,
    bold: true,
    color: "FFFFFF",
    fontFace: "Calibri",
    margin: 0,
    valign: "middle",
  });

  if (lines.length === 0) {
    slide.addText("(No extractable text on this page)", {
      x: 0.35,
      y: 0.75,
      w: 12.63,
      h: 6.5,
      fontSize: 13,
      color: "999999",
      fontFace: "Calibri",
      italic: true,
      valign: "top",
    });
    return;
  }

  const textRuns = lines.map((line, i) => ({
    text: line,
    options: {
      fontSize: i === 0 ? 18 : 11,
      bold: i === 0,
      color: i === 0 ? "1E2761" : "1A1A2E",
      fontFace: "Calibri",
      breakLine: true,
      paraSpaceAfter: i === 0 ? 8 : 2,
    },
  }));

  slide.addText(textRuns, {
    x: 0.35,
    y: 0.75,
    w: 12.63,
    h: 6.5,
    valign: "top",
    wrap: true,
  });
}

function buildHybridSlide(
  prs: PptxGenJS,
  slide: PptxGenJS.Slide,
  imgBase64: string,
  lines: string[],
  pageNum: number,
  total: number,
) {
  slide.background = { color: "F8F9FB" };

  // Title bar
  slide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.33,
    h: 0.55,
    fill: { color: "1E2761" },
    line: { type: "none" },
  });

  // Accent line
  slide.addShape(prs.ShapeType.rect, {
    x: 0,
    y: 0.55,
    w: 13.33,
    h: 0.04,
    fill: { color: "4A90D9" },
    line: { type: "none" },
  });

  slide.addText(`Page ${pageNum}  /  ${total}`, {
    x: 0.3,
    y: 0,
    w: 12,
    h: 0.55,
    fontSize: 12,
    bold: true,
    color: "FFFFFF",
    fontFace: "Calibri",
    margin: 0,
    valign: "middle",
  });

  // Left: image panel
  slide.addShape(prs.ShapeType.rect, {
    x: 0.3,
    y: 0.72,
    w: 6.1,
    h: 6.55,
    fill: { color: "FFFFFF" },
    line: { color: "E2E8F0", width: 1 },
  });

  slide.addImage({
    data: `image/png;base64,${imgBase64}`,
    x: 0.3,
    y: 0.72,
    w: 6.1,
    h: 6.55,
    sizing: { type: "contain", w: 6.1, h: 6.55 },
  });

  // Vertical divider
  slide.addShape(prs.ShapeType.rect, {
    x: 6.6,
    y: 0.72,
    w: 0.05,
    h: 6.55,
    fill: { color: "4A90D9" },
    line: { type: "none" },
  });

  // Right: text
  if (lines.length === 0) {
    slide.addText("(No extractable text on this page)", {
      x: 6.85,
      y: 0.72,
      w: 6.18,
      h: 6.55,
      fontSize: 11,
      color: "999999",
      fontFace: "Calibri",
      italic: true,
      valign: "top",
    });
    return;
  }

  const textRuns = lines.map((line, i) => ({
    text: line,
    options: {
      fontSize: i === 0 ? 14 : 10,
      bold: i === 0,
      color: i === 0 ? "1E2761" : "1A1A2E",
      fontFace: "Calibri",
      breakLine: true,
      paraSpaceAfter: i === 0 ? 6 : 2,
    },
  }));

  slide.addText(textRuns, {
    x: 6.85,
    y: 0.72,
    w: 6.18,
    h: 6.55,
    valign: "top",
    wrap: true,
  });
}


export const maxDuration = 60; // seconds
export const runtime = "nodejs";

// ─────────────────────────────────────────────
// POST /api/pdf-to-pptx
// ─────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = ((formData.get("mode") as string) || "image") as Mode;
    const dpi = parseInt((formData.get("dpi") as string) || "150");
    const pagesSpec = formData.get("pages") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!["image", "text", "hybrid"].includes(mode)) {
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
    }

    // Load pdfjs server-side
const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = "";

    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdf = await pdfjs.getDocument({ data: uint8Array }).promise;
    const total = pdf.numPages;

    // Resolve page indices
    const pageNums =
      pagesSpec && pagesSpec.trim()
        ? parsePageRange(pagesSpec, total)
        : Array.from({ length: total }, (_, i) => i + 1);

    if (pageNums.length === 0) {
      return NextResponse.json(
        { error: "No valid pages in range" },
        { status: 400 },
      );
    }

    // Build presentation
    const prs = new PptxGenJS();
    prs.layout = "LAYOUT_WIDE"; // 13.33" × 7.5"

    for (const pageNum of pageNums) {
      const slide = prs.addSlide();

      const needsImage = mode === "image" || mode === "hybrid";
      const needsText = mode === "text" || mode === "hybrid";

      const imgBase64 = needsImage
        ? await renderPageToBase64(pdf, pageNum, dpi)
        : "";
      const lines = needsText ? await extractTextLines(pdf, pageNum) : [];

      if (mode === "image") {
        buildImageSlide(prs, slide, imgBase64);
      } else if (mode === "text") {
        buildTextSlide(prs, slide, lines, pageNum, total);
      } else {
        buildHybridSlide(prs, slide, imgBase64, lines, pageNum, total);
      }
    }

    const pptxBuffer = (await prs.write({
      outputType: "nodebuffer",
    })) as Buffer;
    const outputName = file.name.replace(/\.pdf$/i, ".pptx");

    return new Response(Buffer.from(pptxBuffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${outputName}"`,
      },
    });
  } catch (err: any) {
    console.error("[pdf-to-pptx] Error:", err);
    return NextResponse.json(
      { error: err.message || "Conversion failed" },
      { status: 500 },
    );
  }
}
