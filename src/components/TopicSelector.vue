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
                    @click="openMarkdownManager"
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

        <!-- 新增: Markdown 文件管理器模态框 (仅开发) -->
        <div v-if="showMarkdownManager && isDevMode" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50" @click.self="closeMarkdownManager">
            <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] flex flex-col">
                <h3 class="text-lg font-medium mb-4">Markdown 文件状态与转换</h3>
                <div class="flex justify-end mb-3">
                     <button @click="fetchMarkdownFiles" class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50" :disabled="loadingFiles"> <i class="fas fa-redo mr-1"></i> 刷新列表 </button>
                </div>
                <div class="overflow-y-auto flex-grow border rounded-lg p-3 bg-gray-50 min-h-[200px]">
                    <div v-if="loadingFiles" class="text-center text-gray-500">加载中...</div>
                    <div v-else-if="fileError" class="text-center text-red-500">加载文件列表失败: {{ fileError }}</div>
                    <div v-else-if="markdownFileStatus.length === 0" class="text-center text-gray-500">未找到 Markdown 文件或 JS 文件。</div>
                    <table v-else class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-100">
                            <tr>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Topic ID</th>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">标题 (来自 Meta)</th>
                                <th scope="col" class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                <th scope="col" class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr v-for="item in markdownFileStatus" :key="item.topicId">
                                <td class="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{{ item.topicId }}</td>
                                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{{ item.title || '-' }}</td>
                                <td class="px-4 py-2 whitespace-nowrap text-sm">
                                     <span v-if="item.status === 'md_only'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">仅 MD (待转换)</span>
                                     <span v-else-if="item.status === 'both'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">MD & JS 存在</span>
                                     <span v-else-if="item.status === 'js_only'" class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">仅 JS 存在</span>
                                     <span v-else class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">未知</span>
                                </td>
                                <td class="px-4 py-2 whitespace-nowrap text-center text-sm font-medium">
                                    <!-- Standard state button -->
                                    <button 
                                        v-if="item.status === 'md_only' && !confirmingOverwrite[item.topicId]" 
                                        @click="convertMd(item.topicId, false)"
                                        :disabled="converting[item.topicId]"
                                        class="text-indigo-600 hover:text-indigo-900 disabled:opacity-50 px-2 py-1 rounded border border-indigo-500 bg-indigo-50 text-xs">
                                        {{ converting[item.topicId] ? '转换中...' : '转换为 JS' }}
                                    </button>
                                    <button 
                                        v-if="item.status === 'both' && !confirmingOverwrite[item.topicId]"
                                        @click="requestOverwriteConfirmation(item.topicId)" 
                                        :disabled="converting[item.topicId]"
                                        class="text-red-600 hover:text-red-900 disabled:opacity-50 px-2 py-1 rounded border border-red-500 bg-red-50 text-xs">
                                        {{ converting[item.topicId] ? '转换中...' : '重新转换 (覆盖已有 JS)' }}
                                    </button>
                                    <span v-if="item.status === 'js_only' && !confirmingOverwrite[item.topicId]">-</span>

                                    <!-- Confirmation state buttons -->
                                    <div v-if="confirmingOverwrite[item.topicId]" class="flex items-center justify-center space-x-2">
                                        <span class="text-xs text-orange-600 mr-1">确认?</span>
                                        <button
                                            @click="convertMd(item.topicId, true)" 
                                            :disabled="converting[item.topicId]"
                                            class="text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 px-2 py-0.5 rounded text-xs">
                                            覆盖
                                        </button>
                                        <button
                                            @click="cancelOverwrite(item.topicId)"
                                            :disabled="converting[item.topicId]"
                                            class="text-gray-600 hover:text-gray-900 disabled:opacity-50 px-2 py-0.5 rounded border border-gray-300 text-xs">
                                            取消
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 text-right">
                    <button @click="closeMarkdownManager" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">关闭</button>
                </div>
            </div>
        </div>

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
import { saveAs } from 'file-saver'; // 引入 file-saver
// import matter from 'gray-matter'; // handleFileImport 中已引入 store action，这里不再需要

const store = useCardStore(); // 获取 store 实例
const emit = defineEmits(['select-topic']);
const toast = useToast();

const savedTopicInfo = reactive({});
const showPromptButtons = ref(true);
// const showCreateTopicModal = ref(false); // 移除旧状态
const showGenerateMdModal = ref(false); // 添加新模态框状态
// const fileInput = ref(null); // Remove file input ref

// --- New state for Markdown Manager ---
const isDevMode = import.meta.env.DEV; // Check dev mode
const showMarkdownManager = ref(false);
const markdownFileStatus = ref([]); // [{ topicId: string, title: string, status: 'md_only' | 'js_only' | 'both' }] 
const loadingFiles = ref(false);
const fileError = ref(null);
const converting = reactive({}); // { [topicId]: boolean }
const confirmingOverwrite = reactive({}); // <--- Add state for confirmation

// 从 store 加载 topics 并监听变化
const topics = ref([...store.topics]); // 初始化时从 store 获取
watch(() => store.topics, (newTopics) => {
  topics.value = [...newTopics]; // 监听 store 变化并更新本地 ref
  // TODO: 可能需要重新计算 savedTopicInfo 或其他依赖 topics 的数据
  updateSavedTopicInfo(); // 调用更新函数
  // If manager is open, refresh its data too
  if (showMarkdownManager.value) {
      updateMarkdownFileStatus();
  }
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

// Fetch and process file list from API
const fetchMarkdownFiles = async () => {
    loadingFiles.value = true;
    fileError.value = null;
    try {
        const response = await fetch('/api/list-content-files');
        if (!response.ok) {
            // Try parsing error message from server if available
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errorResult = await response.json();
                if (errorResult && errorResult.message) {
                    errorMsg = errorResult.message;
                }
            } catch (parseError) { /* Ignore if response is not JSON */ }
            throw new Error(errorMsg);
        }
        const data = await response.json();
        if (!data.success) {
            throw new Error(data.message || 'Failed to list files (server error)');
        }
        console.info('[TopicSelector] Fetched file list successfully.', data); // Log success to browser console
        return data; 
    } catch (error) {
        console.error("[TopicSelector] Error fetching file list:", error); // Log error to browser console
        fileError.value = error.message;
        return null;
    }
};

// Update the status list based on fetched files
const updateMarkdownFileStatus = async () => {
    const data = await fetchMarkdownFiles();
    loadingFiles.value = false; // Set loading false after fetch attempt
    if (!data) return; // Exit if fetch failed

    const mdSet = new Set(data.mdFiles.map(f => f.replace('.md', '')));
    const jsSet = new Set(data.jsFiles.map(f => f.replace('_content.js', '')));
    const allTopicIds = new Set([...mdSet, ...jsSet]);
    
    const statusList = [];
    for (const topicId of allTopicIds) {
        const hasMd = mdSet.has(topicId);
        const hasJs = jsSet.has(topicId);
        let status = 'unknown';
        if (hasMd && !hasJs) {
            status = 'md_only';
        } else if (hasMd && hasJs) {
            status = 'both';
        } else if (!hasMd && hasJs) {
            status = 'js_only';
        }
        
        statusList.push({
            topicId,
            title: getTopicTitle(topicId), // Get title from store
            status
        });
    }
    
    markdownFileStatus.value = statusList.sort((a, b) => a.topicId.localeCompare(b.topicId)); // Sort by topicId
};

// Open the markdown manager modal
const openMarkdownManager = () => {
    showMarkdownManager.value = true;
    updateMarkdownFileStatus(); // Fetch initial data
};

// Close the markdown manager modal
const closeMarkdownManager = () => {
    showMarkdownManager.value = false;
    markdownFileStatus.value = []; // Clear data on close
    loadingFiles.value = false;
    fileError.value = null;
    Object.keys(converting).forEach(key => delete converting[key]); // Reset converting state
    resetConfirmation(); // Reset confirmation on close
};

// Trigger conversion via API
const convertMd = async (topicId, overwrite = false) => {
    converting[topicId] = true; 
    resetConfirmation(topicId); 
    try {
        const response = await fetch('/api/convert-md-to-js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicId })
        });
        const result = await response.json();
        
        // --- 新增调试日志 ---
        console.log(`[TopicSelector] API response for ${topicId} conversion:`, result);
        // --- 调试日志结束 ---
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || `HTTP error ${response.status}`);
        }
        toast.success(result.message || `成功转换 ${topicId}.md`);
        console.info(`[TopicSelector] Conversion success: ${result.message}`, result); 
        
        localStorage.removeItem(`cardgen_topic_content_${topicId}`);
        
        // --- Modification Start ---
        // Check if API returned a valid cardCount
        if (result && typeof result.cardCount === 'number' && result.cardCount >= 0) { 
            // Ensure the topicId entry exists in savedTopicInfo before updating
            if (!savedTopicInfo[topicId]) {
                savedTopicInfo[topicId] = { exists: false, cardCount: 0 }; // Initialize if needed
            }
            savedTopicInfo[topicId].exists = true; // Mark as existing (JS file exists)
            savedTopicInfo[topicId].cardCount = result.cardCount; // Update with the count from API
            console.log(`[TopicSelector] Updated savedTopicInfo for ${topicId} with cardCount: ${result.cardCount}`);
        } else {
            // Handle case where API didn't return cardCount or it's invalid
            console.warn(`[TopicSelector] API response for ${topicId} did not include a valid cardCount. Displayed count might be inaccurate until next full refresh.`);
             // Optionally, you could try to trigger a more robust update mechanism here,
             // but for now, we rely on the API providing the count.
             // We can still mark it as 'exists' if conversion was successful overall.
             if (savedTopicInfo[topicId]) {
                 savedTopicInfo[topicId].exists = true; 
                 // Keep the old cardCount or set to a default? Let's keep old for now if it exists.
             } else {
                 // If it didn't exist before and we don't have a count, maybe set a default?
                 savedTopicInfo[topicId] = { exists: true, cardCount: 1 }; // Default to 1 (cover) if no count provided
             }
        }
        // --- Modification End ---

        await updateMarkdownFileStatus(); // Keep this to update modal state

    } catch (error) {
        console.error(`[TopicSelector] Error converting ${topicId}.md:`, error); 
        toast.error(`转换 ${topicId}.md 失败: ${error.message}`);
    } finally {
        converting[topicId] = false; 
    }
};

// Helper to get topic title from store
const getTopicTitle = (topicId) => {
    const topic = topics.value.find(t => t.id === topicId);
    return topic?.title || null;
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

// --- Helper function: Reset confirmation state ---
const resetConfirmation = (topicId = null) => {
    if (topicId) {
        confirmingOverwrite[topicId] = false;
    } else {
        // Reset all if no specific ID is given (e.g., on modal close)
        Object.keys(confirmingOverwrite).forEach(key => confirmingOverwrite[key] = false);
    }
};

// --- New function: Request overwrite confirmation ---
const requestOverwriteConfirmation = (topicId) => {
    resetConfirmation(); // Reset any other pending confirmations first
    confirmingOverwrite[topicId] = true;
};

// --- New function: Cancel overwrite ---
const cancelOverwrite = (topicId) => {
    resetConfirmation(topicId);
};

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