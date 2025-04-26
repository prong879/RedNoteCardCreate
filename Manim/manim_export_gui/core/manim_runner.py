# core/manim_runner.py

import subprocess
import threading
import os
import sys

def run_manim_command(command_list, output_callback):
    """在单独的线程中执行 Manim 命令并实时回传输出。

    Args:
        command_list (list[str]): 要执行的命令列表 (例如 ['manim', '-pql', 'scene.py', 'MyScene'])
        output_callback (callable): 一个函数，接收解码后的输出行 (str) 作为参数。
    """
    def target():
        try:
            # 设置 Popen 以便实时读取输出
            # 使用 text=True 让 Popen 处理解码
            # stderr=subprocess.STDOUT 将错误流重定向到标准输出流
            # bufsize=1 设置行缓冲
            # universal_newlines=True 已经被 text=True 替代并弃用
            # 在 Windows 上，可能需要设置 shell=True，但这有安全风险，尽量避免。
            # 如果 manim 命令在 PATH 中，通常不需要 shell=True。
            # 如果遇到问题，可以考虑提供 manim 的完整路径。
            # 添加 startupinfo 来隐藏 Windows 上的控制台窗口
            startupinfo = None
            if sys.platform == "win32":
                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = subprocess.SW_HIDE

            process = subprocess.Popen(
                command_list,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding='utf-8', # 显式指定编码
                errors='replace', # 处理潜在的编码错误
                bufsize=1,
                startupinfo=startupinfo # 隐藏窗口
            )

            # 实时读取输出
            if process.stdout:
                for line in iter(process.stdout.readline, ''):
                    output_callback(line)
                process.stdout.close()

            # 等待进程结束
            return_code = process.wait()
            output_callback(f"\n--- 渲染进程结束，返回代码: {return_code} ---")

        except FileNotFoundError:
            output_callback(f"错误：找不到 'manim' 命令。请确保 Manim 已正确安装并添加到系统 PATH。")
        except Exception as e:
            output_callback(f"执行 Manim 命令时出错: {e}")

    # 在新线程中运行命令，避免阻塞 GUI
    thread = threading.Thread(target=target)
    thread.daemon = True # 允许主程序退出时子线程也退出
    thread.start()

# 示例用法
if __name__ == '__main__':
    def print_output(line):
        print(line, end='') # end='' 避免重复换行

    print("测试运行 Manim (需要安装 Manim 并能从命令行调用):")
    # 注意：这个示例需要一个实际存在的 manim 脚本和场景
    # 这里用 --help 作为示例，因为它不需要脚本文件
    test_command = ['manim', '--help']
    run_manim_command(test_command, print_output)

    # 等待线程（通常在 GUI 应用中不需要手动等待，因为主循环会保持运行）
    # import time
    # time.sleep(5) 