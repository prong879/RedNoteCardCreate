import { ref, watch, nextTick } from 'vue';

// 新增：创建默认空卡片对象
const createEmptyCard = () => ({
    title: '新卡片标题',
    body: '在这里输入卡片内容...',
    showHeader: true, // 或根据 contentDefaultShowHeader/Footer 决定
    showFooter: true
});

export function useCardManagement(props, emit) {
    const content = ref({ contentCards: [] }); // 初始化确保 contentCards 是数组

    // 深拷贝初始 props.cardContent 到本地 ref
    watch(() => props.cardContent, (newVal) => {
        if (newVal && typeof newVal === 'object') {
            try {
                content.value = JSON.parse(JSON.stringify(newVal));
                // 确保 contentCards 始终是数组
                if (!Array.isArray(content.value.contentCards)) {
                    content.value.contentCards = [];
                }
            } catch (e) {
                console.error('深拷贝 cardContent 失败 (JSON.parse/stringify): ', e, '原始值:', newVal);
                content.value = { contentCards: [] }; // 保证结构基本正确
            }
        } else {
            content.value = { contentCards: [] };
        }
    }, { deep: true, immediate: true });

    // 通知父组件内容已更新
    const updateContent = () => {
        // 在发送更新前，确保 contentCards 仍然是数组
        if (!Array.isArray(content.value.contentCards)) {
            console.warn('Content.contentCards is not an array before emitting update. Fixing.');
            content.value.contentCards = [];
        }
        emit('update:content', JSON.parse(JSON.stringify(content.value))); // 仍然使用深拷贝发送，避免父组件意外修改内部状态
    };

    // 修改：添加/插入新卡片到指定索引
    // 移除 adjustAllTextareasCallback 参数，由调用方处理 UI 更新
    const addCard = (index, cardData = null) => {
        if (!Array.isArray(content.value.contentCards)) {
            console.error('无法添加卡片：content.contentCards 不是数组！');
            content.value.contentCards = []; // 尝试修复
        }
        const newCard = cardData || createEmptyCard(); // 如果没提供数据，则使用默认

        // 确保 index 是有效数字，如果无效或未提供，则默认添加到末尾
        const insertIndex = (typeof index === 'number' && index >= 0 && index <= content.value.contentCards.length)
            ? index
            : content.value.contentCards.length; // 默认添加到末尾

        try {
            content.value.contentCards.splice(insertIndex, 0, newCard);
            console.log(`Card added at index: ${insertIndex}`, content.value.contentCards);
            updateContent(); // 更新父组件
        } catch (error) {
            console.error(`Error splicing card at index ${insertIndex}:`, error);
            // 可以在这里添加一些错误恢复逻辑，比如确保 contentCards 仍然是数组
            if (!Array.isArray(content.value.contentCards)) {
                content.value.contentCards = [];
            }
        }
    };

    // 删除卡片
    const removeCard = (index) => {
        if (Array.isArray(content.value.contentCards) && content.value.contentCards.length > 1 && index >= 0 && index < content.value.contentCards.length) {
            content.value.contentCards.splice(index, 1);
            updateContent();
        } else {
            console.warn(`无法删除卡片索引 ${index}：数组长度不足或索引无效。`);
        }
    };

    // 切换页眉/页脚可见性
    const toggleVisibility = (cardType, field, index = null) => {
        let card;
        if (cardType === 'coverCard') {
            card = content.value.coverCard;
        } else if (cardType === 'contentCard' && index !== null && Array.isArray(content.value.contentCards) && content.value.contentCards[index]) {
            card = content.value.contentCards[index];
        }

        if (card) {
            if (typeof card[field] !== 'boolean') {
                // 参考全局默认值来初始化可能更健壮
                const defaultVal = (field === 'showHeader')
                    ? content.value.contentDefaultShowHeader !== false // 默认为 true
                    : content.value.contentDefaultShowFooter !== false; // 默认为 true
                card[field] = defaultVal;
            }
            card[field] = !card[field];
        } else {
            console.warn(`无法切换可见性: cardType=${cardType}, field=${field}, index=${index}`);
        }
        updateContent();
    };

    // 获取可见性切换按钮的样式类
    const getButtonClass = (isVisible) => {
        // 处理 isVisible 可能为 undefined 的情况
        const visible = isVisible === true; // 只有显式为 true 才认为是可见
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
        addCard, // 导出修改后的 addCard
        removeCard,
        toggleVisibility,
        getButtonClass,
        onDragEnd,
        updateContent, // 暴露 updateContent 以便文本域输入时调用
        createEmptyCard // 导出 createEmptyCard
    };
} 