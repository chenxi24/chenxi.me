/** @type {import('tailwindcss').Config} */

export default {
  content: ['./src/**/*.{astro,md,ts}'],
  theme: {
    extend: {
      spacing: {
        'header-height': 'var(--header-height)',
        'page-gutter': 'var(--page-gutter)'
      },
      maxWidth: {
        content: 'var(--content-width)'
      },
      colors: {
        muted: 'hsl(var(--color-muted) / <alpha-value>)'
      }
    }
  }
}
