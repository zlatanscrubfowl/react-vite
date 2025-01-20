/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Pastikan untuk menyesuaikan path ini sesuai dengan struktur proyek Anda
  ],
  theme: {
    extend: {
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
        '200': '200',
        '300': '300',
        '400': '400',
        '500': '500',
        '600': '600',
        '700': '700',
        '800': '800',
        '900': '900',
        '1000': '1000',
        '2000': '2000',
        '10000': '10000',
        '100000': '100000',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}