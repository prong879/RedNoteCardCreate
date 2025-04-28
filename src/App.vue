<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <div class="relative py-3 sm:max-w-6xl sm:mx-auto w-full">
      <div class="relative px-4 py-4 sm:pt-8 sm:px-20 sm:pb-20">
        <div class="mx-auto">
          <div class="text-center mb-10">
            <h1 class="text-3xl font-bold text-xhs-pink">小红书知识卡片生成器</h1>
            <p class="mt-2 text-xhs-gray">{{ currentTopicTitle || '请选择一个主题开始' }}</p>
          </div>
          
          <!-- 主题选择器 -->
          <TopicSelector v-if="showTopicSelector" @select-topic="loadTopic" />
          
          <div v-else>           
            <div class="flex flex-col lg:flex-row gap-8">
              <!-- 左侧：配置面板 -->
              <div class="lg:w-1/2 bg-white rounded-lg shadow-lg">
                <CardConfig 
                  :selectedTemplate="selectedTemplate"
                  :cardContent="cardContent"
                  :topicId="currentTopicId"
                  :focused-editor-index="focusedEditorIndex"
                  @update:template="selectedTemplate = $event"
                  @update:content="updateCardContent"
                  @return-to-topics="showTopicSelector = true"
                  @save-content="generateContentJsFile"
                  @save-locally="saveContentLocally"
                  @focus-preview-card="handleFocusPreviewCard"
                  @update:topicDescription="handleDescriptionUpdate"
                />
              </div>
              
              <!-- 右侧：预览面板 -->
              <div class="lg:w-1/2 bg-white rounded-lg shadow-lg p-6">
                <CardPreview 
                  :template="selectedTemplate"
                  :content="cardContent"
                  :topicId="currentTopicId"
                  :focused-preview-index="focusedPreviewIndex"
                  @reset-focus="focusedPreviewIndex = null"
                  @preview-scrolled-to-index="handlePreviewScrolled"
                  @update:mainText="updateMainText"
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
import { useToast } from "vue-toastification";
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
    // 新增：获取 toast 实例
    const toast = useToast();
    
    // 控制是否显示主题选择器
    const showTopicSelector = ref(true);
    
    // 默认选择模板1
    const selectedTemplate = ref('template1')
    
    // 卡片内容，默认使用第一个主题
    const cardContent = ref({})
    
    // 当前主题ID
    const currentTopicId = ref(null)
    
    const focusedPreviewIndex = ref(null);
    const focusedEditorIndex = ref(null);
    const currentTopicTitle = ref('');
    
    // 加载主题
    const loadTopic = async ({ key: topicId }) => {
      console.log(`Attempting to load topic: ${topicId}`);
      currentTopicId.value = topicId;
      
      // 首先根据 topicId 查找 meta 信息并更新标题
      const meta = topicsMeta.find(t => t.id === topicId);
      currentTopicTitle.value = meta?.title || `未命名主题 (${topicId})`;
      const topicDescription = meta?.description || '没有找到该选题的描述信息。'; // 获取描述

      try {
        // 修改动态导入路径: ../content/ -> ./content/
        const contentModule = await import(`./content/${topicId}_content.js`);
        
        if (contentModule && contentModule[`${topicId}_contentData`]) {
          // 加载时合并内容数据和描述
          cardContent.value = {
            ...contentModule[`${topicId}_contentData`],
            topicDescription: topicDescription // 添加描述字段
          };
          console.log('Successfully loaded content from file for', topicId);
        } else {
            console.warn(`Data export not found in ${topicId}_content.js, loading placeholder.`);
            loadPlaceholderContent(topicId, topicDescription); // 传递描述
        }
      } catch (error) {
        console.log(`Content file for ${topicId} not found or failed to load, loading placeholder. Error:`, error);
        loadPlaceholderContent(topicId, topicDescription); // 传递描述
      }
      showTopicSelector.value = false;
    }
    
    // Load placeholder content
    const loadPlaceholderContent = (topicId, description = '占位符描述') => {
      const meta = topicsMeta.find(t => t.id === topicId);
      const placeholderText = "请在此处输入文案...";
      cardContent.value = {
        topicDescription: description, // 添加描述字段
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
        // 修改：使用 toast.error 替换 alert
        toast.error("请先选择一个选题！");
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
      
      // 修改：使用 toast.success 替换 alert，并调整提示信息
      toast.success(`已生成 ${filename} 文件供下载。请手动将其移动到项目的 'src/content/' 目录下替换旧文件。`, {
          timeout: 8000 // 延长提示显示时间
      });
    };
    
    // 新增：保存内容到本地 JS 文件 (仅限开发环境)
    const saveContentLocally = async () => {
      if (!currentTopicId.value) {
        toast.error("错误：无法获取当前主题 ID");
        return;
      }
      if (!cardContent.value) {
        toast.error("错误：没有内容可以保存");
        return;
      }
      
      const topicId = currentTopicId.value;
      const contentData = cardContent.value;
      const filename = `${topicId}_content.js`;

      // 显示加载提示
      const loadingToastId = toast.info(`正在保存内容到本地文件 ${filename}...`, {
          timeout: false // 不自动关闭
      });

      try {
        const response = await fetch('/api/save-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ topicId, contentData }),
        });

        // 关闭加载提示
        toast.dismiss(loadingToastId);

        const result = await response.json();

        if (response.ok) {
          toast.success(result.message || `成功保存到 ${filename}`);
          console.log('[Save Locally] 保存成功:', result);
        } else {
          toast.error(`保存失败 (${response.status}): ${result.message || '未知错误'}`);
          console.error('[Save Locally] 保存失败:', result);
        }
      } catch (error) {
        // 关闭加载提示
        toast.dismiss(loadingToastId);
        toast.error(`保存时发生网络或解析错误: ${error.message}`);
        console.error('[Save Locally] 请求或解析错误:', error);
      }
    };
    
    const handleFocusPreviewCard = (index) => {
      console.log('App received focus event for index:', index);
      focusedPreviewIndex.value = index;
    };
    
    // 新增：处理预览滚动事件
    const handlePreviewScrolled = (index) => {
      console.log('App received preview scroll event for editor index:', index);
      focusedEditorIndex.value = index; 
    };
    
    // 新增：处理主文案更新事件
    const updateMainText = (newText) => {
      if (cardContent.value) { // 确保 cardContent 已加载
        cardContent.value.mainText = newText;
      }
    };
    
    // 新增：处理来自子组件的描述更新事件
    const handleDescriptionUpdate = (newDescription) => {
        if (cardContent.value) {
            cardContent.value.topicDescription = newDescription;
        }
    };
    
    return {
      showTopicSelector,
      selectedTemplate,
      cardContent,
      currentTopicId,
      loadTopic,
      updateCardContent,
      generateContentJsFile,
      focusedPreviewIndex,
      handleFocusPreviewCard,
      focusedEditorIndex,
      handlePreviewScrolled,
      currentTopicTitle,
      updateMainText,
      saveContentLocally,
      handleDescriptionUpdate
    }
  }
}
</script> 