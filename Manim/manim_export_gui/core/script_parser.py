# core/script_parser.py

import re
import ast
import inspect

def get_scene_names(file_path):
    """解析 Python 文件以查找继承自 manim.Scene 的类名。

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

        # 简单方法：使用正则表达式查找 class YourScene(Scene): 或 class YourScene(manim.Scene):
        # 这个方法可能不够健壮，例如无法处理复杂的继承
        # pattern = re.compile(r"^class\s+(\w+)\s*\(\s*(?:manim\.)?Scene\s*\):", re.MULTILINE)
        # scene_names = pattern.findall(content)

        # 更健壮的方法：使用 AST (Abstract Syntax Trees)
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                is_scene = False
                for base in node.bases:
                    # 检查基类是 Scene 还是 manim.Scene
                    if isinstance(base, ast.Name) and base.id == 'Scene':
                        is_scene = True
                        break
                    if isinstance(base, ast.Attribute) and \
                       isinstance(base.value, ast.Name) and \
                       base.value.id == 'manim' and \
                       base.attr == 'Scene':
                        is_scene = True
                        break
                # 确保不是 Scene 类本身
                if is_scene and node.name != 'Scene':
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
from manim import Scene, Circle
import manim

class MyScene1(Scene):
    pass

class AnotherScene(manim.Scene):
    pass

class NotAScene:
    pass

class DerivedFromMyScene(MyScene1):
    pass # 这个不会被直接找到，因为它不直接继承 Scene 或 manim.Scene

class Scene:
    pass # 这个应该被忽略
"""
    test_file = "_temp_test_scene.py"
    with open(test_file, 'w', encoding='utf-8') as f:
        f.write(test_content)

    scenes = get_scene_names(test_file)
    print(f"找到的场景: {scenes}") # 应该输出 ['MyScene1', 'AnotherScene']

    # 清理临时文件
    import os
    os.remove(test_file) 