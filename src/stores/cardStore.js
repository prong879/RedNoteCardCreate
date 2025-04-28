import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useToast } from 'vue-toastification';
import { topicsMeta } from '../content/topicsMeta'; // 调整路径

// 使用 defineStore 定义 store
// 第一个参数是 store 的唯一 ID
// 第二个参数是选项对象或 setup 函数
export const useCardStore = defineStore('card', () => {
    // --- State ---
    // 使用 ref() 定义 state 属性
    const selectedTemplate = ref('template1'); // 默认模板
    const cardContent = ref({}); // 卡片内容
    const currentTopicId = ref(null); // 当前主题ID
    const currentTopicTitle = ref(''); // 当前主题标题
    const showTopicSelector = ref(true); // 是否显示主题选择器
    // 预览区聚焦卡片索引: null (无焦点), -1 (封面), 0+ (内容卡片索引)
    const focusedPreviewIndex = ref(null);
    // 编辑区聚焦卡片索引: null (无焦点), -1 (封面), 0+ (内容卡片索引)
    const focusedEditorIndex = ref(null);

    // --- Getters ---
    // 使用 computed() 定义 getter
    const currentTopic = computed(() => {
        if (!currentTopicId.value) return null;
        return topicsMeta.find(t => t.id === currentTopicId.value);
    });

    const currentTopicDescription = computed(() => {
        return currentTopic.value?.description || '没有找到该选题的描述信息。';
    });

    // --- Actions ---
    // 使用函数定义 action
    const toast = useToast(); // 获取 toast 实例

    // 加载主题内容
    const loadTopic = async (topicId) => {
        console.log(`[Store] Attempting to load topic: ${topicId}`);
        currentTopicId.value = topicId;

        // 更新标题和获取描述 (从 getter 获取)
        currentTopicTitle.value = currentTopic.value?.title || `未命名主题 (${topicId})`;
        const description = currentTopicDescription.value;

        try {
            // 使用 Vite 的动态导入 glob 获取模块
            const modules = import.meta.glob('../content/*_content.js');
            const path = `../content/${topicId}_content.js`;

            if (modules[path]) {
                const contentModule = await modules[path](); // 执行函数加载模块

                if (contentModule && contentModule[`${topicId}_contentData`]) {
                    cardContent.value = {
                        ...contentModule[`${topicId}_contentData`],
                        topicDescription: description // 添加描述字段
                    };
                    console.log('[Store] Successfully loaded content from file for', topicId);
                } else {
                    console.warn(`[Store] Data export not found in ${topicId}_content.js, loading placeholder.`);
                    loadPlaceholderContent(topicId, description);
                }
            } else {
                console.log(`[Store] Content file for ${topicId} not found, loading placeholder.`);
                loadPlaceholderContent(topicId, description);
            }
        } catch (error) {
            console.error(`[Store] Failed to load content for ${topicId}, loading placeholder. Error:`, error);
            toast.error(`加载主题 ${topicId} 内容失败: ${error.message}`);
            loadPlaceholderContent(topicId, description);
        }
        showTopicSelector.value = false; // 加载后隐藏选择器
    };

    // 加载占位内容
    const loadPlaceholderContent = (topicId, description = '占位符描述') => {
        const meta = topicsMeta.find(t => t.id === topicId);
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
            } else {
                console.warn(`[Store Action] Invalid field or target type for toggleVisibility:`, { target, field });
            }
        } catch (error) {
            console.error('[Store Action] Error toggling visibility:', error);
            toast.error('切换显隐状态时出错');
        }
    };

    // --- Other Actions ---

    // 更新卡片部分内容
    const updateCardContent = (newContent) => {
        cardContent.value = { ...cardContent.value, ...newContent };
        console.log('[Store] Card content updated');
    };

    // 更新主文案
    const updateMainText = (newText) => {
        if (cardContent.value) {
            cardContent.value.mainText = newText;
            console.log('[Store] Main text updated');
        }
    };

    // 更新主题描述 (由 CardConfig 触发)
    const updateTopicDescription = (newDescription) => {
        if (cardContent.value) {
            cardContent.value.topicDescription = newDescription;
            console.log('[Store] Topic description updated');
        }
    };

    // 生成并下载 JS 内容文件
    const generateContentJsFile = () => {
        if (!currentTopicId.value) {
            toast.error("请先选择一个选题！");
            return;
        }
        const topicId = currentTopicId.value;
        // 确保保存最新的描述信息
        const contentToSave = {
            ...cardContent.value,
            topicDescription: cardContent.value.topicDescription || currentTopicDescription.value // 优先使用编辑后的，否则用meta的
        };
        const filename = `${topicId}_content.js`;

        const fileContent = `// src/content/${filename}\n// Generated at: ${new Date().toISOString()}\n\nexport const ${topicId}_contentData = ${JSON.stringify(contentToSave, null, 2)};\n`;

        const blob = new Blob([fileContent], { type: 'text/javascript;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        toast.success(`已生成 ${filename} 文件供下载。请手动将其移动到项目的 'src/content/' 目录下替换旧文件。`, {
            timeout: 8000
        });
    };

    // 保存内容到本地 (调用后端 API)
    const saveContentLocally = async () => {
        if (!currentTopicId.value) {
            toast.error("错误：无法获取当前主题 ID");
            return;
        }
        if (!cardContent.value || Object.keys(cardContent.value).length === 0) {
            toast.error("错误：没有内容可以保存");
            return;
        }

        const topicId = currentTopicId.value;
        // 确保保存最新的描述信息
        const contentData = {
            ...cardContent.value,
            topicDescription: cardContent.value.topicDescription || currentTopicDescription.value
        };
        const filename = `${topicId}_content.js`;

        const loadingToastId = toast.info(`正在保存内容到本地文件 ${filename}...`, { timeout: false });

        try {
            const response = await fetch('/api/save-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topicId, contentData }),
            });

            toast.dismiss(loadingToastId);
            const result = await response.json();

            if (response.ok) {
                toast.success(result.message || `成功保存到 ${filename}`);
                console.log('[Store - Save Locally] 保存成功:', result);
            } else {
                toast.error(`保存失败 (${response.status}): ${result.message || '未知错误'}`);
                console.error('[Store - Save Locally] 保存失败:', result);
            }
        } catch (error) {
            toast.dismiss(loadingToastId);
            toast.error(`保存时发生网络或解析错误: ${error.message}`);
            console.error('[Store - Save Locally] 请求或解析错误:', error);
        }
    };

    // 设置预览区聚焦
    // index: null (无焦点请求), -1 (请求聚焦封面), 0+ (请求聚焦内容卡片)
    const setFocusedPreview = (index) => {
        console.log('[Store] Setting focused preview index:', index);
        focusedPreviewIndex.value = index;
    };

    // 设置编辑区聚焦 (由预览滚动触发)
    // index: null (滚动结束时未聚焦任何卡片), -1 (封面卡片居中), 0+ (内容卡片居中)
    const setFocusedEditor = (index) => {
        console.log('[Store] Setting focused editor index:', index);
        focusedEditorIndex.value = index;
    };

    // 重置焦点请求 (将预览焦点设为 null)
    const resetFocus = () => {
        // 注意: 此方法现在只重置 '预览请求' 状态 (focusedPreviewIndex)
        // 编辑区的焦点状态 (focusedEditorIndex) 由实际滚动结果驱动
        if (focusedPreviewIndex.value !== null) {
            console.log('[Store] Resetting focused preview index to null.');
            focusedPreviewIndex.value = null;
        }
    };

    // 返回主题选择
    const returnToTopicSelection = () => {
        showTopicSelector.value = true;
        currentTopicId.value = null;
        currentTopicTitle.value = '';
        cardContent.value = {};
        console.log('[Store] Returned to topic selection');
    };

    // --- 返回 State, Getters, Actions ---
    return {
        // State
        selectedTemplate,
        cardContent,
        currentTopicId,
        currentTopicTitle,
        showTopicSelector,
        focusedPreviewIndex,
        focusedEditorIndex,
        // Getters
        currentTopic,
        currentTopicDescription,
        // Actions
        loadTopic,
        addContentCard,
        removeContentCard,
        toggleCardVisibility,
        updateCardContent,
        updateMainText,
        updateTopicDescription,
        generateContentJsFile,
        saveContentLocally,
        setFocusedPreview,
        setFocusedEditor,
        resetFocus,
        returnToTopicSelection
    };
}); 