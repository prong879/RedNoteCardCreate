<template>
    <div ref="cardConfigRoot" class="card-config flex flex-col h-full">
        <div class="flex-grow overflow-y-auto pr-2">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl font-semibold">卡片配置 <span v-if="topicId" class="text-sm text-gray-500">({{ topicId }})</span></h2>
                <button
                  @click="$emit('return-to-topics')"
                  class="px-4 py-1 border border-xhs-gray text-xhs-gray rounded-lg text-sm hover:border-xhs-pink hover:text-xhs-pink transition-colors bg-white"
                >
                  ← 返回选择主题
                </button>
            </div>

            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">选择模板</h3>
                <div class="grid grid-cols-3 gap-4 items-start max-h-60 overflow-y-auto pr-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <div v-for="(template, index) in templatesInfo" :key="template.id"
                         @click="selectTemplate(template.id)"
                         :ref="el => { if (el) templateItemRefs[index] = el }"
                         class="template-item flex flex-col items-center p-1 border rounded-lg cursor-pointer transition-all"
                         :class="{ 'border-xhs-pink border-2': selectedTemplate === template.id, 'border-gray-200': selectedTemplate !== template.id }">

                        <div :class="['preview-container', 'w-full', 'overflow-hidden', 'mb-1', 'bg-gray-50', `aspect-[${template.aspectRatio}]`, 'flex', 'justify-center', 'items-center']">
                            <div :ref="el => { if (el) scalingDivRefs[index] = el }"
                                 style="transform-origin: center center; width: 320px;">
                                <component
                                    :is="getTemplateComponent(template.id)"
                                    type="cover"
                                    :title="previewCoverContent.title"
                                    :content="previewCoverContent"
                                />
                            </div>
                        </div>

                        <span class="text-xs mt-auto">{{ template.name }}</span>
                    </div>
                </div>
            </div>

            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">全局页眉/页脚</h3>
                <div class="p-3 border rounded-lg space-y-2">
                    <textarea v-model="content.headerText" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页眉 (所有卡片生效)" rows="1"></textarea>
                    <textarea v-model="content.footerText" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar text-sm" placeholder="输入全局页脚 (所有卡片生效)" rows="1"></textarea>
                </div>
            </div>

            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">封面卡片</h3>
                <div class="p-3 border rounded-lg space-y-2">
                    <textarea v-model="content.coverCard.title" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="输入封面标题" rows="1"></textarea>
                    <textarea v-model="content.coverCard.subtitle" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg dynamic-textarea hide-scrollbar" placeholder="输入副标题" rows="2"></textarea>
                </div>
            </div>

            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">内容卡片</h3>
                <div v-for="(card, index) in content.contentCards" :key="index" class="mb-4 p-3 border rounded-lg space-y-2">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-medium">卡片 {{ index + 1 }}</span>
                        <button @click="removeCard(index)"
                                class="text-red-500 text-sm border border-red-500 bg-red-100 px-2 py-0.5 rounded hover:bg-red-200 transition-colors"
                            v-if="content.contentCards.length > 1">
                            删除
                        </button>
                    </div>
                    <textarea v-model="card.title" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="卡片标题" rows="1"></textarea>
                    <textarea v-model="card.body" @input="adjustTextareaHeight" class="w-full px-3 py-2 border rounded-lg" placeholder="卡片内容 (支持 Markdown 格式)" rows="4"></textarea>
                </div>
                <button @click="addCard"
                    class="w-full py-2 border border-solid border-xhs-pink rounded-lg text-xhs-pink hover:bg-xhs-pink hover:text-white transition-colors">
                    添加卡片
                </button>
            </div>

            <div class="mb-6">
                <h3 class="text-lg font-medium mb-2">小红书主文案</h3>
                <textarea v-model="content.mainText" class="w-full px-3 py-2 border rounded-lg"
                    placeholder="输入小红书笔记主文案"
                    rows="6"></textarea>
            </div>

        </div>

        <div class="mt-6 pt-4 border-t border-gray-200 flex gap-4">
             <button @click="$emit('save-content')"
                class="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                生成 JS 文件供下载
            </button>
             <button @click="copyMainText"
                class="flex-1 py-2 bg-xhs-pink text-white rounded-lg hover:bg-opacity-90 transition-colors">
                复制主文案
            </button>
        </div>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue';
import Template1 from '../templates/Template1.vue';
import Template2 from '../templates/Template2.vue';
import Template3 from '../templates/Template3.vue';
import Template5 from '../templates/Template5.vue';

export default {
    name: 'CardConfig',
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
        'save-content'
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
                body: '在这里输入卡片内容...'
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
            adjustTextareaHeight
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
</style>