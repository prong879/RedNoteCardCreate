import { useToast } from "vue-toastification";

/**
 * 封装异步任务，提供统一的错误捕获、日志记录，并返回结构化结果。
 * 
 * @template T
 * @param {() => Promise<T>} asyncFn 要执行的异步函数。该函数在出错时应抛出异常，成功时可以返回数据。
 * @param {object} [options={}] 配置选项。
 * @param {string} [options.errorMessagePrefix="操作失败"] 可选，错误日志的前缀。
 * @returns {Promise<{ success: boolean, data?: T, error?: Error }>} 返回一个 Promise，解析为一个包含成功状态、可选数据和可选错误的对象。
 */
export async function handleAsyncTask(asyncFn, options = {}) {
    // const toast = useToast(); // 不再在此处获取 toast 实例
    const {
        errorMessagePrefix = "操作失败"
    } = options;

    // let loadingToastId = null; // 移除加载提示相关逻辑

    try {
        // 执行核心异步函数，并获取其返回值
        const data = await asyncFn();

        // 返回成功结果
        return { success: true, data: data };

    } catch (error) {
        console.error(`${errorMessagePrefix}错误:`, error); // 记录详细错误

        // 确保返回的是一个 Error 对象
        const errorToReturn = error instanceof Error ? error : new Error(String(error));
        if (!(error instanceof Error) && typeof error === 'object' && error !== null) {
            // 尝试保留原始对象信息，如果它不是Error但可能是个包含信息的对象
            try { errorToReturn.originalError = JSON.parse(JSON.stringify(error)); } catch { }
        }

        // 返回失败结果，包含错误对象
        return { success: false, error: errorToReturn };
    }
} 