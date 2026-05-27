import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth", "/pending", "/pick-username"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes through
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and static files
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // IMPORTANT: supabaseResponse must be returned as-is to forward refreshed
  // session cookies to the browser. Never create a new response after this
  // point — clone or mutate supabaseResponse instead.
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Apply cookies to the request so they're visible to downstream handlers
          // (request.cookies.set only accepts name+value, options go on the response)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Rebuild the response so the refreshed cookies are sent to the browser
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getUser() — NOT getSession(). getUser() validates the JWT with the
  // Supabase server and automatically triggers a token refresh when needed.
  // getSession() only reads from cookies and can silently return a stale/expired
  // session, which is why users were being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Must return supabaseResponse (not a new NextResponse) so that any
  // refreshed session cookies set by setAll() are forwarded to the browser.
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, manifest, icons, sw.js (PWA assets)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|sw\\.js|offline\\.html).*)",
  ],
};
