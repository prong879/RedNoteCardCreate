import { ref } from 'vue';
import { useToast } from "vue-toastification";
import { handleAsyncTask } from '../utils/asyncHandler';
import { sanitizeFilename } from '../utils/cardExport';

// --- 在 Composable 内部定义辅助函数 ---

/**
 * 获取 YYMMDD 格式的日期字符串
 * @returns {string} YYMMDD 格式的日期
 */
function getFormattedDate() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 封装卡片导出逻辑的 Composable
 * 
 * @param {object} store - Pinia store 实例 (useCardStore)
 * @param {import('vue').Ref<HTMLElement | null>} coverCardContainerRef - 封面卡片容器的 Ref
 * @param {import('vue').Ref<Array<HTMLElement | null>>} contentCardRefsArray - 内容卡片容器的 Ref 数组
 * @param {import('vue').Ref<string>} selectedFormatRef - 选中的导出格式 Ref ('jpg' | 'png')
 * @returns {{ 
 *   isExporting: import('vue').Ref<boolean>, 
 *   exportProgress: import('vue').Ref<{ type: string, current: number, total: number }>, 
 *   exportSingleCard: (cardIdentifier: { type: 'cover' } | { type: 'content', index: number }, cardElementRefOrActualElement: any) => Promise<void>,
 *   exportAllAsImages: () => Promise<void>, 
 *   exportAllAsZip: () => Promise<void> 
 * }}
 */
export function useCardExporter(store, coverCardContainerRef, contentCardRefsArray, selectedFormatRef) {
    const toast = useToast();
    const isExporting = ref(false);
    const exportProgress = ref({ type: '', current: 0, total: 0 }); // type: 'images' | 'zip' | 'single'
    const currentLoadingToastId = ref(null);

    // --- 内部辅助函数 --- 

    // 从 CardPreview.vue 移动过来的函数
    const _getExportableCardElement = (containerElement) => {
        if (!containerElement) {
            return null;
        }
        // $el 可能是 Vue 组件实例的根 DOM 元素
        const actualContainer = containerElement.$el || containerElement;
        let actualCard = actualContainer.querySelector('[data-exportable-card="true"]');
        if (!actualCard) {
            throw new Error('在容器元素内找不到具有 [data-exportable-card="true"] 属性的可导出卡片元素。');
        }
        return actualCard;
    };

    // 从 CardPreview.vue 移动过来的函数 (依赖 store)
    const _getAllExportableElements = () => {
        const elements = [];
        const cardSources = [
            { ref: coverCardContainerRef, type: 'cover', index: -1 },
            ...(store.cardContent?.contentCards?.map((_, index) => ({
                // 直接使用传入的 Ref 数组
                ref: contentCardRefsArray.value[index],
                type: 'content',
                index: index
            })) || [])
        ];
        cardSources.forEach(source => {
            // 直接使用 source.ref (它已经是 Ref 对象或 null)
            const containerRef = source.ref;
            // 从 Ref 获取实际的 DOM 元素
            const containerElement = containerRef?.value || containerRef;
            if (containerElement) {
                try {
                    const exportableElement = _getExportableCardElement(containerElement);
                    elements.push({ element: exportableElement, type: source.type, index: source.index });
                } catch (error) {
                    console.warn(`无法为 ${source.type} 卡片 (索引 ${source.index}) 找到可导出元素: ${error.message}`);
                }
            } else {
                console.warn(`容器元素未找到，类型: ${source.type}, 索引: ${source.index}`);
            }
        });
        return elements;
    };

    // 内部进度更新逻辑
    const _updateExportProgress = (current, total, type) => {
        exportProgress.value.current = current;
        exportProgress.value.total = total;
        exportProgress.value.type = type;
        // 更新 Toast 内容
        if (currentLoadingToastId.value !== null) {
            const message = `正在导出 ${type === 'images' ? '图片' : (type === 'zip' ? 'ZIP 包' : '卡片')} (${current}/${total})...`;
            toast.update(currentLoadingToastId.value, { content: message });
        }
    };

    // --- 导出的方法 --- 

    const exportSingleCard = async (cardIdentifier, cardElementRefOrActualElement) => {
        // console.log('Current Topic ID in Store:', store.currentTopicId); // 移除调试日志
        if (isExporting.value) {
            toast.warning('已有导出任务进行中。');
            return;
        }

        // +++ 动态导入 +++
        let cardExportUtils;
        try {
            cardExportUtils = (await import('../utils/cardExport')).default;
        } catch (err) {
            console.error("加载导出模块失败:", err);
            toast.error("加载导出功能失败，请稍后再试。");
            return; // 无法继续
        }
        // +++ 结束动态导入 +++

        const cardElement = cardElementRefOrActualElement?.$el || cardElementRefOrActualElement;
        if (!store.currentTopicId) {
            toast.error('无法获取主题ID，无法导出。');
            return;
        }
        if (!cardElement) {
            toast.error('无法获取卡片元素，无法导出。');
            return;
        }

        // --- 在这里生成文件名 ---
        const dateString = getFormattedDate(); // 使用内部函数
        let baseName;
        if (cardIdentifier.type === 'cover') {
            baseName = `${store.currentTopicId}_封面`;
        } else if (cardIdentifier.type === 'content' && typeof cardIdentifier.index === 'number') {
            baseName = `${store.currentTopicId}_内容${String(cardIdentifier.index + 1).padStart(2, '0')}`;
        } else {
            toast.error('无效的卡片标识符，无法生成文件名。');
            console.error('无效的 cardIdentifier:', cardIdentifier);
            return;
        }
        const rawFileName = `${baseName}_${dateString}`;
        // console.log('Raw filename created:', rawFileName); // 添加调试日志 // 移除调试日志
        // --- 文件名生成结束 ---

        isExporting.value = true;
        exportProgress.value = { type: 'single', current: 0, total: 1 }; // 重置进度
        const format = selectedFormatRef.value; // 使用传入的 Ref
        const initialLoadingMessage = `准备导出 ${sanitizeFilename(rawFileName)}.${format}...`; // 使用 sanitizeFilename
        currentLoadingToastId.value = toast.info(initialLoadingMessage, { timeout: false });
        _updateExportProgress(0, 1, 'single'); // 更新进度UI

        const result = await handleAsyncTask(async () => {
            const actualCardToExport = _getExportableCardElement(cardElement);
            // 直接传递 rawFileName, 让 exportCardAsImage 内部处理 sanitize
            // +++ 使用动态导入的模块 +++
            await cardExportUtils.exportCardAsImage(actualCardToExport, rawFileName, format);
            _updateExportProgress(1, 1, 'single');
        }, {
            errorMessagePrefix: "导出单张卡片失败"
        });

        if (currentLoadingToastId.value !== null) {
            toast.dismiss(currentLoadingToastId.value);
            currentLoadingToastId.value = null;
        }
        isExporting.value = false;

        if (result.success) {
            // console.log('Filename for toast (raw):', rawFileName); // 移除调试日志
            const sanitizedNameForToast = sanitizeFilename(rawFileName); // 调用 sanitize
            // console.log('Filename for toast (sanitized):', sanitizedNameForToast); // 移除调试日志
            toast.success(`成功导出 ${sanitizedNameForToast}.${format}`); // 使用 sanitize 后的结果
        } else if (result.error) {
            toast.error(`导出单张卡片失败: ${result.error.message}`);
        }
    };

    const exportAllAsImages = async () => {
        if (isExporting.value || !store.currentTopicId) {
            toast.error(isExporting.value ? '已有导出任务进行中。' : '无法获取主题ID，无法导出。');
            return;
        }

        // +++ 动态导入 +++
        let cardExportUtils;
        try {
            cardExportUtils = (await import('../utils/cardExport')).default;
        } catch (err) {
            console.error("加载导出模块失败:", err);
            toast.error("加载导出功能失败，请稍后再试。");
            return; // 无法继续
        }
        // +++ 结束动态导入 +++

        const elementsToExport = _getAllExportableElements();
        if (elementsToExport.length === 0) {
            toast.warning("没有可导出的卡片。");
            return;
        }

        isExporting.value = true;
        exportProgress.value = { type: 'images', current: 0, total: elementsToExport.length };
        const format = selectedFormatRef.value;
        const dateString = getFormattedDate();
        const initialLoadingMessage = `准备导出 ${elementsToExport.length} 张图片 (${format.toUpperCase()})...`;
        currentLoadingToastId.value = toast.info(initialLoadingMessage, { timeout: false });
        _updateExportProgress(0, elementsToExport.length, 'images'); // 初始进度

        const progressCallback = (current, total) => {
            _updateExportProgress(current, total, 'images');
        };

        const result = await handleAsyncTask(async () => {
            // +++ 使用动态导入的模块 +++
            await cardExportUtils.exportCardsAsImages(
                elementsToExport,
                store.currentTopicId,
                dateString,
                format,
                progressCallback // 传入回调
            );
        }, {
            errorMessagePrefix: "批量导出图片失败"
        });

        if (currentLoadingToastId.value !== null) {
            toast.dismiss(currentLoadingToastId.value);
            currentLoadingToastId.value = null;
        }
        isExporting.value = false;

        if (result.success) {
            toast.success('所有图片导出完成！');
        } else if (result.error) {
            toast.error(`${result.error.message || '批量导出图片时发生未知错误'}`);
            if (result.error.details && result.error.details.errors?.length > 0) {
                console.error("详细失败列表:", result.error.details.errors);
            }
        }
    };

    const exportAllAsZip = async () => {
        if (isExporting.value || !store.currentTopicId) {
            toast.error(isExporting.value ? '已有导出任务进行中。' : '无法获取主题ID，无法导出。');
            return;
        }

        // +++ 动态导入 +++
        let cardExportUtils;
        try {
            cardExportUtils = (await import('../utils/cardExport')).default;
        } catch (err) {
            console.error("加载导出模块失败:", err);
            toast.error("加载导出功能失败，请稍后再试。");
            return; // 无法继续
        }
        // +++ 结束动态导入 +++

        const elementsToExport = _getAllExportableElements();
        if (elementsToExport.length === 0) {
            toast.warning("没有可导出的卡片。");
            return;
        }

        isExporting.value = true;
        exportProgress.value = { type: 'zip', current: 0, total: elementsToExport.length };
        const format = selectedFormatRef.value;
        const dateString = getFormattedDate();
        const zipFileNameBase = `${store.currentTopicId}_${dateString}`;
        const initialLoadingMessage = `准备生成 ${elementsToExport.length} 张图片 (${format.toUpperCase()}) 并打包...`;
        currentLoadingToastId.value = toast.info(initialLoadingMessage, { timeout: false });
        _updateExportProgress(0, elementsToExport.length, 'zip'); // 初始进度

        const progressCallback = (current, total) => {
            _updateExportProgress(current, total, 'zip');
        };

        const result = await handleAsyncTask(async () => {
            // +++ 使用动态导入的模块 +++
            await cardExportUtils.exportCardsAsZip(
                elementsToExport,
                store.currentTopicId,
                dateString,
                format,
                progressCallback // 传入回调
            );
        }, {
            errorMessagePrefix: "打包下载失败"
        });

        if (currentLoadingToastId.value !== null) {
            toast.dismiss(currentLoadingToastId.value);
            currentLoadingToastId.value = null;
        }
        isExporting.value = false;

        if (result.success) {
            toast.success(`打包文件 ${sanitizeFilename(zipFileNameBase)}.zip 已开始下载！`); // 使用 sanitizeFilename
        } else if (result.error) {
            toast.error(`${result.error.message || '打包下载时发生未知错误'}`);
            if (result.error.details && result.error.details.errors?.length > 0) {
                console.error("详细失败列表:", result.error.details.errors);
            }
        }
    };

    // 返回状态和方法给组件使用
    return {
        isExporting,
        exportProgress,
        exportSingleCard,
        exportAllAsImages,
        exportAllAsZip,
    };
} 