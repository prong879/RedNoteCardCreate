/**
 * 存储卡片模板的元数据。
 * key: 模板 ID (通常是根据模板文件名推断的小写形式，例如 'template1')
 * value: { name: string, aspectRatio: string }
 *   - name: 用户友好的模板名称，用于显示。
 *   - aspectRatio: 模板的宽高比，格式为 '宽/高' (例如 '3/4', '16/9')。
 */
export const templateMetadata = {
    template1: {
        name: '模板1',
        aspectRatio: '3/4'
    },
    template2: {
        name: '模板2',
        aspectRatio: '3/4'
    },
    template5: {
        name: '模板5',
        aspectRatio: '16/9' // 确保与实际组件设计一致
    },
    // 如果添加新模板 TemplateNew.vue, 在这里添加条目:
    // templatenew: {
    //   name: '新模板',
    //   aspectRatio: '1/1' // 示例比例
    // }
}; 