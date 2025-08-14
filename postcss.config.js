// postcss.config.js
module.exports = {
  plugins: {
    // Optional but nice: enables nested CSS the same way Tailwind expects
    'tailwindcss/nesting': {},
    // IMPORTANT: ensure Tailwind runs before Autoprefixer
    tailwindcss: { config: './tailwind.config.js' },
    autoprefixer: {},
  },
};