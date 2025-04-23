<template>
    <div class="template2">
        <!-- 封面卡片 -->
        <div v-if="type === 'cover'"
            class="xhs-card cover-card flex flex-col justify-center items-center text-center p-8 bg-gradient-to-br from-blue-500 to-purple-500">
            <h1 class="text-3xl font-serif font-bold mb-8 tracking-wider">{{ title }}</h1>
            <p class="text-lg font-serif whitespace-pre-line opacity-90">{{ content.subtitle }}</p>
        </div>

        <!-- 内容卡片 -->
        <div v-else-if="type === 'content'" class="xhs-card content-card flex flex-col p-6 bg-white">
            <h3 class="text-xl font-serif font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2">{{ content.title
            }}</h3>
            <div class="markdown-content flex-grow font-serif katex-compatible" v-html="renderContent(content.content)">
            </div>
        </div>
    </div>
</template>

<script>
// 导入新的渲染函数
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    name: 'Template2',
    props: {
        type: {
            type: String,
            required: true,
            validator: (value) => ['cover', 'content'].includes(value)
        },
        title: {
            type: String,
            default: ''
        },
        content: {
            type: Object,
            required: true
        }
    },
    methods: {
        // 使用导入的渲染函数
        renderContent(text) {
            return renderMarkdownAndLaTeX(text);
        }
    }
}
</script>

<style scoped>
.template2 .cover-card {
    color: white;
    /* 保持文字白色 */
}

.template2 .content-card {
    font-family: 'Times New Roman', Times, serif;
    /* 使用衬线字体 */
}

.template2 .markdown-content {
    font-size: 17px;
    line-height: 1.7;
}

/* 为 KaTeX 公式添加一些可能的样式调整 */
.katex-compatible :deep(.katex-display) {
    margin: 0.5em 0;
    /* 为块级公式添加垂直间距 */
    overflow-x: auto;
    /* 水平滚动条 */
    overflow-y: hidden;
}

.katex-compatible :deep(.katex) {
    font-size: 1.1em;
    /* KaTeX 默认字体可能偏小 */
}
</style>