<template>
    <div class="topic-selector mb-8">
        <!-- 修改：将标题和开关放在同一行 -->
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">选择内容选题</h2>

            <!-- 修改：移除生成 MD 模板按钮，保留其他 -->
            <div class="flex items-center space-x-2">
                <!-- 移除: 检查 MD 文件状态按钮 -->
                <!-- 
                <button
                    v-if="isDevMode"
                    @click="showMarkdownManagerDialog = true" 
                    class="bg-teal-500 hover:bg-teal-700 text-white font-bold py-1 px-3 rounded text-sm">
                    <i class="fas fa-sync-alt mr-1"></i> 检查 MD 文件状态
                </button>
                 -->
                <label for="prompt-toggle" class="ml-4 mr-2 text-sm font-medium text-gray-700">显示 "生成Prompt":</label>
                <button id="prompt-toggle" @click="togglePromptButtons"
                    :class="[showPromptButtons ? 'bg-green-500' : 'bg-gray-300', 'relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500']"
                    role="switch" :aria-checked="showPromptButtons.toString()">
                    <span aria-hidden="true"
                        :class="[showPromptButtons ? 'translate-x-5' : 'translate-x-0', 'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200']">
                    </span>
                </button>
            </div>
        </div>

        <!-- 移除 GenerateMdModal -->
        <!-- <GenerateMdModal ... /> -->

        <!-- 移除 MarkdownManager 组件 -->
        <!-- 
        <MarkdownManager
            v-if="isDevMode"
            :is-visible="showMarkdownManagerDialog"
            @close="showMarkdownManagerDialog = false"
        />
         -->

        <!-- +++ 修改：将实际列表包裹在 v-else-if 中 +++ -->
        <div v-if="topics.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div v-for="(topic, index) in topics" :key="topic.id"
                @click="store.detectedMarkdownFiles.has(topic.id) ? selectTopic(topic.id) : null" :class="[
                    'topic-card relative p-4 bg-white border border-gray-200 rounded-lg shadow-md hover:shadow-2xl transition-all',
                    store.detectedMarkdownFiles.has(topic.id)
                        ? 'cursor-pointer hover:scale-105'
                        : 'opacity-50 cursor-not-allowed',
                    // 移除 hover:scale-105 如果文件不存在? 或者保留让视觉上有点反馈?
                    // 决定：文件不存在时移除 hover:scale-105，并添加 cursor-not-allowed 
                ]" class="flex flex-col overflow-hidden">
                <!-- ... (序号和卡片数量显示保持不变) ... -->
                <div class="absolute top-0 right-1 font-serif italic text-gray-200 opacity-80 z-0 select-none">
                    <span class="text-5xl">{{ getOrdinal(index + 1).number }}</span>
                    <span class="text-xl align-bottom ml-[-0.1em]">{{ getOrdinal(index + 1).suffix }}</span>
                </div>
                <div v-show="topic.cardCount > 0"
                    class="absolute bottom-4 right-4 bg-xhs-pink text-white text-xs font-bold px-2 py-1 rounded-full z-20">
                    {{ topic.cardCount }} 张
                </div>
                <div class="flex-grow z-10 relative">
                    <h3 class="font-medium mb-2 text-gray-800 pr-16">{{ topic.title }}</h3>
                    <p class="text-sm text-gray-500 mb-4">{{ topic.description }}</p>
                </div>
                <div class="z-10 relative flex items-center space-x-2">
                    <!-- 修改：替换旧的选择按钮为新的创建/覆盖按钮 -->
                    <button @click.stop="triggerGenerateOrConfirm(topic)" :class="[
                        store.detectedMarkdownFiles.has(topic.id)
                            ? 'bg-yellow-500 hover:bg-yellow-600'
                            : 'bg-xhs-pink hover:bg-xhs-pink-dark',
                        'text-white font-bold py-1 px-4 rounded text-sm transition-colors'
                    ]">
                        {{ store.detectedMarkdownFiles.has(topic.id) ? '覆盖 MD' : '创建 MD' }}
                    </button>
                    <!-- 生成 Prompt 按钮保持不变 -->
                    <button v-show="showPromptButtons" @click.stop="generatePrompt(topic)"
                        class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm">
                        生成Prompt
                    </button>
                </div>
            </div>
        </div>

        <!-- +++ 新增：处理没有选题的情况 +++ -->
        <div v-else class="text-center py-10 text-gray-500">
            没有找到任何选题。
            <!-- 可以在这里添加一个提示或创建按钮 -->
        </div>

        <!-- 新增：添加 ConfirmationModal -->
        <ConfirmationModal v-if="showConfirmationModal" title="确认覆盖" :message="confirmationMessage" confirmText="确认覆盖"
            cancelText="取消" @confirm="handleConfirmGeneration" @cancel="handleCancelGeneration" />
    </div>
</template>

<script setup>
import { ref, onMounted, computed, defineAsyncComponent } from 'vue';
import { useToast } from "vue-toastification";
import promptTemplate from '../prompts/knowledge_card_prompt.md?raw';
import { useCardStore } from '../stores/cardStore';
// 移除 GenerateMdModal 导入
// import GenerateMdModal from './GenerateMdModal.vue'; 
// import MarkdownManager from './MarkdownManager.vue'; // 注释掉静态导入
import { saveAs } from 'file-saver';
import { getOrdinal } from '../utils/formatters';
import { generateMarkdownTemplate } from '../utils/templateUtils';
// import ConfirmationModal from './ConfirmationModal.vue'; // 新增导入 // 注释掉静态导入

// +++ 异步导入组件 +++
// 移除 MarkdownManager 的异步导入
// const MarkdownManager = defineAsyncComponent(() => 
//     import('./MarkdownManager.vue')
// );
const ConfirmationModal = defineAsyncComponent(() =>
    import('./ConfirmationModal.vue')
);

const store = useCardStore();
const emit = defineEmits(['select-topic']);
const toast = useToast();

const showPromptButtons = ref(true);
// 移除 showGenerateMdModal
// const showGenerateMdModal = ref(false); 
// 移除 MarkdownManager 相关状态
// const showMarkdownManagerDialog = ref(false);
const isDevMode = import.meta.env.DEV; // 保留 isDevMode，虽然按钮移除了，但可能其他地方用到

// 新增：确认模态框状态
const showConfirmationModal = ref(false);
const topicToConfirm = ref(null);

const topics = computed(() => store.topics);

// 计算属性：生成确认消息 (保持与 GenerateMdModal 类似的逻辑)
const confirmationMessage = computed(() => {
    if (!topicToConfirm.value) return '';
    const { title } = topicToConfirm.value;
    // 简化消息，因为我们只在 hasMd 为 true 时触发
    return `本地已存在 "${title}" 的 Markdown 文件 (.md)。\n\n确定要覆盖它吗？`;
});

onMounted(async () => {
    console.log("[TopicSelector] Mounted. Explicitly fetching file lists for sync check...");
    // fetchFileLists is now primarily for checking/syncing counts
    await store.fetchFileLists();
    console.log("[TopicSelector] File lists sync check initiated from onMounted.");
});

// 修改：这个方法现在由卡片点击触发
const selectTopic = (topicId) => {
    console.log(`[TopicSelector] Card clicked, emitting select-topic for: ${topicId}`);
    emit('select-topic', { key: topicId });
};

// 生成 Prompt 的方法 (添加 .stop 阻止冒泡)
const generatePrompt = (topic) => {
    if (!topic || !topic.id || !topic.title) {
        console.error('Invalid topic object passed to generatePrompt:', topic);
        toast.error('无法生成 Prompt：无效的选题信息。');
        return;
    }
    let generatedPrompt = promptTemplate.replace('[在此处插入你想生成的选题标题或编号]', topic.title);
    generatedPrompt = generatedPrompt.replace('[建议的 topicId，例如 topic01]', topic.id);
    try {
        navigator.clipboard.writeText(generatedPrompt).then(() => {
            const successMessage = `Prompt已成功复制到剪切板！\n主题：${topic.title}`;
            toast.success(successMessage);
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

// 移除 handleGenerateMdForTopic (因为现在直接调用 store action)

// 新增：触发生成或确认的方法
const triggerGenerateOrConfirm = (topic) => {
    // 使用 store.detectedMarkdownFiles 检查文件是否存在
    if (store.detectedMarkdownFiles.has(topic.id)) {
        topicToConfirm.value = topic;
        showConfirmationModal.value = true;
        console.log(`[TopicSelector] MD exists for ${topic.id}. Opening confirmation.`);
    } else {
        // 直接生成，不覆盖
        console.log(`[TopicSelector] MD does not exist for ${topic.id}. Generating directly.`);
        handleGenerateMd(topic, false);
    }
};

// 新增：处理 MD 生成的核心逻辑
const handleGenerateMd = async (topic, overwrite) => {
    console.log(`[TopicSelector] Generating MD for ${topic.id}. Overwrite: ${overwrite}`);
    const options = {
        topicId: topic.id,
        title: topic.title,
        description: topic.description,
        overwrite: overwrite, // 传递 overwrite 状态
        // 可以添加其他 generateMarkdownTemplate 需要的默认选项
        numCards: 3, // 例如，默认生成3个内容卡片
        includeMainText: true
    };
    const mdContent = generateMarkdownTemplate(options);
    const filename = `${options.topicId}.md`;

    // 调用 store action
    const result = await store.saveMarkdownTemplate({
        filename,
        content: mdContent,
        topicId: options.topicId,
        overwrite: options.overwrite
    });

    if (result.success) {
        toast.success(result.message || `模板 ${filename} 已成功${overwrite ? '覆盖' : '创建'}！`);
        // Store action 内部应该已经调用了 fetchFileLists，理论上无需再次调用
        // await store.fetchFileLists(); 
    } else {
        // Store action 会处理 FILE_EXISTS 错误，这里只显示通用错误
        toast.error(result.message || `操作失败`);
    }
    // 关闭确认模态框（如果它是打开的）
    showConfirmationModal.value = false;
    topicToConfirm.value = null;
};

// 新增：处理确认模态框的确认事件
const handleConfirmGeneration = () => {
    if (topicToConfirm.value) {
        handleGenerateMd(topicToConfirm.value, true); // 确认时强制覆盖
    }
};

// 新增：处理确认模态框的取消事件
const handleCancelGeneration = () => {
    showConfirmationModal.value = false;
    topicToConfirm.value = null;
};

// 切换 Prompt 按钮可见性的方法 (保持不变)
const togglePromptButtons = () => {
    showPromptButtons.value = !showPromptButtons.value;
};

</script>