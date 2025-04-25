import { ref, computed, onMounted, onBeforeUnmount, shallowRef } from 'vue';
// 移除静态模板导入
// import Template1 from '../templates/Template1.vue'; 
// import Template2 from '../templates/Template2.vue';
// import Template5 from '../templates/Template5.vue';

// 导入新的模板加载器
import { useTemplateLoader } from './useTemplateLoader';

export function useTemplatePreviewScaling(contentRef, emit) {
    // 从 useTemplateLoader 获取动态生成的 templatesInfo 和加载器
    const { templatesInfo: importedTemplatesInfo, getAsyncTemplateComponent } = useTemplateLoader();

    // 直接使用导入的 templatesInfo (它已经是响应式的，因为 useTemplateLoader 内部创建)
    // 注意：如果 useTemplateLoader 不是响应式导出，则需要 ref(importedTemplatesInfo)
    const templatesInfo = ref(importedTemplatesInfo); // 保持 ref 包装以防万一

    const asyncTemplateComponentsMap = shallowRef({});

    // 初始化时填充映射表 (使用动态的 templatesInfo)
    const initialMap = {};
    templatesInfo.value.forEach(template => {
        initialMap[template.id] = getAsyncTemplateComponent(template.id);
    });
    asyncTemplateComponentsMap.value = initialMap;

    const previewCoverContent = computed(() => ({
        title: contentRef.value?.coverCard?.title || '标题',
        subtitle: contentRef.value?.coverCard?.subtitle || '副标题'
    }));

    const templateItemRefs = ref([]);
    const scalingDivRefs = ref([]);
    let resizeObserver = null;
    const BASE_CARD_WIDTH = 320;

    // 更新所有预览图的缩放比例和容器高度
    const updateScale = () => {
        templateItemRefs.value.forEach((itemEl, index) => {
            if (itemEl && scalingDivRefs.value[index]) {
                const previewContainer = itemEl.querySelector('.preview-container');
                if (!previewContainer) return;

                const containerWidth = previewContainer.clientWidth;
                const safeContainerWidth = Math.max(1, containerWidth);
                const scale = Math.min(1, safeContainerWidth / BASE_CARD_WIDTH);
                scalingDivRefs.value[index].style.transform = `scale(${scale})`;

                // --- HEIGHT CALCULATION WITH CHECK --- 
                try {
                    // 修正：确保 find 使用正确的索引或 ID
                    const currentTemplateId = templatesInfo.value[index]?.id;
                    const templateInfo = currentTemplateId ? templatesInfo.value.find(t => t.id === currentTemplateId) : null;

                    if (templateInfo && templateInfo.aspectRatio) {
                        const parts = templateInfo.aspectRatio.split('/');
                        if (parts.length === 2) {
                            const wRatio = parseFloat(parts[0]);
                            const hRatio = parseFloat(parts[1]);
                            if (wRatio > 0 && hRatio > 0) {
                                const originalHeight = (hRatio / wRatio) * BASE_CARD_WIDTH;
                                const calculatedHeight = originalHeight * scale;
                                const currentHeightStyle = previewContainer.style.height || '';
                                const currentHeightPx = parseFloat(currentHeightStyle.replace('px', ''));

                                if (isNaN(currentHeightPx) || Math.abs(calculatedHeight - currentHeightPx) > 1) {
                                    previewContainer.style.height = `${calculatedHeight}px`;
                                }
                            } else {
                                if (previewContainer.style.height !== 'auto') {
                                    previewContainer.style.height = 'auto';
                                }
                            }
                        } else {
                            if (previewContainer.style.height !== 'auto') {
                                previewContainer.style.height = 'auto';
                            }
                        }
                    } else {
                        if (previewContainer.style.height !== 'auto') {
                            previewContainer.style.height = 'auto';
                        }
                    }
                } catch (e) {
                    console.error("Error calculating preview height:", e);
                    if (previewContainer.style.height !== 'auto') {
                        previewContainer.style.height = 'auto';
                    }
                }
                // --- END OF HEIGHT CALCULATION ---
            }
        });
    };

    // 选择模板时触发父组件事件
    const selectTemplate = (templateId) => {
        emit('update:template', templateId);
    };

    // 在组件挂载后初始化 ResizeObserver 并进行首次缩放计算
    onMounted(() => {
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(updateScale);
            templateItemRefs.value.forEach(el => {
                if (el) resizeObserver.observe(el);
            });
            updateScale();
        } else {
            console.warn('ResizeObserver not supported...');
            updateScale();
        }
    });

    // 在组件卸载前断开 ResizeObserver
    onBeforeUnmount(() => {
        if (resizeObserver) resizeObserver.disconnect();
    });

    return {
        templatesInfo, // 现在是动态生成的
        previewCoverContent,
        templateItemRefs,
        scalingDivRefs,
        asyncTemplateComponentsMap,
        selectTemplate,
        updateScale
    };
} 