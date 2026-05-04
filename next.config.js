/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: {
    domains: ['vijeta-api.onrender.com'],
    unoptimized: true
  },
  env: {
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/vijeta_db',
    MONGODB_DB: process.env.MONGODB_DB || 'vijeta_db'
  }
}
