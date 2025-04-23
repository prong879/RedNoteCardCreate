<template>
    <div class="card-preview">
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-semibold">卡片预览 (模板: {{ template }})</h2>
            <button @click="exportAllCards"
                class="px-4 py-1 bg-xhs-pink text-white rounded-lg text-sm hover:bg-opacity-90 transition-colors">
                导出全部卡片
            </button>
        </div>

        <div class="flex overflow-x-auto pb-4 gap-4">
            <!-- 封面卡片 -->
            <div class="card-container flex-shrink-0">
                <div ref="coverCard">
                    <component :is="activeTemplateComponent" type="cover"
                        :title="content.coverCard.title"
                        :content="content.coverCard" />
                </div>
                <div class="mt-2 text-center text-sm text-xhs-gray">
                    封面卡片
                    <button @click="exportSingleCard($refs.coverCard, '封面卡片')" class="ml-2 text-xhs-pink text-xs">
                        导出
                    </button>
                </div>
            </div>

            <!-- 内容卡片 -->
            <div v-for="(card, index) in content.contentCards" :key="index" class="card-container flex-shrink-0">
                <div :ref="`contentCard${index}`">
                    <component :is="activeTemplateComponent" type="content" :content="card" />
                </div>
                <div class="mt-2 text-center text-sm text-xhs-gray">
                    内容卡片 {{ index + 1 }}
                    <button @click="exportSingleCard($refs[`contentCard${index}`][0], `内容卡片_${index + 1}`)"
                        class="ml-2 text-xhs-pink text-xs">
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
import { computed } from 'vue';
import { exportCardAsImage, exportCardsAsImages, copyTextToClipboard } from '../utils/cardExport';

// 导入所有模板组件
import Template1 from '../templates/Template1.vue';
import Template2 from '../templates/Template2.vue';
import Template3 from '../templates/Template3.vue';
import Template4 from '../templates/Template4.vue';
import Template5 from '../templates/Template5.vue'; // 导入新模板

export default {
    name: 'CardPreview',
    components: { Template1, Template2, Template3, Template4, Template5 }, // 注册新模板
    props: {
        template: {
            type: String,
            required: true
        },
        content: {
            type: Object,
            required: true
        }
    },
    setup(props) {
        // 根据传入的 template prop 计算当前应使用的模板组件
        const activeTemplateComponent = computed(() => {
            switch (props.template) {
                case 'template1':
                    return Template1;
                case 'template2':
                    return Template2;
                case 'template3':
                    return Template3;
                case 'template4':
                    return Template4;
                case 'template5': // 添加新模板 case
                    return Template5;
                default:
                    return Template1; // 默认使用模板1
            }
        });

        return { activeTemplateComponent };
    },
    methods: {
        // 导出和复制方法保持不变
        async exportSingleCard(cardElement, fileName) {
            try {
                // 注意：需要导出 cardElement 内部的实际卡片DOM，而不是外层div
                const actualCard = cardElement.querySelector('.xhs-card');
                if (!actualCard) {
                    throw new Error("找不到卡片元素");
                }
                await exportCardAsImage(actualCard, fileName);
                alert(`成功导出 ${fileName}`);
            } catch (error) {
                console.error('导出失败:', error);
                alert('导出失败: ' + error.message);
            }
        },

        async exportAllCards() {
            try {
                const cardsToExport = [];

                // 获取封面卡片元素
                const coverCardElement = this.$refs.coverCard?.querySelector('.xhs-card');
                if (coverCardElement) {
                    cardsToExport.push(coverCardElement);
                }

                // 获取内容卡片元素
                this.content.contentCards.forEach((_, index) => {
                    const contentCardElement = this.$refs[`contentCard${index}`]?.[0]?.querySelector('.xhs-card');
                    if (contentCardElement) {
                        cardsToExport.push(contentCardElement);
                    }
                });

                if (cardsToExport.length === 0) {
                    alert("没有可导出的卡片元素。");
                    return;
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