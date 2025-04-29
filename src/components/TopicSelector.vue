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
import { getOrdinal } from '../utils/formatters'; // <--- 新增：导入 getOrdinal 工具函数
import { generateMarkdownTemplate } from '../utils/templateUtils'; // <--- 新增：导入模板生成函数
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

// 生成 Markdown 模板并处理保存/下载 (修改：使用 store action)
const handleGenerateMdForTopic = async (options) => {
  // const { topicId, title, description, numCards, includeMainText, overwrite = false } = options;

  // --- 修改：使用导入的函数生成 Markdown 内容 ---
  // 注意：generateMarkdownTemplate 现在期望一个包含所有选项的对象
  // 我们需要确保从 modal 传递过来的 options 包含 numCards 和 includeMainText
  // 如果 modal 不传递这些，我们需要在这里提供默认值或修改 modal
  // 假设 GenerateMdModal 会传递 numCards 和 includeMainText (如果需要)
  const mdContent = generateMarkdownTemplate(options); 
  // -------------------------------------------

  const filename = `${options.topicId}.md`;
  const isDevMode = import.meta.env.DEV;
  let shouldDownload = !isDevMode; // 生产模式默认下载
  let apiErrorOccurred = false; // 跟踪 API 相关问题

  if (isDevMode) {
    try {
        // --- 修改：调用 Store Action 并传递 overwrite 参数 ---
        console.log(`[TopicSelector] Calling store.saveMarkdownTemplate for ${filename}, overwrite=${options.overwrite}`);
        const result = await store.saveMarkdownTemplate({ 
          filename, 
          content: mdContent, 
          topicId: options.topicId, // 确保使用 options 中的 topicId
          overwrite: options.overwrite // 使用 options 中的 overwrite
        });
        console.log(`[TopicSelector] Store action result for saving ${filename}:`, result);

        if (result.success) {
            // --- Store Action 成功 ---
            toast.success(result.message || `模板 ${filename} 已成功保存！`);
            console.log(`[TopicSelector] Successfully saved MD template via store action: ${filename}`);
            shouldDownload = false; // 本地保存成功，无需下载
            showGenerateMdModal.value = false;
            return; // 操作完成
        } else {
            // --- Store Action 失败或部分失败 (如文件存在) ---
            apiErrorOccurred = true; // 标记 API 相关问题
            if (result.code === 'FILE_EXISTS' && !options.overwrite) {
                // 特定错误：文件已存在，且未指定覆盖
                toast.error(result.message || `文件 ${filename} 已存在，无法覆盖。`);
                shouldDownload = false; // 文件存在，不下载
            } else {
                // 其他 Store Action 业务错误
                console.error('[TopicSelector] Store action failed:', result.message);
                toast.warning(`尝试本地保存失败 (${result.message || '未知错误'})，将启动文件下载。`);
                shouldDownload = true; // 其他错误，回退到下载
            }
        }
    } catch (error) {
        // --- 处理调用 Store Action 本身时发生的意外错误 ---
        // (例如网络问题导致 fetch 失败，或者 Store Action 内部抛出未捕获的异常)
        apiErrorOccurred = true;
        shouldDownload = true; // 意外错误，回退到下载
        console.error('[TopicSelector] Error calling store.saveMarkdownTemplate:', error);
        toast.warning(`调用本地保存操作时出错 (${error.message || '未知错误'})，将启动文件下载。`);
    }
  }

  // --- 根据标志位决定是否执行下载 ---
  if (shouldDownload) {
    try {
      console.log(`[TopicSelector] Proceeding with download for ${filename}. DevMode: ${isDevMode}, API Error Occurred: ${apiErrorOccurred}`);
      const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8;' });
      saveAs(blob, filename);
      if (apiErrorOccurred) {
          toast.info(`已启动 ${filename} 的下载。`); // 如果是因为保存失败才下载，给个 info
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