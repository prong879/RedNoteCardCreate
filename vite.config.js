import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs' // 导入 Node.js 文件系统模块

// 自定义 Vite 插件，用于处理保存内容的请求
const saveContentPlugin = () => ({
    name: 'save-content-middleware',
    configureServer(server) {
        // 仅在开发模式下添加中间件
        if (server.config.mode !== 'development') {
            return;
        }

        server.middlewares.use(async (req, res, next) => {
            // 仅处理 POST 请求到 /api/save-content
            if (req.method === 'POST' && req.url === '/api/save-content') {
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString(); // 读取请求体数据
                });

                req.on('end', async () => {
                    try {
                        const { topicId, contentData } = JSON.parse(body); // 解析 JSON 数据

                        if (!topicId || !contentData) {
                            res.statusCode = 400;
                            res.end(JSON.stringify({ message: '错误：缺少 topicId 或 contentData' }));
                            return;
                        }

                        // 构建目标文件路径
                        const targetDir = path.resolve(__dirname, 'src/content');
                        const targetFile = path.join(targetDir, `${topicId}_content.js`);

                        // 确保目标目录存在 (虽然这里 src/content 应该总是存在)
                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir, { recursive: true });
                        }

                        // 格式化要写入的内容
                        const fileContent = `export const ${topicId}_contentData = ${JSON.stringify(contentData, null, 2)};
`;

                        // 异步写入文件
                        await fs.promises.writeFile(targetFile, fileContent, 'utf8');

                        console.log(`[Save Content Plugin] 内容已成功保存到: ${targetFile}`);
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ message: `内容已成功保存到 ${topicId}_content.js` }));

                    } catch (error) {
                        console.error('[Save Content Plugin] 保存内容时出错:', error);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ message: '服务器错误：保存内容失败', error: error.message }));
                    }
                });
            } else {
                // 对于其他请求，传递给下一个中间件
                next();
            }
        });
    }
});


// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        saveContentPlugin() // 添加自定义插件
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        }
    }
}) 