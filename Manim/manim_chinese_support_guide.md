# Manim 中文支持配置指南

**目标:** 确保 Manim 能够在其生成的动画中正确渲染和显示中文字符，无论是在普通文本 (`Text`) 还是 LaTeX 数学/文本 (`Tex`, `MathTex`) 中。

**核心问题:**

1.  **`Text` 对象:** 依赖 Manim 直接调用的系统字体。
2.  **`Tex` / `MathTex` 对象:** 依赖后端的 LaTeX 系统进行渲染。标准的 LaTeX 配置（如 `pdflatex`）通常不直接支持 Unicode (包括中文)。

**解决方案与注意事项:**

1.  **配置 `Text` 对象的字体:**
    *   在你的 Python 脚本开头，设置 `config.font` 为你系统上安装并希望使用的中文字体名称。
    *   **示例:**
        ```python
        from manim import *
        config.font = "Microsoft YaHei" # 或 "SimHei", "DengXian", "Source Han Sans CN" 等
        ```
    *   这主要影响直接使用 `Text("中文内容")` 创建的对象。

2.  **配置 `Tex` / `MathTex` 对象的 LaTeX 环境 (关键步骤):**
    *   **选择合适的 LaTeX 编译器:** 必须使用支持 Unicode 的编译器，推荐 `xelatex` (或 `lualatex`)。
    *   **使用支持中文的 LaTeX 宏包:** 推荐使用 `ctex` 宏包，它能很好地处理中文排版。
    *   **在 LaTeX 导言区指定中文字体:** 使用 `ctex` 提供的命令 (如 `\setCJKmainfont`) 来指定 LaTeX 渲染时使用的中文字体。
    *   **在 Manim 中实现:** 通过修改 `config.tex_template` 来应用这些 LaTeX 设置。
    *   **示例 (推荐配置):**
        ```python
        from manim import *
        import os # 需要导入 os 来处理换行符

        # 1. 创建自定义 TeX 模板
        my_template = TexTemplate(
            tex_compiler="xelatex",       # 指定编译器为 xelatex
            output_format=".xdv",         # xelatex 对应的输出格式
        )

        # 2. 在 LaTeX 导言区添加中文支持
        #    确保 'Microsoft YaHei' 是你系统上安装的字体，否则替换它
        my_template.add_to_preamble(
            r"\usepackage{ctex}" + os.linesep +          # 加载 ctex 宏包
            r"\setCJKmainfont{Microsoft YaHei}" + os.linesep # 设置 CJK (中日韩) 字体
            # 你也可以根据需要设置其他字体，如 \setCJKsansfont, \setCJKmonofont
        )

        # 3. 将配置好的模板应用到全局
        config.tex_template = my_template

        # --- 现在 Tex 和 MathTex 应该能正确处理中文了 ---
        # class MyScene(Scene):
        #     def construct(self):
        #         # Tex 对象现在可以使用中文
        #         chinese_tex = Tex("你好，世界！ $E=mc^2$")
        #         # 坐标轴标签等依赖 Tex 的部分也能显示中文
        #         axes = Axes().add_coordinates()
        #         x_label = axes.get_x_axis_label("时间")
        #         self.play(Write(chinese_tex), Create(axes), Write(x_label))
        ```

3.  **系统环境要求:**
    *   必须安装完整的 TeX 发行版 (例如 TeX Live 或 MiKTeX)。
    *   确保 TeX 发行版包含了 `xelatex` 编译器。
    *   确保你的操作系统安装了你在配置中指定的 TrueType/OpenType 中文字体 (如 "Microsoft YaHei")，并且 LaTeX 能够找到并使用它。

**总结:**

*   对于 `Text`，设置 `config.font`。
*   对于 `Tex`/`MathTex`，必须配置 `config.tex_template`，使用 `xelatex` 编译器、`ctex` 宏包，并在导言区用 `\setCJKmainfont` 指定有效的中文字体。
*   确保满足系统环境要求。 