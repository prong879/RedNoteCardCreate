import { defineAsyncComponent } from 'vue';

/**
 * 组合式函数，用于动态加载卡片模板组件。
 * 利用 Vite 的 import.meta.glob 实现模板的按需加载。
 */
export function useTemplateLoader() {
    // 获取所有模板文件的异步加载器
    // Vite 的 import.meta.glob 返回一个对象，键是文件路径，值是 () => import('./path') 函数
    // 使用 { eager: false } (默认) 来确保是异步加载
    const templateModules = import.meta.glob('../templates/*.vue');

    // 缓存已创建的异步组件，避免重复调用 defineAsyncComponent
    const asyncComponentsCache = {};

    /**
     * 根据模板 ID 获取对应的异步 Vue 组件。
     * @param {string} templateId - 模板的 ID (例如 'template1', 'template2')。
     * @returns {Object} 返回一个通过 defineAsyncComponent 包装的异步组件。
     */
    const getAsyncTemplateComponent = (templateId) => {
        // 如果缓存中已有，直接返回
        if (asyncComponentsCache[templateId]) {
            return asyncComponentsCache[templateId];
        }

        // 1. 根据 templateId 推断文件名 (假设 ID 和文件名有直接关系)
        // 例如 'template1' -> 'Template1.vue'
        //    'templateSpecial' -> 'TemplateSpecial.vue'
        const componentName = templateId.charAt(0).toUpperCase() + templateId.slice(1);
        const fileName = `${componentName}.vue`;
        const modulePath = `../templates/${fileName}`;

        // 2. 在 templateModules 中查找对应的加载器
        const loader = templateModules[modulePath];

        if (loader) {
            // 3. 使用 defineAsyncComponent 包装加载器
            // 可以添加加载中和错误状态组件以提升体验
            const asyncComponent = defineAsyncComponent({
                loader: loader,
                // 可选: 加载时显示的组件
                // loadingComponent: LoadingComponent,
                // 可选: 加载超时时间 (ms)
                // timeout: 3000,
                // 可选: 加载失败时显示的组件
                // errorComponent: ErrorComponent,
                // 在显示 loadingComponent 前的延迟时间 (ms)
                // delay: 200, 
            });

            // 存入缓存
            asyncComponentsCache[templateId] = asyncComponent;
            return asyncComponent;
        } else {
            // 找不到指定模板，记录警告并尝试返回默认模板 (例如 Template1)
            console.warn(`[useTemplateLoader] 未找到 ID 为 '${templateId}' (路径: ${modulePath}) 的模板加载器。将尝试加载默认模板 'template1'。`);
            // 递归调用或直接加载默认模板，注意避免无限递归
            if (templateId !== 'template1') { // 防止找不到 template1 时无限递归
                const defaultComponent = getAsyncTemplateComponent('template1');
                // 将无效 id 也缓存为默认组件，避免重复警告
                asyncComponentsCache[templateId] = defaultComponent;
                return defaultComponent;
            } else {
                console.error("[useTemplateLoader] 无法加载默认模板 'template1'。");
                // 返回一个简单的占位符组件或 null
                return defineAsyncComponent({
                    loader: () => Promise.resolve({ template: '<div>模板加载失败</div>' }),
                    errorComponent: { template: '<div>模板加载失败</div>' },
                });
            }
        }
    };

    return {
        getAsyncTemplateComponent
    };
} 