// src/content/topicsMeta.js
// 用于存储选题的核心信息，与具体每次编辑的内容分开

export const topicsMeta = [
    // 一、 基础入门与核心概念
    {
        id: 'topic01',
        title: '【小白入门】什么是时间序列数据？',
        description: '用生活实例：股价、气温、你的体重变化...'
    },
    {
        id: 'topic02',
        title: '时间序列 VS 截面数据 VS 面板数据：三者的区别？',
        description: '用图表或简单例子区分'
    },
    {
        id: 'topic03',
        title: '为什么金融分析离不开时间序列？',
        description: '强调其在预测、风险管理中的作用'
    },
    {
        id: 'topic04',
        title: '【核心】时间序列分析到底在分析啥？',
        description: '引出自相关性这个灵魂'
    },
    {
        id: 'topic05',
        title: '什么是"平稳性"？为什么它这么重要？',
        description: '用通俗比喻解释，如"脾气稳定的人更好预测"'
    },
    {
        id: 'topic06',
        title: '强平稳 vs 弱平稳：有啥不一样？',
        description: '简单区分，强调弱平稳更常用'
    },
    {
        id: 'topic07',
        title: '肉眼看图识平稳：你的数据"稳"吗？',
        description: '结合文档中的图1-4，教大家直观判断'
    },
    {
        id: 'topic08',
        title: '什么是"白噪声"？为什么我们不希望序列是白噪声？',
        description: '解释随机性，无法预测'
    },
    {
        id: 'topic09',
        title: '"随机游走"是什么？和白噪声是一回事吗？',
        description: '区分概念，用"醉汉走路"比喻'
    },
    {
        id: 'topic10',
        title: '数据不平稳怎么办？"差分"大法来帮忙！',
        description: '解释差分的作用和I阶单整的概念'
    },
    {
        id: 'topic11',
        title: '【图解】自相关(ACF) vs 偏自相关(PACF)：帮你揪出数据的"记忆"',
        description: '解释两者的含义和作用'
    },
    {
        id: 'topic12',
        title: 'ACF/PACF图怎么看？拖尾 vs 截尾是什么意思？',
        description: '教用户看图，判断特征'
    },

    // 二、 主流模型介绍
    {
        id: 'topic13',
        title: '【模型初识】AR模型：今天的我由昨天的我决定？',
        description: '解释自回归含义'
    },
    {
        id: 'topic14',
        title: 'AR模型的"P"是什么意思？如何判断阶数？',
        description: '结合ACF/PACF图解释'
    },
    {
        id: 'topic15',
        title: '【模型初识】MA模型：我受"意外事件"（噪声）影响？',
        description: '解释移动平均含义'
    },
    {
        id: 'topic16',
        title: 'MA模型的"q"是什么意思？如何判断阶数？',
        description: '结合ACF/PACF图解释'
    },
    {
        id: 'topic17',
        title: 'AR vs MA：什么时候用哪个？',
        description: '根据ACF/PACF特征总结'
    },
    {
        id: 'topic18',
        title: '【强强联合】ARMA模型：既看过去的我，也看过去的"意外"',
        description: '解释组合模型'
    },
    {
        id: 'topic19',
        title: 'ARMA(p,q)怎么定阶？',
        description: '简单介绍信息准则AIC/BIC'
    },
    {
        id: 'topic20',
        title: 'ARIMA模型：ARMA加上"差分"是什么操作？',
        description: '解释I(d)的含义和作用'
    },
    {
        id: 'topic21',
        title: '模型选择困难症？AIC/BIC来帮忙',
        description: '简单介绍模型选择标准'
    },

    // 三、 核心检验方法
    {
        id: 'topic22',
        title: '【必会检验】如何科学判断序列平稳性？单位根检验来了！',
        description: '引入DF/ADF检验'
    },
    {
        id: 'topic23',
        title: 'DF检验 vs ADF检验：有啥区别？',
        description: '解释适用范围'
    },
    {
        id: 'topic24',
        title: '单位根检验的原假设是什么？P值怎么看？',
        description: '教用户解读检验结果'
    },
    {
        id: 'topic25',
        title: '【模型诊断】残差是"白噪声"吗？为什么要检验它？',
        description: '解释模型拟合好坏的标准'
    },
    {
        id: 'topic26',
        title: '白噪声检验：BP检验和LB检验怎么看？',
        description: '介绍两种方法和结果解读'
    },
    {
        id: 'topic27',
        title: '【多序列】什么是"协整"？一起涨跌就是它？',
        description: '用生活例子解释，如收入与消费'
    },
    {
        id: 'topic28',
        title: '协整检验：EG两步法 vs Johansen检验',
        description: '简单介绍适用场景'
    },
    {
        id: 'topic29',
        title: '【探究关系】格兰杰因果检验：谁是因？谁是果？',
        description: '解释其统计意义上的因果'
    },
    {
        id: 'topic30',
        title: '格兰杰因果检验结果怎么解读？',
        description: '结合实例说明'
    },

    // 四、 波动率模型
    {
        id: 'topic31',
        title: '【金融必看】什么是"波动集群"现象？',
        description: '用股价图解释，大波动跟着大波动'
    },
    {
        id: 'topic32',
        title: '为什么同方差假设在金融里不适用？',
        description: '引出条件异方差'
    },
    {
        id: 'topic33',
        title: 'ARCH模型：用过去的"波动"预测未来的"波动"',
        description: '解释模型思想'
    },
    {
        id: 'topic34',
        title: '如何检验ARCH效应？（LM检验/BP/LB检验）',
        description: '介绍检验方法'
    },
    {
        id: 'topic35',
        title: 'GARCH模型：ARCH的升级版，考虑了波动的"惯性"',
        description: '解释GARCH项的含义'
    },
    {
        id: 'topic36',
        title: 'GARCH(p,q)模型：如何理解p和q？',
        description: '' // No description in source
    },
    {
        id: 'topic37',
        title: 'ARCH/GARCH模型在金融风险管理中的应用',
        description: '强调价值'
    },

    // 五、 实践与拓展
    {
        id: 'topic38',
        title: '【工具篇】用Excel也能做简单的时间序列分析？',
        description: '演示描述统计、绘图、差分'
    },
    {
        id: 'topic39',
        title: '【工具篇】Python/R/Stata/Eviews做时间序列分析的基本步骤',
        description: '简单介绍流程，引导看视频'
    },
    {
        id: 'topic40',
        title: '案例分析：用时间序列模型预测XX股票走势可能吗？',
        description: '讨论模型的局限性与可能性'
    },
    {
        id: 'topic41',
        title: '伪回归：看起来相关，实际是"假象"？',
        description: '解释伪回归的危害'
    },
    {
        id: 'topic42',
        title: '时间序列分析学习路径/书籍推荐',
        description: '提供资源，引导'
    }
]; 