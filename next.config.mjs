/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"]
};

export default nextConfig;
