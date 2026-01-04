/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text', 'system-ui', 'sans-serif'],
        serif: ['Lora', 'Georgia', 'Merriweather', 'serif'],
        mono: ['Geist Mono', 'monospace'],
      },
      colors: {
        paper: 'var(--paper)',
        card: 'var(--card)',
        ink: 'var(--ink)',
        stroke: 'var(--stroke)',
        muted: 'var(--muted)',
        'muted-foreground': 'var(--muted-foreground)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'card-foreground': 'var(--card-foreground)',
        border: 'var(--border)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(0, 0, 0, 0.04)',
        'md': '0 4px 16px rgba(0, 0, 0, 0.08)',
        'lg': '0 8px 32px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [],
}
