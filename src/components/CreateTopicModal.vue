<template>
  <div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex justify-center items-center" @click.self="closeModal">
    <div class="relative mx-auto p-6 border w-full max-w-md shadow-lg rounded-md bg-white">
      <div class="text-center">
        <h3 class="text-lg leading-6 font-medium text-gray-900">创建新的 Markdown 选题</h3>
        <div class="mt-4 px-7 py-3">
          <form @submit.prevent="handleSubmit">
            <div class="mb-4">
              <label for="topicId" class="block text-sm font-medium text-gray-700 text-left mb-1">Topic ID</label>
              <input 
                type="text" 
                id="topicId" 
                v-model="topicId" 
                required 
                placeholder="例如: topic05" 
                pattern="^[a-zA-Z0-9_-]+$"
                title="只允许字母、数字、下划线和短横线"
                class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p v-if="idError" class="text-red-500 text-xs mt-1 text-left">{{ idError }}</p>
            </div>
            <div class="mb-6">
              <label for="title" class="block text-sm font-medium text-gray-700 text-left mb-1">标题</label>
              <input 
                type="text" 
                id="title" 
                v-model="title" 
                required 
                placeholder="例如: 如何学习 Vue 3" 
                class="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
              <p v-if="titleError" class="text-red-500 text-xs mt-1 text-left">{{ titleError }}</p>
            </div>
            <div class="flex items-center justify-end space-x-4">
              <button 
                type="button" 
                @click="closeModal" 
                class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                取消
              </button>
              <button 
                type="submit" 
                class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                :disabled="!isFormValid"
                :class="{ 'opacity-50 cursor-not-allowed': !isFormValid }"
              >
                确认创建
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['close', 'create']);

const topicId = ref('');
const title = ref('');
const idError = ref('');
const titleError = ref('');

// 校验 Topic ID 格式
const isIdValid = computed(() => {
    const pattern = /^[a-zA-Z0-9_-]+$/;
    const isValid = pattern.test(topicId.value);
    idError.value = isValid || topicId.value === '' ? '' : 'ID 格式无效 (仅允许字母、数字、下划线、短横线)';
    return isValid && topicId.value.length > 0;
});

// 校验标题不为空
const isTitleValid = computed(() => {
    const isValid = title.value.trim().length > 0;
    titleError.value = isValid ? '' : '标题不能为空';
    return isValid;
});

// 表单整体是否有效
const isFormValid = computed(() => isIdValid.value && isTitleValid.value);

const closeModal = () => {
  emit('close');
};

const handleSubmit = () => {
  // 再次检查有效性，以防万一
  if (isFormValid.value) {
    emit('create', { topicId: topicId.value.trim(), title: title.value.trim() });
  } else {
    // 触发一次校验以显示错误信息
    isIdValid.value; 
    isTitleValid.value;
    console.warn('表单校验未通过，无法提交。');
  }
};

// 按 ESC 关闭模态框
const handleKeydown = (event) => {
  if (event.key === 'Escape') {
    closeModal();
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
/* 可以添加一些模态框过渡效果 */
</style> 