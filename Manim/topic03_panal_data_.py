from manim import *
import numpy as np

# --- 全局配置 ---
# 配置已移至 manim.cfg 文件

class PanelData3D(ThreeDScene):
    """
    Manim 场景类，用于展示多个平行排列的 3D 折线图 (面板数据可视化)。
    每个图表代表一个时间序列，绘制在各自的 XZ 平面上，并通过沿 Y 轴平移来区分。
    使用 ThreeDScene 基类以启用三维空间。
    """
    def create_graph_instance(self, y_shift_val):
        """
        创建单个图表实例，包括坐标轴、标签和数据折线。
        并将创建的 Mobjects 沿世界坐标系的 Y 轴进行平移。

        Args:
            y_shift_val (float): 指定该图表实例沿世界坐标系 Y 轴的平移距离。
                                正值向屏幕外侧移动，负值向屏幕内侧移动。

        Returns:
            tuple[ThreeDAxes, VMobject]: 包含两个元素的元组：
                - axes (ThreeDAxes): 创建并配置好的三维坐标系。
                - line (VMobject): 根据数据点创建的平滑折线。
        """
        # --- 1. 创建三维坐标系 --- 
        axes = ThreeDAxes(
            # 设置 X, Y, Z 轴的数值范围 [min, max, step]
            x_range=[-0.5, 5.5, 1],  # X 轴代表时间 t，范围从 -0.5 到 5.5，刻度间隔为 1
            y_range=[-0.1, 0.1, 1],  # Y 轴在此场景中不直接用于绘图，设置一个很小的范围使其几乎不可见
            z_range=[-0.5, 2.5, 1],  # Z 轴代表数值 value，范围从 -0.5 到 2.5，刻度间隔为 1
            
            # 设置 X, Y, Z 轴在 Manim 场景空间中的视觉长度
            x_length=5,             # X 轴的屏幕长度为 5 个单位
            y_length=0.01,          # Y 轴的屏幕长度非常小，使其在视觉上几乎消失
            z_length=3,             # Z 轴的屏幕长度为 3 个单位
            
            # 配置坐标轴的通用外观
            axis_config={
                "include_tip": True,    # 显示坐标轴末端的箭头
                "tip_width": 0.15,     # 设置箭头的宽度
                "tip_height": 0.15,    # 设置箭头的高度
                "include_numbers": True, # 显示轴上的刻度数值
                "font_size": 18         # 设置刻度数值的字体大小
            }
        )

        # 旋转 X 轴箭头，使其与标题保持相同的朝向
        # 注意：这里我们只旋转箭头部分，不影响整个坐标轴的方向
        x_axis_tip = axes.x_axis.tip
        if x_axis_tip:
            x_axis_tip.rotate(PI/2, axis=RIGHT)

        # 添加 X 轴标签 "t"
        x_label = MathTex("t").scale(1.2)  # 创建标签，稍微放大一点
        x_label.next_to(axes.x_axis.get_end(), RIGHT)  # 将标签放在 X 轴末端的右侧
        x_label.rotate(PI/2, axis=RIGHT)  # 将标签也旋转到相同方向
        axes.add(x_label)  # 将标签添加到坐标系中

        # --- 2. 隐藏 Y 轴 --- 
        # 由于我们是在 XZ 平面上绘制每个图表，Y 轴仅用于空间分隔
        # 因此需要隐藏 Y 轴的轴线和刻度数字，避免视觉干扰
        axes.y_axis.set_opacity(0) # 将 Y 轴轴线的透明度设为 0
        # 检查是否存在 Y 轴数字 Mobject，如果存在，也将其透明度设为 0
        if hasattr(axes.y_axis, 'numbers'):
            for number in axes.y_axis.numbers:
                number.set_opacity(0)

        # --- 同样隐藏 Z 轴的刻度数字 ---
        if hasattr(axes.z_axis, 'numbers'):
            for number in axes.z_axis.numbers:
                number.set_opacity(0)

        # --- 3. 生成数据点并创建折线 --- 
        num_points = 50  # 数据点数量
        # 生成 X 轴 (时间 t) 的数据点，从 0 到 5 均匀分布
        x_values = np.linspace(0, 5, num_points)
        
        # --- 使用随机波动生成 Z 轴数据 ---
        # 将 y_shift_val 从 [-4.5, 4.5] 映射到 [0, 1] 的归一化因子
        norm_factor = (y_shift_val - (-4.5)) / (4.5 - (-4.5))
        
        # 生成随机波动
        np.random.seed(int((norm_factor + 1) * 1000))  # 不同的种子产生不同的随机序列
        
        # 生成白噪声序列，增加标准差使波动更大
        noise = np.random.normal(0, 0.4, num_points)  # 增加标准差从0.15到0.4
        
        # 应用简单的指数平滑来减少过于剧烈的波动
        alpha = 0.4  # 平滑因子，从0.3增加到0.4，使变化更快
        z_values = np.zeros(num_points)
        z_values[0] = noise[0]
        
        # 控制波动幅度，显著增加范围
        amplitude = 1.0 + norm_factor * 1.0  # 波动幅度从 1.0 到 2.0
        
        # 生成平滑的随机序列
        for i in range(1, num_points):
            z_values[i] = alpha * noise[i] * amplitude + (1 - alpha) * z_values[i-1]
        
        # 归一化并调整到目标范围 [-0.5, 2.5]
        z_min, z_max = -0.5, 2.5
        z_range = z_max - z_min
        z_values = z_min + ((z_values - np.min(z_values)) / (np.max(z_values) - np.min(z_values))) * z_range
        
        # 将 (x, z) 数据点转换为 Manim 坐标系中的点
        points = [axes.coords_to_point(x, 0, z) for x, z in zip(x_values, z_values)]

        # 使用生成的点创建一条平滑的折线 (VMobject)
        line = VMobject(color=BLUE).set_points_smoothly(points)

        # --- 4. 沿 Y 轴平移 --- 
        # 将创建的坐标轴和折线作为一个整体，沿世界坐标系的 Y 轴平移指定的距离
        # 这是实现多个图表平行排列的关键步骤
        axes.shift(np.array([0, y_shift_val, 0]))
        line.shift(np.array([0, y_shift_val, 0]))

        # --- 5. 返回结果 --- 
        return axes, line # 返回创建的坐标轴和折线对象

    def construct(self):
        """
        构建 Manim 场景动画。
        定义对象的创建、动画效果和时间流程。
        """
        # --- 1. 定义摄像机视角参数 ---
        initial_phi = 90 * DEGREES     # 初始俯仰角 (正视 XZ 平面)
        initial_theta = -90 * DEGREES    # 初始方位角 (从 Y 轴正方向看)
        target_phi = 45 * DEGREES      # 目标俯仰角 (最终倾斜视角)
        target_theta = -120 * DEGREES    # 目标方位角 (最终旋转视角)
        gamma = 0 * DEGREES            # 翻滚角 (保持不变)
        initial_zoom = 0.8             # 初始缩放 
        target_zoom = 0.8              # 目标缩放 (如果需要变化，在此修改)

        # --- 2. 设置初始摄像机视角 ---
        self.set_camera_orientation(phi=initial_phi, theta=initial_theta, gamma=gamma, zoom=initial_zoom)
        
        # --- 3. 获取摄像机 ValueTrackers ---
        # 注意：顺序可能因 Manim 版本而异，但通常包含 phi, theta, ..., zoom
        # 我们主要关心 phi 和 zoom
        try:
            # Manim v0.18+ 推荐的方式获取特定 tracker
            phi_tracker = self.camera.phi_tracker
            theta_tracker = self.camera.theta_tracker
            gamma_tracker = self.camera.gamma_tracker
            zoom_tracker = self.camera.zoom_tracker
            # focal_distance_tracker = self.camera.focal_distance_tracker 
        except AttributeError:
             # 旧版本或备用方式 (需要注意索引顺序)
            trackers = self.camera.get_value_trackers()
            phi_tracker = trackers[0]
            theta_tracker = trackers[1]
            # focal_distance_tracker = trackers[2]
            gamma_tracker = trackers[3]
            # 根据 StackOverflow 评论，最新版本可能返回 zoom 而不是 distance_to_origin
            # 假设 zoom 是最后一个 tracker
            zoom_tracker = trackers[-1]
            # 如果 zoom 不对，可能需要检查 get_value_trackers() 的实际返回值

        # --- 4. 定义图表参数 --- 
        num_graphs = 6 
        y_positions = np.linspace(-4.5, 4.5, num_graphs)

        # --- 5. 初始化 Mobject 容器 & 循环创建图表实例 ---
        all_axes = VGroup() 
        all_lines = VGroup() 
        for y_pos in y_positions:
            axes_instance, line_instance = self.create_graph_instance(y_pos)
            all_axes.add(axes_instance)
            all_lines.add(line_instance)
            
        # --- 6. 准备第一个图表的特殊效果 ---
        first_axes = all_axes[0]  # 获取第一个坐标系实例
        x_start, x_end = 0, 5     # 定义 X 轴的起始和结束位置
        z_min, z_max = -0.5, 2.5  # 定义 Z 轴的最小和最大值范围

        # --- 定义高亮矩形的最终状态 ---
        # 使用坐标系的 coords_to_point 方法将数学坐标转换为场景中的实际位置
        bl = first_axes.coords_to_point(x_start, 0, z_min)  # 左下角点 (bottom-left)
        tl = first_axes.coords_to_point(x_start, 0, z_max)  # 左上角点 (top-left)
        tr = first_axes.coords_to_point(x_end, 0, z_max)    # 右上角点 (top-right)
        br = first_axes.coords_to_point(x_end, 0, z_min)    # 右下角点 (bottom-right)
        # 创建高亮矩形，设置为黄色半透明，无边框
        highlight_rect = Polygon(bl, tl, tr, br, color=YELLOW, fill_opacity=0.3, stroke_width=0)

        # --- 定义高亮矩形的起始状态 (零宽度) ---
        # 创建一个退化的矩形（实际上是一条线），用于后续的变形动画
        start_rect = Polygon(bl, tl, tl, bl, color=YELLOW, fill_opacity=0.3, stroke_width=0)

        # --- 创建标题文本 ---
        # 创建白色标题文本，字体大小为 36
        title = Text("Time Series", font_size=36, color=WHITE)

        # 计算高亮矩形的中心点（四个顶点的平均位置）
        rect_center = (bl + br + tl + tr) / 4

        # 将标题放在矩形下方，保持在同一个 XZ 平面上
        # 通过在 Z 轴方向上偏移 -2.5 个单位来定位标题
        # 注意：这里的坐标系是三维的，[x, y, z] 分别对应 [左右, 前后, 上下]
        title_pos = rect_center + np.array([0, 0, -2.5])  
        title.move_to(title_pos)  # 将标题移动到计算出的位置

        # 将标题旋转到与矩形相同的方向
        # 因为在 3D 空间中默认的文本是平行于 XY 平面的
        # 需要绕右方向(X轴)旋转 90 度，使其可以从正面看到
        title.rotate(PI/2, axis=RIGHT)

        # 设置标题的初始不透明度为 1（完全可见）
        title.set_opacity(1)

        # --- 7. 动画流程 ---
        # --- 7.1 动画第一个图表 (初始视角下) ---
        first_graph_run_time = 3  # 设置第一个图表动画的持续时间为 3 秒
        self.add(start_rect)      # 首先将起始状态的矩形添加到场景

        # 同时播放多个动画：创建坐标轴和折线，矩形变形，标题淡入
        self.play(
            Create(all_axes[0]),                    # 创建第一个坐标系
            Create(all_lines[0]),                   # 创建第一条折线
            Transform(start_rect, highlight_rect),   # 将起始矩形变形为最终的高亮矩形
            FadeIn(title),                          # 标题淡入效果
            run_time=first_graph_run_time           # 设置动画持续时间
        )

        # 确保标题始终可见，不受摄像机视角变化的影响
        # 这是通过将标题添加到固定帧元素列表中实现的
        # self.add_fixed_in_frame_mobjects(title)

        # --- 7.3 同时播放摄像机 ValueTracker 动画和后续图表动画 ---
        # 增加后续动画的运行时长，给渲染更多时间
        subsequent_graphs_run_time = 5 # 从 3 增加到 5
        
        # 准备后续图表的动画组 (使用 Create)
        create_animations = []
        if num_graphs > 1:
            for i in range(1, num_graphs):
                # 直接创建坐标轴和折线
                create_animations.append(Create(all_axes[i]))
                create_animations.append(Create(all_lines[i]))
        
        # 为 AnimationGroup 添加小的 lag_ratio，稍微错开动画开始时间        
        subsequent_graph_animations = AnimationGroup(*create_animations, lag_ratio=0.05) # 从 0 改为 0.05

        # 准备摄像机 ValueTracker 动画
        camera_animations = []
        # 仅当目标值与当前值不同时才添加动画，避免不必要的计算
        if phi_tracker.get_value() != target_phi:
             camera_animations.append(phi_tracker.animate.set_value(target_phi))
        # 现在 theta 也需要动画了
        if theta_tracker.get_value() != target_theta:
             camera_animations.append(theta_tracker.animate.set_value(target_theta))
        # if gamma_tracker.get_value() != gamma:
        #     camera_animations.append(gamma_tracker.animate.set_value(gamma))
        if zoom_tracker.get_value() != target_zoom:
             camera_animations.append(zoom_tracker.animate.set_value(target_zoom))
        
        # 播放动画
        if num_graphs > 1:
            # 将相机动画和图表动画一起放入 play
            self.play(
                *camera_animations, # 解包相机动画列表
                subsequent_graph_animations,
                run_time=subsequent_graphs_run_time
            )

        # --- 8. 结束画面 --- 
        self.wait(3)




