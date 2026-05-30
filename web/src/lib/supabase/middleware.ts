import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Supabase not configured yet — skip auth so the app is browsable during dev.
  // Guards against missing vars AND the placeholder values in .env.local.example.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || !url.startsWith("http")) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getClaims() verifies the access token LOCALLY when the project uses asymmetric JWT
  // signing keys (JWKS cached in-process) → no network round-trip per navigation. On legacy
  // HS256 it falls back to a network check (same cost as getUser), and it still refreshes an
  // expired session via the refresh token. We only need "is there a valid user" for the guard.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  const { pathname } = request.nextUrl;

  // Browsing shops is public (login only at checkout/chat). Guard the rest.
  const protectedRoutes = ["/order", "/orders", "/dashboard", "/courier"];
  const authRoutes = ["/login", "/register"];
  // Segment-precise match: "/order" guards "/order" and "/order/123" but NOT "/order-demo".
  const matches = (r: string) => pathname === r || pathname.startsWith(r + "/");
  const isProtected = protectedRoutes.some(matches);
  const isAuthRoute = authRoutes.some(matches);

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user) {
    // Send to "/" — the home page redirects by role (shop → /dashboard, else /browse).
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
