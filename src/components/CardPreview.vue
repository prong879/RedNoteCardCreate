<template>
    <div class="card-preview">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">卡片预览 (模板: {{ template }})</h2>
            <button @click="exportAllCards"
                class="px-4 py-1 bg-xhs-pink text-white rounded-lg text-sm hover:bg-opacity-90 transition-colors">
                导出全部卡片
            </button>
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
                    <button @click="exportSingleCard($refs.coverCard, '封面卡片')"
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
                    <button @click="exportSingleCard($refs[`contentCard${index}`][0], `内容卡片_${index + 1}`)"
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
import { exportCardAsImage, exportCardsAsImages, copyTextToClipboard } from '../utils/cardExport';

// 导入所有模板组件
import Template1 from '../templates/Template1.vue';
import Template2 from '../templates/Template2.vue';
import Template3 from '../templates/Template3.vue';
// 移除 Template4 导入
// import Template4 from '../templates/Template4.vue';
import Template5 from '../templates/Template5.vue'; // 导入新模板

export default {
    name: 'CardPreview',
    // 移除 Template4 组件注册
    components: { Template1, Template2, Template3, Template5 }, // 注册新模板
    props: {
        template: {
            type: String,
            required: true
        },
        content: {
            type: Object,
            required: true
        },
        focusedIndex: {
            type: Number,
            default: null
        }
    },
    emits: ['reset-focus'],
    setup(props, { emit }) {
        // 根据传入的 template prop 计算当前应使用的模板组件
        const activeTemplateComponent = computed(() => {
            switch (props.template) {
                case 'template1':
                    return Template1;
                case 'template2':
                    return Template2;
                case 'template3':
                    return Template3;
                // 移除 Template4 case
                // case 'template4':
                //     return Template4;
                case 'template5': // 添加新模板 case
                    return Template5;
                default:
                    return Template1; // 默认使用模板1
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
        // 新增：获取可导出卡片元素的辅助方法
        _getExportableCardElement(containerElement) {
            if (!containerElement) {
                console.warn('尝试获取卡片元素但容器元素不存在');
                return null;
            }
            const actualCard = containerElement.querySelector('.card');
            if (!actualCard) {
                console.warn('在容器元素内找不到 .card 元素', containerElement);
            }
            return actualCard;
        },

        // 修改：使用辅助方法
        async exportSingleCard(cardElement, fileName) {
            try {
                const actualCard = this._getExportableCardElement(cardElement); // 使用辅助函数
                if (!actualCard) {
                    throw new Error("找不到可导出的卡片元素 (.card)");
                }
                await exportCardAsImage(actualCard, fileName);
                alert(`成功导出 ${fileName}`);
            } catch (error) {
                console.error('导出失败:', error);
                alert('导出失败: ' + error.message);
            }
        },

        // 修改：使用辅助方法
        async exportAllCards() {
            try {
                const cardsToExport = [];

                // 获取封面卡片元素
                const coverCardContainer = this.$refs.coverCard;
                const coverCardElement = this._getExportableCardElement(coverCardContainer); // 使用辅助函数
                if (coverCardElement) {
                    cardsToExport.push(coverCardElement);
                }

                // 获取内容卡片元素
                this.content.contentCards.forEach((_, index) => {
                    // 修改：直接访问 setup 返回的 ref 数组
                    const contentCardContainer = this.contentCardRefs?.[index]; 
                    const contentCardElement = this._getExportableCardElement(contentCardContainer); // 使用辅助函数
                    if (contentCardElement) {
                        cardsToExport.push(contentCardElement);
                    } else {
                        // 添加日志帮助调试
                        console.warn(`在导出全部卡片时，未找到索引 ${index} 的内容卡片的可导出元素 (.card)。容器元素:`, contentCardContainer);
                    }
                });

                if (cardsToExport.length === 0) {
                    alert("没有可导出的卡片元素。");
                    return;
                }

                // 添加日志：如果只找到封面卡片
                if (cardsToExport.length === 1 && coverCardElement) {
                    console.warn("只找到了封面卡片用于导出，请检查内容卡片的 ref 获取或模板内是否存在 .card 元素。");
                }

                const result = await exportCardsAsImages(cardsToExport, this.content.title);

                if (result.success) {
                    alert(result.message);
                } else {
                    alert('导出出错: ' + result.message);
                }
            } catch (error) {
                console.error('批量导出失败:', error);
                alert('批量导出失败: ' + error.message);
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
    /* width: 320px; */ /* 移除冗余宽度，由模板内部 w-80 控制 */
}

/* Markdown 样式现在由各自的模板组件处理 */
</style>