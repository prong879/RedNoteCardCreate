import { ref, watch, nextTick, onMounted, onUpdated, onUnmounted } from 'vue';

// 防抖函数
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
};

// 节流函数
const throttle = (func, limit) => {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
};

export function useCardPreviewScroll(store, coverCardContainerRef, contentCardRefsArray) {
    // --- Refs ---
    const previewScrollContainer = ref(null);
    const showLeftScroll = ref(false);
    const showRightScroll = ref(false);

    // --- Helper Functions ---
    const getAllCardElements = () => {
        const cover = coverCardContainerRef.value;
        const contents = contentCardRefsArray.value || [];
        const elements = [];
        if (cover) elements.push(cover);
        elements.push(...contents.filter(el => el));
        return elements;
    };

    const checkScrollButtons = () => {
        const el = previewScrollContainer.value;
        if (!el) return;
        showLeftScroll.value = el.scrollLeft > 1;
        showRightScroll.value = el.scrollWidth - el.clientWidth - el.scrollLeft > 1;
    };

    const throttledCheckScrollButtons = throttle(checkScrollButtons, 150);

    const findCurrentCardIndex = () => {
        const container = previewScrollContainer.value;
        if (!container) return null;
        const containerCenter = container.scrollLeft + container.clientWidth / 2;
        const cards = getAllCardElements();
        let minIndex = -2;
        let minDistance = Infinity;

        cards.forEach((card, arrayIndex) => {
            if (!card) return;
            const cardCenter = card.offsetLeft + card.clientWidth / 2;
            const distance = Math.abs(cardCenter - containerCenter);
            if (distance < minDistance) {
                minDistance = distance;
                minIndex = arrayIndex;
            }
        });

        if (minIndex === 0) return -1; // 封面
        if (minIndex > 0) return minIndex - 1; // 内容卡片索引
        return null; // 未找到
    };

    const onScrollEnd = debounce(() => {
        const currentEditorIndex = findCurrentCardIndex();
        console.log('[useCardPreviewScroll] Scroll ended. Detected editor index:', currentEditorIndex);
        store.setFocusedEditor(currentEditorIndex);
        if (store.focusedPreviewIndex !== null && store.focusedPreviewIndex === currentEditorIndex) {
            console.log(`[useCardPreviewScroll] Scroll ended at the requested index (${currentEditorIndex}). Resetting focusedPreviewIndex to null.`);
            store.resetFocus();
        } else if (store.focusedPreviewIndex !== null) {
            console.log(`[useCardPreviewScroll] Scroll ended, but not at the requested index (${store.focusedPreviewIndex}, ended at ${currentEditorIndex}). Resetting focusedPreviewIndex to null.`);
            store.resetFocus();
        }
    }, 200);

    const handleScroll = () => {
        throttledCheckScrollButtons();
        onScrollEnd();
    };

    const scrollLeft = () => {
        const container = previewScrollContainer.value;
        if (!container) return;
        const cards = getAllCardElements();
        const currentStoreIndex = findCurrentCardIndex();
        let currentArrayIndex = -1;
        if (currentStoreIndex === -1) { currentArrayIndex = 0; }
        else if (currentStoreIndex !== null && currentStoreIndex >= 0) { currentArrayIndex = currentStoreIndex + 1; }
        else if (currentStoreIndex === null) { currentArrayIndex = 0; }
        const targetArrayIndex = currentArrayIndex - 1;
        if (targetArrayIndex >= 0 && targetArrayIndex < cards.length) {
            const targetElement = cards[targetArrayIndex];
            if (targetElement) {
                const containerWidth = container.clientWidth;
                const targetOffsetLeft = targetElement.offsetLeft;
                const targetWidth = targetElement.clientWidth;
                const targetScrollLeft = targetOffsetLeft + targetWidth / 2 - containerWidth / 2;
                container.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' });
                store.resetFocus();
            }
        }
    };

    const scrollRight = () => {
        const container = previewScrollContainer.value;
        if (!container) return;
        const cards = getAllCardElements();
        const currentStoreIndex = findCurrentCardIndex();
        let currentArrayIndex = -1;
        if (currentStoreIndex === -1) { currentArrayIndex = 0; }
        else if (currentStoreIndex !== null && currentStoreIndex >= 0) { currentArrayIndex = currentStoreIndex + 1; }
        else if (currentStoreIndex === null) { currentArrayIndex = 0; }
        const targetArrayIndex = currentArrayIndex + 1;
        if (targetArrayIndex >= 0 && targetArrayIndex < cards.length) {
            const targetElement = cards[targetArrayIndex];
            if (targetElement) {
                const containerWidth = container.clientWidth;
                const targetOffsetLeft = targetElement.offsetLeft;
                const targetWidth = targetElement.clientWidth;
                const targetScrollLeft = targetOffsetLeft + targetWidth / 2 - containerWidth / 2;
                container.scrollTo({ left: Math.min(container.scrollWidth - containerWidth, targetScrollLeft), behavior: 'smooth' });
                store.resetFocus();
            }
        }
    };

    // --- Watchers ---
    watch(() => store.focusedPreviewIndex, (newIndex) => {
        const isValidFocusRequest = (newIndex === -1 || (typeof newIndex === 'number' && newIndex >= 0));
        if (isValidFocusRequest) {
            console.log('[useCardPreviewScroll] Valid focus request received. Initiating scroll.');
            let targetElementContainer = null;
            const scrollContainer = previewScrollContainer.value;
            if (!scrollContainer) { return; }

            if (newIndex === -1) {
                targetElementContainer = coverCardContainerRef.value;
            } else {
                targetElementContainer = contentCardRefsArray.value?.[newIndex];
            }

            if (targetElementContainer) {
                console.log(`[useCardPreviewScroll] Scrolling to target (index ${newIndex}):`, targetElementContainer);
                targetElementContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            } else {
                console.warn(`[useCardPreviewScroll] Target element ref could not be found for index ${newIndex}. Cannot scroll.`);
            }
        } else {
            console.log('[useCardPreviewScroll] Watcher triggered, but newIndex is NOT a valid focus request. Ignoring scroll command.');
        }
    }, { flush: 'post' });

    watch(() => store.cardContent?.contentCards?.length, () => {
        nextTick(checkScrollButtons);
    });

    // --- Lifecycle Hooks ---
    onMounted(() => {
        nextTick(checkScrollButtons);
        window.addEventListener('resize', throttledCheckScrollButtons);
    });

    onUpdated(() => {
        nextTick(checkScrollButtons);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', throttledCheckScrollButtons);
    });

    // --- Return values needed by the component ---
    return {
        previewScrollContainer,
        showLeftScroll,
        showRightScroll,
        scrollLeft,
        scrollRight,
        handleScroll
    };
} 