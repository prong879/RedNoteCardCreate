import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/styles/index.css'

// 引入 KaTeX 样式
import 'katex/dist/katex.min.css';

// 引入 vue-toastification
import Toast, { POSITION } from "vue-toastification";
// 引入 vue-toastification 样式
import "vue-toastification/dist/index.css";

// 引入 Tailwind CSS 主文件 (修正路径)
import './assets/styles/index.css';

// 引入 Font Awesome CSS
import '@fortawesome/fontawesome-free/css/all.css';

const app = createApp(App);

// 新增：创建 Pinia 实例
const pinia = createPinia();

// 配置 vue-toastification
const options = {
    position: POSITION.TOP_RIGHT, // 通知位置，右上角
    timeout: 3000, // 默认超时时间 3 秒
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: false,
    hideProgressBar: false,
    closeButton: "button",
    icon: true,
    rtl: false
};
app.use(Toast, options);

// 新增：让 Vue 应用使用 Pinia
app.use(pinia);

app.mount('#app') 