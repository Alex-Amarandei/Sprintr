/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // @react-pdf/renderer (fontkit + yoga wasm) must stay external to the bundler.
  serverExternalPackages: ["@react-pdf/renderer"],
  // Trace the invoice fonts into the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/orders/**": ["./src/lib/invoice/fonts/**"],
  },
};

export default nextConfig;
