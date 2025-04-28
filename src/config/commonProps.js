/**
 * @description 定义模板组件通用的 props
 */
export const commonTemplateProps = {
    // 卡片类型: 'cover' 或 'content'
    type: {
        type: String,
        required: true,
        validator: (value) => ['cover', 'content'].includes(value)
    },
    // 统一接收卡片数据对象 (coverCard 或 contentCard)
    cardData: {
        type: Object,
        required: true
    },
    // 页眉文本
    headerText: {
        type: String,
        default: '@园丁小区詹姆斯' // 保留一个通用的默认值
    },
    // 页脚文本
    footerText: {
        type: String,
        default: '持续更新\\n你一定能学会时间序列分析' // 保留一个通用的默认值
    },
    // 控制页眉可见性
    isHeaderVisible: {
        type: Boolean,
        default: true
    },
    // 控制页脚可见性
    isFooterVisible: {
        type: Boolean,
        default: true
    }
}; 