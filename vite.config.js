import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs' // 导入 Node.js 文件系统模块
const { readTopicsMeta, writeTopicsMeta, truncateString } = require('./scripts/metaUtils'); // 导入 Meta 工具函数

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

                        // --- 更新 topicsMeta.js --- 
                        let metaUpdateSuccess = false;
                        const descriptionFromFrontend = contentData.topicDescription || ''; // 提取描述
                        const currentMeta = readTopicsMeta(); // 读取 Meta
                        let metaChanged = false; // 在这里声明并初始化 metaChanged

                        if (currentMeta !== null) {
                            const existingIndex = currentMeta.findIndex(item => item.id === topicId);
                            if (existingIndex !== -1) {
                                // let metaChanged = false; // 从这里移除
                                // 更新描述 (以及可选的标题 - 这里暂时只更新描述)
                                if (currentMeta[existingIndex].description !== descriptionFromFrontend) {
                                    console.log(`  [Save Locally API] Updating description for ${topicId}`);
                                    currentMeta[existingIndex].description = descriptionFromFrontend;
                                    metaChanged = true;
                                }
                                // // 可选：如果也想从前端更新标题（不推荐，标题源头应是MD）
                                // const titleFromFrontend = contentData.coverCard?.title || '';
                                // if (currentMeta[existingIndex].title !== titleFromFrontend) {
                                //    console.log(`  [Save Locally API] Updating title for ${topicId}`);
                                //    currentMeta[existingIndex].title = titleFromFrontend;
                                //    metaChanged = true;
                                // }

                                if (metaChanged) {
                                    metaUpdateSuccess = writeTopicsMeta(currentMeta); // 写回 Meta
                                    if (!metaUpdateSuccess) {
                                        console.error(`  [Save Locally API] ❌ Failed to write back topicsMeta.js`);
                                        // 可以选择是否中止操作或仅记录错误
                                    }
                                } else {
                                    console.log(`  [Save Locally API] topicsMeta.js description for ${topicId} no changes needed.`);
                                    metaUpdateSuccess = true; // 认为未改变也是一种成功
                                }
                            } else {
                                console.warn(`  [Save Locally API] ⚠️ Topic ID ${topicId} not found in topicsMeta.js. Cannot update meta.`);
                                // 如果选题不存在于 Meta 中，是否应该报错或继续？目前继续
                                metaUpdateSuccess = true; // 认为找不到也是一种"成功" (对于Meta更新来说)
                            }
                        } else {
                            console.error(`  [Save Locally API] ❌ Failed to read or parse topicsMeta.js. Cannot update meta.`);
                            // 读取 Meta 失败，是否中止？目前继续
                        }
                        // --- topicsMeta.js 更新结束 ---

                        // --- 写入 _content.js 文件 --- 
                        const targetDir = path.resolve(__dirname, 'src/content');
                        const targetFile = path.join(targetDir, `${topicId}_content.js`);

                        // 确保目标目录存在 (虽然这里 src/content 应该总是存在)
                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir, { recursive: true });
                        }

                        // 从 contentData 中移除临时的 topicDescription，避免写入文件
                        const contentToSave = { ...contentData };
                        delete contentToSave.topicDescription;

                        const fileContent = `export const ${topicId}_contentData = ${JSON.stringify(contentToSave, null, 2)};\n`;
                        await fs.promises.writeFile(targetFile, fileContent, 'utf8');
                        console.log(`[Save Content Plugin] Content saved to: ${targetFile}`);
                        // --- _content.js 文件写入结束 --- 

                        // --- 准备并发送响应 --- 
                        let responseMessage = `内容已成功保存到 ${topicId}_content.js。`;
                        if (metaUpdateSuccess && metaChanged) {
                            responseMessage += ` 元数据 topicsMeta.js 已更新。`;
                        } else if (!metaUpdateSuccess && currentMeta !== null) {
                            responseMessage += ` 但更新元数据 topicsMeta.js 失败。`;
                        }

                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ message: responseMessage }));

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