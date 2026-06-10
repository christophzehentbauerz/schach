import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mentor: {
          50: '#eef7ff',
          500: '#3178ff',
          700: '#1d4ed8',
          950: '#07152f'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
