# 小红书知识卡片生成器

## 项目介绍

这是一个小红书知识卡片生成工具，旨在通过模板化和可视化编辑，快速根据已有的知识库或联网搜索知识，生成选题库，并将选题内容转化为符合小红书风格的精美图片卡片和配套文案，提高内容创作效率。

**核心流程已更新**: 现在项目直接使用 `src/markdown/` 目录下的 `.md` 文件作为内容存储和管理的核心，移除了原有的 `.js` 文件转换流程。

### 主要功能

*   **选题管理与内容编辑**: 
    *   **选题界面**: 
        *   加载 `src/config/topicsMeta.js` 中的选题元信息（ID, 标题, 简介）来构建基础选题列表。
        *   启动时或按需调用后端 API (`/api/list-content-files`)，扫描 `src/markdown/` 目录，实时获取每个 `.md` 文件的卡片数量和存在状态，并更新到列表中。
        *   提供 "创建 MD" / "覆盖 MD" 按钮，方便地创建新的空白 `.md` 选题文件或覆盖现有文件。
    *   **内容来源**: 
        *   选题列表显示时，标题和描述来自 `topicsMeta.js`。
        *   当选择一个主题加载后，所有编辑和预览的内容（包括标题、描述、页眉/页脚、卡片正文、主文案、样式设置等）均来自对应的 `.md` 文件。
    *   **编辑方式**: 
        *   可以直接编辑 `src/markdown/` 下的 `.md` 文件。
        *   也可以在应用的可视化界面中编辑内容。
    *   **Prompt 生成**: 提供按钮，可根据当前 `.md` 文件内容生成用于辅助AI 在已有 md 文件基础上生成详细文案，并以注释形式提供可视化示例资源演示建
    议。
    *   **(可选)** 可利用 ManimCE 制作可视化演示素材，写了一个快速导出Manim的gui应用，支持导出为视频/图片，支持调节质量、背景透明与否等。。
*   **卡片模板**: 
    *   提供多种样式模板，支持不同宽高比，实时预览。
    *   模板组件动态加载。
*   **可视化编辑**: 
    *   支持实时编辑页眉/页脚、封面/内容卡片的标题/正文及主文案。
    *   支持 **Markdown** 和 **LaTeX** 数学公式。
    *   内容卡片支持拖拽排序、添加、删除。
    *   可单独控制卡片的页眉/页脚显隐。
    *   可单独调整每个**内容卡片**的**字体大小**和**行高**。
    *   编辑内容实时反映在预览区。
    *   编辑区与预览区滚动联动。
    *   (Pinia 状态管理, 焦点索引约定: `null` 无焦点, `-1` 封面, `0+` 内容卡片索引【这个不要删除】)。
*   **导出与保存**: 
    *   导出单张或所有卡片为 **JPG / PNG 图片** (高分辨率, scale:4)。
    *   将所有图片打包为 **ZIP 文件**下载。
    *   一键**复制主文案**。
    *   **"保存到本地"**: 直接将当前编辑内容**写回**对应的 `src/markdown/topicXX.md` 文件 (覆盖保存)。
*   **性能优化**: 实施了代码分割和懒加载策略 (如导出功能、非首屏组件、KaTeX 样式)，显著提升了应用的初始加载速度。


### 技术栈

*   **前端**: Vue.js 3 (组合式 API), Vite
*   **状态管理**: Pinia
*   **样式**: Tailwind CSS, PostCSS (autoprefixer)
*   **图标**: Font Awesome (@fortawesome/fontawesome-free)
*   **Markdown/LaTeX/YAML**: marked, KaTeX, gray-matter
*   **图片/文件处理**: html2canvas, file-saver, JSZip
*   **拖拽**: vuedraggable
*   **数据**: Markdown 文件 (`src/markdown/`), 通过自定义 Vite 插件提供 API
*   **配置**: 
    *   `src/config/topicsMeta.js`: 存储选题列表的基础元数据 (ID, title, description)。
    *   `src/config/templateMetadata.js`: 存储卡片模板的元数据 (name, aspectRatio)。
    *   `src/config/cardConstants.js`: 存储卡片样式默认值、范围、Markdown 注释键等常量。

## 使用方法

**安装依赖**

确保已安装 Node.js (建议 v16 或更高版本)。

```bash
npm install
```

**开发模式**

启动本地开发服务器，支持热更新。默认访问地址：`http://localhost:5173`

```bash
npm run dev
```

**构建项目**

将项目打包为生产环境的静态文件，输出到 `/dist` 目录。

```bash
npm run build
```

## 核心使用流程

推荐的工作流程结合了 Markdown 编辑、AI 辅助和可视化编辑：

1.  **创建/选择 Markdown 文件**: 
    *   **方式一 (界面创建)**: 在选题界面，点击 "创建 MD" 按钮，输入 Topic ID (如 `topic05`) 和标题，系统将在 `src/markdown/` 目录下创建对应的 `topic05.md` 文件模板。
    *   **方式二 (界面选择)**: 如果已有 `.md` 文件，直接在选题界面选择对应的卡片进入编辑。
    *   **方式三 (手动创建)**: 手动在 `src/markdown/` 目录下创建 `.md` 文件（参考下方格式规范），然后刷新应用或重启开发服务器即可在选题界面看到。

2.  **编辑 Markdown 源文件 (可选)**: 
    *   可以直接使用文本编辑器打开 `.md` 文件进行内容创作。
    *   在 YAML Front Matter 部分填写或修改 `title` 和 `description`。
    *   **注意**: 如果修改了 `.md` 文件中的 `title` 或 `description`，建议手动同步更新 `src/config/topicsMeta.js` 中对应的条目，以保持选题列表显示的一致性。
    *   参考 **"通过 Markdown 管理内容"** 部分的格式规范，编写封面卡片、内容卡片以及主文案。
3.  **AI 辅助生成详细文案**: 
    *   选题页面提供了"生成 Prompt"按钮，一键生成针对该选题的文案撰写 Prompt。
    *   使用 AI 助手结合生成的 Prompt，在 `.md` 文件中填充详细的卡片内容。
    *   AI 应根据 Prompt 指导，在合适的卡片下方使用 `<!-- 插图建议
    : ... -->` 注释格式提供可视化素材的建议【这个不要删】。
4.  **制作可视化素材 (可选)**: 
    *   参考 `.md` 文件中的插图建议，使用 ManimCE (或其他工具) 创建图片或视频素材。
    *   (可选) 使用配套的 Manim GUI 应用辅助导出。
    *   建议将最终素材按规范命名并存放在项目根目录的 `media/` 下。
5.  **可视化编辑与微调**: 
    *   运行 `npm run dev` 启动应用（如果尚未运行）。
    *   在选题界面选择你的主题。
    *   在左侧**配置面板**选择或切换卡片样式模板。
    *   对加载进来的内容（页眉/页脚、卡片标题/正文、主文案）进行编辑和调整 (内容卡片正文支持 Markdown/LaTeX)。
    *   通过拖拽、添加、删除按钮调整内容卡片顺序或数量。
    *   根据需要单独设置卡片的页眉/页脚显隐。
    *   **调整字号/行高**: 使用内容卡片下方的 "+/-" 按钮调整该卡片的字体大小和行高。
    *   右侧**预览面板**会实时更新效果。
6.  **保存内容**: 
    *   在**配置面板**点击 **"保存到本地"** 按钮。这将把当前编辑的所有内容（包括文本、显隐设置、**字号/行高**）写回到对应的 `src/markdown/topicXX.md` 文件中。
7.  **导出与发布**: 
    *   在**预览面板**点击相应按钮，导出单张图片、所有图片或打包下载 ZIP 文件。
    *   在**配置面板**点击按钮，复制最终的主文案。
    *   使用导出的图片和复制的文案发布笔记。

## 通过 Markdown 管理内容

现在项目以 `src/markdown/` 目录下的 `.md` 文件作为核心数据源。

**文件格式约定：**

*   **YAML Front Matter**: 文件开头 `---` 包裹的部分。用于存储全局元数据。
    *   `topicId`: (必需) 字符串，唯一 ID，**必须**与文件名（不含扩展名）一致。
    *   `title`: (必需) 字符串，主标题。用于选题界面显示。
    *   `description`: (推荐) 字符串，选题的简介描述。用于选题界面显示。
    *   `headerText`, `footerText`: (可选) 字符串，全局页眉/页脚。
    *   `coverShowHeader`, `coverShowFooter`: (可选, 默认 `true`) 布尔值，封面页眉/页脚显隐。
    *   `contentDefaultShowHeader`, `contentDefaultShowFooter`: (可选, 默认 `true`) 布尔值，内容卡片页眉/页脚**默认**显隐。
    *   **重要**: 包含特殊字符（如 `:`）或中文的字符串值，**必须使用双引号 (`"`) 包裹**。
        ```yaml
        # 示例:
        topicId: "topic01"
        title: "【小白入门】什么是时间序列数据？"
        description: "解释时间序列的基本概念和常见例子"
        headerText: "@你的用户名"
        footerText: ""
        coverShowHeader: true
        coverShowFooter: true
        contentDefaultShowHeader: true
        contentDefaultShowFooter: true
        ```
*   **卡片分隔符 (`---`)**: 单独一行，用于分隔封面卡片和内容卡片，以及内容卡片之间。
*   **封面卡片内容**: Front Matter 后，第一个 `---` 前。
    *   第一个 `# 标题` (一级) 作为封面标题 (会覆盖编辑界面中的封面标题输入)。
    *   标题后的内容作为副标题 (支持 Markdown/LaTeX)。
*   **内容卡片内容**: 每个 `---` 之后。
    *   第一个 `# 任意级别标题` 作为卡片标题。
    *   标题后的内容作为正文 (支持 Markdown/LaTeX)。
    *   **卡片元数据 (HTML 注释)**: 可在卡片正文**之后**，下一个 `---` **之前**，添加以下 HTML 注释来单独控制该卡片的属性：
        *   `<!-- cardShowHeader: false -->` 或 `<!-- cardShowHeader: true -->` (覆盖默认显隐)
        *   `<!-- cardShowFooter: false -->` 或 `<!-- cardShowFooter: true -->` (覆盖默认显隐)
        *   `<!-- cardFontSize: 18 -->` (设置字号，如果**不是**默认值 `16`)
        *   `<!-- cardLineHeight: 1.8 -->` (设置行高，如果**不是**默认值 `1.5`)
        *   **注意**: 只有当值与默认设置不同时，才需要（或才会被程序写入）这些注释。加载时若无对应注释，则使用默认值。
*   **主文案 (`mainText`)**: **必须**在所有卡片内容**之后**，以 `## Main Text` 或 `## 主文案` 标题开始，直到文件末尾。**此区域仅支持纯文本、换行、Emoji 和 #话题标签#**。

*请参考项目中 `src/markdown/` 下的示例 `.md` 文件。*


## 项目结构

```
.
├── .git/
├── .vscode/
├── docs/                   # 项目文档
├── Manim/                  # Manim 可视化应用
├── media/                  # 最终媒体资源 (建议 .gitignore 或 Git LFS)
├── node_modules/
├── public/                 # Vite 静态资源目录
├── plugins/                # 自定义 Vite 插件
│   └── vite-plugin-local-save.js # 提供本地 MD 文件操作 API
├── src/
│   ├── assets/             # Vue 应用静态资源 (包括修正后的 styles 目录)
│   │   └── styles/
│   │       └── index.css   # Tailwind 主入口
│   ├── components/         # Vue 组件
│   ├── composables/        # Vue 组合式函数
│   ├── config/             # 应用配置
│   │   ├── topicsMeta.js       # 选题列表元数据
│   │   ├── templateMetadata.js # 模板元数据
│   │   └── cardConstants.js    # 卡片相关常量
│   ├── markdown/           # Markdown 源文件 (核心内容)
│   │   └── topicXX.md
│   ├── prompts/            # AI Prompt 模板
│   ├── stores/             # Pinia 状态管理 Store
│   ├── templates/          # 卡片样式模板组件
│   ├── utils/              # 通用工具函数
│   ├── App.vue             # 根组件
│   └── main.js             # 应用入口
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── postcss.config.js
├── README.md               # 本文件
├── tailwind.config.js
└── vite.config.js
```

## 开发阶段

*   [x] **阶段1**：基础架构与核心功能
*   [x] **阶段1.5**: 重构数据流 (Markdown 为核心) & 性能优化 (懒加载)
*   [ ] **阶段2**：功能完善 (代码高亮, 本地存储等)
*   [ ] **阶段3**：高级功能与体验优化 (Emoji, 自定义背景, 预览优化等)

## 模板开发规定

为确保项目模板的一致性、可维护性和质量，所有新卡片模板的开发应遵循以下规定：

1.  **文件与命名**: 
    *   模板组件应放置在 `src/templates/` 目录下。
    *   文件名和组件名应采用大驼峰命名法，例如 `TemplateNewStyle.vue`。
    *   **重要**: 文件名（去除 `.vue` 后缀并转为小写）将作为模板的**唯一 ID** (例如 `TemplateNewStyle.vue` -> `id: 'templatenewstyle'`)，此 ID 用于在元数据文件中查找配置。

2.  **元数据注册 (必需!)**: 
    *   在 `src/config/templateMetadata.js` 文件中，**必须**为新模板添加一个条目。
    *   该条目的**键 (key)** 必须是根据上述规则生成的模板 ID (小写)。
    *   该条目的**值 (value)** 必须是一个包含以下属性的对象：
        *   `name`: (必需) `string` - 用户友好的模板名称，用于在 UI 选择列表中显示。
        *   `aspectRatio`: (必需) `string` - 模板的宽高比，格式为 `'宽/高'` (例如 `'3/4'`, `'16/9'`)，用于计算预览缩放。
    ```javascript
    // src/config/templateMetadata.js 示例
    export const templateMetadata = {
      // ... 其他模板
      templatenewstyle: { // key 必须是小写的模板 ID
        name: '新样式模板', // 用于显示的名称
        aspectRatio: '1/1' // 模板的宽高比
      }
    };
    ```

3.  **基础结构**: 
    *   必须包含一个唯一的根 `<div>` 元素。
    *   (推荐) 为根元素添加通用 CSS 类，如 `card` 或 `xhs-card`，以便导出功能 (`_getExportableCardElement`) 能够可靠地找到它。
    *   内部结构应逻辑清晰，建议划分为页眉、主内容、页脚等逻辑区域，并添加相应的 CSS 类 (`card-header`, `card-content`, `card-footer`) 以提高可读性。

4.  **Props 规范**: 
    *   **必需 Props**: 必须接收以下核心 Props，并进行类型和必要性校验：
        *   `type: { type: String, required: true, validator: (value) => ['cover', 'content'].includes(value) }`
        *   `cardData: { type: Object, required: true }`
        *   `headerText: { type: String, default: '' }`
        *   `footerText: { type: String, default: '' }`
        *   `isHeaderVisible: { type: Boolean, default: true }`
        *   `isFooterVisible: { type: Boolean, default: true }`

5.  **内容处理**: 
    *   必须使用 `type` Prop 结合 `v-if`/`v-else` 来处理封面 (`cover`) 和内容 (`content`) 两种卡片类型的不同渲染逻辑。
    *   **标题、副标题与正文渲染 (Markdown/LaTeX 支持)**: 
        *   **封面标题 (`cardData.title`)**, **封面副标题 (`cardData.subtitle`)**, **内容卡片标题 (`cardData.title`)** 和 **内容卡片正文 (`cardData.body`)** 都**必须**支持 Markdown 语法和 LaTeX 公式渲染，并且需要正确处理换行。
        *   实现方式：必须通过 Vue 的**计算属性 (computed property)** 调用 `src/utils/markdownRenderer.js` 中的 `renderMarkdownAndLaTeX` 函数对 `cardData` 中相应的文本进行处理，并将结果绑定到模板中对应元素的 `v-html` 指令上。
        *   **注意**: 当使用 `v-html` 渲染由 Markdown 生成的 HTML 时，如果 Markdown 源文本仅包含一行文本，`marked` (或其配置) 可能会将其包裹在一个 `<p>` 标签内。这可能会引入不必要的垂直边距。为避免此问题，建议在模板组件的 `<style scoped>` 中添加针对渲染容器的 `:deep(p) { margin: 0; }` 样式规则来重置段落边距。
        ```javascript
        // 示例：在 setup 函数中处理 cardData
        import { computed } from 'vue';
        import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';
        
        export default {
          props: {
            type: String, // 'cover' or 'content'
            cardData: Object, // 包含 title, subtitle (cover) 或 title, body (content)
            // ... 其他 props
          },
          setup(props) {
            const renderedCoverTitle = computed(() => {
              return props.type === 'cover' && props.cardData?.title
                     ? renderMarkdownAndLaTeX(props.cardData.title)
                     : '';
            });
            
            const renderedCoverSubtitle = computed(() => {
              return props.type === 'cover' && props.cardData?.subtitle
                     ? renderMarkdownAndLaTeX(props.cardData.subtitle)
                     : '';
            });

            const renderedContentTitle = computed(() => {
              return props.type === 'content' && props.cardData?.title 
                     ? renderMarkdownAndLaTeX(props.cardData.title) 
                     : '';
            });

            const renderedMarkdownBody = computed(() => {
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
          // ...
        }
        ```
    *   **普通纯文本渲染**: 对于页眉 (`headerText`)、页脚 (`footerText`) 等**确定始终为纯文本**的内容，应使用 `{{ }}` 插值，并为其容器元素添加 `whitespace-pre-line` CSS 类以支持换行。

6.  **样式规范**: 
    *   **主要使用 Tailwind CSS**: 优先使用 Tailwind 的原子类进行布局和样式设置。
    *   **Scoped CSS**: 特定于模板的复杂样式（如特殊背景、字体效果）或需要覆盖子组件/第三方库（如 KaTeX）样式时，使用 `<style scoped>`。
    *   **深度选择器 (`:deep()`)**: 
        *   在 `<style scoped>` 中修改**子组件**或**第三方库（如 KaTeX）**的样式时，**必须**使用 `:deep()` 深度选择器，以确保样式正确应用且不影响其他组件。
        *   对于通过 `v-html` 渲染的 **Markdown 内容**，也**必须**使用 `:deep()` 为常见的 HTML 元素（如列表 `<ul>`, `<ol>`, `<li>`，也可考虑代码块 `<pre>`, `<code>` 等）提供基础的、符合模板风格的样式，以保证可读性和一致性。例如：
        ```css
        /* 示例：在 scoped CSS 中为 Markdown 列表添加样式 */
        .markdown-body :deep(ul) {
          list-style-type: disc;
          margin-left: 1.5rem; /* 根据需要调整 */
          padding-left: 1rem;  /* 根据需要调整 */
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .markdown-body :deep(ol) {
          list-style-type: decimal;
          /* 其他样式类似 ul */
        }
        .markdown-body :deep(li) {
          margin-bottom: 0.25rem; /* 调整列表项间距 */
        }
        ```
    *   **避免全局污染**: 禁止在模板组件内定义未加 `scoped` 的全局样式。
    *   **样式可维护性**: 避免过于复杂或嵌套过深的 CSS 规则。鼓励使用 CSS 变量提高可配置性。
    *   **响应式设计**: 鼓励考虑不同屏幕尺寸的显示效果，使用 Tailwind 的响应式修饰符。
    *   **内容溢出**: 应妥善处理内容可能溢出的情况（特别是 `card-content` 或 `markdown-body`

## 添加新模板的步骤

要向应用中添加一个新的卡片样式模板，请遵循以下步骤：

1.  **创建模板组件**: 在 `src/templates/` 目录下创建一个新的 `.vue` 文件，例如 `TemplateAwesome.vue`。确保遵循上述"模板开发规定"中的**基础结构**、**Props 规范**、**内容处理**和**样式规范**。

2.  **注册元数据**: 打开 `src/config/templateMetadata.js` 文件。
    *   根据你的文件名 `TemplateAwesome.vue`，确定模板 ID 为 `templateawesome` (全小写)。
    *   在 `templateMetadata` 对象中添加一个新的键值对：
        ```javascript
        export const templateMetadata = {
          // ... 其他模板
          templateawesome: {       // 使用小写的 ID 作为 key
            name: '超棒模板',       // 定义在 UI 中显示的名称
            aspectRatio: '4/3'    // 定义正确的宽高比
          }
        };
        ```

3.  **重启开发服务器 (或等待热更新)**: 保存所有更改。Vite 的 `import.meta.glob` 应该能够自动检测到新文件，而 `useTemplateLoader` 会读取更新后的元数据。

4.  **测试**: 刷新应用页面，检查新模板是否出现在选择列表中，并且预览、缩放和导出功能是否正常工作。

## AI 助手 Prompt 模板

用于指导 AI 助手（例如本文档中使用的 Gemini/ChatGPT 等）生成符合本项目规范的小红书知识卡片 Markdown 源文件的 Prompt 模板，定义在以下位置：

*   **文件**: `src/prompts/knowledge_card_prompt.md`

在与 AI 助手协作生成新的选题内容时，应参考或使用此模板，以确保输出格式的准确性。

其中，该 Prompt 指导 AI 在生成的 Markdown 文件对应卡片下方，使用 `<!-- 插图建议: ... -->` HTML 注释格式，提供关于如何创建可视化素材的**简洁建议**，而不是生成详细的、可直接执行的 Manim 代码 Prompt。

## 媒体资源管理规范

为了更好地管理项目中用于辅助说明的图片、动画等媒体资源（例如使用 Manim 生成的可视化内容），请遵循以下规范：

1.  **存储位置**:
    *   所有**最终使用**的媒体资源（通常由 Manim 生成）统一存放在项目**根目录下的 `media/` 文件夹**中。Manim 会根据脚本和场景名称自动在此目录下创建子文件夹（如 `media/images/topic01_timeseries_examples/`）。
    *   **注意**: 此 `media/` 目录与 Vue 应用的 `src/assets/` 目录不同，后者用于存放 CSS、字体等前端构建资源。

2.  **文件命名**: 
    *   Manim 生成的文件名默认基于其 **Scene 类名**（例如 `TimeSeriesExamples8x9.png`）。
    *   为了更好地与知识卡片内容关联和复用，**推荐**在 Manim 输出后，根据 AI Prompt 中建议的命名规则手动或通过脚本将其**重命名**为：`[topicId]_[content_description]_[optional_remarks].<extension>`。
        *   `[topicId]`: 对应的选题 ID。
        *   `[content_description]`: 使用小写英文或拼音加下划线描述内容。
        *   `[optional_remarks]`: 可选的备注信息。
        *   `<extension>`: 文件扩展名 (如 `.png`, `.mp4`)。
    *   例如，将 Manim 生成的 `media/images/topic01_timeseries_examples/TimeSeriesExamples8x9.png`