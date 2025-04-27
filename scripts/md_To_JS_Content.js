/**
 * @description 将 Markdown 选题源文件转换为 Vue 应用所需的 JS 数据文件。
 *
 * 该脚本读取 src/markdown/ 目录下的 .md 文件，解析其 YAML Front Matter 和
 * 使用特定分隔符 (---) 分隔的卡片内容，将其转换为符合 Vue 应用数据结构的
 * JavaScript 对象，并最终生成或覆盖 src/content/ 目录下对应的 _content.js 文件。
 *
 * @usage
 * 在项目根目录下运行以下命令：
 * # 转换单个文件
 * npm run zhuanhuan -- <topicId>
 * # 转换所有文件
 * npm run zhuanhuan -- all
 *
 * @example
 * npm run zhuanhuan -- topic01
 * npm run zhuanhuan -- all
 *
 * @param {string} topicId|all - 要转换的 Markdown 文件对应的 topicId (不含 .md 后缀)，或使用 "all" 处理 src/markdown/ 下的所有 .md 文件。
 *
 * @input
 * src/markdown/<topicId>.md 文件，需遵循特定格式规范 (见 README.md)。
 *
 * @output
 * 在 src/content/ 目录下生成或覆盖名为 <topicId>_content.js 的数据文件。
 * 文件导出一个名为 <topicId>_contentData 的常量。
 */

// 引入 Node.js 内置的文件系统模块
const fs = require('fs');
// 引入 Node.js 内置的路径处理模块
const path = require('path');
// 引入 gray-matter 库，用于解析 Markdown 文件中的 YAML Front Matter
// 需要先通过 npm install gray-matter --save-dev 或 yarn add gray-matter --dev 安装
const matter = require('gray-matter');

// --- 辅助函数：截断长字符串用于日志输出 ---
function truncateString(str, maxLength = 50) {
    if (typeof str !== 'string') return str; // 如果不是字符串直接返回
    if (str.length <= maxLength) {
        return str;
    }
    return str.substring(0, maxLength - 3) + '...';
}

// --- 核心转换函数：处理单个 Markdown 文件 ---
function convertFile(inputFilePath) {
    const baseName = path.basename(inputFilePath);
    console.log(`
[处理文件] ${baseName}`); // 标记开始处理哪个文件

    // 检查输入文件是否存在
    if (!fs.existsSync(inputFilePath)) {
        console.error(`  ❌ 错误：文件未找到 ${inputFilePath}`);
        return false;
    }

    try {
        // 读取和解析
        const fileContent = fs.readFileSync(inputFilePath, 'utf8');
        const { data: frontMatter, content: originalMarkdownContent } = matter(fileContent);
        console.log(`  - Front Matter 解析成功。`);

        // 提取和验证 topicId
        const topicId = frontMatter.topicId;
        if (!topicId || typeof topicId !== 'string') {
            console.error(`    ❌ 错误：Front Matter 中缺少有效的 'topicId' 字符串。`);
            return false;
        }
        console.log(`    - Topic ID: '${topicId}'`);

        // 提取 Front Matter 元数据 (不再逐一打印)
        const headerText = frontMatter.headerText || '';
        const footerText = frontMatter.footerText || '';
        const coverShowHeader = frontMatter.coverShowHeader !== undefined ? frontMatter.coverShowHeader : true;
        const coverShowFooter = frontMatter.coverShowFooter !== undefined ? frontMatter.coverShowFooter : true;
        const contentDefaultShowHeader = frontMatter.contentDefaultShowHeader !== undefined ? frontMatter.contentDefaultShowHeader : true;
        const contentDefaultShowFooter = frontMatter.contentDefaultShowFooter !== undefined ? frontMatter.contentDefaultShowFooter : true;

        // 提取主文案
        let markdownContentForCards = originalMarkdownContent.trim();
        let mainText = '';
        const mainTextMarkerEn = '\n## Main Text\n';
        const mainTextMarkerZh = '\n## 主文案\n';
        let mainTextStartIndex = markdownContentForCards.indexOf(mainTextMarkerEn);
        let markerLength = 0;
        if (mainTextStartIndex !== -1) {
            markerLength = mainTextMarkerEn.length;
        } else {
            mainTextStartIndex = markdownContentForCards.indexOf(mainTextMarkerZh);
            if (mainTextStartIndex !== -1) {
                markerLength = mainTextMarkerZh.length;
            }
        }
        if (mainTextStartIndex !== -1) {
            mainText = markdownContentForCards.substring(mainTextStartIndex + markerLength).trim();
            markdownContentForCards = markdownContentForCards.substring(0, mainTextStartIndex).trim();
            console.log(`    - 主文案: 找到 (长度: ${mainText.length})`);
        } else {
            console.log(`    - 主文案: 未找到`);
        }

        // 处理卡片内容
        const cardContents = markdownContentForCards.split(/(?:\r?\n\s*){1,}---\s*(?:\r?\n\s*)*/);
        console.log(`  - 内容分割: 找到 ${cardContents.length} 个部分 (含封面)`);

        // 健全性检查
        if (cardContents.length === 0 || (cardContents.length === 1 && !cardContents[0].trim() && !mainText)) {
            console.error(`    ❌ 错误：文件内容似乎为空或格式不正确。`);
            return false;
        }
        if (cardContents.length === 1 && !cardContents[0].trim() && mainText) {
            console.warn(`    ⚠️ 警告：未找到有效的封面或内容卡片部分，只有主文案。`);
            cardContents.unshift(''); // 插入空封面以便处理
        }

        // 处理封面卡片
        const coverContentRaw = (cardContents[0] || '').trim();
        let coverTitle = frontMatter.title || '';
        let coverSubtitle = '';
        const coverLines = coverContentRaw.split(/\r?\n/);
        const titleIndex = coverLines.findIndex(line => line.trim().startsWith('# '));
        if (titleIndex !== -1) {
            coverTitle = coverLines[titleIndex].trim().substring(2).trim();
            let subtitleStartIndex = coverLines.findIndex((line, idx) => idx > titleIndex && line.trim() !== '');
            if (subtitleStartIndex !== -1) {
                coverSubtitle = coverLines.slice(subtitleStartIndex).join('\n').trim();
            }
        } else if (coverContentRaw) {
            coverSubtitle = coverContentRaw;
            if (coverTitle === frontMatter.title && coverTitle) {
                console.warn(`    ⚠️ 警告：封面卡片缺少一级标题 (#)。`);
            }
        }
        const coverCard = {
            title: coverTitle,
            subtitle: coverSubtitle,
            showHeader: coverShowHeader,
            showFooter: coverShowFooter
        };

        // 处理内容卡片
        const contentCards = [];
        const showHeaderRegex = /<!--\s*cardShowHeader\s*:\s*(true|false)\s*-->/i;
        const showFooterRegex = /<!--\s*cardShowFooter\s*:\s*(true|false)\s*-->/i;
        for (let i = 1; i < cardContents.length; i++) {
            const cardContentRaw = cardContents[i].trim();
            if (!cardContentRaw) continue;
            let cardTitle = '';
            let cardBody = cardContentRaw; // 默认全部是 body
            let cardShowHeader = contentDefaultShowHeader;
            let cardShowFooter = contentDefaultShowFooter;
            const cardLines = cardContentRaw.split(/\r?\n/);
            const cardTitleIndex = cardLines.findIndex(line => line.trim().match(/^#+\s+/));
            if (cardTitleIndex !== -1) {
                cardTitle = cardLines[cardTitleIndex].trim().replace(/^#+\s+/, '').trim();
                cardBody = cardLines.slice(cardTitleIndex + 1).join('\n').trim();
            } else {
                console.warn(`    ⚠️ 警告：内容卡片 ${i} 未找到标题 (#...)。`);
            }
            const headerMatch = cardBody.match(showHeaderRegex);
            if (headerMatch) {
                cardShowHeader = headerMatch[1].toLowerCase() === 'true';
                cardBody = cardBody.replace(showHeaderRegex, '').trim();
            }
            const footerMatch = cardBody.match(showFooterRegex);
            if (footerMatch) {
                cardShowFooter = footerMatch[1].toLowerCase() === 'true';
                cardBody = cardBody.replace(showFooterRegex, '').trim();
            }
            contentCards.push({ title: cardTitle, body: cardBody, showHeader: cardShowHeader, showFooter: cardShowFooter });
        }
        console.log(`  - 卡片处理: 封面卡片 + ${contentCards.length} 个内容卡片`);

        // 构建最终对象
        const outputObject = { headerText, footerText, coverCard, contentCards, mainText };

        // 生成 JS 文件内容
        const outputJsonString = JSON.stringify(outputObject, null, 4);
        const outputJsContent = `// ${path.join('src/content', `${topicId}_content.js`).replace(/\\/g, '/')}
// Generated from: ${baseName} at ${new Date().toISOString()}

export const ${topicId}_contentData = ${outputJsonString};
`;

        // 写入 JS 文件
        const outputDir = path.resolve(__dirname, '../src/content');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputFilePath = path.join(outputDir, `${topicId}_content.js`);
        const relativeOutputFilePath = path.relative(path.resolve(__dirname, '..'), outputFilePath).replace(/\\/g, '/');
        fs.writeFileSync(outputFilePath, outputJsContent, { encoding: 'utf8' });
        console.log(`  ✅ 成功生成 JS 文件: ${relativeOutputFilePath}`);
        return true;

    } catch (error) {
        // 捕获包括 YAML 解析错误在内的所有错误
        console.error(`  ❌ 处理文件 ${baseName} 时发生错误:`);

        // 检查是否是 YAML 解析错误，并提供更具体的定位信息
        if (error.name === 'YAMLException' && error.mark) {
            console.error(`     错误类型: YAML Front Matter 解析失败`);
            console.error(`     原因: ${error.reason}`);
            // error.mark.line 通常是 0 索引的，加 1 得到实际行号
            const errorLine = error.mark.line + 1;
            console.error(`     位置: 大约在 Markdown 文件的第 ${errorLine} 行附近`);
            console.error(`     上下文片段:`);
            console.error(`       \`\`\`\n       ${error.mark.snippet || error.mark.buffer?.split('\n')[error.mark.line] || '无法获取上下文'}\n       \`\`\``);
            console.error(`     👉 请检查第 ${errorLine} 行及其前后几行的 YAML Front Matter 语法，特别注意：`);
            console.error(`        - 字符串是否正确使用单引号 (' 或双引号 (" 包裹？`);
            console.error(`        - 内部引号是否正确转义（单引号内用 \', 双引号内用 \\"）？`);
            console.error(`        - 是否有未正确配对的引号？`);
            console.error(`        - 冒号 (:) 后面是否有空格？`);
            console.error(`        - 缩进是否正确（通常不需要缩进）？`);
            console.error(`        - 是否包含未正确处理的特殊字符？`);
        } else {
            // 对于其他类型的错误，打印完整的错误信息和堆栈
            console.error(`     错误类型: ${error.name || '未知错误'}`);
            console.error(error); // 打印详细错误对象，包括堆栈跟踪
        }
        return false;
    }
}

// --- 脚本入口点 --- 
console.log('--- 开始执行 Markdown 转 JS 内容脚本 ---');
// 获取命令行传入的第三个参数 (topicId 或 'all')
const target = process.argv[2];
// 定义 Markdown 源文件所在的目录路径
const markdownDir = path.resolve(__dirname, '../src/markdown');
console.log(`1. 解析参数和路径...`);
console.log(`   - 目标参数: ${target}`);
console.log(`   - 源目录: ${markdownDir}`);

// 检查是否提供了目标参数
if (!target) {
    console.error('❌ 错误：未提供 topicId 或 all 作为参数！');
    console.log('   用法: npm run zhuanhuan -- <topicId|all>');
    process.exit(1); // 缺少参数，退出脚本
}

// 检查 Markdown 源文件目录是否存在
console.log(`2. 检查源目录是否存在...`);
if (!fs.existsSync(markdownDir)) {
    console.error(`❌ 错误：Markdown 源文件目录未找到 ${markdownDir}`);
    process.exit(1); // 源目录不存在，退出脚本
}
console.log(`   - 源目录存在。`);

// 初始化成功和失败计数器
let successCount = 0;
let failureCount = 0;
const failedFiles = []; // 记录转换失败的文件名

// 判断是处理所有文件还是单个文件
if (target.toLowerCase() === 'all') {
    // --- 处理所有文件 --- 
    console.log(`3. 模式: all - 准备转换 ${markdownDir} 中的所有 .md 文件...`);
    try {
        // 读取源目录下的所有文件名
        const files = fs.readdirSync(markdownDir);
        // 过滤出所有以 .md 结尾的文件 (不区分大小写)
        const markdownFiles = files.filter(file => path.extname(file).toLowerCase() === '.md');
        console.log(`   - 在源目录中找到 ${markdownFiles.length} 个 .md 文件: ${markdownFiles.join(', ')}`);

        // 如果没有找到 Markdown 文件
        if (markdownFiles.length === 0) {
            console.log('   🤷 未找到需要转换的 .md 文件。');
        } else {
            // 遍历所有 Markdown 文件
            markdownFiles.forEach(file => {
                const filePath = path.join(markdownDir, file);
                // 调用核心转换函数处理每个文件
                if (convertFile(filePath)) {
                    successCount++; // 成功则计数器加 1
                } else {
                    failureCount++; // 失败则计数器加 1
                    failedFiles.push(path.basename(filePath)); // 记录失败的文件名
                }
            });
        }
    } catch (error) {
        // 如果读取目录时发生错误
        console.error(`❌ 读取源目录 ${markdownDir} 时发生错误:`, error);
        process.exit(1);
    }
} else {
    // --- 处理单个文件 --- 
    console.log(`3. 模式: single - 准备转换 topicId 为 '${target}' 的文件...`);
    // 构建单个 Markdown 文件的完整路径
    const inputFilePath = path.join(markdownDir, `${target}.md`);
    console.log(`   - 输入文件路径: ${inputFilePath}`);
    // 调用核心转换函数处理该文件
    if (convertFile(inputFilePath)) {
        successCount++;
    } else {
        failureCount++;
        failedFiles.push(path.basename(inputFilePath));
    }
}

// --- 打印最终结果 --- 
console.log('\n--- 转换完成 ---');
console.log(`✅ 成功: ${successCount}`);
console.log(`❌ 失败: ${failureCount}`);

// 如果有失败的文件，打印失败的文件列表
if (failureCount > 0) {
    console.log(`   - 失败的文件列表: ${failedFiles.join(', ')}`);
    process.exit(1); // 以错误码退出
} else {
    console.log('🎉 所有文件转换成功！');
}

console.log('--- Markdown 转 JS 内容脚本执行完毕 ---'); 