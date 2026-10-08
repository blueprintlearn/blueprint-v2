import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  sourcemaps: {
    disable: true,
  },
  silent: true,
  tunnelRoute: "/sentry-tunnel",
  suppressOnRouterTransitionStartWarning: true,
  webpack: {
    automaticVercelMonitors: false,
  },
});
