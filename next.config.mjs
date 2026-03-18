/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "locafy.com",
      },
    ],
  },
};

export default nextConfig;
