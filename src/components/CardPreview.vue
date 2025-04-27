<template>
    <div class="card-preview">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">卡片预览</h2>
            <div class="flex gap-2">
                <button @click="exportAllAsImages" class="px-4 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">导出所有图片</button>
                <button @click="exportAllAsZip" class="px-4 py-1 bg-xhs-pink text-white rounded-lg text-sm hover:bg-opacity-90 transition-colors">打包下载 (ZIP)</button>
            </div>
        </div>

        <!-- 添加相对定位的容器 -->
        <div class="relative preview-container-wrapper">
            <div ref="previewScrollContainer" @scroll="handleScroll" class="flex overflow-x-auto scroll-smooth gap-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <!-- 封面卡片 -->
                <div class="card-container flex-shrink-0" ref="coverCardContainer">
                    <div ref="coverCard">
                        <component :is="activeTemplateComponent" type="cover"
                            :cardData="content.coverCard" 
                            :headerText="content.headerText || ''"
                            :footerText="content.footerText || ''"
                            :isHeaderVisible="content.coverCard.showHeader !== false"
                            :isFooterVisible="content.coverCard.showFooter !== false"/>
                    </div>
                    <div class="mt-2 text-center text-sm text-xhs-gray">
                        封面卡片
                        <button @click="exportSingleCard($refs.coverCard, `${topicId}_封面_${getFormattedDate()}`)"
                            class="ml-2 text-xs text-xhs-pink border border-xhs-pink bg-pink-100 px-2 py-0.5 rounded hover:bg-pink-200 transition-colors">
                            导出
                        </button>
                    </div>
                </div>

                <!-- 内容卡片 -->
                <div v-for="(card, index) in content.contentCards" :key="index" class="card-container flex-shrink-0" :ref="el => { if (el) contentCardRefs[index] = el }">
                    <div>
                        <component :is="activeTemplateComponent" type="content"
                             :cardData="card" 
                             :headerText="content.headerText || ''"
                             :footerText="content.footerText || ''"
                             :isHeaderVisible="card.showHeader !== false"
                             :isFooterVisible="card.showFooter !== false"/>
                    </div>
                    <div class="mt-2 text-center text-sm text-xhs-gray">
                        内容卡片 {{ index + 1 }}
                        <button @click="exportSingleCard(contentCardRefs[index], `${topicId}_内容${String(index + 1).padStart(2, '0')}_${getFormattedDate()}`)"
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

        <div class="mt-6">
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
import { exportCardAsImage, exportCardsAsImages, exportCardsAsZip, copyTextToClipboard } from '../utils/cardExport';
// 导入 vue-toastification
import { useToast } from "vue-toastification";

// 导入新的模板加载器
import { useTemplateLoader } from '../composables/useTemplateLoader';
// 导入文本域自动高度 hook
import { useTextareaAutoHeight } from '../composables/useTextareaAutoHeight';

export default {
    name: 'CardPreview',
    props: {
        template: {
            type: String,
            required: true
        },
        content: {
            type: Object,
            required: true
        },
        topicId: {
            type: String,
            required: true
        },
        focusedPreviewIndex: {
            type: Number,
            default: null
        }
    },
    emits: ['reset-focus', 'preview-scrolled-to-index', 'update:mainText'],
    setup(props, { emit }) {
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

        // 修改 activeTemplateComponent 计算属性以使用加载器
        const activeTemplateComponent = computed(() => {
            return getAsyncTemplateComponent(props.template); // 直接调用加载器
        });

        const previewScrollContainer = ref(null);
        const coverCardContainer = ref(null);
        const contentCardRefs = ref([]);
        const showLeftScroll = ref(false);
        const showRightScroll = ref(false);

        // 计算属性用于 v-model 绑定主文案
        const mainTextModel = computed({
            get: () => props.content.mainText || '',
            set: (newValue) => {
                emit('update:mainText', newValue);
            }
        });

        // 处理文本域输入事件以调整高度
        const handleTextareaInput = (event) => {
            adjustSingleTextarea(event.target);
            // v-model 已经通过 computed setter 触发了事件，这里只需调整高度
        };

        onBeforeUpdate(() => {
            contentCardRefs.value = [];
        });

        // 监听主文案内容变化，调整高度
        watch(() => props.content.mainText, (newText) => {
            nextTick(() => {
                if (mainTextareaRef.value) {
                    adjustSingleTextarea(mainTextareaRef.value);
                }
            });
        }, { immediate: false }); // 不立即执行，等待挂载后调整

        watch(() => props.focusedPreviewIndex, (newIndex) => {
            if (newIndex !== null && newIndex >= 0) {
                nextTick(() => {
                     const targetElement = contentCardRefs.value[newIndex];
                     if (targetElement && previewScrollContainer.value) {
                         console.log(`Scrolling preview to card index: ${newIndex}`, targetElement);
                         targetElement.scrollIntoView({
                             behavior: 'smooth',
                             block: 'nearest',
                             inline: 'center'
                         });
                     } else {
                         console.warn(`Could not find preview card element for index: ${newIndex}`);
                     }
                });
            }
        });

        const getAllCardElements = () => {
            const cover = coverCardContainer.value;
            const contents = contentCardRefs.value || [];
            const elements = [];
            if (cover) elements.push(cover);
            elements.push(...contents.filter(el => el));
            return elements;
        };

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
                    minIndex = index;
                }
            });
            return minIndex;
        };

        const checkScrollButtons = () => {
            const el = previewScrollContainer.value;
            if (!el) return;
            showLeftScroll.value = el.scrollLeft > 1;
            showRightScroll.value = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
        };

        const handleScroll = () => {
            checkScrollButtons();
        };

        const scrollLeft = () => {
            const cards = getAllCardElements();
            const currentIndex = findCurrentCardIndex();
            const targetIndex = currentIndex - 1;

            if (targetIndex >= 0 && targetIndex < cards.length) {
                const targetElement = cards[targetIndex];
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    });
                    const emitIndex = targetIndex === 0 ? null : targetIndex - 1;
                    emit('preview-scrolled-to-index', emitIndex);
                    emit('reset-focus');
                }
            }
        };

        const scrollRight = () => {
            const cards = getAllCardElements();
            const currentIndex = findCurrentCardIndex();
            const targetIndex = currentIndex + 1;

            if (targetIndex >= 0 && targetIndex < cards.length) {
                const targetElement = cards[targetIndex];
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'nearest',
                        inline: 'center'
                    });
                    const emitIndex = targetIndex === 0 ? null : targetIndex - 1;
                    emit('preview-scrolled-to-index', emitIndex);
                    emit('reset-focus');
                }
            }
        };

        onMounted(() => {
            nextTick(checkScrollButtons);
            window.addEventListener('resize', checkScrollButtons);
            // 初始调整主文案 textarea 高度
            nextTick(() => {
                // 使用 ref 进行初始调整
                if (mainTextareaRef.value) {
                    adjustSingleTextarea(mainTextareaRef.value);
                }
            });
        });
        onUpdated(() => {
             nextTick(checkScrollButtons);
        });
        watch(() => props.content.contentCards.length, () => {
            nextTick(checkScrollButtons);
        });

        onUnmounted(() => {
          window.removeEventListener('resize', checkScrollButtons);
        });

        return {
            activeTemplateComponent,
            previewScrollContainer,
            coverCardContainer,
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
            contentCardRefs
        };
    },
    methods: {
        getFormattedDate() {
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            return `${year}${month}${day}`;
        },

        _getExportableCardElement(containerElement) {
            if (!containerElement) {
                console.warn('尝试获取卡片元素但容器元素不存在');
                return null;
            }
            // 修改查找逻辑以适应模板名称的变化或依赖模板根元素的类
            // 查找根元素，而不是特定的模板类
            // 假设所有模板的根元素都有 'card' 或 'xhs-card' 或类似标识
            let actualCard = containerElement.querySelector('.card') || containerElement.querySelector('.xhs-card');
            
            // 如果模板没有通用类，可能需要更复杂的选择器，或者依赖于模板内部结构
            // 备选方案：查找第一个直接子元素？ containerElement.children[0]
            // 警告：这种方式非常脆弱，强烈建议所有模板根元素有共同的类
            if (!actualCard) {
                 console.warn('在容器元素内找不到具有 .card 或 .xhs-card 类的可导出卡片元素', containerElement);
                 // 尝试回退到查找第一个子元素
                 actualCard = containerElement.children?.[0]; 
                  if (actualCard) {
                      console.warn('回退到使用第一个子元素进行导出，请确保模板结构稳定。');
                  } else {
                      console.error('无法定位到任何可导出的元素。');
                  }
            }
            return actualCard;
        },

        async exportSingleCard(cardElementRefOrActualElement, fileName) {
            // 确定是 ref 还是直接的元素
            const cardElement = cardElementRefOrActualElement && cardElementRefOrActualElement.$el 
                                ? cardElementRefOrActualElement.$el // 如果是 Vue 组件实例 Ref
                                : cardElementRefOrActualElement;    // 如果是 DOM 元素 Ref 或直接元素
            
            if (!this.topicId) {
                this.toast.error('无法获取主题ID，无法导出。');
                return;
            }
            try {
                const actualCardToExport = this._getExportableCardElement(cardElement);
                if (!actualCardToExport) {
                    throw new Error("找不到可导出的卡片元素");
                }
                await exportCardAsImage(actualCardToExport, fileName);
                this.toast.success(`成功导出 ${fileName}.png`);
            } catch (error) {                console.error('导出失败:', error);
                this.toast.error('导出失败: ' + error.message);
            }
        },

        _getAllExportableElements() {
            const elements = [];
            const coverCardContainer = this.$refs.coverCardContainer;
            const coverCardElement = this._getExportableCardElement(coverCardContainer);
            if (coverCardElement) {
                elements.push({ element: coverCardElement, type: 'cover', index: -1 });
            } else {
                 console.warn('无法为封面卡片找到可导出元素。', coverCardContainer);
            }

            this.content.contentCards.forEach((_, index) => {
                // 通过 this.contentCardRefs 访问 setup 返回的 ref
                const contentCardContainer = this.contentCardRefs[index]; 
                const contentCardElement = this._getExportableCardElement(contentCardContainer);
                if (contentCardElement) {
                    elements.push({ element: contentCardElement, type: 'content', index: index });
                } else {
                    console.warn(`无法为索引 ${index} 的内容卡片找到可导出元素。`, contentCardContainer);
                }
            });
             console.log("All exportable elements found:", elements.length, elements);
            return elements;
        },

        async exportAllAsImages() {
            if (!this.topicId) {
                this.toast.error('无法获取主题ID，无法导出。');
                return;
            }
            const elementsToExport = this._getAllExportableElements();
            if (elementsToExport.length === 0) {
                this.toast.warning("没有可导出的卡片。");
                return;
            }
            console.log(`准备导出 ${elementsToExport.length} 张图片...`);

            // 新增：显示加载提示
            const loadingToastId = this.toast.info(`正在导出 ${elementsToExport.length} 张图片，请稍候...`, {
                timeout: false // 不自动关闭
            });

            try {
                await exportCardsAsImages(elementsToExport, this.topicId, this.getFormattedDate());
                // 修改：先关闭加载提示，再显示成功提示
                this.toast.dismiss(loadingToastId);
                this.toast.success('所有图片导出完成！');
            } catch(error) {
                console.error('批量导出图片失败:', error);
                // 修改：先关闭加载提示，再显示错误提示
                this.toast.dismiss(loadingToastId);
                this.toast.error('批量导出图片失败: ' + error.message);
            }
        },

        async exportAllAsZip() {
            if (!this.topicId) {
                this.toast.error('无法获取主题ID，无法导出。');
                return;
            }
            const elementsToExport = this._getAllExportableElements();
            if (elementsToExport.length === 0) {
                this.toast.warning("没有可导出的卡片。");
                return;
            }
            console.log(`准备打包 ${elementsToExport.length} 张图片...`);

            // 新增：显示加载提示
            const loadingToastId = this.toast.info(`正在生成 ${elementsToExport.length} 张图片并打包，请稍候...`, {
                timeout: false // 不自动关闭
            });

            try {
                const zipFileName = `${this.topicId}_${this.getFormattedDate()}.zip`;
                await exportCardsAsZip(elementsToExport, this.topicId, this.getFormattedDate());
                // 修改：先关闭加载提示，再显示成功提示
                this.toast.dismiss(loadingToastId);
                this.toast.success(`打包文件 ${zipFileName} 已开始下载！`);
            } catch(error) {
                console.error('打包下载失败:', error);
                // 修改：先关闭加载提示，再显示错误提示
                this.toast.dismiss(loadingToastId);
                this.toast.error('打包下载失败: ' + error.message);
            }
        },

        async copyMainText() {
            try {
                const result = await copyTextToClipboard(this.content.mainText || '');
                if (result.success) {
                    this.toast.success('主文案已复制到剪贴板！');
                } else {
                    this.toast.error(result.message);
                }
            } catch (error) {
                console.error('复制主文案时出错:', error);
                this.toast.error('复制失败: ' + error.message);
            }
        }
    }
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