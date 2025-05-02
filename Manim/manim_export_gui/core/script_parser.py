# core/script_parser.py

import re
import ast
import inspect

# 定义所有有效的 Manim 场景基类名称（不含 'manim.' 前缀）
VALID_SCENE_BASE_NAMES = {"Scene", "ThreeDScene", "MovingCameraScene", "ZoomedScene"} 
# 可以根据需要添加更多 Manim 的场景基类

def get_scene_names(file_path):
    """解析 Python 文件以查找继承自 Manim 场景基类的类名。

    Args:
        file_path (str): Python 脚本的路径。

    Returns:
        list[str]: 找到的 Scene 类名列表。
                   如果文件不存在或无法解析，返回空列表。
                   如果解析出错，也返回空列表并打印错误。
    """
    scene_names = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 使用 AST (Abstract Syntax Trees)
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                # 检查是否继承自有效的 Manim 场景基类
                is_manim_scene = False
                for base in node.bases:
                    base_name = None
                    # 情况 1: 直接继承，如 class MyScene(Scene):
                    if isinstance(base, ast.Name):
                        base_name = base.id
                    # 情况 2: 带 manim 前缀，如 class MyScene(manim.Scene):
                    elif isinstance(base, ast.Attribute) and isinstance(base.value, ast.Name) and base.value.id == 'manim':
                        base_name = base.attr
                    
                    # 检查获取到的基类名是否在我们的有效列表中
                    if base_name and base_name in VALID_SCENE_BASE_NAMES:
                        is_manim_scene = True
                        break # 找到一个有效基类即可

                # 确保不是基类本身，并且是我们识别的场景类
                if is_manim_scene and node.name not in VALID_SCENE_BASE_NAMES:
                    scene_names.append(node.name)

    except FileNotFoundError:
        print(f"错误：文件未找到 {file_path}")
        return []
    except Exception as e:
        print(f"解析文件时出错 {file_path}: {e}")
        return []

    return scene_names

# 示例用法
if __name__ == '__main__':
    # 创建一个临时的测试文件
    test_content = """
from manim import Scene, Circle, ThreeDScene, MovingCameraScene
import manim

class MyScene1(Scene):
    pass

class AnotherScene(manim.Scene):
    pass

class My3DScene(ThreeDScene): # 新增测试用例
    pass

class MyMovingScene(manim.MovingCameraScene): # 新增测试用例
    pass

class NotAScene:
    pass

class DerivedFromMyScene(MyScene1):
    pass # 这个不会被直接找到，因为它不直接继承有效的基类

class Scene: # 基类本身应该被忽略
    pass 
class ThreeDScene: # 基类本身应该被忽略
    pass 
"""
    test_file = "_temp_test_scene.py"
    with open(test_file, 'w', encoding='utf-8') as f:
        f.write(test_content)

    scenes = get_scene_names(test_file)
    print(f"找到的场景: {scenes}") # 应该输出 ['MyScene1', 'AnotherScene', 'My3DScene', 'MyMovingScene']

    # 清理临时文件
    import os
    os.remove(test_file) 