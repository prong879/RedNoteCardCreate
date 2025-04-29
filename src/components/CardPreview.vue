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
                        <button @click="exportSingleCard(coverCardContainer, `${store.currentTopicId}_封面_${getFormattedDate()}`)"
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
import { exportCardAsImage, exportCardsAsImages, exportCardsAsZip, copyTextToClipboard, getFormattedDate } from '../utils/cardExport';
// 导入 vue-toastification
import { useToast } from "vue-toastification";

// 导入新的模板加载器
import { useTemplateLoader } from '../composables/useTemplateLoader';
// 导入文本域自动高度 hook
import { useTextareaAutoHeight } from '../composables/useTextareaAutoHeight';
// 导入滚动逻辑 composable
import { useCardPreviewScroll } from '../composables/useCardPreviewScroll'; 
// 导入新的异步任务处理器
import { handleAsyncTask } from '../utils/asyncHandler'; 

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
        const toast = useToast(); // 在 setup 中获取 toast 实例
        const selectedFormat = ref('jpg');

        // 计算属性，依赖 store.selectedTemplate
        const activeTemplateComponent = computed(() => {
            return getAsyncTemplateComponent(store.selectedTemplate); 
        });

        // --- Refs for Scroll Composable --- 
        const coverCardContainer = ref(null); // 传递给 composable
        const coverCard = ref(null); // 用于导出
        const contentCardRefs = ref([]); // 传递给 composable，并在 v-for 中维护

        // --- 使用滚动逻辑 Composable ---
        const {
            previewScrollContainer, // 从 composable 获取，用于模板绑定
            showLeftScroll,         // 从 composable 获取
            showRightScroll,        // 从 composable 获取
            scrollLeft,             // 从 composable 获取
            scrollRight,            // 从 composable 获取
            handleScroll            // 从 composable 获取
        } = useCardPreviewScroll(store, coverCardContainer, contentCardRefs);

        // --- 其他逻辑 (保持不变) ---

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
            // 清空 contentCardRefs 数组，准备在 v-for 中重新填充
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

        // --- 滚动/焦点相关逻辑 (已移除) ---
        // watch(() => store.focusedPreviewIndex, ...) // 移至 composable
        // const getAllCardElements = () => { ... }; // 移至 composable
        // const findCurrentCardIndex = () => { ... }; // 移至 composable
        // const debounce = (func, delay) => { ... }; // 移至 composable
        // const throttle = (func, limit) => { ... }; // 移至 composable
        // const onScrollEnd = debounce(() => { ... }); // 移至 composable
        // const checkScrollButtons = () => { ... }; // 移至 composable
        // const throttledCheckScrollButtons = throttle(checkScrollButtons, 150); // 移至 composable
        // const handleScroll = () => { ... }; // 移至 composable
        // const scrollLeft = () => { ... }; // 移至 composable
        // const scrollRight = () => { ... }; // 移至 composable
        // onMounted(() => { ... }); // 部分移至 composable
        // onUpdated(() => { ... }); // 部分移至 composable
        // watch(() => store.cardContent?.contentCards?.length, ...) // 移至 composable
        // onUnmounted(() => { ... }); // 部分移至 composable

         // --- 生命周期钩子 (仅保留非滚动相关部分) ---
        onMounted(() => {
            // 初始调整主文案 textarea 高度 (保留)
            nextTick(() => {
                if (mainTextareaRef.value) {
                    adjustSingleTextarea(mainTextareaRef.value);
                }
            });
        });
        
        // --- 导出相关逻辑 (重构) ---
        const _getExportableCardElement = (containerElement) => {
            if (!containerElement) {
                // console.warn('尝试获取卡片元素但容器元素不存在'); // handleAsyncTask 会处理错误，这里可以移除
                return null;
            }
            let actualCard = containerElement.querySelector('[data-exportable-card="true"]');
            if (!actualCard) {
                 // console.error(...) // 移除，让调用者处理错误
                 // 返回 null 或抛出错误，让 handleAsyncTask 捕获
                 throw new Error('在容器元素内找不到具有 [data-exportable-card="true"] 属性的可导出卡片元素。');
            }
            return actualCard;
        };

        const exportSingleCard = async (cardElementRefOrActualElement, rawFileName) => {
            const cardElement = cardElementRefOrActualElement?.$el || cardElementRefOrActualElement;
            if (!store.currentTopicId) {
                toast.error('无法获取主题ID，无法导出。'); 
                return;
            }
            const finalFileName = rawFileName;
            const format = selectedFormat.value;

            // 使用 handleAsyncTask 并处理结果
            const result = await handleAsyncTask(async () => {
                const actualCardToExport = _getExportableCardElement(cardElement);
                await exportCardAsImage(actualCardToExport, finalFileName, format);
            }, {
                errorMessagePrefix: "导出单张卡片失败"
            });

            // 根据结果显示 toast
            if (result.success) {
                toast.success(`成功导出 ${finalFileName}.${format}`);
            } else if (result.error) {
                // handleAsyncTask 内部已 console.error
                toast.error(`导出单张卡片失败: ${result.error.message}`);
            }
        };

        const _getAllExportableElements = () => {
            const elements = [];
            const cardSources = [
                { ref: coverCardContainer, type: 'cover', index: -1 },
                ...(store.cardContent?.contentCards?.map((_, index) => ({
                    ref: contentCardRefs.value[index],
                    type: 'content',
                    index: index
                })) || [])
            ];
            cardSources.forEach(source => {
                const containerElement = source.ref?.value || source.ref;
                if (containerElement) {
                    try {
                        const exportableElement = _getExportableCardElement(containerElement);
                         // 如果上面没有抛错，则添加到数组
                        elements.push({ element: exportableElement, type: source.type, index: source.index });
                    } catch (error) {
                         // 记录警告，但不阻止其他卡片被查找
                        console.warn(`无法为 ${source.type} 卡片 (索引 ${source.index}) 找到可导出元素: ${error.message}`);
                    }
                } else {
                     console.warn(`容器元素未找到，类型: ${source.type}, 索引: ${source.index}`);
                }
            });
            // console.log("All exportable elements found:", elements.length, elements); // 保持日志用于调试
            return elements;
        };

        const exportAllAsImages = async () => {
            if (!store.currentTopicId) {
                 toast.error('无法获取主题ID，无法导出。');
                return;
            }
            const elementsToExport = _getAllExportableElements();
            if (elementsToExport.length === 0) {
                 toast.warning("没有可导出的卡片。");
                return;
            }
            const format = selectedFormat.value;
            const dateString = getFormattedDate();
            const loadingMessage = `正在导出 ${elementsToExport.length} 张图片 (${format.toUpperCase()})...`;
            const loadingToastId = toast.info(loadingMessage, { timeout: false }); // 手动处理加载提示

            // 使用 handleAsyncTask
            const result = await handleAsyncTask(async () => {
                await exportCardsAsImages(elementsToExport, store.currentTopicId, dateString, format);
            }, {
                errorMessagePrefix: "批量导出图片失败"
            });

            toast.dismiss(loadingToastId); // 关闭加载提示
            if (result.success) {
                toast.success('所有图片导出完成！');
            } else if (result.error) {
                toast.error(`批量导出图片失败: ${result.error.message}`);
            }
        };

        const exportAllAsZip = async () => {
             if (!store.currentTopicId) {
                 toast.error('无法获取主题ID，无法导出。');
                return;
            }
            const elementsToExport = _getAllExportableElements();
            if (elementsToExport.length === 0) {
                 toast.warning("没有可导出的卡片。");
                return;
            }
            const format = selectedFormat.value;
            const dateString = getFormattedDate();
            const zipFileName = `${store.currentTopicId}_${dateString}.zip`;
            const loadingMessage = `正在生成 ${elementsToExport.length} 张图片 (${format.toUpperCase()}) 并打包...`;
            const loadingToastId = toast.info(loadingMessage, { timeout: false }); // 手动处理加载提示

            // 使用 handleAsyncTask
            const result = await handleAsyncTask(async () => {
                 await exportCardsAsZip(elementsToExport, store.currentTopicId, dateString, format);
             }, {
                 errorMessagePrefix: "打包下载失败"
             });

            toast.dismiss(loadingToastId); // 关闭加载提示
            if (result.success) {
                 toast.success(`打包文件 ${zipFileName} 已开始下载！`);
            } else if (result.error) {
                 toast.error(`打包下载失败: ${result.error.message}`);
            }
        };

        const copyMainText = async () => {
            // 使用 handleAsyncTask 并处理结果
            const result = await handleAsyncTask(async () => {
                await copyTextToClipboard(store.cardContent?.mainText || '');
            }, {
                errorMessagePrefix: "复制主文案失败"
            });
            
            if (result.success) {
                toast.success('主文案已复制到剪贴板！');
            } else if (result.error) {
                 toast.error(result.error.message); // 错误消息已包含前缀
            }
        };

        // --- 返回给模板的值 ---
        return {
            store,
            activeTemplateComponent,
            
            // --- Scroll Composable 返回值 ---
            previewScrollContainer,
            showLeftScroll,
            showRightScroll,
            handleScroll,
            scrollLeft,
            scrollRight,
            
            // --- 传递给 Scroll Composable 的 Refs ---
            coverCardContainer,
            contentCardRefs,

            // --- 其他 Refs 和方法 ---
            coverCard, // 用于导出
            mainTextModel,
            handleTextareaInput,
            cardPreviewRoot,
            mainTextareaRef,
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