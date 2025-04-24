import { nextTick } from 'vue';

export function useTextareaAutoHeight(rootElementRef) {

    // 调整单个文本域高度
    const adjustSingleTextarea = (textarea) => {
        if (textarea && textarea.scrollHeight) { // 确保元素存在且 scrollHeight 可用
            textarea.style.height = 'auto'; // 先重置高度以获取正确 scrollHeight
            textarea.style.height = `${textarea.scrollHeight + 2}px`; // 加一点余量避免滚动条闪烁
        }
    };

    // 调整指定根元素下所有 .dynamic-textarea 的高度
    const adjustAllTextareas = () => {
        if (rootElementRef.value) {
            const textareas = rootElementRef.value.querySelectorAll('.dynamic-textarea');
            textareas.forEach(adjustSingleTextarea);
        }
    };

    return {
        adjustSingleTextarea,
        adjustAllTextareas
    };
} 