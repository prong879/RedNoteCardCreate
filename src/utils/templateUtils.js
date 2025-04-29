/**
 * @fileoverview Utility functions for generating template content.
 */

/**
 * Generates the basic Markdown template string for a new topic.
 *
 * @param {object} options - Options for template generation.
 * @param {string} options.topicId - The unique ID for the topic.
 * @param {string} options.title - The main title for the topic.
 * @param {string} [options.description='在这里填写选题描述...'] - The description for the topic.
 * @param {string} [options.headerText='@园丁小区詹姆斯'] - Default header text.
 * @param {string} [options.footerText=''] - Default footer text.
 * @param {boolean} [options.coverShowHeader=true] - Default visibility for cover header.
 * @param {boolean} [options.coverShowFooter=true] - Default visibility for cover footer.
 * @param {boolean} [options.contentDefaultShowHeader=true] - Default visibility for content card headers.
 * @param {boolean} [options.contentDefaultShowFooter=true] - Default visibility for content card footers.
 * @param {number} [options.numCards=1] - Number of initial content cards to generate (used by TopicSelector).
 * @param {boolean} [options.includeMainText=true] - Whether to include the Main Text section (used by TopicSelector).
 * @returns {string} The generated Markdown template content.
 */
export function generateMarkdownTemplate(options) {
    const {
        topicId,
        title,
        description = '在这里填写选题描述...',
        headerText = '@园丁小区詹姆斯',
        footerText = '',
        coverShowHeader = true,
        coverShowFooter = true,
        contentDefaultShowHeader = true,
        contentDefaultShowFooter = true,
        numCards = 1, // Default for script compatibility, TopicSelector passes its own value
        includeMainText = true // Default for script compatibility, TopicSelector passes its own value
    } = options;

    // Front Matter generation
    let mdContent = `---
`;
    mdContent += `topicId: ${topicId}\n`;
    mdContent += `title: ${JSON.stringify(title)}\n`;
    mdContent += `description: ${JSON.stringify(description)}\n`;
    mdContent += `headerText: ${JSON.stringify(headerText)}\n`;
    mdContent += `footerText: ${JSON.stringify(footerText)}\n`;
    mdContent += `coverShowHeader: ${coverShowHeader}\n`;
    mdContent += `coverShowFooter: ${coverShowFooter}\n`;
    mdContent += `contentDefaultShowHeader: ${contentDefaultShowHeader}\n`;
    mdContent += `contentDefaultShowFooter: ${contentDefaultShowFooter}\n`;
    mdContent += `---

`;

    // Cover Card section
    mdContent += `# ${title}\n\n封面副标题\n\n`;

    // Content Card sections
    for (let i = 1; i <= numCards; i++) {
        mdContent += `---

`;
        mdContent += `## 内容卡片 ${i} 标题\n\n`;
        mdContent += `内容卡片 ${i} 正文\n\n`;
        // Add comments for card-specific visibility (optional)
        mdContent += `<!-- 可选：单独控制此卡片的页眉/页脚显隐 -->\n`;
        mdContent += `<!-- cardShowHeader: true -->\n`;
        mdContent += `<!-- cardShowFooter: true -->\n
`;
    }

    // Main Text section (conditionally added)
    if (includeMainText) {
        mdContent += `---

`;
        mdContent += `## Main Text\n\n`;
        mdContent += `在这里编写你的小红书主文案...\n`;
    }

    return mdContent;
} 