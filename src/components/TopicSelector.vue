<template>
    <div class="topic-selector mb-8">
        <h2 class="text-xl font-semibold mb-4">选择内容选题</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="(topic, key) in topics" :key="key"
                class="topic-card p-4 border rounded-lg cursor-pointer hover:border-xhs-pink transition-all"
                @click="selectTopic(key, topic)">
                <h3 class="font-medium mb-2">{{ topic.title }}</h3>
                <p class="text-sm text-gray-500 mb-1">{{ getCardCount(topic) }}张卡片</p>
                <div class="text-xs text-xhs-gray truncate">{{ topic.mainText.substring(0, 60) }}...</div>

                <button
                    class="mt-2 w-full py-1 text-xs border border-xhs-pink text-xhs-pink rounded hover:bg-xhs-pink hover:text-white transition-colors">
                    加载此选题
                </button>
            </div>
        </div>
    </div>
</template>

<script>
import topicTemplates from '../content/topicTemplates';

export default {
    name: 'TopicSelector',
    emits: ['select-topic'],
    data() {
        return {
            topics: topicTemplates
        }
    },
    methods: {
        selectTopic(key, topic) {
            this.$emit('select-topic', { key, content: topic });
        },
        getCardCount(topic) {
            // 计算卡片总数（封面卡片 + 内容卡片）
            return 1 + (topic.contentCards ? topic.contentCards.length : 0);
        }
    }
}
</script>