/**
 * Tokens del prototipo "Pequeños Atletas App" (design/).
 * Los colores salen de variables CSS (--color-...) definidas en src/index.css.
 * Cada variable guarda los canales "R G B" para que sigan funcionando las
 * transparencias de Tailwind (ej. bg-verde/50). Así luego se puede hacer un tema claro.
 */
const c = (nombre) => `rgb(var(--color-${nombre}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        exterior: c('exterior'),
        fondo: c('fondo'),
        sup: c('sup'),
        sup2: c('sup2'),
        suph: c('suph'),
        pista: c('pista'),
        campo: c('campo'),
        linea: c('linea'),
        texto: c('texto'),
        suave: c('suave'),
        tenue: c('tenue'),
        apagado: c('apagado'), // contraste >= 4,5:1 sobre todas las superficies oscuras
        verde: { DEFAULT: c('verde'), hover: c('verde-hover'), oscuro: c('verde-oscuro') },
        tinta: c('tinta'),
        azul: { DEFAULT: c('azul'), claro: c('azul-claro'), hielo: c('azul-hielo') },
        marca: { DEFAULT: c('marca'), oscuro: c('marca-oscuro') },
        ambar: c('ambar'),
        rojo: { DEFAULT: c('rojo'), claro: c('rojo-claro') },
        cielo: c('cielo'),
        gris: c('gris'),
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
