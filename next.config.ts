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
  suppressOnRouterTransitionStartWarning: true,
  webpack: {
    automaticVercelMonitors: false,
  },
});
