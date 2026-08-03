# -*- coding: utf-8 -*-
# 时空剧场 - 界面模块
# 包含：启动页、主页、剧本选择页、剧本详情页、设置页、数值HUD、卡牌界面、收集品界面

# ============================================================
# ATL 动画定义
# ============================================================

transform pulse_anim:
    alpha 0.4
    pause 0.8
    alpha 1.0
    pause 0.8
    repeat

transform slide_down_anim:
    ypos -50
    alpha 0.0
    linear 0.4 ypos 0 alpha 1.0

transform slide_up_anim:
    ypos 50
    alpha 0.0
    linear 0.4 ypos 0 alpha 1.0

transform fade_in_slow:
    alpha 0.0
    linear 0.8 alpha 1.0

# ============================================================
# 启动页
# ============================================================

screen splash_screen():
    timer 3.0 action Jump("main_menu")
    
    frame:
        xalign 0.5 yalign 0.5
        background "#0f1b3d"
        xsize 1920 ysize 1080
        
        vbox:
            xalign 0.5 yalign 0.4
            spacing 20
            
            text "时空剧场" size 72 color "#d4a574" bold True
            text "道法·历史 同步学习" size 28 color "#ffffff"
        
        # Loading bar
        frame:
            xalign 0.5
            ypos 700
            xsize 200
            ysize 3
            background "#1a2a5a"
            
            bar:
                value 100
                xsize 200
                ysize 3
                left_bar Solid("#d4a574")
                right_bar Solid("#1a2a5a")
                thumb None
                at fade_in_slow
        
        text "V1.0 | 仅供学习使用" size 16 color "#666666" xalign 0.5 yalign 0.85

# ============================================================
# 主页
# ============================================================

screen main_menu():
    frame:
        background "#0f1b3d"
        xfill True yfill True
        
        # 顶部导航栏
        frame:
            xfill True ysize 60
            background "#1e3a8a"
            
            hbox:
                xsize 1920
                yalign 0.5
                spacing 20
                xpos 30

                text "时空剧场" size 28 color "#d4a574" bold True
                text "道法历史同步学习" size 18 color "#ffffff"

        # 主视觉区
        frame:
            xalign 0.5
            ypos 80
            xsize 1860
            ysize 480
            background Solid("#162040")
            
            vbox:
                xalign 0.5 yalign 0.5
                spacing 15
                
                text "穿越时空，学习历史" size 48 color "#ffffff" xalign 0.5
                text "在剧情中掌握知识点，在选择中理解道法" size 24 color "#aabbcc" xalign 0.5
                
                # 角色悬停提示区域
                hbox:
                    xalign 0.5
                    spacing 200
                    yoffset 30
                    
                    frame:
                        xsize 200 ysize 80
                        background Solid("#1a2a5a")
                        hover_background Solid("#2a3a6a")
                        
                        text "芙宁娜" size 22 color "#ff69b4" xalign 0.5 yalign 0.3
                        if GetTooltip():
                            text GetTooltip() size 14 color "#ffffff" xalign 0.5 yalign 0.7
                        else:
                            text "历史扮演者" size 14 color "#999999" xalign 0.5 yalign 0.7
                        tooltip "我是芙宁娜，我会带你见证历史的戏剧性！"
                    
                    frame:
                        xsize 200 ysize 80
                        background Solid("#1a2a5a")
                        hover_background Solid("#2a3a6a")
                        
                        text "胡桃" size 22 color "#ff4500" xalign 0.5 yalign 0.3
                        if GetTooltip():
                            text GetTooltip() size 14 color "#ffffff" xalign 0.5 yalign 0.7
                        else:
                            text "历史见证者" size 14 color "#999999" xalign 0.5 yalign 0.7
                        tooltip "我是胡桃，我会带你了解生命与历史的意义！"
        
        # 核心功能区
        frame:
            xalign 0.5
            ypos 580
            xsize 1860
            ysize 120
            background Solid("#0d1530")
            
            hbox:
                xalign 0.5 yalign 0.5
                spacing 40
                
                textbutton "开始游戏" style "primary_button" action Jump("script_select") xsize 360 ysize 70 text_size 28 text_color "#ffffff"
                textbutton "我的学习" style "secondary_button" action Jump("my_learning") xsize 360 ysize 70 text_size 28 text_color "#ffffff"
                textbutton "知识点库" style "secondary_button" action Jump("knowledge_base") xsize 360 ysize 70 text_size 28 text_color "#ffffff"
                textbutton "错题本" style "secondary_button" action Jump("wrong_notes") xsize 360 ysize 70 text_size 28 text_color "#ffffff"
        
        # 底部信息区
        frame:
            xfill True
            ypos 1040
            ysize 40
            background "#0a1025"
            
            text "厦门市初二考纲同步 | V1.0" size 14 color "#666666" xalign 0.5 yalign 0.5

# ============================================================
# 剧本选择页
# ============================================================

screen script_select():
    frame:
        background "#0f1b3d"
        xfill True yfill True
        
        # 顶部栏
        frame:
            xfill True ysize 60
            background "#1e3a8a"
            
            hbox:
                xsize 1920
                yalign 0.5
                spacing 20
                xpos 30

                textbutton "< 返回主页" action Jump("main_menu") text_size 20 text_color "#ffffff" text_hover_color "#d4a574"

                # 筛选栏
                textbutton "全部" action Function(filter_scripts, "all") text_size 18 text_color "#ffffff" text_hover_color "#d4a574"
                textbutton "世界史" action Function(filter_scripts, "world_history") text_size 18 text_color "#ffffff" text_hover_color "#d4a574"
                textbutton "中国史" action Function(filter_scripts, "china_history") text_size 18 text_color "#ffffff" text_hover_color "#d4a574"
                textbutton "道法主题" action Function(filter_scripts, "daofa") text_size 18 text_color "#ffffff" text_hover_color "#d4a574"
                
                # 进度提示
                text "已完成：[get_script_completion_count()]/2 个剧本" size 16 color "#aabbcc" xalign 1.0
        
        # 剧本卡片网格
        viewport:
            xalign 0.5
            ypos 80
            xsize 1860
            ysize 960
            scrollbars "vertical"
            
            grid 2 100:
                xalign 0.5
                xsize 1800
                spacing 30
                ypos 20
                
                for script_id, script_data in SCRIPTS.items():
                    if current_filter == "all" or script_data.get("category", "") == current_filter:
                        button:
                            xsize 870 ysize 280
                            background Solid("#162040")
                            hover_background Solid("#1e2a50")
                            
                            vbox:
                                xpos 20 ypos 15
                                spacing 10
                                
                                # 标签
                                hbox:
                                    spacing 10
                                    for tag in script_data.get("tags", []):
                                        if tag == "历史":
                                            frame:
                                                background "#2b6cb0"
                                                xsize 60 ysize 24
                                                text tag size 14 color "#ffffff" xalign 0.5 yalign 0.5
                                        else:
                                            frame:
                                                background "#32cd32"
                                                xsize 60 ysize 24
                                                text tag size 14 color "#ffffff" xalign 0.5 yalign 0.5
                                
                                # 剧本名称
                                text script_data["name"] size 32 color "#ffffff" bold True
                                text script_data.get("subtitle", "") size 18 color "#aabbcc"
                                
                                # 信息
                                hbox:
                                    spacing 20
                                    text "[script_data.get('knowledge_count', 0)]个知识点" size 16 color "#888888"
                                    text "[script_data.get('duration', '')]" size 16 color "#888888"
                                    text "难度：" + "★" * script_data.get("difficulty", 3) + "☆" * (5 - script_data.get("difficulty", 3)) size 16 color "#d4a574"
                                
                                # 完成状态
                                if is_script_completed(script_id):
                                    text "✓ 已完成" size 18 color "#32cd32"
                                else:
                                    text "未完成" size 18 color "#666666"
                            
                            action Jump("script_detail")

# ============================================================
# 剧本详情页
# ============================================================

screen script_detail():
    frame:
        background "#0f1b3d"
        xfill True yfill True
        
        # 顶部栏
        frame:
            xfill True ysize 60
            background "#1e3a8a"
            
            hbox:
                xsize 1920
                yalign 0.5
                spacing 20
                xpos 30

                textbutton "< 返回剧本列表" action Jump("script_select") text_size 20 text_color "#ffffff" text_hover_color "#d4a574"
        
        # 剧本信息区
        frame:
            xalign 0.5
            ypos 80
            xsize 1860
            ysize 200
            background Solid("#162040")
            
            hbox:
                xpos 30 ypos 20
                spacing 30
                yalign 0.5
                
                # 封面占位
                frame:
                    xsize 160 ysize 160
                    background Solid("#1a2a5a")
                    text "封面" size 24 color "#666666" xalign 0.5 yalign 0.5
                
                # 信息
                vbox:
                    spacing 8
                    
                    text current_script_data["name"] size 36 color "#ffffff" bold True
                    text current_script_data.get("subtitle", "") size 20 color "#aabbcc"
                    
                    hbox:
                        spacing 20
                        for tag in current_script_data.get("tags", []):
                            if tag == "历史":
                                frame:
                                    background "#2b6cb0"
                                    xsize 60 ysize 24
                                    text tag size 14 color "#ffffff" xalign 0.5 yalign 0.5
                            else:
                                frame:
                                    background "#32cd32"
                                    xsize 60 ysize 24
                                    text tag size 14 color "#ffffff" xalign 0.5 yalign 0.5
                    
                    hbox:
                        spacing 20
                        text "年级：[current_script_data.get('grade', '')]" size 16 color "#888888"
                        text "时长：[current_script_data.get('duration', '')]" size 16 color "#888888"
                        text "难度：" + "★" * current_script_data.get("difficulty", 3) + "☆" * (5 - current_script_data.get("difficulty", 3)) size 16 color "#d4a574"
        
        # 标签页
        frame:
            xalign 0.5
            ypos 300
            xsize 1860
            ysize 50
            background Solid("#0d1530")
            
            hbox:
                xalign 0.5 yalign 0.5
                spacing 0
                
                if current_tab == "knowledge":
                    textbutton "知识点清单" action SetVariable("current_tab", "knowledge") text_size 20 text_color "#ffffff" xsize 300 ysize 50
                else:
                    textbutton "知识点清单" action SetVariable("current_tab", "knowledge") text_size 20 text_color "#888888" xsize 300 ysize 50
                if current_tab == "endings":
                    textbutton "结局介绍" action SetVariable("current_tab", "endings") text_size 20 text_color "#ffffff" xsize 300 ysize 50
                else:
                    textbutton "结局介绍" action SetVariable("current_tab", "endings") text_size 20 text_color "#888888" xsize 300 ysize 50
                if current_tab == "collectibles":
                    textbutton "收集品" action SetVariable("current_tab", "collectibles") text_size 20 text_color "#ffffff" xsize 300 ysize 50
                else:
                    textbutton "收集品" action SetVariable("current_tab", "collectibles") text_size 20 text_color "#888888" xsize 300 ysize 50
        
        # 标签页内容
        frame:
            xalign 0.5
            ypos 360
            xsize 1860
            ysize 580
            background Solid("#111d3a")
            
            if current_tab == "knowledge":
                viewport:
                    xsize 1820 ysize 540
                    scrollbars "vertical"
                    xpos 20 ypos 20
                    
                    vbox:
                        spacing 8
                        text "历史知识点" size 22 color "#d4a574" bold True
                        text "（知识点将在此展示）" size 16 color "#888888"
                        null height 20
                        text "道法知识点" size 22 color "#d4a574" bold True
                        text "（知识点将在此展示）" size 16 color "#888888"
            
            elif current_tab == "endings":
                viewport:
                    xsize 1820 ysize 540
                    scrollbars "vertical"
                    xpos 20 ypos 20
                    
                    vbox:
                        spacing 15
                        for ending_id, ending_data in current_script_data.get("endings", {}).items():
                            frame:
                                xfill True
                                background Solid("#162040")
                                ysize 80
                                
                                hbox:
                                    xpos 20 ypos 15
                                    spacing 20
                                    yalign 0.5
                                    
                                    if is_ending_unlocked(current_script_id, ending_id):
                                        text "✓" size 28 color "#32cd32"
                                        text ending_data["name"] size 24 color "#ffffff" bold True
                                        text ending_data["desc"] size 16 color "#aabbcc"
                                    else:
                                        text "🔒" size 28 color "#666666"
                                        text "？？？ 未解锁" size 24 color "#666666"
            
            elif current_tab == "collectibles":
                viewport:
                    xsize 1820 ysize 540
                    scrollbars "vertical"
                    xpos 20 ypos 20
                    
                    vbox:
                        spacing 15
                        text "[current_script_data.get('collectible_name', '收集品')]" size 22 color "#d4a574" bold True
                        text "收集进度：[get_collectible_count()]/[current_script_data.get('collectible_total', 0)]" size 18 color "#ffffff"
                        null height 10
                        text "（完成剧本后解锁收集品）" size 16 color "#888888"
        
        # 开始游戏按钮
        frame:
            xalign 1.0
            ypos 960
            xpos 30
            
            textbutton "开始游戏" style "primary_button" action Start("enter_script") xsize 200 ysize 60 text_size 24 text_color "#ffffff"

# ============================================================
# 四维数值HUD
# ============================================================

screen value_hud():
    frame:
        xalign 0.5
        ypos 5
        xsize 800
        ysize 45
        background Solid("#00000080")
        
        hbox:
            xalign 0.5 yalign 0.5
            spacing 15
            
            for value_name in current_values:
                frame:
                    xsize 180 ysize 30
                    background Solid("#333333")
                    
                    vbox:
                        xalign 0.5 yalign 0.5
                        
                        hbox:
                            xalign 0.5
                            spacing 5
                            text get_value_label(value_name) size 14 color "#ffffff"
                            text "[get_value(value_name)]" size 14 color "#ffffff" min_width 30
                        
                        # 数值条
                        bar:
                            value AnimatedValue(get_value(value_name), range=100)
                            xsize 160 ysize 6
                            left_bar Solid(get_value_color(value_name))
                            right_bar Solid("#333333")
                            thumb None

# ============================================================
# 卡牌使用界面
# ============================================================

screen card_use():
    modal True
    
    # Semi-transparent overlay background
    frame:
        xfill True yfill True
        background Solid("#00000099")
    
    frame:
        xalign 0.5 yalign 0.5
        xsize 1200 ysize 700
        background Frame("#0f1b3d", 8, 8)
        
        vbox:
            xpos 30 ypos 20
            spacing 20
            
            text "选择一张道法卡牌" size 32 color "#d4a574" bold True xalign 0.5
            text "（卡牌效果将影响剧情走向和数值变化）" size 16 color "#888888" xalign 0.5
            
            viewport:
                xsize 1140 ysize 500
                scrollbars "vertical"
                
                grid 4 100:
                    spacing 20
                    
                    for card_id in owned_cards:
                        $ card = CARDS.get(card_id, {})
                        button:
                            xsize 250 ysize 200
                            background Frame("#162040", 6, 6)
                            hover_background Frame("#2a3a6a", 6, 6)
                            
                            vbox:
                                xpos 10 ypos 10
                                spacing 8
                                
                                # 卡牌图标占位
                                frame:
                                    xsize 230 ysize 80
                                    background Solid(card.get("color", "#333333"))
                                    text card.get("name", "") size 18 color "#ffffff" bold True xalign 0.5 yalign 0.5
                                
                                text card.get("knowledge", "") size 14 color "#aabbcc"
                                text card.get("description", "") size 12 color "#888888"
                            
                            action [
                                Function(use_card, card_id),
                                Return(card_id)
                            ]
            
            hbox:
                xalign 0.5
                spacing 30
                
                textbutton "不使用卡牌" action Return(None) text_size 20 text_color "#ffffff" xsize 200 ysize 50

# ============================================================
# 收集品获取提示
# ============================================================

screen collectible_notification(item_name):
    timer 3.0 action Hide("collectible_notification")
    
    frame:
        xalign 0.5
        ypos 100
        xpadding 30
        ypadding 16
        at slide_down_anim
        background Frame("#1a2a5a", 12, 12)
        
        # Gold accent border simulation using an inner frame
        frame:
            xalign 0.5 yalign 0.5
            xsize 420
            ysize 60
            background None
            
            vbox:
                xalign 0.5 yalign 0.5
                spacing 5
                text "✨ 获得收集品！" size 22 color "#d4a574" bold True xalign 0.5
                text item_name size 18 color "#ffffff" xalign 0.5

# ============================================================
# 设置页
# ============================================================

screen settings():
    frame:
        background "#0f1b3d"
        xfill True yfill True
        
        frame:
            xfill True ysize 60
            background "#1e3a8a"
            
            hbox:
                xsize 1920
                yalign 0.5
                xpos 30
                textbutton "< 返回主页" action Jump("main_menu") text_size 20 text_color "#ffffff" text_hover_color "#d4a574"
        
        frame:
            xalign 0.5
            ypos 100
            xsize 800
            ysize 600
            background Solid("#162040")
            
            vbox:
                xpos 30 ypos 30
                spacing 30
                
                text "设置" size 36 color "#d4a574" bold True
                
                vbox:
                    spacing 15
                    text "BGM音量" size 20 color "#ffffff"
                    bar value Preference("music volume") xsize 600 ysize 30 style "slider"
                
                vbox:
                    spacing 15
                    text "音效音量" size 20 color "#ffffff"
                    bar value Preference("sfx volume") xsize 600 ysize 30 style "slider"
                
                vbox:
                    spacing 15
                    text "文字速度" size 20 color "#ffffff"
                    bar value Preference("text speed") xsize 600 ysize 30 style "slider"
                
                vbox:
                    spacing 15
                    text "自动播放速度" size 20 color "#ffffff"
                    bar value Preference("auto-forward time") xsize 600 ysize 30 style "slider"

# ============================================================
# 二期功能占位页
# ============================================================

screen my_learning():
    frame:
        background "#0f1b3d"
        xfill True yfill True
        
        frame:
            xfill True ysize 60
            background "#1e3a8a"
            hbox:
                xsize 1920 yalign 0.5 xpos 30
                textbutton "< 返回主页" action Jump("main_menu") text_size 20 text_color "#ffffff" text_hover_color "#d4a574"
        
        frame:
            xalign 0.5 ypos 100 xsize 800 ysize 400
            background Solid("#162040")
            vbox:
                xalign 0.5 yalign 0.5 spacing 20
                text "我的学习" size 36 color "#d4a574" bold True xalign 0.5
                text "已完成剧本：[get_script_completion_count()]/2" size 20 color "#ffffff" xalign 0.5
                text "总学习时长：[persistent.total_play_time:.0f]秒" size 20 color "#ffffff" xalign 0.5
                text "（更多功能开发中...）" size 16 color "#888888" xalign 0.5

screen knowledge_base():
    frame:
        background "#0f1b3d"
        xfill True yfill True
        
        frame:
            xfill True ysize 60
            background "#1e3a8a"
            hbox:
                xsize 1920 yalign 0.5 xpos 30
                textbutton "< 返回主页" action Jump("main_menu") text_size 20 text_color "#ffffff" text_hover_color "#d4a574"
        
        frame:
            xalign 0.5 ypos 100 xsize 800 ysize 400
            background Solid("#162040")
            vbox:
                xalign 0.5 yalign 0.5 spacing 20
                text "知识点库" size 36 color "#d4a574" bold True xalign 0.5
                text "（二期功能开发中...）" size 20 color "#888888" xalign 0.5

screen wrong_notes():
    frame:
        background "#0f1b3d"
        xfill True yfill True
        
        frame:
            xfill True ysize 60
            background "#1e3a8a"
            hbox:
                xsize 1920 yalign 0.5 xpos 30
                textbutton "< 返回主页" action Jump("main_menu") text_size 20 text_color "#ffffff" text_hover_color "#d4a574"
        
        frame:
            xalign 0.5 ypos 100 xsize 800 ysize 400
            background Solid("#162040")
            vbox:
                xalign 0.5 yalign 0.5 spacing 20
                text "错题本" size 36 color "#d4a574" bold True xalign 0.5
                text "当前错题数：[len(persistent.wrong_answers)]" size 20 color "#ffffff" xalign 0.5
                text "（二期功能开发中...）" size 20 color "#888888" xalign 0.5

# ============================================================
# 全局变量（界面状态）
# ============================================================

default current_filter = "all"
default current_tab = "knowledge"
default current_script_id = None
default current_script_data = {}

init python:
    def get_value_color(value_name):
        colors = {
            "freedom": "#4169e1",
            "equality": "#32cd32",
            "rule": "#4682b4",
            "justice": "#dc143c",
            "labor": "#daa520",
            "responsibility": "#8b4513",
            "life": "#ff69b4",
        }
        return colors.get(value_name, "#ff6b35")

    def filter_scripts(category):
        store.current_filter = category
    
    def open_script_detail(script_id):
        store.current_script_id = script_id
        store.current_script_data = SCRIPTS.get(script_id, {})
        store.current_tab = "knowledge"
        renpy.jump("script_detail")
