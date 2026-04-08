/** @type {import('next').NextConfig} */

const isElectronBuild = process.env.ELECTRON_BUILD === 'true';

const nextConfig = {
  // Static export for Electron packaging
  ...(isElectronBuild ? { output: 'export', trailingSlash: true } : {}),
  
  // Disable image optimization for static export (Electron uses local files)
  images: {
    unoptimized: true,
  },

  // Allow API calls to the embedded server in Electron mode
  async rewrites() {
    if (isElectronBuild) return [];
    return [];
  },
};

module.exports = nextConfig;
