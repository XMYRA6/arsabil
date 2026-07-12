import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: "/login",
    },
});

export const config = {
    matcher: [
        /*
         * Match all protected routes.
         * Add any other routes you want to restrict to authenticated users.
         */
        "/admin", "/admin/:path*",
        "/dashboard", "/dashboard/:path*",
        "/inbox", "/inbox/:path*",
        "/listing", "/listing/:path*",
        "/marketplace", "/marketplace/:path*",
        "/api/admin/:path*",
        "/api/messages/:path*",
        "/api/offers/:path*",
        "/api/projects/:path*",
        "/api/reports/:path*",
        "/api/user/:path*",
    ],
};
