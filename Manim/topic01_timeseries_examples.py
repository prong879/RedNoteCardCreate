from manim import *
import numpy as np

# Configure for 3:4 aspect ratio (portrait)
config.frame_height = 8.0
config.frame_width = 6.0
config.pixel_height = 1080 # Adjust resolution as needed
config.pixel_width = 810

# Configure font
config.font = "Times New Roman"

class TimeSeriesExamplesPortrait(Scene):
    def construct(self):
        # 主标题
        title = Text("Time Series", font_size=48) # Adjusted font size for portrait
        # title.to_edge(UP, buff=0.5) # Remove absolute positioning
        # self.add(title) # Add later as part of the group

        # 创建 VGroup 包含三个子图表
        plots_vgroup = VGroup()

        # 定义绘图区域（坐标轴不可见）
        invisible_axes_config = {
            "x_range": [0, 5, 1],
            "y_range": [-1.5, 1.5, 1],
            "x_length": 4,
            "y_length": 2,
            "axis_config": {
                "stroke_opacity": 0,
                "include_tip": False,
                "include_ticks": False,
            }
        }

        # 第一个图表：正弦曲线
        sine_axes = Axes(**invisible_axes_config)
        sine_graph = sine_axes.plot(lambda x: np.sin(x * TAU / 2), color=BLUE)
        # self.add(sine_axes) # Do not add axes to make them invisible
        sine_plot_group = VGroup(sine_graph).move_to(sine_axes.get_center())
        plots_vgroup.add(sine_plot_group)

        # 第二个图表：白噪声折线
        noise_axes = Axes(**invisible_axes_config)
        # Generate points for noise
        num_points = 50
        x_values = np.linspace(noise_axes.x_range[0], noise_axes.x_range[1], num_points)
        y_values = 0.5 * np.random.randn(num_points)
        noise_points = [noise_axes.c2p(x, y) for x, y in zip(x_values, y_values)]
        noise_graph = VMobject(color=RED).set_points_as_corners(noise_points)
        # self.add(noise_axes) # Do not add axes
        noise_plot_group = VGroup(noise_graph).move_to(noise_axes.get_center())
        plots_vgroup.add(noise_plot_group)

        # 第三个图表：线性趋势
        trend_axes = Axes(**invisible_axes_config)
        # Simple linear trend with noise: y = k*x + noise, scaled to axes range
        noise_amplitude_trend = 0.15
        trend_graph = trend_axes.plot(
            lambda x: 0.3 * (x - trend_axes.x_range[0]) + noise_amplitude_trend * np.random.randn(), # Add random noise
            color=GREEN,
            use_smoothing=False # Ensure sharp corners for noise
        )
        # self.add(trend_axes) # Do not add axes
        trend_plot_group = VGroup(trend_graph).move_to(trend_axes.get_center())
        plots_vgroup.add(trend_plot_group)

        # 先排列子图 VGroup
        plots_vgroup.arrange(DOWN, buff=0.5)

        # 创建整体 VGroup (标题 + 子图)
        overall_group = VGroup(title, plots_vgroup)
        # 排列整体 VGroup (标题和子图之间的间距)
        overall_group.arrange(DOWN, buff=0.5)

        # 将整体 VGroup 居中显示
        overall_group.move_to(ORIGIN)

        self.add(overall_group)

        # No wait needed for png output with -ql or similar
        # self.wait() 