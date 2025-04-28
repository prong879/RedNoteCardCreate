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
                {{ topic.status === 'exists' ? '已有本地存档' : '可生成模板' }}
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
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useCardStore } from '../stores/cardStore';
import ConfirmationModal from './ConfirmationModal.vue'; // 引入确认模态框

// --- NEW: Add getOrdinal function (copied from TopicSelector) --- 
function getOrdinal(n) {
    if (typeof n !== 'number' || n < 1) return { number: n, suffix: '' };
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    const suffix = s[(v - 20) % 10] || s[v] || s[0];
    return { number: n, suffix: suffix };
}

const emit = defineEmits(['close', 'generate']);
const store = useCardStore();

// 新增状态：控制确认模态框显示 和 存储待确认的 topic
const showConfirmationModal = ref(false);
const topicToConfirm = ref(null);

// 计算包含状态的选题列表
const availableTopics = computed(() => {
  // Use index from map to calculate ordinal
  return store.topics.map((topic, index) => { 
    const hasLocalStorage = localStorage.getItem(`cardgen_topic_content_${topic.id}`) !== null;
    const jsFilePathKey = `../content/${topic.id}_content.js`;
    const hasJsFile = store.detectedContentJsModules && store.detectedContentJsModules[jsFilePathKey] !== undefined;
    const status = (hasLocalStorage || hasJsFile) ? 'exists' : 'generate';
    
    // 直接使用中文格式，不再调用 getOrdinal
    const displayTitle = `第 ${index + 1} 期 - ${topic.title}`; 

    return {
      ...topic, // Spread original topic properties (like id, title, description)
      displayTitle: displayTitle, // Add the formatted title
      status: status, 
      hasJsFile: hasJsFile, 
      hasLocalStorage: hasLocalStorage 
    };
  });
});

// 计算属性：生成确认消息
const confirmationMessage = computed(() => {
  if (!topicToConfirm.value) return '';

  // Use original title for confirmation message for clarity
  const { title, hasJsFile, hasLocalStorage } = topicToConfirm.value; 
  let reason = '';

  if (hasJsFile && hasLocalStorage) {
    reason = '既检测到对应的 JS 内容文件，也存在本地编辑记录 (localStorage)。';
  } else if (hasJsFile) {
    reason = '检测到对应的 JS 内容文件。';
  } else if (hasLocalStorage) {
    reason = '存在本地编辑记录 (localStorage)。';
  } else {
    reason = '检测到已有存档。'; 
  }

  // Keep using the original title in the confirmation message
  return `选题 "${title}" ${reason}\n\n重新生成 Markdown 模板可能会导致后续导入时覆盖已有数据。\n\n确定要继续生成模板吗？`;
});

const closeModal = () => {
  if (showConfirmationModal.value) {
    handleCancelGeneration();
  } else {
    emit('close');
  }
};

const selectTopic = (topic) => {
  if (topic.hasJsFile || topic.hasLocalStorage) {
    topicToConfirm.value = topic; 
    showConfirmationModal.value = true;
  } else {
    // Pass original title, not the formatted one
    emit('generate', { topicId: topic.id, title: topic.title, description: topic.description }); 
  }
};

// 处理确认模态框的确认事件
const handleConfirmGeneration = () => {
  if (topicToConfirm.value) {
    // Pass original title, not the formatted one
    emit('generate', { 
        topicId: topicToConfirm.value.id, 
        title: topicToConfirm.value.title, // Use original title
        description: topicToConfirm.value.description // Pass description too
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