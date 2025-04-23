/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{vue,js,ts,jsx,tsx}",
    ],
    safelist: [
        // 可以保留一些你认为可能在其他地方动态使用，但扫描不到的类名
        // 例如，如果将来有其他动态样式的需求
        // 此处暂时清空，因为背景已固定在模板中
    ],
    theme: {
        extend: {
            colors: {
                'xhs-pink': '#FF2442',
                'xhs-light-pink': '#FFECEF',
                'xhs-black': '#333333',
                'xhs-gray': '#999999',
            },
            fontFamily: {
                sans: ['PingFang SC', 'Helvetica Neue', 'Arial', 'sans-serif'],
            },
        },
    },
    plugins: [],
} 