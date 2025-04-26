# 小红书知识卡片生成器

## 项目介绍

这是一个专为时间序列知识科普设计的小红书知识卡片生成工具，旨在通过模板化和可视化编辑，快速将选题内容转化为符合小红书风格的精美图片卡片和配套文案，提高内容创作效率。

### 主要功能

1.  **主题元数据加载**：从 `src/content/topicsMeta.js` 加载所有选题的元信息（标题、描述）。
2.  **动态内容加载与检测**：选择选题后，从对应的 `src/content/topicXX_content.js` 文件动态加载详细内容。`TopicSelector` 会检测文件是否存在以及 `localStorage` 状态。
3.  **卡片样式模板选择**：提供多种基础卡片样式模板供选择 (`Template1`, `Template2`, `Template5` - 支持 3:4 和 9:16 等比例)。用户可以在预览区选择不同的模板，实时查看效果。
4.  **可视化内容编辑**：
    *   实时编辑全局页眉/页脚、封面标题/副标题、卡片标题/内容、主文案。
    *   内容卡片支持拖拽排序 (`vuedraggable`)。
    *   内容卡片和封面卡片支持单独显隐页眉/页脚。
    *   支持 **Markdown 语法** (使用 `markdown-it` 库) 和 **LaTeX 数学公式** (行内 `$formula$` 和块级 `$$formula$$`，使用 `katex` 库渲染)。
    *   **卡片增删**: 
        *   **删除**: 可删除内容卡片（至少保留一张）。
        *   **添加**: 通过悬停在卡片之间或首张卡片上方时出现的"+" 新卡片"按钮（插入点），在指定位置添加新卡片。
    *   文本域根据内容自动调整高度。
5.  **实时预览与联动滚动**：
    *   在编辑的同时，右侧面板实时显示选定卡片样式模板下的最终效果。
    *   **编辑区到预览区**：点击编辑区卡片旁的定位按钮，预览区会平滑滚动，使对应预览卡片**水平居中**显示。
    *   **预览区到编辑区**：点击预览区的左右箭头切换卡片，编辑区会平滑滚动，使对应编辑卡片的**顶部与其滚动容器顶部对齐**，方便编辑。
6.  **内容保存与导出**：
    *   **图片导出**：使用 `html2canvas` 将预览卡片导出为 PNG 图片。支持单独导出某一张卡片或一键导出所有卡片。导出图片具有较高分辨率 (scale: 2)。
    *   **ZIP 压缩包导出**：一键将所有导出的卡片图片打包成一个 ZIP 文件下载 (可能使用 `jszip` 等库)。
    *   **文案复制**：一键复制编辑好的小红书主文案到剪贴板。
    *   **JS 文件生成**: 将当前编辑的所有内容（包括页眉页脚、卡片、主文案）保存为一个 JS 文件 (`topicXX_content.js`) 供用户下载，方便后续替换项目中的原始文件或备份。

### 技术栈

-   **前端框架**：Vue.js 3 (v3.3.4) - 使用组合式 API (Composition API)。
    -   *代码组织*: 采用组合式函数 (`src/composables`) 拆分组件逻辑，提高可维护性和复用性。
    -   *动态加载*: 
        -   选题内容 (`topicXX_content.js`) 根据用户选择按需动态加载。
        -   卡片模板组件 (`src/templates/*.vue`) 也采用动态加载 (`import.meta.glob` + `defineAsyncComponent`)，优化初始加载性能。
-   **构建工具**：Vite (v4.3.9) - 提供快速的开发和构建体验。
-   **样式方案**：Tailwind CSS (v3.3.2) - 原子化 CSS 框架，快速构建界面。
-   **CSS 预处理器**：PostCSS (v8.4.24) - 处理 CSS 兼容性 (autoprefixer)。
-   **Markdown 解析**：markdown-it (latest) - 功能丰富、可扩展的 Markdown 解析器。
-   **LaTeX 渲染**：KaTeX (latest) - 快速 Web 数学公式渲染库。
-   **图片生成**：html2canvas (v1.4.1) - 将 DOM 元素渲染成 Canvas，进而导出为图片。
-   **文件下载/打包**：file-saver (v2.0.5), JSZip (可能用于 ZIP 导出)
-   **拖拽排序**: vuedraggable (next) - 实现卡片拖拽排序功能。
-   **数据结构**：JavaScript 对象/JSON - 用于定义和存储选题内容。

## 使用方法

### 安装依赖

确保已安装 Node.js (建议 v16 或更高版本)。

```bash
npm install
```

### 开发模式

启动本地开发服务器，支持热更新。

```bash
npm run dev
```

默认访问地址：`http://localhost:5173`

### 构建项目

将项目打包为生产环境的静态文件。

```bash
npm run build
```

构建后的文件位于 `/dist` 目录。

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

## 工作流程

1.  **准备内容**：
    *   在 `src/content/topicsMeta.js` 中定义选题的元信息 (ID, 标题, 描述)。
    *   为每个选题 ID 创建对应的 `src/content/topicXX_content.js` 文件，包含详细的卡片内容和主文案。
2.  **启动应用**：运行 `npm run dev`。
3.  **选择选题**：在应用首页（`TopicSelector`）点击要制作的选题卡片，应用将加载对应的 `topicXX_content.js`。
4.  **选择卡片样式**：在编辑页面（`CardConfig`）的卡片配置区选择卡片样式模板 (`模板1`, `模板2`, `模板5`)。
5.  **编辑卡片内容**：
    *   修改整体标题、封面副标题、各内容卡片的标题和内容。
    *   内容编辑框支持 Markdown 语法 (如 `**加粗**`, `- 列表`, `换行` 等) 和 LaTeX 公式 (行内 `$E=mc^2$`, 块级 `$$\sum_{i=1}^n x_i$$`)。
    *   可以点击卡片右上角的"删除"按钮移除多余的卡片。
    *   通过卡片间出现的插入点"+" 新卡片"按钮添加新的内容卡片。
    *   使用拖拽手柄调整内容卡片顺序。
    *   使用定位按钮或左右箭头快速在编辑区和预览区之间同步滚动位置。
    *   右侧面板会根据选择的样式模板和修改的内容实时更新预览效果。
6.  **导出/保存资源**：
    *   点击"生成 JS 文件供下载"按钮，将当前编辑状态保存为一个新的 `topicXX_content.js` 文件。用户需手动将其移动到 `src/content/` 目录替换旧文件。
    *   点击预览区的"导出"按钮生成单张图片，或"导出所有图片"批量生成，或"打包下载 (ZIP)"获取压缩包。
    *   点击配置区的"复制主文案"按钮获取文本。
7.  **发布**：使用导出的图片和文案在小红书平台发布笔记。

## 项目结构

```
.			# 项目根目录
├── .git/			# Git 版本控制目录
├── .vscode/			# VSCode 编辑器配置
├── docs/			# 项目文档
│   ├── 【文字版】时间序列数据.md
│   ├── 写作要点分析.md
│   └── 选题库.md
├── Manim/			# Manim 可视化脚本
│   └── *.py        # Manim 动画生成 Python 脚本
├── media/                  # Manim 默认输出目录，存放最终媒体资源
│   ├── images/
│   │   └── topic01_timeseries_examples/ # 按脚本和场景分类 (Manim 默认)
│   │       └── TimeSeriesExamples8x9.png
│   │
│   ├── videos/
│   └── texts/
├── node_modules/		# 项目依赖
├── public/			# 静态资源 (如图标) - (注：当前未列出，但通常存在于 Vite 项目)
├── scripts/			# Node.js 脚本 (如 Markdown 转换脚本)
├── src/
│   ├── assets/		# Vue 应用静态资源 (如 CSS)
│   │   └── styles/
│   │       └── index.css # 主要样式文件 (引入Tailwind)
│   ├── components/		# Vue 组件 (视图层)
│   │   ├── CardConfig.vue  # 卡片配置面板
│   │   ├── CardPreview.vue # 卡片预览面板
│   │   └── TopicSelector.vue # 选题选择器
│   ├── composables/	# Vue 组合式函数 (有状态逻辑复用)
│   │   ├── useCardManagement.js       # 管理卡片内容状态与操作
│   │   ├── useTemplatePreviewScaling.js # 管理模板预览、缩放与选择
│   │   └── useTextareaAutoHeight.js   # 管理文本域自动高度
│   ├── content/		# 选题内容数据
│   │   ├── topicsMeta.js      # 选题元信息 (ID, 标题, 描述)
│   │   ├── topic01_content.js # 选题1的详细内容
│   │   └── ...                # 其他选题内容文件
│   ├── prompts/        # AI Prompt 模板
│   │   └── knowledge_card_prompt.md # 小红书知识卡片生成 Prompt
│   ├── templates/		# 卡片样式模板组件
│   │   ├── Template1.vue   # 模板1实现 (3:4)
│   │   ├── Template2.vue   # 模板2实现 (3:4)
│   │   ├── Template5.vue   # 模板5实现 (9:16)
│   ├── utils/		# 通用工具函数 (无状态逻辑)
│   │   ├── cardExport.js   # 卡片导出逻辑 (html2canvas, file-saver, jszip)
│   │   └── markdownRenderer.js # Markdown & LaTeX 渲染逻辑 (markdown-it, katex)
│   ├── App.vue		# 应用根组件 (协调各部分)
│   └── main.js		# 应用入口文件
├── .gitignore		# Git 忽略配置
├── index.html		# HTML 入口文件
├── package.json		# 项目依赖与脚本配置
├── package-lock.json	# 确切的依赖版本锁定文件
├── postcss.config.js	# PostCSS 配置文件
├── README.md		# 项目说明文档 (本文件)
├── tailwind.config.js	# Tailwind CSS 配置文件
├── vite.config.js		# Vite 配置文件
└── ...                 # 其他文档或配置文件
```

## 具体使用步骤

1.  **选择选题内容**：
    *   启动应用后，首页展示 `src/content/topicsMeta.js` 中定义的所有可用选题。
    *   点击想要使用的选题卡片，应用会加载对应的 `topicXX_content.js` 文件，并进入编辑页面。

2.  **选择卡片样式**：
    *   在编辑页左侧的配置面板中，点击"选择模板"下的样式预览图（模板1/2/5）来切换卡片的视觉风格。

3.  **编辑卡片内容**：
    *   修改整体标题、封面副标题、各内容卡片的标题和内容。
    *   内容编辑框支持 Markdown 语法 (如 `**加粗**`, `- 列表`, `换行` 等) 和 LaTeX 公式 (行内 `$E=mc^2$`, 块级 `$$\sum_{i=1}^n x_i$$`)。
    *   可以点击卡片右上角的"删除"按钮移除多余的卡片。
    *   通过卡片间出现的插入点"+" 新卡片"按钮添加新的内容卡片。
    *   使用拖拽手柄调整内容卡片顺序。
    *   使用定位按钮或左右箭头快速在编辑区和预览区之间同步滚动位置。
    *   右侧面板会根据选择的样式模板和修改的内容实时更新预览效果。

4.  **导出使用**：
    *   在预览面板，点击"导出所有图片"按钮，会将封面卡片和所有内容卡片按当前选定的样式模板导出为 PNG 图片文件。
    *   或者点击"打包下载 (ZIP)"按钮，将所有图片打包成一个 ZIP 文件下载。
    *   也可以点击每张预览卡片下方的"导出"按钮，单独保存该卡片。
    *   在配置面板或预览面板，点击"复制主文案"按钮，将对应选题的小红书笔记文案复制到剪贴板。
    *   点击配置面板的"生成 JS 文件供下载"按钮，可以将当前编辑状态保存为 JS 文件，用于备份或替换项目源文件。

5.  **发布笔记**：
    *   将导出的图片按顺序上传到小红书，并将复制的文案粘贴到笔记编辑区，进行最终调整后发布。

## 选题内容模板扩展

项目的内容组织分为两部分：

1.  **选题元信息 (`src/content/topicsMeta.js`)**: 这个文件定义了所有选题的基础信息，用于在选择器中展示。
    ```javascript
    // src/content/topicsMeta.js
    export const topicsMeta = [
      {
        id: 'topic01', // 唯一 ID，与内容文件名对应
        title: '【小白入门】什么是时间序列数据？',
        description: '用生活实例：股价、气温、你的体重变化...'
      },
      // ... 更多选题元信息
    ];
    ```

2.  **选题详细内容 (`src/content/topicXX_content.js`)**: 每个选题对应一个文件，文件名必须是 `topic` 加上元信息中的 `id` 再加上 `_content.js` (例如 `topic01_content.js`)。文件导出一个包含具体内容的常量。
    ```javascript
    // src/content/topicXX_content.js
    export const topicXX_contentData = { // 导出常量名需与文件名匹配
      headerText: "全局页眉文本 (可选)",
      footerText: "全局页脚文本 (可选)",
      coverCard: {
        title: '封面卡片标题',
        subtitle: '封面卡片副标题\n支持换行',
        showHeader: true, // 是否显示页眉
        showFooter: true  // 是否显示页脚
      },
      contentCards: [
        {
          title: '内容卡片1标题',
          body: '内容卡片1正文，支持 **Markdown** 和 $LaTeX$。\n- 列表\n$$\alpha$$',
          showHeader: true,
          showFooter: true
        },
        // ... 更多内容卡片对象
      ],
      mainText: `对应的小红书主文案。

      #话题标签`
    };
    ```

**添加新选题的步骤**:

1.  在 `src/content/topicsMeta.js` 的 `topicsMeta` 数组中添加一个新的对象，定义 `id`, `title`, `description`。
2.  在 `src/content/` 目录下创建一个新的 JS 文件，命名为 `topicYY_content.js` (YY 是上一步定义的 `id`)。
3.  在新文件中，按照上述格式定义并导出 `topicYY_contentData` 常量，填充卡片内容和主文案。

## 开发阶段

-   [x] **阶段1**：基础架构设计与实现
    *   [x] 项目初始化与配置 (Vite, Vue3, Tailwind)
    *   [x] 核心组件开发 (`TopicSelector`, `CardConfig`, `CardPreview`)
    *   [x] 主题模板加载与内容绑定
        *   [x] 重构内容加载逻辑，使用 `topicsMeta.js` 和独立的 `topicXX_content.js` 文件。
        *   [x] 解决动态导入在开发环境下的路径解析和 Vite 分析问题 (使用 `import.meta.glob`)。
    *   [x] 基础卡片样式模板 (`Template1`, `Template2`)
    *   [x] 添加模板5 (`Template5`)
    *   [x] 图片导出功能 (`html2canvas`, `file-saver`)
    *   [x] 文案复制功能
    *   [x] Markdown 与 LaTeX 渲染 (`markdown-it`, `katex`)
    *   [x] 更新默认卡片尺寸比例为 3:4 (小红书标准)，部分模板可能保持特定比例
    *   [x] **修复**: 在 `useCardManagement` 中使用 `JSON.parse/stringify` 替换 `structuredClone` 以实现可靠深拷贝。
    *   [x] 实现卡片拖拽排序 (`vuedraggable`)
    *   [x] 实现卡片页眉/页脚单独显隐
    *   [x] 实现 JS 文件生成供下载
    *   [x] 实现图片打包为 ZIP 文件导出
    *   [x] 实现编辑区与预览区联动滚动，优化滚动对齐逻辑

-   [ ] **阶段2**：功能完善
    *   [ ] 完善 Markdown 渲染支持 (例如代码高亮 `highlight.js`)
    *   [ ] 提供更多背景样式选项 (如果需要覆盖模板固定样式)
    *   [ ] 实现配置的本地存储 (LocalStorage)，记住上次编辑状态或常用配置。

-   [ ] **阶段3**：高级功能与体验优化
    *   [ ] 表情符号选择器集成到文本编辑器。
    *   [ ] 允许用户上传自定义背景图片 (如果需要)。
    *   [ ] 优化模板预览缩放逻辑，确保不同比例模板预览效果准确。

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

## Markdown 内容转换为 JS 数据

为了更方便地创作和管理选题内容，项目提供了一个 Node.js 脚本 (`scripts/convertMarkdown.js`)，可以将特定格式的 Markdown 文件转换为应用所需的 `src/content/topicXX_content.js` 数据文件。

**1. 安装依赖**: 

确保你已经在项目根目录安装了 `gray-matter` 依赖：

```bash
npm install gray-matter --save-dev
# 或
yarn add gray-matter --dev
```

**2. 编写 Markdown 源文件**: 

**将 Markdown 源文件直接放置在项目根目录下**，或者根据 `scripts/convertMarkdown.js` 脚本的实际读取逻辑调整存放位置。推荐文件名与 `topicId` 一致 (例如 `topic01.md`)。文件格式约定如下：

*   **YAML Front Matter (文件开头的 `---` 包裹部分)**:
    *   `topicId`: (**必需**) 字符串，选题的唯一 ID，决定 JS 文件名和导出变量名。
    *   `title`: (**必需**) 字符串，选题的主标题，运行 `xinwenan` 命令时传入，也会作为封面卡片的默认标题来源。
    *   `headerText`: (可选) 字符串，全局页眉。
    *   `footerText`: (可选) 字符串，全局页脚 (支持 `\n` 换行)。
    *   `mainText`: (**不再使用/忽略**) ~~字符串，小红书主文案...~~ **请务必在 Markdown 正文中使用 `## Main Text` 定义主文案 (见下文)。Front Matter 中的此字段将被忽略。**
    *   `coverShowHeader`: (可选, 默认 `true`) 布尔值，控制封面卡片页眉显隐。
    *   `coverShowFooter`: (可选, 默认 `true`) 布尔值，控制封面卡片页脚显隐。
    *   `contentDefaultShowHeader`: (可选, 默认 `true`) 布尔值，内容卡片页眉显隐的**默认值**。
    *   `contentDefaultShowFooter`: (可选, 默认 `true`) 布尔值，内容卡片页脚显隐的**默认值**。

*   **卡片分隔符 (`---`)**:
    *   **必须**使用三个短横线 `---` 且**必须单独占一行**来分隔不同的卡片（封面卡片与内容卡片之间，以及内容卡片之间）。

*   **封面卡片内容 (Front Matter 后，第一个 `---` 前)**:
    *   **标题 (`coverCard.title`)**: 脚本会查找此区域内的**第一个一级标题** (以 `# ` 开头，注意 `#` 后有空格)。该行文本 (去除 `# `) 将作为封面标题，**覆盖** Front Matter 中的 `title` 用于卡片显示。支持 Markdown/LaTeX 及换行 (`\n`)。
    *   **副标题 (`coverCard.subtitle`)**: 封面标题行**之后**的所有非空行内容（保留原始换行）将作为封面副标题。**支持 Markdown/LaTeX 及换行 (\n)**。
    *   *无标题情况*: 若未找到 `# ` 标题，则此区域所有内容视为副标题，封面标题为空。

*   **内容卡片内容 (每个 `---` 之后)**:
    *   **标题 (`contentCards[i].title`)**: 脚本会查找每个内容块中的**第一个任意级别标题** (以 `# `、`## ` 等开头)。该行文本 (去除 `#` 号和空格) 将作为卡片标题。支持 Markdown/LaTeX 及换行 (`\n`)。
    *   **正文 (`contentCards[i].body`)**: 标题行**之后**的所有内容（直到下一个 `---` 或文件末尾）将作为卡片正文。支持 Markdown/LaTeX。
    *   *无标题情况*: 若未找到标题，则此区域所有内容视为正文，卡片标题为空。

*   **内容卡片显隐覆盖 (HTML 注释)**:
    *   可在**内容卡片**的**正文区域**内任意位置添加 HTML 注释来单独设置该卡片的页眉/页脚显隐，覆盖默认值。
    *   格式: `<!-- cardShowHeader: false -->` 或 `<!-- cardShowFooter: true -->` (值不区分大小写，注释会被从最终 `body` 中移除)。

*   **主文案 (`mainText`) 定义 (必需方式)**:
    *   **必须**在所有卡片内容定义完成**之后** (即最后一个 `---` 分隔符之后)，添加一个固定的二级标题：`## Main Text` 或 `## 主文案`。
    *   该标题之后的所有内容，直到文件末尾，都将被提取为 `mainText`。
    *   **重要提示**: 此区域内容旨在直接复制到小红书笔记编辑器，因此**请勿**在此区域使用 Markdown 语法 (如 `**加粗**`, `- 列表` 等) 或 LaTeX 公式 (`$...$`, `$$...$$`)。仅支持纯文本、换行、表情符号 Emoji 以及 `#话题标签#`。
    *   如果未找到此区域，生成的 JS 文件中 `mainText` 将为空字符串。

*   **内容格式与换行**: 
    *   封面标题、内容标题、内容正文均支持标准的 **Markdown** 和 **LaTeX** 语法，因为它们最终会通过 `renderMarkdownAndLaTeX` 处理。
    *   所有文本字段（包括页眉、页脚、副标题等）中的换行符 (`\n`) 都会被保留并在渲染时生效。


*请参考 `src/markdown/topic01.md` 查看具体示例。*

**3. 生成 JS 文件**: 

主要通过 `zhuanhuan` npm 脚本来将 Markdown 文件转换为 `.js` 数据文件。请在项目根目录下使用以下命令：

*   **转换指定文件**: 
    ```bash
    npm run zhuanhuan -- <topicId>
    # 示例 (转换项目根目录下的 topic02.md):
    npm run zhuanhuan -- topic02 
    ```
    *   **参数**: 
        *   `--`: **必需**的分隔符，用于区分 npm 命令和脚本参数。
        *   `<topicId>`: **必需**，要转换的 Markdown 文件对应的 `topicId` (脚本会自动查找项目根目录下的 `<topicId>.md`)。

*   **转换所有文件**: 
    ```bash
    npm run zhuanhuan -- all
    ```
    *   **参数**: 
        *   `--`: **必需**的分隔符。
        *   `all`: **必需** (不区分大小写)，指示脚本转换项目根目录下的所有 `.md` 文件。

**（可选）创建新 Markdown 文件**: 

使用 `xinwenan` 命令可以快速创建一个包含标准 Front Matter 的新 Markdown 文件。请在项目根目录下使用以下命令：
```bash
npm run xinwenan -- <topicId> <主标题>
# 示例:
npm run xinwenan -- topic03 "如何选择合适的模型"
```
*   **参数**: 
    *   `--`: **必需**的分隔符。
    *   `<topicId>`: **必需**，新选题的唯一 ID (只允许字母、数字、下划线、短横线)。
    *   `<主标题>`: **必需**，新选题的主标题 (可以包含空格，如果标题包含特殊 shell 字符，建议用引号包裹)。

这将在**项目根目录下**创建 `<topicId>.md`，并自动填入 `topicId` 和 `title`。


**注意**: 
*   运行转换脚本 (`zhuanhuan`) 会**覆盖**已存在的同名 `_content.js` 文件，请谨慎操作。
*   创建新文件脚本 (`xinwenan`) 如果发现文件已存在则会报错退出。

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