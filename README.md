# 小红书知识卡片生成器

## 项目介绍

这是一个专为时间序列知识科普设计的小红书知识卡片生成工具，旨在通过模板化和可视化编辑，快速将选题内容转化为符合小红书风格的精美图片卡片和配套文案，提高内容创作效率。

### 主要功能

1.  **主题模板加载**：从预设的 `topicTemplates.js` 文件中加载选题内容，每个选题包含封面卡片、多张内容卡片和主文案。
2.  **卡片样式模板选择**：提供多种基础卡片样式模板供选择 (`Template1`, `Template2`, `Template3`, `Template5` - 支持 3:4 和 9:16 等比例)。
3.  **可视化内容编辑**：
    *   实时编辑主题标题、封面副标题、卡片标题和内容。
    *   支持 **Markdown 语法** (使用 `markdown-it` 库) 和 **LaTeX 数学公式** (行内 `$formula$` 和块级 `$$formula$$`，使用 `katex` 库渲染)。
    *   动态添加或删除内容卡片。
4.  **实时预览**：在编辑的同时，右侧面板实时显示选定卡片样式模板下的最终效果。
5.  **图片导出**：
    *   使用 `html2canvas` 将预览卡片导出为 PNG 图片。
    *   支持单独导出某一张卡片或一键导出所有卡片。
    *   导出图片具有较高分辨率 (scale: 2)。
6.  **文案复制**：一键复制编辑好的小红书主文案到剪贴板。

### 技术栈

-   **前端框架**：Vue.js 3 (v3.3.4) - 使用组合式 API (Composition API)。
    -   *代码组织*: 采用组合式函数 (`src/composables`) 拆分组件逻辑，提高可维护性和复用性。
-   **构建工具**：Vite (v4.3.9) - 提供快速的开发和构建体验。
-   **样式方案**：Tailwind CSS (v3.3.2) - 原子化 CSS 框架，快速构建界面。
-   **CSS 预处理器**：PostCSS (v8.4.24) - 处理 CSS 兼容性 (autoprefixer)。
-   **Markdown 解析**：markdown-it (latest) - 功能丰富、可扩展的 Markdown 解析器。
-   **LaTeX 渲染**：KaTeX (latest) - 快速 Web 数学公式渲染库。
-   **图片生成**：html2canvas (v1.4.1) - 将 DOM 元素渲染成 Canvas，进而导出为图片。
-   **文件保存**：file-saver (v2.0.5) - 在客户端保存生成的文件。
-   **数据结构**：JavaScript 对象/JSON - 用于定义和存储选题模板内容。

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

1.  **准备内容**：根据 `选题库.md` 构思内容，并在 `src/content/topicTemplates.js` 中添加或修改对应的选题模板数据。
2.  **启动应用**：运行 `npm run dev`。
3.  **选择选题**：在应用首页点击要制作的选题内容。
4.  **选择样式**：在编辑页面的卡片配置区选择卡片样式模板 (`模板1`, `模板2`, `模板3`, `模板5`)。
5.  **编辑与预览**：在编辑页面调整卡片内容（可使用 Markdown 和 LaTeX），并在右侧实时预览选定样式下的效果。
6.  **导出资源**：点击"导出全部卡片"生成图片，点击"复制主文案"获取文本。
7.  **发布**：使用导出的图片和文案在小红书平台发布笔记。

## 项目结构

```
.                       # 项目根目录
├── public/             # 静态资源 (如图标)
├── src/
│   ├── assets/         # 静态资源 (样式)
│   │   └── styles/
│   │       └── index.css # 主要样式文件 (引入Tailwind)
│   ├── components/     # Vue 组件 (视图层)
│   │   ├── CardConfig.vue  # 卡片配置面板
│   │   ├── CardPreview.vue # 卡片预览面板
│   │   └── TopicSelector.vue # 选题选择器
│   ├── composables/    # Vue 组合式函数 (逻辑复用)
│   │   ├── useCardManagement.js       # 管理卡片内容状态与操作
│   │   ├── useTemplatePreviewScaling.js # 管理模板预览、缩放与选择
│   │   └── useTextareaAutoHeight.js   # 管理文本域自动高度
│   ├── content/        # 选题内容模板数据
│   │   └── topicTemplates.js # 选题数据定义
│   ├── templates/      # 卡片样式模板组件
│   │   ├── Template1.vue   # 模板1实现 (3:4)
│   │   ├── Template2.vue   # 模板2实现 (3:4)
│   │   ├── Template3.vue   # 模板3实现 (3:4)
│   │   └── Template5.vue   # 模板5实现 (可能为 9:16)
│   ├── utils/          # 通用工具函数
│   │   ├── cardExport.js   # 卡片导出逻辑
│   │   └── markdownRenderer.js # Markdown & LaTeX 渲染逻辑
│   ├── App.vue         # 应用根组件
│   └── main.js         # 应用入口文件
├── .gitignore          # Git 忽略配置
├── index.html          # HTML 入口文件
├── package.json        # 项目依赖与脚本配置 (主要的依赖管理文件)
├── package-lock.json   # 确切的依赖版本锁定文件
├── postcss.config.js   # PostCSS 配置文件
├── README.md           # 项目说明文档 (本文件)
├── requirements.txt    # (用途待确认，可能与其他流程相关)
├── tailwind.config.js  # Tailwind CSS 配置文件
├── vite.config.js      # Vite 配置文件
├── 解决方案概要.md   # 解决方案设计文档
├── 第01期-什么是时间序列.md # 示例或内容源文件
├── 写作要点分析.md     # 示例或内容源文件
├── 选题库.md           # 示例或内容源文件
└── 【文字版】时间序列数据.md # 示例或内容源文件
```

## 具体使用步骤

1.  **选择选题内容**：
    *   启动应用后，首页展示 `src/content/topicTemplates.js` 中定义的所有可用选题内容。
    *   点击想要使用的选题卡片，进入编辑页面。

2.  **选择卡片样式**：
    *   在编辑页左侧的配置面板中，点击"选择模板"下的样式预览图（模板1/2/3/5）来切换卡片的视觉风格。

3.  **编辑卡片内容**：
    *   修改整体标题、封面副标题、各内容卡片的标题和内容。
    *   内容编辑框支持 Markdown 语法 (如 `**加粗**`, `- 列表`, `换行` 等) 和 LaTeX 公式 (行内 `$E=mc^2$`，块级 `$$\sum_{i=1}^n x_i$$`)。
    *   可以点击"添加卡片"增加新的内容卡片，或点击"删除"移除多余的卡片。
    *   右侧面板会根据选择的样式模板和修改的内容实时更新预览效果。

4.  **导出使用**：
    *   在预览面板，点击"导出全部卡片"按钮，会将封面卡片和所有内容卡片按当前选定的样式模板导出为 PNG 图片文件。
    *   也可以点击每张预览卡片下方的"导出"按钮，单独保存该卡片。
    *   在配置面板或预览面板，点击"复制主文案"按钮，将对应选题的小红书笔记文案复制到剪贴板。

5.  **发布笔记**：
    *   将导出的图片按顺序上传到小红书，并将复制的文案粘贴到笔记编辑区，进行最终调整后发布。

## 选题内容模板扩展

可以通过编辑 `src/content/topicTemplates.js` 文件添加或修改选题内容。

```javascript
// 导出一个新的选题对象
export const topicXX = {
  coverCard: {
    title: '新选题的封面标题', 
    subtitle: '封面卡片的副标题内容\n支持换行'
    // 不再需要 bgColor
  },
  contentCards: [
    {
      title: '第一个内容卡片的标题',
      content: '卡片内容，支持 **Markdown** 格式和 $LaTeX$ 公式。\n- 列表项1\n- 列表项2\n$$\alpha + \beta = \gamma$$ ',
      // 不再需要 bgColor
    },
    // 可以添加更多内容卡片对象
  ],
  mainText: `这是对应的小红书笔记主文案。

包含所有必要的文字内容和 #话题标签。

➡️ **重点信息**
✅ 清单
$E=mc^2$

#话题1 #话题2`
};

// 别忘了在文件底部的 default export 中导出新选题
export default {
  topic01,
  topic02,
  topic03,
  topicXX // 添加新选题
};
```

## 开发阶段

-   [x] **阶段1**：基础架构设计与实现
    *   [x] 项目初始化与配置 (Vite, Vue3, Tailwind)
    *   [x] 核心组件开发 (`TopicSelector`, `CardConfig`, `CardPreview`)
    *   [x] 主题模板加载与内容绑定
    *   [x] 基础卡片样式模板 (`Template1`, `Template2`, `Template3`)
    *   [x] 新增卡片样式模板 (`Template5` - 可能为 9:16 宽高比)
    *   [x] 图片导出功能 (`html2canvas`, `file-saver`)
    *   [x] 文案复制功能
    *   [x] Markdown 与 LaTeX 渲染 (`markdown-it`, `katex`)
    *   [x] 更新默认卡片尺寸比例为 3:4 (小红书标准)，部分模板可能保持特定比例

-   [ ] **阶段2**：功能完善
    *   [ ] 完善 Markdown 渲染支持 (例如代码高亮 `highlight.js`)
    *   [ ] 提供更多背景样式选项 (如果需要覆盖模板固定样式)
    *   [ ] 实现配置的本地存储 (LocalStorage)，记住上次编辑状态或常用配置。
    *   [ ] 优化导出流程，例如打包为 ZIP 文件。

-   [ ] **阶段3**：高级功能与体验优化
    *   [ ] 表情符号选择器集成到文本编辑器。
    *   [ ] 允许用户上传自定义背景图片 (如果需要)。
    *   [ ] 增加拖拽调整卡片顺序功能。

## 模板开发规定

为确保项目模板的一致性、可维护性和质量，所有新卡片模板的开发应遵循以下规定：

1.  **文件与命名**:
    *   模板组件应放置在 `src/templates/` 目录下。
    *   文件名和组件名应采用大驼峰命名法，例如 `TemplateNewStyle.vue`，组件 `name` 属性也应设置为 `TemplateNewStyle`。

2.  **基础结构**:
    *   必须包含一个唯一的根 `<div>` 元素。
    *   内部结构应逻辑清晰，强制要求划分为页眉、主内容、页脚等逻辑区域，并**必须**为这些关键区域添加以下 CSS 类名：
        *   页眉区域: `card-header`
        *   主内容区域: `card-content`
        *   页脚区域: `card-footer`
        *   (可选) Markdown/富文本内容容器: `markdown-body` (如果适用)

3.  **Props 规范**:
    *   **必需 Props**: 必须接收以下核心 Props，并进行类型和必要性校验：
        *   `type: { type: String, required: true, validator: (value) => ['cover', 'content'].includes(value) }` 用于区分卡片类型。
        *   `content: { type: Object, required: true }` 用于接收核心内容数据。
        *   `title: { type: String, default: '' }` (主要用于封面)。
        *   `headerText: { type: String, default: '' }`。
        *   `footerText: { type: String, default: '' }`。
        *   `isHeaderVisible: { type: Boolean, default: true }`。
        *   `isFooterVisible: { type: Boolean, default: true }`。
    *   **可选 Props**: 可根据模板特定需求添加其他 Props（如背景色、字体配置等），但必须提供合理的默认值。
    *   **Props 定义**: 应包含 `type`, `required` (如果需要), `default`, `validator` (如果需要)。

4.  **内容处理**:
    *   必须使用 `type` Prop 结合 `v-if`/`v-else` 来处理封面 (`cover`) 和内容 (`content`) 两种卡片类型的不同渲染逻辑。
    *   内容卡片的 Markdown/LaTeX 渲染必须通过计算属性调用 `src/utils/markdownRenderer.js` 中的 `renderMarkdownAndLaTeX` 函数，并将结果绑定到 `v-html`。
        ```javascript
        import { renderMarkdownAndLaTeX } from '../utils/markdownRenderer';
        
        export default {
          // ... props
          computed: {
            renderedMarkdown() {
              // 确保 content 和 content.body 存在
              return this.content && this.content.body ? renderMarkdownAndLaTeX(this.content.body) : '';
            }
          }
        }
        ```
    *   普通文本（页眉、页脚、标题等）应使用 `{{ }}` 插值，并添加 `whitespace-pre-line` 类以支持换行。

5.  **样式规范**:
    *   **主要使用 Tailwind CSS**: 优先使用 Tailwind 的原子类进行布局和样式设置。
    *   **Scoped CSS**: 特定于模板的复杂样式（如特殊背景、字体效果）或需要覆盖子组件/第三方库（如 KaTeX）样式时，使用 `<style scoped>`。
    *   **深度选择器**: 在 `<style scoped>` 中修改子组件或第三方库样式时，**必须**使用 `:deep()` 深度选择器，以确保样式正确应用且不影响其他组件。例如：`.markdown-body :deep(.katex) { /* KaTeX 样式覆盖 */ }`
    *   **避免全局污染**: 禁止在模板组件内定义未加 `scoped` 的全局样式。
    *   **样式可维护性**: 避免过于复杂或嵌套过深的 CSS 规则。鼓励使用 CSS 变量提高可配置性。
    *   **响应式设计**: 鼓励考虑不同屏幕尺寸的显示效果，使用 Tailwind 的响应式修饰符。
    *   **内容溢出**: 应妥善处理内容可能溢出的情况（特别是 `card-content` 或 `markdown-body`