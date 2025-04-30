import fs from 'fs/promises'; // 使用 promise 版本的 fs 模块
import path from 'path';
import { fileURLToPath } from 'url';
// 引入 gray-matter
import matter from 'gray-matter';
// +++ 导入常量 +++
// 注意：Node.js 插件环境需要处理 ES Module 导入
// 假设 cardConstants.js 是 ES Module，可以使用动态 import()
let cardConstants = {};
import('../src/config/cardConstants.js').then(constants => {
    cardConstants = constants;
    console.log('[LocalSavePlugin] Loaded card constants.');
}).catch(err => {
    console.error('[LocalSavePlugin] Failed to load card constants:', err);
    // 可以设置默认值或抛出错误
    cardConstants = {
        MD_COMMENT_FONT_SIZE_KEY: 'cardFontSize',
        MD_COMMENT_LINE_HEIGHT_KEY: 'cardLineHeight',
        MD_COMMENT_SHOW_HEADER_KEY: 'cardShowHeader',
        MD_COMMENT_SHOW_FOOTER_KEY: 'cardShowFooter'
    };
});

// 获取当前文件的目录和项目根目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// 假设插件位于项目根目录下的 'plugins' 文件夹
const projectRoot = path.resolve(__dirname, '..');

// +++ 新增：解析 Markdown 内容的辅助函数 +++
/**
 * Parses the body content of a Markdown file into structured card data.
 * @param {string} mdBodyContent - The Markdown content string (without front matter).
 * @param {object} frontMatter - The parsed front matter data.
 * @returns {object} - An object containing coverCard, contentCards, and mainText.
 */
function parseMdBodyToCards(mdBodyContent, frontMatter) {
    const parts = mdBodyContent.trim().split(/\r?\n---\r?\n/);
    const parsedCards = {
        coverCard: {
            title: '',
            subtitle: '',
            showHeader: frontMatter.coverShowHeader !== undefined ? frontMatter.coverShowHeader : true,
            showFooter: frontMatter.coverShowFooter !== undefined ? frontMatter.coverShowFooter : true
        },
        contentCards: [],
        mainText: ''
    };
    let mainTextReached = false;

    parts.forEach((part, index) => {
        part = part.trim();
        if (part.startsWith('## Main Text') || part.startsWith('## 主文案')) {
            mainTextReached = true;
            parsedCards.mainText = part.substring(part.indexOf('\n') + 1).trim();
            return;
        }
        if (mainTextReached) return;

        const titleMatch = part.match(/^#+\s+(.*)/);
        let title = '';
        let bodyContent = '';
        if (titleMatch) {
            title = titleMatch[1].trim();
            bodyContent = part.substring(titleMatch[0].length).trim();
        } else {
            bodyContent = part;
        }
        // --- 使用常量构建正则表达式 --- 
        const createCommentRegex = (key) =>
            new RegExp(`<!--\\s*${key}:\\s*(.*?)\\s*-->`);

        const showHeaderMatch = bodyContent.match(createCommentRegex(cardConstants.MD_COMMENT_SHOW_HEADER_KEY));
        const showFooterMatch = bodyContent.match(createCommentRegex(cardConstants.MD_COMMENT_SHOW_FOOTER_KEY));
        const fontSizeMatch = bodyContent.match(createCommentRegex(cardConstants.MD_COMMENT_FONT_SIZE_KEY));
        const lineHeightMatch = bodyContent.match(createCommentRegex(cardConstants.MD_COMMENT_LINE_HEIGHT_KEY));

        let showHeader = frontMatter.contentDefaultShowHeader !== undefined ? frontMatter.contentDefaultShowHeader : true;
        let showFooter = frontMatter.contentDefaultShowFooter !== undefined ? frontMatter.contentDefaultShowFooter : true;
        let fontSize = null;
        let lineHeight = null;

        if (showHeaderMatch) showHeader = showHeaderMatch[1] === 'true';
        if (showFooterMatch) showFooter = showFooterMatch[1] === 'true';
        if (fontSizeMatch) fontSize = parseInt(fontSizeMatch[1], 10);
        if (lineHeightMatch) lineHeight = parseFloat(lineHeightMatch[1]);

        // --- 使用常量构建更精确的替换正则表达式 --- 
        const keys = [
            cardConstants.MD_COMMENT_SHOW_HEADER_KEY,
            cardConstants.MD_COMMENT_SHOW_FOOTER_KEY,
            cardConstants.MD_COMMENT_FONT_SIZE_KEY,
            cardConstants.MD_COMMENT_LINE_HEIGHT_KEY
        ].join('|');
        const removeRegex = new RegExp(`<!--\\s*(${keys}):\\s*.*?\\s*-->\\r?\n?`, 'gs');
        bodyContent = bodyContent.replace(removeRegex, '').trim();

        if (index === 0) {
            parsedCards.coverCard.title = title || frontMatter.title || ''; // Use heading, fallback to FM title
            parsedCards.coverCard.subtitle = bodyContent;
            if (showHeaderMatch) parsedCards.coverCard.showHeader = showHeader;
            if (showFooterMatch) parsedCards.coverCard.showFooter = showFooter;
        } else {
            const cardData = {
                title,
                body: bodyContent,
                showHeader,
                showFooter
            };
            if (fontSize !== null && !isNaN(fontSize)) { // 增加 NaN 检查
                cardData.fontSize = fontSize;
            }
            if (lineHeight !== null && !isNaN(lineHeight)) { // 增加 NaN 检查
                cardData.lineHeight = lineHeight;
            }
            parsedCards.contentCards.push(cardData);
        }
    });

    return parsedCards;
}

// +++ 新增：帮助函数，用于安全地读取和更新 topicsMeta.js +++
async function updateTopicsMetaFile(topicId, newDescription) {
    const metaFilePath = path.resolve(projectRoot, 'src', 'config', 'topicsMeta.js');
    try {
        const content = await fs.readFile(metaFilePath, 'utf-8');

        // 使用正则表达式查找并替换描述 (简单但可能有风险)
        // 匹配: { id: 'topicId', title: "...", description: "..." }
        // 注意：需要处理引号 (' 或 ") 和可能的逗号
        const entryRegex = new RegExp(`({(?:\\s*\\r?\\n*)*id:\\s*(['"\`])${topicId}\\2,(?:(?:\\s*\\r?\\n*)[^}])*)description:\\s*(['"\`])(.*?)\\3`, 's');

        let updated = false;
        const newContent = content.replace(entryRegex, (match, preDesc, quoteId, quoteDesc, oldDesc) => {
            // preDesc 包含 id, title 等直到 description 之前的部分
            // quoteDesc 是 description 值的引号类型
            // oldDesc 是旧的 description 值

            // JSON.stringify 会添加双引号并转义
            const escapedNewDesc = JSON.stringify(newDescription).slice(1, -1); // 移除外层引号
            updated = true;
            console.log(`[LocalSavePlugin] Updating description for ${topicId} from "${oldDesc}" to "${escapedNewDesc}"`);
            return `${preDesc}description: ${quoteDesc}${escapedNewDesc}${quoteDesc}`;
        });

        if (!updated) {
            console.warn(`[LocalSavePlugin] Could not find entry for topicId '${topicId}' in ${metaFilePath} to update description.`);
            return { success: false, message: `未能在 topicsMeta.js 中找到 ID 为 ${topicId} 的条目。` };
        }

        // 写回文件
        await fs.writeFile(metaFilePath, newContent, 'utf-8');
        console.log(`[LocalSavePlugin] Successfully updated description for ${topicId} in ${metaFilePath}`);
        return { success: true, message: '选题简介已更新。' };

    } catch (error) {
        console.error(`[LocalSavePlugin] Error updating ${metaFilePath}:`, error);
        if (error.code === 'ENOENT') {
            return { success: false, message: `配置文件 ${metaFilePath} 未找到。` };
        }
        return { success: false, message: `更新选题简介时发生错误: ${error.message}` };
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

            // --- 中间件 3: 列出 Markdown 文件并直接计算卡片数量 ---
            server.middlewares.use('/api/list-content-files', async (req, res, next) => {
                if (req.method !== 'GET') {
                    return next();
                }
                console.log('[LocalSavePlugin] /api/list-content-files requested (calculating from MD)');
                try {
                    const markdownDir = path.resolve(projectRoot, 'src', 'markdown');
                    // const contentDir = path.resolve(projectRoot, 'src', 'content'); // 不再需要 content 目录

                    // 1. List Markdown files and extract topic IDs
                    let mdFiles = [];
                    let allMdFileNames = [];
                    try {
                        allMdFileNames = await fs.readdir(markdownDir);
                        mdFiles = allMdFileNames
                            .filter(f => f.endsWith('.md') && !f.startsWith('_')) // 过滤出 .md 文件，忽略可能存在的模板或特殊文件
                            .map(f => f.replace('.md', ''));
                    } catch (err) {
                        if (err.code === 'ENOENT') {
                            console.warn('[LocalSavePlugin] Markdown directory not found, returning empty list.');
                        } else {
                            throw err; // Rethrow other errors
                        }
                    }
                    console.log(`[LocalSavePlugin] Found MD files (topic IDs): ${mdFiles.join(', ')}`);

                    // 2. 计算每个 Markdown 文件的卡片数量
                    let mdFileDetails = [];
                    const validMdFileNames = allMdFileNames.filter(f => f.endsWith('.md') && !f.startsWith('_'));

                    for (const mdFilename of validMdFileNames) {
                        const topicId = mdFilename.replace('.md', '');
                        const mdFilePath = path.join(markdownDir, mdFilename);
                        try {
                            console.log(`[LocalSavePlugin] Processing MD file for count: ${mdFilename}`);
                            const mdContent = await fs.readFile(mdFilePath, 'utf-8');
                            const { data: frontMatter, content: mdBodyContent } = matter(mdContent);
                            // 使用辅助函数解析卡片结构
                            const parsedBody = parseMdBodyToCards(mdBodyContent, frontMatter);
                            // 计算卡片数量 (封面 + 内容卡)
                            const cardCount = 1 + (parsedBody.contentCards?.length || 0);
                            console.log(`[LocalSavePlugin] Calculated cardCount for ${topicId} from MD: ${cardCount}`);
                            mdFileDetails.push({ topicId, cardCount });
                        } catch (fileReadOrParseError) {
                            console.error(`[LocalSavePlugin] Error reading or parsing MD file ${mdFilename}:`, fileReadOrParseError);
                            // 可以选择是否在出错时添加一个标记，或者直接跳过
                            // mdFileDetails.push({ topicId, cardCount: -1 }); // 例如标记为 -1 表示错误
                        }
                    }
                    console.log(`[LocalSavePlugin] Calculated MD file details:`, mdFileDetails);

                    // 3. Send the combined response (修改字段名)
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, mdFiles, mdFileDetails })); // 使用 mdFileDetails

                } catch (error) {
                    console.error('[LocalSavePlugin] List Files: Error processing request:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: '列出文件时发生服务器内部错误。', error: error.message }));
                }
            });
            console.log('[LocalSavePlugin] API endpoint /api/list-content-files configured (calculating from MD).');

            // --- 新增中间件 5: 获取并解析单个 Markdown 内容 --- 
            server.middlewares.use('/api/get-md-content', async (req, res, next) => {
                if (req.method !== 'GET') {
                    return next();
                }
                const url = new URL(req.url, `http://${req.headers.host}`);
                const topicId = url.searchParams.get('topicId');
                console.log(`[LocalSavePlugin] /api/get-md-content requested for topicId: ${topicId}`);

                if (!topicId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Missing topicId query parameter.' }));
                    return;
                }

                try {
                    const mdFilePath = path.resolve(projectRoot, 'src', 'markdown', `${topicId}.md`);

                    // 1. 读取 Markdown 文件
                    let mdContent;
                    try {
                        mdContent = await fs.readFile(mdFilePath, 'utf-8');
                    } catch (readError) {
                        if (readError.code === 'ENOENT') {
                            res.writeHead(404, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: `Markdown 文件 ${topicId}.md 未找到。` }));
                            return;
                        } else {
                            throw new Error(`读取 Markdown 文件失败: ${readError.message}`);
                        }
                    }

                    // 2. 解析 Front Matter 和内容
                    const { data: frontMatter, content: mdBodyContent } = matter(mdContent);

                    // 3. 使用辅助函数解析卡片结构
                    const parsedBody = parseMdBodyToCards(mdBodyContent, frontMatter);

                    // 4. 组合最终的 JSON 数据
                    const responseData = {
                        headerText: frontMatter.headerText || '',
                        footerText: frontMatter.footerText || '',
                        coverCard: parsedBody.coverCard,
                        contentCards: parsedBody.contentCards,
                        mainText: parsedBody.mainText,
                        // 添加从 Front Matter 读取的 description
                        topicDescription: frontMatter.description || ''
                    };

                    // 5. 返回成功响应
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, data: responseData }));

                } catch (error) {
                    console.error(`[LocalSavePlugin] Get MD Content [${topicId}]: Error processing request:`, error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: `获取 Markdown 内容时出错: ${error.message}` }));
                }
            });
            console.log('[LocalSavePlugin] API endpoint /api/get-md-content configured.');

            // --- 新增中间件 6: 保存 Markdown 内容到文件 ---
            server.middlewares.use('/api/save-md-content', async (req, res, next) => {
                if (req.method !== 'POST') {
                    return next();
                }

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                    let requestedTopicId = 'unknown';
                    try {
                        const { topicId, content } = JSON.parse(body);
                        requestedTopicId = topicId;

                        // --- 安全性检查 ---
                        if (!topicId || typeof topicId !== 'string') {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效或缺失的 topicId。' }));
                            return;
                        }
                        if (content === undefined || content === null || typeof content !== 'string') {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效或缺失的文件内容。' }));
                            return;
                        }

                        const filename = `${topicId}.md`; // 构建文件名
                        const targetDir = path.resolve(projectRoot, 'src', 'markdown');
                        const targetPath = path.join(targetDir, path.basename(filename)); // 使用 basename 防御路径遍历

                        // 再次验证路径是否仍在预期目录内
                        if (!targetPath.startsWith(targetDir)) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '无效的文件路径，禁止访问项目外或非 src/markdown 目录。' }));
                            return;
                        }
                        // --- 安全性检查结束 ---

                        // 确保目标目录存在 (虽然通常已存在)
                        await fs.mkdir(targetDir, { recursive: true });

                        // 写入/覆盖 Markdown 文件
                        await fs.writeFile(targetPath, content, 'utf-8');
                        console.log(`[LocalSavePlugin] Successfully wrote content to ${targetPath}`);

                        // --- 可选：通知 Vite .md 文件已更改？---
                        // server.watcher.emit('change', targetPath); 
                        // 注意：如果前端直接通过 API 重新加载，可能不需要 HMR 通知
                        // 如果其他地方（如 MarkdownManager）依赖文件系统变化，则可能需要
                        // 暂时不加

                        // 返回成功响应
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: `内容已成功保存到 ${filename}。` }));

                    } catch (error) {
                        console.error(`[LocalSavePlugin] Save MD Content [${requestedTopicId}]: Error processing request:`, error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        // 避免在错误消息中暴露完整路径或其他敏感信息
                        const userFriendlyMessage = error instanceof SyntaxError ? '请求体 JSON 解析失败。' : '保存 Markdown 内容时发生服务器内部错误。';
                        res.end(JSON.stringify({ success: false, message: userFriendlyMessage }));
                    }
                });
            });
            console.log('[LocalSavePlugin] API endpoint /api/save-md-content configured.');

            // +++ 新增：中间件 6: 更新 topicsMeta.js 中的简介 +++
            server.middlewares.use('/api/update-topic-meta', async (req, res, next) => {
                if (req.method !== 'POST') {
                    return next();
                }
                console.log('[LocalSavePlugin] /api/update-topic-meta requested');

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                    try {
                        const { topicId, description } = JSON.parse(body);
                        if (!topicId || typeof description !== 'string') {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, message: '请求参数无效，需要 topicId 和 description。' }));
                            return;
                        }

                        const result = await updateTopicsMetaFile(topicId, description);

                        if (result.success) {
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(result));
                        } else {
                            // 根据错误类型返回不同的状态码可能更好，这里简化处理
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(result));
                        }

                    } catch (error) {
                        console.error('[LocalSavePlugin] /api/update-topic-meta Error:', error);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, message: '处理更新选题简介请求时发生服务器内部错误。', error: error.message }));
                    }
                });
            });
            console.log('[LocalSavePlugin] API endpoint /api/update-topic-meta configured.');
        }
    };
} 