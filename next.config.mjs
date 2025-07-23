/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**', // หรือเจาะจง path ที่ต้องการ
      },
    ],
  },
};

export default nextConfig;