// Export the real Express app: Vercel recognizes its listen method and skips
// Node request helpers, leaving JSON/multipart streams to Express and Multer.
export { default } from '../server/server.js';
