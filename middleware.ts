import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/confirm"];

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

  // Redirect unauthenticated users to /login
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
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
          // Redirect to the user's correct dashboard
          const url = request.nextUrl.clone();
          url.pathname = `/${userRole}/dashboard`;
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
