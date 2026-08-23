import { authMiddleware } from "@clerk/nextjs/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default authMiddleware({
  publicRoutes: ["/", "/sign-in(.*)", "/sign-up(.*)", "/api(.*)", "/privacy(.*)", "/terms(.*)"],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  afterAuth(auth: any, req: any) {
    // If user is signed in and visits root, redirect to dashboard
    if (auth.userId && req.nextUrl.pathname === "/") {
      return Response.redirect(new URL("/dashboard", req.url));
    }
  },
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
