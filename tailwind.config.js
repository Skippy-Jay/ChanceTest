/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      // ── Chance Brand Colors (Platinum) ──
      colors: {
        chance: {
          // Primary platinum palette
          platinum: '#828D98',
          'platinum-light': '#A8B2BD',
          'platinum-mid': '#717B85',
          'platinum-dim': '#565F67',
          'platinum-dark': '#3D444A',
          // Accent
          accent: '#5E9ABB',
          // Legacy gold — used ONLY for legendary rarity + legendary category
          gold: '#d4af37',
          'gold-light': '#f0d060',
          'gold-dim': '#a68928',
          // Dark backgrounds
          dark: '#0a0a0f',
          'dark-surface': '#12121a',
          'dark-card': '#1a1a25',
          'dark-border': 'rgba(255, 255, 255, 0.06)',
          // Text — platinum-toned, no white
          text: '#A8B2BD',
          'text-dim': '#828D98',
          'text-muted': '#565F67',
          // Status colors
          alive: '#34d399',
          dead: '#f87171',
          sketchy: '#fbbf24',
        },
      },
      // ── Typography ──
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
      },
      // ── Glass Effect Utilities ──
      backdropBlur: {
        xs: '2px',
        glass: '12px',
        'glass-heavy': '24px',
      },
      // ── Glow / Shadow ──
      boxShadow: {
        'platinum-glow': '0 0 20px rgba(130, 141, 152, 0.22)',
        'platinum-glow-sm': '0 0 10px rgba(130, 141, 152, 0.15)',
        'platinum-glow-lg': '0 0 40px rgba(130, 141, 152, 0.30)',
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.3)',
        'gold-glow-sm': '0 0 10px rgba(212, 175, 55, 0.2)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.3)',
        'glass-inset': 'inset 0 1px 1px rgba(255, 255, 255, 0.05)',
      },
      // ── Background Utilities ──
      backgroundImage: {
        'chance-radial': 'radial-gradient(ellipse at 50% 0%, rgba(130, 141, 152, 0.06) 0%, transparent 60%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      // ── Animations ──
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(130, 141, 152, 0.22)' },
          '50%': { boxShadow: '0 0 35px rgba(130, 141, 152, 0.35)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'points-pop': {
          '0%': { opacity: '0', transform: 'translateY(0) scale(0.5)' },
          '50%': { opacity: '1', transform: 'translateY(-20px) scale(1.2)' },
          '100%': { opacity: '0', transform: 'translateY(-40px) scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'fade-in-up': 'fade-in-up 0.5s ease-out',
        'scale-in': 'scale-in 0.3s ease-out',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'points-pop': 'points-pop 1s ease-out forwards',
      },
    },
  },
  plugins: [],
}
