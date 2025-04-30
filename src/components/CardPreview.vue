<template>
    <div class="card-preview" ref="cardPreviewRoot">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">卡片预览</h2>
            <div class="flex gap-2 items-center">
                <!-- 导出进度显示 (从 exporter 获取) -->
                <div v-if="exporter.isExporting.value" class="text-sm text-gray-600">
                    正在导出 {{ exporter.exportProgress.value.type }}... ({{ exporter.exportProgress.value.current }} / {{ exporter.exportProgress.value.total }})
                    <span class="ml-1 spinner"></span>
                </div>
                <div class="flex items-center">
                    <label for="format-select" class="mr-1 text-sm text-gray-600">格式:</label>
                    <select id="format-select" v-model="selectedFormat" :disabled="exporter.isExporting.value" class="h-8 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50">
                        <option value="jpg">JPG</option>
                        <option value="png">PNG</option>
                    </select>
                </div>
                <!-- 使用 exporter 的方法和状态 -->
                <button @click="exporter.exportAllAsImages" :disabled="exporter.isExporting.value" class="px-4 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ exporter.isExporting.value && exporter.exportProgress.value.type === 'images' ? '导出中...' : '全部导出' }}
                </button>
                <button @click="exporter.exportAllAsZip" :disabled="exporter.isExporting.value" class="px-4 py-1 bg-xhs-pink text-white rounded-lg text-sm hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {{ exporter.isExporting.value && exporter.exportProgress.value.type === 'zip' ? '打包中...' : '打包下载' }}
                </button>
            </div>
        </div>

        <!-- 添加相对定位的容器 -->
        <div v-if="store.isLoadingContent" class="flex justify-center items-center h-96 bg-gray-50 border border-gray-200 rounded-lg">
            <div class="text-gray-500">
                 <span class="spinner mr-2"></span>正在加载最新内容...
            </div>
        </div>
        <div v-else-if="store.cardContent && store.cardContent.coverCard" class="relative preview-container-wrapper">
            <div ref="previewScrollContainer" @scroll="handleScroll" class="flex overflow-x-auto scroll-smooth gap-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <!-- 封面卡片 -->
                <div class="card-container flex-shrink-0" ref="coverCardContainer">
                    <div>
                        <component :is="activeTemplateComponent" type="cover"
                            :cardData="store.cardContent.coverCard" 
                            :headerText="store.cardContent.headerText || ''"
                            :footerText="store.cardContent.footerText || ''"
                            :isHeaderVisible="store.cardContent.coverCard.showHeader !== false"
                            :isFooterVisible="store.cardContent.coverCard.showFooter !== false"/>
                    </div>
                    <div class="mt-2 text-center text-sm text-xhs-gray">
                        封面卡片
                        <!-- 使用 exporter 的方法, 传递标识符和 Ref -->
                        <button @click="exporter.exportSingleCard({ type: 'cover' }, coverCardContainer)"
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
                         <!-- 使用 exporter 的方法, 传递标识符和 Ref -->
                        <button @click="exporter.exportSingleCard({ type: 'content', index: index }, contentCardRefs[index])"
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

        <!-- 主文案编辑区 -->
        <div v-if="store.isLoadingContent" class="mt-6">
             <div class="text-center text-gray-400 text-sm">主文案加载中...</div>
        </div>
        <div v-else-if="store.cardContent" class="mt-6">
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
import { computed, ref, watch, onBeforeUpdate, nextTick, onMounted } from 'vue';
// 导入 store
import { useCardStore } from '../stores/cardStore'; 
// 移除 cardExportUtils 直接导入
// import cardExportUtils from '../utils/cardExport'; 
import { useToast } from "vue-toastification";

// 导入新的模板加载器
import { useTemplateLoader } from '../composables/useTemplateLoader';
// 导入文本域自动高度 hook
import { useTextareaAutoHeight } from '../composables/useTextareaAutoHeight';
// 导入滚动逻辑 composable
import { useCardPreviewScroll } from '../composables/useCardPreviewScroll'; 
// 导入新的异步任务处理器
import { handleAsyncTask } from '../utils/asyncHandler'; 
// 导入新的导出 Composable
import { useCardExporter } from '../composables/useCardExporter';

export default {
    name: 'CardPreview',
    setup() {
        const store = useCardStore();
        const { getAsyncTemplateComponent } = useTemplateLoader();
        const cardPreviewRoot = ref(null);
        const mainTextareaRef = ref(null);
        const { adjustSingleTextarea } = useTextareaAutoHeight(cardPreviewRoot);
        const toast = useToast();
        const selectedFormat = ref('jpg');

        const activeTemplateComponent = computed(() => {
            return getAsyncTemplateComponent(store.selectedTemplate); 
        });

        // Refs for Scroll & Export Composables
        const coverCardContainer = ref(null); 
        const contentCardRefs = ref([]); 

        // --- 使用滚动逻辑 Composable --- 
        const { 
            previewScrollContainer, 
            showLeftScroll, 
            showRightScroll, 
            scrollLeft, 
            scrollRight, 
            handleScroll 
        } = useCardPreviewScroll(store, coverCardContainer, contentCardRefs);

        // --- 使用导出逻辑 Composable --- 
        const exporter = useCardExporter(store, coverCardContainer, contentCardRefs, selectedFormat);

        // --- 主文案相关 --- 
        const mainTextModel = computed({
            get: () => store.cardContent?.mainText || '',
            set: (newValue) => {
                store.updateMainText(newValue);
            }
        });

        const handleTextareaInput = (event) => {
            adjustSingleTextarea(event.target);
        };

        // --- 生命周期钩子 --- 
        onBeforeUpdate(() => {
            contentCardRefs.value = [];
        });

        watch(() => store.cardContent?.mainText, () => {
            nextTick(() => {
                if (mainTextareaRef.value) {
                    adjustSingleTextarea(mainTextareaRef.value);
                }
            });
        });

        onMounted(() => {
            nextTick(() => {
                if (mainTextareaRef.value) {
                    adjustSingleTextarea(mainTextareaRef.value);
                }
            });
        });
        
        // --- 复制主文案 (保留在组件内，因为它与导出卡片关系不大) --- 
        const copyMainText = async () => {
            const result = await handleAsyncTask(async () => {
                // 确保导入了 copyTextToClipboard，或者直接使用 navigator.clipboard
                 await navigator.clipboard.writeText(store.cardContent?.mainText || '');
            }, {
                errorMessagePrefix: "复制主文案失败"
            });
            
            if (result.success) {
                toast.success('主文案已复制到剪贴板！');
            } else if (result.error) {
                 toast.error(result.error.message);
            }
        };

        // --- 返回给模板的值 --- 
        return {
            store,
            activeTemplateComponent,
            
            // Scroll Composable
            previewScrollContainer,
            showLeftScroll,
            showRightScroll,
            handleScroll,
            scrollLeft,
            scrollRight,
            
            // Refs
            coverCardContainer,
            contentCardRefs,
            mainTextareaRef,
            cardPreviewRoot,
            
            // State & Models
            selectedFormat,
            mainTextModel,
            
            // Exporter Composable (暴露整个对象或解构的值)
            exporter, 
            
            // Methods
            handleTextareaInput,
            copyMainText,
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

/* 简单加载动画 */
.spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #3498db; /* 蓝色 */
  animation: spin 1s ease-infinite;
  vertical-align: middle;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>