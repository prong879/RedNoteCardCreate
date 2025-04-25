---
topicId: topic02
headerText: "@测试用户"
footerText: "测试页脚\n第二行"
mainText: |
  这是 test 的主文案。
  用于测试 Markdown 转换功能。
coverShowHeader: false
coverShowFooter: false
contentDefaultShowHeader: true
contentDefaultShowFooter: true
---

# 封面卡片标题 (Topic 02)

这是封面的副标题。
支持换行。

---

## 内容卡片 1 标题

这是内容卡片 1 的正文。

支持 **Markdown** 和 $LaTeX$ 公式 $\alpha + \beta$。

---
<!-- cardShowHeader: false -->
<!-- cardShowFooter: false -->
### 内容卡片 2 标题 (隐藏头尾)

这是内容卡片 2 的正文。

此卡片通过 HTML 注释设置了不显示页眉和页脚。

---

#### 内容卡片 3 标题 (默认头尾)

```javascript
// 测试代码块
function greet() {
  console.log("Hello!");
}
```

使用默认的页眉和页脚设置。 