/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Strict checks enabled
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
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
    ],
  },

  // Security headers - allow YouTube embeds
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://www.google.com https://*.googleusercontent.com",
              "font-src 'self' data:",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com",
              "connect-src 'self' https://*.googleapis.com https://*.google.com",
              "media-src 'self' https://www.youtube.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
