# 最终成品输出对应的参考prompt：manim -qh -s -t --media_dir media Manim/topic01_timeseries_examples.py TimeSeriesExamples8x9

from manim import *
import numpy as np

# Configure for 8:9 aspect ratio (W:H)
config.frame_height = 8.0
config.frame_width = 8.0 * (8/9) # ~7.11
config.pixel_height = 1080 # Adjust resolution as needed
config.pixel_width = 960  # 1080 * (8/9)

# Configure font
config.font = "Times New Roman"

class TimeSeriesExamples8x9(Scene): # Renamed class for clarity
    def construct(self):
        # 主标题
        title = Text("Time Series", font_size=48)
        title.to_edge(UP, buff=0.5) # Position title at the top edge
        self.add(title) # Add title directly to the scene

        # 创建 VGroup 包含三个子图表
        plots_vgroup = VGroup()

        # 定义绘图区域（坐标轴不可见） - Adjusted for 8:9
        invisible_axes_config = {
            "x_range": [0, 5, 1],
            "y_range": [-1.5, 1.5, 1],
            "x_length": 5.5, # Adjusted x_length for 8:9 frame width
            "y_length": 2.0,
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
        plots_vgroup.arrange(DOWN, buff=0.75)

        # 将子图 VGroup 定位在标题下方 (增加间距)
        plots_vgroup.next_to(title, DOWN, buff=1) # Increased buff for more space

        # 添加子图 VGroup 到场景
        self.add(plots_vgroup)

        # No wait needed for png output with -ql or similar
        # self.wait() 