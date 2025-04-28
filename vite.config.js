import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// import path from 'path' // path might not be needed if saveContentPlugin is removed
// import fs from 'fs' // fs might not be needed if saveContentPlugin is removed
import localSavePlugin from './plugins/vite-plugin-local-save' // Ensure this is uncommented
import { fileURLToPath, URL } from 'node:url' // Ensure this is uncommented
// const { readTopicsMeta, writeTopicsMeta, truncateString } = require('./scripts/metaUtils'); // Keep commented if saveContentPlugin is removed

// 自定义 Vite 插件，用于处理保存内容的请求
// const saveContentPlugin = () => ({ ... }); // Keep this commented out or removed

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({ // Ensure defineConfig is used
    plugins: [
        vue(),
        // 只在开发模式 (mode === 'development') 下启用本地保存插件
        mode === 'development' ? localSavePlugin() : null,
        // saveContentPlugin() // Keep this commented out or removed
    ].filter(Boolean),
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
})) 