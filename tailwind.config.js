/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nacl: {
          dark: '#0B0F17',
          card: '#131A26',
          border: '#202B3C',
          accent: '#0088FF',
          accentLight: '#33A1FF',
          teal: '#00E5FF',
          green: '#00E676',
          yellow: '#FFEA00',
          red: '#FF1744',
          subtle: '#8A99AD'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
