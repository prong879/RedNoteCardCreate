import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { topicsMeta } from '../content/topicsMeta'; // 调整路径
import matter from 'gray-matter'; // 引入 gray-matter
import { handleAsyncTask } from '../utils/asyncHandler'; // 导入新的处理器

// Helper function to parse Markdown content into card structure
// (This is a simplified parser based on the README description)
function parseMarkdownContent(content) {
    const parts = content.split(/\r?\n---\r?\n/);
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

        // 使用 handleAsyncTask 包装 fetch 调用
        const result = await handleAsyncTask(async () => {
            const response = await fetch('/api/list-content-files');
            if (!response.ok) {
                let errorMsg = `HTTP error! status: ${response.status}`;
                try { const errorResult = await response.json(); errorMsg = errorResult.message || errorMsg; } catch { }
                throw new Error(errorMsg);
            }
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.message || 'Failed to list files (server error)');
            }
            return data; // 返回成功获取的数据
        }, {
            errorMessagePrefix: "加载文件列表失败"
        });

        if (result.success && result.data) {
            // 更新状态
            detectedMarkdownFiles.value = new Set(result.data.mdFiles || []);
            const jsInfoMap = {};
            if (Array.isArray(result.data.jsFileDetails)) {
                result.data.jsFileDetails.forEach(detail => {
                    if (detail.topicId && typeof detail.cardCount === 'number') {
                        jsInfoMap[detail.topicId] = { cardCount: detail.cardCount };
                    }
                });
            }
            detectedJsFilesInfo.value = jsInfoMap;
            const modules = import.meta.glob('../content/*_content.js');
            detectedContentJsModules.value = modules;
            // 可以在这里添加成功日志
        } else if (!result.success) {
            // 更新错误状态
            fileLoadingError.value = result.error?.message || '未知错误';
        }

        isLoadingFiles.value = false;
        // 不再需要在 Store 中抛出错误，调用者如果需要可以检查 isLoadingFiles 和 fileLoadingError
    };

    // --- 新增：Action - 转换 Markdown 到 JS 文件 --- 
    const convertMarkdownToJs = async (topicId, overwrite = false) => {
        console.log(`[Store] Attempting to convert MD to JS for topic: ${topicId}, Overwrite: ${overwrite}`);

        // 使用 handleAsyncTask
        const result = await handleAsyncTask(async () => {
            const response = await fetch('/api/convert-md-to-js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topicId })
            });
            const apiResult = await response.json();
            if (!response.ok || !apiResult.success) {
                throw new Error(apiResult.message || `HTTP error ${response.status}`);
            }
            return apiResult; // 返回 API 的成功结果
        }, {
            errorMessagePrefix: `转换 ${topicId}.md 失败`
        });

        if (result.success && result.data) {
            const successMessage = result.data.message || `成功转换 ${topicId}.md`;
            console.info(`[Store] Conversion successful: ${successMessage}`);
            localStorage.removeItem(`cardgen_topic_content_${topicId}`);
            await fetchFileLists(); // 重新获取列表

            // --- 新增：强制重新加载当前主题内容 ---
            // 检查是否需要重新加载（例如，如果用户在转换期间切换了主题）
            if (currentTopicId.value === topicId) {
                console.log(`[Store] Reloading content for current topic ${topicId} after conversion.`);
                await loadTopic(topicId, true); // 使用 forceRefresh=true 强制从模块加载
            }
            // --- 结束新增 ---

            // 直接返回成功结果给调用者
            return { success: true, message: successMessage };
        } else {
            // handleAsyncTask 已记录错误，直接返回失败结果
            return { success: false, message: result.error?.message || `转换 ${topicId}.md 失败` };
        }
    };

    // --- 新增：Action - 保存 Markdown 模板到本地 (开发模式) ---
    const saveMarkdownTemplate = async ({ filename, content, topicId, overwrite = false }) => {
        console.log(`[Store] Attempting to save Markdown template: ${filename} for topic: ${topicId}, overwrite: ${overwrite}`);

        // 使用 handleAsyncTask
        const result = await handleAsyncTask(async () => {
            const response = await fetch('/api/save-markdown-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename, content, overwrite }),
            });
            const apiResult = await response.json();
            // 特殊处理 409 Conflict
            if (!response.ok && response.status !== 409) {
                throw new Error(apiResult.message || `HTTP error ${response.status}`);
            }
            // 将 response status 包含在返回数据中，以便后续判断
            return { ...apiResult, status: response.status };
        }, {
            errorMessagePrefix: `保存模板 ${filename} 失败`
        });

        if (result.success && result.data) {
            const apiData = result.data;
            if (apiData.success) {
                const successMessage = apiData.message || `模板 ${filename} 已成功保存。`;
                console.info(`[Store] Markdown template saved successfully: ${filename}`);
                await fetchFileLists();
                return { success: true, message: successMessage };
            } else if (apiData.status === 409 && apiData.code === 'FILE_EXISTS' && !overwrite) {
                console.warn(`[Store] File already exists: ${filename} (overwrite not allowed)`);
                return { success: false, message: apiData.message || `文件 ${filename} 已存在`, code: 'FILE_EXISTS' };
            } else {
                // 处理 API 返回 success: false 的情况
                return { success: false, message: apiData.message || `保存模板 ${filename} 时服务器返回失败` };
            }
        } else {
            // handleAsyncTask 已记录错误
            return { success: false, message: result.error?.message || `保存模板 ${filename} 失败` };
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

        // --- 新增：如果强制刷新，先清空内容，强制 Vue 检测到变化 ---
        if (forceRefresh) {
            console.log(`[Store] Force refresh requested for ${topicId}, clearing current content first.`);
            cardContent.value = {}; // 或者 cardContent.value = null;
            // 添加一个微小的延迟，确保 DOM 更新
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        // --- 结束新增 ---

        try {
            // --- 修改：使用 store 中的 detectedContentJsModules --- 
            const modules = detectedContentJsModules.value;
            const path = `../content/${topicId}_content.js`;

            if (modules[path]) {
                const contentModule = await modules[path]();
                const exportName = `${topicId}_contentData`;

                if (contentModule && contentModule[exportName]) {
                    const originalContent = contentModule[exportName];

                    // 检查 localStorage 是否有"更新"的数据 (仅当 forceRefresh 为 false 时)
                    let contentToLoad = originalContent;
                    const savedContentJson = localStorage.getItem(`cardgen_topic_content_${topicId}`);
                    if (savedContentJson && !forceRefresh) {
                        try {
                            const parsedSavedContent = JSON.parse(savedContentJson);
                            // 可选：添加逻辑判断 localStorage 数据是否比文件新？
                            // 暂时简单地优先使用 localStorage (如果存在且未强制刷新)
                            // 如果希望总是文件优先，则移除下面这行和判断
                            contentToLoad = parsedSavedContent;
                            console.log(`[Store] Found potentially newer content in localStorage for ${topicId}. Using it.`);
                        } catch (e) {
                            console.warn(`[Store] Error parsing localStorage for ${topicId}, using file content.`, e);
                            // 清除无效的 localStorage
                            localStorage.removeItem(`cardgen_topic_content_${topicId}`);
                        }
                    }

                    cardContent.value = {
                        ...contentToLoad, // 使用 contentToLoad
                        topicDescription: description // 添加描述字段
                    };
                    console.log(`[Store] Successfully loaded content for ${topicId}`);

                    // 如果是从文件加载的，更新 localStorage
                    if (contentToLoad === originalContent) {
                        localStorage.setItem(`cardgen_topic_content_${topicId}`, JSON.stringify(originalContent));
                    }
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
            // toast.error(`加载主题内容失败: ${error.message}`); // 不在 store 中调用 toast
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

    // --- 新增：内部辅助函数，用于更新状态并保存到 localStorage ---
    const _updateStateAndSave = (updateFn, actionName = 'Unknown Action') => {
        if (!cardContent.value) {
            console.warn(`[Store Action - ${actionName}] Cannot perform update: cardContent is not loaded.`);
            return;
        }
        try {
            // 执行实际的状态更新逻辑
            updateFn();
            console.log(`[Store Action - ${actionName}] State updated successfully.`);
            // 调用保存逻辑
            saveCurrentContentToLocalStorage();
        } catch (error) {
            console.error(`[Store Action - ${actionName}] Error updating state:`, error);
            toast.error(`执行 ${actionName} 时出错: ${error.message}`); // 可以在这里添加 toast
        }
    };

    // 创建一个空卡片对象模板
    const createEmptyCard = () => ({
        title: "",
        body: "",
        showHeader: true,
        showFooter: true
    });

    // 在指定索引处添加内容卡片 (使用辅助函数)
    const addContentCard = (index) => {
        _updateStateAndSave(() => {
            if (!cardContent.value.contentCards) {
                // 如果在这里检查，可以抛出错误让 _updateStateAndSave 捕获
                throw new Error('Cannot add card: contentCards array does not exist.');
            }
            const newCard = createEmptyCard();
            const safeIndex = Math.max(0, Math.min(index, cardContent.value.contentCards.length));
            cardContent.value.contentCards.splice(safeIndex, 0, newCard);
            // 日志移到辅助函数内部
        }, 'addContentCard');
    };

    // 移除指定索引的内容卡片 (使用辅助函数)
    const removeContentCard = (index) => {
        if (cardContent.value?.contentCards?.length <= 1) {
            toast.warning('至少需要保留一张内容卡片。');
            return;
        }
        _updateStateAndSave(() => {
            if (!cardContent.value.contentCards) {
                throw new Error('Cannot remove card: contentCards array does not exist.');
            }
            if (index < 0 || index >= cardContent.value.contentCards.length) {
                throw new Error(`Cannot remove card: invalid index ${index}.`);
            }
            cardContent.value.contentCards.splice(index, 1);
        }, 'removeContentCard');
    };

    // 切换卡片（封面或内容）的可见性字段 (showHeader/showFooter) (使用辅助函数)
    const toggleCardVisibility = ({ cardType, field, index = null }) => {
        _updateStateAndSave(() => {
            let target;
            if (cardType === 'coverCard' && cardContent.value.coverCard) {
                target = cardContent.value.coverCard;
            } else if (cardType === 'contentCard' && index !== null && cardContent.value.contentCards && index >= 0 && index < cardContent.value.contentCards.length) {
                target = cardContent.value.contentCards[index];
            } else {
                throw new Error(`Cannot find target for toggleVisibility: { cardType: ${cardType}, field: ${field}, index: ${index} }`);
            }

            if (target && (field === 'showHeader' || field === 'showFooter') && typeof target[field] === 'boolean') {
                target[field] = !target[field];
                // 日志移到辅助函数内部: console.log(`Toggled ${field} for ${cardType} ${index !== null ? 'index ' + index : ''} to ${target[field]}`);
            } else {
                throw new Error(`Invalid field or target type for toggleVisibility: { target: ${target}, field: ${field} }`);
            }
        }, `toggleCardVisibility (${field})`);
    };

    // 新增：辅助函数，用于将当前 cardContent 保存到 localStorage (保持不变)
    const saveCurrentContentToLocalStorage = () => {
        if (!currentTopicId.value) return;
        try {
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

    // 更新卡片部分内容 (例如 Header/Footer 文本) (使用辅助函数)
    const updateCardContent = (newContent) => {
        _updateStateAndSave(() => {
            cardContent.value = { ...cardContent.value, ...newContent };
        }, 'updateCardContent');
    };

    // 更新卡片文本内容 (封面标题/副标题, 内容卡片标题/正文) (使用辅助函数)
    const updateCardText = ({ index, field, value }) => {
        _updateStateAndSave(() => {
            if (index === -1 && cardContent.value.coverCard) { // 封面
                if (field === 'title' || field === 'subtitle') {
                    cardContent.value.coverCard[field] = value;
                } else {
                    throw new Error(`Invalid field '${field}' for cover card.`);
                }
            } else if (index >= 0 && cardContent.value.contentCards && index < cardContent.value.contentCards.length) { // 内容卡片
                if (field === 'title' || field === 'body') {
                    cardContent.value.contentCards[index][field] = value;
                } else {
                    throw new Error(`Invalid field '${field}' for content card index ${index}.`);
                }
            } else {
                throw new Error(`Invalid index ${index} for updateCardText.`);
            }
        }, `updateCardText (Card ${index}, Field ${field})`);
    };

    // 更新主文案 (使用辅助函数)
    const updateMainText = (newText) => {
        _updateStateAndSave(() => {
            // 之前的检查已包含在 _updateStateAndSave 中
            cardContent.value.mainText = newText;
        }, 'updateMainText');
    };

    // 更新主题描述 (这个不保存到 localStorage，保持原样)
    const updateTopicDescription = (newDescription) => {
        if (cardContent.value) {
            cardContent.value.topicDescription = newDescription;
            console.log('[Store] Topic description updated');
        }
    };

    // 拖拽内容卡片排序 (使用辅助函数)
    const updateContentCardsOrder = (newOrder) => {
        _updateStateAndSave(() => {
            // 之前的检查已包含在 _updateStateAndSave 中
            cardContent.value.contentCards = newOrder;
        }, 'updateContentCardsOrder');
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
            // 直接返回错误信息给调用者（组件）处理 toast
            return { success: false, message: "错误：无法获取当前主题 ID" };
        }
        if (!cardContent.value || Object.keys(cardContent.value).length === 0) {
            return { success: false, message: "错误：没有内容可以保存" };
        }

        const topicId = currentTopicId.value;
        const filename = `${topicId}_content.js`;
        const contentToSave = { ...cardContent.value };
        delete contentToSave.topicDescription;
        const fileContentString = `// src/content/${filename}\n// Updated at: ${new Date().toISOString()}\n\nexport const ${topicId}_contentData = ${JSON.stringify(contentToSave, null, 2)};\n`;

        // 使用 handleAsyncTask
        const result = await handleAsyncTask(async () => {
            const response = await fetch('/api/save-local-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename, content: fileContentString }),
            });
            const apiResult = await response.json();
            if (!response.ok || !apiResult.success) {
                // 特殊处理文件名格式错误
                if (apiResult.message && apiResult.message.includes('无效的文件名或类型')) {
                    throw new Error(`主题 ID (当前为 \"${currentTopicId.value}\") 必须以 \"topic\" 开头`);
                }
                throw new Error(apiResult.message || '服务器未返回明确错误信息。');
            }
            return apiResult; // 返回成功结果
        }, {
            errorMessagePrefix: "保存到本地文件失败"
        });

        if (result.success && result.data) {
            console.log(`[Store] Successfully saved content locally for ${topicId} via API.`);
            return { success: true, message: `主题 "${currentTopicTitle.value}" 的内容已成功更新到本地文件 ${filename}！` };
        } else {
            // 错误已被 handleAsyncTask 记录
            // 将具体的错误消息传递回去
            return { success: false, message: result.error?.message || "保存到本地文件失败" };
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