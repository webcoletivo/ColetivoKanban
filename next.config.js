/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Strict checks enabled

  // Allow large uploads
  experimental: {
    serverActions: {
      bodySizeLimit: '300mb',
    },
  },
  // Allow external images from YouTube thumbnails
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/vi/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        pathname: '/s2/favicons**',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },

  // Security headers - allow YouTube embeds

}

module.exports = nextConfig
