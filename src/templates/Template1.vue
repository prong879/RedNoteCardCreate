<template>
    <!-- 模板1 的根元素 -->
    <div class="template1">
        <!-- 卡片容器 -->
        <div class="card w-80 aspect-[3/4] relative cover-card-bg">
            <!-- 磨砂玻璃前景层 -->
            <div class="frosted-layer absolute inset-4 bg-black/30 backdrop-blur-lg rounded-2xl p-4 text-white flex flex-col overflow-hidden">
                <!-- 页眉区域 -->
                <div v-if="isHeaderVisible" class="card-header text-xs opacity-80 mb-2 whitespace-pre-line">
                    {{ headerText }}
                </div>

                <!-- 主内容区域 -->
                <div class="card-content flex-grow flex flex-col" 
                     :class="{
                        'pt-4': !isHeaderVisible, 
                        'pb-4': !isFooterVisible,
                        'justify-center': type === 'cover'
                     }">
                    <!-- 封面卡片内容 -->
                    <template v-if="type === 'cover'">
                        <h1 class="text-4xl font-bold mb-10 whitespace-pre-line text-left">{{ title }}</h1>
                        <p class="text-xl whitespace-pre-line text-left">{{ content.subtitle }}</p>
                    </template>
                    
                    <!-- 内容卡片内容 -->
                    <template v-else>
                        <h3 class="text-xl font-bold mb-4 whitespace-pre-line pt-2">{{ content.title }}</h3>
                        <div class="markdown-body flex-grow overflow-y-hidden pr-1" v-html="renderedMarkdown"></div>
                    </template>
                </div>

                <!-- 页脚区域 -->
                <div v-if="isFooterVisible" 
                     class="card-footer text-xs opacity-80 mt-2 whitespace-pre-line text-right"
                     :class="{ 'pt-2': type === 'content' }">
                    {{ footerText }}
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    name: 'Template1',
    props: {
        // 卡片类型: 'cover' 或 'content'
        type: {
            type: String,
            required: true,
            validator: (value) => ['cover', 'content'].includes(value)
        },
        // 标题内容
        title: {
            type: String,
            default: ''
        },
        // 内容对象 (cover: {subtitle}, content: {title, body})
        content: {
            type: Object,
            required: true
        },
        // 页眉和页脚文本
        headerText: {
            type: String,
            default: ''
        },
        footerText: {
            type: String,
            default: ''
        },
        // 控制页眉页脚可见性
        isHeaderVisible: {
            type: Boolean,
            default: true
        },
        isFooterVisible: {
            type: Boolean,
            default: true
        }
    },
    computed: {
        // 计算渲染后的 Markdown 和 LaTeX 内容
        renderedMarkdown() {
            // 只有在 content.body 存在时才进行渲染
            return this.content && this.content.body ? renderMarkdownAndLaTeX(this.content.body) : '';
        }
    }
}
</script>

<style scoped>
/* 卡片基础样式 */
.template1 .card {
    font-family: 'PingFang SC', sans-serif;
}

/* 渐变背景 */
.cover-card-bg {
    background: linear-gradient(135deg, #e36be8 0%, #581cdc 100%);
}

/* KaTeX 公式样式 */
.markdown-body :deep(.katex-display) {
    margin: 0.5em 0;
    overflow-x: auto;
    overflow-y: hidden;
}

/* Markdown 列表样式 */
.markdown-body :deep(ul) {
    list-style-type: disc;
    margin-left: 1.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    padding-left: 1rem;
}

.markdown-body :deep(ol) {
    list-style-type: decimal;
    margin-left: 1.5rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
    padding-left: 1rem;
}

.markdown-body :deep(li) {
    margin-bottom: 0.25rem;
}
</style>