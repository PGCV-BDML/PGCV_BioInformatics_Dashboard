import { NextResponse } from "next/server";
import { getTourContent, getTourVirusScene, getTourVirusStructure } from "@/lib/tour-content";

export const runtime = "nodejs";
export const revalidate = 300;

const CACHE = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";

/**
 * Public 3D model files for the Lab Tour's virus slide: `scene` is the
 * schematic virus as JSON shapes, `structure` the spike's PDB atom records.
 * Both are rebuilt from lib/tour-virus.ts's allowlist, not passed through.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const { content } = await getTourContent();

  if (file === "scene") {
    const shapes = await getTourVirusScene(content.virusModel);
    if (shapes) return NextResponse.json({ shapes }, { headers: { "Cache-Control": CACHE } });
  } else if (file === "structure") {
    const pdb = await getTourVirusStructure(content.virusModel);
    if (pdb) {
      return new NextResponse(pdb, {
        headers: {
          "Content-Type": "chemical/x-pdb; charset=utf-8",
          "Cache-Control": CACHE,
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
  }
  return new NextResponse("Not found", { status: 404 });
}
