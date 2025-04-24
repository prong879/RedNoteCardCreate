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

// 使用 import.meta.glob 获取所有 content 文件信息
// 注意：路径是相对于当前文件的，所以是 '../content/'
const contentModules = import.meta.glob('../content/*_content.js'); // 非 eager 模式

onMounted(async () => {
    // 构建一个简单的查找表，将 topicId 映射到期望的文件路径键 (相对于当前文件)
    const expectedPathKeys = {};
    topics.value.forEach(topic => {
        expectedPathKeys[topic.id] = `../content/${topic.id}_content.js`;
    });

    await Promise.all(topics.value.map(async (topic) => {
        const savedContentJson = localStorage.getItem(`cardgen_topic_content_${topic.id}`);
        let cardCount = 0;
        let existsInLocalStorage = false; // 重命名以区分文件是否存在

        if (savedContentJson) {
            try {
                const savedContent = JSON.parse(savedContentJson);
                cardCount = 1 + (Array.isArray(savedContent.contentCards) ? savedContent.contentCards.length : 0);
                existsInLocalStorage = true;
            } catch (e) {
                console.error(`解析 localStorage 内容时出错 (topic ${topic.id}):`, e);
                existsInLocalStorage = false;
            }
        }

        // 如果 localStorage 中不存在，尝试检查原始文件是否存在并获取卡片数
        if (!existsInLocalStorage) {
            const expectedPathKey = expectedPathKeys[topic.id];
            // 检查 import.meta.glob 的结果中是否有这个文件
            if (contentModules[expectedPathKey]) {
                try {
                    // 调用动态导入函数加载模块
                    const moduleLoader = contentModules[expectedPathKey];
                    const contentModule = await moduleLoader();
                    const exportName = `${topic.id}_contentData`;
                    const originalTopic = contentModule[exportName];

                    if (originalTopic && originalTopic.contentCards) {
                        cardCount = 1 + (Array.isArray(originalTopic.contentCards) ? originalTopic.contentCards.length : 0);
                    } else {
                        // 文件存在但导出不正确或没有内容卡片
                        console.warn(`原始文件模块加载成功但未找到有效内容 (ID: ${topic.id}, Path: ${expectedPathKey})`);
                        cardCount = 1; // 至少有封面
                    }
                } catch (loadError) {
                    // 文件存在但加载模块失败
                    console.error(`加载原始文件模块失败 (ID: ${topic.id}, Path: ${expectedPathKey}):`, loadError);
                    cardCount = 1; // 出错了，默认算一张
                }
            } else {
                // 文件在 import.meta.glob 中未找到，即原始文件不存在
                console.warn(`原始文件未找到 (ID: ${topic.id}, Path: ${expectedPathKey})`);
                cardCount = 1; // 文件不存在，默认算一张（封面）
            }
        }
        // 注意：按钮显示文字的逻辑依赖 existsInLocalStorage
        savedTopicInfo[topic.id] = { exists: existsInLocalStorage, cardCount: cardCount };
    }));
});

const selectTopic = (topicId) => {
    emit('select-topic', { key: topicId });
};
</script>