import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

// 默认批处理大小
const DEFAULT_BATCH_SIZE = 3;
// 批处理之间的延迟（毫秒）
const BATCH_DELAY = 50;

/**
 * 获取 YYMMDD 格式的日期字符串
 * @returns {string} YYMMDD 格式的日期
 */
export function getFormattedDate() {
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
    let sanitized = name.replace(/[\\/:*?"<>|.\n\r\t]/g, '_').trim();
    // return sanitized.substring(0, 100); // 可选：限制文件名长度
    return sanitized;
}

/**
 * 导出单个卡片为图片
 * @param {HTMLElement} cardElement - 要导出的卡片元素 (.xhs-card 或 .card)
 * @param {string} rawFileName - 未清理的文件名 (不含扩展名)
 * @param {string} format - 图片格式 ('png' or 'jpg')
 */
export const exportCardAsImage = async (cardElement, rawFileName, format = 'jpg') => {
    const fileName = sanitizeFilename(rawFileName);
    const fileExtension = format === 'jpg' ? 'jpg' : 'png';
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const jpgQuality = 1.0; // 保持高质量

    try {
        const options = {
            scale: 2, // 降低默认 scale 以提高性能，原为 4
            useCORS: true,
            backgroundColor: null,
            logging: false,
        };

        console.log(`准备导出图片: ${fileName}.${fileExtension}`);
        const canvas = await html2canvas(cardElement, options);

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    try {
                        saveAs(blob, `${fileName}.${fileExtension}`);
                        resolve(true); // 表示单个导出成功
                    } catch (saveError) {
                        console.error(`保存文件失败 (${fileName}.${fileExtension}):`, saveError);
                        reject(saveError);
                    }
                } else {
                    console.error(`无法创建 Blob (${fileName}.${fileExtension})`);
                    reject(new Error('无法创建 Blob'));
                }
            }, mimeType, format === 'jpg' ? jpgQuality : undefined);
        });
    } catch (error) {
        console.error(`导出卡片失败 (${fileName}.${fileExtension}):`, error);
        throw error;
    }
};

/**
 * 批量导出多个卡片为独立的图片文件（支持分批和进度回调）
 * @param {Array<{element: HTMLElement, type: string, index: number}>} elementsToExport - 包含元素、类型和索引的对象数组
 * @param {string} topicId - 当前主题 ID
 * @param {string} dateString - YYMMDD 格式日期字符串
 * @param {string} format - 图片格式 ('png' or 'jpg')
 * @param {function(number, number): void} [progressCallback] - 进度回调函数 (current, total)
 * @param {number} [batchSize=DEFAULT_BATCH_SIZE] - 每批处理的数量
 */
export const exportCardsAsImages = async (
    elementsToExport,
    topicId,
    dateString,
    format = 'jpg',
    progressCallback,
    batchSize = DEFAULT_BATCH_SIZE
) => {
    if (!elementsToExport || elementsToExport.length === 0) {
        throw new Error("没有元素需要导出。");
    }

    const totalCount = elementsToExport.length;
    let successCount = 0;
    let errors = [];

    for (let i = 0; i < totalCount; i++) {
        const item = elementsToExport[i];
        let baseName;
        if (item.type === 'cover') {
            baseName = `${topicId}_封面`;
        } else {
            baseName = `${topicId}_内容${String(item.index + 1).padStart(2, '0')}`;
        }
        const fileName = `${baseName}_${dateString}`;
        const fileExtension = format === 'jpg' ? 'jpg' : 'png';
        const fullFileName = `${fileName}.${fileExtension}`;

        try {
            await exportCardAsImage(item.element, fileName, format);
            successCount++;
            // 调用进度回调（在成功后）
            if (progressCallback) {
                progressCallback(i + 1, totalCount);
            }
        } catch (error) {
            errors.push({ fileName: fullFileName, error });
            // 即使失败也调用进度回调，让 UI 知道已处理
            if (progressCallback) {
                progressCallback(i + 1, totalCount);
            }
        }

        // 在每个批次结束后稍作延迟
        if ((i + 1) % batchSize === 0 && i < totalCount - 1) {
            console.log(`--- 导出批次完成 (${i + 1}/${totalCount})，延迟 ${BATCH_DELAY}ms ---`);
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
    }

    console.log(`批量导出图片完成: ${successCount} 成功, ${errors.length} 失败.`);
    if (errors.length > 0) {
        console.error('导出失败详情:', errors);
        // 抛出聚合错误，包含成功和失败信息
        const errorMessage = `有 ${errors.length} 张图片导出失败 (共 ${totalCount} 张)。`;
        const aggregateError = new Error(errorMessage);
        aggregateError.details = { successCount, errors };
        throw aggregateError;
    }

    // 如果全部成功，可以返回成功状态或计数
    return { successCount, totalCount };
};

/**
 * 将多个卡片打包为 ZIP 文件下载（支持分批生成图片和进度回调）
 * @param {Array<{element: HTMLElement, type: string, index: number}>} elementsToExport - 包含元素、类型和索引的对象数组
 * @param {string} topicId - 当前主题 ID
 * @param {string} dateString - YYMMDD 格式日期字符串
 * @param {string} format - 图片格式 ('png' or 'jpg')
 * @param {function(number, number): void} [progressCallback] - 进度回调函数 (current, total)，用于图片生成阶段
 * @param {number} [batchSize=DEFAULT_BATCH_SIZE] - 每批生成图片的数量
 */
export const exportCardsAsZip = async (
    elementsToExport,
    topicId,
    dateString,
    format = 'jpg',
    progressCallback,
    batchSize = DEFAULT_BATCH_SIZE
) => {
    if (!elementsToExport || elementsToExport.length === 0) {
        throw new Error("没有元素需要导出。");
    }

    const zip = new JSZip();
    const totalCount = elementsToExport.length;
    const options = {
        scale: 2, // 与 exportCardAsImage 保持一致
        useCORS: true,
        backgroundColor: null,
        logging: false,
    };
    const fileExtension = format === 'jpg' ? 'jpg' : 'png';
    const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
    const jpgQuality = 1.0;

    console.log(`开始分批生成 ${totalCount} 张 ${format.toUpperCase()} 图片用于打包...`);

    let generatedImages = []; // 存储成功生成的图片 { name, data }
    let generationErrors = []; // 存储生成失败的信息 { fileName, error }
    let processedCount = 0;

    for (let i = 0; i < totalCount; i++) {
        const item = elementsToExport[i];
        let baseName;
        if (item.type === 'cover') {
            baseName = `${topicId}_封面`;
        } else {
            baseName = `${topicId}_内容${String(item.index + 1).padStart(2, '0')}`;
        }
        const fileNameInZip = sanitizeFilename(`${baseName}_${dateString}`) + `.${fileExtension}`;

        try {
            console.log(`[ZIP] 生成图片 ${i + 1}/${totalCount}: ${fileNameInZip}`);
            const canvas = await html2canvas(item.element, options);
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob((blobData) => {
                    if (blobData) {
                        resolve(blobData);
                    } else {
                        reject(new Error(`无法为 ${fileNameInZip} 创建 Blob`));
                    }
                }, mimeType, format === 'jpg' ? jpgQuality : undefined);
            });
            generatedImages.push({ name: fileNameInZip, data: blob });
            processedCount++;
            // 调用进度回调（在成功生成 Blob 后）
            if (progressCallback) {
                progressCallback(processedCount, totalCount);
            }
        } catch (error) {
            console.error(`[ZIP] 生成图片失败 (${fileNameInZip}):`, error);
            generationErrors.push({ fileName: fileNameInZip, error });
            processedCount++; // 即使失败也算处理过
            // 调用进度回调
            if (progressCallback) {
                progressCallback(processedCount, totalCount);
            }
        }

        // 在每个批次结束后稍作延迟
        if (processedCount % batchSize === 0 && processedCount < totalCount) {
            console.log(`--- ZIP 图片生成批次完成 (${processedCount}/${totalCount})，延迟 ${BATCH_DELAY}ms ---`);
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
    }

    const successCount = generatedImages.length;
    const errorCount = generationErrors.length;

    console.log(`图片生成完成: ${successCount} 成功, ${errorCount} 失败.`);

    if (successCount === 0) {
        console.error("所有图片都未能成功生成，无法创建 ZIP 文件。", generationErrors);
        const errorMessage = "无法生成任何图片以创建 ZIP 文件。";
        const aggregateError = new Error(errorMessage);
        aggregateError.details = { successCount: 0, errors: generationErrors };
        throw aggregateError;
    }

    // 添加成功生成的图片到 ZIP
    generatedImages.forEach(img => {
        zip.file(img.name, img.data);
    });

    console.log(`开始生成 ZIP 文件 (${successCount} 张图片)...`);
    const zipFileName = sanitizeFilename(`${topicId}_${dateString}`) + '.zip';
    try {
        // 注意：generateAsync 仍然可能是一个耗时操作，但图片生成已分批
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, zipFileName);
        console.log(`成功生成并触发下载: ${zipFileName}`);

        if (errorCount > 0) {
            // 如果部分失败，抛出错误以便上层显示提示
            const errorMessage = `成功打包 ${successCount} 张图片，但有 ${errorCount} 张生成失败。`;
            const aggregateError = new Error(errorMessage);
            aggregateError.details = { successCount, errors: generationErrors };
            throw aggregateError; // 让 handleAsyncTask 捕获并报告
        }

        // 全部成功
        return { successCount, totalCount: totalCount, zipFileName };

    } catch (zipError) {
        // 捕获 zip.generateAsync 或 saveAs 的错误，或者上面抛出的部分失败错误
        console.error(`生成或保存 ZIP 文件失败 (${zipFileName}):`, zipError);
        // 重新包装错误，确保包含原始错误信息和详情
        const finalError = new Error(`创建或保存 ZIP 文件 (${zipFileName}) 失败: ${zipError.message}`);
        finalError.details = zipError.details || { successCount, errors: generationErrors }; // 保留生成错误详情
        finalError.originalError = zipError;
        throw finalError;
    }
};

/**
 * 将文本复制到剪贴板
 * @param {string} text - 要复制的文本
 * @throws {Error} 如果复制失败，则抛出带有详细信息的错误
 */
export const copyTextToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
    } catch (error) {
        console.error('复制文本失败:', error);
        if (error instanceof Error) {
            error.message = `复制文本失败: ${error.message || '未知剪贴板错误'}`;
            throw error;
        } else {
            throw new Error(`复制文本失败: ${error || '未知剪贴板错误'}`);
        }
    }
};

export default {
    exportCardAsImage,
    exportCardsAsImages,
    exportCardsAsZip,
    copyTextToClipboard,
    getFormattedDate, // 导出辅助函数供外部使用
    sanitizeFilename // 导出辅助函数供外部使用
}; 