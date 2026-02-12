/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'rgba(17, 17, 27, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.05)'
        }
      },
      backdropBlur: {
        glass: '24px'
      },
      animation: {
        'pulse-recording': 'pulse-recording 1.5s ease-in-out infinite'
      },
      keyframes: {
        'pulse-recording': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(1.2)' }
        }
      }
    }
  },
  plugins: []
}
