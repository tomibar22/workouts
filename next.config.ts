/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.exercisedb.io',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig