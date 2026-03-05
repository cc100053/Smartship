/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      animation: {
        'bg-pan': 'bg-pan 3s linear infinite',
      },
      keyframes: {
        'bg-pan': {
          '0%': { backgroundPosition: '200% center' },
          '100%': { backgroundPosition: '0% center' },
        },
      },
    },
  },
  plugins: [],
}
