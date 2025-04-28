<template>
    <div class="card-preview" ref="cardPreviewRoot">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">卡片预览</h2>
            <div class="flex gap-2 items-center">
                <div class="flex items-center">
                    <label for="format-select" class="mr-1 text-sm text-gray-600">格式:</label>
                    <select id="format-select" v-model="selectedFormat" class="h-8 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                        <option value="jpg">JPG</option>
                        <option value="png">PNG</option>
                    </select>
                </div>
                <button @click="exportAllAsImages" class="px-4 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">全部导出</button>
                <button @click="exportAllAsZip" class="px-4 py-1 bg-xhs-pink text-white rounded-lg text-sm hover:bg-opacity-90 transition-colors">打包下载</button>
            </div>
        </div>

        <!-- 添加相对定位的容器 -->
        <div v-if="store.cardContent && store.cardContent.coverCard" class="relative preview-container-wrapper">
            <div ref="previewScrollContainer" @scroll="handleScroll" class="flex overflow-x-auto scroll-smooth gap-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <!-- 封面卡片 -->
                <div class="card-container flex-shrink-0" ref="coverCardContainer">
                    <div ref="coverCard">
                        <component :is="activeTemplateComponent" type="cover"
                            :cardData="store.cardContent.coverCard" 
                            :headerText="store.cardContent.headerText || ''"
                            :footerText="store.cardContent.footerText || ''"
                            :isHeaderVisible="store.cardContent.coverCard.showHeader !== false"
                            :isFooterVisible="store.cardContent.coverCard.showFooter !== false"/>
                    </div>
                    <div class="mt-2 text-center text-sm text-xhs-gray">
                        封面卡片
                        <button @click="exportSingleCard($refs.coverCard, `${store.currentTopicId}_封面_${getFormattedDate()}`)"
                            class="ml-2 text-xs text-xhs-pink border border-xhs-pink bg-pink-100 px-2 py-0.5 rounded hover:bg-pink-200 transition-colors">
                            导出
                        </button>
                    </div>
                </div>

                <!-- 内容卡片 -->
                <div v-for="(card, index) in store.cardContent.contentCards" :key="index" class="card-container flex-shrink-0" :ref="el => { if (el) contentCardRefs[index] = el }">
                    <div>
                        <component :is="activeTemplateComponent" type="content"
                             :cardData="card" 
                             :headerText="store.cardContent.headerText || ''"
                             :footerText="store.cardContent.footerText || ''"
                             :isHeaderVisible="card.showHeader !== false"
                             :isFooterVisible="card.showFooter !== false"/>
                    </div>
                    <div class="mt-2 text-center text-sm text-xhs-gray">
                        内容卡片 {{ index + 1 }}
                        <button @click="exportSingleCard(contentCardRefs[index], `${store.currentTopicId}_内容${String(index + 1).padStart(2, '0')}_${getFormattedDate()}`)"
                            class="ml-2 text-xs text-xhs-pink border border-xhs-pink bg-pink-100 px-2 py-0.5 rounded hover:bg-pink-200 transition-colors">
                            导出
                        </button>
                    </div>
                </div>
            </div>

            <!-- 左滚动按钮 -->
            <button v-show="showLeftScroll" @click="scrollLeft"
                class="absolute left-0 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800/40 text-white p-2 rounded-full hover:bg-gray-800/60 focus:outline-none transition-opacity ml-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <!-- 右滚动按钮 -->
            <button v-show="showRightScroll" @click="scrollRight"
                class="absolute right-0 top-1/2 transform -translate-y-1/2 z-10 bg-gray-800/40 text-white p-2 rounded-full hover:bg-gray-800/60 focus:outline-none transition-opacity mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>
        <div v-else class="p-6 text-center text-gray-500">
            请先选择一个主题或等待内容加载...
        </div>

        <div v-if="store.cardContent" class="mt-6">
            <h3 class="text-lg font-medium mb-2">主文案编辑</h3>
            <textarea 
                ref="mainTextareaRef" 
                v-model="mainTextModel" 
                class="w-full p-4 bg-gray-50 rounded-lg border border-gray-200 dynamic-textarea hide-scrollbar"
                placeholder="在此处编辑小红书主文案..."
                rows="6"
                @input="handleTextareaInput" 
            ></textarea>
            <button @click="copyMainText"
                class="mt-2 px-4 py-1 bg-xhs-pink text-white rounded-lg text-sm hover:bg-opacity-90 transition-colors">
                复制主文案
            </button>
        </div>
    </div>
</template>

<script>
import { computed, ref, watch, onBeforeUpdate, nextTick, onMounted, onUpdated, onUnmounted } from 'vue';
// 导入 store
import { useCardStore } from '../stores/cardStore'; 
import { exportCardAsImage, exportCardsAsImages, exportCardsAsZip, copyTextToClipboard } from '../utils/cardExport';
// 导入 vue-toastification
import { useToast } from "vue-toastification";

// 导入新的模板加载器
import { useTemplateLoader } from '../composables/useTemplateLoader';
// 导入文本域自动高度 hook
import { useTextareaAutoHeight } from '../composables/useTextareaAutoHeight';
// 导入重构后的 getFormattedDate
import { getFormattedDate } from '../utils/cardExport';

export default {
    name: 'CardPreview',
    setup() {
        // 获取 store 实例
        const store = useCardStore();
        
        // 使用新的加载器
        const { getAsyncTemplateComponent } = useTemplateLoader();
        // 获取根元素的引用，用于自动高度调整
        const cardPreviewRoot = ref(null);
        // 新增：为 textarea 添加 ref
        const mainTextareaRef = ref(null);
        // 使用文本域自动高度 hook
        const { adjustSingleTextarea, adjustAllTextareas } = useTextareaAutoHeight(cardPreviewRoot);
        // 获取 toast 实例
        const toast = useToast();
        const selectedFormat = ref('jpg');

        // 计算属性，依赖 store.selectedTemplate
        const activeTemplateComponent = computed(() => {
            return getAsyncTemplateComponent(store.selectedTemplate); 
        });

        const previewScrollContainer = ref(null);
        const coverCardContainer = ref(null);
        const coverCard = ref(null);
        const contentCardRefs = ref([]);
        const showLeftScroll = ref(false);
        const showRightScroll = ref(false);

        // 计算属性，直接读写 store.cardContent.mainText
        const mainTextModel = computed({
            get: () => store.cardContent?.mainText || '',
            set: (newValue) => {
                store.updateMainText(newValue); // 调用 store action 更新
            }
        });

        // 处理文本域输入事件以调整高度
        const handleTextareaInput = (event) => {
            adjustSingleTextarea(event.target);
        };

        onBeforeUpdate(() => {
            contentCardRefs.value = [];
        });

        // 监听 store.cardContent.mainText 变化，调整高度
        watch(() => store.cardContent?.mainText, (newText) => {
            nextTick(() => {
                if (mainTextareaRef.value) {
                    adjustSingleTextarea(mainTextareaRef.value);
                }
            });
        }, { immediate: false });

        // 监听 store.focusedPreviewIndex 变化，滚动到对应卡片
        watch(() => store.focusedPreviewIndex, (newIndex) => {
            console.log('[CardPreview] Watcher triggered for focusedPreviewIndex:', newIndex);
            // 使用 nextTick 确保 DOM 元素可用
            nextTick(() => {
                let targetElementContainer;
                if (newIndex === null) { // 聚焦封面卡片
                    targetElementContainer = coverCardContainer.value;
                    console.log('[CardPreview] Focusing cover card. Container:', targetElementContainer);
                } else if (newIndex >= 0) { // 聚焦内容卡片
                    targetElementContainer = contentCardRefs.value[newIndex];
                    console.log(`[CardPreview] Focusing content card ${newIndex}. Container:`, targetElementContainer);
                } else {
                    console.warn('[CardPreview] Invalid index received for focus:', newIndex);
                    return; // 无效索引，不处理
                }

                if (targetElementContainer && previewScrollContainer.value) {
                    console.log(`[CardPreview] Scrolling preview to card index: ${newIndex}`, targetElementContainer);
                    targetElementContainer.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    });
                    // 滚动完成后重置 store 中的焦点状态，避免重复触发
                    // 考虑是否需要延迟执行，或者在滚动事件结束时重置
                    // setTimeout(() => store.resetFocus(), 500); // 简单延迟示例
                    // 更好的方式可能是监听 scroll 事件结束
                } else {
                     if (newIndex === null) {
                        console.warn('[CardPreview] Cover card container element not found for scrolling.');
                     } else {
                        console.warn(`[CardPreview] Content card container element not found for index ${newIndex} for scrolling.`);
                     }
                     console.log({ 
                        coverRef: coverCardContainer.value, 
                        contentRefs: contentCardRefs.value, 
                        scrollContainer: previewScrollContainer.value 
                     });
                }
            });
        }, { flush: 'post' }); // flush: 'post' 确保在 DOM 更新后执行 watcher 回调
        
        // 获取所有卡片容器元素 (稍作调整)
        const getAllCardElements = () => {
            const cover = coverCardContainer.value; 
            const contents = contentCardRefs.value || []; 
            const elements = [];
            if (cover) elements.push(cover); // coverCardContainer 是 DOM 元素
            elements.push(...contents.filter(el => el)); // contentCardRefs 也是 DOM 元素数组
            return elements;
        };

        // 查找当前中心卡片的索引 (保持不变)
        const findCurrentCardIndex = () => {
            const container = previewScrollContainer.value;
            if (!container) return -1;
            const containerCenter = container.scrollLeft + container.clientWidth / 2;
            const cards = getAllCardElements();
            let minIndex = -1;
            let minDistance = Infinity;

            cards.forEach((card, index) => {
                if (!card) return;
                const cardCenter = card.offsetLeft + card.clientWidth / 2;
                const distance = Math.abs(cardCenter - containerCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    minIndex = index; // 这个 index 对应 getAllCardElements 返回数组的索引 (0是封面, 1+是内容卡片)
                }
            });
            
            // 将数组索引转换为 store action 需要的索引 (null for cover, 0+ for content)
            if (minIndex === 0) return null; // 封面卡片
            if (minIndex > 0) return minIndex - 1; // 内容卡片索引 (0-based)
            return null; // 未找到或只有封面
        };
        
        // 防抖函数 (用于滚动结束时触发 store action)
        const debounce = (func, delay) => {
            let timeoutId;
            return (...args) => {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                }, delay);
            };
        };
        
        // 滚动结束时触发的函数，更新编辑器焦点
        const onScrollEnd = debounce(() => {
            const currentEditorIndex = findCurrentCardIndex();
            console.log('[CardPreview] Scroll ended. Detected editor index:', currentEditorIndex);
            store.setFocusedEditor(currentEditorIndex); // 更新 store 中的编辑器焦点索引
            store.resetFocus(); // 重置预览区焦点请求 (因为滚动已完成)
        }, 200); // 200ms 无滚动视为结束

        // 检查滚动按钮显隐 (保持不变)
        const checkScrollButtons = () => {
            const el = previewScrollContainer.value;
            if (!el) return;
            showLeftScroll.value = el.scrollLeft > 1;
            showRightScroll.value = el.scrollWidth - el.clientWidth - el.scrollLeft > 1; // 修复右侧按钮判断
        };

        // 处理滚动事件，触发滚动按钮检查和滚动结束逻辑
        const handleScroll = () => {
            checkScrollButtons();
            onScrollEnd(); // 调用防抖函数
        };

        // 向左滚动，完成后更新编辑器焦点
        const scrollLeft = () => {
            const container = previewScrollContainer.value;
            if (!container) return;
            
            const cards = getAllCardElements();
            // 使用 findCurrentCardIndex 找到的是 store 索引 (null/0/1...)
            // 需要转换回 getAllCardElements 的数组索引 (0/1/2...)
            const currentStoreIndex = findCurrentCardIndex(); 
            let currentArrayIndex = -1;
            if (currentStoreIndex === null) { // 封面
                currentArrayIndex = 0;
            } else if (currentStoreIndex !== null && currentStoreIndex >= 0) { // 内容卡片
                currentArrayIndex = currentStoreIndex + 1;
            }
            
            const targetArrayIndex = currentArrayIndex - 1;

            if (targetArrayIndex >= 0 && targetArrayIndex < cards.length) {
                const targetElement = cards[targetArrayIndex];
                if (targetElement) {
                    const containerWidth = container.clientWidth;
                    const targetOffsetLeft = targetElement.offsetLeft;
                    const targetWidth = targetElement.clientWidth;
                    // 计算目标滚动位置，使目标元素居中
                    const targetScrollLeft = targetOffsetLeft + targetWidth / 2 - containerWidth / 2;
                    
                    container.scrollTo({
                        left: Math.max(0, targetScrollLeft), // 确保不小于0
                        behavior: 'smooth'
                    });
                    // 滚动结束后由 handleScroll -> onScrollEnd 触发编辑器焦点更新
                    store.resetFocus(); // 立即重置预览区焦点请求
                }
            }
        };

        // 向右滚动，完成后更新编辑器焦点
        const scrollRight = () => {
            const container = previewScrollContainer.value;
            if (!container) return;
            
            const cards = getAllCardElements();
            const currentStoreIndex = findCurrentCardIndex();
            let currentArrayIndex = -1;
            if (currentStoreIndex === null) {
                currentArrayIndex = 0;
            } else if (currentStoreIndex !== null && currentStoreIndex >= 0) {
                currentArrayIndex = currentStoreIndex + 1;
            }

            const targetArrayIndex = currentArrayIndex + 1;

            if (targetArrayIndex >= 0 && targetArrayIndex < cards.length) {
                const targetElement = cards[targetArrayIndex];
                if (targetElement) {
                    const containerWidth = container.clientWidth;
                    const targetOffsetLeft = targetElement.offsetLeft;
                    const targetWidth = targetElement.clientWidth;
                    // 计算目标滚动位置，使目标元素居中
                    const targetScrollLeft = targetOffsetLeft + targetWidth / 2 - containerWidth / 2;
                    
                    container.scrollTo({
                         // 确保不超过最大滚动距离
                        left: Math.min(container.scrollWidth - containerWidth, targetScrollLeft),
                        behavior: 'smooth'
                    });
                    store.resetFocus(); // 立即重置预览区焦点请求
                }
            }
        };

        onMounted(() => {
            nextTick(() => {
                checkScrollButtons();
                 // 初始调整主文案 textarea 高度
                if (mainTextareaRef.value) {
                    adjustSingleTextarea(mainTextareaRef.value);
                }
            });
            window.addEventListener('resize', checkScrollButtons);
        });

        onUpdated(() => {
             nextTick(checkScrollButtons); 
        });
        
        // 监听内容卡片数量变化，更新滚动按钮状态
        watch(() => store.cardContent?.contentCards?.length, () => {
            nextTick(checkScrollButtons);
        });

        onUnmounted(() => {
          window.removeEventListener('resize', checkScrollButtons);
        });

        const _getExportableCardElement = (containerElement) => {
            if (!containerElement) {
                console.warn('尝试获取卡片元素但容器元素不存在');
                return null;
            }
            // 修改查找逻辑以使用 data-exportable-card 属性
            let actualCard = containerElement.querySelector('[data-exportable-card="true"]');
            
            if (!actualCard) {
                 console.error('在容器元素内找不到具有 [data-exportable-card="true"] 属性的可导出卡片元素。', containerElement);
            }

            return actualCard;
        };

        const exportSingleCard = async (cardElementRefOrActualElement, rawFileName) => {
            const cardElement = cardElementRefOrActualElement?.$el || cardElementRefOrActualElement;
            if (!store.currentTopicId) { // 使用 store.currentTopicId
                toast.error('无法获取主题ID，无法导出。');
                return;
            }
            const finalFileName = rawFileName;
            try {
                const format = selectedFormat.value;
                const actualCardToExport = _getExportableCardElement(cardElement);
                if (!actualCardToExport) {
                    throw new Error("找不到可导出的卡片元素");
                }
                await exportCardAsImage(actualCardToExport, finalFileName, format);
                toast.success(`成功导出 ${finalFileName}.${format}`);
            } catch (error) {
                console.error('导出失败:', error);
                toast.error('导出失败: ' + error.message);
            }
        };

        const _getAllExportableElements = () => {
            const elements = [];
            const coverCardContainerElement = coverCardContainer.value; // 直接用 ref.value
            const coverCardElement = _getExportableCardElement(coverCardContainerElement);
            if (coverCardElement) {
                elements.push({ element: coverCardElement, type: 'cover', index: -1 });
            } else {
                 console.warn('无法为封面卡片找到可导出元素。', coverCardContainerElement);
            }

            store.cardContent?.contentCards?.forEach((_, index) => { // 使用 store 数据迭代
                const contentCardContainerElement = contentCardRefs.value[index]; 
                const contentCardElement = _getExportableCardElement(contentCardContainerElement);
                if (contentCardElement) {
                    elements.push({ element: contentCardElement, type: 'content', index: index });
                } else {
                    console.warn(`无法为索引 ${index} 的内容卡片找到可导出元素。`, contentCardContainerElement);
                }
            });
             console.log("All exportable elements found:", elements.length, elements);
            return elements;
        };

        const exportAllAsImages = async () => {
            if (!store.currentTopicId) { // 使用 store.currentTopicId
                toast.error('无法获取主题ID，无法导出。');
                return;
            }
            const elementsToExport = _getAllExportableElements();
            if (elementsToExport.length === 0) {
                toast.warning("没有可导出的卡片。");
                return;
            }
            const format = selectedFormat.value;
            const loadingToastId = toast.info(`正在导出 ${elementsToExport.length} 张图片 (${format.toUpperCase()})...`, { timeout: false });
            const dateString = getFormattedDate();
            try {
                await exportCardsAsImages(elementsToExport, store.currentTopicId, dateString, format);
                toast.dismiss(loadingToastId);
                toast.success('所有图片导出完成！');
            } catch(error) {
                console.error('批量导出图片失败:', error);
                toast.dismiss(loadingToastId);
                toast.error('批量导出图片失败: ' + error.message);
            }
        };

        const exportAllAsZip = async () => {
             if (!store.currentTopicId) { // 使用 store.currentTopicId
                toast.error('无法获取主题ID，无法导出。');
                return;
            }
            const elementsToExport = _getAllExportableElements();
            if (elementsToExport.length === 0) {
                toast.warning("没有可导出的卡片。");
                return;
            }
            const format = selectedFormat.value;
            const loadingToastId = toast.info(`正在生成 ${elementsToExport.length} 张图片 (${format.toUpperCase()}) 并打包...`, { timeout: false });
            const dateString = getFormattedDate();
            try {
                const zipFileName = `${store.currentTopicId}_${dateString}.zip`;
                await exportCardsAsZip(elementsToExport, store.currentTopicId, dateString, format);
                toast.dismiss(loadingToastId);
                toast.success(`打包文件 ${zipFileName} 已开始下载！`);
            } catch(error) {
                console.error('打包下载失败:', error);
                toast.dismiss(loadingToastId);
                toast.error('打包下载失败: ' + error.message);
            }
        };

        const copyMainText = async () => {
            try {
                const result = await copyTextToClipboard(store.cardContent?.mainText || ''); // 使用 store.cardContent.mainText
                if (result.success) {
                    toast.success('主文案已复制到剪贴板！');
                } else {
                    toast.error(result.message);
                }
            } catch (error) {
                console.error('复制主文案时出错:', error);
                toast.error('复制失败: ' + error.message);
            }
        };

        return {
            store,
            activeTemplateComponent,
            previewScrollContainer,
            coverCardContainer,
            coverCard,
            contentCardRefs,
            handleScroll,
            scrollLeft,
            scrollRight,
            showLeftScroll,
            showRightScroll,
            mainTextModel,
            handleTextareaInput,
            cardPreviewRoot,
            mainTextareaRef,
            toast,
            selectedFormat,
            exportSingleCard,
            exportAllAsImages,
            exportAllAsZip,
            copyMainText,
            getFormattedDate
        };
    },
}
</script>

<style scoped>
.card-container {
    position: relative;
}

.preview-container-wrapper {
    position: relative;
}

.preview-container-wrapper button[class*="absolute"] {
    opacity: 0.6;
}
.preview-container-wrapper button[class*="absolute"]:hover {
    opacity: 0.9;
}

.scroll-smooth {
  scroll-behavior: smooth;
}

.dynamic-textarea {
    resize: none;
    overflow-y: hidden;
}
.hide-scrollbar::-webkit-scrollbar {
    display: none;
}
.hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>