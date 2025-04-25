<template>
    <div class="topic-selector mb-8">
        <h2 class="text-xl font-semibold mb-4">选择内容选题</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="(topic, index) in topics" :key="topic.id"
                class="topic-card relative p-4 bg-white border border-gray-200 rounded-lg cursor-pointer shadow-md hover:shadow-2xl hover:scale-105 transition-all flex flex-col overflow-hidden">
                <div class="absolute top-0 right-1 font-serif italic text-gray-200 opacity-80 z-0 select-none">
                    <span class="text-5xl">{{ getOrdinal(index + 1).number }}</span>
                    <span class="text-xl align-bottom ml-[-0.1em]">{{ getOrdinal(index + 1).suffix }}</span>
                </div>
                <div v-if="savedTopicInfo[topic.id]?.cardCount > 0"
                     class="absolute bottom-4 right-4 bg-xhs-pink text-white text-xs font-bold px-1.5 py-0.5 rounded-full z-10">
                    {{ savedTopicInfo[topic.id]?.cardCount }} 张
                </div>
                <div class="flex-grow z-10 relative">
                    <h3 class="font-medium mb-2 text-gray-800 pr-16">{{ topic.title }}</h3>
                    <p class="text-sm text-gray-500 mb-4">{{ topic.description }}</p>
                </div>
                <div class="z-10 relative">
                    <button
                        @click="selectTopic(topic.id)"
                        class="bg-xhs-pink hover:bg-xhs-pink-dark text-white font-bold py-1 px-6 rounded text-sm mr-2">
                        选择话题
                    </button>
                    <button
                        @click="generatePrompt(topic)"
                        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                        生成Prompt
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import { topicsMeta } from '../content/topicsMeta';
import { useToast } from "vue-toastification";
import promptTemplate from '../prompts/knowledge_card_prompt.md?raw';

const emit = defineEmits(['select-topic']);
const toast = useToast();

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

// 序数词格式化函数 - 返回对象
function getOrdinal(n) {
    if (typeof n !== 'number' || n < 1) return { number: n, suffix: '' }; // 处理无效输入
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    const suffix = s[(v - 20) % 10] || s[v] || s[0];
    return { number: n, suffix: suffix };
}


// 生成并显示 Prompt 的方法
const generatePrompt = (topic) => {
    if (!topic || !topic.id || !topic.title) {
        console.error('Invalid topic object passed to generatePrompt:', topic);
        toast.error('无法生成 Prompt：无效的选题信息。');
        return;
    }
    
    // 替换模板中的占位符
    let generatedPrompt = promptTemplate.replace('[在此处插入你想生成的选题标题或编号]', topic.title);
    generatedPrompt = generatedPrompt.replace('[建议的 topicId，例如 topic01]', topic.id);
    
    // 尝试复制到剪贴板
    try {
        if (!navigator.clipboard) {
            throw new Error('Clipboard API not available');
        }
        navigator.clipboard.writeText(generatedPrompt).then(() => {
            // 修改成功提示信息，包含换行和主题标题
            const successMessage = `Prompt已成功复制到剪切板！\n主题：${topic.title}`;
            toast.success(successMessage); // 使用新的成功提示
        }, (err) => {
            console.error('无法复制 Prompt 到剪贴板:', err);
            toast.error('自动复制失败，请手动复制 Prompt (已打印到控制台)。');
            console.log("请手动复制以下 Prompt:\n", generatedPrompt);
        });
    } catch (err) {
        console.error('复制 Prompt 时出错 (Clipboard API 可能不可用):', err);
        toast.error('浏览器不支持自动复制，请手动复制 Prompt (已打印到控制台)。');
        console.log("请手动复制以下 Prompt:\n", generatedPrompt);
    }
};
</script>