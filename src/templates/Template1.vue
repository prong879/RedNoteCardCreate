<template>
    <!-- 模板1 的根元素，用于包裹封面或内容卡片 -->
    <div class="template1">
        <!-- 封面卡片: 当 type 为 'cover' 时显示 -->
        <!-- v-if="type === 'cover'": 条件渲染指令，仅当 props.type 为 'cover' 时渲染此 div -->
        <!-- class="xhs-card cover-card-bg w-80 aspect-[3/4] relative": -->
        <!--   xhs-card: 全局定义的卡片基础样式 -->
        <!--   cover-card-bg: 此模板封面卡片的特定背景样式 (渐变色) -->
        <!--   w-80: 设置宽度 (Tailwind: 20rem / 320px) -->
        <!--   aspect-[3/4]: 设置宽高比为 3:4 (小红书标准尺寸) -->
        <!--   relative: 设置相对定位，为其子绝对定位元素提供定位上下文 -->
        <div v-if="type === 'cover'" class="xhs-card cover-card-bg w-80 aspect-[3/4] relative">
            <!-- 内层 div (前景层)，实现磨砂玻璃效果 -->
            <!-- class="frosted-layer absolute inset-6 bg-black/30 backdrop-blur-lg rounded-2xl p-6 text-white flex flex-col justify-center items-center text-center overflow-hidden": -->
            <!--   frosted-layer: 自定义或用于标识的类名，表示磨砂层 -->
            <!--   absolute: 绝对定位 -->
            <!--   inset-6: 距离父元素所有边缘 1.5rem (24px) (Tailwind) -->
            <!--   bg-black/30: 半透明黑色背景 (30% 不透明度) (Tailwind) -->
            <!--   backdrop-blur-lg: 对元素后面的内容应用较强的模糊效果 (Tailwind) -->
            <!--   rounded-2xl: 更大的圆角 (Tailwind) -->
            <!--   p-6: 内边距 1.5rem (24px) (Tailwind) -->
            <!--   text-white: 文字颜色为白色 (Tailwind) -->
            <!--   flex flex-col justify-center items-center: Flexbox 布局，使内容垂直排列、水平居中、垂直居中 -->
            <!--   text-center: 文本居中对齐 (Tailwind) -->
            <!--   overflow-hidden: 隐藏超出元素边界的内容 (Tailwind) -->
            <div class="frosted-layer absolute inset-6 bg-black/30 backdrop-blur-lg rounded-2xl p-6 text-white flex flex-col justify-center items-center text-center overflow-hidden">
                 <!-- 封面主标题 -->
                 <!-- class="text-4xl font-bold mb-10": -->
                 <!--   text-4xl: 字体大小 (Tailwind) -->
                 <!--   font-bold: 字体加粗 (Tailwind) -->
                 <!--   mb-10: 下外边距 2.5rem (40px) (Tailwind) -->
                 <h1 class="text-4xl font-bold mb-10 whitespace-pre-line">{{ title }}</h1>
                 <!-- 封面副标题 -->
                 <!-- class="text-xl whitespace-pre-line": -->
                 <!--   text-xl: 字体大小 (Tailwind) -->
                 <!--   whitespace-pre-line: 保留换行符和空格序列，合并连续空格 (Tailwind) -->
                 <p class="text-xl whitespace-pre-line">{{ content.subtitle }}</p>
            </div>
        </div>

        <!-- 内容卡片: 当 type 为 'content' 时显示 -->
        <!-- v-else-if="type === 'content'": 条件渲染指令，仅当 props.type 为 'content' 时渲染此 div -->
        <!-- 修改类名，应用封面卡片的背景 -->
        <div v-else-if="type === 'content'" class="xhs-card cover-card-bg w-80 aspect-[3/4] relative">
             <!-- 内层 div (前景层)，样式改为与封面卡片一致 -->
             <!-- 修改 inset, bg-opacity, backdrop-blur, p, 并添加 text-white -->
             <div class="frosted-layer absolute inset-6 bg-black/30 backdrop-blur-lg rounded-2xl p-6 flex flex-col overflow-hidden text-white">
                <!-- 内容卡片的标题 -->
                <!-- class="text-xl font-bold mb-4 text-xhs-black": -->
                <!--   text-xl: 字体大小 (Tailwind) -->
                <!--   font-bold: 字体加粗 (Tailwind) -->
                <!--   mb-4: 下外边距 1rem (16px) (Tailwind) -->
                <!--   text-xhs-black: 使用自定义的小红书黑色 (在全局样式或 Tailwind 配置中定义) -->
                <!-- 修改文字颜色为 text-white -->
                <h3 class="text-xl font-bold mb-4 whitespace-pre-line text-white">{{ content.title }}</h3>
                <!-- Markdown 内容渲染区域 -->
                <!-- class="markdown-content katex-compatible flex-grow overflow-y-auto": -->
                <!--   markdown-content: 用于标识 Markdown 内容容器，可能用于全局样式 -->
                <!--   katex-compatible: 用于标识支持 KaTeX 渲染，可能用于 KaTeX 样式调整 -->
                <!--   flex-grow: 在 Flex 容器中占据剩余空间 (Tailwind) -->
                <!--   overflow-y-auto: 当内容垂直溢出时显示滚动条 (Tailwind) -->
                <!-- v-html="renderContent(content.body)": 动态绑定 HTML 内容，其值由 renderContent 方法计算得到 -->
                <!-- text-white 已在外层 div 添加，此处内容应自动继承 -->
                <div class="markdown-content katex-compatible flex-grow overflow-y-auto" v-html="renderContent(content.body)"></div>
             </div>
        </div>
    </div>
</template>

<script>
// 导入 Markdown 和 LaTeX 的渲染工具函数
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

export default {
    // 组件名称，用于调试和 Vue Devtools 中识别
    name: 'Template1',
    // 定义组件接收的 props (父组件传递给子组件的数据)
    props: {
        // 卡片类型: 'cover' 或 'content'
        type: {
            type: String,     // Prop 类型必须是字符串
            required: true,   // 这个 Prop 是必需的
            // 自定义验证函数，确保传入的值是 'cover' 或 'content' 中的一个
            validator: (value) => ['cover', 'content'].includes(value)
        },
        // 主标题 (主要用于封面卡片)
        title: {
            type: String,     // Prop 类型是字符串
            default: ''       // 如果父组件没有传递 title，则默认为空字符串
        },
        // 内容对象 (用于封面副标题或内容卡片的标题和内容)
        content: {
            type: Object,     // Prop 类型必须是对象
            required: true    // 这个 Prop 是必需的
            // 对象内部结构示例 (由父组件决定具体内容):
            // 对于 cover: { subtitle: '这是副标题' }
            // 对于 content: { title: '内容标题', body: 'Markdown **文本** $E=mc^2$' }
        }
    },
    // 定义组件的方法
    methods: {
        // 渲染 Markdown 和 LaTeX 文本的方法
        renderContent(text) {
            // 调用导入的 renderMarkdownAndLaTeX 函数处理文本
            // 这个函数会将包含 Markdown 和 LaTeX 的纯文本字符串转换为 HTML 字符串
            return renderMarkdownAndLaTeX(text);
        }
    }
}
</script>

<style scoped>
/* 组件的局部样式 (scoped): 这些样式只应用于当前组件内的元素 */

/* 模板1 封面卡片的背景特定样式 (现在内容卡片也用这个) */
.template1 .cover-card-bg {
    /* 设置字体，优先使用苹方字体，如果系统没有则使用无衬线字体 */
    font-family: 'PingFang SC', sans-serif;
    /* 设置 CSS 渐变背景，从左上到右下，颜色从 #e36be8 到 #581cdc */
    background: linear-gradient(135deg, #e36be8 0%, #581cdc 100%);
}

/* 移除不再使用的 content-card-bg 样式 */
/* .template1 .content-card-bg { ... } */

/* --- KaTeX 公式样式调整 --- */
/* :deep() 选择器用于穿透 scoped CSS 的限制，修改子组件或 v-html 插入内容的样式 */
/* 这允许我们为 markdownRenderer 生成的 KaTeX HTML 元素应用样式 */

/* 为 KaTeX 块级公式 (单独成行的公式) 添加样式 */
/* .katex-compatible 是我们在 <template> 中添加到 Markdown 容器上的类 */
/* .katex-display 是 KaTeX 库为块级公式生成的类 */
.katex-compatible :deep(.katex-display) {
    margin: 0.5em 0; /* 上下外边距设为 0.5em，增加公式与周围文本的间距 */
    overflow-x: auto; /* 如果公式宽度超过容器，允许水平滚动查看 */
    overflow-y: hidden; /* 隐藏垂直滚动条 (通常不需要) */
    /* background-color: rgba(240, 240, 240, 0.5); /* 可选：为公式块添加浅灰色背景 */
    /* padding: 0.5em; 可选：为公式块添加内边距 */
    /* border-radius: 4px; 可选：为公式块添加圆角 */
}

/* 为所有 KaTeX 公式 (包括行内公式和块级公式) 调整基础字体大小 */
/* .katex 是 KaTeX 库为所有公式容器添加的类 */
/* .katex-compatible :deep(.katex) { */
    /* font-size: 1.1em;  稍微增大 KaTeX 渲染的字体大小，使其更易读 (相对于周围文本) */
    /* 默认情况下 KaTeX 会尝试匹配周围字体大小，但有时可能需要微调 */
    /* 这里注释掉了，可以根据实际效果取消注释或调整数值 */
/* } */

/* 针对代码块的样式调整 (如果 markdownRenderer 支持并生成了特定的类) */
/* .katex-compatible :deep(pre) { */
    /* background-color: #f5f5f5; /* 设定代码块背景色 */
    /* padding: 1em;           /* 设定代码块内边距 */
    /* border-radius: 4px;     /* 设定代码块圆角 */
    /* overflow-x: auto;       /* 代码过长时允许水平滚动 */
    /* margin: 0.5em 0;        /* 设定代码块的垂直外边距 */
/* } */

/* .katex-compatible :deep(code) { */
    /* font-family: 'Courier New', Courier, monospace; /* 为代码设置等宽字体 */
    /* color: #333;             /* 设定代码文字颜色 */
/* } */
</style>