const fs = require('fs');
const path = require('path');
const matter = require('gray-matter'); // 需要先 npm install gray-matter --save-dev

// 从命令行参数获取输入的 Markdown 文件路径
const inputFile = process.argv[2];

if (!inputFile) {
    console.error('错误：请提供 Markdown 文件路径作为参数！');
    console.log('用法: node scripts/generateContent.js <markdown_file_path>');
    process.exit(1);
}

const inputFilePath = path.resolve(inputFile);

if (!fs.existsSync(inputFilePath)) {
    console.error(`错误：文件未找到 ${inputFilePath}`);
    process.exit(1);
}

console.log(`正在处理文件: ${inputFilePath}`);

try {
    // 读取 Markdown 文件内容
    const fileContent = fs.readFileSync(inputFilePath, 'utf8');

    // 解析 Front Matter 和内容
    const { data: frontMatter, content: markdownContent } = matter(fileContent);

    // --- 提取 Front Matter 数据 ---
    const topicId = frontMatter.topicId;
    if (!topicId || typeof topicId !== 'string') {
        console.error('错误：Markdown 文件 Front Matter 中缺少有效的 `topicId` (字符串类型)');
        process.exit(1);
    }

    const headerText = frontMatter.headerText || '';
    const footerText = frontMatter.footerText || '';
    const mainText = frontMatter.mainText || '';
    const coverShowHeader = frontMatter.coverShowHeader !== undefined ? frontMatter.coverShowHeader : true;
    const coverShowFooter = frontMatter.coverShowFooter !== undefined ? frontMatter.coverShowFooter : true;
    const contentDefaultShowHeader = frontMatter.contentDefaultShowHeader !== undefined ? frontMatter.contentDefaultShowHeader : true;
    const contentDefaultShowFooter = frontMatter.contentDefaultShowFooter !== undefined ? frontMatter.contentDefaultShowFooter : true;

    // --- 处理卡片内容 ---
    const cardContents = markdownContent.trim().split(/\r?\n---\r?\n/); // 使用换行符+三个短横线+换行符作为分隔符

    if (cardContents.length < 1 || !cardContents[0].trim()) {
        console.error('错误：Markdown 文件内容为空或格式不正确 (至少需要封面卡片内容)');
        process.exit(1);
    }

    // --- 处理封面卡片 ---
    const coverContentRaw = cardContents[0].trim();
    let coverTitle = '';
    let coverSubtitle = '';

    const coverLines = coverContentRaw.split(/\r?\n/);
    const titleIndex = coverLines.findIndex(line => line.trim().startsWith('# '));
    if (titleIndex !== -1) {
        coverTitle = coverLines[titleIndex].trim().substring(2).trim(); // 移除 '# '
        // 副标题是标题行后的第一个非空行开始的所有内容 (合并多行)
        const subtitleLines = [];
        for (let i = titleIndex + 1; i < coverLines.length; i++) {
            if (coverLines[i].trim()) { // 跳过标题后的空行
                subtitleLines.push(coverLines[i].trim());
            } else if (subtitleLines.length > 0) {
                // 如果已经开始记录副标题，遇到空行则停止 （简单处理，可能需要更复杂的逻辑）
                break;
            }
        }
        // 使用原始换行符合并副标题行
        let subtitleStartIndex = -1;
        for (let i = titleIndex + 1; i < coverLines.length; i++) {
            if (coverLines[i].trim() !== '') {
                subtitleStartIndex = i;
                break;
            }
        }
        if (subtitleStartIndex !== -1) {
            coverSubtitle = coverLines.slice(subtitleStartIndex).join('\n').trim();
        }
    } else {
        console.warn('警告：未在封面卡片内容中找到一级标题 (`# `)，将标题设为空。');
        // 如果没有标题，则将所有内容视为副标题
        coverSubtitle = coverContentRaw;
    }

    const coverCard = {
        title: coverTitle,
        subtitle: coverSubtitle,
        showHeader: coverShowHeader,
        showFooter: coverShowFooter
    };

    // --- 处理内容卡片 ---
    const contentCards = [];
    const showHeaderRegex = /<!--\s*cardShowHeader\s*:\s*(true|false)\s*-->/i;
    const showFooterRegex = /<!--\s*cardShowFooter\s*:\s*(true|false)\s*-->/i;

    for (let i = 1; i < cardContents.length; i++) {
        const cardContentRaw = cardContents[i].trim();
        if (!cardContentRaw) continue; // 跳过空的内容块

        let cardTitle = '';
        let cardBody = '';
        let cardShowHeader = contentDefaultShowHeader;
        let cardShowFooter = contentDefaultShowFooter;

        const cardLines = cardContentRaw.split(/\r?\n/);
        const cardTitleIndex = cardLines.findIndex(line => line.trim().match(/^#+\s+/)); // 匹配任意级别的标题

        if (cardTitleIndex !== -1) {
            cardTitle = cardLines[cardTitleIndex].trim().replace(/^#+\s+/, '').trim(); // 移除 '# ' 或 '## ' 等
            cardBody = cardLines.slice(cardTitleIndex + 1).join('\n').trim();
        } else {
            console.warn(`警告：内容卡片 ${i} 未找到标题，将标题设为空，所有内容视为 body。`);
            cardBody = cardContentRaw;
        }

        // 检查并移除 HTML 注释以覆盖显隐状态
        const headerMatch = cardBody.match(showHeaderRegex);
        if (headerMatch) {
            cardShowHeader = headerMatch[1].toLowerCase() === 'true';
            cardBody = cardBody.replace(showHeaderRegex, '').trim(); // 从 body 中移除注释
        }

        const footerMatch = cardBody.match(showFooterRegex);
        if (footerMatch) {
            cardShowFooter = footerMatch[1].toLowerCase() === 'true';
            cardBody = cardBody.replace(showFooterRegex, '').trim(); // 从 body 中移除注释
        }

        contentCards.push({
            title: cardTitle,
            body: cardBody,
            showHeader: cardShowHeader,
            showFooter: cardShowFooter
        });
    }

    // --- 构建最终 JS 对象 ---
    const outputObject = {
        headerText,
        footerText,
        coverCard,
        contentCards,
        mainText
    };

    // --- 生成 JS 文件内容 ---
    const outputJsonString = JSON.stringify(outputObject, null, 4); // 4 个空格缩进
    const outputJsContent = `// ${path.join('src/content', `${topicId}_content.js`)}
// Generated from: ${path.basename(inputFilePath)} at ${new Date().toISOString()}

export const ${topicId}_contentData = ${outputJsonString};
`;

    // --- 写入 JS 文件 ---
    const outputDir = path.resolve(__dirname, '../src/content'); // 脚本在 scripts 目录，内容在 src/content
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    const outputFilePath = path.join(outputDir, `${topicId}_content.js`);

    fs.writeFileSync(outputFilePath, outputJsContent, 'utf8');

    console.log(`✅ 成功生成文件: ${outputFilePath}`);

} catch (error) {
    console.error('❌ 处理文件时发生错误:', error);
    process.exit(1);
} 