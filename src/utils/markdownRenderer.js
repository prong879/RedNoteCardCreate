import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// 创建自定义渲染器
const renderer = new marked.Renderer();

// 重写 image 方法
renderer.image = (token) => {
    let href = token.href;     // 从 token 对象中获取 href
    let title = token.title;   // 从 token 对象中获取 title
    let text = token.text;     // 从 token 对象中获取 text (alt text)

    let correctedHref = href; // 默认使用原始 href

    // 检查 href 是否为字符串
    if (typeof href === 'string') {
        // 将 href 中的反斜杠替换为正斜杠
        correctedHref = href.replace(/\\/g, '/');
    } else {
        // 如果 href 不是字符串，记录错误信息
        console.error(`[markdownRenderer] Encountered non-string href within image token:`, href, `(Type: ${typeof href})`, `Alt text: "${text}"`, 'Token:', token);
        correctedHref = ""; // 使用空 src
    }

    // 生成 img 标签
    let out = `<img src="${correctedHref}" alt="${text}"`;
    if (title) {
        out += ` title="${title}"`;
    }
    out += '>';
    return out;
};

// 配置 marked，使用自定义渲染器
marked.setOptions({
    renderer: renderer, // 使用自定义渲染器
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
        // 1. 使用配置好的 marked 解析 Markdown 为 HTML
        // marked.parse 现在会使用我们自定义的渲染器
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