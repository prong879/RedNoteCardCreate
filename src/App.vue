<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <div class="relative py-3 sm:max-w-6xl sm:mx-auto w-full">
      <div class="relative px-4 py-4 sm:pt-8 sm:px-20 sm:pb-20">
        <div class="mx-auto">
          <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-xhs-pink">小红书知识卡片生成器</h1>
            <p class="mt-2 text-xhs-gray">{{ displayTitle || '请选择一个主题开始' }}</p>
          </div>
          
          <!-- 主题选择器 -->
          <TopicSelector v-if="store.showTopicSelector" @select-topic="handleSelectTopic" />
          
          <div v-else>           
            <div class="flex flex-col lg:flex-row gap-8">
              <!-- 左侧：配置面板 -->
              <div class="lg:w-1/2 bg-white rounded-lg shadow-lg">
                <CardConfig />
              </div>
              
              <!-- 右侧：预览面板 -->
              <div class="lg:w-1/2 bg-white rounded-lg shadow-lg p-6">
                <CardPreview />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useCardStore } from './stores/cardStore'
import CardConfig from './components/CardConfig.vue'
import CardPreview from './components/CardPreview.vue'
import TopicSelector from './components/TopicSelector.vue'

export default {
  name: 'App',
  components: {
    CardConfig,
    CardPreview,
    TopicSelector
  },
  setup() {
    const store = useCardStore();
    
    const issueNumber = computed(() => {
      if (!store.currentTopicId) return null;
      const match = store.currentTopicId.match(/^topic(\d+)$/i);
      return match ? parseInt(match[1], 10) : null;
    });

    const displayTitle = computed(() => {
      if (!store.currentTopicTitle) return null;
      if (issueNumber.value !== null) {
        return `第${issueNumber.value}期 - ${store.currentTopicTitle}`;
      }
      return store.currentTopicTitle;
    });
    
    const handleSelectTopic = ({ key: topicId }) => {
      store.loadTopic(topicId);
    };

    return {
      store,
      handleSelectTopic,
      displayTitle
    }
  }
}
</script> 