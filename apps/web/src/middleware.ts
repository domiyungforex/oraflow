import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes that don't require authentication
const publicRoutes = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api(.*)",
  "/privacy(.*)",
  "/terms(.*)",
]);

// Define routes that require onboarding
const onboardingRoutes = createRouteMatcher([
  "/onboarding(.*)",
]);

// Define dashboard routes that require authentication
const dashboardRoutes = createRouteMatcher([
  "/dashboard(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes
  if (publicRoutes(req)) {
    return;
  }

  // Redirect to sign-in if not authenticated
  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return Response.redirect(signInUrl);
  }

  // If user is signed in and visits root, redirect to dashboard
  if (userId && req.nextUrl.pathname === "/") {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  // Check if user needs onboarding
  // This would be checked against your database
  // For now, we'll skip this check and let the dashboard handle it
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
