import fs from 'fs/promises'; // 使用 promise 版本的 fs 模块
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前文件的目录和项目根目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 假设插件位于项目根目录下的 'plugins' 文件夹
const projectRoot = path.resolve(__dirname, '..');

/**
 * Vite 插件，用于在开发模式下处理来自前端的本地文件保存请求。
 */
export default function localSavePlugin() {
    return {
        name: 'local-save-handler', // 插件名称
        /**
         * 配置 Vite 开发服务器。
         * @param {import('vite').ViteDevServer} server - Vite 开发服务器实例。
         */
        configureServer(server) {
            // --- 中间件 1: 处理 JS 内容保存 ---
            server.middlewares.use('/api/save-local-content', async (req, res, next) => {
                // 只处理 POST 请求
                if (req.method !== 'POST') {
                    return next(); // 如果不是 POST 请求，传递给下一个中间件
                }

                // 从请求体中读取数据
                let body = '';
                req.on('data', chunk => {
                    body += chunk.toString();
                });

                // 请求体读取完成后处理
                req.on('end', async () => {
                    try {
                        const { filename, content } = JSON.parse(body);

                        // --- 安全性检查 ---
                        // 1. 检查文件名和类型是否有效
                        if (!filename || typeof filename !== 'string' || !filename.endsWith('_content.js') || !filename.startsWith('topic')) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效的文件名或类型 (必须是 topicX_content.js 格式)。' }));
                            console.warn(`[LocalSavePlugin] JS Save: Rejected invalid filename: ${filename}`);
                            return;
                        }

                        // 2. 构建目标文件路径，并严格限制在 'src/content/' 目录下
                        const contentDir = path.resolve(projectRoot, 'src', 'content');
                        // 使用 path.join 解析路径，避免路径遍历攻击 (../)
                        const targetPath = path.join(contentDir, path.basename(filename)); // 使用 basename 确保只用文件名部分

                        // 3. 再次验证解析后的路径是否仍在预期的 contentDir 内部
                        if (!targetPath.startsWith(contentDir)) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效的文件路径，禁止访问项目外或非内容目录。' }));
                            console.warn(`[LocalSavePlugin] JS Save: Rejected path traversal attempt: ${filename} resolved to ${targetPath}`);
                            return;
                        }
                        // --- 安全性检查结束 ---


                        console.log(`[LocalSavePlugin] JS Save: Attempting to write to: ${targetPath}`);
                        // 使用 fs.writeFile 写入文件 (异步)
                        await fs.writeFile(targetPath, content, 'utf-8');

                        // 写入成功，返回成功响应
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: `JS 文件 ${filename} 已成功保存到本地 src/content/。` }));
                        console.log(`[LocalSavePlugin] JS Save: Successfully wrote file: ${filename}`);

                    } catch (error) {
                        // 处理 JSON 解析错误或文件写入错误
                        console.error('[LocalSavePlugin] JS Save: Error saving file:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '保存 JS 文件到本地时发生服务器内部错误。', error: error.message }));
                    }
                });
            });
            console.log('[LocalSavePlugin] API endpoint /api/save-local-content configured.');

            // --- 中间件 2: 处理 Markdown 模板保存 ---
            server.middlewares.use('/api/save-markdown-template', async (req, res, next) => {
                // 只处理 POST 请求
                if (req.method !== 'POST') {
                    return next(); // 传递给下一个中间件
                }

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                    try {
                        const { filename, content } = JSON.parse(body);

                        // --- 安全性检查 (Markdown) ---
                        // 1. 检查文件名和类型
                        if (!filename || typeof filename !== 'string' || !filename.endsWith('.md') /*|| !filename.startsWith('topic')*/) { // topic 开头检查可选
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效的文件名或类型 (必须是 .md 格式)。' }));
                            console.warn(`[LocalSavePlugin] MD Save: Rejected invalid filename: ${filename}`);
                            return;
                        }

                        // 2. 构建目标文件路径，限制在 'src/markdown/' 目录下
                        const targetDir = path.resolve(projectRoot, 'src', 'markdown');
                        const targetPath = path.join(targetDir, path.basename(filename));

                        // 3. 确保路径在预期目录内
                        if (!targetPath.startsWith(targetDir)) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效的文件路径，禁止访问项目外或非 src/markdown 目录。' }));
                            console.warn(`[LocalSavePlugin] MD Save: Rejected path traversal attempt: ${filename} resolved to ${targetPath}`);
                            return;
                        }
                        // --- 安全性检查结束 ---

                        // --- 新增：检查文件是否已存在 ---
                        try {
                            await fs.access(targetPath, fs.constants.F_OK);
                            // 如果 fs.access 成功，说明文件已存在
                            console.warn(`[LocalSavePlugin] MD Save: File already exists: ${targetPath}`);
                            res.writeHead(409, { 'Content-Type': 'application/json' }); // 409 Conflict
                            res.end(JSON.stringify({ success: false, code: 'FILE_EXISTS', message: `文件 ${filename} 已存在于 src/markdown/ 目录，无法覆盖。` }));
                            return;
                        } catch (accessError) {
                            // 如果 fs.access 失败 (通常是 ENOENT: no such file or directory)，说明文件不存在，可以继续
                            if (accessError.code !== 'ENOENT') {
                                // 如果是其他错误 (如权限问题)，则抛出
                                throw accessError;
                            }
                            // 文件不存在，继续执行
                            console.log(`[LocalSavePlugin] MD Save: File does not exist, proceeding with creation: ${targetPath}`);
                        }
                        // --- 文件存在性检查结束 ---

                        // 确保目标目录存在
                        try {
                            await fs.mkdir(targetDir, { recursive: true });
                            console.log(`[LocalSavePlugin] MD Save: Ensured directory exists: ${targetDir}`);
                        } catch (mkdirError) {
                            if (mkdirError.code !== 'EEXIST') {
                                throw mkdirError;
                            }
                        }

                        // 写入 Markdown 文件
                        console.log(`[LocalSavePlugin] MD Save: Attempting to write to: ${targetPath}`);
                        await fs.writeFile(targetPath, content, 'utf-8');

                        // 返回成功响应
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: `Markdown 文件 ${filename} 已成功保存到本地 src/markdown/。` }));
                        console.log(`[LocalSavePlugin] MD Save: Successfully wrote file: ${filename} to src/markdown/`);

                    } catch (error) {
                        console.error('[LocalSavePlugin] MD Save: Error saving file:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '保存 Markdown 文件到本地时发生服务器内部错误。', error: error.message }));
                    }
                });
            });
            console.log('[LocalSavePlugin] API endpoint /api/save-markdown-template configured.');

            // 可以在这里添加更多的中间件或 WebSocket 监听器
        }
    };
} 