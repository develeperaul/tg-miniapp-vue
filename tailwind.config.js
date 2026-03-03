/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        15: '15px'
      },
      colors: {
        primary: '#242F9B',
        gray: '#B6B6B6',
        gray2: '#9B9B9B',
        surface: '#F7F8FC',
        muted: '#6B7280'
      },
      borderRadius: {
        xl: '18px',
        base: '10px'
      },
      fontFamily: {
        inter: 'Inter',
      },
      
    }
  },
  
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.container': {
          maxWidth: '100%',
          padding: '0 16px',
          marginRight: 'auto',
          marginLeft: 'auto',
          
        },
      })
    }
      
  ]
}
