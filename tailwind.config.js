/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: '#7A8B69',
        terracotta: '#E07A5F',
        beige: '#F2E9D8',
        lavender: '#9381FF',
        brown: '#C68B59',
        darkBrown: '#6D534B',
        offWhite: '#F9F5F0',
        charcoal: '#3A3A3A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.05)',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      }
    },
  },
  plugins: [],
}