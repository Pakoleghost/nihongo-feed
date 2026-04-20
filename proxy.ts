import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware runs on every request (except static assets).
 * Its sole job: call supabase.auth.getUser() so that @supabase/ssr can
 * silently refresh an expiring token and write the fresh cookie back to
 * the browser — preventing the "logged out after 1 hour / on app close"
 * issue that happens when only localStorage is used.
 *
 * Route protection is still handled inside each page/component; this
 * middleware does NOT redirect — it only keeps the session alive.
 */
export async function middleware(request: NextRequest) {
  // Start with a pass-through response that carries the incoming request
  // headers (required so Server Components can read cookies).
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
          // Forward new/updated cookies to the outgoing request context …
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // … and to the response so the browser stores them.
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not add any logic between createServerClient and getUser().
  // getUser() triggers a silent token refresh when the access token is close
  // to expiry; the refreshed token is written via setAll() above.
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
