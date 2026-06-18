import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        hud: {
          green:  '#00ff9f',
          amber:  '#ffb800',
          red:    '#ff3b3b',
          blue:   '#4fc3f7',
          bg:     '#050a0e',
          panel:  '#0a1628',
          border: '#1a3a5c',
          muted:  '#3a5a7c',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
} satisfies Config
