/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/gate",
        destination: "/login",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
