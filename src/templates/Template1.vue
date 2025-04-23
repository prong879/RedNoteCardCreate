<template>
    <div class="template1">
        <!-- 封面卡片 -->
        <div v-if="type === 'cover'" class="xhs-card cover-card w-80 aspect-[3/4]">
            <h1 class="text-4xl font-bold mb-10">{{ title }}</h1>
            <p class="text-xl whitespace-pre-line">{{ content.subtitle }}</p>
        </div>

        <!-- 内容卡片 -->
        <div v-else-if="type === 'content'" class="xhs-card content-card w-80 aspect-[3/4]">
            <h3 class="card-title text-xhs-black">{{ content.title }}</h3>
            <div class="markdown-content katex-compatible flex-grow overflow-y-auto" v-html="renderContent(content.content)"></div>
        </div>
    </div>
</template>

<script>
// 导入新的渲染函数
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    name: 'Template1',
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
.template1 .cover-card {
    font-family: 'PingFang SC', sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    padding: 2rem;
    color: white;
    background: linear-gradient(135deg, #FF2442 0%, #FF8A98 100%);
}

.template1 .content-card {
    font-family: 'PingFang SC', sans-serif;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
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