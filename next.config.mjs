/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'source.unsplash.com' },
      { protocol: 'https', hostname: '*.s3.amazonaws.com' },
      { protocol: 'https', hostname: 'media.giphy.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@aws-sdk/client-dynamodb',
      '@aws-sdk/lib-dynamodb',
      '@aws-sdk/client-secrets-manager',
      '@aws-sdk/client-ses',
      '@aws-sdk/client-bedrock-runtime',
      'stripe',
    ],
    instrumentationHook: true,
  },
};

export default nextConfig;
