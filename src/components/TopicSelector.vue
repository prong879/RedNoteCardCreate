<template>
    <div class="topic-selector mb-8">
        <h2 class="text-xl font-semibold mb-4">选择内容选题</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="topic in topics" :key="topic.id"
                class="topic-card relative p-4 bg-white border border-gray-200 rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-all flex flex-col"
                @click="selectTopic(topic.id)">
                <div v-if="savedTopicInfo[topic.id]?.exists"
                     class="absolute top-2 right-2 bg-xhs-pink text-white text-xs font-bold px-1.5 py-0.5 rounded-full z-10">
                    {{ savedTopicInfo[topic.id]?.cardCount }} 张
                </div>
                <div class="flex-grow">
                    <h3 class="font-medium mb-2 text-gray-800 pr-12">{{ topic.title }}</h3>
                    <p class="text-sm text-gray-500 mb-4">{{ topic.description }}</p>
                </div>
                <button
                    class="mt-auto w-full py-1 text-xs border border-xhs-pink text-xhs-pink rounded hover:bg-xhs-pink hover:text-white transition-colors">
                    {{ savedTopicInfo[topic.id]?.exists ? '加载已存文案' : '开始创作新文案' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { topicsMeta } from '../content/topicsMeta';

const emit = defineEmits(['select-topic']);

const topics = ref(topicsMeta);
const savedTopicInfo = reactive({});

onMounted(() => {
    topics.value.forEach(topic => {
        const savedContentJson = localStorage.getItem(`cardgen_topic_content_${topic.id}`);
        if (savedContentJson) {
            try {
                const savedContent = JSON.parse(savedContentJson);
                const cardCount = 1 + (Array.isArray(savedContent.contentCards) ? savedContent.contentCards.length : 0);
                savedTopicInfo[topic.id] = { exists: true, cardCount: cardCount };
            } catch (e) {
                console.error(`Error parsing saved content for topic ${topic.id}:`, e);
                savedTopicInfo[topic.id] = { exists: false, cardCount: 0 };
            }
        } else {
            savedTopicInfo[topic.id] = { exists: false, cardCount: 0 };
        }
    });
});

const selectTopic = (topicId) => {
    emit('select-topic', { key: topicId });
};
</script>