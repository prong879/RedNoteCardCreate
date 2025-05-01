from manim import *
# 显式导入
from manim.mobject.types.vectorized_mobject import DashedVMobject, VMobject, VGroup
from manim.mobject.text.text_mobject import Text # 显式导入 Text
from manim.utils.color import BLUE, RED, GREEN, YELLOW, ORANGE, PURPLE, PINK, GREY, GOLD, MAROON # 导入更多颜色
import numpy as np

# --- 配置 ---
# 设置宽高比为 8:9 (宽比高)
config.frame_height = 9
config.frame_width = 8
config.pixel_height = 1080 # 设置像素高度
config.pixel_width = 960   # 设置像素宽度 1080 * (8/9)
# config.background_color = "#1E1E1E" # 可选：深色背景


class UncertaintyIllustration(Scene):
    def construct(self):
        # --- 标题 ---
        title = Text("Uncertainty", font_size=48)
        title.to_edge(UP, buff=0.5) # 稍微向下一点
        self.add(title)

        # --- 参数定义 ---
        # 主线
        n_main_points = 20          # 主路径点数
        start_y = 3.0               # 主线起点 Y 坐标 (降低以避开标题)
        end_y_main = 0.5            # 主线终点 Y 坐标 (画面中部)
        start_point_main = [0, start_y, 0]
        end_point_main = [0, end_y_main, 0]
        main_x_fluctuation = 0.5    # 主线 X 方向波动幅度
        main_line_color = BLUE
        main_stroke_width = 10       # 稍微加粗主线

        # 分支
        n_branches = 10             # 分支数量
        n_branch_points = 15        # 每个分支的点数
        end_y_branch = -3.8         # 分支终点 Y 坐标 (靠近底部)
        branch_x_spread = 3.0       # 分支在底部的 X 方向扩散范围
        branch_x_noise_start = 0.05 # 分支起点附近的 X 噪声
        branch_x_noise_end = 0.6    # 分支终点附近的 X 噪声
        branch_stroke_width = 5   # 稍微加粗分支
        # 定义多种暖色作为渐变终点
        warm_colors = [YELLOW, GOLD, ORANGE, RED, PINK, MAROON]

        # --- 生成主路径数据 ---
        main_y_coords = np.linspace(start_y, end_y_main, n_main_points)
        # X 方向的随机波动
        main_x_noise = np.random.normal(0, main_x_fluctuation, n_main_points)
        # 平滑噪声，使其看起来更自然 (可选)
        main_x_noise_smooth = np.convolve(main_x_noise, np.ones(5)/5, mode='same') 
        main_x_coords = main_x_noise_smooth
        main_points = np.array([[x, y, 0] for x, y in zip(main_x_coords, main_y_coords)])
        # 确保起点和终点精确
        main_points[0] = start_point_main
        main_points[-1] = end_point_main 

        # --- 创建主路径 VMobject ---
        main_line = VMobject(stroke_width=main_stroke_width, color=main_line_color)
        main_line.set_points_as_corners(main_points)

        # --- 创建分支路径 ---
        branch_lines_group = VGroup()
        branch_start_point = main_points[-1] # 分支起点是主线终点

        for i in range(n_branches):
            # 1. 定义分支终点 X 坐标 (在左右扩散)
            target_x = np.random.uniform(-branch_x_spread, branch_x_spread)
            target_point = [target_x, end_y_branch, 0]

            # 2. 生成分支路径点
            branch_y_coords = np.linspace(branch_start_point[1], end_y_branch, n_branch_points)
            t = np.linspace(0, 1, n_branch_points) # 参数 t 从 0 (起点) 到 1 (终点)

            # 基础 X 路径 (从起点 X 到目标 X，可以是直线)
            branch_x_base = branch_start_point[0] * (1 - t) + target_x * t

            # 增加的 X 方向噪声 (噪声幅度随 t 增大)
            current_noise_level = branch_x_noise_start * (1 - t) + branch_x_noise_end * t
            branch_x_noise = np.random.normal(0, current_noise_level, n_branch_points)
            # 平滑噪声 (可选)
            branch_x_noise_smooth = np.convolve(branch_x_noise, np.ones(3)/3, mode='same')

            branch_x_coords = branch_x_base + branch_x_noise_smooth
            branch_points_list = [[x, y, 0] for x, y in zip(branch_x_coords, branch_y_coords)]
            # 确保起点精确
            branch_points_list[0] = branch_start_point

            # 3. 创建分支 VMobject
            if len(branch_points_list) > 1:
                # 先创建基础线条，不需要颜色
                branch_line = VMobject(stroke_width=branch_stroke_width)
                branch_line.set_points_as_corners(branch_points_list)

                # 4. 创建虚线 VMobject
                dashed_branch = DashedVMobject(branch_line, num_dashes=25, dashed_ratio=0.6)
                # 选择一个暖色作为此分支的渐变终点
                selected_warm_color = warm_colors[i % len(warm_colors)]
                # 应用渐变
                dashed_branch.set_color_by_gradient(main_line_color, selected_warm_color)
                branch_lines_group.add(dashed_branch)

        # --- 添加到场景 ---
        self.add(main_line)
        self.add(branch_lines_group)

        # self.wait(1) # 对于静态导出 (-s) 不是必须的，但保留无害 