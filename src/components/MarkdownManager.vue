<template>
    <!-- 新增: Markdown 文件管理器模态框 (仅开发) -->
    <div v-if="isVisible" class="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50" @click.self="closeModal">
        <div class="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[80vh] flex flex-col">
            <!-- 新容器：将标题和刷新按钮放在同一行 -->
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-medium">Markdown 文件状态与转换</h3>
                <button @click="refreshFileList" class="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50" :disabled="isLoading">
                     <i class="fas fa-redo mr-1"></i> {{ isLoading ? '刷新中...' : '刷新列表' }}
                 </button>
            </div>
            <div class="overflow-y-auto flex-grow border rounded-lg p-3 bg-gray-50 min-h-[200px]">
                <!-- 修改：使用 store 的加载和错误状态 -->
                <div v-if="isLoading" class="text-center text-gray-500">加载中...</div>
                <div v-else-if="loadingError" class="text-center text-red-500">加载文件列表失败: {{ loadingError }}</div>
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
                        <!-- 修改：使用 markdownFileStatus 计算属性 -->
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
                                    @click="handleConvert(item.topicId, false)"
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
                                        @click="handleConvert(item.topicId, true)" 
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
                <!-- 修改：按钮调用 closeModal 方法 -->
                <button @click="closeModal" class="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">关闭</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { useCardStore } from '../stores/cardStore';
import { useToast } from 'vue-toastification';

// 定义 Props 和 Emits
const props = defineProps({
  isVisible: Boolean
});
const emit = defineEmits(['close']);

const store = useCardStore();
const toast = useToast();

// --- 本地状态 ---
const converting = reactive({}); // 跟踪单个文件的转换状态
const confirmingOverwrite = reactive({}); // 跟踪覆盖确认状态

// --- 从 Store 获取状态 ---
const isLoading = computed(() => store.isLoadingFiles);
const loadingError = computed(() => store.fileLoadingError);
const topics = computed(() => store.topics); // 获取 topic 列表以查找标题
const detectedMdFiles = computed(() => store.detectedMarkdownFiles);
const detectedJsFilesInfo = computed(() => store.detectedJsFilesInfo);

// --- 计算属性：核心逻辑，根据 Store 状态生成文件状态列表 ---
const markdownFileStatus = computed(() => {
    // console.log('[MarkdownManager] Computing markdownFileStatus...'); // 调试
    // console.log('[MarkdownManager] Store state - MD:', detectedMdFiles.value, 'JS:', detectedJsFilesInfo.value, 'Topics:', topics.value);
    
    // 确保数据有效
    const mdSet = detectedMdFiles.value instanceof Set ? detectedMdFiles.value : new Set();
    const jsInfo = typeof detectedJsFilesInfo.value === 'object' && detectedJsFilesInfo.value !== null 
                   ? detectedJsFilesInfo.value 
                   : {};
    const jsSet = new Set(Object.keys(jsInfo)); // 从 store 获取 JS topic ID 列表
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
            title: getTopicTitle(topicId), // 使用辅助函数获取标题
            status
        });
    }
    
    // console.log('[MarkdownManager] Computed status list:', statusList);
    return statusList.sort((a, b) => a.topicId.localeCompare(b.topicId));
});

// --- 方法 ---

// 辅助函数：根据 topicId 从 store 获取标题
function getTopicTitle(topicId) {
    const topic = topics.value.find(t => t.id === topicId);
    return topic?.title || null; // 如果找不到 topic，返回 null
}

// 关闭模态框
function closeModal() {
    resetConfirmation(); // 关闭时重置所有确认状态
    Object.keys(converting).forEach(key => delete converting[key]); // 重置转换状态
    emit('close');
}

// 刷新文件列表（调用 Store Action）
async function refreshFileList() {
    // console.log('[MarkdownManager] Refreshing file list...');
    try {
        await store.fetchFileLists();
        // console.log('[MarkdownManager] File list refreshed via store action.');
        toast.info("文件列表已刷新");
    } catch (error) {
        // Store action 应该处理自己的错误并更新 loadingError 状态
        console.error('[MarkdownManager] Error calling store.fetchFileLists:', error);
        // 现在 Store 不再显示 Toast，组件需要负责显示
        toast.error(`刷新列表失败: ${error?.message || '未知错误'}`);
    }
}

// 处理转换（调用 Store Action）
async function handleConvert(topicId, overwrite = false) {
    converting[topicId] = true;
    resetConfirmation(topicId); // 处理转换时，清除该 topic 的确认状态
    try {
        // --- 假设 Store 有一个 convertMarkdownToJs action ---
        // 这个 action 应该负责调用 API，并在成功后调用 fetchFileLists 或直接更新 Store 状态
        const result = await store.convertMarkdownToJs(topicId, overwrite); 

        // Store action 应该返回类似 { success: boolean, message: string } 的结果
        if (result && result.success) {
            toast.success(result.message || '成功转换 ' + topicId + '.md');
            console.info('[MarkdownManager] Conversion success via store action: ' + topicId, result);
            // Store action 内部应该已经更新了文件列表状态，这里不需要手动刷新
            // localStorage.removeItem(\`cardgen_topic_content_\${topicId}\`); // 如果 Store action 没处理，这里可以清理
        } else {
            // Store action 返回失败
            throw new Error(result?.message || '转换失败 (来自 Store)');
        }
    } catch (error) {
        console.error('[MarkdownManager] Error converting ' + topicId + '.md via store action:', error);
        toast.error('转换 ' + topicId + '.md 失败: ' + error.message);
    } finally {
        converting[topicId] = false;
    }
}

// 重置确认状态
function resetConfirmation(topicId = null) {
    if (topicId) {
        confirmingOverwrite[topicId] = false;
    } else {
        Object.keys(confirmingOverwrite).forEach(key => confirmingOverwrite[key] = false);
    }
}

// 请求覆盖确认
function requestOverwriteConfirmation(topicId) {
    resetConfirmation(); // 先重置其他确认
    confirmingOverwrite[topicId] = true;
}

// 取消覆盖
function cancelOverwrite(topicId) {
    resetConfirmation(topicId);
}

// --- Watcher ---
// 监听模态框可见性变化
watch(() => props.isVisible, (newValue) => {
    if (newValue) {
        // console.log('[MarkdownManager] Modal became visible. Checking/Refreshing file list...');
        // 模态框打开时，可以考虑强制刷新一次列表，或者依赖 TopicSelector 加载好的数据
        // 如果 TopicSelector 已经加载了，这里可能不需要强制刷新
        // 如果希望每次打开都最新，可以调用 refreshFileList()
        // refreshFileList(); // 取消注释以在每次打开时刷新
        resetConfirmation(); // 每次打开时重置确认状态
    }
});

// 可以在这里添加对 store 状态变化的 watch，如果需要响应式地更新某些本地状态
// watch(isLoading, (newVal) => { console.log('isLoading changed:', newVal); });
// watch(loadingError, (newVal) => { console.log('loadingError changed:', newVal); });
// watch(markdownFileStatus, (newVal) => { console.log('markdownFileStatus updated:', newVal); }, { deep: true });

</script> 