import { ref, computed, onMounted, onBeforeUnmount, shallowRef } from 'vue';
// 移除静态模板导入
// import Template1 from '../templates/Template1.vue'; 
// import Template2 from '../templates/Template2.vue';
// import Template5 from '../templates/Template5.vue';

// 导入新的模板加载器
import { useTemplateLoader } from './useTemplateLoader';

export function useTemplatePreviewScaling(contentRef, emit) {
    const { getAsyncTemplateComponent } = useTemplateLoader();

    const templatesInfo = ref([
        { id: 'template1', name: '模板1', aspectRatio: '3/4' },
        { id: 'template2', name: '模板2', aspectRatio: '3/4' },
        { id: 'template5', name: '模板5', aspectRatio: '16/9' }
    ]);

    // 使用 shallowRef 替代 ref
    const asyncTemplateComponentsMap = shallowRef({});

    // 初始化时填充映射表 (需要修改 .value 的方式)
    const initialMap = {};
    templatesInfo.value.forEach(template => {
        initialMap[template.id] = getAsyncTemplateComponent(template.id);
    });
    // 一次性赋值给 shallowRef 的 .value
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

                // --- RESTORE HEIGHT CALCULATION WITH CHECK --- 
                // 计算并设置容器高度 (确保使用 find 来安全查找)
                try {
                    const templateInfo = templatesInfo.value.find(t => t.id === templatesInfo.value[index]?.id);
                    if (templateInfo && templateInfo.aspectRatio) {
                        const parts = templateInfo.aspectRatio.split('/');
                        if (parts.length === 2) {
                            const wRatio = parseFloat(parts[0]);
                            const hRatio = parseFloat(parts[1]);
                            if (wRatio > 0 && hRatio > 0) {
                                const originalHeight = (hRatio / wRatio) * BASE_CARD_WIDTH;
                                const calculatedHeight = originalHeight * scale;

                                // 获取当前高度 (需要处理空字符串或非像素值的情况)
                                const currentHeightStyle = previewContainer.style.height || '';
                                const currentHeightPx = parseFloat(currentHeightStyle.replace('px', ''));

                                // 仅在高度变化大于 1px 时更新，避免循环
                                if (isNaN(currentHeightPx) || Math.abs(calculatedHeight - currentHeightPx) > 1) {
                                    previewContainer.style.height = `${calculatedHeight}px`;
                                }
                            } else {
                                if (previewContainer.style.height !== 'auto') {
                                    previewContainer.style.height = 'auto'; // Fallback
                                }
                            }
                        } else {
                            if (previewContainer.style.height !== 'auto') {
                                previewContainer.style.height = 'auto'; // Fallback
                            }
                        }
                    } else {
                        if (previewContainer.style.height !== 'auto') {
                            previewContainer.style.height = 'auto'; // Fallback
                        }
                    }
                } catch (e) {
                    console.error("Error calculating preview height:", e);
                    if (previewContainer.style.height !== 'auto') {
                        previewContainer.style.height = 'auto'; // Fallback on error
                    }
                }
                // --- END OF RESTORED BLOCK ---
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
        templatesInfo,
        previewCoverContent,
        templateItemRefs,
        scalingDivRefs,
        asyncTemplateComponentsMap,
        selectTemplate,
        updateScale
    };
} 