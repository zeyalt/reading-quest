import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // URL moves from the 2026-05-28 restructure. Permanent redirects so any
  // bookmarks / cached SW navigations still land somewhere sane.
  async redirects() {
    return [
      { source: '/schedule', destination: '/diary', permanent: true },
      { source: '/schedule/plan', destination: '/diary/plan', permanent: true },
      { source: '/progress', destination: '/', permanent: true },
    ]
  },
}

export default nextConfig
