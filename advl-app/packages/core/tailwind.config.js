/**
 * tailwind.config.js — Tailwind CSS configuration for @advl/core
 *
 * Scans all source files for Tailwind class usage.
 * No UI component library — Tailwind only per ADVL architecture spec.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@xyflow/react/dist/**/*.{js,mjs}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
