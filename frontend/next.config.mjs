/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: 'new.menu-rest.com' },
      // MinIO S3 storage
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      { protocol: 'http', hostname: 'minio', port: '9000' },
      { protocol: 'https', hostname: '*.menu-rest.com' },
      // External photo sources
      { protocol: 'https', hostname: 'img.restoclub.ru' },
      { protocol: 'https', hostname: 'i2.photo.2gis.com' },
      { protocol: 'https', hostname: 'cdn1.flamp.ru' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
