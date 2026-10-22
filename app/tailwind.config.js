/** Tokens del prototipo "Pequeños Atletas App" (design/). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        exterior: '#07090D',
        fondo: '#0A0D12',
        sup: '#141924',
        sup2: '#1B2130',
        suph: '#181E2B',
        pista: '#11151E',
        campo: '#0F131B',
        linea: '#232A3A',
        texto: '#F2F4F8',
        suave: '#C9CFDB',
        tenue: '#8C95A8',
        apagado: '#5E6678',
        verde: { DEFAULT: '#3DDC6A', hover: '#5BE883', oscuro: '#1E8A39' },
        tinta: '#06210F',
        azul: { DEFAULT: '#4F7BFF', claro: '#9DB4FF', hielo: '#C8D5FF' },
        marca: { DEFAULT: '#1F4FD8', oscuro: '#0F2A7A' },
        ambar: '#F5A524',
        rojo: { DEFAULT: '#E5484D', claro: '#FF8A8D' },
        cielo: '#3E9BFF',
        gris: '#9AA4B2',
      },
      fontFamily: {
        sans: ['"Archivo Variable"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Menlo', 'monospace'],
      },
      borderColor: { DEFAULT: 'rgba(255,255,255,0.07)' },
      borderRadius: { '4xl': '28px', '5xl': '32px' },
    },
  },
  plugins: [],
};
