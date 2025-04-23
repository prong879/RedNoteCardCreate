<template>
    <div class="template5">
        <!-- 封面卡片 -->
        <div v-if="type === 'cover'" class="xhs-card cover-card w-80 aspect-[16/9]">
            <h1 class="text-2xl font-bold mb-2">{{ title }}</h1>
            <p class="text-md whitespace-pre-line">{{ content.subtitle }}</p>
        </div>

        <!-- 内容卡片 -->
        <div v-else-if="type === 'content'" class="xhs-card content-card w-80 aspect-[16/9]">
            <h3 class="text-lg font-semibold mb-3 text-purple-800">{{ content.title }}</h3>
            <div class="markdown-content katex-compatible flex-grow overflow-y-auto text-xs" v-html="renderContent(content.content)"></div>
        </div>
    </div>
</template>

<script>
// 导入渲染函数
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    name: 'Template5', // 修改组件名称
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
/* 模板5 特定样式 - 宽屏 */
.template5 .cover-card {
    font-family: 'Verdana', sans-serif; /* 使用不同字体 */
    display: flex;
    flex-direction: column;
    justify-content: center; /* 居中内容 */
    align-items: center;
    text-align: center;
    padding: 1rem; /* 调整内边距 */
    color: white;
    background: linear-gradient(45deg, #8B5CF6 0%, #C084FC 100%); /* 紫色渐变 */
}

.template5 .content-card {
    font-family: 'Verdana', sans-serif;
    padding: 0.75rem; /* 调整内边距 */
    display: flex;
    flex-direction: column;
    background-color: #F5F3FF; /* 浅紫色背景 */
}

.template5 .markdown-content {
    line-height: 1.5;
}

/* KaTeX 兼容性样式 (保持不变) */
.katex-compatible :deep(.katex-display) {
    margin: 0.5em 0;
    overflow-x: auto;
    overflow-y: hidden;
}

.katex-compatible :deep(.katex) {
    font-size: 1.0em; /* 为宽屏调整 KaTeX 大小 */
}
</style> 