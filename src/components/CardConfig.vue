<template>
    <div ref="cardConfigRoot" class="card-config flex flex-col h-full">
        <!-- 1. 顶部固定区域: 返回按钮, 模板选择 -->
        <div class="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <!-- Flex布局, 子元素两端对齐, 垂直居中, 下外边距1rem -->
            <div class="flex justify-between items-center mb-4">
                 <h2 class="text-xl font-semibold">卡片配置 <span v-if="topicId" class="text-sm text-gray-500">({{ topicId }})</span></h2>
                 <button @click="$emit('return-to-topics')" class="px-4 py-1 border border-xhs-gray text-xhs-gray rounded-lg text-sm hover:border-xhs-pink hover:text-xhs-pink transition-colors bg-white">← 返回选择主题</button>
            </div>
            <!-- 选择模板 -->
            <div class="mb-2">
                 <h3 class="text-lg font-medium mb-2">选择模板</h3>
                 <div class="grid grid-cols-3 gap-4 items-start max-h-60 overflow-y-auto pr-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <!-- Template items ... -->
                     <div v-for="(template, index) in templatesInfo" :key="template.id" @click="selectTemplate(template.id)" :ref="el => { if (el) templateItemRefs[index] = el }" class="template-item flex flex-col items-center p-1 border rounded-lg cursor-pointer transition-all" :class="{ 'border-xhs-pink border-2': selectedTemplate === template.id, 'border-gray-200': selectedTemplate !== template.id }">
                        <div :class="['preview-container', 'w-full', 'overflow-hidden', 'mb-1', 'bg-gray-50', `aspect-[${template.aspectRatio}]`, 'flex', 'justify-center', 'items-center']">
                            <div :ref="el => { if (el) scalingDivRefs[index] = el }" style="transform-origin: center center; width: 320px;">
                                <component :is="getTemplateComponent(template.id)" type="cover" :title="previewCoverContent.title" :content="previewCoverContent" />
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
        <div class="overflow-y-auto px-3 mx-6 h-96 custom-scrollbar bg-gray-50 border rounded-lg mb-6">
            <!-- 调整内边距，因为外层 div 加了 p-3 -->
            <div class="pt-3">
                <!-- 封面卡片配置 -->
                <div class="p-3 mb-4 border bg-white rounded-lg space-y-2 shadow-md">
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
                    <textarea v-model="content.coverCard.title" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="输入封面标题" rows="1"></textarea>
                    <textarea v-model="content.coverCard.subtitle" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar" placeholder="输入副标题" rows="2"></textarea>
                </div>

                <!-- 内容卡片配置 - 使用 draggable 包裹 -->
                <draggable 
                    v-model="content.contentCards" 
                    item-key="index" 
                    tag="div" 
                    handle=".drag-handle" 
                    ghost-class="ghost-card"
                    @end="onDragEnd"
                >
                    <template #item="{element: card, index}">
                        <div class="mb-4 p-3 border bg-white rounded-lg space-y-2 shadow-md" :id="`config-card-${index}`">
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
                            <textarea v-model="card.title" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="卡片标题" rows="1"></textarea>
                            <textarea v-model="card.body" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg" placeholder="卡片内容 (支持 Markdown 格式)" rows="4"></textarea>
                        </div>
                    </template>
                </draggable>
                <button @click="addCard" class="w-full py-2 border border-solid border-xhs-pink rounded-lg text-xhs-pink bg-white hover:bg-xhs-pink hover:text-white transition-colors shadow-sm">添加卡片</button>
            </div>
        </div>

        <!-- 3. 底部固定区域: 全局页眉/页脚, 主文案, 操作按钮 -->
        <div class="flex-grow overflow-y-auto px-6 pt-4 pb-6 border-t custom-scrollbar">
             <!-- 全局页眉/页脚配置 -->
             <div class="mb-6">
                  <h3 class="text-lg font-medium mb-2">全局页眉/页脚</h3>
                  <div class="p-3 border rounded-lg space-y-2">
                      <textarea v-model="content.headerText" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页眉 (所有卡片生效)" rows="1"></textarea>
                      <textarea v-model="content.footerText" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页脚 (所有卡片生效)" rows="1"></textarea>
                  </div>
             </div>
             <!-- 小红书主文案 -->
             <div class="mb-6">
                 <h3 class="text-lg font-medium mb-2">小红书主文案</h3>
                 <textarea v-model="content.mainText" class="w-full px-3 py-2 border rounded-lg" placeholder="输入小红书笔记主文案" rows="6"></textarea>
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
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import draggable from 'vuedraggable';
import Template1 from '../templates/Template1.vue';
import Template2 from '../templates/Template2.vue';
import Template3 from '../templates/Template3.vue';
import Template5 from '../templates/Template5.vue';

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
        const content = ref({});
        const cardConfigRoot = ref(null);

        const adjustTextareaHeightInternal = (textarea) => {
            if (textarea) {
                textarea.style.height = 'auto';
                textarea.style.height = `${textarea.scrollHeight + 2}px`;
            }
        };

        const adjustAllTextareaHeights = () => {
            if (cardConfigRoot.value) {
                const textareas = cardConfigRoot.value.querySelectorAll('.dynamic-textarea');
                textareas.forEach(adjustTextareaHeightInternal);
            }
        };

        watch(() => props.cardContent, (newVal) => {
             try {
                 content.value = structuredClone(newVal);
             } catch (e) {
                 content.value = { ...newVal };
             }
             nextTick(adjustAllTextareaHeights);
         }, { deep: true, immediate: true });

        onMounted(() => {
             nextTick(() => {
                  adjustAllTextareaHeights();
                  if (typeof ResizeObserver !== 'undefined') {
                      resizeObserver = new ResizeObserver(entries => {
                          updateScale();
                      });
                      templateItemRefs.value.forEach(el => {
                          if (el) {
                              resizeObserver.observe(el);
                          }
                      });
                      updateScale();
                  } else {
                      console.warn('ResizeObserver is not supported in this browser.');
                  }
             });
        });

        onBeforeUnmount(() => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        });

        const templatesInfo = ref([
            { id: 'template1', name: '模板1', aspectRatio: '3/4' },
            { id: 'template2', name: '模板2', aspectRatio: '3/4' },
            { id: 'template3', name: '模板3', aspectRatio: '3/4' },
            { id: 'template5', name: '模板5', aspectRatio: '16/9' }
        ]);
        const templateComponentMap = {
            template1: Template1,
            template2: Template2,
            template3: Template3,
            template5: Template5
        };

        const previewCoverContent = computed(() => ({
            title: content.value?.coverCard?.title || '标题',
            subtitle: content.value?.coverCard?.subtitle || '副标题'
        }));

        const templateItemRefs = ref([]);
        const scalingDivRefs = ref([]);
        let resizeObserver = null;
        const BASE_CARD_WIDTH = 320;

        const updateScale = () => {
             templateItemRefs.value.forEach((itemEl, index) => {
                 if (itemEl && scalingDivRefs.value[index]) {
                     const containerWidth = itemEl.clientWidth;
                     const padding = 8;
                     const availableWidth = Math.max(1, containerWidth - padding);
                     const scale = Math.min(1, availableWidth / BASE_CARD_WIDTH);
                     scalingDivRefs.value[index].style.transform = `scale(${scale})`;
                 }
             });
        };

        const getTemplateComponent = (templateId) => {
            return templateComponentMap[templateId] || Template1;
        };

        const selectTemplate = (templateId) => {
            emit('update:template', templateId);
        };

        const updateContent = () => {
             emit('update:content', { ...content.value });
        };

        const adjustTextareaHeight = (event) => {
            adjustTextareaHeightInternal(event.target);
            updateContent();
        };

        const addCard = () => {
            if (!Array.isArray(content.value.contentCards)) {
                 content.value.contentCards = [];
            }
            content.value.contentCards.push({
                title: '新卡片标题',
                body: '在这里输入卡片内容...',
                showHeader: true,
                showFooter: true
            });
            updateContent();
            nextTick(adjustAllTextareaHeights);
        };

        const removeCard = (index) => {
             if (Array.isArray(content.value.contentCards) && content.value.contentCards.length > 1) {
                 content.value.contentCards.splice(index, 1);
                 updateContent();
            }
        };

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

        const toggleVisibility = (cardType, field, index = null) => {
            let card;
            if (cardType === 'coverCard') {
                card = content.value.coverCard;
            } else if (cardType === 'contentCard' && index !== null && content.value.contentCards && content.value.contentCards[index]) {
                card = content.value.contentCards[index];
            }

            if (card) {
                card[field] = !(typeof card[field] === 'boolean' ? card[field] : true);
            }
            updateContent();
        };

        const getButtonClass = (isVisible) => {
            const visible = typeof isVisible === 'boolean' ? isVisible : true;
            return visible
                ? 'border border-gray-400 text-gray-600 bg-gray-100 hover:bg-gray-200'
                : 'border border-blue-500 text-blue-600 bg-blue-100 hover:bg-blue-200';
        };

        const focusPreview = (index) => {
            console.log('Focus preview card:', index);
            emit('focus-preview-card', index);
        };

        const onDragEnd = () => {
            updateContent();
        };

        return {
            content,
            cardConfigRoot,
            templatesInfo,
            previewCoverContent,
            templateItemRefs,
            scalingDivRefs,
            getTemplateComponent,
            selectTemplate,
            addCard,
            removeCard,
            copyMainText,
            adjustTextareaHeight,
            toggleVisibility,
            getButtonClass,
            focusPreview,
            onDragEnd
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
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #c7c7c7;
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: #c7c7c7 #f1f1f1;
}

.ghost-card {
    opacity: 0.5;
    background: #c8ebfb;
    border: 1px dashed #0ea5e9;
}

.drag-handle {
    /* 可以根据需要添加更多样式，例如 padding */
}
</style>