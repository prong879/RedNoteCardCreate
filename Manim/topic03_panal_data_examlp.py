# manim_script.py
from manim import *
import numpy as np

# --- 配置 ---
# 设置宽高比为 8:9 (宽比高)
config.frame_height = 9
config.frame_width = 8
config.pixel_height = 1080 # 设置像素高度
config.pixel_width = 960   # 设置像素宽度 1080 * (8/9)

class StackedLineCharts3D(ThreeDScene):
    def construct(self):
        # --- 参数配置 ---
        num_charts = 8       # 要绘制的折线图数量
        y_spacing = 1.5      # Y 轴上图表之间的间距
        x_length = 4         # 每个图表在 X 轴方向的长度
        num_points = 30      # 每个图表的数据点数量
        z_amplitude = 0.5    # Z 轴波动幅度
        x_range = (0, x_length, 1)
        y_range = (0, (num_charts -1) * y_spacing + 1, y_spacing if y_spacing > 0 else 1) # 确保范围有效
        z_range = (-z_amplitude - 0.5, z_amplitude + 0.5, 0.5)
        # ----------------

        # 定义颜色列表
        color_list = [BLUE, GREEN, RED, YELLOW, PURPLE, ORANGE, PINK]

        # 1. 创建三维坐标轴
        axes = ThreeDAxes(
            x_range=x_range,
            y_range=y_range,
            z_range=z_range,
            x_length=x_length + 1, # 坐标轴长度略大于图形范围
            y_length=(num_charts - 1) * y_spacing + 2,
            z_length=z_amplitude * 2 + 2,
            axis_config={"include_tip": True, "include_numbers": True},
            # z_axis_config={"decimal_places": 1}, # Z 轴可能需要小数
        )
        # 将坐标轴整体向左移动
        axes.shift(UP * 2, RIGHT * 1)

        # 移除默认标签创建
        # axes_labels = axes.get_axis_labels(x_label="X", y_label="Y", z_label="Z")

        # 手动创建并放置轴标签
        x_label = MathTex("X").next_to(axes.x_axis.get_end(), RIGHT, buff=0.1)
        y_label = MathTex("Y").next_to(axes.y_axis.get_end(), UP, buff=0.2) # Y 轴标签放在箭头上方
        z_label = MathTex("Z").next_to(axes.z_axis.get_end(), OUT, buff=0.2) # Z 轴标签放在箭头指向屏幕外的方向

        self.set_camera_orientation(phi=60 * DEGREES, theta=-110 * DEGREES) # 设置相机视角
        # 添加坐标轴和手动创建的标签
        self.add(axes, x_label, y_label, z_label)

        # 2. 绘制多个折线图
        start_charts = VGroup() # Mobjects at origin (starting state)
        final_charts = VGroup() # Mobjects at final position (target state)

        for i in range(num_charts):
            y_coord = i * y_spacing # 当前图表的 Y 坐标

            # --- Create chart in FINAL position ---
            x_coords = np.linspace(0, x_length, num_points)
            z_coords = np.random.uniform(-z_amplitude, z_amplitude, num_points)
            z_coords[0] = 0.0 # Ensure start is on y-axis
            points = [axes.c2p(x, y_coord, z) for x, z in zip(x_coords, z_coords)]

            chart_color = color_list[i % len(color_list)]
            final_chart = VMobject(stroke_color=chart_color, stroke_width=2)
            final_chart.set_points_smoothly(points)
            final_charts.add(final_chart)
            # --------------------------------------

            # --- Create STARTING chart (copy shifted to origin) ---
            start_chart = final_chart.copy()
            # Calculate shift needed to move the chart's start point to the origin
            shift_vector = axes.c2p(0, 0, 0) - start_chart.get_start()
            start_chart.shift(shift_vector)
            start_charts.add(start_chart)
            # ------------------------------------------------------

        self.add(start_charts)

        # Create Transform animations for all charts simultaneously
        # Use ReplacementTransform to potentially combine creation and translation
        transform_animations = [ReplacementTransform(start, final) for start, final in zip(start_charts, final_charts)]

        # Play the simultaneous translation animation
        self.play(*transform_animations, run_time=3) # Adjust run_time as needed

        self.wait(1)
