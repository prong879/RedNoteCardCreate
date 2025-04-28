import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const topicsMetaPath = path.resolve(__dirname, '../src/content/topicsMeta.js');

// --- 辅助函数：截断长字符串用于日志输出 ---
export function truncateString(str, maxLength = 50) {
    if (typeof str !== 'string') return str; // 如果不是字符串直接返回
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength - 3) + '...';
}

// --- 辅助函数：读取并解析 topicsMeta.js ---
export function readTopicsMeta() {
    // console.log(`  [Meta Util] Reading: ${path.basename(topicsMetaPath)}`);
    try {
        if (!fs.existsSync(topicsMetaPath)) {
            // console.warn(`    [Meta Util] Warning: File not found, returning empty array.`);
            return [];
        }
        const content = fs.readFileSync(topicsMetaPath, 'utf8');
        const match = content.match(/export\s+const\s+topicsMeta\s*=\s*(\[[\s\S]*?\])\s*;?/);
        if (match && match[1]) {
            try {
                const parsedArray = new Function(`return ${match[1]};`)();
                // console.log(`    [Meta Util] Parsed successfully, found ${parsedArray.length} entries.`);
                return parsedArray;
            } catch (parseError) {
                console.error(`    [Meta Util] ❌ Error parsing array: ${parseError.message}`);
                console.error(`       Content snippet: ${truncateString(match[1], 100)}`);
                return null;
            }
        } else {
            console.error(`    [Meta Util] ❌ Could not find 'export const topicsMeta = [...]' structure.`);
            return null;
        }
    } catch (error) {
        console.error(`    [Meta Util] ❌ Error reading file: ${error.message}`);
        return null;
    }
}

// --- 辅助函数：写回 topicsMeta.js ---
export function writeTopicsMeta(metaArray) {
    // console.log(`  [Meta Util] Preparing to write ${metaArray.length} entries to: ${path.basename(topicsMetaPath)}`);
    try {
        // 手动格式化每个对象以生成 JS 代码字符串
        const arrayString = metaArray.map(item => {
            const idStr = `id: '${item.id.replace(/'/g, "\\'")}'`; // 转义单引号
            // Handle potentially missing title/description during intermediate states
            const titleStr = `title: '${(item.title || '').replace(/'/g, "\\'")}'`;
            const descriptionStr = `description: '${(item.description || '').replace(/'/g, "\\'")}'`;
            return `    {
        ${idStr},
        ${titleStr},
        ${descriptionStr}
    }`;
        }).join(',\n'); // 用逗号和换行连接

        // 先计算好路径字符串并替换反斜杠
        const relativePathComment = path.join('src/content', 'topicsMeta.js').replace(/\\/g, '/');

        const fileContent = `// ${relativePathComment}
// Generated/Updated by script at ${new Date().toISOString()}
// 用于存储选题的核心信息，与具体每次编辑的内容分开

export const topicsMeta = [
${arrayString}
];
`;
        fs.writeFileSync(topicsMetaPath, fileContent, 'utf8');
        // console.log(`    [Meta Util] ✅ File written successfully.`);
        return true;
    } catch (error) {
        console.error(`    [Meta Util] ❌ Error writing file: ${error.message} `);
        return false;
    }
} 