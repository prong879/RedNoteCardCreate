<template>
    <div class="template4">
        <!-- 封面卡片 -->
        <div v-if="type === 'cover'" class="xhs-card cover-card w-80 aspect-[9/16]">
            <h1 class="text-3xl font-bold mb-6">{{ title }}</h1>
            <p class="text-lg whitespace-pre-line">{{ content.subtitle }}</p>
        </div>

        <!-- 内容卡片 -->
        <div v-else-if="type === 'content'" class="xhs-card content-card w-80 aspect-[9/16]">
            <h3 class="text-xl font-semibold mb-4 text-green-800">{{ content.title }}</h3>
            <div class="markdown-content katex-compatible flex-grow overflow-y-auto text-sm" v-html="renderContent(content.content)"></div>
        </div>
    </div>
</template>

<script>
// 导入渲染函数
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    name: 'Template4', // 修改组件名称
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
        renderContent(text) {
            return renderMarkdownAndLaTeX(text);
        }
    }
}
</script>

<style scoped>
/* 模板4 特定样式 */
.template4 .cover-card {
    font-family: 'Arial', sans-serif; /* 使用不同字体 */
    display: flex;
    flex-direction: column;
    justify-content: flex-end; /* 内容靠下对齐 */
    align-items: center;
    text-align: center;
    padding: 1.5rem; /* 调整内边距 */
    color: white;
    background: linear-gradient(to top, #10B981 0%, #34D399 100%); /* 绿色渐变 */
}

.template4 .content-card {
    font-family: 'Arial', sans-serif;
    padding: 1rem; /* 调整内边距 */
    display: flex;
    flex-direction: column;
    background-color: #F0FDF4; /* 浅绿色背景 */
}

.template4 .markdown-content {
    line-height: 1.6;
}

/* KaTeX 兼容性样式 (保持不变) */
.katex-compatible :deep(.katex-display) {
    margin: 0.5em 0;
    overflow-x: auto;
    overflow-y: hidden;
}

.katex-compatible :deep(.katex) {
    font-size: 1.1em;
}
</style> 