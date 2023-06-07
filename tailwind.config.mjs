/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./src/**/*.{astro,md,ts}'],
  theme: {
    extend: {
      spacing: {
        'page-top': 'var(--page-top)',
        'header-height': 'var(--header-height)',
        'page-gutter': 'var(--page-gutter)',
        'footer-height': 'var(--footer-height)'
      },
      maxWidth: {
        content: 'var(--content-width)'
      },
      minHeight: {
        content: 'var(--content-height)'
      },
      colors: {
        muted: 'hsl(var(--color-muted) / <alpha-value>)'
      }
    }
  }
}
