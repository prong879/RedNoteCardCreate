<template>
    <div class="card-config">
        <h2 class="text-xl font-semibold mb-4">卡片配置</h2>

        <!-- 模板选择 -->
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

        <!-- 标题配置 (移到下方封面卡片框内) -->
        <!-- <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">主题标题 (封面)</h3>
            <input v-model="content.coverCard.title" class="w-full px-3 py-2 border rounded-lg" placeholder="输入封面标题"
                @input="updateContent" />
        </div> -->

        <!-- 封面卡片配置 -->
        <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">封面卡片</h3>
            <!-- 将封面标题和副标题放入框内 -->
            <div class="p-3 border rounded-lg">
                <textarea v-model="content.coverCard.title" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="输入封面标题"
                    rows="1" @input="adjustTextareaHeight"></textarea>
                <textarea v-model="content.coverCard.subtitle" class="w-full px-3 py-2 border rounded-lg dynamic-textarea"
                    placeholder="输入副标题" rows="2" @input="adjustTextareaHeight"></textarea>
            </div>
        </div>

        <!-- 内容卡片配置 -->
        <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">内容卡片</h3>

            <div v-for="(card, index) in content.contentCards" :key="index" class="mb-4 p-3 border rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">卡片 {{ index + 1 }}</span>
                    <button @click="removeCard(index)"
                            class="text-red-500 text-sm border border-red-500 bg-red-100 px-2 py-0.5 rounded hover:bg-red-200 transition-colors"
                        v-if="content.contentCards.length > 1">
                        删除
                    </button>
                </div>

                <textarea v-model="card.title" class="w-full px-3 py-2 border rounded-lg mb-2 dynamic-textarea hide-scrollbar" placeholder="卡片标题"
                    rows="1" @input="adjustTextareaHeight"></textarea>

                <textarea v-model="card.body" class="w-full px-3 py-2 border rounded-lg dynamic-textarea"
                    placeholder="卡片内容 (支持 Markdown 格式)" rows="4" @input="adjustTextareaHeight"></textarea>
            </div>

            <button @click="addCard"
                class="w-full py-2 border border-solid border-xhs-pink rounded-lg text-xhs-pink hover:bg-xhs-pink hover:text-white transition-colors">
                添加卡片
            </button>
        </div>

        <!-- 主文案配置 -->
        <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">小红书主文案</h3>
            <textarea v-model="content.mainText" class="w-full px-3 py-2 border rounded-lg dynamic-textarea" placeholder="输入小红书笔记主文案"
                rows="6" @input="adjustTextareaHeight"></textarea>
        </div>

        <!-- 导出主文案按钮 -->
        <button @click="copyMainText"
            class="w-full py-2 bg-xhs-pink text-white rounded-lg hover:bg-opacity-90 transition-colors">
            复制主文案
        </button>
    </div>
</template>

<script>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
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
        }
    },
    emits: ['update:template', 'update:content'],
    setup(props, { emit }) {
        const content = ref({});
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
        const previewCoverContent = ref({ title: '标题', subtitle: '副标题' });

        const templateItemRefs = ref([]);
        const scalingDivRefs = ref([]);

        watch(() => props.cardContent, (newVal) => {
            content.value = { ...newVal };
        }, { deep: true, immediate: true });

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

        onMounted(() => {
             nextTick(() => {
                  resizeObserver = new ResizeObserver(entries => {
                      updateScale();
                  });

                  templateItemRefs.value.forEach(el => {
                      if (el) {
                          resizeObserver.observe(el);
                      }
                  });
                  updateScale();
             });
        });

        onBeforeUnmount(() => {
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
        });

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
            const textarea = event.target;
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
            updateContent();
        };

        const addCard = () => {
            if (!content.value.contentCards) {
                 content.value.contentCards = [];
            }
            content.value.contentCards.push({
                title: '新卡片标题',
                body: '在这里输入卡片内容...'
            });
            updateContent();
        };

        const removeCard = (index) => {
             if (content.value.contentCards && content.value.contentCards.length > 1) {
                 content.value.contentCards.splice(index, 1);
                 updateContent();
            }
        };

        const copyMainText = () => {
            navigator.clipboard.writeText(content.value.mainText || '')
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
            templatesInfo,
            previewCoverContent,
            templateItemRefs,
            scalingDivRefs,
            getTemplateComponent,
            selectTemplate,
            updateContent,
            addCard,
            removeCard,
            copyMainText,
            adjustTextareaHeight
        };
    }
}
</script>

<style scoped>
/* 为动态调整高度的 textarea 添加基础样式 */
.dynamic-textarea {
    resize: none; /* 禁止用户手动调整大小 */
    overflow-y: auto; /* 默认允许垂直滚动 */
    min-height: calc(1.5em + 1rem + 2px); /* 根据行高、内边距和边框计算一个大致的最小高度，防止初始太扁 */
    /* line-height: 1.5; /* 可以明确设置行高 */
}

/* 为标题等不需要滚动条的 textarea 隐藏滚动条 */
.dynamic-textarea.hide-scrollbar {
    overflow-y: hidden;
}
</style>