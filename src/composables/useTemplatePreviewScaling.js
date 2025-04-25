import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Template1 from '../templates/Template1.vue';
import Template2 from '../templates/Template2.vue';
import Template5 from '../templates/Template5.vue';

export function useTemplatePreviewScaling(contentRef, emit) {

    const templatesInfo = ref([
        { id: 'template1', name: '模板1', aspectRatio: '3/4' },
        { id: 'template2', name: '模板2', aspectRatio: '3/4' },
        { id: 'template5', name: '模板5', aspectRatio: '16/9' } // 注意：实际比例可能需要根据Template5确认
    ]);

    const templateComponentMap = {
        template1: Template1,
        template2: Template2,
        template5: Template5
    };

    // 用于预览的封面内容，依赖外部传入的 contentRef
    const previewCoverContent = computed(() => ({
        title: contentRef.value?.coverCard?.title || '标题',
        subtitle: contentRef.value?.coverCard?.subtitle || '副标题'
    }));

    const templateItemRefs = ref([]); // Ref for each template item's outer div
    const scalingDivRefs = ref([]);   // Ref for the div that gets scaled
    let resizeObserver = null;
    const BASE_CARD_WIDTH = 320; // 模板的基础宽度，用于计算缩放比例

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

                // 计算并设置容器高度
                try {
                    const templateInfo = templatesInfo.value[index];
                    if (templateInfo && templateInfo.aspectRatio) {
                        const parts = templateInfo.aspectRatio.split('/');
                        if (parts.length === 2) {
                            const wRatio = parseFloat(parts[0]);
                            const hRatio = parseFloat(parts[1]);
                            if (wRatio > 0 && hRatio > 0) {
                                const originalHeight = (hRatio / wRatio) * BASE_CARD_WIDTH;
                                const scaledHeight = originalHeight * scale;
                                previewContainer.style.height = `${scaledHeight}px`;
                            } else {
                                previewContainer.style.height = 'auto';
                            }
                        } else {
                            previewContainer.style.height = 'auto';
                        }
                    } else {
                        previewContainer.style.height = 'auto';
                    }
                } catch (e) {
                    console.error("Error calculating preview height:", e);
                    previewContainer.style.height = 'auto';
                }
            }
        });
    };

    // 获取模板对应的 Vue 组件
    const getTemplateComponent = (templateId) => {
        return templateComponentMap[templateId] || Template1; // 默认为 Template1
    };

    // 选择模板时触发父组件事件
    const selectTemplate = (templateId) => {
        emit('update:template', templateId);
    };

    // 在组件挂载后初始化 ResizeObserver 并进行首次缩放计算
    onMounted(() => {
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(entries => {
                updateScale(); // 容器尺寸变化时重新计算缩放
            });
            templateItemRefs.value.forEach(el => {
                if (el) {
                    resizeObserver.observe(el);
                }
            });
            updateScale(); // 初始计算
        } else {
            // 兼容性处理或提示
            console.warn('ResizeObserver is not supported in this browser. Preview scaling might not work correctly on resize.');
            // 可以在这里添加 window resize listener 作为后备，但性能不如 ResizeObserver
            updateScale(); // 尝试在挂载时计算一次
        }
    });

    // 在组件卸载前断开 ResizeObserver
    onBeforeUnmount(() => {
        if (resizeObserver) {
            resizeObserver.disconnect();
        }
        // 如果使用了 window resize listener 作为后备，也需要在这里移除
    });

    return {
        templatesInfo,
        previewCoverContent,
        templateItemRefs,
        scalingDivRefs,
        getTemplateComponent,
        selectTemplate,
        updateScale // 暴露 updateScale 可能用于手动触发更新
    };
} 