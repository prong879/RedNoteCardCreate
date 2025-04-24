import { ref, watch, nextTick } from 'vue';

export function useCardManagement(props, emit) {
    const content = ref({});

    // 深拷贝初始 props.cardContent 到本地 ref
    watch(() => props.cardContent, (newVal) => {
        // 使用 JSON 方法进行深拷贝，兼容性好，适用于当前数据结构
        // 注意：此方法无法处理 Date, RegExp, Map, Set, Function 等特殊类型
        // 移除 structuredClone 尝试和浅拷贝后备
        if (newVal && typeof newVal === 'object') { // 确保 newVal 是一个对象且不为 null
            try {
                content.value = JSON.parse(JSON.stringify(newVal));
            } catch (e) {
                console.error('深拷贝 cardContent 失败 (JSON.parse/stringify): ', e, '原始值:', newVal);
                // 拷贝失败时，至少给一个空对象，避免后续操作出错
                content.value = {};
            }
        } else {
            // 如果 newVal 不是有效对象 (可能是 null, undefined, 或非对象类型)
            content.value = {}; // 或者根据需要设置为其他默认值
        }
        // 初始加载时不一定需要立即emit updateContent
    }, { deep: true, immediate: true });

    // 通知父组件内容已更新
    const updateContent = () => {
        emit('update:content', { ...content.value });
    };

    // 添加新卡片
    const addCard = (adjustAllTextareasCallback) => {
        if (!Array.isArray(content.value.contentCards)) {
            content.value.contentCards = [];
        }
        content.value.contentCards.push({
            title: '新卡片标题',
            body: '在这里输入卡片内容...',
            showHeader: true,
            showFooter: true
        });
        updateContent();
        // 添加卡片后，需要重新计算文本域高度
        nextTick(adjustAllTextareasCallback);
    };

    // 删除卡片
    const removeCard = (index) => {
        if (Array.isArray(content.value.contentCards) && content.value.contentCards.length > 1) {
            content.value.contentCards.splice(index, 1);
            updateContent();
        }
    };

    // 切换页眉/页脚可见性
    const toggleVisibility = (cardType, field, index = null) => {
        let card;
        if (cardType === 'coverCard') {
            card = content.value.coverCard;
        } else if (cardType === 'contentCard' && index !== null && content.value.contentCards && content.value.contentCards[index]) {
            card = content.value.contentCards[index];
        }

        if (card) {
            // 确保属性存在且初始化为布尔值
            if (typeof card[field] !== 'boolean') {
                card[field] = true; // 默认为 true
            }
            card[field] = !card[field];
        }
        updateContent();
    };

    // 获取可见性切换按钮的样式类
    const getButtonClass = (isVisible) => {
        const visible = typeof isVisible === 'boolean' ? isVisible : true; // 默认视为可见
        return visible
            ? 'border border-gray-400 text-gray-600 bg-gray-100 hover:bg-gray-200'
            : 'border border-blue-500 text-blue-600 bg-blue-100 hover:bg-blue-200';
    };

    // 拖拽结束时更新内容
    const onDragEnd = () => {
        updateContent();
    };

    return {
        content,
        addCard,
        removeCard,
        toggleVisibility,
        getButtonClass,
        onDragEnd,
        updateContent // 暴露 updateContent 以便文本域输入时调用
    };
} 