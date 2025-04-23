import { marked } from 'marked';
import katex from 'katex';

// 配置 marked (可选，例如启用 GFM 风格)
marked.setOptions({
    gfm: true, // 启用 GitHub Flavored Markdown
    breaks: true, // 将 GFM 的换行符渲染为 <br>
});

/**
 * 渲染包含 Markdown 和 LaTeX 的文本到 HTML
 * @param {string} text 输入的文本
 * @returns {string} 渲染后的 HTML 字符串
 */
export function renderMarkdownAndLaTeX(text) {
    if (!text) return '';

    try {
        // 1. 使用 marked 解析 Markdown 为 HTML
        let html = marked.parse(text);

        // 2. 渲染块级 LaTeX ($$ ... $$)
        html = html.replace(/\$\$([^$]+)\$\$/g, (match, formula) => {
            try {
                return katex.renderToString(formula, {
                    displayMode: true, // 渲染为块级公式
                    throwOnError: false // 出错时不抛出异常，显示错误信息
                });
            } catch (e) {
                console.error('KaTeX block rendering error:', e);
                return `<span style="color: red;">KaTeX Error: ${e.message}</span>`;
            }
        });

        // 3. 渲染行内 LaTeX ($ ... $)
        // 注意：使用更健壮的正则表达式避免匹配单个 $ 符号
        html = html.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
            try {
                return katex.renderToString(formula, {
                    displayMode: false, // 渲染为行内公式
                    throwOnError: false
                });
            } catch (e) {
                console.error('KaTeX inline rendering error:', e);
                return `<span style="color: red;">KaTeX Error: ${e.message}</span>`;
            }
        });

        return html;

    } catch (error) {
        console.error("Markdown/LaTeX rendering error:", error);
        return `<p style="color: red;">渲染出错: ${error.message}</p>`;
    }
}

export default renderMarkdownAndLaTeX; 