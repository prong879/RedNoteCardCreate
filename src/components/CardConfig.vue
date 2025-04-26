<template>
    <div ref="cardConfigRoot" class="card-config flex flex-col h-full">
        <!-- 顶部区域: 包含标题和返回按钮 -->
        <div class="flex-shrink-0 px-6 pt-6">
            <div class="flex justify-between items-center mb-4">
                 <h2 class="text-xl font-semibold">卡片配置</h2>
                 <button @click="$emit('return-to-topics')" class="px-4 py-1 border border-xhs-gray text-xhs-gray rounded-lg text-sm hover:border-xhs-pink hover:text-xhs-pink transition-colors bg-white">← 返回选择主题</button>
            </div>
        </div>

        <!-- 卡片编辑区标题和下载按钮容器 -->
        <div class="flex justify-between items-center mb-2 px-6">
            <h3 class="text-lg font-medium">卡片编辑区</h3>
            <!-- Moved download button here -->
            <button @click="$emit('save-content')" class="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">生成 JS 文件</button>
        </div>

        <!-- 卡片编辑滚动区 -->
        <div ref="editorScrollContainer" class="overflow-y-auto px-3 mx-6 h-96 custom-scrollbar bg-gray-50 border rounded-lg mb-6">
            <!-- 增加内边距 pt-3 是因为滚动容器加了 px-3 -->
            <div class="pt-3">
                <!-- 封面卡片配置 -->
                <div ref="coverCardConfigSection" class="p-3 mb-4 border bg-white rounded-lg space-y-2 shadow-xl">
                    <!-- 封面卡片顶部操作栏 -->
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium">封面卡片</span>
                        <!-- 页眉/页脚显隐切换按钮 -->
                        <div class="flex items-center space-x-1 md:space-x-2">
                             <button @click="toggleVisibility('coverCard', 'showHeader')" :class="getButtonClass(content.coverCard.showHeader)" class="text-xs px-2 py-0.5 rounded transition-colors"> {{ content.coverCard.showHeader ? '隐藏页眉' : '显示页眉' }} </button>
                             <button @click="toggleVisibility('coverCard', 'showFooter')" :class="getButtonClass(content.coverCard.showFooter)" class="text-xs px-2 py-0.5 rounded transition-colors"> {{ content.coverCard.showFooter ? '隐藏页脚' : '显示页脚' }} </button>
                        </div>
                    </div>
                    <!-- 封面标题和副标题编辑 -->
                    <textarea v-model="content.coverCard.title" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="输入封面标题" rows="1"></textarea>
                    <textarea v-model="content.coverCard.subtitle" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar" placeholder="输入副标题" rows="2"></textarea>
                </div>

                <!-- 新增：在第一个卡片前添加插入点 -->
                <div class="insert-point h-5 flex items-center justify-center my-2">
                    <button @click="insertCard(0)" class="w-full h-full border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-xhs-pink hover:text-xhs-pink flex items-center justify-center text-sm bg-white bg-opacity-70 backdrop-blur-sm opacity-0 hover:opacity-100 transition-all duration-200 ease-in-out">
                        + 新卡片
                    </button>
                </div>

                <!-- 内容卡片配置 (使用 vuedraggable 实现拖拽排序) -->
                <draggable 
                    v-model="content.contentCards" 
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
                                         <button @click="focusPreview(index)" title="定位预览" class="h-6 flex items-center justify-center text-xs px-2 rounded border border-blue-500 text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /> </svg> </button>
                                         <button @click="toggleVisibility('contentCard', 'showHeader', index)" :class="getButtonClass(card.showHeader)" class="h-6 flex items-center justify-center text-xs px-2 rounded transition-colors"> {{ card.showHeader ? '隐藏页眉' : '显示页眉' }} </button>
                                         <button @click="toggleVisibility('contentCard', 'showFooter', index)" :class="getButtonClass(card.showFooter)" class="h-6 flex items-center justify-center text-xs px-2 rounded transition-colors"> {{ card.showFooter ? '隐藏页脚' : '显示页脚' }} </button>
                                         <button @click="removeCard(index)" class="h-6 flex items-center justify-center text-red-500 text-xs border border-red-500 bg-red-100 px-2 rounded hover:bg-red-200 transition-colors" v-if="content.contentCards.length > 1"> 删除 </button>
                                    </div>
                                </div>
                                <!-- 卡片标题和内容编辑 -->
                                <textarea v-model="card.title" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="卡片标题" rows="1"></textarea>
                                <textarea v-model="card.body" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg" placeholder="卡片内容 (支持 Markdown 格式)" rows="6"></textarea>
                            </div>
                            <!-- 插入点按钮 (悬停时可见) -->
                            <div class="insert-point h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out my-2">
                                <button @click="insertCard(index + 1)" class="w-full h-full border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-xhs-pink hover:text-xhs-pink flex items-center justify-center text-sm bg-white bg-opacity-70 backdrop-blur-sm">
                                    + 新卡片
                                </button>
                            </div>
                        </div>
                    </template>
                </draggable>
            </div>
        </div>

        <!-- 模板选择区 -->
        <div class="px-6 mb-6">
             <h3 class="text-lg font-medium mb-2">选择模板</h3>
             <div class="grid grid-cols-3 gap-4 items-start max-h-60 overflow-y-auto pr-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                 <div v-for="(template, index) in templatesInfo" :key="template.id" @click="selectTemplate(template.id)" :ref="el => { if (el) templateItemRefs[index] = el }" class="template-item flex flex-col items-center p-1 border rounded-lg cursor-pointer transition-all" :class="{ 'border-xhs-pink border-2': selectedTemplate === template.id, 'border-gray-200': selectedTemplate !== template.id }">
                    <div :class="['preview-container', 'w-full', 'overflow-hidden', 'mb-1', 'bg-gray-50']">
                        <div :ref="el => { if (el) scalingDivRefs[index] = el }" style="transform-origin: top left; width: 320px;">
                            <component 
                                :is="asyncTemplateComponentsMap[template.id]" 
                                type="cover" 
                                :cardData="previewCoverContent" />
                        </div>
                    </div>
                    <span class="text-xs mt-auto">{{ template.name }}</span>
                </div>
             </div>
        </div>

        <!-- 底部固定区域: 全局设置和操作按钮 -->
        <div class="flex-grow overflow-y-auto px-6 pt-4 pb-6 border-t custom-scrollbar">
             <!-- 全局页眉/页脚配置 -->
             <div class="mb-6">
                  <h3 class="text-lg font-medium mb-2">全局页眉/页脚</h3>
                  <div class="p-3 border rounded-lg space-y-2">
                      <textarea v-model="content.headerText" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页眉 (所有卡片生效)" rows="1"></textarea>
                      <textarea v-model="content.footerText" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页脚 (所有卡片生效)" rows="1"></textarea>
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
import { ref, onMounted, onBeforeUnmount, watch, nextTick, onBeforeUpdate } from 'vue';
import draggable from 'vuedraggable';
// 移除已注释的模板导入

// 导入组合式函数
import { useCardManagement } from '../composables/useCardManagement';
import { useTextareaAutoHeight } from '../composables/useTextareaAutoHeight';
import { useTemplatePreviewScaling } from '../composables/useTemplatePreviewScaling';

export default {
    name: 'CardConfig',
    components: {
        draggable,
    },
    props: {
        selectedTemplate: {
            type: String,
            required: true
        },
        cardContent: {
            type: Object,
            required: true
        },
        topicId: {
            type: String,
            default: null
        },
        focusedEditorIndex: {
            type: Number,
            default: null
        }
    },
    emits: [
        'update:template',
        'update:content',
        'return-to-topics',
        'save-content',
        'focus-preview-card'
    ],
    setup(props, { emit }) {
        // --- Refs --- 
        const cardConfigRoot = ref(null);           // 组件根元素引用
        const editorScrollContainer = ref(null);    // 编辑区滚动容器引用
        const coverCardConfigSection = ref(null); // 封面卡片配置区域引用
        const contentCardConfigSections = ref([]);  // 内容卡片配置区域引用数组

        // --- Composition API Hooks --- 

        // 1. 管理卡片内容状态和操作 (增删改、显隐切换、拖拽)
        const {
            content,
            addCard: addCardInternal, // 内部添加卡片函数，避免与导出函数重名
            removeCard,
            toggleVisibility,
            getButtonClass,
            onDragEnd,
            updateContent,
            createEmptyCard // 用于创建空卡片对象
        } = useCardManagement(props, emit);

        // 2. 管理 Textarea 自动高度
        const {
            adjustSingleTextarea,
            adjustAllTextareas
        } = useTextareaAutoHeight(cardConfigRoot);

        // 3. 管理模板选择、预览缩放和动态加载
        const {
            templatesInfo,
            previewCoverContent,
            templateItemRefs,
            scalingDivRefs,
            asyncTemplateComponentsMap,
            selectTemplate,
            // updateScale // 通常由 useTemplatePreviewScaling 内部管理，无需手动调用
        } = useTemplatePreviewScaling(content, emit);
        
        // vuedraggable 拖拽选项配置
        const dragOptions = {
          scroll: true,             // 启用容器内滚动
          scrollSensitivity: 120,   // 触发滚动的敏感区域像素 (增大以更容易触发滚动)
          scrollSpeed: 15,          // 滚动速度
          forceFallback: true,      // 可能提高某些环境下的兼容性
        };

        // --- Lifecycle and Watchers --- 

        // 组件挂载后，调整所有现有文本域的高度
        onMounted(() => {
            nextTick(adjustAllTextareas);
        });

        // 监听外部触发的编辑器聚焦事件 (来自预览区滚动)
        watch(() => props.focusedEditorIndex, (newIndex) => {
            console.log('[CardConfig] Watcher triggered. Received focusedEditorIndex:', newIndex);
            const container = editorScrollContainer.value;
            if (!container) {
                console.warn("[CardConfig] 无法找到滚动容器");
                return;
            }

            let targetElement; // 确定目标元素
            if (newIndex === null) { 
                targetElement = coverCardConfigSection.value; // 聚焦封面
                console.log('[CardConfig] Scrolling to cover card. Target:', targetElement);
            } else if (typeof newIndex === 'number' && newIndex >= 0) {
                targetElement = contentCardConfigSections.value[newIndex]; // 聚焦指定内容卡片
                console.log(`[CardConfig] Scrolling to content card ${newIndex}. Target:`, targetElement);
            } else {
                console.warn('[CardConfig] Received invalid index, skipping scroll:', newIndex); // 无效索引
                return;
            }

            // 确保目标元素已渲染且可用
            if (targetElement) {
                nextTick(() => { // 使用 nextTick 保证 DOM 更新和位置计算准确
                    const containerRect = container.getBoundingClientRect();
                    const targetRect = targetElement.getBoundingClientRect();
                    // 计算目标元素相对于滚动容器顶部的偏移量
                    const offsetRelativeToContainer = targetRect.top - containerRect.top;
                    // 计算容器需要滚动到的目标 scrollTop 值
                    const desiredScrollTop = container.scrollTop + offsetRelativeToContainer;

                    // 平滑滚动到目标位置
                    container.scrollTo({
                        top: desiredScrollTop,
                        behavior: 'smooth'
                    });
                });
            } else {
                // 滚动目标元素未找到警告
                if (newIndex === null) {
                    console.warn("[CardConfig] 无法找到封面卡片配置元素进行滚动", {container: container});
                } else {
                    console.warn(`[CardConfig] 无法找到索引 ${newIndex} 的内容卡片配置元素进行滚动`, {container: container, allRefs: contentCardConfigSections.value});
                }
            }
        });

        // 在组件更新前 (如卡片增删导致 v-for 重新渲染)，清空内容卡片的 ref 数组
        onBeforeUpdate(() => {
             contentCardConfigSections.value = [];
        });

        // --- Methods --- 

        // 在指定索引处插入新卡片
        const insertCard = (index) => {
            const newCard = createEmptyCard(); // 创建一个空卡片对象
            content.value.contentCards.splice(index, 0, newCard);
            updateContent(); // 通知父组件内容已更新
            nextTick(adjustAllTextareas); // DOM 更新后调整所有文本域高度
        };

        // 包装内部的 addCardInternal，以便在添加后调整文本域高度
        const addCard = () => {
            addCardInternal(adjustAllTextareas);
        };

        // 处理任意 textarea 的输入事件
        const handleTextareaInput = (event) => {
            adjustSingleTextarea(event.target); // 调整当前输入框高度
            updateContent(); // v-model 会自动更新数据，这里确保父组件也收到更新事件
        };

        // 触发预览区滚动到指定卡片的事件
        const focusPreview = (index) => {
            emit('focus-preview-card', index);
        };

        // --- Return --- 
        // 暴露给模板使用的 ref、计算属性和方法
        return {
            // Refs
            cardConfigRoot,
            templateItemRefs,
            scalingDivRefs,
            editorScrollContainer, 
            coverCardConfigSection, 
            contentCardConfigSections, 
            // 内容和管理 (From useCardManagement)
            content,
            addCard, // 使用包装后的添加函数
            removeCard,
            toggleVisibility,
            getButtonClass,
            onDragEnd,
            // 模板预览 (From useTemplatePreviewScaling)
            templatesInfo,
            previewCoverContent,
            asyncTemplateComponentsMap,
            selectTemplate,
            // 本地方法
            handleTextareaInput,
            focusPreview,
            dragOptions,
            insertCard,
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