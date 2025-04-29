import fs from 'fs/promises'; // 使用 promise 版本的 fs 模块
import path from 'path';
import { fileURLToPath } from 'url';
// 引入 gray-matter 和 metaUtils (使用 require, 因为 metaUtils 是 CommonJS)
import matter from 'gray-matter';
import { readTopicsMeta, writeTopicsMeta } from '../scripts/metaUtils.js'; // 直接 import
// --- 新增：引入 Acorn 和 acorn-walk ---
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

// 获取当前文件的目录和项目根目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 假设插件位于项目根目录下的 'plugins' 文件夹
const projectRoot = path.resolve(__dirname, '..');

/**
 * Helper function to extract card count from JS content string using Acorn AST parser.
 * @param {string} jsContent The content of the _content.js file.
 * @param {string} topicId The topic ID, used to find the correct export variable.
 * @returns {number} The calculated card count (cover + content cards), or 1 if parsing fails or structure is unexpected.
 */
function extractCardCount(jsContent, topicId) {
    try {
        // 1. 解析 JS 内容为 AST
        const ast = acorn.parse(jsContent, { ecmaVersion: 'latest', sourceType: 'module' });

        let contentCardsLength = 0; // 初始化内容卡片数量
        let foundExport = false;

        // 2. 遍历 AST 查找目标导出和 contentCards 属性
        walk.simple(ast, {
            // 查找命名导出 (export const ...)
            ExportNamedDeclaration(node) {
                if (node.declaration && node.declaration.type === 'VariableDeclaration') {
                    node.declaration.declarations.forEach(declaration => {
                        // 检查变量名是否匹配 topicId + "_contentData"
                        if (declaration.id && declaration.id.type === 'Identifier' && declaration.id.name === `${topicId}_contentData`) {
                            foundExport = true;
                            // 检查初始化值是否为对象表达式 {...}
                            if (declaration.init && declaration.init.type === 'ObjectExpression') {
                                // 查找对象中的 'contentCards' 属性
                                const properties = declaration.init.properties;
                                const contentCardsProp = properties.find(prop =>
                                    prop.type === 'Property' &&
                                    prop.key.type === 'Literal' &&
                                    prop.key.value === 'contentCards'
                                );
                                // 如果找到 'contentCards' 属性并且其值是数组表达式 [...]
                                if (contentCardsProp && contentCardsProp.value.type === 'ArrayExpression') {
                                    contentCardsLength = contentCardsProp.value.elements.length; // 获取数组元素数量
                                } else {
                                    console.warn(`[LocalSavePlugin] extractCardCount[${topicId}]: 'contentCards' property not found (key check modified) or not an array in exported object.`);
                                }
                            } else {
                                console.warn(`[LocalSavePlugin] extractCardCount[${topicId}]: Exported variable is not an ObjectExpression.`);
                            }
                        }
                    });
                }
            }
        });

        if (!foundExport) {
            console.warn(`[LocalSavePlugin] extractCardCount[${topicId}]: Export variable '${topicId}_contentData' not found.`);
        }

        // 3. 返回结果 (封面卡片 + 内容卡片)
        console.log(`[LocalSavePlugin] extractCardCount[${topicId}]: Found ${contentCardsLength} content cards.`);
        return 1 + contentCardsLength;

    } catch (error) {
        // 处理 Acorn 解析错误或其他意外错误
        console.error(`[LocalSavePlugin] extractCardCount[${topicId}]: Error parsing JS content:`, error);
        return 1; // 解析失败，默认返回 1
    }
}

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
                            return;
                        }
                        // --- 安全性检查结束 ---

                        // 使用 fs.writeFile 写入文件 (异步)
                        await fs.writeFile(targetPath, content, 'utf-8');

                        // 写入成功，返回成功响应
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: `JS 文件 ${filename} 已成功保存到本地 src/content/。` }));
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
                        const { filename, content, overwrite = false } = JSON.parse(body);

                        // --- 安全性检查 (Markdown) ---
                        // 1. 检查文件名和类型
                        if (!filename || typeof filename !== 'string' || !filename.endsWith('.md')) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效的文件名或类型 (必须是 .md 格式)。' }));
                            return;
                        }

                        // 2. 构建目标文件路径，限制在 'src/markdown/' 目录下
                        const targetDir = path.resolve(projectRoot, 'src', 'markdown');
                        const targetPath = path.join(targetDir, path.basename(filename));

                        // 3. 确保路径在预期目录内
                        if (!targetPath.startsWith(targetDir)) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效的文件路径，禁止访问项目外或非 src/markdown 目录。' }));
                            return;
                        }
                        // --- 安全性检查结束 ---

                        // --- 检查文件是否已存在（已修改：支持overwrite参数） ---
                        let fileExists = false;
                        try {
                            await fs.access(targetPath, fs.constants.F_OK);
                            // 如果fs.access成功，说明文件已存在
                            fileExists = true;
                        } catch (accessError) {
                            // 如果是ENOENT错误，文件不存在，可以继续
                            if (accessError.code !== 'ENOENT') {
                                // 如果是其他错误（如权限问题），则抛出
                                throw accessError;
                            }
                        }

                        // 如果文件存在且未设置覆盖，返回409 Conflict
                        if (fileExists && !overwrite) {
                            res.writeHead(409, { 'Content-Type': 'application/json' }); // 409 Conflict
                            res.end(JSON.stringify({ success: false, code: 'FILE_EXISTS', message: `文件 ${filename} 已存在于 src/markdown/ 目录，无法覆盖。` }));
                            return;
                        }

                        // 如果文件存在且设置了覆盖，添加日志
                        if (fileExists && overwrite) {
                            console.log(`[LocalSavePlugin] Overwriting existing file: ${filename} (overwrite=true)`);
                        }
                        // --- 文件存在性检查结束 ---

                        // 确保目标目录存在
                        try {
                            await fs.mkdir(targetDir, { recursive: true });
                        } catch (mkdirError) {
                            if (mkdirError.code !== 'EEXIST') {
                                throw mkdirError;
                            }
                        }

                        // 写入 Markdown 文件
                        await fs.writeFile(targetPath, content, 'utf-8');

                        // 返回成功响应，包含覆盖信息
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        const successMessage = fileExists && overwrite
                            ? `Markdown 文件 ${filename} 已成功更新（覆盖）到本地 src/markdown/。`
                            : `Markdown 文件 ${filename} 已成功保存到本地 src/markdown/。`;
                        res.end(JSON.stringify({ success: true, message: successMessage }));
                    } catch (error) {
                        console.error('[LocalSavePlugin] MD Save: Error saving file:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '保存 Markdown 文件到本地时发生服务器内部错误。', error: error.message }));
                    }
                });
            });
            console.log('[LocalSavePlugin] API endpoint /api/save-markdown-template configured.');

            // --- 修改中间件 3: 列出 Markdown 和 JS 文件 (使用 Acorn 计算卡片数量) ---
            server.middlewares.use('/api/list-content-files', async (req, res, next) => {
                if (req.method !== 'GET') {
                    return next();
                }
                console.log('[LocalSavePlugin] /api/list-content-files requested');
                try {
                    const markdownDir = path.resolve(projectRoot, 'src', 'markdown');
                    const contentDir = path.resolve(projectRoot, 'src', 'content');

                    // 1. List Markdown files and extract topic IDs
                    let mdFiles = [];
                    try {
                        const allMdFileNames = await fs.readdir(markdownDir);
                        mdFiles = allMdFileNames
                            .filter(f => f.endsWith('.md'))
                            .map(f => f.replace('.md', '')); // Return only topic IDs
                    } catch (err) {
                        if (err.code === 'ENOENT') {
                            console.warn('[LocalSavePlugin] Markdown directory not found, returning empty list.');
                        } else {
                            throw err; // Rethrow other errors
                        }
                    }
                    console.log(`[LocalSavePlugin] Found MD files (topic IDs): ${mdFiles.join(', ')}`);

                    // 2. List JS files and get details (topicId, cardCount)
                    let jsFileDetails = [];
                    try {
                        const allJsFileNames = await fs.readdir(contentDir);
                        const jsContentFileNames = allJsFileNames.filter(f => f.endsWith('_content.js'));

                        for (const jsFilename of jsContentFileNames) {
                            const topicId = jsFilename.replace('_content.js', ''); // <--- 获取 topicId
                            const jsFilePath = path.join(contentDir, jsFilename);
                            try {
                                console.log(`[LocalSavePlugin] Processing JS file: ${jsFilename}`);
                                const jsContent = await fs.readFile(jsFilePath, 'utf-8');
                                // --- 修改：调用新的 extractCardCount 并传入 topicId ---
                                const cardCount = extractCardCount(jsContent, topicId);
                                console.log(`[LocalSavePlugin] Calculated cardCount for ${topicId}: ${cardCount}`);
                                jsFileDetails.push({ topicId, cardCount });
                            } catch (fileReadError) {
                                console.error(`[LocalSavePlugin] Error reading JS file ${jsFilename}:`, fileReadError);
                                // jsFileDetails.push({ topicId, cardCount: -1 }); // Indicate error
                            }
                        }
                    } catch (err) {
                        if (err.code === 'ENOENT') {
                            console.warn('[LocalSavePlugin] Content directory not found, returning empty list.');
                        } else {
                            throw err;
                        }
                    }
                    console.log(`[LocalSavePlugin] Found JS file details:`, jsFileDetails);

                    // 3. Send the combined response
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, mdFiles, jsFileDetails }));

                } catch (error) {
                    console.error('[LocalSavePlugin] List Files: Error processing request:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '列出文件时发生服务器内部错误。', error: error.message }));
                }
            });
            console.log('[LocalSavePlugin] API endpoint /api/list-content-files configured (with card counts).');

            // --- 新增中间件 4: 处理 Markdown 到 JS 的转换 ---
            server.middlewares.use('/api/convert-md-to-js', async (req, res, next) => {
                if (req.method !== 'POST') {
                    return next();
                }

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                    let requestedTopicId = 'unknown';
                    try {
                        const { topicId } = JSON.parse(body);
                        requestedTopicId = topicId;
                        if (!topicId) {
                            throw new Error('Missing topicId in request body');
                        }

                        const mdFilePath = path.resolve(projectRoot, 'src', 'markdown', `${topicId}.md`);
                        const jsFilePath = path.resolve(projectRoot, 'src', 'content', `${topicId}_content.js`);
                        const metaFilePath = path.resolve(projectRoot, 'src', 'content', 'topicsMeta.js');

                        // 1. 读取 Markdown 文件
                        let mdContent;
                        try {
                            mdContent = await fs.readFile(mdFilePath, 'utf-8');
                        } catch (readError) {
                            if (readError.code === 'ENOENT') {
                                throw new Error(`Markdown 文件 ${topicId}.md 未找到。`);
                            } else {
                                throw new Error(`读取 Markdown 文件失败: ${readError.message}`);
                            }
                        }

                        // 2. 解析 Markdown
                        const { data: frontMatter, content: mdBodyContent } = matter(mdContent);
                        if (!frontMatter.topicId || frontMatter.topicId !== topicId) {
                        }

                        // --- 提取卡片内容 (简化版) ---
                        const parts = mdBodyContent.trim().split(/\n---\n/);
                        const parsedCards = {
                            coverCard: { title: '', subtitle: '', showHeader: frontMatter.coverShowHeader !== undefined ? frontMatter.coverShowHeader : true, showFooter: frontMatter.coverShowFooter !== undefined ? frontMatter.coverShowFooter : true },
                            contentCards: [],
                            mainText: ''
                        };
                        let mainTextReached = false;
                        parts.forEach((part, index) => {
                            part = part.trim();
                            if (!part) return;
                            if (part.startsWith('## Main Text') || part.startsWith('## 主文案')) {
                                mainTextReached = true;
                                parsedCards.mainText = part.substring(part.indexOf('\n') + 1).trim();
                                return;
                            }
                            if (mainTextReached) return;

                            const titleMatch = part.match(/^#+\s+(.*)/);
                            let title = '';
                            let bodyContent = ''; // Renamed from body to avoid confusion
                            if (titleMatch) {
                                title = titleMatch[1].trim();
                                bodyContent = part.substring(titleMatch[0].length).trim();
                            } else {
                                bodyContent = part;
                            }
                            const showHeaderMatch = bodyContent.match(/<!--\s*cardShowHeader:\s*(true|false)\s*-->/);
                            const showFooterMatch = bodyContent.match(/<!--\s*cardShowFooter:\s*(true|false)\s*-->/);
                            let showHeader = frontMatter.contentDefaultShowHeader !== undefined ? frontMatter.contentDefaultShowHeader : true;
                            let showFooter = frontMatter.contentDefaultShowFooter !== undefined ? frontMatter.contentDefaultShowFooter : true;
                            if (showHeaderMatch) showHeader = showHeaderMatch[1] === 'true';
                            if (showFooterMatch) showFooter = showFooterMatch[1] === 'true';
                            bodyContent = bodyContent.replace(/<!--.*?-->/gs, '').trim();

                            if (index === 0) {
                                parsedCards.coverCard.title = title || frontMatter.title;
                                parsedCards.coverCard.subtitle = bodyContent;
                                if (showHeaderMatch) parsedCards.coverCard.showHeader = showHeader;
                                if (showFooterMatch) parsedCards.coverCard.showFooter = showFooter;
                            } else {
                                parsedCards.contentCards.push({ title, body: bodyContent, showHeader, showFooter }); // Ensure 'body' key is used here
                            }
                        });
                        // --- 卡片内容提取结束 ---

                        // 3. 构造 JS 内容
                        const contentData = {
                            headerText: frontMatter.headerText || '',
                            footerText: frontMatter.footerText || '',
                            coverCard: parsedCards.coverCard,
                            contentCards: parsedCards.contentCards,
                            mainText: parsedCards.mainText
                        };
                        const jsContentString = `// Generated from ${topicId}.md by Vite Plugin at ${new Date().toISOString()}
export const ${topicId}_contentData = ${JSON.stringify(contentData, null, 2)};
`;

                        // --- 计算卡片数量 ---
                        const cardCount = 1 + (contentData.contentCards?.length || 0);

                        // 4. 写入 JS 文件
                        await fs.writeFile(jsFilePath, jsContentString, 'utf-8');

                        // 5. 更新 topicsMeta.js
                        const currentMeta = readTopicsMeta();
                        if (currentMeta) {
                            const existingIndex = currentMeta.findIndex(item => item.id === topicId);
                            const metaEntry = {
                                id: topicId,
                                title: frontMatter.title || 'Untitled',
                                description: frontMatter.description || ''
                            };
                            let metaChanged = false;
                            if (existingIndex !== -1) {
                                if (currentMeta[existingIndex].title !== metaEntry.title || currentMeta[existingIndex].description !== metaEntry.description) {
                                    currentMeta[existingIndex] = metaEntry;
                                    metaChanged = true;
                                }
                            } else {
                                currentMeta.push(metaEntry);
                                metaChanged = true;
                            }

                            if (metaChanged) {
                                const writeSuccess = writeTopicsMeta(currentMeta);
                                if (!writeSuccess) {
                                    console.error(`[LocalSavePlugin] Convert MD [${topicId}]: Failed to write updated topicsMeta.js`);
                                }
                            }
                        } else {
                            console.error(`[LocalSavePlugin] Convert MD [${topicId}]: Failed to read topicsMeta.js. Skipping meta update.`);
                        }

                        // 6. 返回成功响应
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            message: `成功将 ${topicId}.md 转换为 ${topicId}_content.js 并更新了元数据。`,
                            cardCount: cardCount
                        }));

                    } catch (error) {
                        console.error(`[LocalSavePlugin] Convert MD [${requestedTopicId}]: Error during conversion process:`, error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: `转换 Markdown 文件时出错: ${error.message}` }));
                    }
                });
            });
            console.log('[LocalSavePlugin] API endpoint /api/convert-md-to-js configured.');
        }
    };
} 