export default {
  content: ['./index.html', './admin/**/*.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#1B1B1B',
        brand: '#FF6B35',
        'brand-dark': '#E85420',
        soft: '#FFF4ED',
        teal: '#2A9D8F',
        gold: '#FFC93C',
        shell: '#FFFCF7',
        line: '#EFE9DD'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Plus Jakarta Sans', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 24px 48px -16px rgba(255, 107, 53, 0.24)'
      }
    }
  },
  plugins: []
};
