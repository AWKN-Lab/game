# -*- coding: utf-8 -*-
# 时空剧场 - 主入口
# 包含：启动页→主页→剧本选择→剧本详情→进入剧本的完整流程

# ============================================================
# 启动页
# ============================================================

label splashscreen:
    call screen splash_screen
    jump main_menu

# ============================================================
# 主页
# ============================================================

label main_menu:
    $ current_filter = "all"
    show screen main_menu
    
label main_menu_loop:
    $ result = ui.interact()
    if result == "script_select":
        hide screen main_menu
        jump script_select
    elif result == "my_learning":
        hide screen main_menu
        show screen my_learning
        $ ui.interact()
        hide screen my_learning
        show screen main_menu
        jump main_menu_loop
    elif result == "knowledge_base":
        hide screen main_menu
        show screen knowledge_base
        $ ui.interact()
        hide screen knowledge_base
        show screen main_menu
        jump main_menu_loop
    elif result == "wrong_notes":
        hide screen main_menu
        show screen wrong_notes
        $ ui.interact()
        hide screen wrong_notes
        show screen main_menu
        jump main_menu_loop
    jump main_menu_loop

# ============================================================
# 剧本选择页
# ============================================================

label script_select:
    show screen script_select
    
label script_select_loop:
    $ result = ui.interact()
    if result == "main_menu":
        hide screen script_select
        jump main_menu
    elif result == "script_detail":
        hide screen script_select
        jump script_detail
    jump script_select_loop

# ============================================================
# 剧本详情页
# ============================================================

label script_detail:
    # 设置当前剧本数据
    python:
        if current_script_id:
            current_script_data = SCRIPTS.get(current_script_id, {})
    
    show screen script_detail
    
label script_detail_loop:
    $ result = ui.interact()
    if result == "script_select":
        hide screen script_detail
        jump script_select
    elif result == "enter_script":
        hide screen script_detail
        jump enter_script
    jump script_detail_loop

# ============================================================
# 进入剧本流程（5步）
# ============================================================

label enter_script:
    python:
        if current_script_id:
            init_script(current_script_id)
    
    # 步骤1：加载页
    scene black
    centered "正在加载 [current_script_data.get('name', '')]..."
    pause 2.0
    
    # 步骤2：角色介绍（2页）
    scene black
    
    "【角色介绍】"
    
    scene black with dissolve
    
    "芙宁娜 —— 历史扮演者"
    "定位：戏剧、民主、自由、规则"
    "在历史中扮演关键角色，带你见证历史的戏剧性转折。"
    ""
    
    "胡桃 —— 历史见证者"
    "定位：生命、责任、正义、家国"
    "以独特的视角，带你了解生命与历史的意义。"
    ""
    
    # 步骤3：玩法说明（3页）
    scene black with dissolve
    
    "【玩法说明】"
    ""
    "一、数值系统"
    "游戏中你有四维数值，每个选择都会影响数值变化。"
    "数值会影响最终的结局走向。"
    ""
    
    "二、卡牌系统"
    "你拥有道法卡牌，在关键时刻可以使用。"
    "卡牌会提供额外的数值加成和特殊剧情分支。"
    ""
    
    "三、结局系统"
    "每个剧本有三种结局："
    "  · 历史结局 —— 按照真实历史发展"
    "  · 戏剧结局 —— 基于人道主义改编"
    "  · 往生结局 —— 胡桃为亡魂送别"
    ""
    
    # 步骤4：剧情开场
    scene black with dissolve
    
    # 根据剧本ID跳转到对应剧本
    if current_script_id == "french_revolution":
        jump french_revolution_start
    elif current_script_id == "industrial_revolution":
        jump industrial_revolution_start
    else:
        "剧本尚未开发，敬请期待！"
        jump main_menu

# ============================================================
# 游戏菜单覆盖（禁用默认右键菜单中的部分功能）
# ============================================================

init python:
    # 配置游戏菜单
    config.game_menu = [
        ("存档", "save"),
        ("读档", "load"),
        ("设置", "preferences"),
        ("返回标题", "main_menu"),
        ("退出", "quit"),
    ]
