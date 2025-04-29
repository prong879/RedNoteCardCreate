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
        showLeftScroll.value = Math.round(el.scrollLeft) > 0;
        showRightScroll.value = Math.round(el.scrollWidth - el.clientWidth - el.scrollLeft) > 1;
    };

    const throttledCheckScrollButtons = throttle(checkScrollButtons, 150);

    const findCurrentCardIndex = () => {
        const container = previewScrollContainer.value;
        if (!container) return null;
        const containerWidth = container.clientWidth;
        const currentScrollLeft = container.scrollLeft;

        const cards = getAllCardElements();
        let closestIndex = -2;
        let minDistance = Infinity;

        cards.forEach((card, arrayIndex) => {
            if (!card) return;
            const cardStart = card.offsetLeft;
            const distance = Math.abs(cardStart - currentScrollLeft);
            if (distance < minDistance) {
                minDistance = distance;
                closestIndex = arrayIndex;
            }
        });

        console.log(`[useCardPreviewScroll] Found closest card at array index: ${closestIndex} (distance: ${minDistance})`);

        if (closestIndex === 0) return -1;
        if (closestIndex > 0) return closestIndex - 1;
        return null;
    };

    const onScrollEnd = debounce(() => {
        const currentEditorIndex = findCurrentCardIndex();
        console.log('[useCardPreviewScroll] Scroll ended. Detected editor index:', currentEditorIndex);
        if (currentEditorIndex !== null) {
            store.setFocusedEditor(currentEditorIndex);
        }
        if (store.focusedPreviewIndex !== null && store.focusedPreviewIndex === currentEditorIndex) {
            console.log(`[useCardPreviewScroll] Scroll ended at the requested index (${currentEditorIndex}). Resetting focusedPreviewIndex to null.`);
            store.resetFocus();
        } else if (store.focusedPreviewIndex !== null) {
            console.log(`[useCardPreviewScroll] Scroll ended, but not at the requested index (${store.focusedPreviewIndex}, ended at ${currentEditorIndex}). Resetting focusedPreviewIndex to null.`);
            store.resetFocus();
        }
    }, 250);

    const handleScroll = () => {
        throttledCheckScrollButtons();
        onScrollEnd();
    };

    const scrollLeft = () => {
        const container = previewScrollContainer.value;
        if (!container) return;
        const currentStoreIndex = findCurrentCardIndex();
        let currentArrayIndex = -1;
        if (currentStoreIndex === -1) { currentArrayIndex = 0; }
        else if (currentStoreIndex !== null && currentStoreIndex >= 0) { currentArrayIndex = currentStoreIndex + 1; }
        else {
            currentArrayIndex = 0;
        }

        const targetArrayIndex = Math.max(0, currentArrayIndex - 1);

        const cards = getAllCardElements();
        if (targetArrayIndex < cards.length) {
            const targetElement = cards[targetArrayIndex];
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        } else if (cards.length > 0) {
            cards[0].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    };

    const scrollRight = () => {
        const container = previewScrollContainer.value;
        if (!container) return;
        const currentStoreIndex = findCurrentCardIndex();
        let currentArrayIndex = -1;
        if (currentStoreIndex === -1) { currentArrayIndex = 0; }
        else if (currentStoreIndex !== null && currentStoreIndex >= 0) { currentArrayIndex = currentStoreIndex + 1; }
        else {
            currentArrayIndex = -1;
        }

        const cards = getAllCardElements();
        const targetArrayIndex = Math.min(cards.length - 1, currentArrayIndex + 1);

        if (targetArrayIndex >= 0 && targetArrayIndex < cards.length) {
            const targetElement = cards[targetArrayIndex];
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        } else if (cards.length > 0) {
            cards[cards.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    };

    // --- Watchers ---
    watch(() => store.focusedPreviewIndex, (newIndex) => {
        const isValidFocusRequest = (newIndex === -1 || (typeof newIndex === 'number' && newIndex >= 0));
        if (isValidFocusRequest) {
            console.log('[useCardPreviewScroll] Valid focus request received. Initiating scroll.');
            let targetElementContainer = null;
            const scrollContainer = previewScrollContainer.value;
            if (!scrollContainer) {
                console.warn('[useCardPreviewScroll] Scroll container not found.');
                return;
            }

            if (newIndex === -1) {
                targetElementContainer = coverCardContainerRef.value;
            } else {
                if (contentCardRefsArray.value && newIndex < contentCardRefsArray.value.length) {
                    targetElementContainer = contentCardRefsArray.value[newIndex];
                }
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
        previewScrollContainer.value?.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('resize', throttledCheckScrollButtons);
    });

    onUpdated(() => {
        nextTick(checkScrollButtons);
    });

    onUnmounted(() => {
        previewScrollContainer.value?.removeEventListener('scroll', handleScroll);
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