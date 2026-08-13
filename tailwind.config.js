/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Sem webfont: rede fechada não alcança o Google Fonts. Inter é usada se
        // estiver instalada na máquina, senão cai na fonte de sistema.
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  // Obrigatório, não enfeite: os inputs do protótipo usam "rounded-md border-slate-300"
  // sem classe de largura de borda. No CDN o input herda a borda nativa do navegador; num
  // build local o preflight zera border-width e os campos ficam sem borda visível.
  plugins: [require('@tailwindcss/forms')],
}
