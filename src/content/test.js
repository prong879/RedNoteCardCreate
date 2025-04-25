// src\content\topic02_content.js
// Generated from: topic02.md at 2025-04-25T05:38:11.810Z

export const topic02_contentData = {
    "headerText": "@测试用户",
    "footerText": "测试页脚\n第二行",
    "coverCard": {
        "title": "封面卡片标题 (Topic 02)",
        "subtitle": "这是封面的副标题。\n支持换行。",
        "showHeader": false,
        "showFooter": false
    },
    "contentCards": [
        {
            "title": "内容卡片 1 标题",
            "body": "这是内容卡片 1 的正文。\n\n支持 **Markdown** 和 $LaTeX$ 公式 $\\alpha + \\beta$。",
            "showHeader": true,
            "showFooter": true
        },
        {
            "title": "内容卡片 2 标题 (隐藏头尾)",
            "body": "这是内容卡片 2 的正文。\n\n此卡片通过 HTML 注释设置了不显示页眉和页脚。",
            "showHeader": true,
            "showFooter": true
        },
        {
            "title": "内容卡片 3 标题 (默认头尾)",
            "body": "```javascript\n// 测试代码块\nfunction greet() {\n  console.log(\"Hello!\");\n}\n```\n\n使用默认的页眉和页脚设置。",
            "showHeader": true,
            "showFooter": true
        }
    ],
    "mainText": "这是 Topic 02 的主文案。\n用于测试 Markdown 转换功能。\n"
};
