import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// 移除旧插件相关导入
// import path from 'path' 
// import fs from 'fs' 

// 正确导入新插件和路径处理
import localSavePlugin from './plugins/vite-plugin-local-save' // Re-enable plugin import
import { fileURLToPath, URL } from 'node:url'

// 移除旧插件定义
// const saveContentPlugin = () => ({ ... });

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({ // 接收 mode 参数
    plugins: [
        vue(),
        // Re-enable plugin usage
        mode === 'development' ? localSavePlugin() : null,
        // 移除旧插件调用
        // saveContentPlugin()
    ].filter(Boolean), // 过滤掉 null
    resolve: {
        alias: {
            // 使用正确的路径别名方式
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
})) 