/** @type {import('workbox-build').GenerateSWOptions} */
module.exports = {
  globDirectory: 'dist',
  globPatterns: ['**/*.{html,js,css,ico,png,svg,json,wav,woff2}'],
  swDest: 'dist/sw.js',
  clientsClaim: true,
  skipWaiting: true,
  cleanupOutdatedCaches: true,
  maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
};
