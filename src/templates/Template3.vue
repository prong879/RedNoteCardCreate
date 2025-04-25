<template>
    <div class="template3 xhs-card w-80 aspect-[3/4] flex flex-col overflow-hidden" 
         :class="type === 'cover' ? 'cover-bg' : 'content-bg'">
        
        <!-- 页眉 -->
        <div v-if="isHeaderVisible" class="card-header flex-shrink-0 px-6 pt-4 text-xs opacity-80 whitespace-pre-line" 
             :class="type === 'cover' ? 'text-white/80' : 'text-gray-500'">
            {{ headerText }}
        </div>

        <!-- 主内容区域 -->
        <div class="card-content flex-grow flex flex-col overflow-y-auto px-6" 
             :class="type === 'cover' ? 'justify-end items-start text-left' : ''">
            <!-- 封面卡片内容 -->
            <div v-if="type === 'cover'" class="cover-content-inner pb-4">
                <p class="text-lg whitespace-pre-line mb-4 font-light opacity-90 cover-subtitle">{{ content.subtitle }}</p>
                <!-- 封面标题使用 v-html 渲染 -->
                <h1 class="text-4xl font-extrabold cover-title rendered-title" v-html="renderedCoverTitle"></h1>
            </div>

            <!-- 内容卡片内容 -->
            <div v-else class="content-content-inner flex flex-col flex-grow pt-2">
                <!-- 内容标题使用 v-html 渲染 -->
                <h3 class="text-xl font-bold mb-5 text-gray-800 relative pl-4 flex-shrink-0 content-title rendered-title">
                    <span class="absolute left-0 top-0 bottom-0 w-1 bg-xhs-pink rounded-full"></span>
                    <span v-html="renderedContentTitle"></span> <!-- Wrap rendered title in a span -->
                </h3>
                <!-- Markdown/LaTeX 渲染区域 -->
                <div class="markdown-body flex-grow text-gray-700 katex-compatible overflow-y-auto content-body" v-html="renderedMarkdownBody">
                </div>
            </div>
        </div>

        <!-- 页脚 -->
        <div v-if="isFooterVisible" class="card-footer flex-shrink-0 px-6 pb-4 text-xs text-right opacity-80 whitespace-pre-line" 
             :class="type === 'cover' ? 'text-white/80' : 'text-gray-500'">
            {{ footerText }}
        </div>
    </div>
</template>

<script>
import { computed } from 'vue';
// 导入渲染函数
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    name: 'Template3',
    props: {
        type: {
            type: String,
            required: true,
            validator: (value) => ['cover', 'content'].includes(value)
        },
        title: { // 封面标题
            type: String,
            default: ''
        },
        content: { // 包含 subtitle (封面) 或 title, body (内容)
            type: Object,
            required: true
        },
        headerText: {
            type: String,
            default: ''
        },
        footerText: {
            type: String,
            default: ''
        },
        isHeaderVisible: {
            type: Boolean,
            default: true
        },
        isFooterVisible: {
            type: Boolean,
            default: true
        }
    },
    setup(props) {
        // 计算属性用于渲染标题和正文
        const renderedCoverTitle = computed(() => {
            return props.title ? renderMarkdownAndLaTeX(props.title) : '';
        });

        const renderedContentTitle = computed(() => {
            return props.type === 'content' && props.content && props.content.title 
                    ? renderMarkdownAndLaTeX(props.content.title) 
                    : '';
        });

        const renderedMarkdownBody = computed(() => {
            return props.type === 'content' && props.content && props.content.body 
                    ? renderMarkdownAndLaTeX(props.content.body) 
                    : '';
        });

        return {
            renderedCoverTitle,
            renderedContentTitle,
            renderedMarkdownBody
        };
    }
}
</script>

<style scoped>
/* 保留原有的背景和字体等核心样式 */
.template3.cover-bg {
    background-image: linear-gradient(to bottom right, #facc15, #f97316); /* from-yellow-400 to-orange-500 */
    color: white;
    font-family: 'Montserrat', sans-serif;
}
.template3.content-bg {
    background-color: white;
    font-family: 'Lato', sans-serif;
    color: #1f2937; /* Default text color (gray-800) */
}

/* 保留内容卡片标题的左侧装饰线和相对定位 */
.template3 .content-title {
    position: relative;
    /* text-gray-800 is handled by content-bg default */
}

/* 封面副标题样式 */
.template3 .cover-subtitle {
    /* font-light opacity-90 */
}

/* 内容区域样式 */
.template3 .content-body {
    font-size: 16px;
    line-height: 1.8;
    color: #374151; /* gray-700 */
}

/* 为 KaTeX 公式添加一些可能的样式调整 */
.katex-compatible :deep(.katex-display) {
    margin: 0.5em 0;
    overflow-x: auto;
    overflow-y: hidden;
}

.katex-compatible :deep(.katex) {
    font-size: 1.1em;
}

/* 新增：Markdown 列表样式 */
.markdown-body :deep(ul) {
    list-style-type: disc;
    margin-left: 1.5rem;
    padding-left: 1rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
}

.markdown-body :deep(ol) {
    list-style-type: decimal;
    margin-left: 1.5rem;
    padding-left: 1rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
}

.markdown-body :deep(li) {
    margin-bottom: 0.25rem;
}

/* 重置 v-html 渲染的标题中 p 标签的边距 */
.rendered-title :deep(p) {
    margin: 0;
    display: inline; /* If rendered content might be inline */
}

/* 确保内容滚动 */
.card-content {
    /* flex-grow enables filling space */
}
.markdown-body {
    /* overflow-y-auto allows scrolling */
}
</style>