<template>
    <div class="template2 xhs-card w-80 aspect-[3/4] flex flex-col overflow-hidden" 
         :class="type === 'cover' ? 'cover-bg' : 'content-bg'" data-exportable-card="true">
        
        <!-- 页眉 -->
        <div v-if="isHeaderVisible" class="card-header flex-shrink-0 px-6 pt-4 text-xs text-center opacity-80">
            {{ headerText }}
        </div>

        <!-- 主内容区域 -->
        <div class="card-content flex-grow flex flex-col overflow-y-auto px-6" 
             :class="type === 'cover' ? 'justify-center items-center text-center' : ''">
            <!-- 封面卡片内容 -->
            <div v-if="type === 'cover'" class="cover-content-inner">
                <h1 v-if="renderedCoverTitle" class="text-3xl font-serif font-bold mb-8 tracking-wider cover-title whitespace-pre-line rendered-title" v-html="renderedCoverTitle"></h1>
                <div v-if="renderedCoverSubtitle" class="cover-subtitle text-base opacity-90 mt-3 whitespace-pre-line" v-html="renderedCoverSubtitle"></div>
            </div>

            <!-- 内容卡片内容 -->
            <div v-else class="content-content-inner flex flex-col flex-grow">
                <h3 v-if="renderedContentTitle" class="text-xl font-serif font-bold mb-4 text-blue-800 border-b-2 border-blue-200 pb-2 flex-shrink-0 content-title whitespace-pre-line rendered-title" v-html="renderedContentTitle"></h3>
                <!-- Markdown/LaTeX 渲染区域 -->
                <div v-if="renderedMarkdownBody" class="markdown-body flex-grow font-serif katex-compatible overflow-y-auto content-body" v-html="renderedMarkdownBody">
                </div>
            </div>
        </div>

        <!-- 页脚 -->
        <div v-if="isFooterVisible" class="card-footer flex-shrink-0 px-6 pb-4 text-xs text-center opacity-80">
            {{ footerText }}
        </div>
    </div>
</template>

<script>
import { computed } from 'vue';
// 导入渲染函数
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    name: 'Template2',
    props: {
        type: {
            type: String,
            required: true,
            validator: (value) => ['cover', 'content'].includes(value)
        },
        // 统一接收卡片数据对象
        cardData: {
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
        const renderedCoverTitle = computed(() => {
            return props.type === 'cover' && props.cardData && props.cardData.title
                   ? renderMarkdownAndLaTeX(props.cardData.title)
                   : '';
        });
        const renderedCoverSubtitle = computed(() => {
            return props.type === 'cover' && props.cardData && props.cardData.subtitle
                   ? renderMarkdownAndLaTeX(props.cardData.subtitle)
                   : '';
        });
        const renderedContentTitle = computed(() => {
            return props.type === 'content' && props.cardData && props.cardData.title
                   ? renderMarkdownAndLaTeX(props.cardData.title)
                   : '';
        });
        const renderedMarkdownBody = computed(() => {
            return props.type === 'content' && props.cardData && props.cardData.body
                   ? renderMarkdownAndLaTeX(props.cardData.body)
                   : '';
        });

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
/* 保留原有的背景和字体颜色等核心样式 */
.template2.cover-bg {
    background-image: linear-gradient(to bottom right, #3b82f6, #8b5cf6); /* from-blue-500 to-purple-500 */
    color: white;
}
.template2.content-bg {
    background-color: white;
    color: #1e3a8a; /* 默认为深蓝色，标题等可覆盖 */
}

/* 调整特定元素的颜色以匹配背景 */
.template2.cover-bg .card-header,
.template2.cover-bg .card-footer {
    color: rgba(255, 255, 255, 0.8);
}

/* 内容卡片标题颜色 (已通过 text-blue-800 实现，此处可移除或保留备用) */
.template2 .content-title {
    /* color: #1e40af; */ /* text-blue-800 */
}

/* 保留原有的字体和样式 */
.template2 .font-serif {
    font-family: 'Times New Roman', Times, serif;
}

/* 主内容区域的字体大小和行高 */
.template2 .content-body {
    font-size: 17px;
    line-height: 1.7;
    color: #374151; /* 设置一个更适合阅读的文本颜色 gray-700 */
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

/* 确保内容滚动 */
.card-content {
    /* 移除固定高度，让 flex-grow 生效 */
}
.markdown-body {
     /* 允许其内部滚动 */
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
    margin-top: 0;
    margin-bottom: 0;
}
</style>