# main.py - Manim GUI 应用主入口

import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox
import subprocess
import threading
import os
import sys
import shutil # 用于查找 python 解释器
import glob # 用于查找文件
import re # 用于解析版本号
from packaging import version # 新增：用于更健壮的版本比较

# 确保 core 目录在 Python 路径中
# 这通常在从 manim_gui 目录运行脚本时不是必需的，但为了健壮性可以添加
script_dir = os.path.dirname(os.path.abspath(__file__))
core_dir = os.path.join(script_dir, 'core')
if core_dir not in sys.path:
    # 如果 core 目录不在 sys.path 中，尝试将其添加到列表的开头
    # 这有助于解决直接从 manim_gui 目录运行脚本时的导入问题
    sys.path.insert(0, core_dir)
    # 也将父目录（项目的根目录）添加到 sys.path，以便 core 模块可以被找到
    parent_dir = os.path.dirname(script_dir)
    if parent_dir not in sys.path:
        sys.path.insert(0, parent_dir)


try:
    # 尝试导入，如果失败，则打印更详细的错误信息
    from core.script_parser import get_scene_names
    from core.manim_runner import run_manim_command
except ImportError as e:
    print(f"导入 core 模块时出错: {e}")
    print("当前的 Python 搜索路径 (sys.path):")
    for p in sys.path:
        print(f"- {p}")
    print("\\n请确保:")
    print("1. core 目录存在于 manim_gui 目录下。")
    print("2. 你是从 manim_gui 的父目录 (即 Time_Series_Card) 运行此脚本的，例如使用: python -m manim_gui.main")
    print("3. 如果使用了虚拟环境，请确保它已激活。")
    # 抛出更具体的错误，以便用户知道问题所在
    raise ImportError(f"无法导入 core 模块。请检查上述路径和运行方式。原始错误: {e}")


class ManimGUI(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("Manim GUI 渲染助手")
        self.minsize(900, 600) # 设置窗口最小尺寸
        self.geometry("850x650") # 设置窗口初始尺寸

        # --- 状态变量 --- # 用于存储 GUI 的状态和用户选择
        self.script_path = ctk.StringVar()         # 当前选择的 Manim 脚本路径
        self.selected_scene = ctk.StringVar(value="选择场景") # 当前选择的场景名称
        self.selected_quality = ctk.StringVar(value="高质量 (-qh)") # 当前选择的渲染质量
        self.selected_format = ctk.StringVar(value="MP4 (视频)")   # 当前选择的输出格式
        self.transparent_bg = ctk.BooleanVar(value=False)     # 是否使用透明背景
        self.preview_action = ctk.StringVar(value="播放视频/图片 (-p)") # 渲染后的预览操作
        self.python_path = ctk.StringVar()         # 当前选择的 Python 解释器路径
        self.output_dir = ctk.StringVar()          # 当前选择的输出目录路径
        self._internal_output_dir = ""             # 内部使用的输出目录路径（命令行调用时使用）
        self.is_rendering = False                    # 标记当前是否正在渲染
        self.parent_dir_scripts = {}                 # 存储扫描到的父目录脚本 {显示名: 路径}
        self.BROWSE_FILES_OPTION = "浏览文件..."      # 脚本下拉菜单的浏览选项文本
        self.python_interpreters = {}                # 存储扫描到的 Python 解释器 {显示名: 路径}
        self.BROWSE_PYTHON_OPTION = "浏览解释器..."   # Python 下拉菜单的浏览选项文本
        self.python_lower_path_map = {}            # 新增: 存储 {小写规范路径: 显示名称}
        self.BROWSE_OUTPUT_OPTION = "浏览目录..."    # 新增: 输出目录浏览选项文本
        self.USE_DEFAULT_MEDIA = "[默认] media (脚本同级)" # 新增: 使用默认media逻辑的选项文本

        # --- UI 布局 --- # 配置主窗口的网格布局
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1)

        self._create_widgets()
        # 初始化时设置内部输出目录为空，表示默认
        self._internal_output_dir = ""
        # 初始化时显示占位符
        self.output_dir.set("[脚本同级media目录]") 
        self._initialize_paths() # 初始化路径 (会设置 python_path 的初始值)
        self._scan_parent_directory_scripts() # 启动时扫描父目录脚本
        self._scan_python_interpreters() # 新增：启动时扫描 Python 解释器

    def _create_widgets(self):
        # --- 配置区域 ---
        config_frame = ctk.CTkFrame(self)
        config_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        
        # 配置网格布局 - 重新规划
        # 0:标签列  1:输入框/主要下拉菜单列  2:下拉菜单按钮列
        config_frame.grid_columnconfigure(0, weight=0, minsize=100)  # 标签列固定宽度修改为100
        config_frame.grid_columnconfigure(1, weight=1)               # 输入框列可伸缩
        config_frame.grid_columnconfigure(2, weight=0, minsize=120)  # 下拉菜单按钮列固定宽度

        current_row = 0 # 用于追踪当前添加控件的行号

        # 1. Python 解释器选择区域
        python_label = ctk.CTkLabel(config_frame, text="Python 解释器:", anchor="w", width=100)
        python_label.grid(row=current_row, column=0, padx=(10, 5), pady=5, sticky="w")

        self.python_display_entry = ctk.CTkEntry(config_frame, textvariable=self.python_path, state="readonly")
        self.python_display_entry.grid(row=current_row, column=1, padx=5, pady=5, sticky="ew")

        self.python_menu = ctk.CTkOptionMenu(
            config_frame,
            values=[self.BROWSE_PYTHON_OPTION],
            command=self._on_python_selected,
            width=120
        )
        self.python_menu.grid(row=current_row, column=2, padx=5, pady=5, sticky="ew")
        self.python_menu.set(self.BROWSE_PYTHON_OPTION)

        current_row += 1

        # 2. 文件选择区域
        file_label = ctk.CTkLabel(config_frame, text="Manim 脚本:", anchor="w", width=100)
        file_label.grid(row=current_row, column=0, padx=(10, 5), pady=5, sticky="w")

        self.file_entry = ctk.CTkEntry(config_frame, textvariable=self.script_path, state="readonly")
        self.file_entry.grid(row=current_row, column=1, padx=5, pady=5, sticky="ew")

        self.parent_script_menu = ctk.CTkOptionMenu(
            config_frame,
            values=[self.BROWSE_FILES_OPTION],
            command=self._on_parent_script_selected,
            width=120
        )
        self.parent_script_menu.grid(row=current_row, column=2, padx=5, pady=5, sticky="ew")
        self.parent_script_menu.set(self.BROWSE_FILES_OPTION)

        current_row += 1

        # 3. 输出目录选择区域
        output_dir_label = ctk.CTkLabel(config_frame, text="输出目录:", anchor="w", width=100)
        output_dir_label.grid(row=current_row, column=0, padx=(10, 5), pady=5, sticky="w")

        self.output_dir_entry = ctk.CTkEntry(config_frame, textvariable=self.output_dir, state="readonly")
        self.output_dir_entry.grid(row=current_row, column=1, padx=5, pady=5, sticky="ew")

        self.output_dir_menu = ctk.CTkOptionMenu(
            config_frame,
            values=[self.BROWSE_OUTPUT_OPTION, self.USE_DEFAULT_MEDIA],
            command=self._on_output_dir_selected,
            width=120
        )
        self.output_dir_menu.grid(row=current_row, column=2, padx=5, pady=5, sticky="ew")
        self.output_dir_menu.set(self.USE_DEFAULT_MEDIA)

        current_row += 1

        # 4. 场景选择下拉菜单 - 与输出格式和渲染质量放在同一行
        scene_frame = ctk.CTkFrame(config_frame)
        scene_frame.grid(row=current_row, column=0, columnspan=3, padx=5, pady=5, sticky="ew")
        scene_frame.grid_columnconfigure(0, weight=0, minsize=100)  # 场景标签
        scene_frame.grid_columnconfigure(1, weight=1, minsize=120)  # 场景下拉框
        scene_frame.grid_columnconfigure(2, weight=0, minsize=100)  # 渲染质量标签
        scene_frame.grid_columnconfigure(3, weight=0, minsize=120)  # 渲染质量下拉框
        scene_frame.grid_columnconfigure(4, weight=0, minsize=100)  # 输出格式标签
        scene_frame.grid_columnconfigure(5, weight=0, minsize=120)  # 输出格式下拉框
        
        scene_label = ctk.CTkLabel(scene_frame, text="选择场景:", anchor="w", width=100)
        scene_label.grid(row=0, column=0, padx=5, pady=5, sticky="w")
        
        self.scene_menu = ctk.CTkOptionMenu(
            scene_frame, 
            variable=self.selected_scene, 
            values=["选择场景"], 
            state="disabled", 
            width=120
        )
        self.scene_menu.grid(row=0, column=1, padx=5, pady=5, sticky="ew")
        
        # 渲染质量
        quality_label = ctk.CTkLabel(scene_frame, text="渲染质量:", anchor="w")
        quality_label.grid(row=0, column=2, padx=5, pady=5, sticky="w")
        
        quality_options = {
            "低质量 (-ql)": "-ql", "中等质量 (-qm)": "-qm", "高质量 (-qh)": "-qh",
            "产品级 (-qp)": "-qp", "4K (-qk)": "-qk"
        }
        
        self.quality_menu = ctk.CTkOptionMenu(
            scene_frame, 
            variable=self.selected_quality,
            values=list(quality_options.keys()), 
            width=120
        )
        self.quality_menu.grid(row=0, column=3, padx=5, pady=5, sticky="ew")
        self.quality_map = quality_options

        # 输出格式
        format_options = {
            "MP4 (视频)": "mp4", "GIF (动图)": "gif", "PNG (最后一帧)": "png_last",
        }
        
        format_label = ctk.CTkLabel(scene_frame, text="输出格式:", anchor="w")
        format_label.grid(row=0, column=4, padx=5, pady=5, sticky="w")
        
        self.format_menu = ctk.CTkOptionMenu(
            scene_frame, 
            variable=self.selected_format,
            values=list(format_options.keys()), 
            width=120
        )
        self.format_menu.grid(row=0, column=5, padx=5, pady=5, sticky="ew")
        self.format_map = format_options
        
        current_row += 1

        # 5. 渲染前后操作选项放在同一行
        # 创建新的内嵌框架用于放置3个控件
        render_options_frame = ctk.CTkFrame(config_frame)
        render_options_frame.grid(row=current_row, column=0, columnspan=3, padx=5, pady=5, sticky="ew")
        render_options_frame.grid_columnconfigure(0, weight=0, minsize=100)  # 透明背景复选框
        render_options_frame.grid_columnconfigure(1, weight=0, minsize=100)  # 渲染后标签
        render_options_frame.grid_columnconfigure(2, weight=1, minsize=120)  # 渲染后下拉框
        render_options_frame.grid_columnconfigure(3, weight=0, minsize=120)  # 开始渲染按钮
        
        # 透明背景复选框 - 移除标签
        self.transparent_checkbox = ctk.CTkCheckBox(
            render_options_frame, 
            text="透明背景 (-t)", 
            variable=self.transparent_bg
        )
        self.transparent_checkbox.grid(row=0, column=0, padx=5, pady=5, sticky="w")

        # 渲染后操作
        preview_label = ctk.CTkLabel(render_options_frame, text="渲染后:", anchor="w")
        preview_label.grid(row=0, column=1, padx=5, pady=5, sticky="w")
        
        preview_options = {
            "无操作": "none", "播放视频/图片 (-p)": "-p", "打开文件夹 (-f)": "-f"
        }
        
        self.preview_menu = ctk.CTkOptionMenu(
            render_options_frame, 
            variable=self.preview_action,
            values=list(preview_options.keys()), 
            width=120
        )
        self.preview_menu.grid(row=0, column=2, padx=5, pady=5, sticky="ew")
        self.preview_map = preview_options

        # 渲染按钮
        self.render_button = ctk.CTkButton(
            render_options_frame, 
            text="开始渲染", 
            command=self._start_render, 
            state="disabled", 
            width=120
        )
        self.render_button.grid(row=0, column=3, padx=5, pady=5, sticky="ew")

        current_row += 1

        # --- 日志输出区域 --- # 使用 CTkTextbox 显示 Manim 输出日志
        log_frame = ctk.CTkFrame(self)
        log_frame.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="nsew")
        log_frame.grid_rowconfigure(0, weight=1) # 使 Textbox 在框架内可伸缩
        log_frame.grid_columnconfigure(0, weight=1)
        self.log_textbox = ctk.CTkTextbox(log_frame, state="disabled", wrap="word", font=("Consolas", 10)) # 初始禁用，使用等宽字体
        self.log_textbox.grid(row=0, column=0, padx=5, pady=5, sticky="nsew")
        self._create_log_context_menu() # 为日志框创建右键菜单

    def _initialize_paths(self):
        """初始化 Python 解释器路径，优先检测并使用 .venv 虚拟环境。"""
        # preferred_python = sys.executable  # 不再首先依赖 sys.executable
        preferred_python = None # 先设为 None
        venv_found = False

        cwd = os.getcwd()
        script_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(script_dir)

        # 定义要检查虚拟环境的目录列表 (按优先级)
        dirs_to_check = [
            cwd,
            script_dir,
            parent_dir,
        ]

        # 检查各目录下的 .venv
        for check_dir in dict.fromkeys(dirs_to_check): # 使用 dict 去重并保持顺序
            # 根据操作系统构建可能的 venv python 路径
                if sys.platform == "win32":
                    potential_python = os.path.join(check_dir, ".venv", "Scripts", "python.exe")
                else:
                    potential_python = os.path.join(check_dir, ".venv", "bin", "python")

                if os.path.isfile(potential_python):
                    preferred_python = potential_python
                    venv_found = True
                    print(f"检测到并优先使用虚拟环境: {preferred_python}")
                    break # 找到第一个有效的虚拟环境后即停止搜索
            # else:
                # print(f"在目录 {check_dir} 未找到 .venv 或其中的 python")

        # 如果循环结束后没有找到 venv，则回退到 sys.executable
        if not venv_found:
            preferred_python = sys.executable
            print(f"未在优先目录找到 .venv，使用当前解释器: {preferred_python}")

        # 确保 preferred_python 不为 None (理论上 sys.executable 总应该有值)
        if preferred_python is None:
            messagebox.showerror("错误", "无法确定有效的 Python 解释器路径！")
            # 可以考虑退出或设置一个无效值
            self.python_path.set("ERROR_NO_PYTHON_FOUND")
        else:
             self.python_path.set(preferred_python) # 设置初始 Python 路径状态变量

        # 可以在此处设置默认输出目录，例如：
        # default_output = os.path.join(cwd, "media_gui_output")
        # self.output_dir.set(default_output)

    def _scan_python_interpreters(self):
        """扫描常见的 Python 解释器位置并更新下拉菜单。"""
        self._update_output_log("开始扫描 Python 解释器...\n")
        found_interpreters_by_lower_path = {} # 修改：存储 {小写规范路径: (原始规范路径, 显示名称)}

        # 辅助函数：检查路径有效性，获取版本，生成显示名，并添加到字典
        def add_python(path, name_prefix):
            if not path: return # 处理空路径
            try:
                norm_path = os.path.normpath(path)
            except TypeError:
                self._update_output_log(f"  跳过无效路径类型: {path}\n")
                return

            lower_norm_path = norm_path.lower() # 用于去重检查的键

            # 使用小写路径检查是否已存在
            if lower_norm_path not in found_interpreters_by_lower_path and os.path.exists(norm_path) and os.path.isfile(norm_path):
                # 尝试获取版本信息
                version_str = "Unknown Version"
                # 判断是否为虚拟环境 (基于前缀或路径)
                is_venv = "venv" in name_prefix.lower() or ".venv" in norm_path.lower()
                try:
                    # 执行 "python --version" 获取版本，设置超时防止卡死
                    result = subprocess.run(
                        [norm_path, "--version"],
                        capture_output=True, text=True, check=True, timeout=2, encoding='utf-8', errors='ignore' # 添加编码和错误处理
                    )
                    output = result.stdout.strip() or result.stderr.strip()
                    match = re.search(r"Python\s+(\d+\.\d+\.\d+)", output)
                    if match:
                        version_str = f"Python {match.group(1)}"
                    elif output:
                        version_str = output.split()[0] if output.split() else "Unknown"
                except FileNotFoundError:
                    version_str = "(无法执行)"
                except subprocess.TimeoutExpired:
                    version_str = "(超时)"
                except subprocess.CalledProcessError:
                    version_str = "(执行出错)"
                except Exception as e:
                    version_str = "(获取版本出错)"
                    # self._update_output_log(f"获取 {norm_path} 版本时出错: {e}\n") # 调试时可取消注释

                venv_prefix = "(.venv) " if is_venv else ""
                display_name = f"{venv_prefix}{version_str}"

                # 处理潜在的显示名称冲突 (例如多个相同版本的解释器)
                final_display_name = display_name
                count = 1
                while final_display_name in self.python_interpreters:
                     parent_dir_short = os.path.basename(os.path.dirname(norm_path))
                     # 添加路径的父目录名作为区分
                     final_display_name = f"{display_name} [...{parent_dir_short}]"
                     # 如果仍然冲突，添加数字后缀
                     if final_display_name in self.python_interpreters:
                         final_display_name = f"{display_name} [...{parent_dir_short}] {count}"
                     count += 1

                # 存储信息：键是小写路径，值是(原始路径, 显示名)
                found_interpreters_by_lower_path[lower_norm_path] = (norm_path, final_display_name)
                # self.python_interpreters[final_display_name] = norm_path # 不再直接填充这里
                # self._update_output_log(f"  找到: {final_display_name} -> {norm_path}\n") # 调试时可取消注释
            # else:
                # print(f"跳过重复或无效路径: {norm_path}") # 调试信息

        # --- 开始扫描 --- #
        self._update_output_log("  正在扫描当前环境、虚拟环境...")
        # 1. 当前环境
        add_python(sys.executable, "current_env") # 标识符用于判断 venv

        # 2. 虚拟环境检查 (当前/脚本/父目录)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(script_dir)
        dirs_to_check = list(dict.fromkeys([p for p in [os.getcwd(), script_dir, parent_dir] if p and os.path.isdir(p)]))
        venv_exec = "python.exe" if sys.platform == "win32" else "python"
        venv_path_pattern = os.path.join(".venv", "Scripts" if sys.platform == "win32" else "bin", venv_exec)
        for check_dir in dirs_to_check:
            venv_path = os.path.join(check_dir, venv_path_pattern)
            add_python(venv_path, f"venv_{os.path.basename(check_dir)}") # 传递 venv 标识

        # 3. C 盘 Python 目录扫描 (仅 Windows)
        if sys.platform == "win32":
            self._update_output_log("  正在扫描 C:/Python* ...")
            try:
                for item in os.listdir("C:/"):
                    c_path = os.path.join("C:/", item)
                    if os.path.isdir(c_path) and item.lower().startswith("python"):
                        potential_python = os.path.join(c_path, "python.exe")
                        add_python(potential_python, item) # 非 venv
            except Exception as e:
                self._update_output_log(f"扫描 C:/ 时出错: {e}\n")

        # 4. 系统 PATH 查找
        self._update_output_log("  正在扫描系统 PATH ...")
        for cmd in ["python", "python3"]:
            path_python = shutil.which(cmd)
            if path_python:
                add_python(path_python, f"path_{cmd}") # 非 venv

        # --- 更新 UI --- #
        self._update_output_log("Python 扫描完成，正在更新下拉菜单...\n")
        # 从扫描结果中提取显示名称列表
        display_names = [data[1] for data in found_interpreters_by_lower_path.values()]
        # 构建最终的 self.python_interpreters (显示名 -> 原始路径)
        self.python_interpreters = {display_name: orig_path for orig_path, display_name in found_interpreters_by_lower_path.values()}

        # --- 自定义排序逻辑 --- #
        display_names = list(self.python_interpreters.keys())
        venv_names = sorted([name for name in display_names if name.startswith("(.venv)")])
        other_names = [name for name in display_names if not name.startswith("(.venv)")]

        def get_version_key(name):
            # 尝试从 "Python 3.10.1" 或类似字符串中提取版本号
            match = re.search(r"(\d+\.\d+\.\d+)", name)
            if match:
                try:
                    # 使用 packaging.version 进行健壮解析和比较
                    return version.parse(match.group(1))
                except version.InvalidVersion:
                    return version.parse("0.0.0") # 解析失败，排在最后
            return version.parse("0.0.0") # 没有找到版本号，排在最后

        # 按版本号降序排序其他解释器
        other_names_sorted = sorted(other_names, key=get_version_key, reverse=True)

        # 合并列表：虚拟环境优先，然后按版本降序
        final_sorted_names = venv_names + other_names_sorted

        # 基于排序后的结果构建菜单选项列表
        menu_options = [self.BROWSE_PYTHON_OPTION] + final_sorted_names
        self.python_menu.configure(values=menu_options)

        # 填充实例变量以供浏览方法使用
        self.python_lower_path_map = {lower_path: data[1] for lower_path, data in found_interpreters_by_lower_path.items()}

        # 根据初始化时找到的 python_path 设置下拉菜单的默认选中项
        initial_python_path = self.python_path.get()
        initial_display_name = None
        if initial_python_path:
            # norm_initial_path = os.path.normpath(initial_python_path)
            lower_initial_path = os.path.normpath(initial_python_path).lower()
            # if norm_initial_path in unique_paths: # 旧查找方式
            #      initial_display_name = unique_paths[norm_initial_path]
            if lower_initial_path in self.python_lower_path_map:
                 initial_display_name = self.python_lower_path_map[lower_initial_path]
            # else: # 旧查找方式
            #     for name, path in self.python_interpreters.items():
            #         if os.path.normpath(path) == norm_initial_path:
            #             initial_display_name = name
            #             break

        if initial_display_name:
            self.python_menu.set(initial_display_name)
            self._update_output_log(f"默认选中 Python: {initial_display_name}\n")
        else:
            self.python_menu.set(self.BROWSE_PYTHON_OPTION)
            if initial_python_path:
                # 如果初始路径有效但未在扫描列表中找到，则保留路径但下拉框显示浏览
                self._update_output_log(f"初始 Python 路径 '{initial_python_path}' 未在扫描列表中找到，请手动选择或浏览。\n")
            else:
                self._update_output_log("未找到合适的默认 Python 解释器，请手动选择或浏览。\n")
        self._update_output_log("Python 解释器扫描完成。\n")

    def _scan_parent_directory_scripts(self):
        """扫描 main.py 父目录中的 .py 文件并更新脚本下拉菜单。
        如果只找到一个有效脚本，则自动选中它。
        """
        try:
            script_dir = os.path.dirname(os.path.abspath(__file__))
            parent_dir = os.path.dirname(script_dir)
            self._update_output_log(f"正在扫描父目录 {parent_dir} 中的 Python 脚本...\\n")

            py_files = glob.glob(os.path.join(parent_dir, "*.py"))
            self.parent_dir_scripts = {} # 清空旧列表

            found_scripts = []
            valid_script_paths = {}
            if py_files:
                for file_path in py_files:
                    file_name = os.path.basename(file_path)
                    # 排除常见的非场景脚本文件
                    if file_name == "__init__.py" or file_name == os.path.basename(__file__):
                         continue
                    # 进一步排除可能的配置文件或其他非Manim场景脚本
                    # (可以根据需要添加更多排除规则)
                    # if file_name.endswith("_config.py"):
                    #     continue
                    self.parent_dir_scripts[file_name] = file_path
                    found_scripts.append(file_name)
                    valid_script_paths[file_name] = file_path # 存储有效脚本

            # 更新脚本下拉菜单的选项 (确保是升序排序)
            sorted_script_names = sorted(list(self.parent_dir_scripts.keys()))
            script_menu_options = [self.BROWSE_FILES_OPTION] + sorted_script_names
            self.parent_script_menu.configure(values=script_menu_options)
            self._update_output_log(f"在父目录找到脚本: {', '.join(sorted_script_names)}\\n")

            # --- 自动选择逻辑 --- #
            if len(valid_script_paths) == 1:
                # 如果只找到一个有效脚本，自动选中它
                auto_selected_name = list(valid_script_paths.keys())[0]
                auto_selected_path = valid_script_paths[auto_selected_name]
                
                self.script_path.set(auto_selected_path)
                self.parent_script_menu.set(auto_selected_name)
                self._update_output_log(f"自动选中脚本: {auto_selected_name}\\n")
                self._load_scenes() # 加载场景
                # 立即更新默认输出目录显示
                self._update_default_output_display(auto_selected_path) 
            elif not self.script_path.get():
                # 如果有多个脚本或没有脚本，且当前未选择脚本，则默认显示浏览选项
                self.parent_script_menu.set(self.BROWSE_FILES_OPTION)
                # 确保输出目录显示占位符 (如果需要)
                self._update_default_output_display(None)
            # 如果 self.script_path 已经有值（例如从上次会话加载），则保留
            
        except Exception as e:
            self._update_output_log(f"扫描父目录脚本时出错: {e}\\n")
            messagebox.showerror("扫描错误", f"扫描父目录脚本时出错: {e}")

    def _on_parent_script_selected(self, selected_name):
        """处理脚本下拉菜单的选择事件。"""
        if selected_name == self.BROWSE_FILES_OPTION:
            self._browse_file() # 用户选择浏览
        elif selected_name in self.parent_dir_scripts:
            # 用户选择了父目录中的脚本
            script_path = self.parent_dir_scripts.get(selected_name)
            if script_path and os.path.exists(script_path):
                self.script_path.set(script_path)
                self._load_scenes() # 加载场景
                # 更新默认输出目录的显示（如果当前是默认选项）
                self._update_default_output_display(script_path) 
                # 确保渲染按钮状态正确
                if self.selected_scene.get() not in ["选择场景", "未找到场景"]:
                    self.render_button.configure(state="normal")
                else:
                    self.render_button.configure(state="disabled")
            else:
                messagebox.showerror("错误", f"选择的脚本文件无效或不存在: {script_path}")
                self.script_path.set("")
                self._load_scenes() # 清空场景
                # 清空脚本后也要更新（显示占位符）
                self._update_default_output_display(None) 
                self.render_button.configure(state="disabled")
            
    def _browse_file(self):
        """打开文件对话框让用户选择Manim脚本文件。"""
        initial_dir_script = os.path.dirname(self.script_path.get()) if self.script_path.get() else None
        script_path = filedialog.askopenfilename(
            title="选择Manim脚本文件",
            filetypes=[("Python Files", "*.py"), ("All Files", "*.*")],
            initialdir=initial_dir_script
        )
        if script_path:
            self.script_path.set(script_path)
            self._load_scenes()
            # 更新默认输出目录的显示（如果当前是默认选项）
            self._update_default_output_display(script_path)

    def _on_python_selected(self, selected_name):
        """处理 Python 解释器下拉菜单的选择事件。"""
        if selected_name == self.BROWSE_PYTHON_OPTION:
            self._browse_python_executable() # 用户选择浏览
        elif selected_name in self.python_interpreters:
            # 用户选择了扫描到的解释器
            new_path = self.python_interpreters[selected_name]
            self.python_path.set(new_path)
            print(f"[Info] Python 解释器已选择: {new_path}") # 添加输出
            self._toggle_controls(enabled=True) # 更新渲染按钮状态
        else:
            # 理论上不应发生此情况
            self.python_path.set("")
            messagebox.showwarning("选择错误", "选择的 Python 解释器无效。")
            self._toggle_controls(enabled=True)

    def _browse_python_executable(self):
        """打开文件对话框让用户手动选择 Python 可执行文件。"""
        # 根据操作系统确定文件类型过滤器
        if sys.platform == "win32":
            filetypes = [("Python Executable", "*.exe"), ("All Files", "*.*")]
        else:
            filetypes = [("Python Executable", "python*"), ("All Files", "*.*")]

        # 初始目录可以是当前 Python 路径的目录，或者系统 PATH 中的位置
        initial_dir = os.path.dirname(self.python_path.get()) if self.python_path.get() else None

        file_path = filedialog.askopenfilename(
            title="选择 Python 解释器",
            filetypes=filetypes,
            initialdir=initial_dir
        )
        if file_path:
            self.python_path.set(file_path)
            # 当通过浏览选择后，更新下拉菜单显示对应的名称（如果存在）或浏览选项
            selected_path_norm = os.path.normpath(file_path)
            display_name_found = None
            # 使用实例变量查找
            lower_selected_path = selected_path_norm.lower()
            if lower_selected_path in self.python_lower_path_map:
                display_name_found = self.python_lower_path_map[lower_selected_path]
            # else: # 旧查找方式
            #     for name, path in self.python_interpreters.items():
            #         if os.path.normpath(path) == selected_path_norm:
            #             display_name_found = name
            #             break
            if display_name_found:
                self.python_menu.set(display_name_found)
            else:
                # 如果浏览的文件不在预扫描列表，则显示浏览选项，但路径已设置
                self.python_menu.set(self.BROWSE_PYTHON_OPTION)
            self._update_output_log(f"已通过浏览选择 Python: {file_path}\n")
            print(f"[Info] Python 解释器已通过浏览选择: {file_path}") # 添加输出
            # 更新渲染按钮状态检查
            self._toggle_controls(enabled=True) # 触发状态检查

    def _on_output_dir_selected(self, selected_option):
        """处理输出目录下拉菜单的选择事件。"""
        if selected_option == self.BROWSE_OUTPUT_OPTION:
            self._browse_output_dir()
        elif selected_option == self.USE_DEFAULT_MEDIA:
            # 当用户显式选择默认时，调用辅助函数更新显示
            self._update_default_output_display(self.script_path.get())
            # 移除这里的日志，因为辅助函数会记录
            # self._update_output_log("输出目录设置为: [默认] media (脚本同级)\\n") 
        # 可以扩展以处理其他预设或历史路径

    def _browse_output_dir(self):
        """打开目录选择对话框让用户选择输出目录。"""
        initial_dir = self.output_dir.get() if self.output_dir.get() and self.output_dir.get() != "[脚本同级media目录]" else "."
        dir_path = filedialog.askdirectory(
            title="选择 Manim 输出目录",
            initialdir=initial_dir
        )
        if dir_path:
            # 用户浏览选择了目录，更新显示和内部路径
            self.output_dir.set(dir_path)
            self._internal_output_dir = dir_path  # 更新内部路径
            self.output_dir_menu.set(self.BROWSE_OUTPUT_OPTION) # 设置下拉框为浏览，表示自定义路径
            self._update_output_log(f"输出目录已通过浏览选择: {dir_path}\\n")

    def _create_log_context_menu(self):
        """为日志文本框创建右键上下文菜单（复制、清空）。"""
        self.log_context_menu = tk.Menu(self.log_textbox, tearoff=0)
        self.log_context_menu.add_command(label="复制全部", command=self._copy_log_to_clipboard)
        self.log_context_menu.add_separator()
        self.log_context_menu.add_command(label="清空日志", command=self._clear_log)
        self.log_textbox.bind("<Button-3>", self._show_log_context_menu)
        self.log_textbox.bind("<Button-2>", self._show_log_context_menu)

    def _show_log_context_menu(self, event):
        """在鼠标右键点击位置显示日志上下文菜单。"""
        self.log_context_menu.tk_popup(event.x_root, event.y_root)

    def _copy_log_to_clipboard(self):
        """复制日志文本框的全部内容到系统剪贴板。"""
        try:
            self.log_textbox.configure(state="normal") # 启用以便复制
            log_content = self.log_textbox.get("1.0", "end-1c") # 获取所有文本
            self.log_textbox.configure(state="disabled") # 复制后禁用
            if log_content:
                self.clipboard_clear()
                self.clipboard_append(log_content)
                self._update_output_log("\n--- 日志已复制到剪贴板 ---\n")
        except Exception as e:
            messagebox.showerror("复制错误", f"无法复制日志: {e}")

    def _clear_log(self):
        """清空日志文本框的内容。"""
        try:
            self.log_textbox.configure(state="normal") # 启用以便删除
            self.log_textbox.delete("1.0", "end")
            self.log_textbox.configure(state="disabled") # 删除后禁用
        except Exception as e:
            messagebox.showerror("清空错误", f"无法清空日志: {e}")

    def _load_scenes(self):
        """解析选定的 Manim 脚本文件，提取场景名称并更新场景下拉菜单。"""
        script = self.script_path.get()
        if not script or not os.path.exists(script):
            self.scene_menu.configure(values=["选择场景"], state="disabled")
            self.selected_scene.set("选择场景")
            self.render_button.configure(state="disabled")
            if script: # 如果路径存在但文件不存在
                messagebox.showerror("脚本错误", f"选择的脚本文件不存在: {script}")
            return

        self._clear_log()
        self._update_output_log(f"正在解析脚本: {os.path.basename(script)} ...\n")

        scenes = get_scene_names(script)
        if scenes:
            options = ["全部场景 (-a)"] + scenes
            self.scene_menu.configure(values=options, state="normal")
            if len(scenes) == 1:
                self.selected_scene.set(scenes[0])
            else:
                self.selected_scene.set("全部场景 (-a)")
            self._update_output_log(f"找到场景: {', '.join(scenes)}\n")
            self.render_button.configure(state="normal")
        else:
            self.scene_menu.configure(values=["未找到场景"], state="disabled")
            self.selected_scene.set("未找到场景")
            self.render_button.configure(state="disabled")
            warning_message = f"在 {os.path.basename(script)} 中未找到有效的 Manim Scene 类。\n请确保类直接继承自 'Scene' 或 'manim.Scene'。"
            self._update_output_log(f"警告: {warning_message}\n")
            messagebox.showwarning("场景解析", warning_message)

    def _update_output_log(self, line):
        """安全地将一行文本追加到日志文本框末尾。"""
        def append_text(): # 在主线程中执行 UI 更新
            try:
                if not self.winfo_exists(): return # 防止窗口关闭后访问
                self.log_textbox.configure(state="normal")
                self.log_textbox.insert("end", line)
                self.log_textbox.configure(state="disabled")
                self.log_textbox.see("end")
            except tk.TclError as e:
                print(f"更新日志时捕获到 Tkinter 错误: {e}")
            except Exception as e:
                print(f"更新日志时发生未知错误: {e}")
        if self.winfo_exists():
            self.after(0, append_text)

    def _update_default_output_display(self, script_path):
        """
        根据脚本路径更新默认输出目录的显示文本，并设置内部路径。
        仅当下拉菜单选中默认选项时才更新。
        """
        if self.output_dir_menu.get() == self.USE_DEFAULT_MEDIA:
            if script_path and os.path.exists(script_path):
                try:
                    script_dir = os.path.dirname(os.path.abspath(script_path))
                    media_path = os.path.join(script_dir, "media")
                    # 更新显示路径
                    self.output_dir.set(media_path) 
                    # 同时更新内部路径，确保命令使用此路径
                    self._internal_output_dir = media_path 
                    self._update_output_log(f"默认输出目录已设置为: {media_path}\\n")
                except Exception as e:
                    print(f"计算默认 media 路径时出错: {e}")
                    self.output_dir.set("[计算路径出错]")
                    # 出错时，内部路径也清空，避免使用错误路径
                    self._internal_output_dir = "" 
            else:
                # 没有有效脚本，显示占位符，内部路径也清空
                self.output_dir.set("[脚本同级media目录]")
                self._internal_output_dir = "" 
            # 不再需要下面这行，因为内部路径已在上面设置
            # self._internal_output_dir = ""

    def _start_render(self):
        """启动 Manim 渲染过程。"""
        if self.is_rendering:
            messagebox.showwarning("渲染进行中", "请等待当前渲染任务完成。")
            return

        # --- 获取用户选择 --- #
        script = self.script_path.get()
        selected_py_path = self.python_path.get()
        # 渲染时仍然使用内部变量 _internal_output_dir
        output_path = self._internal_output_dir 
        scene = self.selected_scene.get()
        quality_key = self.selected_quality.get()
        format_key = self.selected_format.get()
        preview_key = self.preview_action.get()
        transparent = self.transparent_bg.get()

        # --- 输入验证 ---
        if not script or not os.path.exists(script):
            messagebox.showerror("错误", "请先选择一个有效的 Manim 脚本文件。")
            return
        if not selected_py_path: # 检查 Python 路径是否为空
            messagebox.showerror("错误", "请指定 Python 解释器路径。")
            return
        if not os.path.exists(selected_py_path) and not shutil.which(selected_py_path): # 检查路径是否存在或是否在 PATH 中
            messagebox.showerror("错误", f"指定的 Python 解释器路径无效或找不到: {selected_py_path}")
            return
        if scene == "选择场景" or scene == "未找到场景":
            messagebox.showerror("错误", "请选择要渲染的场景。")
            return
        # (可选) 检查输出目录是否存在，如果不存在可以尝试创建或提示
        if output_path and not os.path.isdir(output_path):
            try:
                os.makedirs(output_path, exist_ok=True)
                self._update_output_log(f"创建输出目录: {output_path}\n")
            except OSError as e:
                messagebox.showerror("错误", f"无法创建输出目录: {output_path}\n错误: {e}")
                return

        # --- 清空日志 ---
        self._clear_log()
        self._update_output_log("--- 开始构建 Manim 命令 ---\n")

        # --- 构建 Manim 命令行参数列表 --- #
        command = [selected_py_path, "-m", "manim"]
        self._update_output_log(f"使用 Python: {selected_py_path}\\n")

        # --media_dir 
        # 现在 output_path (来自 _internal_output_dir) 
        # 在选择"默认"且脚本有效时，会包含计算出的路径
        # 在选择"浏览"时，会包含浏览的路径
        # 在选择"默认"但脚本无效时，为空字符串
        if output_path:
            command.extend(["--media_dir", output_path])
            # 日志仍然显示内部使用的路径
            self._update_output_log(f"输出到目录: {output_path}\\n") 
        else:
            # 只有在选择"默认"但脚本无效时才会进入此分支
            display_path = self.output_dir.get() 
            self._update_output_log(f"输出到目录: {display_path} (Manim将使用其默认行为)\\n")

        # 质量标志 (-ql, -qm, -qh, ...)
        quality_flag = self.quality_map.get(quality_key, "-qh") # 默认高质量
        command.append(quality_flag)

        # 预览标志 (-p, -f, 或无)
        preview_flag = self.preview_map.get(preview_key)

        # 输出格式 (--format gif) 和透明度 (-t) 相关标志
        selected_format_value = self.format_map.get(format_key)
        # output_suffix = ".mp4" # 不再需要，manim 会自动处理

        if selected_format_value == "gif":
            command.extend(["--format", "gif"]) # 指定 GIF 格式
            # GIF 不支持预览播放 (-p)，改为打开文件夹 (-f)
            if preview_flag == "-p": preview_flag = "-f"
            # GIF 支持透明度
            if transparent and "-t" not in command: command.append("-t")
        elif selected_format_value == "png_last":
            command.append("-s") # 保存最后一帧为 PNG
            # PNG 不支持预览播放 (-p)，改为打开文件夹 (-f)
            if preview_flag == "-p": preview_flag = "-f"
            # PNG 支持透明度
            if transparent and "-t" not in command: command.append("-t")
        elif transparent: # 如果是 MP4 但需要透明，manim 会输出 .mov
            command.append("-t")
            # MOV 通常无法直接播放，改为打开文件夹
            if preview_flag == "-p": preview_flag = "-f"

        # 添加最终确定的预览标志
        if preview_flag and preview_flag != "none":
            command.append(preview_flag)

        # Manim 脚本文件路径
        command.append(script)

        # 场景名称 (如果不是渲染全部场景)
        if scene != "全部场景 (-a)":
            command.append(scene)

        # --- 执行渲染命令 --- #
        command_str = subprocess.list2cmdline(command) # 生成可读的命令字符串
        self._update_output_log(f"执行命令:\n{command_str}\n\n") # 显示将要执行的命令
        self.is_rendering = True
        self.render_button.configure(text="渲染中...", state="disabled")
        self._toggle_controls(enabled=False)

        def on_render_complete():
            self.is_rendering = False
            self.render_button.configure(text="开始渲染") # 状态由 _toggle_controls 控制
            self._toggle_controls(enabled=True)
            self._update_output_log("\n--- 渲染完成 ---\n")

        def output_callback_wrapper(line):
            self._update_output_log(line)
            if "--- 渲染进程结束" in line:
                if self.winfo_exists():
                    self.after(100, on_render_complete)

        run_manim_command(command, output_callback_wrapper)

    def _toggle_controls(self, enabled: bool):
        """根据渲染状态启用或禁用 GUI 中的控件。"""
        state = "normal" if enabled else "disabled"
        # 需要根据状态切换的控件列表
        widgets_to_toggle = [
            self.file_entry,
            self.python_display_entry,
            self.python_menu,
            self.output_dir_entry,
            self.output_dir_menu,
            self.scene_menu,
            self.quality_menu,
            self.format_menu,
            self.transparent_checkbox,
            self.preview_menu,
            self.render_button
        ]

        for widget in widgets_to_toggle:
            # 特殊处理场景菜单和渲染按钮的启用条件
            if widget == self.scene_menu:
                # 只有在脚本有效且解析到场景时才启用
                script_valid = self.script_path.get() and os.path.exists(self.script_path.get())
                scenes_found = self.selected_scene.get() not in ["选择场景", "未找到场景"]
                widget.configure(state="normal" if enabled and script_valid and scenes_found else "disabled")
            elif widget == self.render_button:
                # 只有在脚本、Python路径、场景都有效时才启用
                script_valid = self.script_path.get() and os.path.exists(self.script_path.get())
                python_valid = self.python_path.get() and (os.path.exists(self.python_path.get()) or shutil.which(self.python_path.get()))
                scene_valid = self.selected_scene.get() not in ["选择场景", "未找到场景"]
                widget.configure(state="normal" if enabled and script_valid and python_valid and scene_valid else "disabled")
            else:
                # 对于其他所有控件（包括下拉菜单和只读输入框），直接设置状态
                widget.configure(state=state)


if __name__ == "__main__":
    # 设置外观模式和颜色主题
    ctk.set_appearance_mode("Dark")
    ctk.set_default_color_theme("blue")
    # 创建并运行应用实例
    app = ManimGUI()
    app.mainloop()