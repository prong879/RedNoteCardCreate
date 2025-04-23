<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <div class="relative py-3 sm:max-w-6xl sm:mx-auto w-full">
      <div class="relative px-4 py-4 sm:pt-8 sm:px-20 sm:pb-20">
        <div class="mx-auto">
          <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-xhs-pink">小红书知识卡片生成器</h1>
            <p class="mt-2 text-xhs-gray">时间序列知识科普 · 高效生成精美卡片</p>
          </div>
          
          <!-- 主题选择器 -->
          <TopicSelector v-if="showTopicSelector" @select-topic="loadTopic" />
          
          <div v-else>
            <!-- 移除返回按钮 -->
            <!-- 
            <button 
              @click="showTopicSelector = true" 
              class="mb-6 px-4 py-1 border border-xhs-gray text-xhs-gray rounded-lg text-sm hover:border-xhs-pink hover:text-xhs-pink transition-colors bg-white"
            >
              ← 返回选择主题
            </button>
            -->
            
            <div class="flex flex-col lg:flex-row gap-8">
              <!-- 左侧：配置面板 -->
              <div class="lg:w-1/2 bg-white rounded-lg shadow-lg p-6">
                <CardConfig 
                  :selectedTemplate="selectedTemplate"
                  :cardContent="cardContent"
                  :topicId="currentTopicId"
                  @update:template="selectedTemplate = $event"
                  @update:content="updateCardContent"
                  @return-to-topics="showTopicSelector = true"
                  @save-content="generateContentJsFile"
                />
              </div>
              
              <!-- 右侧：预览面板 -->
              <div class="lg:w-1/2 bg-white rounded-lg shadow-lg p-6">
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
import { topicsMeta } from './content/topicsMeta'

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
    const cardContent = ref({})
    
    // 当前主题ID
    const currentTopicId = ref(null)
    
    // 加载主题
    const loadTopic = async ({ key: topicId }) => {
      console.log(`Attempting to load topic: ${topicId}`);
      currentTopicId.value = topicId;

      try {
        // 修改动态导入路径: ../content/ -> ./content/
        const contentModule = await import(/* @vite-ignore */ `./content/${topicId}_content.js`);
        
        if (contentModule && contentModule[`${topicId}_contentData`]) {
          cardContent.value = { ...contentModule[`${topicId}_contentData`] };
          console.log('Successfully loaded content from file for', topicId);
        } else {
            console.warn(`Data export not found in ${topicId}_content.js, loading placeholder.`);
            loadPlaceholderContent(topicId); 
        }
      } catch (error) {
        console.log(`Content file for ${topicId} not found or failed to load, loading placeholder. Error:`, error);
        loadPlaceholderContent(topicId);
      }
      showTopicSelector.value = false;
    }
    
    // Load placeholder content
    const loadPlaceholderContent = (topicId) => {
      const meta = topicsMeta.find(t => t.id === topicId);
      const placeholderText = "请在此处输入文案...";
      cardContent.value = {
        headerText: '', // 顶层页眉页脚
        footerText: '',
        coverCard: {
          title: meta?.title || `选题 ${topicId}`,
          subtitle: placeholderText,
          showHeader: true, // 添加可见性状态
          showFooter: true  // 添加可见性状态
        },
        contentCards: [
          {
            title: placeholderText,
            body: placeholderText,
            showHeader: true, // 添加可见性状态
            showFooter: true  // 添加可见性状态
          }
        ],
        mainText: placeholderText
      };
    };
    
    // 更新卡片内容
    const updateCardContent = (newContent) => {
      cardContent.value = { ...cardContent.value, ...newContent }
    }
    
    // Generate and download the JS content file
    const generateContentJsFile = () => {
      if (!currentTopicId.value) {
        alert("请先选择一个选题！");
        return;
      }
      const topicId = currentTopicId.value;
      const contentToSave = cardContent.value;
      const filename = `${topicId}_content.js`;
      
      // Format the content as JS code string
      const fileContent = `// src/content/${filename}\n// Generated at: ${new Date().toISOString()}\n\nexport const ${topicId}_contentData = ${JSON.stringify(contentToSave, null, 2)};\n`;

      // Create a Blob and download link
      const blob = new Blob([fileContent], { type: 'text/javascript;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      
      // Simulate click to trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      alert(`已生成 ${filename} 文件供下载。
请手动将其移动到项目的 'src/content/' 目录下替换旧文件。`);
    };
    
    return {
      showTopicSelector,
      selectedTemplate,
      cardContent,
      currentTopicId,
      loadTopic,
      updateCardContent,
      generateContentJsFile
    }
  }
}
</script> 