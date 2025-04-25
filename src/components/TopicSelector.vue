<template>
    <div class="topic-selector mb-8">
        <h2 class="text-xl font-semibold mb-4">选择内容选题</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="topic in topics" :key="topic.id"
                class="topic-card relative p-4 bg-white border border-gray-200 rounded-lg cursor-pointer shadow-md hover:shadow-lg transition-all flex flex-col">
                <div v-if="savedTopicInfo[topic.id]?.cardCount > 0"
                     class="absolute top-2 right-2 bg-xhs-pink text-white text-xs font-bold px-1.5 py-0.5 rounded-full z-10">
                    {{ savedTopicInfo[topic.id]?.cardCount }} 张
                </div>
                <div class="flex-grow">
                    <h3 class="font-medium mb-2 text-gray-800 pr-12">{{ topic.title }}</h3>
                    <p class="text-sm text-gray-500 mb-4">{{ topic.description }}</p>
                </div>
                <div>
                    <button
                        @click="selectTopic(topic.id)"
                        class="bg-xhs-pink hover:bg-xhs-pink-dark text-white font-bold py-1 px-3 rounded text-sm mr-2">
                        选择
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

// 定义 Prompt 模板 (使用反引号允许多行字符串)
const promptTemplate = `# 指令：生成小红书知识卡片 Markdown 文案

## 角色
你是一位精通时间序列分析的知识博主，擅长将复杂的概念转化为清晰、简洁、易于理解的小红书图文笔记内容。

## 背景
我提供了一份详细的时间序列知识文档 \`【文字版】时间序列数据.md\` 作为核心知识库，以及一份基于该文档梳理的选题列表 \`选题库.md\`。现在，我需要你根据指定的选题，创作一篇符合特定 Markdown 格式规范（源自项目 \`README.md\`）的小红书知识卡片文案。

## 任务
根据以下指定的选题，并严格参考 \`【文字版】时间序列数据.md\` 中的相关内容，生成一篇完整的 Markdown 格式文件。

**本期选题：** [在此处插入你想生成的选题标题或编号]

## Markdown 输出格式要求 (必须严格遵守):

请严格按照以下规则构建 Markdown 文件内容，这些规则与项目 \`README.md\` 中定义的一致：

1.  **YAML Front Matter**:
    *   文件必须以 \`---\` 包裹的 YAML Front Matter 开头。
    *   \`topicId\`: (必需) 设置为 \`[建议的 topicId，例如 topic01]\`。**请确保与我指定的 ID 一致。**
    *   \`title\`: (必需) 设置为本期选题的**主标题**，例如 \`"【小白入门】什么是时间序列数据？"\`。
    *   \`headerText\`: (可选) 可根据内容设置全局页眉，若无则留空 \`""\`。
    *   \`footerText\`: (可选) 可根据内容设置全局页脚 (支持 \`\\n\` 换行)，若无则留空 \`""\`。
    *   \`mainText\`: **忽略此字段，或将其注释掉 (\`# mainText: ...\`)**。主文案必须在正文末尾定义。
    *   \`coverShowHeader\`: (可选, 默认 \`true\`) 根据需要设置封面页眉显隐。
    *   \`coverShowFooter\`: (可选, 默认 \`true\`) 根据需要设置封面页脚显隐。
    *   \`contentDefaultShowHeader\`: (可选, 默认 \`true\`) 设置内容卡片页眉默认显隐。
    *   \`contentDefaultShowFooter\`: (可选, 默认 \`true\`) 设置内容卡片页脚默认显隐。

2.  **卡片分隔符**:
    *   使用 \`---\` (三个短横线，单独一行) 分隔封面卡片和内容卡片，以及内容卡片之间。

3.  **封面卡片 (Front Matter 后，第一个 \`---\` 前)**:
    *   **封面标题 (\`coverCard.title\`)**: 查找并使用此区域的**第一个一级标题 (\`# \`)** 作为封面标题 (会覆盖 Front Matter 中的 \`title\` 用于显示)。**允许使用 Markdown 和 LaTeX**。
    *   **封面副标题 (\`coverCard.subtitle\`)**: 封面标题行之后的**所有非空行**内容作为副标题。**只支持纯文本和换行 (\`\\n\`)，不支持 Markdown/LaTeX。**

4.  **内容卡片 (每个 \`---\` 之后)**:
    *   **卡片标题 (\`contentCards[i].title\`)**: 查找并使用每个内容块的**第一个任意级别标题 (\`# \`, \`## \` 等)** 作为卡片标题。**允许使用 Markdown 和 LaTeX**。
    *   **卡片正文 (\`contentCards[i].body\`)**: 标题行之后的**所有内容** (直到下一个 \`---\` 或 \`## Main Text\`) 作为正文。**允许使用 Markdown 和 LaTeX**。
    *   **显隐覆盖**: (可选) 可在正文中使用 \`<!-- cardShowHeader: false -->\` 或 \`<!-- cardShowFooter: true -->\` 单独控制该卡片的页眉页脚显隐。

5.  **主文案 (\`mainText\`) 定义 (必需)**:
    *   **必须**在**所有卡片内容结束之后** (即最后一个 \`---\` 之后)，添加一个固定的二级标题：\`## Main Text\` 或 \`## 主文案\`。
    *   该标题之后的**所有内容**，直到文件末尾，将被提取为 \`mainText\`。
    *   **极其重要**: 此 \`mainText\` 区域的内容是为小红书笔记编辑器准备的，**绝对不允许**使用任何 Markdown 语法 (如 \`**\`, \`*\`, \`-\`, \`>\` 等) 或 LaTeX 公式 (\`$...\$ \`, \`$$...\$$\`)。**只允许使用纯文本、换行符 (\`\\n\`)、Emoji 表情符号和 \`#话题标签#\`。**

6.  **内容风格**:
    *   语言应简洁明了，通俗易懂，符合小红书用户的阅读习惯。
    *   对于复杂概念，可适当使用比喻或简单实例 (参考 \`【文字版】时间序列数据.md\` 中的例子)。
    *   内容卡片数量和每张卡片的内容量应适中，避免信息过载。建议 3-6 张内容卡片。

## 输出要求
*   直接输出符合上述所有规范的完整 Markdown 文件内容。
*   确保所有内容均基于 \`【文字版】时间序列数据.md\`，准确无误。
*   严格遵守 Markdown 格式限制，特别是 \`mainText\` 区域的限制。
`;

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