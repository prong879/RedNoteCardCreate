<template>
    <div ref="cardConfigRoot" class="card-config flex flex-col h-full">
        <!-- 顶部区域: 包含标题和返回按钮 -->
        <div class="flex-shrink-0 px-6 pt-6">
            <div class="flex justify-between items-center mb-4">
                 <h2 class="text-xl font-semibold">卡片配置</h2>
                 <button @click="store.returnToTopicSelection" class="px-4 py-1 border border-xhs-gray text-xhs-gray rounded-lg text-sm hover:border-xhs-pink hover:text-xhs-pink transition-colors bg-white">← 返回选择主题</button>
            </div>
        </div>

        <!-- 卡片编辑区标题和下载按钮容器 -->
        <div class="flex justify-between items-center mb-2 px-6">
            <h3 class="text-lg font-medium">卡片编辑区</h3>
            <!-- 操作按钮组 -->
            <div class="flex gap-2">
              <!-- 本地保存按钮 (仅开发环境) -->
              <button v-if="isDevMode" @click="saveLocally" class="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors" title="仅开发环境：直接保存到本地 JS 文件">保存到本地</button>
              <!-- 修改按钮文本 -->
              <button @click="generateJsFile" class="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">备份下载</button>
            </div>
        </div>

        <!-- 卡片编辑滚动区 -->
        <div ref="editorScrollContainer" class="overflow-y-auto px-3 mx-6 h-96 custom-scrollbar bg-gray-50 border rounded-lg mb-6">
            <!-- 加载状态 -->
            <div v-if="store.isLoadingContent" class="flex justify-center items-center h-full">
                 <div class="text-gray-500">
                     <span class="spinner mr-2"></span>正在加载最新内容...
                 </div>
            </div>
            <!-- 实际内容 -->
            <div v-else-if="store.cardContent && store.cardContent.coverCard" class="pt-3">
                <!-- 封面卡片配置 -->
                <div ref="coverCardConfigSection" class="p-3 mb-4 border bg-white rounded-lg space-y-2 shadow-xl">
                    <!-- 封面卡片顶部操作栏 -->
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium">封面卡片</span>
                        <!-- 页眉/页脚显隐切换按钮 -->
                        <div class="flex items-center space-x-1 md:space-x-2">
                             <button @click="store.setFocusedPreview(-1)" title="定位预览" class="h-6 flex items-center justify-center text-xs px-2 rounded border border-blue-500 text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors">
                                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                     <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                     <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                 </svg>
                             </button>
                             <button @click="store.toggleCardVisibility({ cardType: 'coverCard', field: 'showHeader' })" :class="getButtonClass(store.cardContent.coverCard.showHeader)" class="text-xs px-2 py-0.5 rounded transition-colors"> {{ store.cardContent.coverCard.showHeader ? '隐藏页眉' : '显示页眉' }} </button>
                             <button @click="store.toggleCardVisibility({ cardType: 'coverCard', field: 'showFooter' })" :class="getButtonClass(store.cardContent.coverCard.showFooter)" class="text-xs px-2 py-0.5 rounded transition-colors"> {{ store.cardContent.coverCard.showFooter ? '隐藏页脚' : '显示页脚' }} </button>
                        </div>
                    </div>
                    <!-- 封面标题和副标题编辑 -->
                    <textarea v-model="store.cardContent.coverCard.title" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="输入封面标题" rows="1"></textarea>
                    <textarea v-model="store.cardContent.coverCard.subtitle" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar" placeholder="输入副标题" rows="2"></textarea>
                </div>

                <!-- 新增：在第一个卡片前添加插入点 -->
                <div class="insert-point h-5 flex items-center justify-center my-2">
                    <button @click="store.addContentCard(0)" class="w-full h-full border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-xhs-pink hover:text-xhs-pink flex items-center justify-center text-sm bg-white bg-opacity-70 backdrop-blur-sm opacity-0 hover:opacity-100 transition-all duration-200 ease-in-out">
                        + 新卡片
                    </button>
                </div>

                <!-- 内容卡片配置 (使用 vuedraggable 实现拖拽排序) -->
                <draggable 
                    v-model="store.cardContent.contentCards" 
                    item-key="index" 
                    tag="div" 
                    handle=".drag-handle" 
                    ghost-class="ghost-card"
                    @end="onDragEnd"
                    :options="dragOptions"
                >
                    <template #item="{element: card, index}">
                        <div class="card-item-group group">
                            <!-- 单个卡片编辑区域 -->
                            <div 
                                :ref="el => { if (el) contentCardConfigSections[index] = el }" 
                                class="p-3 border bg-white rounded-lg space-y-2 shadow-xl relative z-10" 
                                :id="`config-card-${index}`"
                            >
                                <!-- 卡片顶部操作栏 -->
                                <div class="flex justify-between items-center mb-2">
                                    <div class="flex items-center">
                                        <!-- 拖拽句柄 -->
                                        <span class="drag-handle cursor-move mr-2 text-gray-400 hover:text-gray-600" title="拖拽排序">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                            </svg>
                                        </span>
                                        <span class="font-medium">卡片 {{ index + 1 }}</span>
                                    </div>
                                    <!-- 卡片操作按钮 -->
                                    <div class="flex items-center space-x-1 md:space-x-2">
                                         <button @click="store.setFocusedPreview(index)" title="定位预览" class="h-6 flex items-center justify-center text-xs px-2 rounded border border-blue-500 text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /> </svg> </button>
                                         <button @click="store.toggleCardVisibility({ cardType: 'contentCard', field: 'showHeader', index: index })" :class="getButtonClass(card.showHeader)" class="h-6 flex items-center justify-center text-xs px-2 rounded transition-colors"> {{ card.showHeader ? '隐藏页眉' : '显示页眉' }} </button>
                                         <button @click="store.toggleCardVisibility({ cardType: 'contentCard', field: 'showFooter', index: index })" :class="getButtonClass(card.showFooter)" class="h-6 flex items-center justify-center text-xs px-2 rounded transition-colors"> {{ card.showFooter ? '隐藏页脚' : '显示页脚' }} </button>
                                         <button @click="store.removeContentCard(index)" class="h-6 flex items-center justify-center text-red-500 text-xs border border-red-500 bg-red-100 px-2 rounded hover:bg-red-200 transition-colors" v-if="store.cardContent.contentCards.length > 1"> 删除 </button>
                                    </div>
                                </div>
                                <!-- 卡片标题和内容编辑 -->
                                <textarea v-model="card.title" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="卡片标题" rows="1"></textarea>
                                <textarea v-model="card.body" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg" placeholder="卡片内容 (支持 Markdown 格式)" rows="6"></textarea>
                            </div>
                            <!-- 插入点按钮 (悬停时可见) -->
                            <div class="insert-point h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out my-2">
                                <button @click="store.addContentCard(index + 1)" class="w-full h-full border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-xhs-pink hover:text-xhs-pink flex items-center justify-center text-sm bg-white bg-opacity-70 backdrop-blur-sm">
                                    + 新卡片
                                </button>
                            </div>
                        </div>
                    </template>
                </draggable>
            </div>
            <div v-else class="p-6 text-center text-gray-500">
                 请先选择一个主题或等待内容加载...
            </div>
        </div>

        <!-- 模板选择区 -->
        <div class="px-6 mb-6">
             <h3 class="text-lg font-medium mb-2">选择模板</h3>
             <div class="grid grid-cols-3 gap-4 items-start max-h-60 overflow-y-auto pr-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                 <div v-for="(template, index) in templatesInfo" :key="template.id" @click="store.selectedTemplate = template.id" :ref="el => { if (el) templateItemRefs[index] = el }" class="template-item flex flex-col items-center p-1 border rounded-lg cursor-pointer transition-all" :class="{ 'border-xhs-pink border-2': store.selectedTemplate === template.id, 'border-gray-200': store.selectedTemplate !== template.id }">
                    <div :class="['preview-container', 'w-full', 'overflow-hidden', 'mb-1', 'bg-gray-50']">
                        <div :ref="el => { if (el) scalingDivRefs[index] = el }" style="transform-origin: top left; width: 320px;">
                            <component 
                                :is="asyncTemplateComponentsMap[template.id]" 
                                type="cover" 
                                :cardData="templatePreviewCoverContent" />
                        </div>
                    </div>
                    <span class="text-xs mt-auto">{{ template.name }}</span>
                </div>
             </div>
        </div>

        <!-- 底部固定区域: 全局设置和操作按钮 -->
        <div class="flex-grow overflow-y-auto px-6 pt-4 pb-6 border-t custom-scrollbar">
             <!-- 加载状态 -->
             <div v-if="store.isLoadingContent" class="text-center text-gray-400 text-sm">全局设置加载中...</div>
             <!-- 实际内容 -->
             <div v-else>
                 <!-- 新增：选题描述显示区 -->
                 <div v-if="store.cardContent" class="mb-6">
                      <h3 class="text-lg font-medium mb-2">话题简介（用于选题界面展示）</h3>
                      <textarea 
                        :value="store.cardContent.topicDescription" 
                        @input="handleDescriptionInput"
                        class="w-full p-3 border bg-white rounded-lg text-sm text-gray-700 dynamic-textarea hide-scrollbar" 
                        placeholder="输入话题简介..."
                        rows="3"
                      ></textarea>
                 </div>
                 <!-- 全局页眉/页脚配置 -->
                 <div v-if="store.cardContent" class="mb-6">
                      <h3 class="text-lg font-medium mb-2">全局页眉/页脚</h3>
                      <div class="p-3 border rounded-lg space-y-2">
                          <textarea v-model="store.cardContent.headerText" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页眉 (所有卡片生效)" rows="1"></textarea>
                          <textarea v-model="store.cardContent.footerText" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页脚 (所有卡片生效)" rows="1"></textarea>
                      </div>
                 </div>
             </div>
            <!-- 操作按钮 - Download button removed -->
             <div class="pt-4 border-t border-gray-200 flex gap-4">
                 <!-- Button removed from here 
                  <button @click="$emit('save-content')" class="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">生成 JS 文件供下载</button>
                  -->
                  <!-- If no buttons left, this div might be removable or need style adjustment -->
             </div>
        </div>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, onBeforeUpdate, computed } from 'vue';
import draggable from 'vuedraggable';
// 导入 store
import { useCardStore } from '../stores/cardStore'; 
// 移除 useCardManagement 导入
// import { useCardManagement } from '../composables/useCardManagement';
import { useTextareaAutoHeight } from '../composables/useTextareaAutoHeight';
import { useTemplatePreviewScaling } from '../composables/useTemplatePreviewScaling';
import { useToast } from 'vue-toastification';

export default {
    name: 'CardConfig',
    components: {
        draggable,
    },
    // 移除 props 定义
    // props: { ... },
    // 移除 emits 定义
    // emits: [ ... ],
    setup() { // 移除 props, { emit } 参数
        // 获取 store 实例
        const store = useCardStore();
        const toast = useToast();
        // 移除 showMarkdownManager 和 showCreateTopicModal 定义
        // const showMarkdownManager = ref(false);
        // const showCreateTopicModal = ref(false);

        // --- Refs --- 
        const cardConfigRoot = ref(null);           // 组件根元素引用
        const editorScrollContainer = ref(null);    // 编辑区滚动容器引用
        const coverCardConfigSection = ref(null); // 封面卡片配置区域引用
        const contentCardConfigSections = ref([]);  // 内容卡片配置区域引用数组

        // --- Composition API Hooks --- 

        // 1. 卡片管理逻辑 (移除本地操作方法)
        // const createEmptyCard = () => { ... }; // 移至 store
        // const addCardInternal = (index) => { ... }; // 由 store.addContentCard 替代
        // const removeCard = (index) => { ... }; // 由 store.removeContentCard 替代
        // const toggleVisibility = (cardType, field, index = null) => { ... }; // 由 store.toggleCardVisibility 替代
        
        // 获取按钮样式 (保持不变，因为它不修改状态，只依赖状态)
        const getButtonClass = (isVisible) => {
             return isVisible 
                 ? 'border border-gray-400 text-gray-500 bg-gray-100 hover:bg-gray-200' 
                 : 'border border-green-500 text-green-600 bg-green-100 hover:bg-green-200';
        };
        
        // 拖拽结束 (保持不变，v-model 驱动 store 更新)
        const onDragEnd = (event) => {
            console.log('[CardConfig] Drag ended:', event);
            // v-model="store.cardContent.contentCards" 已经处理了排序更新
        };

        // 2. 管理 Textarea 自动高度 (保持不变)
        const {
            adjustSingleTextarea,
            adjustAllTextareas
        } = useTextareaAutoHeight(cardConfigRoot);

        // 3. 管理模板选择、预览缩放和动态加载 (保持不变)
        const { 
            templatesInfo,
            templateItemRefs,
            scalingDivRefs,
            asyncTemplateComponentsMap,
        } = useTemplatePreviewScaling(store);
        
        const templatePreviewCoverContent = computed(() => ({
             title: store.cardContent?.coverCard?.title || '标题示例',
             subtitle: store.cardContent?.coverCard?.subtitle || '副标题示例',
             showHeader: true,
             showFooter: true
        }));
        
        // 判断是否为开发模式 (保持不变)
        const isDevMode = import.meta.env.DEV;
        
        // vuedraggable 拖拽选项配置 (保持不变)
        const dragOptions = {
          scroll: true,             // 启用容器内滚动
          scrollSensitivity: 120,   // 触发滚动的敏感区域像素 (增大以更容易触发滚动)
          scrollSpeed: 15,          // 滚动速度
          forceFallback: true,      // 可能提高某些环境下的兼容性
        };

        // --- Lifecycle and Watchers --- 

        // 组件挂载后 (保持不变)
        onMounted(() => {
            nextTick(adjustAllTextareas);
        });

        // 监听 store 中的 focusedEditorIndex
        watch(() => store.focusedEditorIndex, (newIndex) => {
            // 滚动逻辑保持不变，只是源头从 props 变为 store
            // newIndex: null (无焦点), -1 (封面), 0+ (内容卡片索引)
            console.log('[CardConfig] Watcher triggered. Received focusedEditorIndex from store:', newIndex);
            const container = editorScrollContainer.value;
            if (!container) {
                console.warn("[CardConfig] 无法找到滚动容器");
                return;
            }

            let targetElement;
            // 修改: 处理 -1 代表封面卡片
            if (newIndex === -1) {
                targetElement = coverCardConfigSection.value;
                console.log('[CardConfig] Scrolling to cover card section.');
            } else if (newIndex !== null && newIndex >= 0) { // newIndex >= 0 代表内容卡片
                targetElement = contentCardConfigSections.value[newIndex];
                 console.log(`[CardConfig] Scrolling to content card section ${newIndex}.`);
            } else {
                // newIndex 是 null 或其他无效值，不滚动
                 console.log('[CardConfig] No valid editor index to scroll to, ignoring.');
                return;
            }

            if (targetElement) {
                nextTick(() => {
                    const containerRect = container.getBoundingClientRect();
                    const targetRect = targetElement.getBoundingClientRect();
                    const offsetRelativeToContainer = targetRect.top - containerRect.top;
                    const desiredScrollTop = container.scrollTop + offsetRelativeToContainer;
                    container.scrollTo({ top: desiredScrollTop, behavior: 'smooth' });
                });
            } else {
                 // 目标元素未找到警告
                 if (newIndex === -1) {
                    console.warn("[CardConfig] 无法找到封面卡片配置元素进行滚动");
                 } else {
                    console.warn(`[CardConfig] 无法找到索引 ${newIndex} 的内容卡片配置元素进行滚动`);
                 }
            }
        });

        // 组件更新前 (保持不变)
        onBeforeUpdate(() => {
             contentCardConfigSections.value = [];
        });

        // --- Methods --- 

        // 移除 insertCard 和 addCard，模板直接调用 store.addContentCard
        // const insertCard = (index) => { ... };
        // const addCard = () => { ... };

        // 处理描述输入事件，调用 store action
        const handleDescriptionInput = (event) => {
            adjustSingleTextarea(event.target);
            store.updateTopicDescription(event.target.value);
        };

        // 处理任意 textarea 的输入事件 (保持不变)
        const handleTextareaInput = (event) => {
            adjustSingleTextarea(event.target);
            console.log('[CardConfig] Textarea input handled, store state updated via v-model');
        };
        
        // focusPreview 方法已移除，模板中直接调用 store.setFocusedPreview

        // --- 修改：处理保存到本地的返回结果 ---
        const saveLocally = async () => {
            // 调用 store action 并处理返回结果
            const result = await store.saveContentLocally();
            if (result && result.success) {
                toast.success(result.message);
            } else {
                // Store action 返回失败或 handleAsyncTask 捕获到错误
                 toast.error(result?.message || '保存到本地失败');
            }
        };

        const generateJsFile = () => {
            store.generateContentJsFile();
        };
        
        // 打开 Markdown 管理器
        // const openMarkdownManager = () => {
        //     showMarkdownManager.value = true;
        // };

        // 关闭 Markdown 管理器
        // const closeMarkdownManager = () => {
        //     showMarkdownManager.value = false;
        // };
        
        // 打开创建主题模态框
        // const openCreateTopicModal = () => {
        //     showCreateTopicModal.value = true;
        // };

        // 关闭创建主题模态框
        // const closeCreateTopicModal = () => {
        //     showCreateTopicModal.value = false;
        // };

        // --- Return --- 
        return {
            // Store
            store, // 暴露 store 实例给模板
            // Refs
            cardConfigRoot,
            templateItemRefs,
            scalingDivRefs,
            editorScrollContainer, 
            coverCardConfigSection, 
            contentCardConfigSections, 
            // 本地计算属性和方法 (移除与卡片操作相关的方法)
            templatePreviewCoverContent,
            // addCard, // 移除
            // removeCard, // 移除
            // toggleVisibility, // 移除
            getButtonClass, // 保留
            onDragEnd, // 保留
            // insertCard, // 移除
            // 模板预览 (From useTemplatePreviewScaling)
            templatesInfo,
            asyncTemplateComponentsMap,
            // 其他
            dragOptions,
            isDevMode,
            handleTextareaInput, // 保留
            handleDescriptionInput, // 保留
            saveLocally,
            generateJsFile,
            // 移除 showMarkdownManager 和相关方法
            // showMarkdownManager,
            // openMarkdownManager,
            // closeMarkdownManager,
            // 移除 showCreateTopicModal 和相关方法
            // showCreateTopicModal,
            // openCreateTopicModal,
            // closeCreateTopicModal
        };
    },
}
</script>

<style scoped>
.dynamic-textarea {
    resize: none;
    overflow-y: hidden;
}
.hide-scrollbar::-webkit-scrollbar {
    display: none;
}
.hide-scrollbar {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
}
.space-y-2 > :not([hidden]) ~ :not([hidden]) {
    --tw-space-y-reverse: 0;
    margin-top: calc(0.5rem * calc(1 - var(--tw-space-y-reverse)));
    margin-bottom: calc(0.5rem * var(--tw-space-y-reverse));
}

.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.5);
  border-radius: 10px;
  border: 1px solid transparent;
  background-clip: content-box;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(107, 114, 128, 0.7);
}
.custom-scrollbar {
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent; /* Firefox */
}

/* vuedraggable 拖拽时的占位符样式 */
.ghost-card {
    opacity: 0.5;
    background: #f7fafc; /* light gray */
    border: 1px dashed #cbd5e0; /* gray-300 */
}

/* .drag-handle 类仅用作 vuedraggable 的 handle 选择器，其样式由 Tailwind 直接应用 */
</style>