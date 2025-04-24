import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

/**
 * 导出卡片为图片
 * @param {HTMLElement} cardElement - 要导出的卡片元素
 * @param {string} fileName - 文件名
 */
export const exportCardAsImage = async (cardElement, fileName) => {
    try {
        // 设置导出选项
        const options = {
            scale: 2, // 提高导出图片质量
            useCORS: true, // 允许跨域图片
            backgroundColor: null, // 透明背景
            logging: true, // 启用日志记录，方便调试
        };

        // 生成canvas
        console.log('使用 html2canvas 导出元素:', cardElement, '选项:', options); // 添加日志
        const canvas = await html2canvas(cardElement, options);

        // 转换为blob
        canvas.toBlob((blob) => {
            // 保存文件
            saveAs(blob, `${fileName}.png`);
        });

        return true;
    } catch (error) {
        console.error('导出卡片失败:', error);
        return false;
    }
};

/**
 * 批量导出卡片
 * @param {Array<HTMLElement>} cardElements - 要导出的卡片元素数组
 * @param {string} baseFileName - 基础文件名
 */
export const exportCardsAsImages = async (cardElements, baseFileName) => {
    try {
        let successCount = 0;

        for (let i = 0; i < cardElements.length; i++) {
            const fileName = `${baseFileName}_${i + 1}`;
            const success = await exportCardAsImage(cardElements[i], fileName);
            if (success) successCount++;
        }

        return {
            success: true,
            message: `成功导出 ${successCount}/${cardElements.length} 张卡片`
        };
    } catch (error) {
        console.error('批量导出卡片失败:', error);
        return {
            success: false,
            message: '导出失败: ' + error.message
        };
    }
};

/**
 * 将文本复制到剪贴板
 * @param {string} text - 要复制的文本
 */
export const copyTextToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return {
            success: true,
            message: '文本已复制到剪贴板'
        };
    } catch (error) {
        console.error('复制文本失败:', error);
        return {
            success: false,
            message: '复制失败: ' + error.message
        };
    }
};

export default {
    exportCardAsImage,
    exportCardsAsImages,
    copyTextToClipboard
}; 