<template>
    <div ref="cardConfigRoot" class="card-config flex flex-col h-full">
        <!-- 1. 顶部固定区域: 返回按钮, 模板选择 -->
        <div class="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <!-- Flex布局, 子元素两端对齐, 垂直居中, 下外边距1rem -->
            <div class="flex justify-between items-center mb-4">
                 <h2 class="text-xl font-semibold">卡片配置</h2>
                 <button @click="$emit('return-to-topics')" class="px-4 py-1 border border-xhs-gray text-xhs-gray rounded-lg text-sm hover:border-xhs-pink hover:text-xhs-pink transition-colors bg-white">← 返回选择主题</button>
            </div>
            <!-- 选择模板 -->
            <div class="mb-2">
                 <h3 class="text-lg font-medium mb-2">选择模板</h3>
                 <div class="grid grid-cols-3 gap-4 items-start max-h-60 overflow-y-auto pr-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <!-- Template items ... -->
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
        </div>

        <!-- 新增：中间区域标题 -->
        <h3 class="text-lg font-medium mt-4 mb-2 px-6">卡片编辑区</h3>

        <!-- 2. 中间滚动区域: 卡片配置列表 (封面 + 内容) -->
        <div ref="editorScrollContainer" class="overflow-y-auto px-3 mx-6 h-96 custom-scrollbar bg-gray-50 border rounded-lg mb-6">
            <!-- 调整内边距，因为外层 div 加了 p-3 -->
            <div class="pt-3">
                <!-- 封面卡片配置 -->
                <div ref="coverCardConfigSection" class="p-3 mb-4 border bg-white rounded-lg space-y-2 shadow-md">
                    <!-- 修改：添加顶部行，包含标签和按钮 -->
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium">封面卡片</span>
                        <!-- 移动按钮到这里 -->
                        <div class="flex items-center space-x-1 md:space-x-2">
                             <button @click="toggleVisibility('coverCard', 'showHeader')" :class="getButtonClass(content.coverCard.showHeader)" class="text-xs px-2 py-0.5 rounded transition-colors"> {{ content.coverCard.showHeader ? '隐藏页眉' : '显示页眉' }} </button>
                             <button @click="toggleVisibility('coverCard', 'showFooter')" :class="getButtonClass(content.coverCard.showFooter)" class="text-xs px-2 py-0.5 rounded transition-colors"> {{ content.coverCard.showFooter ? '隐藏页脚' : '显示页脚' }} </button>
                        </div>
                    </div>
                    <!-- 封面标题和副标题 -->
                    <textarea v-model="content.coverCard.title" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="输入封面标题" rows="1"></textarea>
                    <textarea v-model="content.coverCard.subtitle" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar" placeholder="输入副标题" rows="2"></textarea>
                </div>

                <!-- 内容卡片配置 - 使用 draggable 包裹 -->
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
                            <!-- 原卡片编辑区 -->
                            <div 
                                :ref="el => { if (el) contentCardConfigSections[index] = el }" 
                                class="p-3 border bg-white rounded-lg space-y-2 shadow-md relative z-10" 
                                :id="`config-card-${index}`"
                            >
                                <!-- 添加拖拽句柄 -->
                                <div class="flex justify-between items-center mb-2">
                                    <div class="flex items-center">
                                        <span class="drag-handle cursor-move mr-2 text-gray-400 hover:text-gray-600" title="拖拽排序">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                                            </svg>
                                        </span>
                                        <span class="font-medium">卡片 {{ index + 1 }}</span>
                                    </div>
                                    <div class="flex items-center space-x-1 md:space-x-2">
                                         <button @click="focusPreview(index)" title="定位预览" class="h-6 flex items-center justify-center text-xs px-2 rounded border border-blue-500 text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors"> <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"> <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /> <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /> </svg> </button>
                                         <button @click="toggleVisibility('contentCard', 'showHeader', index)" :class="getButtonClass(card.showHeader)" class="h-6 flex items-center justify-center text-xs px-2 rounded transition-colors"> {{ card.showHeader ? '隐藏页眉' : '显示页眉' }} </button>
                                         <button @click="toggleVisibility('contentCard', 'showFooter', index)" :class="getButtonClass(card.showFooter)" class="h-6 flex items-center justify-center text-xs px-2 rounded transition-colors"> {{ card.showFooter ? '隐藏页脚' : '显示页脚' }} </button>
                                         <button @click="removeCard(index)" class="h-6 flex items-center justify-center text-red-500 text-xs border border-red-500 bg-red-100 px-2 rounded hover:bg-red-200 transition-colors" v-if="content.contentCards.length > 1"> 删除 </button>
                                    </div>
                                </div>
                                <textarea v-model="card.title" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="卡片标题" rows="1"></textarea>
                                <textarea v-model="card.body" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg" placeholder="卡片内容 (支持 Markdown 格式)" rows="4"></textarea>
                            </div>
                            <!-- 插入点按钮 -->
                            <div class="insert-point h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 ease-in-out my-2">
                                <button @click="insertCard(index + 1)" class="w-full h-full border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-xhs-pink hover:text-xhs-pink flex items-center justify-center text-sm bg-white bg-opacity-70 backdrop-blur-sm">
                                    + 新卡片
                                </button>
                            </div>
                        </div>
                    </template>
                </draggable>
                <!-- <button @click="addCard" class="w-full py-2 border border-solid border-xhs-pink rounded-lg text-xhs-pink bg-white hover:bg-xhs-pink hover:text-white transition-colors shadow-sm">添加卡片</button> -->
            </div>
        </div>

        <!-- 3. 底部固定区域: 全局页眉/页脚, 主文案, 操作按钮 -->
        <div class="flex-grow overflow-y-auto px-6 pt-4 pb-6 border-t custom-scrollbar">
             <!-- 全局页眉/页脚配置 -->
             <div class="mb-6">
                  <h3 class="text-lg font-medium mb-2">全局页眉/页脚</h3>
                  <div class="p-3 border rounded-lg space-y-2">
                      <textarea v-model="content.headerText" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页眉 (所有卡片生效)" rows="1"></textarea>
                      <textarea v-model="content.footerText" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页脚 (所有卡片生效)" rows="1"></textarea>
                  </div>
             </div>
             <!-- 小红书主文案 -->
             <div class="mb-6">
                 <h3 class="text-lg font-medium mb-2">小红书主文案</h3>
                 <textarea v-model="content.mainText" @input="handleTextareaInput" class="w-full px-3 py-2 border rounded-lg" placeholder="输入小红书笔记主文案" rows="6"></textarea>
             </div>
            <!-- 操作按钮 -->
             <div class="pt-4 border-t border-gray-200 flex gap-4">
                  <button @click="$emit('save-content')" class="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">生成 JS 文件供下载</button>
                  <button @click="copyMainText" class="flex-1 py-2 bg-xhs-pink text-white rounded-lg hover:bg-opacity-90 transition-colors">复制主文案</button>
             </div>
        </div>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, onBeforeUpdate } from 'vue';
import draggable from 'vuedraggable';
// import Template1 from '../templates/Template1.vue';
// import Template2 from '../templates/Template2.vue';
// import Template5 from '../templates/Template5.vue';

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
        // 获取根元素的引用
        const cardConfigRoot = ref(null);
        const editorScrollContainer = ref(null); // 引用中间滚动区域
        const coverCardConfigSection = ref(null); // 引用封面卡片配置区域
        const contentCardConfigSections = ref([]); // 引用内容卡片配置区域数组

        // 1. 使用 useCardManagement 管理内容状态和操作
        const {
            content,
            addCard: addCardInternal, // 重命名以避免与下面的包装函数冲突
            removeCard,
            toggleVisibility,
            getButtonClass,
            onDragEnd,
            updateContent,
            createEmptyCard // 从 useCardManagement 获取创建空卡片的方法
        } = useCardManagement(props, emit);

        // 2. 使用 useTextareaAutoHeight 管理文本域高度
        const {
            adjustSingleTextarea,
            adjustAllTextareas
        } = useTextareaAutoHeight(cardConfigRoot);

        // 3. 使用 useTemplatePreviewScaling 管理模板预览
        const {
            templatesInfo,
            previewCoverContent,
            templateItemRefs,
            scalingDivRefs,
            asyncTemplateComponentsMap,
            selectTemplate,
            // updateScale // 通常不需要手动调用
        } = useTemplatePreviewScaling(content, emit);
        
        // 定义拖拽选项以优化滚动
        const dragOptions = {
          scroll: true, // 明确启用滚动
          scrollSensitivity: 120, // 大幅增大触发滚动的敏感区域 (原 50, 默认 30)
          scrollSpeed: 15,      // 保持稍微加快的滚动速度 (默认 10)
          forceFallback: true, // 某些情况下可以提高兼容性
        };

        // 组件挂载后调整所有文本域高度
        onMounted(() => {
            nextTick(adjustAllTextareas);
        });

        // 监听 focusedEditorIndex prop 的变化以滚动编辑器到容器顶部
        watch(() => props.focusedEditorIndex, (newIndex) => {
            console.log('[CardConfig] Watcher triggered. Received focusedEditorIndex:', newIndex);
            const container = editorScrollContainer.value;
            if (!container) {
                console.warn("[CardConfig] 无法找到滚动容器");
                return;
            }

            let targetElement;
            // 确定目标元素
            if (newIndex === null) {
                // 聚焦封面卡片
                targetElement = coverCardConfigSection.value;
                console.log('[CardConfig] Scrolling to cover card. Target:', targetElement);
            } else if (typeof newIndex === 'number' && newIndex >= 0) {
                // 聚焦内容卡片
                // 确保在 DOM 更新后获取 ref
                targetElement = contentCardConfigSections.value[newIndex];
                console.log(`[CardConfig] Scrolling to content card ${newIndex}. Target:`, targetElement);
            } else {
                // 无效索引，不执行滚动
                console.warn('[CardConfig] Received invalid index, skipping scroll:', newIndex);
                return;
            }

            // 确保目标元素存在后再执行滚动
            if (targetElement) {
                nextTick(() => { // 使用 nextTick 确保元素已渲染且位置信息准确
                    const containerRect = container.getBoundingClientRect();
                    const targetRect = targetElement.getBoundingClientRect();
                    // 计算目标元素顶部相对于容器顶部的偏移量
                    const offsetRelativeToContainer = targetRect.top - containerRect.top;
                    // 计算容器需要滚动到的目标 scrollTop 值
                    const desiredScrollTop = container.scrollTop + offsetRelativeToContainer;

                    // 平滑滚动到计算出的位置
                    container.scrollTo({
                        top: desiredScrollTop,
                        behavior: 'smooth'
                    });
                });
            } else {
                // 如果目标元素未找到，打印警告
                if (newIndex === null) {
                    console.warn("[CardConfig] 无法找到封面卡片配置元素进行滚动", {container: container});
                } else {
                    console.warn(`[CardConfig] 无法找到索引 ${newIndex} 的内容卡片配置元素进行滚动`, {container: container, allRefs: contentCardConfigSections.value});
                }
            }
        });

        // 在模板更新前清空内容卡片 ref 数组
        onBeforeUpdate(() => {
             contentCardConfigSections.value = [];
        });

        // --- 保留在组件内的简单事件处理器 ---

        // 插入新卡片到指定索引
        const insertCard = (index) => {
            const newCard = createEmptyCard(); // 使用导入的方法创建新卡片
            content.value.contentCards.splice(index, 0, newCard);
            updateContent(); // 触发内容更新
            // 在 DOM 更新后调整所有文本域高度
            nextTick(adjustAllTextareas);
        };

        // 包装 addCard 以便传入 adjustAllTextareas 回调
        const addCard = () => {
            addCardInternal(adjustAllTextareas);
        };

        // 处理文本域输入事件：调整高度并触发内容更新
        const handleTextareaInput = (event) => {
            adjustSingleTextarea(event.target);
            updateContent(); // 确保修改通过 v-model 绑定后，通知父组件
        };

        // 复制主文案
        const copyMainText = () => {
             const textToCopy = content.value?.mainText || '';
             if (!textToCopy) {
                 alert("主文案为空，无法复制。");
                 return;
             }
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    alert('主文案已复制到剪贴板！');
                })
                .catch(err => {
                    console.error('无法复制文本: ', err);
                    alert('复制失败: ' + err.message);
                });
        };

        // 定位预览卡片
        const focusPreview = (index) => {
            emit('focus-preview-card', index);
        };

        // 返回 setup 需要暴露给模板的所有内容
        return {
            // Refs
            cardConfigRoot,
            templateItemRefs,
            scalingDivRefs,
            editorScrollContainer, // 暴露滚动容器 ref
            coverCardConfigSection, // 暴露封面卡片配置 ref
            contentCardConfigSections, // 暴露内容卡片配置 ref 数组
            // From useCardManagement
            content,
            addCard, // 使用包装后的 addCard
            removeCard,
            toggleVisibility,
            getButtonClass,
            onDragEnd,
            // From useTextareaAutoHeight (no direct exposure needed)
            // From useTemplatePreviewScaling
            templatesInfo,
            previewCoverContent,
            asyncTemplateComponentsMap,
            selectTemplate,
            // Local handlers
            handleTextareaInput,
            copyMainText,
            focusPreview,
            dragOptions, // 暴露 dragOptions
            insertCard, // 暴露插入函数
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
    -ms-overflow-style: none;
    scrollbar-width: none;
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
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
}

.ghost-card {
    opacity: 0.5;
    background: #f7fafc;
    border: 1px dashed #cbd5e0;
}

/* .drag-handle is used as a selector for vuedraggable, styled with Tailwind */
</style>