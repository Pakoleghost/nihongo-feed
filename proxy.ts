import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth", "/pending"];

const LEGACY_STUDENT_REDIRECTS: Array<[string, string]> = [
  ["/kana", "/dashboard/hiragana"],
  ["/practicar", "/dashboard/practica"],
  ["/progreso", "/dashboard/progreso"],
  ["/study", "/dashboard"],
  ["/perfil", "/dashboard/perfil"],
  ["/profile", "/dashboard/perfil"],
];

function getLegacyStudentRedirect(pathname: string) {
  for (const [legacyPath, dashboardPath] of LEGACY_STUDENT_REDIRECTS) {
    if (pathname === legacyPath) return dashboardPath;
    if (pathname.startsWith(`${legacyPath}/`)) {
      if (legacyPath === "/perfil" || legacyPath === "/profile") {
        const suffix = pathname.slice(legacyPath.length);
        if (suffix === "/edit") return dashboardPath;
        return `${dashboardPath}${suffix}`;
      }
      return dashboardPath;
    }
  }

  return null;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const legacyRedirect = getLegacyStudentRedirect(pathname);
  if (legacyRedirect) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyRedirect;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_approved,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const canEnterStudentApp =
    profile?.is_admin === true || profile?.is_approved === true;

  if (!canEnterStudentApp) {
    const pendingUrl = request.nextUrl.clone();
    pendingUrl.pathname = "/pending";
    pendingUrl.search = "";
    return NextResponse.redirect(pendingUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|sw\\.js|offline\\.html).*)",
  ],
};
