import { computed } from 'vue';
import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';

/**
 * @description 一个组合式函数，用于处理模板组件中常见的 Markdown/LaTeX 渲染逻辑。
 * @param {object} props - 组件接收的 props 对象，需要包含 type 和 cardData。
 * @returns {object} 包含渲染后文本的对象: { renderedCoverTitle, renderedCoverSubtitle, renderedContentTitle, renderedMarkdownBody }
 */
export function useTemplateRendering(props) {
    const renderedCoverTitle = computed(() => {
        // 从 props.cardData 获取封面标题
        return props.type === 'cover' && props.cardData?.title
            ? renderMarkdownAndLaTeX(props.cardData.title)
            : '';
    });

    const renderedCoverSubtitle = computed(() => {
        // 从 props.cardData 获取封面副标题
        return props.type === 'cover' && props.cardData?.subtitle
            ? renderMarkdownAndLaTeX(props.cardData.subtitle)
            : '';
    });

    const renderedContentTitle = computed(() => {
        // 从 props.cardData 获取内容卡片标题
        return props.type === 'content' && props.cardData?.title
            ? renderMarkdownAndLaTeX(props.cardData.title)
            : '';
    });

    const renderedMarkdownBody = computed(() => {
        // 从 props.cardData 获取内容卡片正文
        return props.type === 'content' && props.cardData?.body
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