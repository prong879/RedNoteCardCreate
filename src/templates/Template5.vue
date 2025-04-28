<template>
    <div class="template5 xhs-card w-80 aspect-[16/9] flex flex-col overflow-hidden" 
         :class="type === 'cover' ? 'cover-bg' : 'content-bg'" data-exportable-card="true">
        
        <!-- 页眉 -->
        <div v-if="isHeaderVisible" class="card-header flex-shrink-0 px-4 pt-2 text-xs opacity-80 whitespace-pre-line" 
             :class="type === 'cover' ? 'text-white/80' : 'text-purple-700/80'">
            {{ headerText }}
        </div>

        <!-- 主内容区域 -->
        <div class="card-content flex-grow flex flex-col overflow-y-auto px-4" 
             :class="type === 'cover' ? 'justify-center items-center text-center' : ''">
            <!-- 封面卡片内容 -->
            <div v-if="type === 'cover'" class="cover-content-inner">
                <!-- 封面标题使用 v-html 渲染 -->
                <h1 class="text-2xl font-bold mb-2 cover-title rendered-title" v-html="renderedCoverTitle"></h1>
                <div v-if="renderedCoverSubtitle" class="cover-subtitle text-md whitespace-pre-line" v-html="renderedCoverSubtitle"></div>
            </div>

            <!-- 内容卡片内容 -->
            <div v-else class="content-content-inner flex flex-col flex-grow">
                <!-- 内容标题使用 v-html 渲染 -->
                <h3 class="text-lg font-semibold mb-3 text-purple-800 content-title rendered-title" v-html="renderedContentTitle">
                </h3>
                <!-- Markdown/LaTeX 渲染区域 -->
                <div class="markdown-body katex-compatible flex-grow overflow-y-auto text-xs content-body" v-html="renderedMarkdownBody"></div>
            </div>
        </div>

        <!-- 页脚 -->
        <div v-if="isFooterVisible" class="card-footer flex-shrink-0 px-4 pb-2 text-xs text-right opacity-80 whitespace-pre-line" 
             :class="type === 'cover' ? 'text-white/80' : 'text-purple-700/80'">
            {{ footerText }}
        </div>
    </div>
</template>

<script>
import { useTemplateRendering } from '../composables/useTemplateRendering';
import { commonTemplateProps } from '../config/commonProps'; // 导入共享 Props

export default {
    name: 'Template5',
    props: {
        ...commonTemplateProps // 使用扩展运算符引入共享 Props
        // 如果 Template5 有自己独特的 Props，可以在这里添加
    },
    setup(props) {
        const { 
            renderedCoverTitle, 
            renderedCoverSubtitle, 
            renderedContentTitle, 
            renderedMarkdownBody 
        } = useTemplateRendering(props);

        return {
            renderedCoverTitle,
            renderedCoverSubtitle,
            renderedContentTitle,
            renderedMarkdownBody
        };
    }
}
</script>

<style scoped>
/* 保留模板 5 特定样式 - 宽屏 */
.template5 {
    font-family: 'Verdana', sans-serif; /* 统一字体 */
}

.template5.cover-bg {
    background: linear-gradient(45deg, #8B5CF6 0%, #C084FC 100%); /* 紫色渐变 */
    color: white;
}

.template5.content-bg {
    background-color: #F5F3FF; /* 浅紫色背景 */
    color: #5B21B6; /* Default text color (purple-800) */
}

/* 封面特定样式调整 */
.template5.cover-bg .card-content {
    /* justify-center items-center text-center is handled by :class */
}

/* 内容卡片特定样式调整 */
.template5.content-bg .content-title {
     color: #5B21B6; /* text-purple-800 */
}

.template5 .content-body {
    line-height: 1.5;
    color: #4B5563; /* gray-600, slightly lighter for better contrast on light purple */
}

/* KaTeX 兼容性样式 */
.katex-compatible :deep(.katex-display) {
    margin: 0.5em 0;
    overflow-x: auto;
    overflow-y: hidden;
}

.katex-compatible :deep(.katex) {
    font-size: 1.0em; /* 为宽屏调整 KaTeX 大小 */
}

/* 新增：Markdown 列表样式 */
.markdown-body :deep(ul) {
    list-style-type: disc;
    margin-left: 1.25rem; /* Adjust indent for smaller text */
    padding-left: 1rem;
    margin-top: 0.4rem;
    margin-bottom: 0.4rem;
}

.markdown-body :deep(ol) {
    list-style-type: decimal;
    margin-left: 1.25rem;
    padding-left: 1rem;
    margin-top: 0.4rem;
    margin-bottom: 0.4rem;
}

.markdown-body :deep(li) {
    margin-bottom: 0.2rem;
}

/* 重置 v-html 渲染的标题中 p 标签的边距 */
.rendered-title :deep(p) {
    margin: 0;
    display: inline;
}

/* 确保内容滚动 */
.card-content {
    /* flex-grow enables filling space */
}
.markdown-body {
    /* overflow-y-auto allows scrolling */
}

.cover-subtitle :deep(p) {
    margin: 0;
}
</style> 