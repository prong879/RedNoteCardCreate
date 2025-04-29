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
                <!-- 新增: 检查/转换按钮 (仅开发) -->
                <button
                    v-if="isDevMode"
                    @click="showMarkdownManagerDialog = true"
                    class="bg-teal-500 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded text-sm">
                    <i class="fas fa-sync-alt mr-1"></i> 检查/转换 MD 文件
                </button>
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

        <!-- 新增: 渲染 MarkdownManager 组件 -->
        <MarkdownManager
            v-if="isDevMode"
            :is-visible="showMarkdownManagerDialog"
            @close="showMarkdownManagerDialog = false"
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
import { ref, onMounted, reactive, watch, computed } from 'vue';
// import { topicsMeta as initialTopicsMeta } from '../content/topicsMeta'; // 不再需要直接导入
import { useToast } from "vue-toastification";
import promptTemplate from '../prompts/knowledge_card_prompt.md?raw';
import { useCardStore } from '../stores/cardStore'; // 引入 store
// import CreateTopicModal from './CreateTopicModal.vue'; // 移除旧模态框
import GenerateMdModal from './GenerateMdModal.vue'; // 引入新模态框
import MarkdownManager from './MarkdownManager.vue'; // <--- 新增：导入 Markdown 管理器
import { saveAs } from 'file-saver'; // 引入 file-saver
// import matter from 'gray-matter'; // handleFileImport 中已引入 store action，这里不再需要

const store = useCardStore(); // 获取 store 实例
const emit = defineEmits(['select-topic']);
const toast = useToast();

// --- 修改：移除旧的 reactive savedTopicInfo ---
// const savedTopicInfo = reactive({}); 
const showPromptButtons = ref(true);
const showGenerateMdModal = ref(false);
const showMarkdownManagerDialog = ref(false); // <--- 新增：控制管理器对话框状态

// --- New state for Markdown Manager ---
const isDevMode = import.meta.env.DEV;

const topics = computed(() => store.topics);

// --- 新增：将 savedTopicInfo 改为 computed 属性 --- 
const savedTopicInfo = computed(() => {
    const infoMap = {};
    // console.log('[TopicSelector] Computing savedTopicInfo based on store:', store.topics, store.detectedJsFilesInfo); // 调试日志
    
    // 确保 store.detectedJsFilesInfo 是一个对象
    const jsInfo = typeof store.detectedJsFilesInfo === 'object' && store.detectedJsFilesInfo !== null 
                   ? store.detectedJsFilesInfo 
                   : {};
                   
    topics.value.forEach(topic => {
        const topicJsInfo = jsInfo[topic.id];
        if (topicJsInfo) {
            // JS 文件信息存在于 Store 中
            infoMap[topic.id] = {
                exists: true,
                cardCount: topicJsInfo.cardCount || 0 // 从 store 获取卡片数量，如果 API 没提供则为 0
            };
        } else {
            // JS 文件信息不存在
            infoMap[topic.id] = { exists: false, cardCount: 0 };
        }
    });
    // console.log('[TopicSelector] Computed savedTopicInfo:', infoMap);
    return infoMap;
});

// --- 修改：在 onMounted 中显式调用 fetchFileLists --- 
onMounted(async () => {
    console.log("[TopicSelector] Mounted. Explicitly fetching file lists...");
    // 主动触发一次 Store 的文件列表获取
    await store.fetchFileLists(); 
    console.log("[TopicSelector] File lists fetch initiated from onMounted.");
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
  let shouldDownload = !isDevMode; // Default: download if not in dev mode
  let apiErrorOccurred = false; // Track if API call failed (excluding file exists)

  if (isDevMode) {
    let response = null; // Declare response outside try for wider scope if needed
    let result = null;
    try {
      response = await fetch('/api/save-markdown-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filename: filename, content: mdContent }),
      });

      // --- 修改：先解析 JSON --- 
      result = await response.json(); 
      console.log('[TopicSelector] API save response status:', response.status, 'result:', result); // 调试日志

      if (response.ok && result.success) {
        // --- API 保存成功 --- 
        toast.success(`模板 ${filename} 已成功保存到本地 src/markdown/ 目录！`);
        console.log(`[TopicSelector] Successfully saved MD template locally via API: ${filename} to src/markdown/`);
        
        // --- 修改：调用 Store Action 更新状态 --- 
        store.addDetectedMarkdownFile(topicId); // 通知 Store 添加此文件
        
        showGenerateMdModal.value = false; 
        return; // 成功保存，无需下载
      }
      
      // --- 处理 API 返回的错误 --- 
      apiErrorOccurred = true; // Mark that an API issue occurred
      if (response.status === 409 && result.code === 'FILE_EXISTS') {
        // 特定错误：文件已存在
        toast.error(result.message || `文件 ${filename} 已存在于 src/markdown/，无法覆盖。`);
        // 文件已存在，不应该触发下载
        shouldDownload = false; 
      } else {
        // 其他 API 业务错误或非 2xx 状态码
        console.error('[TopicSelector] API save failed:', result.message || `Status: ${response.status}`);
        toast.warning(`尝试本地保存失败 (${result.message || `HTTP ${response.status}`})，将启动文件下载。`);
        shouldDownload = true; // 其他 API 错误，回退到下载
      }
      
    } catch (error) {
      // --- 处理 fetch 调用本身或其他意外 JS 错误 ---
      apiErrorOccurred = true;
      shouldDownload = true; // 网络错误等，回退到下载
      console.error('[TopicSelector] Error calling save API:', error);
      toast.warning(`调用本地保存 API 出错 (${error.message || '网络错误'})，将启动文件下载。`);
    }
  }

  // --- 根据标志位决定是否执行下载 --- 
  if (shouldDownload) {
    try {
      console.log(`[TopicSelector] Proceeding with download for ${filename}. DevMode: ${isDevMode}, API Error: ${apiErrorOccurred}`); // 调试日志
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
      saveAs(blob, filename);
      // 如果是因为 API 失败才下载，用户已收到 warning toast，这里可以用 info 或 success
      if (apiErrorOccurred) {
          toast.info(`已启动 ${filename} 的下载。`); 
      } else {
          toast.success(`已生成 ${filename} 供下载。`); // 非开发模式下的正常下载
      }
    } catch (saveError) {
      console.error('[TopicSelector] Error saving file with file-saver:', saveError);
      toast.error(`生成文件 ${filename} 失败: ${saveError.message}`);
    }
  }
  
  showGenerateMdModal.value = false; // 无论结果如何，最后都关闭模态框
};

// 切换 Prompt 按钮可见性的方法 (保持不变)
const togglePromptButtons = () => {
    showPromptButtons.value = !showPromptButtons.value;
};

// 使用 import.meta.glob (移除，不再需要)
// const contentModules = import.meta.glob('../content/*_content.js');

// --- NEW: Computed property for modal dropdown --- 
const topicsForModalDropdown = computed(() => {
    // Use topics.value which mirrors store.topics
    return topics.value.map((topic, index) => {
        const ordinal = getOrdinal(index + 1);
        return {
            id: topic.id,
            // Combine ordinal number, suffix, and title for display
            displayTitle: `${ordinal.number}${ordinal.suffix} - ${topic.title}`
        };
    });
});
</script>