/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Geist vem empacotada via @fontsource (importada no main.tsx), então funciona em rede fechada.
        sans: ['"Geist Variable"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      colors: {
        // Azul da logo (#03A9E5) como cor de marca.
        brand: {
          50: '#ECF9FE',
          100: '#D3F0FC',
          200: '#A8E1F9',
          300: '#6FCDF4',
          400: '#2FB8EC',
          500: '#03A9E5',
          600: '#0288C2',
          700: '#056C9C',
          800: '#0A5A80',
          900: '#0E4B6A',
          950: '#082F45',
        },
        // Verde da logo, usado só como sinal de "ao vivo".
        signal: '#00E696',
        ink: {
          700: '#1E273D',
          800: '#141B2D',
          900: '#0B1120',
          950: '#070B14',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.03)',
        'card-hover': '0 4px 8px -2px rgb(16 24 40 / 0.06), 0 12px 24px -8px rgb(16 24 40 / 0.10)',
        soft: '0 1px 2px 0 rgb(16 24 40 / 0.05)',
        'soft-hover': '0 4px 12px -2px rgb(16 24 40 / 0.10)',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeInUp .4s cubic-bezier(0.16, 1, 0.3, 1) both',
      },
    },
  },
  // Obrigatório, não enfeite: os inputs do protótipo usam "rounded-md border-slate-300"
  // sem classe de largura de borda. No CDN o input herda a borda nativa do navegador; num
  // build local o preflight zera border-width e os campos ficam sem borda visível.
  plugins: [require('@tailwindcss/forms')],
}
