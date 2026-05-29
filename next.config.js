/** @type {import('next').NextConfig} */
const nextConfig = {
  // PERFORMANCE FIX: reactStrictMode: true causes every component to render
  // TWICE in development (intentional by React to detect side effects).
  // This makes the app feel much slower than CRA. Disable it.
  reactStrictMode: false,

  // Reduce bundle size — don't include all locales
  i18n: undefined,

  // Compiler optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Faster image handling
  images: {
    unoptimized: true,
  },

  // Experimental performance optimizations
  experimental: {
    // Optimize package imports for common libraries
    optimizePackageImports: ["lucide-react", "firebase/app", "firebase/firestore"],
  },

  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  // Webpack optimizations
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Split chunks more aggressively for better caching
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          firebase: {
            name: "firebase",
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            priority: 20,
            reuseExistingChunk: true,
          },
          vendor: {
            name: "vendor",
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }
    return config;
  },
};

module.exports = nextConfig;
