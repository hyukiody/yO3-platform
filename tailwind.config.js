/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
        '1': '0.5rem', // 8px scale
        '2': '1rem',
        '3': '1.5rem',
        '4': '2rem',
        '5': '2.5rem',
        '6': '3rem',
        '8': '4rem',
        '10': '5rem',
        '12': '6rem',
        '16': '8rem',
      },
      colors: {
        background: 'hsl(var(--color-bg))',
        foreground: 'hsl(var(--color-fg))',
        primary: 'hsl(var(--color-primary))',
        'primary-hover': 'hsl(var(--color-primary-hover))',
        danger: 'hsl(var(--color-danger))',
        warning: 'hsl(var(--color-warning))',
        surface: 'hsl(var(--color-surface))',
        'surface-hover': 'hsl(var(--color-surface-hover))',
      },
    },
  },
  plugins: [],
}
