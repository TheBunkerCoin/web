import type { NextConfig } from "next";
 
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/',
        destination: '/transparency',
        permanent: true,
      },
    ]
  },
};
 
export default nextConfig;
 
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();