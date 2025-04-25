const fs = require('fs');
const path = require('path');

// --- 获取命令行参数 ---
// process.argv[0] = 'node'
// process.argv[1] = 'scripts/newTopic.js'
// process.argv[2] = topicId
// process.argv[3..] = mainTitle parts
const topicId = process.argv[2];
const mainTitleParts = process.argv.slice(3);
const mainTitle = mainTitleParts.join(' ');

// --- 参数校验 ---
if (!topicId) {
    console.error('错误：请提供 topicId 作为第一个参数！');
    console.log('用法: npm run xinwenan -- <topicId> <主标题>');
    process.exit(1);
}

if (mainTitleParts.length === 0) {
    console.error('错误：请提供主标题作为第二个参数！');
    console.log('用法: npm run xinwenan -- <topicId> <主标题>');
    process.exit(1);
}

// 验证 topicId 格式 (可选，例如只允许字母、数字、下划线、短横线)
const validTopicIdRegex = /^[a-zA-Z0-9_-]+$/;
if (!validTopicIdRegex.test(topicId)) {
    console.error(`错误：topicId "${topicId}" 包含无效字符。只允许字母、数字、下划线和短横线。`);
    process.exit(1);
}

console.log(`准备创建新选题:`);
console.log(`  Topic ID: ${topicId}`);
console.log(`  主标题:   ${mainTitle}`);

// --- 定义 Markdown 模板 ---
// 使用 JSON.stringify 确保 mainTitle 中的特殊字符 (如引号) 被正确转义
const template = `--- 
topicId: ${topicId}
title: ${JSON.stringify(mainTitle)} 
headerText: "" 
footerText: "" 
mainText: | 
  
coverShowHeader: true 
coverShowFooter: true 
contentDefaultShowHeader: true 
contentDefaultShowFooter: true 
--- 

# ${mainTitle}

封面副标题

---

## 内容卡片 1 标题

内容卡片 1 正文
`;

// --- 检查文件是否存在并写入 ---
const outputDir = path.resolve(__dirname, '../src/markdown');
const outputFilePath = path.join(outputDir, `${topicId}.md`);

// 确保目录存在
if (!fs.existsSync(outputDir)) {
    try {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`创建目录: ${outputDir}`);
    } catch (error) {
        console.error(`错误：无法创建目录 ${outputDir}:`, error);
        process.exit(1);
    }
}

// 检查文件是否已存在
if (fs.existsSync(outputFilePath)) {
    console.error(`错误：文件已存在 ${outputFilePath}。请选择不同的 topicId 或手动删除该文件。`);
    process.exit(1);
}

// 写入文件
try {
    fs.writeFileSync(outputFilePath, template, 'utf8');
    console.log(`✅ 成功创建文件: ${outputFilePath}`);
} catch (error) {
    console.error(`❌ 写入文件时发生错误 ${outputFilePath}:`, error);
    process.exit(1);
} 