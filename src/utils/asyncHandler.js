import { useToast } from "vue-toastification";

/**
 * 封装异步任务，提供统一的加载提示、成功/错误通知和错误日志记录。
 * 
 * @param {Function} asyncFn 要执行的异步函数。该函数在出错时应抛出异常。
 * @param {object} [options={}] 配置选项。
 * @param {string} [options.loadingMessage] 可选，执行期间显示的加载提示信息。设置后会自动处理 toast 的显示与关闭。
 * @param {string} [options.successMessage] 可选，执行成功后显示的成功提示信息。
 * @param {string} [options.errorMessagePrefix="操作失败"] 可选，错误日志和错误提示的前缀。
 * @returns {Promise<boolean>} 返回一个 Promise，解析为 true 表示成功，false 表示失败。
 */
export async function handleAsyncTask(asyncFn, options = {}) {
    const toast = useToast(); // 在函数内部获取 toast 实例
    const {
        loadingMessage,
        successMessage,
        errorMessagePrefix = "操作失败"
    } = options;

    let loadingToastId = null;

    try {
        // 1. 显示加载提示 (如果提供了消息)
        if (loadingMessage) {
            loadingToastId = toast.info(loadingMessage, { timeout: false });
        }

        // 2. 执行核心异步函数
        await asyncFn();

        // 3. 关闭加载提示
        if (loadingToastId !== null) {
            toast.dismiss(loadingToastId);
        }

        // 4. 显示成功提示 (如果提供了消息)
        if (successMessage) {
            toast.success(successMessage);
        }

        return true; // 表示成功

    } catch (error) {
        console.error(`${errorMessagePrefix}错误:`, error); // 5. 记录详细错误

        // 6. 关闭加载提示 (如果存在)
        if (loadingToastId !== null) {
            toast.dismiss(loadingToastId);
        }

        // 7. 显示错误提示
        // 优先使用 error.message，如果不存在则显示通用错误信息
        const displayErrorMessage = error?.message ? error.message : '发生未知错误';
        toast.error(`${errorMessagePrefix}: ${displayErrorMessage}`);

        return false; // 表示失败
    }
} 