import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) redirect lands here with a `code`. Exchange it for a session
// (sets the auth cookies via @supabase/ssr), then route by role.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  // Log the real reason server-side (PKCE mismatch / expired code / provider error / config) for
  // debugging, but send the USER back with a clean, generic flag — no raw internals in the URL.
  const fail = (detail: string) => {
    console.error("[auth/callback] failed:", detail);
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  };

  // Provider-side error (user denied / misconfig) comes back without a code.
  const providerError = searchParams.get("error_description") || searchParams.get("error");
  if (providerError) return fail(providerError);
  if (!code) return fail("no_code");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return fail(error.message);

  // Destination: explicit ?next wins; otherwise pick by the user's role.
  let dest = explicitNext && explicitNext.startsWith("/") ? explicitNext : "";
  if (!dest) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user?.id ?? "")
      .maybeSingle();
    dest = profile?.role === "shop" ? "/dashboard" : "/browse";
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocal = process.env.NODE_ENV === "development";
  if (isLocal) return NextResponse.redirect(`${origin}${dest}`);
  if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${dest}`);
  return NextResponse.redirect(`${origin}${dest}`);
}
