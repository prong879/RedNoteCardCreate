# main.py - Manim GUI 应用主入口

import customtkinter as ctk
import tkinter as tk
from tkinter import filedialog, messagebox
import subprocess
import threading
import os
import sys
import shutil # 用于查找 python 解释器

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
        # 设置窗口最小尺寸，防止元素挤压
        self.minsize(700, 600) # 稍微加宽以容纳新控件
        # 初始大小
        self.geometry("850x650") # 增加初始大小

        # --- 状态变量 ---
        self.script_path = ctk.StringVar()
        self.selected_scene = ctk.StringVar(value="选择场景")
        self.selected_quality = ctk.StringVar(value="高质量 (-qh)") # 默认高质量
        self.selected_format = ctk.StringVar(value="MP4 (视频)")   # 默认 MP4
        self.transparent_bg = ctk.BooleanVar(value=False)
        self.preview_action = ctk.StringVar(value="播放视频/图片 (-p)") # 默认播放
        self.python_path = ctk.StringVar() # 新增：Python 解释器路径
        self.output_dir = ctk.StringVar()  # 新增：输出目录路径
        self.is_rendering = False

        # --- UI 布局 ---
        # 使主窗口的列0（包含所有控件）和行1（包含日志框架）可伸缩
        self.grid_columnconfigure(0, weight=1)
        self.grid_rowconfigure(1, weight=1) # 让日志区域可扩展

        self._create_widgets()
        self._initialize_paths() # 初始化路径

    def _create_widgets(self):
        # --- 配置区域 ---
        config_frame = ctk.CTkFrame(self)
        config_frame.grid(row=0, column=0, padx=10, pady=10, sticky="ew")
        # 让配置框架内的第1列（包含输入框和下拉菜单）可伸缩
        config_frame.grid_columnconfigure(1, weight=1)

        # --- 定义行号 ---
        current_row = 0

        # 1. 文件选择
        file_label = ctk.CTkLabel(config_frame, text="Manim 脚本:")
        file_label.grid(row=current_row, column=0, padx=5, pady=5, sticky="w")
        self.file_entry = ctk.CTkEntry(config_frame, textvariable=self.script_path, state="readonly")
        self.file_entry.grid(row=current_row, column=1, padx=5, pady=5, sticky="ew")
        browse_script_button = ctk.CTkButton(config_frame, text="浏览...", command=self._browse_file, width=80)
        browse_script_button.grid(row=current_row, column=2, padx=5, pady=5)
        current_row += 1

        # 2. Python 解释器选择 (新增)
        python_label = ctk.CTkLabel(config_frame, text="Python 解释器:")
        python_label.grid(row=current_row, column=0, padx=5, pady=5, sticky="w")
        self.python_entry = ctk.CTkEntry(config_frame, textvariable=self.python_path) # 允许编辑
        self.python_entry.grid(row=current_row, column=1, padx=5, pady=5, sticky="ew")
        browse_python_button = ctk.CTkButton(config_frame, text="浏览...", command=self._browse_python_executable, width=80)
        browse_python_button.grid(row=current_row, column=2, padx=5, pady=5)
        current_row += 1

        # 3. 输出目录选择 (新增)
        output_dir_label = ctk.CTkLabel(config_frame, text="输出目录:")
        output_dir_label.grid(row=current_row, column=0, padx=5, pady=5, sticky="w")
        self.output_dir_entry = ctk.CTkEntry(config_frame, textvariable=self.output_dir) # 允许编辑
        self.output_dir_entry.grid(row=current_row, column=1, padx=5, pady=5, sticky="ew")
        browse_output_button = ctk.CTkButton(config_frame, text="浏览...", command=self._browse_output_dir, width=80)
        browse_output_button.grid(row=current_row, column=2, padx=5, pady=5)
        current_row += 1

        # 4. 场景选择
        scene_label = ctk.CTkLabel(config_frame, text="选择场景:")
        scene_label.grid(row=current_row, column=0, padx=5, pady=5, sticky="w")
        self.scene_menu = ctk.CTkOptionMenu(config_frame, variable=self.selected_scene, values=["选择场景"], state="disabled")
        self.scene_menu.grid(row=current_row, column=1, columnspan=2, padx=5, pady=5, sticky="ew")
        current_row += 1

        # 5. 渲染质量
        quality_label = ctk.CTkLabel(config_frame, text="渲染质量:")
        quality_label.grid(row=current_row, column=0, padx=5, pady=5, sticky="w")
        quality_options = {
            "低质量 (-ql)": "-ql", "中等质量 (-qm)": "-qm", "高质量 (-qh)": "-qh",
            "产品级 (-qp)": "-qp", "4K (-qk)": "-qk"
        }
        self.quality_menu = ctk.CTkOptionMenu(config_frame, variable=self.selected_quality,
                                              values=list(quality_options.keys()))
        self.quality_menu.grid(row=current_row, column=1, columnspan=2, padx=5, pady=5, sticky="ew")
        self.quality_map = quality_options
        current_row += 1

        # 6. 输出格式
        format_label = ctk.CTkLabel(config_frame, text="输出格式:")
        format_label.grid(row=current_row, column=0, padx=5, pady=5, sticky="w")
        format_options = {
            "MP4 (视频)": "mp4", "GIF (动图)": "gif", "PNG (最后一帧)": "png_last",
        }
        self.format_menu = ctk.CTkOptionMenu(config_frame, variable=self.selected_format,
                                             values=list(format_options.keys()))
        self.format_menu.grid(row=current_row, column=1, columnspan=2, padx=5, pady=5, sticky="ew")
        self.format_map = format_options
        current_row += 1

        # 7. 其他选项 (透明背景, 预览)
        options_frame = ctk.CTkFrame(config_frame)
        options_frame.grid(row=current_row, column=0, columnspan=3, padx=5, pady=5, sticky="ew")
        self.transparent_checkbox = ctk.CTkCheckBox(options_frame, text="透明背景 (-t)", variable=self.transparent_bg)
        self.transparent_checkbox.pack(side=ctk.LEFT, padx=10, pady=5)
        preview_label = ctk.CTkLabel(options_frame, text="渲染后:")
        preview_label.pack(side=ctk.LEFT, padx=(20, 5), pady=5)
        preview_options = {
            "无操作": "none", "播放视频/图片 (-p)": "-p", "打开文件夹 (-f)": "-f"
        }
        self.preview_menu = ctk.CTkOptionMenu(options_frame, variable=self.preview_action,
                                              values=list(preview_options.keys()), width=180)
        self.preview_menu.pack(side=ctk.LEFT, padx=5, pady=5)
        self.preview_map = preview_options
        current_row += 1

        # 8. 执行按钮
        self.render_button = ctk.CTkButton(config_frame, text="开始渲染", command=self._start_render, state="disabled")
        self.render_button.grid(row=current_row, column=0, columnspan=3, padx=10, pady=(15, 10))


        # --- 日志输出区域 ---
        log_frame = ctk.CTkFrame(self)
        log_frame.grid(row=1, column=0, padx=10, pady=(0, 10), sticky="nsew")
        log_frame.grid_rowconfigure(0, weight=1)
        log_frame.grid_columnconfigure(0, weight=1)
        self.log_textbox = ctk.CTkTextbox(log_frame, state="disabled", wrap="word", font=("Consolas", 10)) # 使用等宽字体
        self.log_textbox.grid(row=0, column=0, padx=5, pady=5, sticky="nsew")
        self._create_log_context_menu()

    def _initialize_paths(self):
        """初始化 Python 路径，优先检测并加载 .venv"""
        preferred_python = sys.executable # 默认使用当前解释器
        cwd = os.getcwd() # 获取当前工作目录 (通常是项目根目录)
        venv_path = os.path.join(cwd, ".venv")

        if os.path.isdir(venv_path):
            if sys.platform == "win32":
                potential_python = os.path.join(venv_path, "Scripts", "python.exe")
            else: # Linux/macOS
                potential_python = os.path.join(venv_path, "bin", "python")

            if os.path.isfile(potential_python):
                preferred_python = potential_python
                print(f"检测到并优先加载虚拟环境: {preferred_python}") # 调试信息
            else:
                print(f"找到 .venv 目录，但在其中未找到预期的 Python 可执行文件: {potential_python}")
        else:
            print(f"在当前工作目录 {cwd} 未找到 .venv 目录，使用默认解释器。")


        self.python_path.set(preferred_python)
        # (可选) 设置默认输出目录逻辑保持不变或移除
        # default_output = os.path.join(cwd, "media_gui_output") # 放在项目根目录
        # self.output_dir.set(default_output)

    def _browse_python_executable(self):
        """打开文件对话框选择 Python 可执行文件"""
        # 根据操作系统确定文件类型
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

    def _browse_output_dir(self):
        """打开目录选择对话框"""
        # 初始目录可以是当前设置的目录，或者工作目录
        initial_dir = self.output_dir.get() if self.output_dir.get() else "."
        dir_path = filedialog.askdirectory(
            title="选择 Manim 输出目录",
            initialdir=initial_dir
        )
        if dir_path:
            self.output_dir.set(dir_path)

    def _create_log_context_menu(self):
        """为日志文本框创建右键菜单"""
        self.log_context_menu = tk.Menu(self.log_textbox, tearoff=0)
        self.log_context_menu.add_command(label="复制全部", command=self._copy_log_to_clipboard)
        self.log_context_menu.add_separator()
        self.log_context_menu.add_command(label="清空日志", command=self._clear_log)
        self.log_textbox.bind("<Button-3>", self._show_log_context_menu)
        self.log_textbox.bind("<Button-2>", self._show_log_context_menu)

    def _show_log_context_menu(self, event):
        """在鼠标点击位置显示右键菜单"""
        self.log_context_menu.tk_popup(event.x_root, event.y_root)

    def _copy_log_to_clipboard(self):
        """复制日志文本框的全部内容到剪贴板"""
        try:
            self.log_textbox.configure(state="normal")
            log_content = self.log_textbox.get("1.0", "end-1c") # 获取所有文本
            self.log_textbox.configure(state="disabled")
            if log_content:
                self.clipboard_clear()
                self.clipboard_append(log_content)
                self._update_output_log("\n--- 日志已复制到剪贴板 ---\n")
        except Exception as e:
            messagebox.showerror("复制错误", f"无法复制日志: {e}")

    def _clear_log(self):
        """清空日志文本框的内容"""
        try:
            self.log_textbox.configure(state="normal")
            self.log_textbox.delete("1.0", "end")
            self.log_textbox.configure(state="disabled")
        except Exception as e:
            messagebox.showerror("清空错误", f"无法清空日志: {e}")

    def _browse_file(self):
        initial_dir = os.path.dirname(self.script_path.get()) if self.script_path.get() else "."
        file_path = filedialog.askopenfilename(
            title="选择 Manim Python 脚本",
            filetypes=[("Python 文件", "*.py")],
            initialdir=initial_dir
        )
        if file_path:
            self.script_path.set(file_path)
            self._load_scenes()
            if self.selected_scene.get() not in ["选择场景", "未找到场景"]:
                self.render_button.configure(state="normal")
            else:
                self.render_button.configure(state="disabled")

    def _load_scenes(self):
        script = self.script_path.get()
        if not script or not os.path.exists(script): # 增加文件存在性检查
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
        def append_text():
            try:
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

    def _start_render(self):
        if self.is_rendering:
            messagebox.showwarning("渲染进行中", "请等待当前渲染任务完成。")
            return

        script = self.script_path.get()
        selected_py_path = self.python_path.get() # 获取选定的 Python 路径
        output_path = self.output_dir.get()     # 获取选定的输出目录
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

        # --- 构建命令 ---
        # 使用选定的 Python 解释器执行 manim 模块
        command = [selected_py_path, "-m", "manim"]
        self._update_output_log(f"使用 Python: {selected_py_path}\n")

        # 输出目录
        if output_path:
            command.extend(["--media_dir", output_path])
            self._update_output_log(f"输出到目录: {output_path}\n")

        # 质量标志
        quality_flag = self.quality_map.get(quality_key, "-qh")
        command.append(quality_flag)

        # 预览标志
        preview_flag = self.preview_map.get(preview_key)

        # 输出格式 和 透明度
        selected_format_value = self.format_map.get(format_key)
        output_suffix = ".mp4"

        if selected_format_value == "gif":
            command.extend(["--format", "gif"])
            output_suffix = ".gif"
            if preview_flag == "-p": preview_flag = "-f"
            if transparent and "-t" not in command: command.append("-t")
        elif selected_format_value == "png_last":
            command.append("-s")
            output_suffix = ".png"
            if preview_flag == "-p": preview_flag = "-f"
            if transparent and "-t" not in command: command.append("-t")
        elif transparent:
            command.append("-t")
            output_suffix = ".mov"
            if preview_flag == "-p": preview_flag = "-f"

        # 添加预览标志
        if preview_flag and preview_flag != "none":
            command.append(preview_flag)

        # 脚本文件路径
        command.append(script)

        # 场景名称
        if scene != "全部场景 (-a)":
            command.append(scene)

        # --- 执行命令 ---
        command_str = subprocess.list2cmdline(command)
        self._update_output_log(f"执行命令: {command_str}\n\n")
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
        state = "normal" if enabled else "disabled"
        # 将所有需要切换状态的控件放入列表
        widgets_to_toggle = [
            self.file_entry,
            self.python_entry,         # 新增
            self.output_dir_entry,     # 新增
            self.scene_menu,
            self.quality_menu,
            self.format_menu,
            self.transparent_checkbox,
            self.preview_menu,
            self.render_button # 将渲染按钮也加入，统一管理状态
        ]
        # 查找浏览按钮
        browse_buttons = []
        try: browse_buttons.append(self.grid_slaves(row=0, column=0)[0].grid_slaves(row=0, column=2)[0]) # Script Browse
        except: pass
        try: browse_buttons.append(self.grid_slaves(row=0, column=0)[0].grid_slaves(row=1, column=2)[0]) # Python Browse
        except: pass
        try: browse_buttons.append(self.grid_slaves(row=0, column=0)[0].grid_slaves(row=2, column=2)[0]) # Output Dir Browse
        except: pass

        for widget in widgets_to_toggle + browse_buttons:
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
                widget.configure(state=state)


if __name__ == "__main__":
    ctk.set_appearance_mode("Dark")
    ctk.set_default_color_theme("blue")
    app = ManimGUI()
    app.mainloop()