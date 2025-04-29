import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { topicsMeta } from '../content/topicsMeta'; // 调整路径
import matter from 'gray-matter'; // 引入 gray-matter

// Helper function to parse Markdown content into card structure
// (This is a simplified parser based on the README description)
function parseMarkdownContent(content) {
    const parts = content.split(/\n---\n/);
    const result = {
        coverCard: { title: '', subtitle: '', showHeader: true, showFooter: true },
        contentCards: [],
        mainText: ''
    };

    let mainTextSectionReached = false;

    parts.forEach((part, index) => {
        part = part.trim();
        if (!part) return;

        // Check for Main Text section
        if (part.startsWith('## 主文案') || part.startsWith('## Main Text')) {
            mainTextSectionReached = true;
            result.mainText = part.substring(part.indexOf('\n') + 1).trim();
            return; // Stop processing parts after main text
        }

        // Skip processing if main text was already found in a previous part
        if (mainTextSectionReached) return;

        // --- Card parsing ---
        let title = '';
        let body = '';
        let showHeader = null; // Use null to indicate not explicitly set
        let showFooter = null; // Use null to indicate not explicitly set

        // Extract title (first heading)
        const titleMatch = part.match(/^#+\s+(.*)/);
        if (titleMatch) {
            title = titleMatch[1].trim();
            body = part.substring(titleMatch[0].length).trim();
        } else {
            // If no heading, treat the whole part as body (or subtitle for cover)
            body = part;
        }

        // Extract card-specific visibility comments
        const headerCommentMatch = body.match(/<!--\s*cardShowHeader:\s*(true|false)\s*-->/);
        if (headerCommentMatch) {
            showHeader = headerCommentMatch[1] === 'true';
            body = body.replace(headerCommentMatch[0], '').trim(); // Remove comment from body
        }
        const footerCommentMatch = body.match(/<!--\s*cardShowFooter:\s*(true|false)\s*-->/);
        if (footerCommentMatch) {
            showFooter = footerCommentMatch[1] === 'true';
            body = body.replace(footerCommentMatch[0], '').trim(); // Remove comment from body
        }

        if (index === 0) { // First part is cover card
            result.coverCard.title = title; // Cover title comes from first # heading
            result.coverCard.subtitle = body; // Rest is subtitle
            // Cover visibility is handled by frontMatter, but we record parsed values if present
            if (showHeader !== null) result.coverCard.showHeader = showHeader;
            if (showFooter !== null) result.coverCard.showFooter = showFooter;
        } else { // Subsequent parts are content cards
            result.contentCards.push({
                title: title,
                body: body,
                showHeader: showHeader, // Keep null if not set, will use default later
                showFooter: showFooter  // Keep null if not set, will use default later
            });
        }
    });

    return result;
}

// 获取 JS 内容模块信息 (在 store 定义外部执行，确保只执行一次)
// const contentJsModules = import.meta.glob('../content/*_content.js'); // 不再在这里直接获取
// console.log('[Store Init] Found content JS modules:', Object.keys(contentJsModules));

// 使用 defineStore 定义 store
// 第一个参数是 store 的唯一 ID
// 第二个参数是选项对象或 setup 函数
export const useCardStore = defineStore('card', () => {
    // --- State ---
    // 使用 ref() 定义 state 属性
    const selectedTemplate = ref('template1'); // 默认模板
    const cardContent = ref({}); // 当前加载的卡片内容
    const currentTopicId = ref(null); // 当前主题ID
    const currentTopicTitle = ref(''); // 当前主题标题
    const showTopicSelector = ref(true); // 是否显示主题选择器
    // 预览区聚焦卡片索引: null (无焦点), -1 (封面), 0+ (内容卡片索引)
    const focusedPreviewIndex = ref(null);
    // 编辑区聚焦卡片索引: null (无焦点), -1 (封面), 0+ (内容卡片索引)
    const focusedEditorIndex = ref(null);

    // 新增：存储所有话题元数据
    const topics = ref([...topicsMeta]); // 从原始文件初始化

    // --- 新增：用于存储检测到的文件列表状态 --- 
    const detectedMarkdownFiles = ref(new Set()); // Set<string> topicId
    const detectedContentJsModules = ref({}); // { [filePath: string]: Function } 存储动态导入函数
    const detectedJsFilesInfo = ref({}); // { [topicId: string]: { cardCount: number } }
    const isLoadingFiles = ref(false); // 新增：文件列表加载状态
    const fileLoadingError = ref(null); // 新增：文件列表加载错误信息

    // --- Getters ---
    // 使用 computed() 定义 getter
    const currentTopic = computed(() => {
        if (!currentTopicId.value) return null;
        // 从 store 的 topics state 查找
        return topics.value.find(t => t.id === currentTopicId.value);
    });

    const currentTopicDescription = computed(() => {
        return currentTopic.value?.description || '没有找到该选题的描述信息。';
    });

    // --- Actions ---
    // 使用函数定义 action
    const toast = useToast(); // 获取 toast 实例

    // --- 修改：Action - 获取文件列表 --- 
    const fetchFileLists = async () => {
        if (isLoadingFiles.value) return;
        isLoadingFiles.value = true;
        fileLoadingError.value = null;
        console.log('[Store] Fetching file lists from API...');
        try {
            const response = await fetch('/api/list-content-files');
            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try {
                    const errorResult = await response.json();
                    errorMsg = errorResult.message || errorMsg;
                } catch { /* Ignore */ }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to list files (server error)');
            }

            // 更新 Markdown 文件列表 Set (假设 API 返回 mdFiles: string[] of topicIds)
            detectedMarkdownFiles.value = new Set(data.mdFiles || []);
            console.log('[Store] Updated detectedMarkdownFiles:', detectedMarkdownFiles.value);

            // --- 新增：处理并存储 JS 文件详情 --- 
            const jsInfoMap = {};
            if (Array.isArray(data.jsFileDetails)) {
                data.jsFileDetails.forEach(detail => {
                    if (detail.topicId && typeof detail.cardCount === 'number') {
                        jsInfoMap[detail.topicId] = { cardCount: detail.cardCount };
                    }
                });
            }
            detectedJsFilesInfo.value = jsInfoMap;
            console.log('[Store] Updated detectedJsFilesInfo:', detectedJsFilesInfo.value);

            // --- 保持更新 JS 模块字典，用于动态加载 --- 
            const modules = import.meta.glob('../content/*_content.js');
            detectedContentJsModules.value = modules;
            console.log('[Store] Updated detectedContentJsModules:', Object.keys(detectedContentJsModules.value));

        } catch (error) {
            console.error("[Store] Error fetching file lists:", error);
            fileLoadingError.value = error.message;
            toast.error(`加载文件列表失败: ${error.message}`);
        } finally {
            isLoadingFiles.value = false;
        }
    };

    // --- 新增：Action - 转换 Markdown 到 JS 文件 --- 
    const convertMarkdownToJs = async (topicId, overwrite = false) => {
        console.log(`[Store] Attempting to convert MD to JS for topic: ${topicId}, Overwrite: ${overwrite}`);
        try {
            const response = await fetch('/api/convert-md-to-js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // 注意：当前 API 可能只接收 topicId，如果需要处理 overwrite，API 端点或请求体可能需要调整
                body: JSON.stringify({ topicId })
            });

            const result = await response.json();
            console.log(`[Store] API response for ${topicId} conversion:`, result);

            if (!response.ok || !result.success) {
                throw new Error(result.message || `HTTP error ${response.status}`);
            }

            // 转换成功!
            const successMessage = result.message || `成功转换 ${topicId}.md`;
            console.info(`[Store] Conversion successful: ${successMessage}`);

            // 清理可能过时的 localStorage 内容
            localStorage.removeItem(`cardgen_topic_content_${topicId}`);
            console.log(`[Store] Removed localStorage cache for ${topicId}`);

            // 关键：重新获取文件列表以更新 store 状态
            await fetchFileLists(); // 注意：这里直接调用，因为在同一个 setup 函数作用域内

            return { success: true, message: successMessage };

        } catch (error) {
            console.error(`[Store] Error converting ${topicId}.md:`, error);
            // 让调用者（组件）处理 Toast
            return { success: false, message: error.message || `转换 ${topicId}.md 失败` };
        }
        // 注意：这里没有 finally 块来设置 loading 状态，因为转换是单个操作，
        // 组件本身会管理按钮的 disabled 状态。
        // 如果需要全局的转换 loading 状态，可以在 store 中添加。
    };

    // --- 新增：Action - 保存 Markdown 模板到本地 (开发模式) ---
    const saveMarkdownTemplate = async ({ filename, content, topicId }) => {
        console.log(`[Store] Attempting to save Markdown template: ${filename} for topic: ${topicId}`);
        try {
            const response = await fetch('/api/save-markdown-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, content }),
            });

            const result = await response.json();
            console.log(`[Store] API response for saving ${filename}:`, result);

            if (response.ok && result.success) {
                // 保存成功!
                const successMessage = result.message || `模板 ${filename} 已成功保存。`;
                console.info(`[Store] Markdown template saved successfully: ${filename}`);

                // 关键：重新获取文件列表以更新 store 状态
                // 可以选择更精细的更新：addDetectedMarkdownFile(topicId)
                // 但 fetchFileLists 更简单可靠
                await fetchFileLists();

                return { success: true, message: successMessage };
            } else if (response.status === 409 && result.code === 'FILE_EXISTS') {
                // 文件已存在是特定业务错误，不算完全失败，但需要特殊处理
                console.warn(`[Store] File already exists: ${filename}`);
                return { success: false, message: result.message || `文件 ${filename} 已存在`, code: 'FILE_EXISTS' };
            } else {
                // 其他 API 业务错误或非 2xx 状态码
                throw new Error(result.message || `HTTP error ${response.status}`);
            }

        } catch (error) {
            console.error(`[Store] Error saving Markdown template ${filename}:`, error);
            // 返回通用错误信息给组件处理
            return { success: false, message: error.message || `保存模板 ${filename} 时出错` };
        }
    };

    // --- 新增：Action - 添加一个已检测到的 MD 文件 --- 
    const addDetectedMarkdownFile = (topicId) => {
        if (!detectedMarkdownFiles.value.has(topicId)) {
            detectedMarkdownFiles.value.add(topicId);
            console.log(`[Store] Added ${topicId} to detectedMarkdownFiles.`);
        }
    };

    // 新增：添加或更新话题元数据
    const addOrUpdateTopicMeta = (topicMeta) => {
        const index = topics.value.findIndex(t => t.id === topicMeta.id);
        if (index !== -1) {
            // 更新现有
            topics.value[index] = { ...topics.value[index], ...topicMeta };
            console.log(`[Store] Updated topic meta for ${topicMeta.id}`);
        } else {
            // 添加新的
            topics.value.push(topicMeta);
            console.log(`[Store] Added new topic meta for ${topicMeta.id}`);
        }
    };

    // 新增：从 Markdown 导入/更新选题
    const importTopicFromMarkdown = (file) => {
        return new Promise(async (resolve, reject) => {
            if (!file || !file.name.endsWith('.md')) {
                return reject(new Error('无效的文件类型，需要 .md 文件。'));
            }

            try {
                const mdContent = await file.text();
                const { data: frontMatter, content } = matter(mdContent);

                if (!frontMatter.topicId || !frontMatter.title) {
                    return reject(new Error(`文件 "${file.name}" 缺少必需的 Front Matter 字段 (topicId, title)。`));
                }

                const topicId = frontMatter.topicId;

                // 1. 更新元数据列表
                addOrUpdateTopicMeta({
                    id: topicId,
                    title: frontMatter.title,
                    description: frontMatter.description || ''
                });

                // 2. 解析 Markdown 内容
                const parsedContent = parseMarkdownContent(content);

                // 3. 组合完整内容对象，应用 Front Matter 的默认值
                const fullContentData = {
                    headerText: frontMatter.headerText || '',
                    footerText: frontMatter.footerText || '',
                    coverCard: {
                        title: parsedContent.coverCard.title || frontMatter.title, // 优先用 MD 解析的，否则用 FM 的 title
                        subtitle: parsedContent.coverCard.subtitle,
                        // 优先用 MD 注释的，否则用 FM 的，最后用默认 true
                        showHeader: parsedContent.coverCard.showHeader !== null ? parsedContent.coverCard.showHeader : (frontMatter.coverShowHeader !== undefined ? frontMatter.coverShowHeader : true),
                        showFooter: parsedContent.coverCard.showFooter !== null ? parsedContent.coverCard.showFooter : (frontMatter.coverShowFooter !== undefined ? frontMatter.coverShowFooter : true)
                    },
                    contentCards: parsedContent.contentCards.map(card => ({
                        ...card,
                        // 优先用 MD 注释的，否则用 FM 的默认值，最后用默认 true
                        showHeader: card.showHeader !== null ? card.showHeader : (frontMatter.contentDefaultShowHeader !== undefined ? frontMatter.contentDefaultShowHeader : true),
                        showFooter: card.showFooter !== null ? card.showFooter : (frontMatter.contentDefaultShowFooter !== undefined ? frontMatter.contentDefaultShowFooter : true)
                    })),
                    mainText: parsedContent.mainText
                };

                // 4. 保存到 localStorage (模拟持久化)
                // 注意：这里直接覆盖，没有版本管理
                localStorage.setItem(`cardgen_topic_content_${topicId}`, JSON.stringify(fullContentData));
                console.log(`[Store] Parsed content for ${topicId} saved to localStorage.`);

                // 可选：如果导入的就是当前选中的主题，则重新加载内容
                if (currentTopicId.value === topicId) {
                    await loadTopic(topicId, true); // 添加一个标志避免无限循环或重复逻辑
                }

                resolve({ topicId: topicId, title: frontMatter.title }); // 成功时返回信息

            } catch (error) {
                console.error(`[Store] Error processing Markdown file "${file.name}":`, error);
                reject(error); // 失败时传递错误
            }
        });
    };

    // 加载主题内容
    // 修改：添加 optional forceRefresh 参数
    const loadTopic = async (topicId, forceRefresh = false) => {
        console.log(`[Store] Attempting to load topic: ${topicId}${forceRefresh ? ' (force refresh)' : ''}`);
        currentTopicId.value = topicId;

        // 更新标题和获取描述 (从 getter 获取)
        currentTopicTitle.value = currentTopic.value?.title || `未命名主题 (${topicId})`;
        const description = currentTopicDescription.value;

        try {
            // 优先从 localStorage 加载 (模拟更新后的状态)
            const savedContentJson = localStorage.getItem(`cardgen_topic_content_${topicId}`);
            if (savedContentJson && !forceRefresh) { // 如果强制刷新，则跳过 localStorage
                try {
                    cardContent.value = {
                        ...JSON.parse(savedContentJson),
                        topicDescription: description // 确保描述是最新的
                    };
                    console.log(`[Store] Successfully loaded content from localStorage for ${topicId}`);
                    showTopicSelector.value = false; // 加载后隐藏选择器
                    return; // 从 localStorage 加载成功，结束
                } catch (e) {
                    console.error(`[Store] Error parsing localStorage content for ${topicId}, falling back. Error:`, e);
                    // 清除无效的 localStorage 数据
                    localStorage.removeItem(`cardgen_topic_content_${topicId}`);
                }
            }

            // --- 修改：使用 store 中的 detectedContentJsModules --- 
            // const modules = import.meta.glob('../content/*_content.js'); // 不再在此处调用
            const modules = detectedContentJsModules.value; // 使用 store 中的状态
            const path = `../content/${topicId}_content.js`;

            if (modules[path]) {
                const contentModule = await modules[path](); // 执行函数加载模块
                const exportName = `${topicId}_contentData`;

                if (contentModule && contentModule[exportName]) {
                    const originalContent = contentModule[exportName];
                    cardContent.value = {
                        ...originalContent,
                        topicDescription: description // 添加描述字段
                    };
                    console.log(`[Store] Successfully loaded content from file for ${topicId}`);
                    // 将从文件加载的内容也存入 localStorage，以便后续编辑
                    localStorage.setItem(`cardgen_topic_content_${topicId}`, JSON.stringify(originalContent));
                } else {
                    console.warn(`[Store] Data export not found in ${topicId}_content.js, loading placeholder.`);
                    loadPlaceholderContent(topicId, description);
                }
            } else {
                console.warn(`[Store] JS module not found in detected list for ${topicId}, loading placeholder.`);
                loadPlaceholderContent(topicId, description);
            }
        } catch (error) {
            console.error(`[Store] Error loading topic ${topicId}:`, error);
            toast.error(`加载主题内容失败: ${error.message}`);
            loadPlaceholderContent(topicId, description); // 加载失败时也显示占位符
        }
        showTopicSelector.value = false; // 加载后隐藏选择器
    };

    // 加载占位内容
    const loadPlaceholderContent = (topicId, description = '占位符描述') => {
        const meta = topics.value.find(t => t.id === topicId); // 从 store 的 topics state 查找
        const placeholderText = "请在此处输入文案...";
        cardContent.value = {
            topicDescription: description,
            headerText: '',
            footerText: '',
            coverCard: {
                title: meta?.title || `选题 ${topicId}`,
                subtitle: placeholderText,
                showHeader: true,
                showFooter: true
            },
            contentCards: [
                {
                    title: placeholderText,
                    body: placeholderText,
                    showHeader: true,
                    showFooter: true
                }
            ],
            mainText: placeholderText
        };
        // 清除可能存在的旧 localStorage 数据
        localStorage.removeItem(`cardgen_topic_content_${topicId}`);
        console.log('[Store] Loaded placeholder content for', topicId);
    };

    // --- Card Manipulation Actions ---

    // 创建一个空卡片对象模板
    const createEmptyCard = () => ({
        title: "",
        body: "",
        showHeader: true,
        showFooter: true
    });

    // 在指定索引处添加内容卡片
    const addContentCard = (index) => {
        if (!cardContent.value || !cardContent.value.contentCards) {
            console.warn('[Store Action] Cannot add card: contentCards array does not exist.');
            return;
        }
        try {
            const newCard = createEmptyCard();
            // 确保索引在有效范围内
            const safeIndex = Math.max(0, Math.min(index, cardContent.value.contentCards.length));
            cardContent.value.contentCards.splice(safeIndex, 0, newCard);
            console.log(`[Store Action] Content card added at index: ${safeIndex}`);
            // 保存到 localStorage
            saveCurrentContentToLocalStorage();
        } catch (error) {
            console.error('[Store Action] Error adding content card:', error);
            toast.error('添加卡片时出错');
        }
    };

    // 移除指定索引的内容卡片
    const removeContentCard = (index) => {
        if (!cardContent.value || !cardContent.value.contentCards) {
            console.warn('[Store Action] Cannot remove card: contentCards array does not exist.');
            return;
        }
        if (index < 0 || index >= cardContent.value.contentCards.length) {
            console.warn(`[Store Action] Cannot remove card: invalid index ${index}.`);
            return;
        }
        if (cardContent.value.contentCards.length <= 1) {
            toast.warning('至少需要保留一张内容卡片。');
            return;
        }
        try {
            cardContent.value.contentCards.splice(index, 1);
            console.log(`[Store Action] Content card removed at index: ${index}`);
            // 保存到 localStorage
            saveCurrentContentToLocalStorage();
        } catch (error) {
            console.error('[Store Action] Error removing content card:', error);
            toast.error('移除卡片时出错');
        }
    };

    // 切换卡片（封面或内容）的可见性字段 (showHeader/showFooter)
    const toggleCardVisibility = ({ cardType, field, index = null }) => {
        if (!cardContent.value) {
            console.warn('[Store Action] Cannot toggle visibility: cardContent is not loaded.');
            return;
        }
        let target;
        try {
            if (cardType === 'coverCard' && cardContent.value.coverCard) {
                target = cardContent.value.coverCard;
            } else if (cardType === 'contentCard' && index !== null && cardContent.value.contentCards && index >= 0 && index < cardContent.value.contentCards.length) {
                target = cardContent.value.contentCards[index];
            } else {
                console.warn(`[Store Action] Cannot find target for toggleVisibility:`, { cardType, field, index });
                return;
            }

            if (target && (field === 'showHeader' || field === 'showFooter') && typeof target[field] === 'boolean') {
                target[field] = !target[field];
                console.log(`[Store Action] Toggled ${field} for ${cardType} ${index !== null ? 'index ' + index : ''} to ${target[field]}`);
                // 保存到 localStorage
                saveCurrentContentToLocalStorage();
            } else {
                console.warn(`[Store Action] Invalid field or target type for toggleVisibility:`, { target, field });
            }
        } catch (error) {
            console.error('[Store Action] Error toggling visibility:', error);
            toast.error('切换显隐状态时出错');
        }
    };

    // 新增：辅助函数，用于将当前 cardContent 保存到 localStorage
    const saveCurrentContentToLocalStorage = () => {
        if (!currentTopicId.value) return;
        try {
            // 移除 topicDescription，因为它不属于原始内容结构
            const contentToSave = { ...cardContent.value };
            delete contentToSave.topicDescription;
            localStorage.setItem(`cardgen_topic_content_${currentTopicId.value}`, JSON.stringify(contentToSave));
            console.log(`[Store] Saved current content for ${currentTopicId.value} to localStorage.`);
        } catch (e) {
            console.error(`[Store] Error saving content to localStorage for ${currentTopicId.value}:`, e);
            toast.error('内容保存到本地存储失败。');
        }
    };

    // --- Other Actions ---

    // 更新卡片部分内容 (例如 Header/Footer 文本)
    const updateCardContent = (newContent) => {
        cardContent.value = { ...cardContent.value, ...newContent };
        console.log('[Store] Card content updated');
        saveCurrentContentToLocalStorage(); // 保存更改
    };

    // 更新卡片文本内容 (封面标题/副标题, 内容卡片标题/正文)
    const updateCardText = ({ index, field, value }) => {
        if (!cardContent.value) return;
        try {
            if (index === -1 && cardContent.value.coverCard) { // 封面
                if (field === 'title' || field === 'subtitle') {
                    cardContent.value.coverCard[field] = value;
                }
            } else if (index >= 0 && cardContent.value.contentCards && index < cardContent.value.contentCards.length) { // 内容卡片
                if (field === 'title' || field === 'body') {
                    cardContent.value.contentCards[index][field] = value;
                }
            } else {
                console.warn(`[Store Action] Invalid index or field for updateCardText:`, { index, field });
                return;
            }
            console.log(`[Store Action] Updated text for card ${index}, field ${field}`);
            saveCurrentContentToLocalStorage(); // 保存更改
        } catch (error) {
            console.error('[Store Action] Error updating card text:', error);
            toast.error('更新卡片文本时出错。');
        }
    };

    // 更新主文案
    const updateMainText = (newText) => {
        if (cardContent.value) {
            cardContent.value.mainText = newText;
            console.log('[Store] Main text updated');
            saveCurrentContentToLocalStorage(); // 保存更改
        }
    };

    // 更新主题描述 (由 CardConfig 触发)
    const updateTopicDescription = (newDescription) => {
        if (cardContent.value) {
            cardContent.value.topicDescription = newDescription;
            console.log('[Store] Topic description updated');
            // 描述不属于核心内容数据，不触发 localStorage 保存
        }
    };

    // 拖拽内容卡片排序
    const updateContentCardsOrder = (newOrder) => {
        if (cardContent.value) {
            cardContent.value.contentCards = newOrder;
            console.log('[Store] Content cards order updated');
            saveCurrentContentToLocalStorage(); // 保存更改
        }
    };

    // 生成并下载 JS 内容文件
    const generateContentJsFile = () => {
        if (!currentTopicId.value) {
            toast.error("请先选择一个选题！");
            return;
        }
        const topicId = currentTopicId.value;
        // 从 localStorage 获取最新内容，或使用当前 store 中的内容
        let contentToSave = { ...cardContent.value };
        const savedJson = localStorage.getItem(`cardgen_topic_content_${topicId}`);
        if (savedJson) {
            try {
                contentToSave = JSON.parse(savedJson);
            } catch (e) {
                console.error("Error parsing localStorage before generating JS file:", e);
                toast.warning("从本地存储加载最新内容失败，将使用当前编辑状态生成文件。");
                // 移除 topicDescription
                delete contentToSave.topicDescription;
            }
        } else {
            // 移除 topicDescription
            delete contentToSave.topicDescription;
        }

        const filename = `${topicId}_content.js`;

        const fileContent = `// src/content/${filename}\n// Generated at: ${new Date().toISOString()}\n\nexport const ${topicId}_contentData = ${JSON.stringify(contentToSave, null, 2)};\n`;

        const blob = new Blob([fileContent], { type: 'text/javascript;charset=utf-8;' });
        // 使用 file-saver 来保存
        saveAs(blob, filename);

        toast.success(`已生成 ${filename} 文件供下载。请手动将其移动到项目的 'src/content/' 目录下替换旧文件。`, {
            timeout: 8000
        });
    };

    // 保存内容到本地 (调用后端 API - 当前未实现，仅保存到 localStorage)
    const saveContentLocally = async () => {
        if (!currentTopicId.value) {
            toast.error("错误：无法获取当前主题 ID");
            return;
        }
        if (!cardContent.value || Object.keys(cardContent.value).length === 0) {
            toast.error("错误：没有内容可以保存");
            return;
        }

        // 1. 准备要保存的数据和文件名
        const topicId = currentTopicId.value;
        const filename = `${topicId}_content.js`;

        // 从当前 store 中的内容准备要保存的对象，移除 topicDescription
        const contentToSave = { ...cardContent.value };
        delete contentToSave.topicDescription;

        // 格式化为 JS 文件内容字符串
        const fileContentString = `// src/content/${filename}\n// Updated at: ${new Date().toISOString()}\n\nexport const ${topicId}_contentData = ${JSON.stringify(contentToSave, null, 2)};\n`;

        try {
            // 2. 发送 POST 请求到 Vite 开发服务器的自定义端点
            const response = await fetch('/api/save-local-content', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename: filename, content: fileContentString }),
            });

            const result = await response.json();

            if (response.ok && result.success) {
                toast.success(`主题 "${currentTopicTitle.value}" 的内容已成功更新到本地文件 ${filename}！`);
                console.log(`[Store] Successfully saved content locally for ${topicId} via API.`);
                // 可选：同时更新 localStorage 以防万一或用于其他目的
                // saveCurrentContentToLocalStorage();
            } else {
                // 如果服务器返回错误信息，则抛出错误
                throw new Error(result.message || '保存到本地文件失败，服务器未返回明确错误信息。');
            }
        } catch (error) {
            // 网络错误或服务器端处理错误
            console.error('[Store] Error saving content locally via API:', error);

            // 检查是否是特定的文件名格式错误
            if (error && error.message && error.message.includes('无效的文件名或类型')) {
                toast.error(`保存失败：主题 ID (当前为 "${currentTopicId.value}") 必须以 "topic" 开头 (例如 "topic1", "topic2")。请检查或修改选题 ID。`, { timeout: 8000 }); // 增加显示时间
            } else {
                // 其他类型的错误，显示通用消息
                toast.error(`保存到本地文件失败: ${error?.message || '未知错误'}`);
            }
            // 失败时，可以选择保存到 localStorage 作为回退 (保持注释状态)
            // saveCurrentContentToLocalStorage();
            // toast.warning('内容已保存到浏览器本地存储作为备份。请检查开发服务器控制台获取详细错误。');
        }
    };

    // 更新选中的模板
    const setSelectedTemplate = (templateId) => {
        selectedTemplate.value = templateId;
        console.log(`[Store] Selected template set to: ${templateId}`);
    };

    // 聚焦预览区的卡片
    const setFocusedPreview = (index) => {
        focusedPreviewIndex.value = index;
    };

    // 聚焦编辑区的卡片
    const setFocusedEditor = (index) => {
        focusedEditorIndex.value = index;
    };

    // 重置所有焦点
    const resetFocus = () => {
        focusedPreviewIndex.value = null;
        focusedEditorIndex.value = null;
    };

    // 返回主题选择界面
    const returnToTopicSelection = () => {
        currentTopicId.value = null;
        currentTopicTitle.value = '';
        cardContent.value = {};
        resetFocus();
        showTopicSelector.value = true;
        console.log('[Store] Returned to topic selection');
    };

    // --- 暴露 state, getters, actions ---
    return {
        // State
        selectedTemplate,
        cardContent,
        currentTopicId,
        currentTopicTitle,
        showTopicSelector,
        focusedPreviewIndex,
        focusedEditorIndex,
        topics,
        detectedMarkdownFiles,
        detectedContentJsModules,
        detectedJsFilesInfo,
        isLoadingFiles,
        fileLoadingError,

        // Getters
        currentTopic,
        currentTopicDescription,

        // Actions
        addOrUpdateTopicMeta,
        importTopicFromMarkdown,
        fetchFileLists,
        addDetectedMarkdownFile,
        loadTopic,
        loadPlaceholderContent,
        addContentCard,
        removeContentCard,
        toggleCardVisibility,
        saveCurrentContentToLocalStorage,
        updateCardContent,
        updateCardText,
        updateMainText,
        updateTopicDescription,
        updateContentCardsOrder,
        generateContentJsFile,
        saveContentLocally,
        setSelectedTemplate,
        setFocusedPreview,
        setFocusedEditor,
        resetFocus,
        returnToTopicSelection,
        convertMarkdownToJs,
        saveMarkdownTemplate
    };
}, {
    // 可以在这里配置持久化等插件选项
    // persist: true, // 示例：如果使用了 pinia-plugin-persistedstate
}); 