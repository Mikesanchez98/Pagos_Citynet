/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aquí puedes definir los colores institucionales de tu empresa
        'primary': '#2563eb', // Un azul estándar, cámbialo al de tu logo
        'secondary': '#64748b',
      }
    },
  },
  plugins: [],
}