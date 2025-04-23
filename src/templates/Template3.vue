<template>
    <div class="template3">
        <!-- 封面卡片 -->
        <div v-if="type === 'cover'"
            class="xhs-card cover-card flex flex-col justify-end items-start p-8 text-left bg-gradient-to-br from-yellow-400 to-orange-500">
            <p class="text-lg whitespace-pre-line mb-4 font-light opacity-90">{{ content.subtitle }}</p>
            <h1 class="text-5xl font-extrabold">{{ title }}</h1>
        </div>

        <!-- 内容卡片 -->
        <div v-else-if="type === 'content'" class="xhs-card content-card flex flex-col p-6 bg-white">
            <h3 class="text-2xl font-bold mb-5 text-gray-800 relative pl-4 ">
                <span class="absolute left-0 top-0 bottom-0 w-1 bg-xhs-pink rounded-full"></span>
                {{ content.title }}
            </h3>
            <div class="markdown-content flex-grow text-gray-700 katex-compatible"
                v-html="renderContent(content.content)"></div>
        </div>
    </div>
</template>

<script>
// 导入新的渲染函数
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    name: 'Template3',
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
.template3 .cover-card {
    font-family: 'Montserrat', sans-serif;
    /* 使用现代无衬线字体 */
    color: white;
}

.template3 .content-card {
    font-family: 'Lato', sans-serif;
    /* 使用现代无衬线字体 */
}

.template3 .markdown-content {
    font-size: 16px;
    line-height: 1.8;
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