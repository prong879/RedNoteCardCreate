import { ref, shallowRef, computed, defineAsyncComponent } from 'vue';
// 修改：从 .json 文件导入，并作为默认导入
import templateMetadata from '../config/templateMetadata.json';

/**
 * 组合式函数，用于动态加载卡片模板组件，并生成模板信息列表。
 */
export function useTemplateLoader() {
    // 获取所有模板文件的异步加载器
    const templateModules = import.meta.glob('../templates/*.vue');
    const asyncComponentsCache = {};

    // 动态生成 templatesInfo
    const templatesInfo = Object.keys(templateModules).map(path => {
        // 从路径解析 ID 和组件名
        // 例如 ../templates/Template1.vue -> fileName = Template1.vue -> componentName = Template1 -> id = template1
        const fileName = path.split('/').pop(); // 获取文件名 Template1.vue
        const componentName = fileName.replace('.vue', ''); // 获取组件名 Template1
        const id = componentName.toLowerCase(); // 生成 ID template1

        // 从元数据获取 name 和 aspectRatio，提供默认值
        const metadata = templateMetadata[id] || {};
        const name = metadata.name || componentName; // 默认使用组件名
        const aspectRatio = metadata.aspectRatio || '3/4'; // 默认 3/4

        return {
            id,
            name,
            aspectRatio
        };
    }).sort((a, b) => {
        // 可选：根据 ID 排序，确保顺序稳定
        const numA = parseInt(a.id.replace(/[^0-9]/g, '') || 0);
        const numB = parseInt(b.id.replace(/[^0-9]/g, '') || 0);
        if (numA !== numB) {
            return numA - numB;
        }
        return a.id.localeCompare(b.id); // 数字相同则按字符串排序
    });

    // 获取默认模板 ID (列表中的第一个)
    const defaultTemplateId = templatesInfo.length > 0 ? templatesInfo[0].id : null;

    const getAsyncTemplateComponent = (templateId) => {
        if (asyncComponentsCache[templateId]) {
            return asyncComponentsCache[templateId];
        }

        const componentName = templateId.charAt(0).toUpperCase() + templateId.slice(1);
        const fileName = `${componentName}.vue`;
        const modulePath = `../templates/${fileName}`;
        const loader = templateModules[modulePath];

        if (loader) {
            const asyncComponent = defineAsyncComponent({
                loader: loader,
                // ... (可以添加 loading/error 组件) ...
            });
            asyncComponentsCache[templateId] = asyncComponent;
            return asyncComponent;
        } else {
            console.warn(`[useTemplateLoader] 未找到 ID 为 '${templateId}' 的模板。`);
            // 回退到默认模板 (如果存在)
            if (defaultTemplateId && templateId !== defaultTemplateId) {
                console.warn(`将尝试加载默认模板 '${defaultTemplateId}'。`);
                const defaultComponent = getAsyncTemplateComponent(defaultTemplateId);
                asyncComponentsCache[templateId] = defaultComponent; // 缓存无效 ID 指向默认
                return defaultComponent;
            } else if (defaultTemplateId) {
                console.error(`[useTemplateLoader] 无法加载默认模板 '${defaultTemplateId}'。`);
            } else {
                console.error("[useTemplateLoader] 未找到任何模板且无法加载默认模板。");
            }
            // 返回占位符
            return defineAsyncComponent({
                loader: () => Promise.resolve({ template: '<div>模板加载失败</div>' }),
                errorComponent: { template: '<div>模板加载失败</div>' },
            });
        }
    };

    return {
        templatesInfo, // 暴露动态生成的列表
        getAsyncTemplateComponent
    };
} 