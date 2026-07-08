export default {
  content: ['./index.html', './admin/**/*.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1220',
        brand: '#123C69',
        'brand-dark': '#08233F',
        soft: '#EAF3FF',
        green: '#16A34A',
        teal: '#0F766E',
        gold: '#F59E0B',
        shell: '#F5F7FA',
        line: '#E5E7EB'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Plus Jakarta Sans', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 24px 48px -16px rgba(18, 60, 105, 0.22)'
      }
    }
  },
  plugins: []
};
