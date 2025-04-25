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
                        <h1 v-if="renderedCoverTitle" class="text-4xl font-bold mb-4 whitespace-pre-line text-left text-white rendered-title" v-html="renderedCoverTitle"></h1>
                        <div v-if="renderedCoverSubtitle" class="cover-subtitle text-xl opacity-90 mt-2 whitespace-pre-line" v-html="renderedCoverSubtitle"></div>
                    </template>
                    
                    <!-- 内容卡片内容 -->
                    <template v-else>
                        <h3 v-if="renderedContentTitle" class="text-xl font-bold mb-4 whitespace-pre-line pt-2 rendered-title" v-html="renderedContentTitle"></h3>
                        <div v-if="renderedMarkdownBody" class="markdown-body flex-grow overflow-y-hidden pr-1" v-html="renderedMarkdownBody"></div>
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
import { computed } from 'vue';

export default {
    name: 'Template1',
    props: {
        // 卡片类型: 'cover' 或 'content'
        type: {
            type: String,
            required: true,
            validator: (value) => ['cover', 'content'].includes(value)
        },
        // 统一接收卡片数据对象 (coverCard 或 contentCard)
        cardData: {
            type: Object,
            required: true
        },
        // 页眉和页脚文本
        headerText: {
            type: String,
            default: '@园丁小区詹姆斯'
        },
        footerText: {
            type: String,
            default: '持续更新\\n你一定能学会时间序列分析'
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
    setup(props) {
        // 计算渲染后的 Markdown 和 LaTeX 内容
        const renderedCoverTitle = computed(() => {
            // 从 cardData 获取封面标题
            return props.type === 'cover' && props.cardData && props.cardData.title
                   ? renderMarkdownAndLaTeX(props.cardData.title)
                   : '';
        });

        const renderedCoverSubtitle = computed(() => {
            // 从 cardData 获取封面副标题
            return props.type === 'cover' && props.cardData && props.cardData.subtitle
                   ? renderMarkdownAndLaTeX(props.cardData.subtitle)
                   : '';
        });

        const renderedContentTitle = computed(() => {
            // 从 cardData 获取内容卡片标题
            return props.type === 'content' && props.cardData && props.cardData.title
                   ? renderMarkdownAndLaTeX(props.cardData.title)
                   : '';
        });

        const renderedMarkdownBody = computed(() => {
            // 从 cardData 获取内容卡片正文
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
    margin-bottom: 0.10rem;
}

/* 新增：移除渲染后标题内 p 标签的默认边距 */
.rendered-title :deep(p) {
    margin: 0;
    display: inline; /* 如果希望保持在一行 */
}

.cover-subtitle :deep(p) {
    margin: 0; /* 确保副标题内的段落无边距 */
}

/* 如果需要为 KaTeX 公式调整样式 */
:deep(.katex) {
    font-size: 1em; /* 保持与周围文本大小一致或微调 */
    /* color: inherit; */ /* 继承父元素颜色 */
}
</style>