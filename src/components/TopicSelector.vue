<template>
    <div class="topic-selector mb-8">
        <h2 class="text-xl font-semibold mb-4">选择内容选题</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="topic in topics" :key="topic.id"
                class="topic-card relative p-4 bg-white border border-gray-200 rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-all flex flex-col"
                @click="selectTopic(topic.id)">
                <div v-if="savedTopicInfo[topic.id]?.cardCount > 0"
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

onMounted(async () => {
    await Promise.all(topics.value.map(async (topic) => {
        const savedContentJson = localStorage.getItem(`cardgen_topic_content_${topic.id}`);
        let cardCount = 0;
        let exists = false;

        if (savedContentJson) {
            try {
                const savedContent = JSON.parse(savedContentJson);
                cardCount = 1 + (Array.isArray(savedContent.contentCards) ? savedContent.contentCards.length : 0);
                exists = true;
            } catch (e) {
                console.error(`解析已存内容时出错 (topic ${topic.id}):`, e);
                exists = false;
            }
        }

        if (!exists) {
            let path = '';
            try {
                path = `../content/${topic.id}_content.js`;
                const contentModule = await import(/* @vite-ignore */ path);

                const exportName = `${topic.id}_contentData`;
                const originalTopic = contentModule[exportName];

                if (originalTopic && originalTopic.contentCards) {
                    cardCount = 1 + (Array.isArray(originalTopic.contentCards) ? originalTopic.contentCards.length : 0);
                } else {
                     console.warn(`动态导入成功但未找到正确导出的内容或内容卡片 (ID: ${topic.id}, Expected Export: ${exportName}, Path: ${path})`);
                     cardCount = 1;
                }
                exists = false;
            } catch (importError) {
                console.error(`动态导入原始内容失败 (ID: ${topic.id}, Path: ${path}):`, importError);
                cardCount = 1;
                exists = false;
            }
        }
        savedTopicInfo[topic.id] = { exists: exists, cardCount: cardCount };
    }));
});

const selectTopic = (topicId) => {
    emit('select-topic', { key: topicId });
};
</script>