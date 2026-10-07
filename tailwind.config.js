/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0B1B33', 2: '#13284A', 3: '#1C3760', line: '#24426F' },
        canvas: '#F2F5F9',
        line: '#D7DEE8',
        trace: { DEFAULT: '#12B5D8', dark: '#0B8FAD', soft: '#E3F7FB' },
        signal: { DEFAULT: '#1FAE6E', dark: '#178A57', soft: '#E4F6EC' },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
        bn: ['"Hind Siliguri"', '"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 1px 0 rgba(11,27,51,0.04), 0 1px 3px rgba(11,27,51,0.06)',
        lift: '0 12px 32px -12px rgba(11,27,51,0.35)',
      },
      keyframes: {
        'node-pulse': { '0%,100%': { boxShadow: '0 0 0 0 rgba(18,181,216,0.55)' }, '50%': { boxShadow: '0 0 0 5px rgba(18,181,216,0)' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: { 'node-pulse': 'node-pulse 2.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
