/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  darkMode: "class",
  content: ["./**/*.svelte"],
  plugins: [require('@tailwindcss/typography'), require('daisyui')],
	daisyui: {
		themes: ['fantasy', 'dracula']
	}
}

