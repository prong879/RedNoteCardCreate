<template>
    <!-- 模板1 的根元素 -->
    <div class="template1">
        <!-- 卡片容器 -->
        <div class="card w-80 aspect-[3/4] relative cover-card-bg" data-exportable-card="true">
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
                        <h3 v-if="renderedContentTitle" class="text-xl font-bold mb-2 whitespace-pre-line pt-2 rendered-title" v-html="renderedContentTitle"></h3>
                        <div v-if="renderedMarkdownBody" class="markdown-body text-base flex-grow overflow-y-hidden pr-1" v-html="renderedMarkdownBody"></div>
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
import { useTemplateRendering } from '../composables/useTemplateRendering';
import { commonTemplateProps } from '../config/commonProps'; // 导入共享 Props

export default {
    name: 'Template1',
    props: {
        ...commonTemplateProps, // 使用扩展运算符引入共享 Props
        // 如果 Template1 有自己独特的 Props，可以在这里添加
    },
    setup(props) {
        // 使用 Composable 获取渲染后的文本
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
    margin-left: 1rem;
    margin-top: 0.20rem;
    margin-bottom: 0.20rem;
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
    margin-bottom: 0rem;
}

/* 新增：控制正文普通段落的间距 */
.markdown-body :deep(p) {
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
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