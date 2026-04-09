/** @type {import('next').NextConfig} */

const isElectronBuild = process.env.ELECTRON_BUILD === 'true';

const nextConfig = {
  // Static export for Electron packaging — disables all server-side features
  ...(isElectronBuild ? {
    output: 'export',
    trailingSlash: true,
  } : {}),

  // Disable image optimization (required for static export)
  images: {
    unoptimized: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  modularizeImports: {
    "lucide-react": {
      transform: "lucide-react/dist/esm/icons/{{kebabCase member}}",
    },
  },

  // Suppress Prisma usage warning in static build
  ...(isElectronBuild ? {
    experimental: {
      serverComponentsExternalPackages: [],
    }
  } : {}),

  // Development Proxy to 8765 Embedded Server
  ...(isElectronBuild ? {} : {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://127.0.0.1:8765/api/:path*'
        }
      ]
    }
  }),
};

module.exports = nextConfig;
