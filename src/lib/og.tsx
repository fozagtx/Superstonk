import { readFile } from "fs/promises";
import { join } from "path";

export const OG_COLORS = {
  bg: "#0C0D0F",
  surface: "#151618",
  border: "#2A2C30",
  text: "#F0F2F4",
  secondary: "#A7ABB1",
  overpriced: "#FA706A",
  discount: "#4ED589",
  fair: "#ACB1BB",
  accent: "#65A7FA",
  warning: "#E8C15A",
};

async function readFont(rel: string): Promise<ArrayBuffer | null> {
  try {
    const buf = await readFile(join(process.cwd(), "node_modules", rel));
    return buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength,
    ) as ArrayBuffer;
  } catch {
    return null;
  }
}

export function loadMonoFont(): Promise<ArrayBuffer | null> {
  return readFont(
    "@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff",
  );
}

export async function loadOgFonts() {
  const [sans, sansBold, mono] = await Promise.all([
    readFont("@fontsource/inter/files/inter-latin-400-normal.woff"),
    readFont("@fontsource/inter/files/inter-latin-700-normal.woff"),
    loadMonoFont(),
  ]);
  const fonts: {
    name: string;
    data: ArrayBuffer;
    weight: 400 | 700;
    style: "normal";
  }[] = [];
  if (sans) fonts.push({ name: "Inter", data: sans, weight: 400, style: "normal" });
  if (sansBold)
    fonts.push({ name: "Inter", data: sansBold, weight: 700, style: "normal" });
  if (mono)
    fonts.push({
      name: "JetBrains Mono",
      data: mono,
      weight: 400,
      style: "normal",
    });
  return fonts;
}

export async function imageToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const type = res.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export function verdictColor(v: string): string {
  if (v === "overpriced") return OG_COLORS.overpriced;
  if (v === "discount") return OG_COLORS.discount;
  return OG_COLORS.fair;
}
