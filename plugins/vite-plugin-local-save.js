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

// --- 辅助函数：解析请求体 ---
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                // 返回特定错误类型，以便上层区分
                const parseError = new Error('请求体 JSON 解析失败。');
                parseError.name = 'JSONParseError';
                reject(parseError);
            }
        });
        req.on('error', err => {
            reject(err); // 网络等其他错误
        });
    });
}

// --- 辅助函数：发送 JSON 响应 ---
function sendJsonResponse(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

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
            // 返回特定错误类型
            const notFoundError = new Error(`未能在 topicsMeta.js 中找到 ID 为 ${topicId} 的条目。`);
            notFoundError.code = 'ENOENT_LOGICAL'; // 自定义代码表示逻辑上未找到
            throw notFoundError;
        }

        // 写回文件
        await fs.writeFile(metaFilePath, newContent, 'utf-8');
        console.log(`[LocalSavePlugin] Successfully updated description for ${topicId} in ${metaFilePath}`);
        return { success: true, message: '选题简介已更新。' };

    } catch (error) {
        console.error(`[LocalSavePlugin] Error updating ${metaFilePath}:`, error);
        if (error.code === 'ENOENT') {
            error.message = `配置文件 ${metaFilePath} 未找到。`;
        }
        throw error;
    }
}

// +++ 新增：帮助函数，用于安全地读取和更新 topicsMeta.js 中的 cardCount +++\nasync function updateTopicsMetaCount(topicId, newCount) {\n    const metaFilePath = path.resolve(projectRoot, 'src', 'config', 'topicsMeta.js');\n    console.log(`[LocalSavePlugin] Attempting to update cardCount for ${topicId} to ${newCount} in ${metaFilePath}`);\n    try {\n        let content = await fs.readFile(metaFilePath, 'utf-8');\n\n        // 移除可能的 BOM 字符 (以防万一)\n        content = content.replace(/^\uFEFF/, '');\n\n        // 正则表达式查找对应的条目并捕获 cardCount 部分\n        // 匹配: { ... id: 'topicId', ..., cardCount: NUMBER, ... } 或 { ... id: 'topicId', ... } (无 cardCount)\n        // 捕获组 1: 条目开始到 cardCount 之前的部分 (或整个条目，如果没有 cardCount)\n        // 捕获组 2: (可选) cardCount 属性名\n        // 捕获组 3: (可选) cardCount 的旧值\n        // 捕获组 4: 条目 cardCount 之后的部分 (或空，如果没有 cardCount 或在末尾)\n        // 改进正则以处理可能没有 cardCount 的情况，以及属性顺序问题\n        const entryRegex = new RegExp(\n            `({(?:\\s*\\r?\\n*)[^}]*?id:\\s*['"\`]${topicId}['"\`][^}]*?)` + // (1) Start of object up to id: 'topicId', non-greedily\n            `(?:(,\\s*\\r?\\n*cardCount:\\s*)(\\d+))?` +             // (2, 3) Optional: comma, 'cardCount:', number\n            `([^}]*})`,                                              // (4) Rest of the object\n            's' // 's' flag allows . to match newline characters\n        );\n\n        let updated = false;\n        const newContent = content.replace(entryRegex, (match, preCardCountPart, commaAndKey, oldCount, postCardCountPart) => {\n            updated = true;\n            let updatedEntry;\n            if (commaAndKey) {\n                // cardCount 存在，替换旧值\n                console.log(`[LocalSavePlugin] Found existing cardCount for ${topicId}: ${oldCount}. Replacing with ${newCount}.`);\n                updatedEntry = `${preCardCountPart}${commaAndKey}${newCount}${postCardCountPart}`;\n            } else {\n                // cardCount 不存在，在 } 前添加\n                console.log(`[LocalSavePlugin] cardCount not found for ${topicId}. Adding cardCount: ${newCount}.`);\n                 // postCardCountPart 在这种情况下是 } 之前的最后一个非 } 字符开始的部分\n                 // 我们需要在 preCardCountPart 和 postCardCountPart 之间插入 , cardCount: newCount\n                const trimmedPre = preCardCountPart.trimRight(); // 移除末尾空白\n                const needsComma = trimmedPre.endsWith(',') ? '' : ','; // 检查是否需要加逗号\n                updatedEntry = `${preCardCountPart}${needsComma} cardCount: ${newCount}${postCardCountPart}`;\n\n            }\n            console.log(`[LocalSavePlugin] Updated entry for ${topicId}: ${updatedEntry}`);\n            return updatedEntry;\n        });\n\n\n        if (!updated) {\n            console.warn(`[LocalSavePlugin] Could not find entry for topicId '${topicId}' in ${metaFilePath} to update cardCount.`);\n            // 注意：这里不应该返回错误，因为保存文件本身是成功的\n            // 可能是 topicsMeta.js 尚未包含该 topicId 的条目 (例如新建文件时)\n            // 这种情况可以忽略，或者在 list-content-files 时再同步\n            return { success: false, message: `未能在 topicsMeta.js 中找到 ID 为 ${topicId} 的条目来更新卡片计数。` }; // 返回内部状态\n        }\n\n        // 写回文件\n        await fs.writeFile(metaFilePath, newContent, 'utf-8');\n        console.log(`[LocalSavePlugin] Successfully updated cardCount for ${topicId} to ${newCount} in ${metaFilePath}`);\n        return { success: true }; // 返回内部状态\n\n    } catch (error) {\n        console.error(`[LocalSavePlugin] Error updating cardCount in ${metaFilePath} for ${topicId}:`, error);\n        // 同样，保存文件本身是成功的，这里只记录日志\n        return { success: false, message: `更新 ${metaFilePath} 中的卡片计数时发生错误: ${error.message}` }; // 返回内部状态\n    }\n}\n\n/**\n * Vite 插件，用于在开发模式下处理来自前端的本地文件保存请求。\n */
export default function localSavePlugin() {
    // --- 辅助函数定义 ---
    // (parseMdBodyToCards, updateTopicsMetaFile, updateTopicsMetaCount 保持在工厂函数内部)
    function parseMdBodyToCards(mdBodyContent, frontMatter) {
        const parts = mdBodyContent.trim().split(/\r?\n---\r?\n/);
        const parsedCards = {
            coverCard: { title: '', subtitle: '', showHeader: frontMatter.coverShowHeader !== false, showFooter: frontMatter.coverShowFooter !== false },
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
            let title = titleMatch ? titleMatch[1].trim() : '';
            let bodyContent = titleMatch ? part.substring(titleMatch[0].length).trim() : part;
            const createCommentRegex = (key) => new RegExp(`<!--\\s*${key}:\\s*(.*?)\\s*-->`);
            const showHeaderMatch = bodyContent.match(createCommentRegex(cardConstants.MD_COMMENT_SHOW_HEADER_KEY));
            const showFooterMatch = bodyContent.match(createCommentRegex(cardConstants.MD_COMMENT_SHOW_FOOTER_KEY));
            const fontSizeMatch = bodyContent.match(createCommentRegex(cardConstants.MD_COMMENT_FONT_SIZE_KEY));
            const lineHeightMatch = bodyContent.match(createCommentRegex(cardConstants.MD_COMMENT_LINE_HEIGHT_KEY));
            let showHeader = frontMatter.contentDefaultShowHeader !== false;
            let showFooter = frontMatter.contentDefaultShowFooter !== false;
            let fontSize = null;
            let lineHeight = null;
            if (showHeaderMatch) showHeader = showHeaderMatch[1] === 'true';
            if (showFooterMatch) showFooter = showFooterMatch[1] === 'true';
            if (fontSizeMatch) fontSize = parseInt(fontSizeMatch[1], 10);
            if (lineHeightMatch) lineHeight = parseFloat(lineHeightMatch[1]);
            const keys = [cardConstants.MD_COMMENT_SHOW_HEADER_KEY, cardConstants.MD_COMMENT_SHOW_FOOTER_KEY, cardConstants.MD_COMMENT_FONT_SIZE_KEY, cardConstants.MD_COMMENT_LINE_HEIGHT_KEY].join('|');
            const removeRegex = new RegExp(`<!--\\s*(${keys}):\\s*.*?\\s*-->\\r?\n?`, 'gs');
            bodyContent = bodyContent.replace(removeRegex, '').trim();
            if (index === 0) {
                parsedCards.coverCard.title = title || frontMatter.title || '';
                parsedCards.coverCard.subtitle = bodyContent;
                if (showHeaderMatch) parsedCards.coverCard.showHeader = showHeader;
                if (showFooterMatch) parsedCards.coverCard.showFooter = showFooter;
            } else {
                const cardData = { title, body: bodyContent, showHeader, showFooter };
                if (fontSize !== null && !isNaN(fontSize)) { cardData.fontSize = fontSize; }
                if (lineHeight !== null && !isNaN(lineHeight)) { cardData.lineHeight = lineHeight; }
                parsedCards.contentCards.push(cardData);
            }
        });
        return parsedCards;
    }
    async function updateTopicsMetaFile(topicId, newDescription) {
        const metaFilePath = path.resolve(projectRoot, 'src', 'config', 'topicsMeta.js');
        try {
            const content = await fs.readFile(metaFilePath, 'utf-8');
            const entryRegex = new RegExp(`({(?:\\s*\\r?\n*)*id:\\s*(['"\`])${topicId}\\2,(?:(?:\\s*\\r?\n*)[^}])*)description:\\s*(['"\`])(.*?)\\3`, 's');
            let updated = false;
            const newContent = content.replace(entryRegex, (match, preDesc, quoteId, quoteDesc, oldDesc) => {
                const escapedNewDesc = JSON.stringify(newDescription).slice(1, -1);
                updated = true;
                console.log(`[LocalSavePlugin] Updating description for ${topicId} from "${oldDesc}" to "${escapedNewDesc}"`);
                return `${preDesc}description: ${quoteDesc}${escapedNewDesc}${quoteDesc}`;
            });
            if (!updated) {
                console.warn(`[LocalSavePlugin] Could not find entry for topicId '${topicId}' in ${metaFilePath} to update description.`);
                // 返回特定错误类型
                const notFoundError = new Error(`未能在 topicsMeta.js 中找到 ID 为 ${topicId} 的条目。`);
                notFoundError.code = 'ENOENT_LOGICAL'; // 自定义代码表示逻辑上未找到
                throw notFoundError;
            }
            await fs.writeFile(metaFilePath, newContent, 'utf-8');
            console.log(`[LocalSavePlugin] Successfully updated description for ${topicId} in ${metaFilePath}`);
            return { success: true, message: '选题简介已更新。' };
        } catch (error) {
            console.error(`[LocalSavePlugin] Error updating description in ${metaFilePath} for ${topicId}:`, error);
            // 向上抛出错误，让调用者处理 HTTP 响应
            if (error.code === 'ENOENT') {
                error.message = `配置文件 ${metaFilePath} 未找到。`;
            }
            throw error;
        }
    }
    async function updateTopicsMetaCount(topicId, newCount, metaFilePath) {
        console.log(`[LocalSavePlugin] updateTopicsMetaCount: Attempting for ${topicId} to ${newCount} in ${metaFilePath}`);
        try {
            let content = await fs.readFile(metaFilePath, 'utf-8');
            content = content.replace(/^\uFEFF/, ''); // 移除 BOM

            // --- 使用 JSON 解析和更新 --- 
            let topicsData = JSON.parse(content);
            const topicIndex = topicsData.findIndex(t => t.id === topicId);
            let updated = false;

            if (topicIndex !== -1) {
                // 找到条目，更新 cardCount
                if (topicsData[topicIndex].cardCount !== newCount) {
                    console.log(`[LocalSavePlugin] updateTopicsMetaCount: Updating cardCount for ${topicId} from ${topicsData[topicIndex].cardCount} to ${newCount}.`);
                    topicsData[topicIndex].cardCount = newCount;
                    updated = true;
                } else {
                    console.log(`[LocalSavePlugin] updateTopicsMetaCount: Count for ${topicId} is already ${newCount}. Skipping.`);
                    // 即使值相同，也认为逻辑上更新成功
                    updated = true;
                }
            } else {
                // 未找到条目，需要考虑是否在此处添加。根据当前设计，保存时会调用，list 时如果发现不一致也会调用。
                // 如果 list 时发现 md 存在但 meta 不存在，应该在这里添加。
                // 但此函数最初是为 sync-topic-count 设计的，可能假设条目已存在。
                // 为了 list-content-files 的逻辑，我们允许在这里添加。
                console.warn(`[LocalSavePlugin] updateTopicsMetaCount: Entry for topicId '${topicId}' not found. Assuming new topic, adding with count ${newCount}.`);
                // 需要 title 和 description，但此函数没有这些信息。
                // 暂时只添加 id 和 count，或者让 list-content-files 处理添加操作。
                // 决定：此函数只负责更新现有条目，添加由 list-content-files 处理。
                const notFoundError = new Error(`未能在 ${metaFilePath} 中找到 ID 为 ${topicId} 的条目来更新卡片计数。`);
                notFoundError.code = 'ENOENT_LOGICAL';
                throw notFoundError;
            }

            // 如果数据有更新，则写回文件
            if (updated && topicsData[topicIndex].cardCount === newCount) { // 再次确认更新成功
                await fs.writeFile(metaFilePath, JSON.stringify(topicsData, null, 4), 'utf-8'); // 使用格式化写入
                console.log(`[LocalSavePlugin] updateTopicsMetaCount: Successfully updated cardCount for ${topicId} to ${newCount}.`);
            }
            return { success: true };

        } catch (error) {
            console.error(`[LocalSavePlugin] updateTopicsMetaCount: Error for ${topicId}:`, error);
            if (error instanceof SyntaxError) { // JSON 解析错误
                error.message = `解析元数据文件 ${metaFilePath} 时出错： ${error.message}`;
            }
            if (error.code === 'ENOENT') {
                error.message = `配置文件 ${metaFilePath} 未找到。`;
            }
            throw error; // 将错误抛给调用者
        }
    }

    // --- 新增：安全地读取和解析 JSON 元数据文件 ---
    async function readTopicsMeta(metaFilePath) {
        try {
            const content = await fs.readFile(metaFilePath, 'utf-8');
            return JSON.parse(content.replace(/^\uFEFF/, ''));
        } catch (error) {
            console.error(`[LocalSavePlugin] Error reading or parsing ${metaFilePath}:`, error);
            if (error.code === 'ENOENT') {
                console.warn(`[LocalSavePlugin] Meta file ${metaFilePath} not found. Returning empty array.`);
                return []; // 文件不存在则返回空数组
            } else if (error instanceof SyntaxError) {
                console.error(`[LocalSavePlugin] Failed to parse JSON from ${metaFilePath}.`);
            }
            throw error; // 其他错误继续抛出
        }
    }

    // --- 新增：安全地写入 JSON 元数据文件 --- 
    async function writeTopicsMeta(metaFilePath, data) {
        try {
            await fs.writeFile(metaFilePath, JSON.stringify(data, null, 4), 'utf-8');
            console.log(`[LocalSavePlugin] Successfully wrote updates to ${metaFilePath}.`);
        } catch (error) {
            console.error(`[LocalSavePlugin] Error writing to ${metaFilePath}:`, error);
            throw error; // 抛出错误给调用者处理
        }
    }

    // --- API 处理函数 ---

    // 处理 /api/save-markdown-template (POST)
    async function handleSaveMarkdownTemplate(req, res) {
        console.log('[LocalSavePlugin] Handling /api/save-markdown-template');
        try {
            const { filename, content, overwrite = false } = await parseBody(req);
            const targetDir = path.resolve(projectRoot, 'src', 'markdown');
            const targetPath = path.join(targetDir, path.basename(filename));

            // 安全性检查
            if (!filename || typeof filename !== 'string' || !filename.endsWith('.md') || !targetPath.startsWith(targetDir)) {
                console.warn('[LocalSavePlugin] /api/save-markdown-template: Invalid request parameters or path.');
                return sendJsonResponse(res, 400, { success: false, message: '无效请求参数或路径。' });
            }

            let fileExists = false;
            try { await fs.access(targetPath); fileExists = true; } catch { /* file doesn't exist */ }

            if (fileExists && !overwrite) {
                console.log(`[LocalSavePlugin] /api/save-markdown-template: File ${filename} exists, overwrite=false.`);
                return sendJsonResponse(res, 409, { success: false, code: 'FILE_EXISTS', message: `文件 ${filename} 已存在，无法覆盖。` });
            }
            if (fileExists && overwrite) { console.log(`[LocalSavePlugin] /api/save-markdown-template: Overwriting ${filename}.`); }

            await fs.mkdir(targetDir, { recursive: true });
            await fs.writeFile(targetPath, content, 'utf-8');
            const successMessage = fileExists && overwrite ? `Markdown 文件 ${filename} 已成功更新（覆盖）。` : `Markdown 文件 ${filename} 已成功保存。`;
            console.log(`[LocalSavePlugin] /api/save-markdown-template: ${successMessage}`);
            sendJsonResponse(res, 200, { success: true, message: successMessage });

        } catch (error) {
            console.error('[LocalSavePlugin] /api/save-markdown-template Error:', error);
            if (error.name === 'JSONParseError') {
                sendJsonResponse(res, 400, { success: false, message: error.message });
            } else if (error.code === 'EACCES' || error.code === 'EPERM') {
                sendJsonResponse(res, 403, { success: false, message: '保存文件时权限不足。' });
            } else {
                sendJsonResponse(res, 500, { success: false, message: '保存 Markdown 模板时发生未知服务器错误。' });
            }
        }
    }

    // 处理 /api/list-content-files (GET)
    async function handleListContentFiles(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const quickLoad = url.searchParams.get('quick') === 'true';
        console.log(`[LocalSavePlugin] Handling /api/list-content-files (Quick: ${quickLoad})`);

        const metaFilePath = path.resolve(projectRoot, 'src', 'config', 'topicsMeta.json');
        const markdownDir = path.resolve(projectRoot, 'src', 'markdown');

        try {
            // --- Quick Load 模式 --- 
            if (quickLoad) {
                const topicsData = await readTopicsMeta(metaFilePath);
                // 只需要返回元数据中的基本信息
                const mdFiles = topicsData.map(t => t.id);
                const mdFileDetails = topicsData.map(t => ({
                    topicId: t.id,
                    title: t.title,
                    description: t.description,
                    cardCount: t.cardCount
                }));
                console.log(`[LocalSavePlugin] Quick load: Returning ${mdFileDetails.length} topics from meta file.`);
                return sendJsonResponse(res, 200, { success: true, mdFiles, mdFileDetails });
            }

            // --- Full Sync 模式 --- 
            console.log('[LocalSavePlugin] Full sync mode: Reading meta file and scanning markdown directory...');
            let metaTopics = await readTopicsMeta(metaFilePath);
            const metaTopicsMap = new Map(metaTopics.map(t => [t.id, t]));
            let mdFilenames = [];
            try {
                mdFilenames = (await fs.readdir(markdownDir)).filter(f => f.endsWith('.md') && !f.startsWith('_'));
            } catch (err) {
                if (err.code === 'ENOENT') { console.warn('[LocalSavePlugin] Markdown directory not found.'); }
                else { throw err; } // 其他错误向上抛
            }

            const mdFilesSet = new Set(mdFilenames.map(f => f.replace('.md', '')));
            let needsMetaUpdate = false;
            let updatedMetaTopics = [...metaTopics]; // 创建副本以进行修改

            // 并行处理所有找到的 Markdown 文件
            const fileProcessingPromises = mdFilenames.map(async (mdFilename) => {
                const topicId = mdFilename.replace('.md', '');
                const mdFilePath = path.join(markdownDir, mdFilename);
                try {
                    const mdContent = await fs.readFile(mdFilePath, 'utf-8');
                    const { data: frontMatter, content: mdBodyContent } = matter(mdContent);
                    const parsedBody = parseMdBodyToCards(mdBodyContent, frontMatter);
                    const actualCardCount = 1 + (parsedBody.contentCards?.length || 0);
                    const actualTitle = frontMatter.title || topicId; // Fallback title
                    const actualDescription = frontMatter.description || '';

                    return {
                        topicId,
                        cardCount: actualCardCount,
                        title: actualTitle,
                        description: actualDescription
                    };
                } catch (e) {
                    console.error(`[LocalSavePlugin] Error processing ${mdFilename} for full sync:`, e);
                    return { topicId, error: true }; // 标记处理失败
                }
            });

            const processedMdResults = await Promise.all(fileProcessingPromises);
            const processedMap = new Map(processedMdResults.filter(r => !r.error).map(r => [r.topicId, r]));

            // 对比并更新元数据副本
            processedMap.forEach(mdData => {
                const metaData = metaTopicsMap.get(mdData.topicId);
                const topicIndex = updatedMetaTopics.findIndex(t => t.id === mdData.topicId);

                if (metaData) { // Meta 中存在
                    let changed = false;
                    if (metaData.title !== mdData.title) { updatedMetaTopics[topicIndex].title = mdData.title; changed = true; }
                    if (metaData.description !== mdData.description) { updatedMetaTopics[topicIndex].description = mdData.description; changed = true; }
                    if (metaData.cardCount !== mdData.cardCount) { updatedMetaTopics[topicIndex].cardCount = mdData.cardCount; changed = true; }
                    if (changed) {
                        console.log(`[LocalSavePlugin] Sync: Updating meta for ${mdData.topicId}`);
                        needsMetaUpdate = true;
                    }
                } else { // Meta 中不存在，是新文件
                    console.log(`[LocalSavePlugin] Sync: Adding new topic ${mdData.topicId} to meta.`);
                    updatedMetaTopics.push(mdData); // 直接添加
                    needsMetaUpdate = true;
                }
            });

            // 检查 Meta 中存在但 MD 文件不存在的情况 (孤立数据)
            const orphanedTopics = [];
            updatedMetaTopics = updatedMetaTopics.filter(metaTopic => {
                if (mdFilesSet.has(metaTopic.id)) {
                    return true; // 保留
                } else {
                    console.warn(`[LocalSavePlugin] Sync: Topic ${metaTopic.id} exists in meta but not in markdown. Marking as orphaned.`);
                    orphanedTopics.push(metaTopic.id);
                    // 决定：暂时保留孤立条目，但可以在前端标记出来，或提供清理功能。不在此处自动删除。
                    // 如果需要删除： return false; needsMetaUpdate = true;
                    return true; // 暂时保留
                }
            });

            // 如果元数据有变化，则写回文件
            if (needsMetaUpdate) {
                console.log('[LocalSavePlugin] Writing updated meta file...');
                await writeTopicsMeta(metaFilePath, updatedMetaTopics);
            }

            // 返回最终同步后的数据
            const finalMdFiles = Array.from(mdFilesSet);
            const finalMdFileDetails = updatedMetaTopics.map(t => ({
                topicId: t.id,
                title: t.title,
                description: t.description,
                cardCount: t.cardCount
            }));
            console.log(`[LocalSavePlugin] Full sync finished. Returning ${finalMdFileDetails.length} topics.`);
            return sendJsonResponse(res, 200, { success: true, mdFiles: finalMdFiles, mdFileDetails: finalMdFileDetails });

        } catch (error) {
            console.error('[LocalSavePlugin] /api/list-content-files Error:', error);
            if (error.message?.includes('权限不足')) {
                sendJsonResponse(res, 403, { success: false, message: error.message });
            } else {
                sendJsonResponse(res, 500, { success: false, message: '列出内容文件时发生未知服务器错误。' });
            }
        }
    }

    // 处理 /api/get-md-content (GET)
    async function handleGetMdContent(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const topicId = url.searchParams.get('topicId');
        console.log(`[LocalSavePlugin] Handling /api/get-md-content for ${topicId}`);

        if (!topicId) {
            console.warn('[LocalSavePlugin] /api/get-md-content: Missing topicId.');
            return sendJsonResponse(res, 400, { success: false, message: '缺少 topicId 查询参数。' });
        }
        try {
            const mdFilePath = path.resolve(projectRoot, 'src', 'markdown', `${topicId}.md`);
            let mdContent;
            try { mdContent = await fs.readFile(mdFilePath, 'utf-8'); } catch (readError) {
                if (readError.code === 'ENOENT') {
                    console.log(`[LocalSavePlugin] /api/get-md-content: File not found ${topicId}.md`);
                    return sendJsonResponse(res, 404, { success: false, message: `Markdown 文件 ${topicId}.md 未找到。` });
                } else { throw readError; }
            }
            const { data: frontMatter, content: mdBodyContent } = matter(mdContent);
            const parsedBody = parseMdBodyToCards(mdBodyContent, frontMatter);
            const responseData = {
                headerText: frontMatter.headerText || '',
                footerText: frontMatter.footerText || '',
                coverCard: parsedBody.coverCard,
                contentCards: parsedBody.contentCards,
                mainText: parsedBody.mainText,
                topicDescription: frontMatter.description || ''
            };
            sendJsonResponse(res, 200, { success: true, data: responseData });
        } catch (error) {
            console.error(`[LocalSavePlugin] /api/get-md-content Error for ${topicId}:`, error);
            if (error.code === 'ENOENT') {
                sendJsonResponse(res, 404, { success: false, message: `Markdown 文件 ${topicId}.md 未找到。` });
            } else if (error.code === 'EACCES') {
                sendJsonResponse(res, 403, { success: false, message: `读取文件 ${topicId}.md 时权限不足。` });
            } else if (error instanceof matter.MatterError) { // 检查是否是 gray-matter 解析错误
                sendJsonResponse(res, 500, { success: false, message: `解析文件 ${topicId}.md 时出错：${error.message}` });
            } else {
                sendJsonResponse(res, 500, { success: false, message: `获取 ${topicId} 内容时发生未知服务器错误。` });
            }
        }
    }

    // 处理 /api/save-md-content (POST)
    async function handleSaveMdContent(req, res) {
        let requestedTopicId = 'unknown';
        try {
            const { topicId, content } = await parseBody(req);
            requestedTopicId = topicId;
            console.log(`[LocalSavePlugin] Handling /api/save-md-content for ${topicId}`);

            const targetDir = path.resolve(projectRoot, 'src', 'markdown');
            const filename = `${topicId}.md`;
            const targetPath = path.join(targetDir, path.basename(filename));
            const metaFilePath = path.resolve(projectRoot, 'src', 'config', 'topicsMeta.json'); // <--- 改为 JSON

            // 安全性检查
            if (!topicId || typeof content !== 'string' || !targetPath.startsWith(targetDir)) {
                console.warn('[LocalSavePlugin] /api/save-md-content: Invalid request parameters or path.');
                return sendJsonResponse(res, 400, { success: false, message: '无效请求参数或路径。' });
            }

            await fs.mkdir(targetDir, { recursive: true });
            await fs.writeFile(targetPath, content, 'utf-8');
            console.log(`[LocalSavePlugin] /api/save-md-content: Saved ${filename}`);

            let metaUpdateSuccess = true;
            let updateResultMessage = '';
            try {
                const { data: frontMatter, content: mdBodyContent } = matter(content);
                const parsedBody = parseMdBodyToCards(mdBodyContent, frontMatter);
                const cardCount = 1 + (parsedBody.contentCards?.length || 0);
                console.log(`[LocalSavePlugin] /api/save-md-content: Calculated count ${cardCount} for ${topicId}. Attempting meta update.`);
                // --- 修改：调用修改后的 updateTopicsMetaCount (如果需要同步 title/desc，则调用新逻辑) --- 
                // 简单的做法是只更新 cardCount
                const updateResult = await updateTopicsMetaCount(topicId, cardCount, metaFilePath);
                if (!updateResult.success) {
                    metaUpdateSuccess = false;
                    updateResultMessage = updateResult.message || '更新卡片计数失败';
                }
                // 如果还需要更新 title 和 description，需要扩展 updateTopicsMetaCount 或新建函数
                // 暂不实现 title/desc 同步
            } catch (e) {
                metaUpdateSuccess = false;
                updateResultMessage = e.message || '更新元数据时出错';
                console.error(`[LocalSavePlugin] /api/save-md-content: Error parsing content or updating meta count for ${topicId}:`, e);
            }

            const message = `内容已成功保存到 ${filename}。` + (metaUpdateSuccess ? '' : ` 但更新元数据失败: ${updateResultMessage}`);
            sendJsonResponse(res, metaUpdateSuccess ? 200 : 207, { success: true, message: message, metaUpdateSuccess: metaUpdateSuccess }); // 用 207 表示部分操作失败

        } catch (error) {
            console.error(`[LocalSavePlugin] /api/save-md-content Error for ${requestedTopicId}:`, error);
            if (error.name === 'JSONParseError') {
                sendJsonResponse(res, 400, { success: false, message: error.message });
            } else if (error.code === 'EACCES' || error.code === 'EPERM') {
                sendJsonResponse(res, 403, { success: false, message: '保存文件时权限不足。' });
            } else {
                sendJsonResponse(res, 500, { success: false, message: '保存 Markdown 内容时发生未知服务器错误。' });
            }
        }
    }

    // 处理 /api/update-topic-meta (POST)
    async function handleUpdateTopicMeta(req, res) {
        // --- 这个 API 现在需要修改为更新 JSON 文件 --- 
        let reqTopicId = 'unknown';
        try {
            const { topicId, description } = await parseBody(req);
            reqTopicId = topicId;
            console.log(`[LocalSavePlugin] Handling /api/update-topic-meta for ${topicId}`);

            if (!topicId || typeof description !== 'string') {
                console.warn('[LocalSavePlugin] /api/update-topic-meta: Invalid parameters.');
                return sendJsonResponse(res, 400, { success: false, message: '请求参数无效，需要 topicId 和 description。' });
            }

            const metaFilePath = path.resolve(projectRoot, 'src', 'config', 'topicsMeta.json');
            let topicsData = await readTopicsMeta(metaFilePath);
            const topicIndex = topicsData.findIndex(t => t.id === topicId);

            if (topicIndex === -1) {
                return sendJsonResponse(res, 404, { success: false, message: `未找到 ID 为 ${topicId} 的选题。` });
            }

            if (topicsData[topicIndex].description !== description) {
                topicsData[topicIndex].description = description;
                await writeTopicsMeta(metaFilePath, topicsData);
                console.log(`[LocalSavePlugin] Description updated for ${topicId}.`);
                sendJsonResponse(res, 200, { success: true, message: '选题简介已更新。' });
            } else {
                console.log(`[LocalSavePlugin] Description for ${topicId} is already up to date.`);
                sendJsonResponse(res, 200, { success: true, message: '选题简介无需更新。' }); // 或者返回 304?
            }

        } catch (error) {
            console.error(`[LocalSavePlugin] /api/update-topic-meta Error for ${reqTopicId}:`, error);
            if (error.name === 'JSONParseError') {
                sendJsonResponse(res, 400, { success: false, message: error.message });
            } else if (error.code === 'ENOENT') {
                sendJsonResponse(res, 404, { success: false, message: `元数据文件未找到。` });
            } else if (error.code === 'EACCES' || error.code === 'EPERM') {
                sendJsonResponse(res, 403, { success: false, message: '更新元数据文件时权限不足。' });
            } else {
                sendJsonResponse(res, 500, { success: false, message: '处理更新选题简介请求时发生未知服务器错误。' });
            }
        }
    }

    // 处理 /api/sync-topic-count (POST)
    async function handleSyncTopicCount(req, res) {
        // --- 这个 API 现在也需要修改为更新 JSON 文件 --- 
        let reqTopicId = 'unknown';
        try {
            const { topicId, actualCount } = await parseBody(req);
            reqTopicId = topicId;
            console.log(`[LocalSavePlugin] Handling /api/sync-topic-count for ${topicId} to ${actualCount}`);

            if (!topicId || typeof actualCount !== 'number' || !Number.isInteger(actualCount) || actualCount < 0) {
                console.warn('[LocalSavePlugin] /api/sync-topic-count: Invalid parameters.');
                return sendJsonResponse(res, 400, { success: false, message: '请求参数无效，需要 topicId (string) 和 actualCount (non-negative integer)。' });
            }

            const metaFilePath = path.resolve(projectRoot, 'src', 'config', 'topicsMeta.json');
            // 直接调用修改后的 updateTopicsMetaCount (它内部会读写 JSON)
            await updateTopicsMetaCount(topicId, actualCount, metaFilePath);
            sendJsonResponse(res, 200, { success: true, message: `已为 ${topicId} 同步卡片计数到 ${actualCount}。`, updatedCount: actualCount });

        } catch (error) {
            console.error(`[LocalSavePlugin] /api/sync-topic-count Error for ${reqTopicId}:`, error);
            if (error.name === 'JSONParseError') {
                sendJsonResponse(res, 400, { success: false, message: error.message });
            } else if (error.code === 'ENOENT_LOGICAL') {
                sendJsonResponse(res, 404, { success: false, message: error.message }); // 来自 updateTopicsMetaCount
            } else if (error.code === 'ENOENT') {
                sendJsonResponse(res, 404, { success: false, message: `元数据文件未找到。` });
            } else if (error.code === 'EACCES' || error.code === 'EPERM') {
                sendJsonResponse(res, 403, { success: false, message: '更新元数据文件时权限不足。' });
            } else {
                sendJsonResponse(res, 500, { success: false, message: `同步 ${reqTopicId} 计数时发生未知服务器错误。` });
            }
        }
    }

    // +++ 修改：处理 /api/batch-sync-topic-counts (POST) 以使用 JSON --- 
    async function handleBatchSyncTopicCounts(req, res) {
        console.log('[LocalSavePlugin] Handling /api/batch-sync-topic-counts');
        try {
            const topicsToSync = await parseBody(req);

            // ... (输入验证保持不变) ...
            if (!Array.isArray(topicsToSync) || topicsToSync.length === 0) {
                return sendJsonResponse(res, 400, { success: false, message: '请求体必须是有效的非空数组。' });
            }
            for (const item of topicsToSync) {
                if (!item || typeof item.topicId !== 'string' || typeof item.actualCount !== 'number' || !Number.isInteger(item.actualCount) || item.actualCount < 0) {
                    return sendJsonResponse(res, 400, { success: false, message: '数组中的每个元素必须包含有效的 topicId (string) 和 actualCount (non-negative integer)。' });
                }
            }

            const metaFilePath = path.resolve(projectRoot, 'src', 'config', 'topicsMeta.json');
            let topicsData = await readTopicsMeta(metaFilePath);
            let needsWrite = false;
            let successfulUpdates = 0;
            let failedUpdates = [];

            // 对内存中的数据应用所有更新
            for (const { topicId, actualCount } of topicsToSync) {
                const topicIndex = topicsData.findIndex(t => t.id === topicId);
                if (topicIndex !== -1) {
                    if (topicsData[topicIndex].cardCount !== actualCount) {
                        topicsData[topicIndex].cardCount = actualCount;
                        console.log(`[LocalSavePlugin] BatchSync: Updating ${topicId} count to ${actualCount}.`);
                        needsWrite = true;
                    } else {
                        console.log(`[LocalSavePlugin] BatchSync: Count for ${topicId} is already ${actualCount}. Skipping.`);
                    }
                    successfulUpdates++;
                } else {
                    console.warn(`[LocalSavePlugin] BatchSync: Could not find entry for topicId '${topicId}' to update.`);
                    failedUpdates.push(topicId);
                }
            }

            // 如果有更改，则一次性写回文件
            if (needsWrite) {
                await writeTopicsMeta(metaFilePath, topicsData);
            }

            // ... (返回响应逻辑保持类似) ...
            if (failedUpdates.length === 0) {
                sendJsonResponse(res, 200, { success: true, message: `成功批量同步 ${successfulUpdates} 个主题的卡片计数。` });
            } else {
                sendJsonResponse(res, 207, { success: false, message: `批量同步完成，但未能找到 ${failedUpdates.length} 个主题的条目进行更新: ${failedUpdates.join(', ')}`, successfulUpdates, failedToFind: failedUpdates });
            }

        } catch (error) {
            // ... (错误处理保持类似，适配 JSON 错误) ...
            console.error('[LocalSavePlugin] /api/batch-sync-topic-counts Error:', error);
            if (error.name === 'JSONParseError') {
                sendJsonResponse(res, 400, { success: false, message: error.message });
            } else if (error.code === 'ENOENT') {
                sendJsonResponse(res, 500, { success: false, message: `读写元数据文件时出错。` });
            } else if (error.code === 'EACCES' || error.code === 'EPERM') {
                sendJsonResponse(res, 403, { success: false, message: `读写元数据文件时权限不足。` });
            } else {
                sendJsonResponse(res, 500, { success: false, message: '处理批量同步卡片计数请求时发生未知服务器错误。' });
            }
        }
    }

    // --- 插件返回的对象 ---
    return {
        name: 'local-save-handler',
        configureServer(server) {
            console.log('[LocalSavePlugin] Configuring server middleware...');

            // --- 简化中间件注册 ---

            server.middlewares.use('/api/save-markdown-template', (req, res, next) => {
                if (req.method === 'POST') { handleSaveMarkdownTemplate(req, res); }
                else { next(); }
            });
            console.log('[LocalSavePlugin] API endpoint /api/save-markdown-template configured.');

            server.middlewares.use('/api/list-content-files', (req, res, next) => {
                if (req.method === 'GET') { handleListContentFiles(req, res); }
                else { next(); }
            });
            console.log('[LocalSavePlugin] API endpoint /api/list-content-files configured.');

            server.middlewares.use('/api/get-md-content', (req, res, next) => {
                if (req.method === 'GET') { handleGetMdContent(req, res); }
                else { next(); }
            });
            console.log('[LocalSavePlugin] API endpoint /api/get-md-content configured.');

            server.middlewares.use('/api/save-md-content', (req, res, next) => {
                if (req.method === 'POST') { handleSaveMdContent(req, res); }
                else { next(); }
            });
            console.log('[LocalSavePlugin] API endpoint /api/save-md-content configured.');

            server.middlewares.use('/api/update-topic-meta', (req, res, next) => {
                if (req.method === 'POST') { handleUpdateTopicMeta(req, res); }
                else { next(); }
            });
            console.log('[LocalSavePlugin] API endpoint /api/update-topic-meta configured.');

            server.middlewares.use('/api/sync-topic-count', (req, res, next) => {
                if (req.method === 'POST') { handleSyncTopicCount(req, res); }
                else { next(); }
            });
            console.log('[LocalSavePlugin] API endpoint /api/sync-topic-count configured.');

            // +++ 新增批量同步端点注册 +++
            server.middlewares.use('/api/batch-sync-topic-counts', (req, res, next) => {
                if (req.method === 'POST') { handleBatchSyncTopicCounts(req, res); }
                else { next(); }
            });
            console.log('[LocalSavePlugin] API endpoint /api/batch-sync-topic-counts configured.');

            console.log('[LocalSavePlugin] All API endpoints configured.');
        } // configureServer 结束
    };
} 