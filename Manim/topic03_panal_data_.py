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
    # --- 全局常量定义 ---
    AXIS_CONFIG = {
        "include_tip": True,      # 显示坐标轴末端的箭头
        "tip_width": 0.15,        # 设置箭头的宽度
        "tip_height": 0.15,       # 设置箭头的高度
        "include_numbers": True,  # 显示轴上的刻度数值
        "font_size": 18           # 设置刻度数值的字体大小
    }
    
    # 坐标范围常量
    X_RANGE = [-0.5, 5.5, 1]  # X 轴范围 [min, max, step]
    Y_RANGE = [-0.1, 0.1, 1]  # Y 轴范围 (很小，几乎不可见)
    Z_RANGE = [-0.5, 2.5, 1]  # Z 轴范围 [min, max, step]
    
    # 坐标轴在屏幕上的长度
    X_LENGTH = 5
    Y_LENGTH = 0.01
    Z_LENGTH = 3
    
    # 数据可视化常量
    X_START = 0     # 数据起始 X 坐标
    X_END = 5       # 数据结束 X 坐标
    Z_MIN = -0.5    # Z 轴最小值
    Z_MAX = 2.5     # Z 轴最大值
    NUM_POINTS = 30 # 每条折线的数据点数量
    NUM_GRAPHS = 6  # 图表数量
    
    # 相机视角常量
    INITIAL_PHI = 90 * DEGREES      # 初始俯仰角 (正视 XZ 平面)
    INITIAL_THETA = -90 * DEGREES   # 初始方位角 (从 Y 轴正方向看)
    TARGET_PHI = 60 * DEGREES       # 目标俯仰角 (最终倾斜视角)
    TARGET_THETA = -120 * DEGREES   # 目标方位角 (最终旋转视角)
    GAMMA = 0 * DEGREES             # 翻滚角 (保持不变)
    INITIAL_ZOOM = 0.8              # 初始缩放 
    TARGET_ZOOM = 0.8               # 目标缩放
    
    # 动画时长
    FIRST_GRAPH_RUNTIME = 3         # 第一个图表动画时长
    SUBSEQUENT_GRAPHS_RUNTIME = 7   # 后续图表和相机动画时长
    CONNECTING_RECT_RUNTIME = 2     # 连接矩形动画时长
    MOVEMENT_RUNTIME = 3            # 平移动画时长
    
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
            x_range=self.X_RANGE,
            y_range=self.Y_RANGE,
            z_range=self.Z_RANGE,
            
            # 设置 X, Y, Z 轴在 Manim 场景空间中的视觉长度
            x_length=self.X_LENGTH,
            y_length=self.Y_LENGTH,
            z_length=self.Z_LENGTH,
            
            # 配置坐标轴的通用外观
            axis_config=self.AXIS_CONFIG
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
        # 生成 X 轴 (时间 t) 的数据点，从 X_START 到 X_END 均匀分布
        x_values = np.linspace(self.X_START, self.X_END, self.NUM_POINTS)
        
        # --- 使用随机波动生成 Z 轴数据 ---
        # 将 y_shift_val 从 [-4.5, 4.5] 映射到 [0, 1] 的归一化因子
        norm_factor = (y_shift_val - (-4.5)) / (4.5 - (-4.5))
        
        # 生成随机波动
        np.random.seed(int((norm_factor + 1) * 1000))  # 不同的种子产生不同的随机序列
        
        # 生成白噪声序列，增加标准差使波动更大
        noise = np.random.normal(0, 0.4, self.NUM_POINTS)  # 标准差 0.4
        
        # 应用简单的指数平滑来减少过于剧烈的波动
        alpha = 0.4  # 平滑因子
        z_values = np.zeros(self.NUM_POINTS)
        z_values[0] = noise[0]
        
        # 控制波动幅度，显著增加范围
        amplitude = 1.0 + norm_factor * 1.0  # 波动幅度从 1.0 到 2.0
        
        # 生成平滑的随机序列
        for i in range(1, self.NUM_POINTS):
            z_values[i] = alpha * noise[i] * amplitude + (1 - alpha) * z_values[i-1]
        
        # 归一化并调整到目标范围 [Z_MIN, Z_MAX]
        z_range = self.Z_MAX - self.Z_MIN
        z_values = self.Z_MIN + ((z_values - np.min(z_values)) / (np.max(z_values) - np.min(z_values))) * z_range
        
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

    def create_highlight_rect(self, axes):
        """
        为指定的坐标系创建高亮矩形，用于突出显示数据区域。
        
        Args:
            axes (ThreeDAxes): 要添加高亮矩形的坐标系
            
        Returns:
            tuple: 包含两个多边形 (start_rect, highlight_rect)
        """
        # 使用坐标系的 coords_to_point 方法将数学坐标转换为场景中的实际位置
        bl = axes.coords_to_point(self.X_START, 0, self.Z_MIN)  # 左下角点 (bottom-left)
        tl = axes.coords_to_point(self.X_START, 0, self.Z_MAX)  # 左上角点 (top-left)
        tr = axes.coords_to_point(self.X_END, 0, self.Z_MAX)    # 右上角点 (top-right)
        br = axes.coords_to_point(self.X_END, 0, self.Z_MIN)    # 右下角点 (bottom-right)
        
        # 创建高亮矩形，设置为黄色半透明，无边框
        highlight_rect = Polygon(bl, tl, tr, br, color=YELLOW, fill_opacity=0.3, stroke_width=0)

        # 创建一个退化的矩形（实际上是一条线），用于后续的变形动画
        start_rect = Polygon(bl, tl, tl, bl, color=YELLOW, fill_opacity=0.3, stroke_width=0)
        
        return start_rect, highlight_rect
        
    def create_cross_section_rect(self, first_axes, last_axes):
        """
        创建连接第一个和最后一个图表的截面矩形
        
        Args:
            first_axes (ThreeDAxes): 第一个图表的坐标系
            last_axes (ThreeDAxes): 最后一个图表的坐标系
            
        Returns:
            tuple: 包含两个多边形 (start_connecting_rect, connecting_rect)
        """
        # 获取第一个图表在 t=0 的边界点
        first_left_bottom = first_axes.coords_to_point(self.X_START, 0, self.Z_MIN)
        first_left_top = first_axes.coords_to_point(self.X_START, 0, self.Z_MAX)
        
        # 获取最后一个图表在 t=0 的 Z 轴点
        # 注意：last_axes 已经包含了 Y 轴的平移
        last_right_bottom = last_axes.coords_to_point(self.X_START, 0, self.Z_MIN)
        last_right_top = last_axes.coords_to_point(self.X_START, 0, self.Z_MAX)
        
        # 创建连接矩形
        connecting_rect = Polygon(
            first_left_bottom,    # 左下角 (第一个图表, t=0, z_min)
            first_left_top,       # 左上角 (第一个图表, t=0, z_max)
            last_right_top,       # 右上角 (最后一个图表, t=0, z_max)
            last_right_bottom,    # 右下角 (最后一个图表, t=0, z_min)
            color=BLUE,           # 设置颜色为蓝色
            fill_opacity=0.2,     # 半透明填充
            stroke_width=2        # 边框宽度
        )
        
        # 创建起始状态的矩形（零宽度，在第一个图表处）
        start_connecting_rect = Polygon(
            first_left_bottom,
            first_left_top,
            first_left_top,       # 退化点
            first_left_bottom,    # 退化点
            color=BLUE,
            fill_opacity=0.2,
            stroke_width=2
        )
        
        return start_connecting_rect, connecting_rect
        
    def create_title(self, text, center_point, offset=np.array([0, 0, -2.5])):
        """
        创建并设置标题文本
        
        Args:
            text (str): 标题文本内容
            center_point (np.array): 标题参考中心点
            offset (np.array): 从中心点的偏移量
            
        Returns:
            Text: 创建好的标题对象
        """
        title = Text(text, font_size=36, color=WHITE)
        title_pos = center_point + offset
        title.move_to(title_pos)
        return title

    def setup_camera_trackers(self):
        """
        设置并获取摄像机的 ValueTrackers
        
        Returns:
            tuple: 包含相机的各个控制器 (phi_tracker, theta_tracker, gamma_tracker, zoom_tracker)
        """
        try:
            # Manim v0.18+ 推荐的方式获取特定 tracker
            phi_tracker = self.camera.phi_tracker
            theta_tracker = self.camera.theta_tracker
            gamma_tracker = self.camera.gamma_tracker
            zoom_tracker = self.camera.zoom_tracker
        except AttributeError:
             # 旧版本备用方式
            trackers = self.camera.get_value_trackers()
            phi_tracker = trackers[0]
            theta_tracker = trackers[1]
            gamma_tracker = trackers[3]
            zoom_tracker = trackers[-1]
            
        return phi_tracker, theta_tracker, gamma_tracker, zoom_tracker
        
    def construct(self):
        """
        构建 Manim 场景动画。
        定义对象的创建、动画效果和时间流程。
        """
        # --- 1. 设置初始摄像机视角 ---
        self.set_camera_orientation(
            phi=self.INITIAL_PHI, 
            theta=self.INITIAL_THETA, 
            gamma=self.GAMMA, 
            zoom=self.INITIAL_ZOOM
        )
        
        # --- 2. 获取摄像机 ValueTrackers ---
        phi_tracker, theta_tracker, gamma_tracker, zoom_tracker = self.setup_camera_trackers()

        # --- 3. 定义图表参数 --- 
        y_positions = np.linspace(-4.5, 4.5, self.NUM_GRAPHS)

        # --- 4. 创建所有图表实例 ---
        all_axes = VGroup()  # 使用 VGroup 分组所有坐标轴
        all_lines = VGroup() # 使用 VGroup 分组所有折线 
        for y_pos in y_positions:
            axes_instance, line_instance = self.create_graph_instance(y_pos)
            all_axes.add(axes_instance)
            all_lines.add(line_instance)
            
        # --- 5. 准备第一个图表的特殊效果 ---
        first_axes = all_axes[0]  # 获取第一个坐标系实例
        
        # 创建高亮矩形
        start_rect, highlight_rect = self.create_highlight_rect(first_axes)
        
        # 为第一个图表创建标题
        # 计算高亮矩形的中心点
        rect_center = (
            first_axes.coords_to_point(self.X_START, 0, self.Z_MIN) + 
            first_axes.coords_to_point(self.X_START, 0, self.Z_MAX) + 
            first_axes.coords_to_point(self.X_END, 0, self.Z_MAX) + 
            first_axes.coords_to_point(self.X_END, 0, self.Z_MIN)
        ) / 4
        
        # 创建标题并设置位置
        title = self.create_title("Time Series", rect_center)
        # 将标题旋转到与矩形相同的方向
        title.rotate(PI/2, axis=RIGHT)
        
        # --- 6. 动画流程 ---
        # --- 6.1 动画第一个图表 (初始视角下) ---
        self.play(
            Create(all_axes[0]),                   # 创建第一个坐标系
            Create(all_lines[0]),                  # 创建第一条折线
            Transform(start_rect, highlight_rect), # 将起始矩形变形为最终的高亮矩形
            FadeIn(title),                         # 标题淡入效果
            run_time=self.FIRST_GRAPH_RUNTIME      # 设置动画持续时间
        )

        # --- 6.2 同时播放摄像机动画和后续图表动画 ---
        # 准备后续图表的动画组
        create_animations = []
        if self.NUM_GRAPHS > 1:
            for i in range(1, self.NUM_GRAPHS):
                create_animations.append(Create(all_axes[i]))
                create_animations.append(Create(all_lines[i]))
        
        # 为 AnimationGroup 添加小的 lag_ratio，稍微错开动画开始时间        
        subsequent_graph_animations = AnimationGroup(*create_animations, lag_ratio=0.05)

        # 准备摄像机 ValueTracker 动画
        camera_animations = []
        if phi_tracker.get_value() != self.TARGET_PHI:
             camera_animations.append(phi_tracker.animate.set_value(self.TARGET_PHI))
        if theta_tracker.get_value() != self.TARGET_THETA:
             camera_animations.append(theta_tracker.animate.set_value(self.TARGET_THETA))
        if zoom_tracker.get_value() != self.TARGET_ZOOM:
             camera_animations.append(zoom_tracker.animate.set_value(self.TARGET_ZOOM))
        
        # 播放摄像机和后续图表动画
        if self.NUM_GRAPHS > 1:
            self.play(
                *camera_animations,
                subsequent_graph_animations,
                run_time=self.SUBSEQUENT_GRAPHS_RUNTIME
            )

        # --- 6.3 创建截面矩形及其标题 ---
        # 获取第一个和最后一个图表的坐标系
        first_axes = all_axes[0]
        last_axes = all_axes[-1]
        
        # 创建连接矩形
        start_connecting_rect, connecting_rect = self.create_cross_section_rect(first_axes, last_axes)
        
        # 创建截面数据标题
        rect_center = (
            first_axes.coords_to_point(self.X_START, 0, self.Z_MIN) + 
            first_axes.coords_to_point(self.X_START, 0, self.Z_MAX) + 
            last_axes.coords_to_point(self.X_START, 0, self.Z_MAX) + 
            last_axes.coords_to_point(self.X_START, 0, self.Z_MIN)
        ) / 4
        
        cross_section_title = self.create_title(
            "Cross-sectional Data", 
            rect_center, 
            offset=np.array([0, 0, -2.5])
        )
        
        # 旋转标题使其位于正确平面
        # 1. 绕 Z 轴 (UP) 旋转 -90 度，使基线沿 Y 轴
        cross_section_title.rotate(-PI/2, axis=UP)
        # 2. 绕 X 轴 (RIGHT) 旋转 90 度，使其垂直于 YZ 平面
        cross_section_title.rotate(PI/2, axis=RIGHT) 
        
        # 播放创建截面矩形和标题的动画
        self.play(
            Transform(start_connecting_rect, connecting_rect),  # 矩形从线变成面
            Create(cross_section_title),                        # 创建标题
            run_time=self.CONNECTING_RECT_RUNTIME              # 设置动画时长为2秒
        )
        
        self.wait(1)

        # --- 6.4 添加平移动画 ---
        # 将蓝色矩形和其标题一起沿 X 轴正方向平移
        self.play(
            start_connecting_rect.animate.shift(np.array([5, 0, 0])),
            cross_section_title.animate.shift(np.array([5, 0, 0])),
            run_time=self.MOVEMENT_RUNTIME
        )

        # --- 7. 结束画面 ---

        # --- 8. 添加固定的 2D 标题 ---
        final_title = Text("Panel Data", font_size=48, color=WHITE)
        # 将标题定位到屏幕顶部边缘，并稍微向下移动一点留出边距
        final_title.to_edge(UP, buff=0.5) 
        
        # 使用 add_fixed_in_frame_mobjects 添加为 2D 覆盖层并播放淡入动画
        self.play(FadeIn(final_title))
        self.add_fixed_in_frame_mobjects(final_title)
        
        # 最后再等待几秒，让观众看到最终画面
        self.wait(3)




