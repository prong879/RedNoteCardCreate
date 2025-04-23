<template>
    <div class="card-config">
        <h2 class="text-xl font-semibold mb-4">卡片配置</h2>

        <!-- 模板选择 -->
        <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">选择模板</h3>
            <div class="grid grid-cols-3 gap-4">
                <div v-for="(template, index) in templates" :key="index" @click="selectTemplate(template.id)"
                    class="template-item p-2 border rounded-lg cursor-pointer transition-all"
                    :class="{ 'border-xhs-pink': selectedTemplate === template.id }">
                    <div class="aspect-[9/16] bg-gray-100 rounded flex items-center justify-center"
                        :class="template.color">
                        <span class="text-xs">{{ template.name }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 标题配置 -->
        <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">主题标题</h3>
            <input v-model="content.title" class="w-full px-3 py-2 border rounded-lg" placeholder="输入标题"
                @input="updateContent" />
        </div>

        <!-- 封面卡片配置 -->
        <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">封面卡片</h3>
            <textarea v-model="content.coverCard.subtitle" class="w-full px-3 py-2 border rounded-lg"
                placeholder="输入副标题" rows="2" @input="updateContent"></textarea>
        </div>

        <!-- 内容卡片配置 -->
        <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">内容卡片</h3>

            <div v-for="(card, index) in content.contentCards" :key="index" class="mb-4 p-3 border rounded-lg">
                <div class="flex justify-between items-center mb-2">
                    <span class="font-medium">卡片 {{ index + 1 }}</span>
                    <button @click="removeCard(index)" class="text-red-500 text-sm"
                        v-if="content.contentCards.length > 1">
                        删除
                    </button>
                </div>

                <input v-model="card.title" class="w-full px-3 py-2 border rounded-lg mb-2" placeholder="卡片标题"
                    @input="updateContent" />

                <textarea v-model="card.content" class="w-full px-3 py-2 border rounded-lg"
                    placeholder="卡片内容 (支持 Markdown 格式)" rows="4" @input="updateContent"></textarea>
            </div>

            <button @click="addCard"
                class="w-full py-2 border border-dashed rounded-lg text-xhs-gray hover:text-xhs-pink hover:border-xhs-pink transition-colors">
                添加卡片
            </button>
        </div>

        <!-- 主文案配置 -->
        <div class="mb-6">
            <h3 class="text-lg font-medium mb-2">小红书主文案</h3>
            <textarea v-model="content.mainText" class="w-full px-3 py-2 border rounded-lg" placeholder="输入小红书笔记主文案"
                rows="6" @input="updateContent"></textarea>
        </div>

        <!-- 导出主文案按钮 -->
        <button @click="copyMainText"
            class="w-full py-2 bg-xhs-pink text-white rounded-lg hover:bg-opacity-90 transition-colors">
            复制主文案
        </button>
    </div>
</template>

<script>
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
    data() {
        return {
            content: { ...this.cardContent },
            templates: [
                { id: 'template1', name: '模板1', color: 'bg-pink-100' },
                { id: 'template2', name: '模板2', color: 'bg-blue-100' },
                { id: 'template3', name: '模板3', color: 'bg-yellow-100' }
            ]
        }
    },
    methods: {
        selectTemplate(templateId) {
            this.$emit('update:template', templateId)
        },
        updateContent() {
            this.$emit('update:content', this.content)
        },
        addCard() {
            this.content.contentCards.push({
                title: '新卡片标题',
                content: '在这里输入卡片内容...'
            })
            this.updateContent()
        },
        removeCard(index) {
            if (this.content.contentCards.length > 1) {
                this.content.contentCards.splice(index, 1)
                this.updateContent()
            }
        },
        copyMainText() {
            navigator.clipboard.writeText(this.content.mainText)
                .then(() => {
                    alert('主文案已复制到剪贴板！')
                })
                .catch(err => {
                    console.error('无法复制文本: ', err)
                })
        }
    },
    watch: {
        cardContent: {
            handler(newVal) {
                this.content = { ...newVal }
            },
            deep: true
        }
    }
}
</script>