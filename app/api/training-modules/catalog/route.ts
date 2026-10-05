import { NextResponse } from "next/server";
import { getUserFromAuthorizationHeader } from "@/lib/push-auth";
import {
  getModuleCatalog,
  GithubModulesError,
  isGithubModulesConfigured,
} from "@/lib/github-modules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getUserFromAuthorizationHeader(
    request.headers.get("authorization"),
  );
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGithubModulesConfigured()) {
    return NextResponse.json({ configured: false, modules: [] });
  }

  try {
    const modules = await getModuleCatalog();
    return NextResponse.json({ configured: true, modules });
  } catch (error) {
    console.error("Failed to load module catalog:", error);
    const status = error instanceof GithubModulesError ? error.status : 502;
    return NextResponse.json(
      { error: "Couldn't load the module library from GitHub." },
      { status },
    );
  }
}
