// Generated from test01.md by Vite Plugin at 2025-04-30T02:59:34.171Z
export const test01_contentData = {
  "headerText": "@测试用户",
  "footerText": "测试页脚\n第二行",
  "coverCard": {
    "title": "封面卡片标题 (Test 01)",
    "subtitle": "测试重构是否成功\r\n这是封面的副标题。\r\n支持换行。",
    "showHeader": true,
    "showFooter": true
  },
  "contentCards": [
    {
      "title": "内容卡片 1 标题",
      "body": "这是内容卡片 1 的正文。\r\n\r\n支持 **Markdown** 和 $LaTeX$ 公式 $\\alpha + \\beta$。\r\n\r\n我输入$a+b=c$",
      "showHeader": true,
      "showFooter": true
    },
    {
      "title": "内容卡片 2 标题 (隐藏头尾)",
      "body": "这是内容卡片 2 的正文。\r\n\r\n此卡片通过 HTML 注释设置了不显示页眉和页脚。",
      "showHeader": false,
      "showFooter": false
    },
    {
      "title": "内容卡片 3 标题 (默认头尾)",
      "body": "```javascript\r\n// 测试代码块\r\nfunction greet() {\r\n  console.log(\"Hello!\");\r\n}\r\n```\r\n\r\n使用默认的页眉和页脚设置。",
      "showHeader": true,
      "showFooter": true
    }
  ],
  "mainText": "这是 Topic 02 的主文案。\r\n用于测试 Markdown 转换功能。"
};
