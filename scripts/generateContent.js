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
        const { data: frontMatter, content: markdownContent } = matter(fileContent);

        const topicId = frontMatter.topicId;
        if (!topicId || typeof topicId !== 'string') {
            console.error(`   ❌ 错误：文件 ${path.basename(inputFilePath)} Front Matter 中缺少有效的 \`topicId\`。`);
            return false;
        }

        const headerText = frontMatter.headerText || '';
        const footerText = frontMatter.footerText || '';
        const mainText = frontMatter.mainText || '';
        const coverShowHeader = frontMatter.coverShowHeader !== undefined ? frontMatter.coverShowHeader : true;
        const coverShowFooter = frontMatter.coverShowFooter !== undefined ? frontMatter.coverShowFooter : true;
        const contentDefaultShowHeader = frontMatter.contentDefaultShowHeader !== undefined ? frontMatter.contentDefaultShowHeader : true;
        const contentDefaultShowFooter = frontMatter.contentDefaultShowFooter !== undefined ? frontMatter.contentDefaultShowFooter : true;

        const cardContents = markdownContent.trim().split(/\r?\n---\r?\n/);

        if (cardContents.length < 1 || !cardContents[0].trim()) {
            console.error(`   ❌ 错误：文件 ${path.basename(inputFilePath)} 内容为空或格式不正确。`);
            return false;
        }

        // 处理封面卡片
        const coverContentRaw = cardContents[0].trim();
        let coverTitle = '';
        let coverSubtitle = '';
        const coverLines = coverContentRaw.split(/\r?\n/);
        const titleIndex = coverLines.findIndex(line => line.trim().startsWith('# '));
        if (titleIndex !== -1) {
            coverTitle = coverLines[titleIndex].trim().substring(2).trim();
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
            console.warn(`   ⚠️ 警告：文件 ${path.basename(inputFilePath)} 封面卡片未找到一级标题 (#)。`);
            coverSubtitle = coverContentRaw;
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
            mainText
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