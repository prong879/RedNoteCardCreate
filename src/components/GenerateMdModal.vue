<template>
  <!-- Main Modal -->
  <div 
    class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center" 
    @click.self="closeModal"
    v-if="!showConfirmationModal" 
  >
    <div class="relative mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
      <h3 class="text-lg leading-6 font-medium text-gray-900 text-center mb-4">选择选题以生成 Markdown 模板</h3>
      
      <div class="max-h-96 overflow-y-auto pr-2">
        <ul class="space-y-3">
          <li v-for="topic in availableTopics" :key="topic.id">
            <button 
              @click="selectTopic(topic)" 
              class="w-full flex items-center justify-between p-3 text-left bg-white border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-150"
            >
              <div>
                <span class="font-medium text-gray-800">{{ topic.displayTitle }}</span>
                <span class="block text-sm text-gray-500">{{ topic.description }}</span>
              </div>
              <span 
                class="text-xs font-semibold px-2 py-1 rounded-full ml-4 shrink-0"
                :class="topic.status === 'exists' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'"
              >
                {{ topic.status === 'exists' ? '存在本地MD' : '可生成模板' }}
              </span>
            </button>
          </li>
          <li v-if="availableTopics.length === 0" class="text-center text-gray-500 py-4">
            没有可用的选题信息。
          </li>
        </ul>
      </div>

      <div class="mt-6 text-right">
        <button 
          type="button" 
          @click="closeModal" 
          class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          取消
        </button>
      </div>
    </div>
  </div>

  <!-- Confirmation Modal -->
  <ConfirmationModal
    v-if="showConfirmationModal"
    title="确认操作"
    :message="confirmationMessage"
    confirmText="继续生成"
    cancelText="取消"
    @confirm="handleConfirmGeneration"
    @cancel="handleCancelGeneration"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue';
import { useCardStore } from '../stores/cardStore';
// import ConfirmationModal from './ConfirmationModal.vue'; // 注释掉静态导入
import { getOrdinal } from '../utils/formatters'; // <--- 新增：导入 getOrdinal 工具函数

// +++ 异步导入组件 +++
const ConfirmationModal = defineAsyncComponent(() => 
    import('./ConfirmationModal.vue')
);

const emit = defineEmits(['close', 'generate']);
const store = useCardStore();

// 新增状态：控制确认模态框显示 和 存储待确认的 topic
const showConfirmationModal = ref(false);
const topicToConfirm = ref(null);

// 计算包含状态的选题列表
const availableTopics = computed(() => {
  const mdFilesSet = store.detectedMarkdownFiles instanceof Set ? store.detectedMarkdownFiles : new Set();
  // --- 移除对 detectedJsFilesInfo 的依赖 ---
  // const jsInfo = typeof store.detectedJsFilesInfo === 'object' && store.detectedJsFilesInfo !== null 
  //                ? store.detectedJsFilesInfo 
  //                : {};
  
  return store.topics.map((topic, index) => {
    const hasMd = mdFilesSet.has(topic.id); 
    // --- 移除 hasJsFile 和 hasLocalStorage 的计算 ---
    // const hasJsFile = jsInfo[topic.id] !== undefined;
    // const hasLocalStorage = localStorage.getItem(`cardgen_topic_content_${topic.id}`) !== null;

    // --- 简化状态判断逻辑：只根据 MD 文件是否存在 --- 
    const status = hasMd ? 'exists' : 'generate';

    const displayTitle = `第 ${index + 1} 期 - ${topic.title}`;

    return {
      ...topic,
      displayTitle: displayTitle,
      status: status, // 简化后的状态
      hasMd: hasMd, // 保留 hasMd 用于确认逻辑
      // --- 移除废弃状态 ---
      // hasJsFile: hasJsFile, 
      // hasLocalStorage: hasLocalStorage
    };
  });
});

// 计算属性：生成确认消息
const confirmationMessage = computed(() => {
  if (!topicToConfirm.value) return '';

  // --- 修改：只基于 hasMd 生成消息 ---
  const { title, hasMd } = topicToConfirm.value;
  let reasonText = '';

  if (hasMd) {
      reasonText = '检测到对应的 Markdown 模板文件 (.md)。';
  } else {
      // 理论上不应该到这里，因为 selectTopic 只在 hasMd 为 true 时触发确认
      reasonText = '检测到已有存档 (未知来源)。'; 
  }

  return `选题 "${title}" ${reasonText}\n\n重新生成 Markdown 模板可能会覆盖您已有的本地文件。\n\n确定要继续生成模板吗？`;
});

const closeModal = () => {
  if (showConfirmationModal.value) {
    handleCancelGeneration();
  } else {
    emit('close');
  }
};

const selectTopic = (topic) => {
  // --- 修改：只在 hasMd 为 true 时需要确认 ---
  if (topic.hasMd) {
    topicToConfirm.value = topic; 
    showConfirmationModal.value = true;
  } else {
    // MD 不存在，直接触发生成
    emit('generate', { topicId: topic.id, title: topic.title, description: topic.description, overwrite: false }); // 明确 overwrite 为 false
  }
};

// 处理确认模态框的确认事件
const handleConfirmGeneration = () => {
  if (topicToConfirm.value) {
    // Pass original title, not the formatted one
    emit('generate', { 
        topicId: topicToConfirm.value.id, 
        title: topicToConfirm.value.title, // Use original title
        description: topicToConfirm.value.description, // Pass description too
        overwrite: true // 添加覆盖参数，表示用户已确认覆盖
    }); 
  }
  showConfirmationModal.value = false;
  topicToConfirm.value = null;
};

// 处理确认模态框的取消事件
const handleCancelGeneration = () => {
  // 关闭确认模态框
  showConfirmationModal.value = false;
  topicToConfirm.value = null;
};

// 按 ESC 关闭模态框
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    closeModal(); // 现在 closeModal 会处理确认模态框的关闭
  }
};

onMounted(() => {
  document.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* 优化滚动条样式 (可选) */
.max-h-96::-webkit-scrollbar {
  width: 6px;
}
.max-h-96::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}
.max-h-96::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}
.max-h-96::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}
</style> 