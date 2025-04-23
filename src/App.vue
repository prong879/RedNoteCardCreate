<template>
  <div class="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
    <div class="relative py-3 sm:max-w-6xl sm:mx-auto">
      <div class="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
        <div class="mx-auto">
          <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-xhs-pink">小红书知识卡片生成器</h1>
            <p class="mt-2 text-xhs-gray">时间序列知识科普 · 高效生成精美卡片</p>
          </div>
          
          <!-- 主题选择器 -->
          <TopicSelector v-if="showTopicSelector" @select-topic="loadTopic" />
          
          <div v-else>
            <!-- 返回按钮 -->
            <button 
              @click="showTopicSelector = true" 
              class="mb-6 px-4 py-1 border border-xhs-gray text-xhs-gray rounded-lg text-sm hover:border-xhs-pink hover:text-xhs-pink transition-colors"
            >
              ← 返回选择主题
            </button>
            
            <div class="flex flex-col lg:flex-row gap-8">
              <!-- 左侧：配置面板 -->
              <div class="lg:w-1/2">
                <CardConfig 
                  :selectedTemplate="selectedTemplate"
                  :cardContent="cardContent"
                  @update:template="selectedTemplate = $event"
                  @update:content="updateCardContent"
                />
              </div>
              
              <!-- 右侧：预览面板 -->
              <div class="lg:w-1/2">
                <CardPreview 
                  :template="selectedTemplate"
                  :content="cardContent"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue'
import CardConfig from './components/CardConfig.vue'
import CardPreview from './components/CardPreview.vue'
import TopicSelector from './components/TopicSelector.vue'
import { topic01 } from './content/topicTemplates'

export default {
  name: 'App',
  components: {
    CardConfig,
    CardPreview,
    TopicSelector
  },
  setup() {
    // 控制是否显示主题选择器
    const showTopicSelector = ref(true);
    
    // 默认选择模板1
    const selectedTemplate = ref('template1')
    
    // 卡片内容，默认使用第一个主题
    const cardContent = ref({ ...topic01 })
    
    // 加载主题
    const loadTopic = ({ key, content }) => {
      console.log(`加载主题: ${key}`);
      cardContent.value = { ...content };
      showTopicSelector.value = false;
    }
    
    // 更新卡片内容
    const updateCardContent = (newContent) => {
      cardContent.value = { ...cardContent.value, ...newContent }
    }
    
    return {
      showTopicSelector,
      selectedTemplate,
      cardContent,
      loadTopic,
      updateCardContent
    }
  }
}
</script> 