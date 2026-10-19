/** @type {import('tailwindcss').Config} */
export default {
  // constants.ts and the minimap reference Tailwind class names as plain strings, so scan every source folder.
  content: [
    './index.html',
    './*.{ts,tsx}',
    './{components,hooks,utils,services,state}/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
