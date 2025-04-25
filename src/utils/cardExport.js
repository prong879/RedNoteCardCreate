import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

/**
 * 获取 YYMMDD 格式的日期字符串
 * @returns {string} YYMMDD 格式的日期
 */
function getFormattedDate() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * 清理文件名中的非法字符
 * @param {string} name - 原始文件名
 * @returns {string} 清理后的文件名
 */
function sanitizeFilename(name) {
    if (!name) return 'untitled';
    // 替换常见非法字符为空格或下划线，移除首尾空格，防止文件名过长（可选）
    let sanitized = name.replace(/[\/:*?"<>|.\n\r\t]/g, '_').trim();
    // return sanitized.substring(0, 100); // 可选：限制文件名长度
    return sanitized;
}

/**
 * 导出单个卡片为图片
 * @param {HTMLElement} cardElement - 要导出的卡片元素 (.xhs-card 或 .card)
 * @param {string} rawFileName - 未清理的文件名 (不含扩展名)
 */
export const exportCardAsImage = async (cardElement, rawFileName) => {
    const fileName = sanitizeFilename(rawFileName); // 清理文件名
    try {
        const options = {
            scale: 2, // 提高导出图片质量
            useCORS: true, // 允许跨域图片
            backgroundColor: null, // 使用卡片本身的背景
            logging: false, // 减少控制台噪音
        };

        console.log(`准备导出图片: ${fileName}.png`);
        const canvas = await html2canvas(cardElement, options);

        // 使用 Promise 包装 toBlob
        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    try {
                        saveAs(blob, `${fileName}.png`);
                        resolve(true);
                    } catch (saveError) {
                        console.error(`保存文件失败 (${fileName}.png):`, saveError);
                        reject(saveError);
                    }
                } else {
                    console.error(`无法创建 Blob (${fileName}.png)`);
                    reject(new Error('无法创建 Blob'));
                }
            }, 'image/png');
        });
    } catch (error) {
        console.error(`导出卡片失败 (${fileName}.png):`, error);
        throw error; // 重新抛出错误，让调用者处理
    }
};

/**
 * 批量导出多个卡片为独立的图片文件
 * @param {Array<{element: HTMLElement, type: string, index: number}>} elementsToExport - 包含元素、类型和索引的对象数组
 * @param {string} topicId - 当前主题 ID
 * @param {string} dateString - YYMMDD 格式日期字符串
 */
export const exportCardsAsImages = async (elementsToExport, topicId, dateString) => {
    if (!elementsToExport || elementsToExport.length === 0) {
        throw new Error("没有元素需要导出。");
    }

    let successCount = 0;
    let errors = [];

    for (const item of elementsToExport) {
        let baseName;
        if (item.type === 'cover') {
            baseName = `${topicId}_封面`;
        } else {
            baseName = `${topicId}_内容${String(item.index + 1).padStart(2, '0')}`;
        }
        const fileName = `${baseName}_${dateString}`;
        try {
            await exportCardAsImage(item.element, fileName);
            successCount++;
        } catch (error) {
            errors.push({ fileName: `${fileName}.png`, error });
        }
        // 可以选择添加短暂延时避免浏览器卡顿，但通常不需要
        // await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`批量导出图片完成: ${successCount} 成功, ${errors.length} 失败.`);
    if (errors.length > 0) {
        console.error('导出失败详情:', errors);
        // 可以选择抛出一个包含错误详情的聚合错误
        throw new Error(`有 ${errors.length} 张图片导出失败。`);
    }
};

/**
 * 将多个卡片打包为 ZIP 文件下载
 * @param {Array<{element: HTMLElement, type: string, index: number}>} elementsToExport - 包含元素、类型和索引的对象数组
 * @param {string} topicId - 当前主题 ID
 * @param {string} dateString - YYMMDD 格式日期字符串
 */
export const exportCardsAsZip = async (elementsToExport, topicId, dateString) => {
    if (!elementsToExport || elementsToExport.length === 0) {
        throw new Error("没有元素需要导出。");
    }
    const zip = new JSZip();
    const options = {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
        logging: false,
    };

    console.log(`开始生成 ${elementsToExport.length} 张图片用于打包...`);

    // 使用 Promise.all 并行生成 Canvas 数据，但要注意浏览器性能
    const imagePromises = elementsToExport.map(async (item) => {
        let baseName;
        if (item.type === 'cover') {
            baseName = `${topicId}_封面`;
        } else {
            baseName = `${topicId}_内容${String(item.index + 1).padStart(2, '0')}`;
        }
        const fileNameInZip = sanitizeFilename(`${baseName}_${dateString}`) + '.png';

        try {
            const canvas = await html2canvas(item.element, options);
            return new Promise((resolve, reject) => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve({ name: fileNameInZip, data: blob });
                    } else {
                        console.error(`无法为 ${fileNameInZip} 创建 Blob`);
                        reject(new Error(`无法为 ${fileNameInZip} 创建 Blob`));
                    }
                }, 'image/png');
            });
        } catch (error) {
            console.error(`生成图片失败 (${fileNameInZip}):`, error);
            // 返回一个标记，以便知道哪些失败了
            return { name: fileNameInZip, error: error };
        }
    });

    const imageResults = await Promise.all(imagePromises);

    let successCount = 0;
    let errors = [];
    imageResults.forEach(result => {
        if (result && !result.error) {
            zip.file(result.name, result.data);
            successCount++;
        } else if (result && result.error) {
            errors.push({ fileName: result.name, error: result.error });
        }
    });

    if (successCount === 0) {
        console.error("所有图片都未能成功生成，无法创建 ZIP 文件。", errors);
        throw new Error("无法生成任何图片以创建 ZIP 文件。");
    }

    console.log(`图片生成完成: ${successCount} 成功, ${errors.length} 失败. 开始生成 ZIP 文件...`);

    const zipFileName = sanitizeFilename(`${topicId}_${dateString}`) + '.zip';
    try {
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, zipFileName);
        console.log(`成功生成并触发下载: ${zipFileName}`);
        if (errors.length > 0) {
            alert(`成功打包 ${successCount} 张图片，但有 ${errors.length} 张生成失败。请检查控制台获取详情。`);
        } else {
            alert(`成功打包 ${successCount} 张图片到 ${zipFileName}`);
        }
    } catch (zipError) {
        console.error(`生成 ZIP 文件失败 (${zipFileName}):`, zipError);
        throw zipError;
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
    exportCardsAsZip,
    copyTextToClipboard,
    // 如果希望在外部也能用辅助函数，也可以导出它们
    // getFormattedDate,
    // sanitizeFilename
}; 