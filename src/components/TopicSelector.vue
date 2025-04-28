<template>
    <div class="topic-selector mb-8">
        <!-- 修改：将标题和开关放在同一行 -->
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">选择内容选题</h2>
            
            <!-- 新增按钮 -->
            <div class="flex items-center space-x-2">
                <!-- 修改按钮文字和点击事件 -->
                <button
                    @click="showGenerateMdModal = true"
                    class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                    <i class="fas fa-file-alt mr-1"></i> 生成 MD 模板
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
        
        <!-- 修改：使用新的模态框 -->
        <GenerateMdModal
            v-if="showGenerateMdModal"
            @close="showGenerateMdModal = false"
            @generate="handleGenerateMdForTopic"
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
// import { topicsMeta as initialTopicsMeta } from '../content/topicsMeta'; // 不再需要直接导入
import { useToast } from "vue-toastification";
import promptTemplate from '../prompts/knowledge_card_prompt.md?raw';
import { useCardStore } from '../stores/cardStore'; // 引入 store
// import CreateTopicModal from './CreateTopicModal.vue'; // 移除旧模态框
import GenerateMdModal from './GenerateMdModal.vue'; // 引入新模态框
import { saveAs } from 'file-saver'; // 引入 file-saver
// import matter from 'gray-matter'; // handleFileImport 中已引入 store action，这里不再需要

const store = useCardStore(); // 获取 store 实例
const emit = defineEmits(['select-topic']);
const toast = useToast();

const savedTopicInfo = reactive({});
const showPromptButtons = ref(true);
// const showCreateTopicModal = ref(false); // 移除旧状态
const showGenerateMdModal = ref(false); // 添加新模态框状态
const fileInput = ref(null); // 用于触发文件输入

// 从 store 加载 topics 并监听变化
const topics = ref([...store.topics]); // 初始化时从 store 获取
watch(() => store.topics, (newTopics) => {
  topics.value = [...newTopics]; // 监听 store 变化并更新本地 ref
  // TODO: 可能需要重新计算 savedTopicInfo 或其他依赖 topics 的数据
  updateSavedTopicInfo(); // 调用更新函数
}, { deep: true });

// 提取更新 savedTopicInfo 的逻辑为一个函数
const updateSavedTopicInfo = async () => {
    // 构建一个简单的查找表，将 topicId 映射到期望的文件路径键 (相对于当前文件)
    const expectedPathKeys = {};
    topics.value.forEach(topic => {
        expectedPathKeys[topic.id] = `../content/${topic.id}_content.js`;
    });
    
    // 清空旧信息，以防 topic 列表变化导致残留
    Object.keys(savedTopicInfo).forEach(key => delete savedTopicInfo[key]);

    await Promise.all(topics.value.map(async (topic) => {
        const savedContentJson = localStorage.getItem(`cardgen_topic_content_${topic.id}`);
        let cardCount = 0;
        let existsInLocalStorage = false;

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

        // 文件检查逻辑（如果需要保留）
        // if (!existsInLocalStorage) { ... }
        // 暂时简化，主要依赖 localStorage
        if (!existsInLocalStorage) {
             cardCount = 1; // 假设至少有封面
        }

        savedTopicInfo[topic.id] = { exists: existsInLocalStorage, cardCount: cardCount };
    }));
}


onMounted(async () => {
    // 初始化时从 store 加载 topics
    if (store.topics.length > 0) {
         topics.value = [...store.topics];
    } else {
        // 如果 store 初始为空，可能需要等待 store 初始化完成
        // 监听一次 topics 变化
        const unwatch = watch(() => store.topics, (newTopics) => {
            if (newTopics.length > 0) {
                topics.value = [...newTopics];
                updateSavedTopicInfo(); // 获取到 topics 后更新状态
                unwatch(); // 获取到后停止监听
            }
        }, { deep: true, immediate: true }); // immediate 确保立即执行一次
         console.warn("TopicSelector mounted, waiting for card store topics...");
    }
    
    // 初始加载 savedTopicInfo
    await updateSavedTopicInfo();
});

const selectTopic = (topicId) => {
    emit('select-topic', { key: topicId });
};

function getOrdinal(n) {
    if (typeof n !== 'number' || n < 1) return { number: n, suffix: '' };
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    const suffix = s[(v - 20) % 10] || s[v] || s[0];
    return { number: n, suffix: suffix };
}

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

// --- 修改和新增方法 ---

// 触发文件输入点击
const triggerFileInput = () => {
  fileInput.value.click();
};

// 处理文件导入 (保持不变，调用 store.importTopicFromMarkdown)
const handleFileImport = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
        return;
    }

    let updatedCount = 0;
    let errorCount = 0;
    const totalFiles = files.length;
    const processingToastId = toast.info(`开始处理 ${totalFiles} 个 Markdown 文件...`, { timeout: false });

    const results = await Promise.allSettled(Array.from(files).map(file => {
        if (!file.name.endsWith('.md')) {
            toast.warning(`文件 "${file.name}" 不是 Markdown 文件，已跳过。`, { timeout: 2000 });
            return Promise.resolve({ status: 'skipped', filename: file.name });
        }
        return store.importTopicFromMarkdown(file);
    }));

    toast.dismiss(processingToastId);

    results.forEach((result, index) => {
        const originalFile = files[index];
        if (result.status === 'fulfilled') {
            if (result.value?.status === 'skipped') {
                // Skipped
            } else {
                const { topicId, title } = result.value;
                toast.success(`选题 "${title}" (ID: ${topicId}) 已成功导入/更新。`);
                updatedCount++;
            }
        } else if (result.status === 'rejected') {
            console.error(`处理文件 "${originalFile.name}" 时出错:`, result.reason);
            toast.error(`处理文件 "${originalFile.name}" 失败: ${result.reason?.message || result.reason}`);
            errorCount++;
        }
    });

    if (fileInput.value) {
        fileInput.value.value = '';
    }

    if (updatedCount > 0 || errorCount > 0) {
        let summaryMessage = '';
        if (updatedCount > 0) summaryMessage += `${updatedCount} 个文件成功导入/更新。`;
        if (errorCount > 0) summaryMessage += `${errorCount > 0 ? (updatedCount > 0 ? ' ' : '') + errorCount + ' 个文件处理失败。' : ''}`;
        if (updatedCount > 0 && errorCount === 0) {
            toast.success(summaryMessage);
        } else if (errorCount > 0 && updatedCount === 0) {
            toast.error(summaryMessage);
        } else {
            toast.warning(summaryMessage);
        }
    } else if (results.every(r => r.value?.status === 'skipped')) {
        toast.info("没有有效的 Markdown 文件被处理。");
    }
};

// 生成 Markdown 模板并处理保存/下载
const handleGenerateMdForTopic = async (options) => {
  const { topicId, title, description, numCards, includeMainText } = options;

  // --- 调整 Markdown 内容以匹配 create_md_Template.js ---
  // 使用 JSON.stringify 确保 YAML Front Matter 中的字符串安全转义
  let mdContent = `--- 
topicId: ${topicId}
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description || '在这里填写选题描述...')}
headerText: ${JSON.stringify("@园丁小区詹姆斯")}
footerText: '' 
coverShowHeader: true 
coverShowFooter: true 
contentDefaultShowHeader: true 
contentDefaultShowFooter: true 
--- 

# ${title}

封面副标题

`;

  // 卡片部分可以保持与之前类似，或者根据需要简化成 create_md_Template.js 的单卡片示例
  // 这里我们暂时保持多卡片生成，但可以根据需要调整
  for (let i = 1; i <= numCards; i++) {
    mdContent += `---

## 内容卡片 ${i} 标题

内容卡片 ${i} 正文

<!-- 可选：单独控制此卡片的页眉/页脚显隐 -->
<!-- cardShowHeader: true -->
<!-- cardShowFooter: true -->

`;
  }

  // 主文案部分
  if (includeMainText) {
    mdContent += `---

## Main Text

在这里编写你的小红书主文案...

`;
  }
  // --- Markdown 内容生成完毕 ---

  const filename = `${topicId}.md`; // <--- CHANGE: filename format

  const isDevMode = import.meta.env.DEV;

  if (isDevMode) {
    try {
      const response = await fetch('/api/save-markdown-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: filename, content: mdContent }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(`模板 ${filename} 已成功保存到本地 src/markdown/ 目录！`); // <--- CHANGE: message
        console.log(`[TopicSelector] Successfully saved MD template locally via API: ${filename} to src/markdown/`); // <--- CHANGE: log
        showGenerateMdModal.value = false; 
        return; 
      } else {
        // 处理特定错误：文件已存在
        if (response.status === 409 && result.code === 'FILE_EXISTS') {
             toast.error(result.message || `文件 ${filename} 已存在于 src/markdown/，无法覆盖。`);
        } else {
            // 其他 API 错误
            console.error('[TopicSelector] API save failed:', result.message || `Status: ${response.status}`);
            toast.warning(`尝试本地保存失败 (${result.message || `HTTP ${response.status}`})，将启动文件下载。`);
            // 继续执行下载逻辑
        }
      }
    } catch (error) {
      console.error('[TopicSelector] Error calling save API:', error);
      toast.warning(`调用本地保存 API 出错 (${error.message})，将启动文件下载。`);
      // 继续执行下载逻辑
    }
    // 如果 API 调用失败或遇到已知错误（如文件存在），则可能需要继续执行下载
    // 但如果文件已存在，通常不应再下载。我们根据上面的逻辑调整：
    // 如果是文件存在错误，我们只提示错误，不下载。
    if (response?.status === 409 && (await response?.json())?.code === 'FILE_EXISTS') { // 需要重新解析 json 或缓存 result
        showGenerateMdModal.value = false; // 关闭模态框
        return; // 阻止下载
    }
    // 对于其他 API 错误或网络错误，我们会继续尝试下载
  }

  // 非开发模式或本地保存失败时（非文件存在错误），执行文件下载
  try {
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
    saveAs(blob, filename);
    toast.success(`已生成 ${filename} 供下载。`);
  } catch (saveError) {
    console.error('[TopicSelector] Error saving file with file-saver:', saveError);
    toast.error(`生成文件 ${filename} 失败: ${saveError.message}`);
  }
  
  showGenerateMdModal.value = false;
};

// 切换 Prompt 按钮可见性的方法 (保持不变)
const togglePromptButtons = () => {
    showPromptButtons.value = !showPromptButtons.value;
};

// 使用 import.meta.glob 获取所有 content 文件信息 (保持不变，用于 onMounted 检查原始文件，虽然现在主要依赖 localStorage)
const contentModules = import.meta.glob('../content/*_content.js'); // 非 eager 模式
</script>