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
};

module.exports = nextConfig;
