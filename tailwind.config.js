/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        diary: {
          navy: {
            DEFAULT: '#2A3B6B',
            dark: '#1B2647',
            light: '#3D528F',
            subtle: '#EEF2FA',
          },
          gold: {
            DEFAULT: '#F2B230',
            dark: '#D8991D',
            light: '#F8D176',
            pale: '#FDF6E6',
          },
          cream: {
            DEFAULT: '#F6EBD3',
            light: '#FBF6EC',
            dark: '#E7D4AF',
            row: '#FAF4E7',
          },
          paper: '#FFFFFF',
          bg: '#F7F8FB',
          line: 'rgba(42, 59, 107, 0.12)',
          text: '#1C2434',
          muted: '#64748B',
        },
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', '"Noto Sans Tamil"', 'sans-serif'],
        body: ['Inter', '"Noto Sans Tamil"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['Inter', '"Noto Sans Tamil"', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['28px', { lineHeight: '1.25', fontWeight: '700' }],
        'section-title': ['20px', { lineHeight: '1.35', fontWeight: '600' }],
        'card-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-default': ['15px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-medium': ['15px', { lineHeight: '1.6', fontWeight: '500' }],
        'caption': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'tag': ['11px', { lineHeight: '1.4', letterSpacing: '0.04em', fontWeight: '600' }],
        'tag-sm': ['12px', { lineHeight: '1.4', letterSpacing: '0.04em', fontWeight: '600' }],
      },
      borderRadius: {
        'card': '12px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 12px 0 rgba(15, 23, 42, 0.06), 0 2px 4px -1px rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
