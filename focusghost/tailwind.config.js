/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0B1014',
          800: '#10171D',
          700: '#161F27',
          600: '#1E2A33',
          500: '#2A3742',
        },
        ghost: {
          teal: '#00D4D4',
          violet: '#A855F7',
          amber: '#F59E0B',
          coral: '#FF6B7A',
        },
      },
      fontFamily: {
        sans: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(0, 212, 212, 0.18)',
        'glow-amber': '0 0 24px rgba(245, 158, 11, 0.20)',
      },
      animation: {
        'ghost-float': 'ghostFloat 4s ease-in-out infinite',
      },
      keyframes: {
        ghostFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
