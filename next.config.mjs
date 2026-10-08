/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@vercel/sandbox', '@vercel/blob', '@neondatabase/serverless', 'pdf-parse', 'pptxgenjs', 'puppeteer', 'google-auth-library'],
  // The run launcher copies the worker + pipeline sources into the sandbox at request time.
  outputFileTracingIncludes: {
    '/api/runs': ['./lib/**/*', './worker/**/*', './data/methodologies/*.md'],
    '/api/methodologies': ['./data/methodologies/*.md'],
  },
};
export default nextConfig;
