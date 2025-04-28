<template>
    <div class="topic-selector mb-8">
        <!-- 修改：将标题和开关放在同一行 -->
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">选择内容选题</h2>
            
            <!-- 新增按钮 -->
            <div class="flex items-center space-x-2">
                <button
                    @click="showCreateTopicModal = true"
                    class="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm">
                    <i class="fas fa-plus mr-1"></i> 新建选题 (MD)
                </button>
                <button
                    @click="triggerFileInput"
                    class="bg-purple-500 hover:bg-purple-700 text-white font-bold py-1 px-3 rounded text-sm">
                    <i class="fas fa-upload mr-1"></i> 导入/更新 (MD)
                </button>
                <input type="file" ref="fileInput" @change="handleFileImport" accept=".md" multiple hidden />
                <!-- 切换Prompt按钮可见性的开关 -->
                <label for="prompt-toggle" class="ml-4 mr-2 text-sm font-medium text-gray-700">显示 "生成Prompt":</label>
                <button
                    id="prompt-toggle"
                    @click="togglePromptButtons"
                    :class="[showPromptButtons ? 'bg-green-500' : 'bg-gray-300', 'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500']"
                    role="switch"
                    :aria-checked="showPromptButtons.toString()">
                    <span
                        aria-hidden="true"
                        :class="[showPromptButtons ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200']">
                    </span>
                </button>
            </div>
        </div>
        
        <!-- 新增：新建选题模态框 -->
        <CreateTopicModal
            v-if="showCreateTopicModal"
            @close="showCreateTopicModal = false"
            @create="handleCreateTopic"
        />

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
                    <!-- 修改：添加 v-show 指令 -->
                    <button
                        v-show="showPromptButtons"
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
import { ref, onMounted, reactive, watch } from 'vue';
import { topicsMeta as initialTopicsMeta } from '../content/topicsMeta'; // 重命名初始导入
import { useToast } from "vue-toastification";
import promptTemplate from '../prompts/knowledge_card_prompt.md?raw';
import { useCardStore } from '../stores/cardStore'; // 引入 store
import CreateTopicModal from './CreateTopicModal.vue'; // 引入模态框组件
import { saveAs } from 'file-saver'; // 引入 file-saver
import matter from 'gray-matter'; // 引入 gray-matter

const store = useCardStore(); // 获取 store 实例
const emit = defineEmits(['select-topic']);
const toast = useToast();

// 使用 store 中的 topics 代替本地 ref
// const topics = ref(topicsMeta); // 旧代码，替换为 store.topics
const savedTopicInfo = reactive({});
const showPromptButtons = ref(true);
const showCreateTopicModal = ref(false); // 控制模态框显示
const fileInput = ref(null); // 用于触发文件输入

// 从 store 加载 topics 并监听变化
const topics = ref([...store.topics]); // 初始化时从 store 获取
watch(() => store.topics, (newTopics) => {
  topics.value = [...newTopics]; // 监听 store 变化并更新本地 ref
  // 可能需要重新计算 savedTopicInfo 或其他依赖 topics 的数据
  // ... 
}, { deep: true });

onMounted(async () => {
    // 初始化时从 store 加载 topics
    // topics.value = [...store.topics]; // 确保初始加载
    
    // 后续逻辑保持不变，但应该基于 topics.value (来自 store)
    // ... (省略原有 onMounted 内容)
    
    // 确保在 store 初始化 topics 后再执行依赖 topics 的逻辑
    if (topics.value.length === 0) {
        // 如果 store 初始为空，可能需要等待 store 初始化完成
        // 这里可以添加一个 watcher 或等待 store 的 action 完成
        // 简单处理：假设 store 在组件挂载前已初始化
        console.warn("TopicSelector mounted, but card store topics are empty. Ensure store is initialized before this component mounts.");
    }
    
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

// 新增方法

// 触发文件输入点击
const triggerFileInput = () => {
  fileInput.value.click();
};

// 处理文件导入
const handleFileImport = async (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) {
    return;
  }

  let updatedCount = 0;
  let errorCount = 0;
  const totalFiles = files.length;
  const processingToastId = toast.info(`开始处理 ${totalFiles} 个 Markdown 文件...`, { timeout: false });

  // 使用 Promise.allSettled 来处理所有文件，无论成功或失败
  const results = await Promise.allSettled(Array.from(files).map(file => {
    if (!file.name.endsWith('.md')) {
        toast.warning(`文件 "${file.name}" 不是 Markdown 文件，已跳过。`, { timeout: 2000 });
        // 返回一个 resolved Promise 以便 allSettled 继续处理，但标记为跳过
        return Promise.resolve({ status: 'skipped', filename: file.name }); 
    }
    // 调用 store action，它返回一个 Promise
    return store.importTopicFromMarkdown(file);
  }));

  toast.dismiss(processingToastId); // 关闭处理中提示

  // 遍历处理结果
  results.forEach((result, index) => {
    const originalFile = files[index]; // 获取原始文件名
    if (result.status === 'fulfilled') {
        if(result.value?.status === 'skipped') {
            // 跳过的文件，之前已经提示过了
        } else {
            // store.importTopicFromMarkdown 成功 resolve
            const { topicId, title } = result.value; // 从 resolve 的值获取信息
            toast.success(`选题 "${title}" (ID: ${topicId}) 已成功导入/更新。`);
            updatedCount++;
        }
    } else if (result.status === 'rejected') {
        // store.importTopicFromMarkdown reject
        console.error(`处理文件 "${originalFile.name}" 时出错:`, result.reason);
        toast.error(`处理文件 "${originalFile.name}" 失败: ${result.reason?.message || result.reason}`);
        errorCount++;
    }
  });


  // 清空文件输入，以便可以再次选择相同的文件
  if (fileInput.value) {
    fileInput.value.value = '';
  }

  // 显示最终结果总结
  if (updatedCount > 0 || errorCount > 0) {
      let summaryMessage = '';
      if (updatedCount > 0) summaryMessage += `${updatedCount} 个文件成功导入/更新。`;
      if (errorCount > 0) summaryMessage += `${errorCount > 0 ? (updatedCount > 0 ? ' ' : '') + errorCount + ' 个文件处理失败。' : ''}`;
      if (updatedCount > 0 && errorCount === 0) {
          toast.success(summaryMessage);
      } else if (errorCount > 0 && updatedCount === 0) {
          toast.error(summaryMessage);
      } else {
          toast.warning(summaryMessage); // 混合结果用 warning
      }
  } else if (results.every(r => r.value?.status === 'skipped')) {
       toast.info("没有有效的 Markdown 文件被处理。");
  }
  
  // 可以在这里添加逻辑，例如如果当前选中的 topic 内容被更新了，刷新界面等
  // (store.importTopicFromMarkdown 内部已经处理了重新加载当前 topic)
};

// 处理创建新选题
const handleCreateTopic = ({ topicId, title }) => {
  console.log('Creating topic:', topicId, title);
  // 1. 检查 ID 是否已存在 (可以在 store action 中处理)
  if (store.topics.some(t => t.id === topicId)) {
      toast.error(`Topic ID "${topicId}" 已存在，请使用不同的 ID。`);
      return;
  }

  // 2. 生成 Markdown 模板内容
  const templateContent = `---
topicId: '${topicId}'
title: '${title.replace(/'/g, "''")}' # 使用单引号包裹，并转义标题中的单引号
description: '' # 可选描述
headerText: '' # 可选全局页眉
footerText: '' # 可选全局页脚
coverShowHeader: true
coverShowFooter: true
contentDefaultShowHeader: true
contentDefaultShowFooter: true
---

# ${title.replace(/'/g, "''")}
这里是封面卡片的副标题或简短介绍 (支持 Markdown/LaTeX)

---

# 内容卡片1 标题
这里是第一张内容卡片的主体内容 (支持 Markdown/LaTeX)。

<!-- 可选：单独控制此卡片页眉显隐 -->
<!-- cardShowHeader: false -->
<!-- 可选：单独控制此卡片页脚显隐 -->
<!-- cardShowFooter: false -->

<!-- 插图建议: 在AI辅助生成后，可以在这里添加插图建议 -->

---

# 内容卡片2 标题
更多内容卡片...

---

## 主文案
这里是小红书笔记的主文案区域。
仅支持纯文本、换行、Emoji 和 #话题标签#。
将所有卡片内容总结和扩展成流畅的笔记。
#${title.replace(/\s+/g, '')} #${topicId} #知识分享
`;

  // 3. 使用 file-saver 下载文件
  const blob = new Blob([templateContent], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, `${topicId}.md`);

  // 4. 关闭模态框并提示
  showCreateTopicModal.value = false;
  toast.success(`Markdown 模板 "${topicId}.md" 已生成并开始下载。`);
  
  // 可选：是否立即将新选题添加到 store 中？
  // 这取决于产品逻辑，如果希望下载后手动导入，则不需要在这里添加
  // 如果希望创建后立即可见（即使没有内容），则需要添加:
  // store.addOrUpdateTopicMeta({ id: topicId, title: title, description: '' });
};

// 新增：切换 Prompt 按钮可见性的方法
const togglePromptButtons = () => {
    showPromptButtons.value = !showPromptButtons.value;
};

// 使用 import.meta.glob 获取所有 content 文件信息
// 注意：路径是相对于当前文件的，所以是 '../content/'
const contentModules = import.meta.glob('../content/*_content.js'); // 非 eager 模式
</script>