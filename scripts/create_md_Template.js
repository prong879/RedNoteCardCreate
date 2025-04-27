/**
 * @description 创建一个新的 Markdown 选题源文件模板。
 *
 * 该脚本根据用户提供的 topicId 和主标题，在 src/markdown 目录下生成一个预设格式的 .md 文件，
 * 包含基本的 YAML Front Matter 和卡片结构，方便用户快速开始编写新的选题内容。
 *
 * @usage
 * 在项目根目录下运行以下命令：
 * npm run xinwenan -- <topicId> <主标题>
 *
 * @example
 * npm run xinwenan -- topic02 "时间序列的季节性分解"
 *
 * @param {string} topicId - 新选题的唯一标识符 (建议使用字母、数字、下划线、短横线)。
 * @param {string} 主标题 - 新选题的主标题 (可以包含空格，如果包含特殊 shell 字符，建议用引号包裹)。
 *
 * @output
 * 在 src/markdown/ 目录下生成一个名为 <topicId>.md 的文件。
 * 如果文件已存在，脚本会报错并退出。
 */

// 引入 Node.js 内置的文件系统模块，用于文件读写操作
const fs = require('fs');
// 引入 Node.js 内置的路径处理模块，用于处理文件和目录路径
const path = require('path');

console.log('--- 开始执行创建 Markdown 模板脚本 ---');

// --- 获取命令行参数 ---
console.log('1. 解析命令行参数...');
// process.argv 是一个包含命令行参数的数组
// process.argv[0] 通常是 Node.js 可执行文件的路径
// process.argv[1] 通常是当前执行的脚本文件的路径
// process.argv[2] 是我们期望的第一个用户参数：topicId
// process.argv[3] 及其之后是我们期望的用户参数：主标题（可能包含空格，所以是数组）
const topicId = process.argv[2]; // 获取 topicId
const mainTitleParts = process.argv.slice(3); // 获取主标题的所有部分（作为数组）
const mainTitle = mainTitleParts.join(' '); // 将主标题的各个部分用空格连接起来

console.log(`   - Topic ID: ${topicId}`);
console.log(`   - 主标题:   ${mainTitle}`);

// --- 参数校验 ---
console.log('2. 校验参数...');
// 检查是否提供了 topicId
if (!topicId) {
    console.error('❌ 错误：未提供 topicId！');
    console.log('   请按格式提供 topicId: npm run xinwenan -- <topicId> <主标题>');
    process.exit(1); // 参数错误，退出脚本
}

// 检查是否提供了主标题
if (mainTitleParts.length === 0) {
    console.error('❌ 错误：未提供主标题！');
    console.log('   请按格式提供主标题: npm run xinwenan -- <topicId> <主标题>');
    process.exit(1); // 参数错误，退出脚本
}

// 验证 topicId 格式 (可选，用于确保 topicId 符合预期规范)
const validTopicIdRegex = /^[a-zA-Z0-9_-]+$/; // 正则表达式：只允许字母、数字、下划线、短横线
if (!validTopicIdRegex.test(topicId)) {
    console.error(`❌ 错误：topicId "${topicId}" 包含无效字符。`);
    console.log('   Topic ID 只允许包含字母、数字、下划线和短横线。');
    process.exit(1); // topicId 格式错误，退出脚本
}
console.log('   - 参数校验通过。');

// --- 定义 Markdown 模板 ---
console.log('3. 生成 Markdown 模板内容...');
// 使用模板字符串定义新 Markdown 文件的基本内容结构
// 使用 JSON.stringify(mainTitle) 是为了确保 mainTitle 中的特殊字符 (如引号) 在写入 YAML Front Matter 时被正确转义，符合 YAML 字符串规范
const template = `--- 
topicId: ${topicId}
title: ${JSON.stringify(mainTitle)} 
headerText: '' 
footerText: '' 
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

---

## Main Text

在这里编写你的小红书主文案...
`;
console.log('   - 模板内容已生成。');

// --- 检查文件是否存在并写入 ---
console.log('4. 准备写入文件...');
// 定义输出目录的绝对路径（脚本所在目录的上级目录的 src/markdown 子目录）
const outputDir = path.resolve(__dirname, '../src/markdown');
// 定义最终输出文件的完整路径
const outputFilePath = path.join(outputDir, `${topicId}.md`);
const relativeOutputFilePath = path.relative(path.resolve(__dirname, '..'), outputFilePath).replace(/\\/g, '/'); // 获取相对路径用于日志

console.log(`   - 目标目录: ${outputDir}`);
console.log(`   - 目标文件: ${relativeOutputFilePath}`);

// 确保输出目录存在，如果不存在则创建
console.log('   - 检查目标目录是否存在...');
if (!fs.existsSync(outputDir)) {
    console.log(`   - 目标目录不存在，尝试创建: ${outputDir}`);
    try {
        // recursive: true 允许创建嵌套目录
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`   ✅ 成功创建目录: ${outputDir}`);
    } catch (error) {
        console.error(`❌ 错误：无法创建目录 ${outputDir}:`, error);
        process.exit(1); // 创建目录失败，退出脚本
    }
} else {
    console.log('   - 目标目录已存在。');
}

// 检查目标 Markdown 文件是否已经存在
console.log(`   - 检查目标文件是否已存在: ${relativeOutputFilePath}`);
if (fs.existsSync(outputFilePath)) {
    console.error(`❌ 错误：文件已存在 ${relativeOutputFilePath}。`);
    console.log('   请选择不同的 topicId 或手动删除该文件后重试。');
    process.exit(1); // 文件已存在，退出脚本，防止覆盖
} else {
    console.log('   - 目标文件不存在，可以创建。');
}

// 写入文件
console.log(`   - 正在写入模板内容到: ${relativeOutputFilePath}`);
try {
    // 将定义的模板内容写入到目标文件路径，使用 utf8 编码
    fs.writeFileSync(outputFilePath, template, 'utf8');
    console.log(`✅ 成功创建并写入文件: ${relativeOutputFilePath}`);
} catch (error) {
    console.error(`❌ 写入文件时发生错误 ${relativeOutputFilePath}:`, error);
    process.exit(1); // 写入文件失败，退出脚本
}

console.log('--- 创建 Markdown 模板脚本执行完毕 ---'); 