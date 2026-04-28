import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/auth/confirm",
  "/api/auto-login",
];

const ROLE_ROUTES: Record<string, string> = {
  "/staff": "staff",
  "/supervisor": "supervisor",
  "/manager": "manager",
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session — must call getUser() for token verification
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Allow public paths
  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Redirect unauthenticated users.
  // For role routes (/staff, /supervisor, /manager), auto-login as that role
  // so demo dashboards are directly accessible without a manual sign-in.
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();

    for (const [routePrefix, role] of Object.entries(ROLE_ROUTES)) {
      if (
        pathname === routePrefix ||
        pathname.startsWith(routePrefix + "/")
      ) {
        url.pathname = "/api/auto-login";
        url.searchParams.set("role", role);
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }

    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from /login
  if (user && pathname === "/login") {
    // Fetch user role from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role || "staff";
    const url = request.nextUrl.clone();
    url.pathname = `/${role}/dashboard`;
    return NextResponse.redirect(url);
  }

  // Role-based route protection
  if (user) {
    for (const [routePrefix, requiredRole] of Object.entries(ROLE_ROUTES)) {
      if (
        pathname === routePrefix ||
        pathname.startsWith(routePrefix + "/")
      ) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const userRole = profile?.role || "staff";

        if (userRole !== requiredRole) {
          // Auto-switch to the requested role so the URL "just works".
          const url = request.nextUrl.clone();
          url.pathname = "/api/auto-login";
          url.search = "";
          url.searchParams.set("role", requiredRole);
          url.searchParams.set("next", pathname);
          return NextResponse.redirect(url);
        }
        break;
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public assets (images, svg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
