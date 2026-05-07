import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a2e',
        card: '#0f3460',
        'card-hover': '#16213e',
      },
      fontFamily: {
        sans: ['Noto Sans Hebrew', 'sans-serif'],
      },
    },
  },
}

export default config
