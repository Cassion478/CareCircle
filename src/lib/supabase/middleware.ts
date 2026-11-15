import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  // If Supabase is not yet configured, gracefully direct root to /login
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseUrl === "https://your-project.supabase.co" ||
    supabaseKey.includes("your-anon") ||
    supabaseKey.includes("your-publishable")
  ) {
    if (request.nextUrl.pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Refresh auth token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const protectedRoutes = [
    "/my-day",
    "/medications",
    "/appointments",
    "/care-circle",
    "/alerts",
    "/analytics",
    "/profile",
    "/caregiver",
  ];

  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  // Protect all patient routes - redirect to /login if unauthenticated
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect unauthenticated visitor from root `/` to `/login`
  if (!user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated user from root `/` to `/my-day`
  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/my-day";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated user away from login & register pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    const url = request.nextUrl.clone();
    url.pathname = "/my-day";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
