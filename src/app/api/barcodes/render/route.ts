import { NextResponse } from "next/server";

function pickBcid(symbology?: string | null) {
  const s = (symbology ?? "").trim().toLowerCase();
  // bwip-js bcid names: https://github.com/metafloor/bwip-js/wiki
  if (!s) return "code128";
  if (s === "code_128" || s === "code128") return "code128";
  if (s === "ean_13" || s === "ean13") return "ean13";
  if (s === "ean_8" || s === "ean8") return "ean8";
  if (s === "upc_a" || s === "upca") return "upca";
  if (s === "upc_e" || s === "upce") return "upce";
  if (s === "qr" || s === "qrcode" || s === "qr_code") return "qrcode";
  return "code128";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const value = searchParams.get("value")?.trim() ?? "";
  const symbology = searchParams.get("symbology");

  if (!value) {
    return NextResponse.json(
      { error: "Missing required query param: value" },
      { status: 400 },
    );
  }

  type BwipJs = {
    toSVG: (opts: Record<string, unknown>) => string;
  };

  try {
    const mod = (await import("bwip-js")) as unknown as { default?: BwipJs } & BwipJs;
    const bwipjs: BwipJs = mod.default ?? mod;

    const svg = bwipjs.toSVG({
      bcid: pickBcid(symbology),
      text: value,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: "center",
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "content-type": "image/svg+xml; charset=utf-8",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to render barcode";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
