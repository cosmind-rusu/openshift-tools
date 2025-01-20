import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  env: {
    OPENSHIFT_API: process.env.OPENSHIFT_API,
    OPENSHIFT_TOKEN: process.env.OPENSHIFT_TOKEN,
  }
};

export default nextConfig;
