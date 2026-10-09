/** SearchIQ design tokens: navy ink, indigo brand, neutral surfaces. */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Badge classes are composed dynamically (e.g. `badge-${tone}`), so Tailwind cannot see them in the source.
  safelist: ['badge-neutral', 'badge-brand', 'badge-success', 'badge-warn', 'badge-danger', 'badge-info'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f6fa',
          100: '#e9ecf3',
          200: '#d0d6e3',
          300: '#a9b3c8',
          400: '#7a88a6',
          500: '#566583',
          600: '#414e69',
          700: '#2f3a52',
          800: '#1c2540',
          900: '#0f1830',
          950: '#0a1124',
        },
        brand: {
          50: '#eef0ff',
          100: '#e0e4ff',
          200: '#c7cdfe',
          300: '#a5aefc',
          400: '#8187f8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: { 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
        surface: '#f6f7fb',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,24,48,.04), 0 1px 3px rgba(15,24,48,.06)',
        lift: '0 8px 24px -8px rgba(15,24,48,.16), 0 2px 6px rgba(15,24,48,.06)',
        pop: '0 16px 40px -12px rgba(15,24,48,.28)',
      },
      borderRadius: { xl: '14px', '2xl': '18px' },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-in': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'slide-in': 'slide-in .22s ease-out',
        'slide-in-right': 'slide-in-right .22s ease-out',
      },
    },
  },
  plugins: [],
};
