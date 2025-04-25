const fs = require('fs');
const path = require('path');
const matter = require('gray-matter'); // 需要先 npm install gray-matter --save-dev

// --- 核心转换函数 ---
function convertFile(inputFilePath) {
    if (!fs.existsSync(inputFilePath)) {
        console.error(`❌ 错误：文件未找到 ${inputFilePath}`);
        return false; // 表示转换失败
    }

    console.log(`   - 正在处理: ${path.basename(inputFilePath)}`);

    try {
        const fileContent = fs.readFileSync(inputFilePath, 'utf8');
        const { data: frontMatter, content: originalMarkdownContent } = matter(fileContent);

        const topicId = frontMatter.topicId;
        if (!topicId || typeof topicId !== 'string') {
            console.error(`   ❌ 错误：文件 ${path.basename(inputFilePath)} Front Matter 中缺少有效的 \`topicId\`。`);
            return false;
        }

        // --- 提取 Front Matter 数据 (不再读取 mainText) ---
        const headerText = frontMatter.headerText || '';
        const footerText = frontMatter.footerText || '';
        let mainText = ''; // <--- 直接初始化为空字符串
        const coverShowHeader = frontMatter.coverShowHeader !== undefined ? frontMatter.coverShowHeader : true;
        const coverShowFooter = frontMatter.coverShowFooter !== undefined ? frontMatter.coverShowFooter : true;
        const contentDefaultShowHeader = frontMatter.contentDefaultShowHeader !== undefined ? frontMatter.contentDefaultShowHeader : true;
        const contentDefaultShowFooter = frontMatter.contentDefaultShowFooter !== undefined ? frontMatter.contentDefaultShowFooter : true;

        let markdownContentForCards = originalMarkdownContent.trim();

        // --- 查找并提取 ## Main Text 或 ## 主文案 --- 
        const mainTextMarkerEn = '\n## Main Text\n';
        const mainTextMarkerZh = '\n## 主文案\n';
        let mainTextStartIndex = markdownContentForCards.indexOf(mainTextMarkerEn);
        let markerLength = mainTextMarkerEn.length;

        if (mainTextStartIndex === -1) {
            mainTextStartIndex = markdownContentForCards.indexOf(mainTextMarkerZh);
            markerLength = mainTextMarkerZh.length;
        }

        if (mainTextStartIndex !== -1) {
            // console.log(`   ℹ️ 在正文中找到主文案标记。`); // 日志信息可以保留或移除
            mainText = markdownContentForCards.substring(mainTextStartIndex + markerLength).trim();
            markdownContentForCards = markdownContentForCards.substring(0, mainTextStartIndex).trim();
        }
        // else {
        //    console.log(`   ℹ️ 未在正文中找到主文案标记...`); // 不再需要 fallback 日志
        // }

        // --- 处理卡片内容 ---
        const cardContents = markdownContentForCards.split(/\r?\n---\r?\n/);

        // 错误检查：如果既没有卡片内容，也没有从正文提取到主文案，则报错
        if (cardContents.length === 0 || (cardContents.length === 1 && !cardContents[0].trim())) {
            if (!mainText) {
                console.error(`   ❌ 错误：文件 ${path.basename(inputFilePath)} 内容为空或格式不正确（既无卡片内容，也未在正文找到 ## Main Text 区域）。`);
                return false;
            }
            console.warn(`   ⚠️ 警告：文件 ${path.basename(inputFilePath)} 未找到封面卡片或内容卡片部分。`);
            cardContents.unshift('');
        }

        // 处理封面卡片 (即使内容为空也要处理，以防只有 mainText)
        const coverContentRaw = (cardContents[0] || '').trim();
        let coverTitle = frontMatter.title || ''; // 从 Front Matter 获取默认标题
        let coverSubtitle = '';
        const coverLines = coverContentRaw.split(/\r?\n/);
        const titleIndex = coverLines.findIndex(line => line.trim().startsWith('# '));
        if (titleIndex !== -1) {
            coverTitle = coverLines[titleIndex].trim().substring(2).trim(); // Markdown 标题覆盖 Front Matter 标题
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
            // 如果 Markdown 中没有 `# ` 标题，但有内容，则内容视为副标题
            if (coverContentRaw) {
                coverSubtitle = coverContentRaw;
                if (coverTitle === frontMatter.title) { // 且 Front Matter title 也未被覆盖
                    console.warn(`   ⚠️ 警告：文件 ${path.basename(inputFilePath)} 封面卡片未找到一级标题 (#)。使用Front Matter的title '${coverTitle}'。`);
                } else {
                    console.warn(`   ⚠️ 警告：文件 ${path.basename(inputFilePath)} 封面卡片未找到一级标题 (#)。`);
                }
            } else if (!coverTitle) { // 如果 Markdown内容为空，且Front Matter title也为空
                console.warn(`   ⚠️ 警告：文件 ${path.basename(inputFilePath)} 封面卡片标题和内容均为空。`);
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
        // 从索引 1 开始，因为索引 0 是封面
        for (let i = 1; i < cardContents.length; i++) {
            const cardContentRaw = cardContents[i].trim();
            if (!cardContentRaw) continue;
            let cardTitle = '';
            let cardBody = '';
            let cardShowHeader = contentDefaultShowHeader;
            let cardShowFooter = contentDefaultShowFooter;
            const cardLines = cardContentRaw.split(/\r?\n/);
            const cardTitleIndex = cardLines.findIndex(line => line.trim().match(/^#+\s+/));
            if (cardTitleIndex !== -1) {
                cardTitle = cardLines[cardTitleIndex].trim().replace(/^#+\s+/, '').trim();
                cardBody = cardLines.slice(cardTitleIndex + 1).join('\n').trim();
            } else {
                console.warn(`   ⚠️ 警告：文件 ${path.basename(inputFilePath)} 内容卡片 ${i} 未找到标题。`);
                cardBody = cardContentRaw;
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
            contentCards.push({
                title: cardTitle,
                body: cardBody,
                showHeader: cardShowHeader,
                showFooter: cardShowFooter
            });
        }

        // 构建最终对象
        const outputObject = {
            headerText,
            footerText,
            coverCard,
            contentCards,
            mainText // 这个 mainText 现在只可能来自正文标记，否则为空字符串
        };

        // 生成 JS 文件内容
        const outputJsonString = JSON.stringify(outputObject, null, 4);
        const outputJsContent = `// ${path.join('src/content', `${topicId}_content.js`).replace(/\\/g, '/')}
// Generated from: ${path.basename(inputFilePath)} at ${new Date().toISOString()}

export const ${topicId}_contentData = ${outputJsonString};
`;

        // 写入 JS 文件
        const outputDir = path.resolve(__dirname, '../src/content');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        const outputFilePath = path.join(outputDir, `${topicId}_content.js`);
        fs.writeFileSync(outputFilePath, outputJsContent, 'utf8');
        console.log(`   ✅ 成功生成: ${path.relative(path.resolve(__dirname, '..'), outputFilePath).replace(/\\/g, '/')}`);
        return true; // 表示转换成功
    } catch (error) {
        console.error(`   ❌ 处理文件 ${path.basename(inputFilePath)} 时发生错误:`, error);
        return false;
    }
}

// --- 脚本入口 ---
const target = process.argv[2];
const markdownDir = path.resolve(__dirname, '../src/markdown');

if (!target) {
    console.error('错误：请提供 topicId 或 \'all\' 作为参数！');
    console.log('用法: npm run zhuanhuan -- <topicId|all>');
    process.exit(1);
}

if (!fs.existsSync(markdownDir)) {
    console.error(`错误：Markdown 源文件目录未找到 ${markdownDir}`);
    process.exit(1);
}

let successCount = 0;
let failureCount = 0;

if (target.toLowerCase() === 'all') {
    console.log(`模式: all - 正在转换 ${markdownDir} 中的所有 .md 文件...`);
    try {
        const files = fs.readdirSync(markdownDir);
        const markdownFiles = files.filter(file => path.extname(file).toLowerCase() === '.md');

        if (markdownFiles.length === 0) {
            console.log('🤷 未在目录中找到 .md 文件。');
        } else {
            markdownFiles.forEach(file => {
                const filePath = path.join(markdownDir, file);
                if (convertFile(filePath)) {
                    successCount++;
                } else {
                    failureCount++;
                }
            });
        }
    } catch (error) {
        console.error(`读取目录 ${markdownDir} 时发生错误:`, error);
        process.exit(1);
    }
} else {
    console.log(`模式: single - 正在转换 topicId 为 '${target}' 的文件...`);
    const inputFilePath = path.join(markdownDir, `${target}.md`);
    if (convertFile(inputFilePath)) {
        successCount++;
    } else {
        failureCount++;
    }
}

console.log('\n--- 转换完成 ---');
console.log(`成功: ${successCount}`);
console.log(`失败: ${failureCount}`);

if (failureCount > 0) {
    process.exit(1); // 如果有失败，则以错误码退出
} 