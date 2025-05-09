import { defineStore } from 'pinia';
import { ref, computed, nextTick } from 'vue';
import { useToast } from 'vue-toastification';
// import { topicsMeta as initialTopicsMeta } from '../config/topicsMeta.js'; // 修改：移除旧的 JS 导入
import initialTopicsMeta from '../config/topicsMeta.json'; // 修改：导入新的 JSON 文件
import matter from 'gray-matter'; // 引入 gray-matter
import { handleAsyncTask } from '../utils/asyncHandler'; // 导入新的处理器
import {
    DEFAULT_FONT_SIZE,
    DEFAULT_LINE_HEIGHT,
    MIN_FONT_SIZE,
    MAX_FONT_SIZE,
    MIN_LINE_HEIGHT,
    MAX_LINE_HEIGHT,
    MD_COMMENT_FONT_SIZE_KEY,
    MD_COMMENT_LINE_HEIGHT_KEY,
    MD_COMMENT_SHOW_HEADER_KEY,
    MD_COMMENT_SHOW_FOOTER_KEY
} from '../config/cardConstants';

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

    // +++ Initialize topics state from imported meta +++
    const topics = ref([...initialTopicsMeta]); // Initialize with cached data

    // --- Keep detectedMarkdownFiles for knowing which files exist --- 
    const detectedMarkdownFiles = ref(new Set()); // Still useful to know *which* files exist
    // const topicCardCounts = ref({}); // No longer needed, count is part of topics state
    // --- Remove isLoadingFiles --- 
    // const isLoadingFiles = ref(false);
    const fileLoadingError = ref(null); // 新增：文件列表加载错误信息

    // +++ 新增：用于指示卡片内容是否正在加载 +++
    const isLoadingContent = ref(false);

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
    const toast = useToast(); // 获取 toast 实例

    // +++ 新增：同步 Action 错误处理辅助函数 +++
    const handleSyncAction = (actionFn, options = {}) => {
        const { errorMessagePrefix = '操作失败' } = options;
        try {
            actionFn(); // 执行同步操作
            return true; // 表示成功
        } catch (error) {
            console.error(`[Store Sync Action Error] ${errorMessagePrefix}:`, error);
            toast.error(`${errorMessagePrefix}: ${error.message || '未知错误'}`);
            return false; // 表示失败
        }
    };

    // --- Modify fetchFileLists Action --- 
    const fetchFileLists = async (quickLoad = false) => {
        // 修改：接受 quickLoad 参数
        console.log(`[Store] Fetching file lists... Quick load: ${quickLoad}`);
        fileLoadingError.value = null;

        const apiUrl = quickLoad ? '/api/list-content-files?quick=true' : '/api/list-content-files';

        // 使用 handleAsyncTask 包装 API 调用
        const result = await handleAsyncTask(async () => {
            const response = await fetch(apiUrl); // 使用带参数的 URL
            if (!response.ok) {
                let errorMsg = `HTTP error ${response.status}`;
                try {
                    const errData = await response.json();
                    errorMsg = errData.message || errorMsg;
                } catch { /* Ignore if response body is not JSON */ }
                throw new Error(errorMsg);
            }
            return await response.json();
        }, {
            errorMessagePrefix: '加载文件列表失败'
        });

        if (result.success && result.data) {
            const { mdFiles, mdFileDetails } = result.data;
            console.log('[Store] Received file details:', mdFileDetails);

            // 更新 detectedMarkdownFiles Set
            detectedMarkdownFiles.value = new Set(mdFiles || []);

            // --- 使用 API 返回的 mdFileDetails 更新 topics --- 
            // 创建一个 map 方便查找
            const detailsMap = new Map(mdFileDetails.map(item => [item.topicId, item]));

            // 保留原有 topics 中的顺序，更新或添加数据
            const updatedTopics = initialTopicsMeta.map(metaTopic => {
                const detail = detailsMap.get(metaTopic.id);
                if (detail) {
                    // 如果 API 返回了详情，合并更新（API 的 cardCount 优先）
                    detailsMap.delete(metaTopic.id); // 从 map 中移除已处理的
                    return { ...metaTopic, ...detail };
                } else {
                    // API 没有返回详情，可能文件不存在，保留原 meta
                    return metaTopic;
                }
            });

            // 添加 API 返回但不在 initialTopicsMeta 中的新主题
            detailsMap.forEach(detail => {
                console.warn(`[Store] Found topic ${detail.topicId} from API but not in initialTopicsMeta. Adding.`);
                updatedTopics.push(detail); // 添加新发现的主题
            });

            // 更新 store 的 topics state
            topics.value = updatedTopics;
            console.log('[Store] Topics state updated with data from API.');

            // --- 移除旧的同步逻辑 --- 
            // (现在同步逻辑移到后端 /api/list-content-files 的非 quick 模式)

        } else if (!result.success) {
            fileLoadingError.value = result.error?.message || '未知错误';
            toast.error(`加载文件列表失败: ${fileLoadingError.value}`);
        }
    };

    // --- 修改：初始加载流程 --- 
    const initializeStore = async () => {
        console.log("[Store] Initializing...");
        // 1. 快速加载元数据，快速更新 UI
        await fetchFileLists(true);
        console.log("[Store] Quick load finished. UI should display initial list.");

        // 2. 后台触发完整同步检查 (不需要等待)
        fetchFileLists(false).then(() => {
            console.log("[Store] Background sync fetch completed.");
            // 后端在非 quick 模式下会返回同步后的最新列表
            // fetchFileLists(false) 内部的 result.success 分支会再次更新 topics.value
        }).catch(err => {
            console.error("[Store] Background sync fetch failed:", err);
            // 可以考虑在这里添加一个 toast 提示同步失败
        });
    };

    // --- 修改：Action - 保存 Markdown 模板到本地 (保持，但可能需要后续调整) ---
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

    // --- 修改：Action - 导入/更新选题 (如果还使用的话，需要调整逻辑) ---
    // const importTopicFromMarkdown = (file) => { ... }; [整个函数体已删除]

    // --- 修改：loadTopic Action --- 
    const loadTopic = async (topicId, forceRefresh = false) => {
        console.log(`[Store] Loading topic via API: ${topicId}${forceRefresh ? ' (force refresh)' : ''}`);
        currentTopicId.value = topicId;
        currentTopicTitle.value = topics.value.find(t => t.id === topicId)?.title || `未命名 (${topicId})`;

        // --- 使用加载状态 --- 
        isLoadingContent.value = true;
        let loadedSuccessfully = false;

        try {
            // --- 调用新的 API 端点 --- 
            const apiUrl = `/api/get-md-content?topicId=${encodeURIComponent(topicId)}`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                let errorMsg = `HTTP error ${response.status}`;
                if (response.status === 404) {
                    errorMsg = `选题 ${topicId} 的 Markdown 文件未找到。`;
                } else {
                    try { const errData = await response.json(); errorMsg = errData.message || errorMsg; } catch { }
                }
                throw new Error(errorMsg);
            }

            const result = await response.json();

            if (result.success && result.data) {
                // --- 直接使用 API 返回的数据更新 cardContent --- 
                cardContent.value = result.data;
                console.log(`[Store] Successfully loaded and parsed content for ${topicId} from API.`);
                loadedSuccessfully = true;

                // --- 清除旧的 localStorage (如果存在) ---
                // 虽然新逻辑不依赖它，但以防万一清除旧数据
                localStorage.removeItem(`cardgen_topic_content_${topicId}`);

                // --- 更新 topics 列表中的 description (如果 API 返回的比 meta 新) ---
                const currentMetaIndex = topics.value.findIndex(t => t.id === topicId);
                if (currentMetaIndex !== -1 && result.data.topicDescription && topics.value[currentMetaIndex].description !== result.data.topicDescription) {
                    topics.value[currentMetaIndex].description = result.data.topicDescription;
                    console.log(`[Store] Updated topic description for ${topicId} from loaded MD content.`);
                }

            } else {
                throw new Error(result.message || '从 API 获取内容失败');
            }

        } catch (error) {
            console.error(`[Store] Error loading topic ${topicId} via API:`, error);
            toast.error(`加载 ${topicId} 内容失败: ${error.message || '未知错误'}`);
            // 加载失败，显示占位符
            loadPlaceholderContent(topicId, topics.value.find(t => t.id === topicId)?.description || '加载错误');
        } finally {
            // --- 重置加载状态 --- 
            isLoadingContent.value = false;
            console.log(`[Store] Finished loading attempt for ${topicId}. Success: ${loadedSuccessfully}`);
        }

        showTopicSelector.value = false;
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
        localStorage.removeItem(`cardgen_topic_content_${topicId}`);
        console.log('[Store] Loaded placeholder content for', topicId);
        // --- 新增：加载占位符时也要重置加载状态 ---
        if (isLoadingContent.value) {
            isLoadingContent.value = false;
        }
    };

    // --- Card Manipulation Actions (不再使用 _updateStateAndSave 和 localStorage) ---

    // 创建一个空卡片对象模板
    const createEmptyCard = () => ({
        title: "",
        body: "",
        showHeader: true,
        showFooter: true,
        fontSize: DEFAULT_FONT_SIZE, // 使用常量
        lineHeight: DEFAULT_LINE_HEIGHT // 使用常量
    });

    // 在指定索引处添加内容卡片
    const addContentCard = (index) => {
        // 前置检查
        if (!cardContent.value || !cardContent.value.contentCards) {
            console.error('[Store Action - addContentCard] Cannot add card: cardContent or contentCards is invalid.');
            toast.error('无法添加卡片：内容未加载或结构错误。');
            return;
        }
        // 使用辅助函数处理
        handleSyncAction(() => {
            const newCard = createEmptyCard();
            const safeIndex = Math.max(0, Math.min(index, cardContent.value.contentCards.length));
            cardContent.value.contentCards.splice(safeIndex, 0, newCard);
            console.log(`[Store Action - addContentCard] State updated successfully.`);
        }, { errorMessagePrefix: '添加卡片时出错' });
    };

    // 移除指定索引的内容卡片
    const removeContentCard = (index) => {
        // 前置检查
        if (!cardContent.value || !cardContent.value.contentCards) {
            console.error('[Store Action - removeContentCard] Cannot remove card: cardContent or contentCards is invalid.');
            toast.error('无法移除卡片：内容未加载或结构错误。');
            return;
        }
        if (cardContent.value.contentCards.length <= 1) {
            toast.warning('至少需要保留一张内容卡片。');
            return;
        }
        // 使用辅助函数处理
        handleSyncAction(() => {
            if (index < 0 || index >= cardContent.value.contentCards.length) {
                throw new Error(`无效的索引 ${index}`);
            }
            cardContent.value.contentCards.splice(index, 1);
            console.log(`[Store Action - removeContentCard] State updated successfully.`);
        }, { errorMessagePrefix: '移除卡片时出错' });
    };

    // 切换卡片（封面或内容）的可见性字段 (showHeader/showFooter)
    const toggleCardVisibility = ({ cardType, field, index = null }) => {
        // 前置检查
        if (!cardContent.value) {
            console.error(`[Store Action - toggleCardVisibility] Cannot toggle: cardContent is not loaded.`);
            toast.error('无法切换可见性：内容未加载。');
            return;
        }
        // 使用辅助函数处理
        handleSyncAction(() => {
            let target;
            if (cardType === 'coverCard' && cardContent.value.coverCard) {
                target = cardContent.value.coverCard;
            } else if (cardType === 'contentCard' && index !== null && cardContent.value.contentCards && index >= 0 && index < cardContent.value.contentCards.length) {
                target = cardContent.value.contentCards[index];
            } else {
                throw new Error(`找不到目标卡片 { cardType: ${cardType}, index: ${index} }`);
            }

            if (target && (field === 'showHeader' || field === 'showFooter') && typeof target[field] === 'boolean') {
                target[field] = !target[field];
                console.log(`[Store Action - toggleCardVisibility] Toggled ${field} for ${cardType} ${index !== null ? 'index ' + index : ''} to ${target[field]}`);
            } else {
                throw new Error(`无效的字段或目标类型 { field: ${field} }`);
            }
        }, { errorMessagePrefix: '切换可见性时出错' });
    };

    // --- Other Actions --- 

    // 更新卡片部分内容 (例如 Header/Footer 文本)
    const updateCardContent = (newContent) => {
        // 前置检查
        if (!cardContent.value) {
            console.error(`[Store Action - updateCardContent] Cannot update: cardContent is not loaded.`);
            toast.error('无法更新内容：内容未加载。');
            return;
        }
        // 使用辅助函数处理
        handleSyncAction(() => {
            cardContent.value = { ...cardContent.value, ...newContent };
            console.log(`[Store Action - updateCardContent] State updated successfully.`);
        }, { errorMessagePrefix: '更新卡片内容时出错' });
    };

    // 更新卡片文本内容 (封面标题/副标题, 内容卡片标题/正文)
    const updateCardText = ({ index, field, value }) => {
        // 前置检查
        if (!cardContent.value) {
            console.error(`[Store Action - updateCardText] Cannot update text: cardContent is not loaded.`);
            toast.error('无法更新文本：内容未加载。');
            return;
        }
        // 使用辅助函数处理
        handleSyncAction(() => {
            if (index === -1 && cardContent.value.coverCard) { // 封面
                if (field === 'title' || field === 'subtitle') {
                    cardContent.value.coverCard[field] = value;
                } else {
                    throw new Error(`封面卡片不支持字段 '${field}'。`);
                }
            } else if (index >= 0 && cardContent.value.contentCards && index < cardContent.value.contentCards.length) { // 内容卡片
                if (field === 'title' || field === 'body') {
                    cardContent.value.contentCards[index][field] = value;
                } else {
                    throw new Error(`内容卡片 ${index} 不支持字段 '${field}'。`);
                }
            } else {
                throw new Error(`无效的卡片索引 ${index}。`);
            }
            console.log(`[Store Action - updateCardText] State updated successfully (Card ${index}, Field ${field})`);
        }, { errorMessagePrefix: '更新卡片文本时出错' });
    };

    // 更新主文案
    const updateMainText = (newText) => {
        // 前置检查
        if (!cardContent.value) {
            console.error(`[Store Action - updateMainText] Cannot update main text: cardContent is not loaded.`);
            toast.error('无法更新主文案：内容未加载。');
            return;
        }
        // 使用辅助函数处理
        handleSyncAction(() => {
            cardContent.value.mainText = newText;
            console.log(`[Store Action - updateMainText] State updated successfully.`);
        }, { errorMessagePrefix: '更新主文案时出错' });
    };

    // 更新主题描述
    const updateTopicDescription = async (newDescription) => {
        const topicId = currentTopicId.value;
        if (!topicId) {
            console.error('[Store Action - updateTopicDescription] No current topic ID.');
            toast.error('无法更新简介：未选中任何主题。');
            return;
        }
        if (cardContent.value) {
            // 1. 更新当前编辑状态
            cardContent.value.topicDescription = newDescription;
            console.log('[Store] Topic description in cardContent updated');

            // 2. 更新内存中的 topics 列表 (用于 TopicSelector)
            const index = topics.value.findIndex(t => t.id === topicId);
            if (index !== -1 && topics.value[index].description !== newDescription) {
                topics.value[index].description = newDescription;
                console.log(`[Store] Topic description in memory array updated for ${topicId}`);
            } else if (index === -1) {
                console.warn(`[Store Action - updateTopicDescription] Topic ${topicId} not found in memory array.`);
            }

            // 3. 调用 API 持久化到 topicsMeta.js
            console.log(`[Store] Calling API to update topicsMeta.js for ${topicId}`);
            const result = await handleAsyncTask(async () => {
                const response = await fetch('/api/update-topic-meta', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ topicId, description: newDescription }),
                });
                const apiResult = await response.json();
                if (!response.ok || !apiResult.success) {
                    throw new Error(apiResult.message || '服务器未能成功更新 topicsMeta.js 文件。');
                }
                return apiResult;
            }, {
                errorMessagePrefix: `更新选题列表简介失败`
            });

            // 4. 显示结果
            if (result.success) {
                toast.success(result.data?.message || '选题简介已在后台更新。');
            } else {
                // 错误已被 handleAsyncTask 处理并 toast
                // 可以选择性地回滚内存中的 topics.value[index].description 更改，但这可能导致 UI 不一致
                console.error(`[Store] Failed to persist description update for ${topicId} to topicsMeta.js.`);
            }
        }
    };

    // 拖拽内容卡片排序
    const updateContentCardsOrder = (newOrder) => {
        // 前置检查
        if (!cardContent.value || !cardContent.value.contentCards) {
            console.error(`[Store Action - updateContentCardsOrder] Cannot reorder: cardContent or contentCards is invalid.`);
            toast.error('无法排序卡片：内容未加载或结构错误。');
            return;
        }
        // 使用辅助函数处理
        handleSyncAction(() => {
            cardContent.value.contentCards = newOrder;
            console.log(`[Store Action - updateContentCardsOrder] State updated successfully.`);
        }, { errorMessagePrefix: '更新卡片顺序时出错' });
    };

    // --- 新增：构建 Markdown 字符串的辅助函数 +++
    /**
     * 根据当前的 cardContent 状态构建完整的 Markdown 文件字符串。
     * @returns {string | null} 构建好的 Markdown 字符串，如果状态无效则返回 null。
     */
    const buildMarkdownString = () => {
        if (!currentTopicId.value || !cardContent.value || !cardContent.value.coverCard) {
            console.error('[Store Build MD] Cannot build Markdown: Invalid state.');
            return null;
        }
        const topicId = currentTopicId.value;
        const content = cardContent.value;
        const meta = topics.value.find(t => t.id === topicId);

        // --- 构建 YAML Front Matter ---
        const frontMatter = {
            topicId: topicId,
            title: meta?.title || content.coverCard.title || 'Untitled', // 优先使用元数据中的标题
            description: content.topicDescription || meta?.description || '', // 优先使用编辑区更新的描述
            headerText: content.headerText || '',
            footerText: content.footerText || '',
            coverShowHeader: content.coverCard.showHeader !== undefined ? content.coverCard.showHeader : true,
            coverShowFooter: content.coverCard.showFooter !== undefined ? content.coverCard.showFooter : true,
            contentDefaultShowHeader: true, // 暂时写死
            contentDefaultShowFooter: true  // 暂时写死
        };
        // 过滤掉值为空字符串的字段，但保留 'footerText'
        const fmEntries = Object.entries(frontMatter).filter(([key, v]) => key === 'footerText' || v !== '');
        let fmString = '---\n';
        fmEntries.forEach(([key, value]) => {
            // 始终对字符串值使用 JSON.stringify() 以确保正确的引号和转义
            const formattedValue = typeof value === 'string'
                ? JSON.stringify(value)
                : value;
            fmString += `${key}: ${formattedValue}\n`; // 使用正确的换行符
        });
        fmString += '---\n';

        // --- 构建 Markdown Body ---
        let bodyString = '\n'; // Front Matter 后空一行

        // Cover Card
        if (content.coverCard.title) {
            bodyString += `# ${content.coverCard.title}\n`;
        }
        if (content.coverCard.subtitle) {
            bodyString += `${content.coverCard.subtitle}\n`;
        }
        // 可选：如果需要精确还原，可以在这里添加 coverShowHeader/Footer 的注释
        // if (content.coverCard.showHeader !== frontMatter.coverShowHeader) { ... }
        bodyString += '\n---\n\n';

        // Content Cards
        content.contentCards?.forEach((card, index) => {
            let cardMetaString = '';
            if (card.title) {
                bodyString += `## ${card.title}\n`;
            }
            if (card.body) {
                bodyString += `${card.body}\n`;
            }

            // --- 使用常量 --- 
            if (card.showHeader !== frontMatter.contentDefaultShowHeader) {
                cardMetaString += `<!-- ${MD_COMMENT_SHOW_HEADER_KEY}: ${card.showHeader} -->\n`;
            }
            if (card.showFooter !== frontMatter.contentDefaultShowFooter) {
                cardMetaString += `<!-- ${MD_COMMENT_SHOW_FOOTER_KEY}: ${card.showFooter} -->\n`;
            }
            if (typeof card.fontSize === 'number' && card.fontSize !== DEFAULT_FONT_SIZE) {
                cardMetaString += `<!-- ${MD_COMMENT_FONT_SIZE_KEY}: ${card.fontSize} -->\n`;
            }
            if (typeof card.lineHeight === 'number' && card.lineHeight !== DEFAULT_LINE_HEIGHT) {
                cardMetaString += `<!-- ${MD_COMMENT_LINE_HEIGHT_KEY}: ${card.lineHeight.toFixed(1)} -->\n`;
            }

            if (cardMetaString) {
                bodyString += '\n' + cardMetaString;
            }

            if (index < content.contentCards.length - 1) {
                bodyString += '\n---\n\n';
            }
        });

        // Main Text
        if (content.mainText) {
            // 确保 Main Text 前有分隔符（如果前面有内容卡片）
            if (content.contentCards && content.contentCards.length > 0) {
                bodyString += '\n---\n\n';
            } else {
                bodyString += '\n'; // 如果没有内容卡片，也确保和封面卡有分隔
            }
            bodyString += `## Main Text\n${content.mainText}\n`; // 使用 ## Main Text 标题
        }

        return fmString + bodyString.trim(); // 返回完整内容，移除末尾多余空白
    };

    // --- 修改：保存内容到本地 MD 文件 --- 
    const saveContentLocally = async () => {
        console.log('[Store Action] Attempting to save content to local MD file...');
        const topicId = currentTopicId.value;
        if (!topicId) {
            return { success: false, message: "错误：无法获取当前主题 ID" };
        }

        // 1. 构建 Markdown 字符串
        const markdownContent = buildMarkdownString();
        if (markdownContent === null) {
            return { success: false, message: "错误：无法构建 Markdown 内容，状态无效。" };
        }

        // 2. 调用 API 保存
        const result = await handleAsyncTask(async () => {
            const response = await fetch('/api/save-md-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topicId: topicId, content: markdownContent }),
            });
            const apiResult = await response.json();
            if (!response.ok || !apiResult.success) {
                throw new Error(apiResult.message || '服务器未能成功保存文件。');
            }
            return apiResult; // 返回成功结果
        }, {
            errorMessagePrefix: `保存 ${topicId}.md 失败`
        });

        if (result.success && result.data) {
            console.log(`[Store] Successfully saved content to ${topicId}.md via API.`);
            // 保存成功后，可以考虑是否需要强制刷新前端状态
            // 当前我们是从 API 加载，如果 MD 文件被修改，下次加载就是新的
            // 但如果希望保存后 *立即* 看到精确的（比如格式化后的）结果，可以触发刷新
            // await loadTopic(topicId, true); // 可选：保存后强制刷新
            return { success: true, message: result.data.message || `主题 "${currentTopicTitle.value}" 的内容已成功保存到本地 ${topicId}.md！` };
        } else {
            // 错误已被 handleAsyncTask 记录
            return { success: false, message: result.error?.message || `保存 ${topicId}.md 失败` };
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

    // +++ 新增：调整内容卡片字体大小 Action +++
    const adjustCardFontSize = (index, delta) => {
        // 前置检查
        if (!cardContent.value || !cardContent.value.contentCards) {
            console.error(`[Store Action - adjustCardFontSize] Cannot adjust font size: cardContent or contentCards is invalid.`);
            toast.error('无法调整字号：内容未加载或结构错误。');
            return;
        }
        if (index < 0 || index >= cardContent.value.contentCards.length) {
            console.error(`[Store Action - adjustCardFontSize] Invalid index: ${index}`);
            toast.error(`无法调整字号：无效的卡片索引 ${index}。`);
            return;
        }

        // 使用辅助函数处理
        handleSyncAction(() => {
            const card = cardContent.value.contentCards[index];
            const currentSize = typeof card.fontSize === 'number' ? card.fontSize : DEFAULT_FONT_SIZE;
            let newSize = currentSize + delta;
            newSize = Math.max(MIN_FONT_SIZE, Math.min(newSize, MAX_FONT_SIZE));

            if (newSize !== currentSize) {
                card.fontSize = newSize;
                console.log(`[Store Action - adjustCardFontSize] Font size for card ${index} updated to ${newSize}px.`);
            } else {
                // 边界情况的 info 提示可以在这里处理，或者移到调用处，这里简化处理，只处理错误
                if (delta > 0) toast.info(`字号已达到最大值 (${MAX_FONT_SIZE}px)`);
                else if (delta < 0) toast.info(`字号已达到最小值 (${MIN_FONT_SIZE}px)`);
            }
        }, { errorMessagePrefix: `调整卡片 ${index} 字号时出错` });
    };

    // +++ 新增：调整内容卡片行高 Action +++
    const adjustCardLineHeight = (index, delta) => {
        // 前置检查
        if (!cardContent.value || !cardContent.value.contentCards) {
            console.error(`[Store Action - adjustCardLineHeight] Cannot adjust line height: cardContent or contentCards is invalid.`);
            toast.error('无法调整行高：内容未加载或结构错误。');
            return;
        }
        if (index < 0 || index >= cardContent.value.contentCards.length) {
            console.error(`[Store Action - adjustCardLineHeight] Invalid index: ${index}`);
            toast.error(`无法调整行高：无效的卡片索引 ${index}。`);
            return;
        }

        // 使用辅助函数处理
        handleSyncAction(() => {
            const card = cardContent.value.contentCards[index];
            const currentHeight = typeof card.lineHeight === 'number' ? card.lineHeight : DEFAULT_LINE_HEIGHT;
            let newHeight = parseFloat((currentHeight + delta).toFixed(1));
            newHeight = Math.max(MIN_LINE_HEIGHT, Math.min(newHeight, MAX_LINE_HEIGHT));

            if (newHeight !== currentHeight) {
                card.lineHeight = newHeight;
                console.log(`[Store Action - adjustCardLineHeight] Line height for card ${index} updated to ${newHeight}.`);
            } else {
                // 边界情况的 info 提示
                if (delta > 0) toast.info(`行高已达到最大值 (${MAX_LINE_HEIGHT.toFixed(1)})`);
                else if (delta < 0) toast.info(`行高已达到最小值 (${MIN_LINE_HEIGHT.toFixed(1)})`);
            }
        }, { errorMessagePrefix: `调整卡片 ${index} 行高时出错` });
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
        fileLoadingError,
        isLoadingContent,

        // Getters
        currentTopic,
        currentTopicDescription,

        // Actions
        addOrUpdateTopicMeta,
        fetchFileLists,
        addDetectedMarkdownFile,
        loadTopic,
        loadPlaceholderContent,
        addContentCard,
        removeContentCard,
        toggleCardVisibility,
        updateCardContent,
        updateCardText,
        updateMainText,
        updateTopicDescription,
        updateContentCardsOrder,
        saveContentLocally,
        setSelectedTemplate,
        setFocusedPreview,
        setFocusedEditor,
        resetFocus,
        returnToTopicSelection,
        saveMarkdownTemplate,
        adjustCardFontSize,
        adjustCardLineHeight,
        initializeStore
    };
}, {
    // 可以在这里配置持久化等插件选项
    // persist: true, // 示例：如果使用了 pinia-plugin-persistedstate
}); 