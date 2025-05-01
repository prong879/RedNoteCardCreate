from manim import *
import numpy as np

# --- 全局配置 ---
# 设置 Manim 渲染的帧宽高比接近 8:9，适合竖屏视频
config.frame_height = 9.0  # 设置帧的高度为 9 个单位
config.frame_width = 8.0   # 设置帧的宽度为 8 个单位
config.pixel_height = 1080 # 设置渲染的像素高度
config.pixel_width = 960   # 设置渲染的像素宽度 (1080 * 8/9)

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
        num_points = 20 # 定义每个折线图的数据点数量
        # 生成 X 轴 (时间 t) 的数据点，从 0 到 5 均匀分布
        x_values = np.linspace(0, 5, num_points)
        
        # --- 通过变化频率和振幅来生成差异化的 Z 轴数据 ---
        # 将 y_shift_val 从 [-4.5, 4.5] 映射到 [0, 1] 的归一化因子
        norm_factor = (y_shift_val - (-4.5)) / (4.5 - (-4.5))
        
        # 根据 norm_factor 计算变化的频率 (例如，从 1.0 到 2.5)
        frequency = 1.0 + norm_factor * 1.5 
        # 根据 norm_factor 计算变化的振幅 (例如，从 0.4 到 1.0)
        amplitude = 0.4 + norm_factor * 0.6
        # 计算相位偏移，仍然基于 y_shift_val
        phase_shift = y_shift_val * 0.5
        # 计算最终的 z_values，基线为 1
        z_values = 1 + np.sin(x_values * frequency + phase_shift) * amplitude
        
        # 将 (x, z) 数据点转换为 Manim 坐标系中的点
        # 注意：我们指定 Y 坐标为 0，因为每个图表绘制在其自身的 XZ 平面 (Y=0)
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
        first_axes = all_axes[0] 
        x_start, x_end = 0, 5
        z_min, z_max = -0.5, 2.5
        bl = first_axes.coords_to_point(x_start, 0, z_min) 
        tl = first_axes.coords_to_point(x_start, 0, z_max) 
        tr = first_axes.coords_to_point(x_end, 0, z_max)   
        br = first_axes.coords_to_point(x_end, 0, z_min)   
        highlight_rect = Polygon(bl, tl, tr, br, color=YELLOW, fill_opacity=0.3, stroke_width=0)

        # --- 7. 动画流程 --- 
        # --- 7.1 动画第一个图表 (初始视角下) ---
        first_graph_run_time = 3
        self.play(
            Create(all_axes[0]),      
            Create(all_lines[0]),     
            Create(highlight_rect),   
            run_time=first_graph_run_time 
        )
        
        # --- 7.2 (不再需要准备起始状态) ---
        # axes_start_list = [] # 删除
        # if num_graphs > 1:   # 删除
        #     ... (删除内部循环和 self.add) ...
        
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
        # 可选：如果只有一个图表，是否仍要移动摄像机？
        # elif num_graphs == 1 and camera_animations:
        #     self.play(*camera_animations, run_time=subsequent_graphs_run_time)

        # --- 8. 结束画面 --- 
        self.wait(3)




