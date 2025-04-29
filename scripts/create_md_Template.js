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

// 将主要逻辑封装在 async 函数中以使用 dynamic import
async function main() {
    console.log('--- 开始执行创建 Markdown 模板脚本 ---');

    // --- 获取命令行参数 ---
    console.log('1. 解析命令行参数...');
    const topicId = process.argv[2];
    const mainTitleParts = process.argv.slice(3);
    const mainTitle = mainTitleParts.join(' ');

    console.log(`   - Topic ID: ${topicId}`);
    console.log(`   - 主标题:   ${mainTitle}`);

    // --- 参数校验 ---
    console.log('2. 校验参数...');
    if (!topicId) {
        console.error('❌ 错误：未提供 topicId！');
        console.log('   请按格式提供 topicId: npm run xinwenan -- <topicId> <主标题>');
        process.exit(1);
    }
    if (mainTitleParts.length === 0) {
        console.error('❌ 错误：未提供主标题！');
        console.log('   请按格式提供主标题: npm run xinwenan -- <topicId> <主标题>');
        process.exit(1);
    }
    const validTopicIdRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validTopicIdRegex.test(topicId)) {
        console.error(`❌ 错误：topicId "${topicId}" 包含无效字符。`);
        console.log('   Topic ID 只允许包含字母、数字、下划线和短横线。');
        process.exit(1);
    }
    console.log('   - 参数校验通过。');

    // --- 动态导入模板生成函数 --- 
    let generateMarkdownTemplate;
    try {
        const templateUtilsPath = path.resolve(__dirname, '../src/utils/templateUtils.js');
        // 使用 fileURL 格式，因为 dynamic import 需要 URL
        const templateUtilsURL = new URL(`file:///${templateUtilsPath.replace(/\\/g, '/')}`);
        const templateUtils = await import(templateUtilsURL.href);
        generateMarkdownTemplate = templateUtils.generateMarkdownTemplate;
    } catch (error) {
        console.error('❌ 错误：无法动态导入模板工具函数:', error);
        process.exit(1);
    }

    // --- 使用导入的函数生成 Markdown 模板 --- 
    console.log('3. 生成 Markdown 模板内容...');
    const template = generateMarkdownTemplate({ topicId, title: mainTitle }); // 使用默认值
    console.log('   - 模板内容已生成。');

    // --- 检查文件是否存在并写入 --- 
    console.log('4. 准备写入文件...');
    const outputDir = path.resolve(__dirname, '../src/markdown');
    const outputFilePath = path.join(outputDir, `${topicId}.md`);
    const relativeOutputFilePath = path.relative(path.resolve(__dirname, '..'), outputFilePath).replace(/\\/g, '/');

    console.log(`   - 目标目录: ${outputDir}`);
    console.log(`   - 目标文件: ${relativeOutputFilePath}`);

    console.log('   - 检查目标目录是否存在...');
    if (!fs.existsSync(outputDir)) {
        console.log(`   - 目标目录不存在，尝试创建: ${outputDir}`);
        try {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log(`   ✅ 成功创建目录: ${outputDir}`);
        } catch (error) {
            console.error(`❌ 错误：无法创建目录 ${outputDir}:`, error);
            process.exit(1);
        }
    } else {
        console.log('   - 目标目录已存在。');
    }

    console.log(`   - 检查目标文件是否已存在: ${relativeOutputFilePath}`);
    if (fs.existsSync(outputFilePath)) {
        console.error(`❌ 错误：文件已存在 ${relativeOutputFilePath}。`);
        console.log('   请选择不同的 topicId 或手动删除该文件后重试。');
        process.exit(1);
    }

    console.log(`   - 正在写入模板内容到: ${relativeOutputFilePath}`);
    try {
        fs.writeFileSync(outputFilePath, template, 'utf8');
        console.log(`✅ 成功创建并写入文件: ${relativeOutputFilePath}`);
    } catch (error) {
        console.error(`❌ 写入文件时发生错误 ${relativeOutputFilePath}:`, error);
        process.exit(1);
    }

    console.log('--- 创建 Markdown 模板脚本执行完毕 ---');
}

// 执行主函数
main().catch(error => {
    console.error("脚本执行过程中发生未捕获错误:", error);
    process.exit(1);
}); 