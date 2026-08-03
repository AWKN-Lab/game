# -*- coding: utf-8 -*-
# 时空剧场 - Ren'Py 配置文件

init python:
    # 窗口配置
    config.window_title = "时空剧场：道法历史同步学习"
    
    # 分辨率
    config.screen_width = 1920
    config.screen_height = 1080
    
    # 中文字体配置
    # 优先使用系统已安装的中文字体
    import os
    import platform
    
    _system = platform.system()
    _font_candidates = []
    
    if _system == "Darwin":
        _font_candidates = [
            "/System/Library/Fonts/PingFang.ttc",
            "/Library/Fonts/Arial Unicode.ttf",
            "/System/Library/Fonts/STHeiti Medium.ttc",
        ]
    elif _system == "Windows":
        _font_candidates = [
            "C:/Windows/Fonts/msyh.ttc",
            "C:/Windows/Fonts/simsun.ttc",
            "C:/Windows/Fonts/simhei.ttf",
        ]
    else:
        _font_candidates = [
            "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
            "/usr/share/fonts/opentype/noto/NotoSansSC-Regular.otf",
            "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
            "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
        ]
    
    # 也检查项目自带字体
    _project_font = os.path.join(config.gamedir, "fonts", "NotoSansSC-Regular.otf")
    if os.path.exists(_project_font):
        _font_candidates.insert(0, _project_font)
    
    _chosen_font = None
    for _f in _font_candidates:
        if os.path.exists(_f):
            _chosen_font = _f
            break
    
    if _chosen_font:
        # 注册字体
        try:
            from renpy.font import register
            register(_chosen_font)
        except:
            pass
        
        gui.default_font = _chosen_font
        gui.text_font = _chosen_font
        gui.name_text_font = _chosen_font
        gui.interface_text_font = _chosen_font
        gui.button_text_font = _chosen_font
        gui.label_text_font = _chosen_font
    
    # 游戏内文本速度
    # config.text_speed is set via preferences in Ren'Py 8.x
    
    # 自动推进延迟
    # config.auto_voice_delay removed in Ren'Py 8.x
    
    # 图像缓存
    # config.image_cache_size removed in Ren'Py 8.x
    
    # 存档槽数量
    # config.quicksave_slots removed in Ren'Py 8.x

init python:
    config.intra_transition = Dissolve(0.3)
    config.enter_transition = Dissolve(0.3)
    config.exit_transition = Dissolve(0.3)

# 颜色定义
default gui.accent_color = "#ff6b35"
default gui.idle_color = "#1e3a8a"
default gui.hover_color = "#2b6cb0"
default gui.selected_color = "#d4a574"
default gui.insensitive_color = "#9ca3af"

# 主菜单背景
default gui.main_menu_background = "#0f1b3d"

# 游戏菜单背景
default gui.game_menu_background = "#0f1b3d"

# 文本框
default gui.textbox_height = 220
default gui.textbox_yalign = 1.0

# 按钮样式
style default:
    font gui.button_text_font
    color gui.idle_color
    hover_color gui.hover_color
    selected_color gui.selected_color
    insensitive_color gui.insensitive_color

style button:
    background "#1e3a8a"
    hover_background "#2b6cb0"
    ysize 48

style button_text:
    color "#ffffff"
    hover_color "#ffffff"
    size 20

style primary_button:
    background "#ff6b35"
    hover_background "#ff8555"

style secondary_button:
    background "#1e3a8a"
    hover_background "#2b6cb0"

style disabled_button:
    background "#9ca3af"
    insensitive_background "#9ca3af"
