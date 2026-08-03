# -*- coding: utf-8 -*-
# 时空剧场 - 公共定义模块
# 包含：角色定义、全局变量、卡牌系统、收集品系统、通用函数

# ============================================================
# 角色定义
# ============================================================

define fulina = Character("芙宁娜", color="#ff69b4")
define h = Character("胡桃", color="#ff4500")

# 通用NPC
define narrator = Character(None, kind=nvl)
define npc = Character("路人", color="#808080")

# ============================================================
# 全局变量 - 四维数值系统
# ============================================================

# 默认四维数值（法国大革命等世界史剧本使用）
default freedom_value = 50
default equality_value = 50
default rule_value = 50
default justice_value = 50

# 备用四维数值（工业革命等剧本使用）
default labor_value = 50
default responsibility_value = 50
default life_value = 50

# 当前剧本的四维数值配置
default current_values = ["freedom", "equality", "rule", "justice"]
default current_value_labels = {"freedom": "自由", "equality": "平等", "rule": "规则", "justice": "正义"}

# ============================================================
# 全局变量 - 剧本进度
# ============================================================

# 持久化数据（跨存档保留）
default persistent.completed_scripts = []
default persistent.unlocked_endings = {}
default persistent.collected_items = {}
default persistent.owned_cards = []
default persistent.wrong_answers = []
default persistent.total_play_time = 0
default persistent.knowledge_mastered = []

# 当前剧本状态
default current_script = None
default current_act = 0
default script_start_time = None

# 收集品
default soul_fragments = 0
default diary_fragments = 0
default current_collectibles = {}
default current_collectible_total = 0

# 卡牌
default owned_cards = []
default active_card_effects = {}

# 结局相关
default furina_affinity = 0
default hutao_affinity = 0

# 测试相关
default quiz_score = 0
default quiz_total = 0

# ============================================================
# 卡牌系统数据
# ============================================================

init python:
    # 道法卡牌定义
    CARDS = {
        "human_rights": {
            "name": "人权宣言卡",
            "knowledge": "尊重和保障人权",
            "description": "触发'人权保护'状态，所有角色获得生命权、自由权、财产权保护",
            "effect": {"justice": 20},
            "color": "#ffd700",
            "icon": "card_human_rights"
        },
        "freedom": {
            "name": "自由卡",
            "knowledge": "自由与法治的关系",
            "description": "触发'自由行动'状态，可在法律范围内自由移动和决策",
            "effect": {"freedom": 15},
            "color": "#4169e1",
            "icon": "card_freedom"
        },
        "equality": {
            "name": "平等卡",
            "knowledge": "法律面前人人平等",
            "description": "触发'人人平等'状态，消除所有身份特权和歧视",
            "effect": {"equality": 15},
            "color": "#32cd32",
            "icon": "card_equality"
        },
        "fairness": {
            "name": "公平卡",
            "knowledge": "公平的内涵与价值",
            "description": "触发'公平分配'状态，所有资源和机会平均分配",
            "effect": {"justice": 20},
            "color": "#ff8c00",
            "icon": "card_fairness"
        },
        "justice": {
            "name": "正义卡",
            "knowledge": "正义的要求",
            "description": "触发'正义审判'状态，所有非正义行为都会受到相应惩罚",
            "effect": {"justice": 15},
            "color": "#dc143c",
            "icon": "card_justice"
        },
        "rule_of_law": {
            "name": "法治卡",
            "knowledge": "全面依法治国",
            "description": "触发'法治秩序'状态，建立新的法律体系，规范所有人的行为",
            "effect": {"rule": 15},
            "color": "#4682b4",
            "icon": "card_rule_of_law"
        },
        "labor": {
            "name": "劳动卡",
            "knowledge": "劳动的意义与价值",
            "description": "触发'劳动光荣'状态，所有劳动者获得应有的尊重和报酬",
            "effect": {"labor": 15},
            "color": "#daa520",
            "icon": "card_labor"
        },
        "responsibility": {
            "name": "责任卡",
            "knowledge": "承担社会责任",
            "description": "触发'责任担当'状态，所有角色必须履行自己的法定义务",
            "effect": {"responsibility": 15},
            "color": "#8b4513",
            "icon": "card_responsibility"
        }
    }
    
    # 剧本配置数据
    SCRIPTS = {
        "french_revolution": {
            "name": "法国大革命",
            "subtitle": "自由、平等、博爱",
            "category": "world_history",
            "tags": ["历史", "道法"],
            "grade": "初二",
            "duration": "25-30分钟",
            "difficulty": 3,
            "knowledge_count": 16,
            "values": ["freedom", "equality", "rule", "justice"],
            "value_labels": {"freedom": "自由", "equality": "平等", "rule": "规则", "justice": "正义"},
            "initial_cards": ["human_rights", "freedom"],
            "collectible_name": "亡魂碎片",
            "collectible_total": 6,
            "endings": {
                "historical": {"name": "历史结局", "desc": "完全按照真实历史发展", "unlocked": False},
                "dramatic": {"name": "戏剧结局", "desc": "基于人道主义改编", "unlocked": False},
                "afterlife": {"name": "往生结局", "desc": "胡桃为亡魂送别", "unlocked": False}
            }
        },
        "industrial_revolution": {
            "name": "蒸汽时代的光与影",
            "subtitle": "第一次工业革命",
            "category": "world_history",
            "tags": ["历史", "道法"],
            "grade": "初二",
            "duration": "20-25分钟",
            "difficulty": 3,
            "knowledge_count": 13,
            "values": ["labor", "justice", "responsibility", "life"],
            "value_labels": {"labor": "劳动", "justice": "正义", "responsibility": "责任", "life": "生命"},
            "initial_cards": ["labor", "fairness"],
            "collectible_name": "工人日记碎片",
            "collectible_total": 4,
            "endings": {
                "historical": {"name": "历史结局", "desc": "英国成为世界工厂", "unlocked": False},
                "dramatic": {"name": "戏剧结局", "desc": "工厂主改变经营方式", "unlocked": False},
                "afterlife": {"name": "往生结局", "desc": "胡桃为工人渡灵", "unlocked": False}
            }
        }
    }

# ============================================================
# 通用函数
# ============================================================

init python:
    import store
    
    def change_value(value_name, amount):
        """修改四维数值"""
        old_val = getattr(store, value_name + "_value", 50)
        new_val = max(0, min(100, old_val + amount))
        setattr(store, value_name + "_value", new_val)
        return new_val
    
    def get_value(value_name):
        """获取四维数值"""
        return getattr(store, value_name + "_value", 50)
    
    def get_value_label(value_name):
        """获取数值的中文名称"""
        labels = getattr(store, "current_value_labels", {})
        return labels.get(value_name, value_name)
    
    def use_card(card_id):
        """使用道法卡牌"""
        card = CARDS.get(card_id)
        if not card:
            return False
        # 应用卡牌效果
        for value_name, amount in card["effect"].items():
            change_value(value_name, amount)
        # 记录激活效果
        store.active_card_effects[card_id] = True
        return True
    
    def add_collectible(item_id, name=""):
        """获取收集品"""
        if item_id not in store.current_collectibles:
            store.current_collectibles[item_id] = name
        return len(store.current_collectibles)
    
    def get_collectible_count():
        """获取当前收集品数量"""
        return len(store.current_collectibles)
    
    def check_ending(script_id):
        """判定结局类型"""
        script_data = SCRIPTS.get(script_id, {})
        values = script_data.get("values", ["freedom", "equality", "rule", "justice"])
        
        # 检查往生结局条件：收集全部碎片
        collectible_total = script_data.get("collectible_total", 6)
        if get_collectible_count() >= collectible_total:
            return "afterlife"
        
        # 检查戏剧结局条件：两个数值>=80
        high_count = 0
        for v in values:
            if get_value(v) >= 80:
                high_count += 1
        if high_count >= 2:
            return "dramatic"
        
        # 默认历史结局
        return "historical"
    
    def init_script(script_id):
        """初始化剧本"""
        import time
        script_data = SCRIPTS.get(script_id, {})
        
        # 设置当前剧本
        store.current_script = script_id
        store.current_act = 0
        store.script_start_time = time.time()
        
        # 重置四维数值
        for v in ["freedom", "equality", "rule", "justice", "labor", "responsibility", "life"]:
            setattr(store, v + "_value", 50)
        
        # 设置当前数值配置
        values = script_data.get("values", ["freedom", "equality", "rule", "justice"])
        labels = script_data.get("value_labels", {})
        store.current_values = values
        store.current_value_labels = labels
        
        # 初始化卡牌
        initial_cards = script_data.get("initial_cards", [])
        store.owned_cards = list(initial_cards)
        store.active_card_effects = {}
        
        # 重置收集品
        store.current_collectibles = {}
        store.current_collectible_total = script_data.get("collectible_total", 6)
        
        # 重置好感度
        store.furina_affinity = 0
        store.hutao_affinity = 0
        
        # 重置测试
        store.quiz_score = 0
        store.quiz_total = 0
    
    def save_script_progress(script_id, ending_type):
        """保存剧本进度到persistent"""
        if script_id not in persistent.completed_scripts:
            persistent.completed_scripts.append(script_id)
        
        key = script_id + "_" + ending_type
        persistent.unlocked_endings[key] = True
        
        # 保存收集品
        for item_id, item_name in store.current_collectibles.items():
            full_key = script_id + "_" + item_id
            persistent.collected_items[full_key] = item_name
        
        # 保存卡牌
        for card_id in store.owned_cards:
            if card_id not in persistent.owned_cards:
                persistent.owned_cards.append(card_id)
        
        # 更新学习时长
        if store.script_start_time:
            import time
            elapsed = time.time() - store.script_start_time
            persistent.total_play_time += elapsed
    
    def is_script_completed(script_id):
        """检查剧本是否已完成"""
        return script_id in persistent.completed_scripts
    
    def is_ending_unlocked(script_id, ending_type):
        """检查结局是否已解锁"""
        key = script_id + "_" + ending_type
        return persistent.unlocked_endings.get(key, False)
    
    def get_script_completion_count():
        """获取已完成剧本数量"""
        return len(persistent.completed_scripts)
