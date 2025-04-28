# 小红书知识卡片生成器

## 项目介绍

这是一个小红书知识卡片生成工具，旨在通过模板化和可视化编辑，快速根据已有的知识库或联网搜索知识，生成选题库，并将选题内容转化为符合小红书风格的精美图片卡片和配套文案，提高内容创作效率。

### 主要功能和使用流程

*   **选题管理与文案制作流程**: 
    *   加载 `src/content/topicsMeta.js` 中的选题元信息，在选题界面展示。（选题库需自己手动编辑）
    *   提供 Node.js 脚本 (`scripts/create_md_Template.js`) 快速创建 Markdown 模板。（手动输命令）
    *   根据选题内容一键生成prompt，便于辅助AI在已有md文件基础上生成详细文案，并以注释形式提供可视化示例资源演示建议。
    *   可利用ManimCE制作可视化演示素材，写了一个快速导出Manim的gui应用，支持导出为视频/图片，支持调节质量、背景透明与否等。
    *   提供 Node.js 脚本 (`scripts/md_To_JS_Content.js`) 将特定格式的 Markdown 文案文件转换为 JS 数据文件。（手动输命令）
    *   根据实际存在的js文案文件，动态加载 `src/content/topicXX_content.js` 中的详细内容，点击查看即可进入预览和编辑界面。
*   **卡片模板设计及模板选择**: 
    *   卡片类型分为封面卡片和内容卡片。
    *   提供多种样式模板，支持不同宽高比，实时预览不同模板效果。
    *   模板组件动态加载，优化性能。
*   **可视化编辑卡片、文案**: 
    *   支持实时编辑页眉/页脚、封面/内容卡片的标题/正文及主文案。
    *   支持 **Markdown** 和 **LaTeX** 数学公式。
    *   内容卡片支持拖拽排序、添加、删除。
    *   可单独控制卡片的页眉/页脚显隐。
    *   编辑内容实时反映在预览区。
    *   编辑区与预览区滚动联动，方便定位。
    *   (内部实现遵循 Vue 单向数据流原则，子组件通过事件更新父组件状态)。
*   **导出与保存图片、文案数据**: 
    *   导出单张或所有卡片为 **PNG 图片** (较高分辨率)。
    *   将所有图片打包为 **ZIP 文件**下载。
    *   一键**复制主文案**。
    *   将当前编辑内容**保存为 JS 文件** (`topicXX_content.js`)，用户可手动复制并替换本地数据。

#### 图片导出分辨率与 `scale` 选项

项目中使用了 `html2canvas` 库将卡片元素转换为图片。为了提高导出图片的清晰度（目前默认是scale:4），我们设置了 `scale` 选项（例如 `scale: 4`）。其工作原理如下：

*   **非简单拉伸**: `scale` 选项 **不是**简单地将原始尺寸的卡片渲染结果拉伸放大。
*   **扩大渲染画布**: 它指示 `html2canvas` 在内部创建一个**尺寸为原始元素 N 倍**的画布（例如，`scale: 4` 会使用原始尺寸 4 倍的画布）。
*   **高精度渲染**: `html2canvas` 会直接在这个**更大的画布上**以更高的精度重新绘制所有内容：
    *   **文字**: 使用更多像素渲染，边缘更平滑。
    *   **矢量图形 (边框、背景等)**: 绘制更精细。
*   **结果**: 最终从这个扩大后的画布导出的图片，拥有更高的像素密度，看起来更清晰，尤其对于文字和矢量图形效果显著。这类似于模拟在高 DPI (Retina) 屏幕上的渲染效果。

### 技术栈

*   **前端**: Vue.js 3 (组合式 API), Vite
*   **样式**: Tailwind CSS, PostCSS (autoprefixer)
*   **Markdown/LaTeX**: markdown-it, KaTeX
*   **图片/文件处理**: html2canvas, file-saver, JSZip
*   **拖拽**: vuedraggable
*   **数据**: JavaScript 对象/JSON
*   **辅助脚本**: Node.js, gray-matter

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

1.  **创建 Markdown 模板**: 
    *   打开终端，在项目根目录下运行 `npm run xinwenan -- <你的topicId> '<你的主标题>'` 来创建对应的 `.md` 文件模板到 `src/markdown/` 目录。此脚本会自动包含基础的 Front Matter 字段（包括 `topicId`, `title`, `description`）。
2.  **编辑 Markdown 源文件**: 
    *   打开新创建的 `.md` 文件，在 YAML Front Matter 部分填写或修改 `title` 和 `description`。
    *   参考 **"通过 Markdown 管理内容"** 部分的格式规范，编写封面卡片、内容卡片以及主文案。
3.  **AI 辅助生成详细文案**: 
    *   选题页面提供了"生成prompt"按钮，一键生成针对该选题的文案撰写 Prompt（或手动根据 `src/prompts/knowledge_card_prompt.md` 模板）。
    *   使用 AI 助手（如 Gemini, ChatGPT）结合生成的 Prompt，在 `.md` 文件中填充详细的卡片内容（标题、正文）。
    *   AI 应根据 Prompt 指导，在合适的卡片下方使用 `<!-- 插图建议: ... -->` 注释格式提供可视化素材的建议。
4.  **制作可视化素材 (可选)**: 
    *   参考 `.md` 文件中的插图建议，使用 ManimCE (或其他工具) 创建图片或视频素材。
    *   (可选) 使用配套的 Manim GUI 应用（如适用）辅助导出，调整参数。
    *   建议将最终素材按规范命名并存放在项目根目录的 `media/` 下（参考 **"媒体资源管理规范"**）。
5.  **转换 Markdown 并更新元数据**: 
    *   运行 `npm run zhuanhuan -- <你的topicId>` 或 `npm run zhuanhuan -- all`。
    *   此脚本会：
        *   将 `src/markdown/` 下的 `.md` 文件转换为 `src/content/` 目录下的 `_content.js` 数据文件。
        *   **自动读取** `.md` 文件 Front Matter 中的 `topicId`, `title`, `description`，并**更新或添加**到 `src/content/topicsMeta.js` 文件中，无需手动编辑 `topicsMeta.js`。
6.  **启动应用并选择选题**: 
    *   运行 `npm run dev` 启动应用。
    *   在首页选择你刚刚处理的选题卡片，进入编辑预览界面。
7.  **可视化编辑与微调**: 
    *   在左侧**配置面板**选择或切换卡片样式模板。
    *   对加载进来的内容（页眉/页脚、卡片标题/正文、主文案）进行最后的编辑和调整 (支持 Markdown/LaTeX)。
    *   通过拖拽、添加、删除按钮调整内容卡片顺序或数量。
    *   根据需要单独设置卡片的页眉/页脚显隐。
    *   右侧**预览面板**会实时更新效果。
8.  **导出与保存**: 
    *   在**预览面板**点击相应按钮，导出单张图片、所有图片或打包下载 ZIP 文件。
    *   在**配置面板**点击按钮，复制最终的主文案。
    *   (可选) 点击**配置面板**的 "生成 JS 文件供下载" 按钮，获取当前编辑状态的 JS 数据，下载后手动替换本地旧版本js数据。
9.  **发布**: 
    *   使用导出的图片和复制的文案，在小红书平台发布笔记。

**(备选流程: 直接编辑 JS)**

如果你不希望使用 Markdown 工作流，也可以跳过步骤 2-5，直接在 `src/content/` 目录下创建和编辑 `topicXX_content.js` 文件，然后从步骤 6 开始。

## 通过 Markdown 管理内容

为了更方便地创作和管理选题内容，推荐使用 Markdown 配合转换脚本。

**1. 创建 Markdown 模板 (可选)**

使用 `xinwenan` 命令快速创建标准格式的 `.md` 文件模板到 `src/markdown/` 目录。模板会自动包含必要的 Front Matter 字段。

```bash
npm run xinwenan -- <topicId> <主标题>
# 示例:
npm run xinwenan -- topic03 '如何选择合适的模型'
```
*   `<topicId>`: 新选题的唯一 ID。
*   `<主标题>`: 新选题的主标题 (建议用单引号包裹)。

**2. 编写 Markdown 源文件**

将 Markdown 源文件放置在 `src/markdown/` 目录下，文件名与 `topicId` 对应 (例如 `topic01.md`)。

文件格式约定：

*   **YAML Front Matter**: 文件开头 `---` 包裹的部分。**这是管理选题元数据的核心。**
    *   `topicId`: (必需) 字符串，唯一 ID。
    *   `title`: (必需) 字符串，主标题。**`zhuanhuan` 脚本会用此标题更新 `topicsMeta.js`。**
    *   `description`: (推荐) 字符串，选题的简介描述。**`zhuanhuan` 脚本会用此描述更新 `topicsMeta.js`。**
    *   `headerText`, `footerText`: (可选) 字符串，全局页眉/页脚。
    *   `coverShowHeader`, `coverShowFooter`: (可选, 默认 `true`) 布尔值，封面页眉/页脚显隐。
    *   `contentDefaultShowHeader`, `contentDefaultShowFooter`: (可选, 默认 `true`) 布尔值，内容卡片页眉/页脚默认显隐。
    *   **重要**: 字符串值**强烈建议使用单引号 (`'`) 包裹**，避免解析错误。
        ```yaml
        # 示例:
        topicId: 'topic01'
        title: '【小白入门】什么是时间序列数据？'
        headerText: '@你的用户名'
        footerText: ''
        ```
*   **卡片分隔符 (`---`)**: 单独一行，用于分隔封面卡片和内容卡片，以及内容卡片之间。
*   **封面卡片内容**: Front Matter 后，第一个 `---` 前。
    *   第一个 `# 标题` (一级) 作为封面标题 (覆盖 Front Matter 的 `title`)。
    *   标题后的内容作为副标题 (支持 Markdown/LaTeX)。
*   **内容卡片内容**: 每个 `---` 之后。
    *   第一个 `# 任意级别标题` 作为卡片标题。
    *   标题后的内容作为正文 (支持 Markdown/LaTeX)。
    *   可在正文中使用 `<!-- cardShowHeader: false -->` 或 `<!-- cardShowFooter: true -->` 单独覆盖显隐。
*   **主文案 (`mainText`)**: **必须**在所有卡片内容**之后**，以 `## Main Text` 或 `## 主文案` 标题开始，直到文件末尾。**此区域仅支持纯文本、换行、Emoji 和 #话题标签#**。

*请参考 `src/markdown/topic00.md` 查看具体示例。*

**3. 转换为 JS 数据文件并更新元数据**

使用 `zhuanhuan` 命令将 `.md` 文件转换为 `src/content/` 目录下的 `_content.js` 文件，并**自动更新** `src/content/topicsMeta.js`。

```bash
# 转换指定文件
npm run zhuanhuan -- <topicId>
# 示例: npm run zhuanhuan -- topic01

# 转换所有 .md 文件
npm run zhuanhuan -- all
```
*   转换脚本会**覆盖**已存在的同名 `_content.js` 文件，并**更新或添加** `topicsMeta.js` 中对应的条目。

## 选题内容模板扩展 (直接使用 JS)

如果不使用 Markdown 工作流，可以直接创建和编辑 `src/content/` 下的 JS 文件。

1.  **选题元信息 (`src/content/topicsMeta.js`)**: 定义所有选题的基础信息。
    ```javascript
    export const topicsMeta = [
      { id: 'topic01', title: '...', description: '...' },
      // ...
    ];
    ```
2.  **选题详细内容 (`src/content/topicXX_content.js`)**: 每个选题对应一个文件。
    ```javascript
    export const topicXX_contentData = { // XX 需与 id 匹配
      headerText: "可选页眉",
      footerText: "可选页脚",
      coverCard: { title: '...', subtitle: '...', showHeader: true, showFooter: true },
      contentCards: [
        { title: '...', body: '...', showHeader: true, showFooter: true },
        // ... more cards
      ],
      mainText: `小红书主文案...
#话题#`
    };
    ```

## 项目结构

```
.
├── .git/
├── .vscode/
├── docs/                   # 项目文档
├── Manim/                  # Manim 可视化应用，包括各个动画脚本、辅助导出的gui应用
├── media_final/                  # 最终媒体资源 (Manim 输出等, 建议 .gitignore)
├── node_modules/
├── public/                 # Vite 静态资源目录
├── scripts/                # Node.js 辅助脚本
│   ├── create_md_Template.js # 创建 Markdown 模板
│   └── md_To_JS_Content.js   # Markdown 转 JS 内容数据
├── src/
│   ├── assets/             # Vue 应用静态资源 (CSS, 字体等)
│   ├── components/         # Vue 组件
│   ├── composables/        # Vue 组合式函数
│   ├── config/             # 应用配置 (如模板元数据)
│   │   └── templateMetadata.js
│   ├── content/            # 选题内容数据 (JS 格式)
│   │   ├── topicsMeta.js
│   │   └── topicXX_content.js
│   ├── markdown/           # Markdown 源文件 (可选工作流)
│   │   └── topicXX.md
│   ├── prompts/            # AI Prompt 模板
│   ├── templates/          # 卡片样式模板组件 (*.vue)
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
        *   **注意**: 当使用 `v-html` 渲染由 Markdown 生成的 HTML 时，如果 Markdown 源文本仅包含一行文本，`markdown-it` 默认会将其包裹在一个 `<p>` 标签内。这可能会引入不必要的垂直边距。为避免此问题，建议在模板组件的 `<style scoped>` 中添加针对渲染容器的 `:deep(p) { margin: 0; }` 样式规则来重置段落边距。
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
    *   例如，将 Manim 生成的 `media/images/topic01_timeseries_examples/TimeSeriesExamples8x9.png` 重命名为 `media/topic01_components_overview.png` （或者按需移动到 `media/` 根目录或保留在子目录中，只要确保最终引用路径正确即可）。

3.  **尺寸比例**: 
    *   制作插图时，考虑到小红书展示效果及页眉页脚的存在，优先推荐使用 **8:9 (宽比高)** 的宽高比进行 Manim 场景配置。

4.  **版本控制**: 
    *   项目根目录下的 `media/` 目录通常包含大量二进制文件，会显著增加 Git 仓库体积。**强烈建议**将 `media/` 目录添加到 `.gitignore` 文件中，不纳入版本控制，或考虑使用 Git LFS (Large File Storage) 进行管理。

## Manim 中文支持配置 (Manim Community Edition)

如果计划使用 Manim 社区版 (ManimCE) 生成包含中文的可视化素材（如通过 `knowledge_card_prompt.md` 中生成的 Prompt 指令），需要确保 ManimCE 环境已正确配置中文支持。以下配置和代码示例适用于存放在 `Manim/` 目录下的 Python 脚本 (`.py` 文件)。

1.  **安装与环境**:
    *   确保已安装完整的 TeX 发行版 (如 TeX Live 或 MiKTeX)，且包含 `xelatex` 编译器。
    *   确保操作系统已安装所需的中文字体 (如 "微软雅黑 Microsoft YaHei", "思源黑体 Source Han Sans CN", "等线 DengXian" 等)，并且 LaTeX 能够找到它们。

2.  **ManimCE 脚本配置 (在 `Manim/*.py` 文件中)**:
    *   **对于 `Text` 对象 (纯文本)**: 在 Python 脚本开头设置全局字体：
        ```python
        from manim import *
        config.font = "Microsoft YaHei" # 替换为你选择的已安装中文字体
        ```
    *   **对于 `Tex` / `MathTex` 对象 (LaTeX 渲染)**: (关键) 需要修改 TeX 模板以使用 `xelatex` 并加载中文字体。推荐配置如下：
        ```python
        from manim import *
        import os # 用于处理换行符

        # 创建自定义 TeX 模板
        my_template = TexTemplate(
            tex_compiler="xelatex",       # 使用 xelatex
            output_format=".xdv",         # xelatex 对应的输出格式
        )

        # 在 LaTeX 导言区添加中文支持 (确保字体已安装)
        my_template.add_to_preamble(
            r"\usepackage{ctex}" + os.linesep +         # 加载 ctex 宏包
            r"\setCJKmainfont{Microsoft YaHei}" + os.linesep # 设置 CJK 主字体
            # 可选: \setCJKsansfont{思源黑体 CN} 等
        )

        # 应用配置好的模板到全局
        config.tex_template = my_template

        # --- 之后 Tex 和 MathTex 对象即可正确渲染中文 ---
        # 示例:
        # class MyScene(Scene):
        #     def construct(self):
        #         chinese_tex = Tex("你好，世界！ $E=mc^2$")
        #         self.play(Write(chinese_tex))
        ```

**总结**: 确保 LaTeX 环境和字体就绪，并在 `Manim/` 目录下的 Python 脚本中，根据需要配置 ManimCE 的 `config.font` (针对 `Text`) 和 `config.tex_template` (针对 `Tex`/`MathTex`)。

## 版本控制建议 (Git Workflow)

为了保持项目开发的清晰和稳定，推荐采用以下基于特性分支的 Git 工作流：

1.  **`main` 分支**:
    *   **角色**: 始终代表最新、最稳定、可随时运行的版本。
    *   **操作**:
        *   **禁止**直接在此分支提交未完成或未测试的代码。
        *   只合并 (merge) 已经开发完成并通过测试的特性分支 (`feature/*`) 或修复分支 (`fix/*`)。

2.  **特性分支 (`feature/*`, `fix/*`, `refactor/*` 等)**:
    *   **角色**: 所有新功能开发、Bug 修复、代码重构都在各自的特性分支上进行。
    *   **命名**: 使用清晰的名称，如 `feature/add-template5`, `fix/preview-scaling`, `refactor/card-component`。
    *   **流程**:
        1.  **创建**: 从最新的 `main` 分支创建新分支 (`git checkout main && git pull && git checkout -b feature/xxx`)。
        2.  **开发**: 在特性分支上进行编码，进行小步、频繁的提交 (`git commit -m "feat: 添加..."`)，推荐使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/) 规范编写提交信息。
        3.  **合并**: 功能完成后，切换回 `main` 分支，确保其为最新，然后合并特性分支 (`git checkout main && git pull && git merge --no-ff feature/xxx`)。`--no-ff` 可以保留分支的合并历史。
        4.  **推送**: 将本地的 `main` 和特性分支推送到远程仓库 (`git push origin main`, `git push origin feature/xxx`)。
        5.  **清理**: 合并后可删除不再需要的本地和远程特性分支 (`git branch -d feature/xxx`, `git push origin --delete feature/xxx`)。

**优点**:

*   **隔离性**: 功能开发互不影响。
*   **稳定性**: `main` 分支始终可用。
*   **可追溯**: 清晰的开发和合并历史。
*   **简单高效**: 适合单人或小团队项目。

**远程仓库**: 强烈建议使用 GitHub/GitLab/Gitee 等平台托管远程仓库，并定期推送代码作为备份。