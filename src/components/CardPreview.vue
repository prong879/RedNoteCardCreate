<template>
    <div class="card-preview">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">卡片预览</h2>
            <div class="flex gap-2">
                <button @click="exportAllAsImages" class="px-4 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition-colors">导出所有图片</button>
                <button @click="exportAllAsZip" class="px-4 py-1 bg-xhs-pink text-white rounded-lg text-sm hover:bg-opacity-90 transition-colors">打包下载 (ZIP)</button>
            </div>
        </div>

        <div ref="previewScrollContainer" class="flex overflow-x-auto gap-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <!-- 封面卡片 -->
            <div class="card-container flex-shrink-0">
                <div ref="coverCard">
                    <component :is="activeTemplateComponent" type="cover"
                        :title="content.coverCard.title"
                        :content="content.coverCard"
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
                         :content="card"
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

        <div class="mt-6">
            <h3 class="text-lg font-medium mb-2">主文案预览</h3>
            <div class="p-4 bg-gray-50 rounded-lg whitespace-pre-line">
                {{ content.mainText }}
            </div>
            <button @click="copyMainText"
                class="mt-2 px-4 py-1 bg-xhs-pink text-white rounded-lg text-sm hover:bg-opacity-90 transition-colors">
                复制主文案
            </button>
        </div>
    </div>
</template>

<script>
import { computed, ref, watch, onBeforeUpdate, nextTick } from 'vue';
import { exportCardAsImage, exportCardsAsImages, exportCardsAsZip, copyTextToClipboard } from '../utils/cardExport';

// 导入所有模板组件
import Template1 from '../templates/Template1.vue';
import Template2 from '../templates/Template2.vue';
import Template3 from '../templates/Template3.vue';
import Template5 from '../templates/Template5.vue';

export default {
    name: 'CardPreview',
    components: { Template1, Template2, Template3, Template5 },
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
        focusedIndex: {
            type: Number,
            default: null
        }
    },
    emits: ['reset-focus'],
    setup(props, { emit }) {
        const activeTemplateComponent = computed(() => {
            switch (props.template) {
                case 'template1':
                    return Template1;
                case 'template2':
                    return Template2;
                case 'template3':
                    return Template3;
                case 'template5':
                    return Template5;
                default:
                    return Template1;
            }
        });

        const previewScrollContainer = ref(null);
        const contentCardRefs = ref([]);

        onBeforeUpdate(() => {
            contentCardRefs.value = [];
        });

        watch(() => props.focusedIndex, (newIndex) => {
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

        return {
            activeTemplateComponent,
            previewScrollContainer,
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
            const actualCard = containerElement.querySelector('.xhs-card') || containerElement.querySelector('.card');
            if (!actualCard) {
                console.warn('在容器元素内找不到 .xhs-card 或 .card 元素', containerElement);
            }
            return actualCard;
        },

        async exportSingleCard(cardElement, fileName) {
            if (!this.topicId) {
                alert('无法获取主题ID，无法导出。');
                return;
            }
            try {
                const actualCard = this._getExportableCardElement(cardElement);
                if (!actualCard) {
                    throw new Error("找不到可导出的卡片元素(.xhs-card 或 .card)");
                }
                await exportCardAsImage(actualCard, fileName);
                alert(`成功导出 ${fileName}.png`);
            } catch (error) {
                console.error('导出失败:', error);
                alert('导出失败: ' + error.message);
            }
        },

        _getAllExportableElements() {
            const elements = [];
            const coverCardContainer = this.$refs.coverCard;
            const coverCardElement = this._getExportableCardElement(coverCardContainer);
            if (coverCardElement) {
                elements.push({ element: coverCardElement, type: 'cover', index: -1 });
            }

            this.content.contentCards.forEach((_, index) => {
                const contentCardContainer = this.contentCardRefs?.[index];
                const contentCardElement = this._getExportableCardElement(contentCardContainer);
                if (contentCardElement) {
                    elements.push({ element: contentCardElement, type: 'content', index: index });
                } else {
                    console.warn(`无法为索引 ${index} 的内容卡片找到可导出元素。`);
                }
            });
            return elements;
        },

        async exportAllAsImages() {
            if (!this.topicId) {
                alert('无法获取主题ID，无法导出。');
                return;
            }
            const elementsToExport = this._getAllExportableElements();
            if (elementsToExport.length === 0) {
                alert("没有可导出的卡片。");
                return;
            }
            console.log(`准备导出 ${elementsToExport.length} 张图片...`);
            try {
                await exportCardsAsImages(elementsToExport, this.topicId, this.getFormattedDate());
                alert('所有图片导出完成！');
            } catch(error) {
                console.error('批量导出图片失败:', error);
                alert('批量导出图片失败: ' + error.message);
            }
        },

        async exportAllAsZip() {
            if (!this.topicId) {
                alert('无法获取主题ID，无法导出。');
                return;
            }
            const elementsToExport = this._getAllExportableElements();
            if (elementsToExport.length === 0) {
                alert("没有可导出的卡片。");
                return;
            }
            console.log(`准备打包 ${elementsToExport.length} 张图片...`);
            try {
                await exportCardsAsZip(elementsToExport, this.topicId, this.getFormattedDate());
            } catch(error) {
                console.error('打包下载失败:', error);
                alert('打包下载失败: ' + error.message);
            }
        },

        async copyMainText() {
            try {
                const result = await copyTextToClipboard(this.content.mainText);
                if (result.success) {
                    alert('主文案已复制到剪贴板！');
                } else {
                    alert(result.message);
                }
            } catch (error) {
                console.error('复制失败:', error);
                alert('复制失败: ' + error.message);
            }
        }
    }
}
</script>

<style scoped>
.card-container {
    position: relative;
}
</style>