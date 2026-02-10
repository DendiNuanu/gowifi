import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: 'http://127.0.0.1:8080/auth/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8080/api/:path*',
      },
      {
        source: '/img/:path*',
        destination: 'http://127.0.0.1:8080/img/:path*',
      },
    ]
  },
}

export default nextConfig
