/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Sovereign Dark
        sovereign: {
          950: '#020408',
          900: '#050d18',
          800: '#0a1628',
          700: '#0f2040',
          600: '#162b55',
        },
        // ZK Violet — proof & encryption accents
        zk: {
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
        },
        // Intent Cyan — ERC-7683 / gateway accents
        intent: {
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        // Settlement Emerald — successful settlement
        settle: {
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
        },
        // Danger Rose
        danger: {
          400: '#fb7185',
          500: '#f43f5e',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'mesh-gradient': `
          radial-gradient(at 27% 37%, hsla(255, 70%, 12%, 1) 0px, transparent 50%),
          radial-gradient(at 97% 21%, hsla(205, 70%, 8%, 1) 0px, transparent 50%),
          radial-gradient(at 52% 99%, hsla(270, 60%, 10%, 1) 0px, transparent 50%),
          radial-gradient(at 10% 29%, hsla(256, 65%, 15%, 1) 0px, transparent 50%),
          radial-gradient(at 97% 96%, hsla(200, 70%, 6%, 1) 0px, transparent 50%),
          radial-gradient(at 33% 50%, hsla(222, 70%, 8%, 1) 0px, transparent 50%)
        `,
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        scan: 'scan 4s linear infinite',
        float: 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        glow: {
          '0%': {
            boxShadow:
              '0 0 5px rgba(139, 92, 246, 0.3), 0 0 10px rgba(139, 92, 246, 0.1)',
          },
          '100%': {
            boxShadow:
              '0 0 20px rgba(139, 92, 246, 0.6), 0 0 40px rgba(139, 92, 246, 0.3)',
          },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
