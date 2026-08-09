/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['better-sqlite3'],
  // data/app.db is produced by `npm run seed` (prebuild) and opened at
  // runtime via a computed path, so file tracing cannot discover it —
  // include it in every serverless function bundle explicitly.
  outputFileTracingIncludes: {
    '/**': ['./data/app.db'],
  },
};

export default nextConfig;
