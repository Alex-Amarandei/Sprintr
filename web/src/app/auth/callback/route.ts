import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth (Google) redirect lands here with a `code`. Exchange it for a session
// (sets the auth cookies via @supabase/ssr), then route by role.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitNext = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
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
      if (forwardedHost)
        return NextResponse.redirect(`https://${forwardedHost}${dest}`);
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
