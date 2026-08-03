# -*- coding: utf-8 -*-
# 时空剧场：法国大革命 - 剧本脚本
# 五幕制结构 | 三结局 | 四维数值 | 卡牌系统 | 收集品系统
# 历史考点1-12 | 道法考点：公平、自由、人权、平等、正义

# ============================================================
# 图像定义 - 法国大革命
# ============================================================

# 背景图
image bg opera_house = "images/bg/opera_house.jpg"
image bg versailles_hall = "images/bg/versailles_hall.jpg"
image bg bastille = "images/bg/bastille.jpg"
image bg national_assembly = "images/bg/national_assembly.jpg"
image bg palace_square = "images/bg/palace_square.jpg"
image bg execution = "images/bg/execution.jpg"
image bg arc_de_triomphe = "images/bg/arc_de_triomphe.jpg"
image bg waterloo = "images/bg/waterloo.jpg"
image bg versailles_garden = "images/bg/versailles_garden.jpg"
image bg ghost_world = "images/bg/ghost_world.jpg"

# 芙宁娜立绘
image f excited = "images/characters/fulina/excited.png"
image f curious = "images/characters/fulina/curious.png"
image f marie_royal = "images/characters/fulina/marie_royal.png"
image f serious = "images/characters/fulina/serious.png"
image f normal = "images/characters/fulina/normal.png"

# 胡桃立绘
image h peasant = "images/characters/hutao/peasant.png"
image h solemn = "images/characters/hutao/solemn.png"
image h ghost = "images/characters/hutao/ghost.png"
image h normal = "images/characters/hutao/normal.png"

# NPC立绘
image louis king = "images/characters/npc/louis_king.png"
image robespierre = "images/characters/npc/robespierre.png"
image napoleon = "images/characters/npc/napoleon.png"
image marie = "images/characters/npc/marie.png"

# 亡魂变体
image marie_ghost = "images/characters/ghost/marie_ghost.png"
image louis_ghost = "images/characters/ghost/louis_ghost.png"
image robespierre_ghost = "images/characters/ghost/robespierre_ghost.png"
image napoleon_ghost = "images/characters/ghost/napoleon_ghost.png"

# ============================================================
# 角色定义（本剧本专用NPC）
# ============================================================

define louis = Character("路易十六", color="#4169e1")
define marie = Character("玛丽·安托瓦内特", color="#9932cc")
define robespierre = Character("罗伯斯庇尔", color="#2f4f4f")
define napoleon = Character("拿破仑", color="#8b0000")
define npc1 = Character("第三等级代表", color="#808080")
define npc2 = Character("巴黎市民", color="#808080")
define npc3 = Character("雅各宾派成员", color="#808080")
define marie_ghost = Character("玛丽·安托瓦内特（亡魂）", color="#9932cc")
define louis_ghost = Character("路易十六（亡魂）", color="#4169e1")
define robespierre_ghost = Character("罗伯斯庇尔（亡魂）", color="#2f4f4f")
define napoleon_ghost = Character("拿破仑（亡魂）", color="#8b0000")

# ============================================================
# 剧本入口
# ============================================================

label french_revolution_start:
    # 初始化剧本（重置数值、卡牌、收集品等）
    python:
        init_script("french_revolution")

    # 显示四维数值HUD
    show screen value_hud

    # ========================================================
    # 开场：时空剧场
    # ========================================================
    scene bg opera_house
    show f excited
    show h curious at right

    fulina "灯光就位！音乐响起！欢迎来到时空剧场最盛大的演出——《法国大革命》！"
    h "哇，芙宁娜你今天好激动啊。不过我听说这场革命死了很多人呢。"
    fulina "这正是戏剧的魅力所在！冲突、牺牲、理想、背叛……所有最震撼人心的元素都在这里了！"
    fulina "我将扮演那位命运多舛的玛丽·安托瓦内特王后！"
    h "那我就扮演一个来自第三等级的普通女孩吧。我想看看，那些被历史遗忘的普通人是怎么生活的。"

    # ========================================================
    # 第一幕：三级会议的阴影
    # 历史考点1-2 | 道法：公平的内涵
    # ========================================================
    $ current_act = 1
    call act_transition("第一幕", "三级会议的阴影")

    scene bg versailles_hall
    show f marie_royal
    show h peasant at right
    show louis king at left

    # 历史考点1：根本原因
    louis "各位代表，国家财政已经破产了。我决定召开三级会议，向第三等级征税。"
    npc1 "国王陛下！第一等级和第二等级占有全国三分之二的土地，却不用交税！为什么总是我们第三等级承担所有负担？"
    fulina "（轻蔑地）你们这些下等人，能为国王和国家交税是你们的荣幸！"
    h "（小声）这太不公平了！我们每天累死累活，却连面包都吃不起，而他们却在宫殿里挥霍无度。"

    # 道法知识点：公平的内涵（历史考点2：导火线）
    menu:
        "你认为这种制度最违反了公平的哪一项要求？"
        "权利公平":
            $ change_value("equality", 10)
            h "权利公平要求每个人依法平等参与社会活动，但第三等级却被剥夺了平等的政治权利。"
        "规则公平":
            $ change_value("rule", 10)
            h "规则公平要求所有人都受到相同的行为规范约束，但贵族和教士却可以不遵守税法。"
        "机会公平":
            $ change_value("justice", 10)
            h "机会公平要求社会为每个人提供同等的发展机会，但出身就决定了一个人的命运。"

    npc1 "我们要求三个等级合并开会，实行一人一票！"
    louis "（愤怒）放肆！第三等级永远只能是第三等级！"
    npc1 "既然如此，我们第三等级单独召开国民议会！"

    fulina "（惊慌）他们竟然敢违抗国王的命令！"
    h "这是他们在争取自己的自由和平等啊。"

    # ========================================================
    # 第二幕：攻占巴士底狱
    # 历史考点3 | 道法：自由与法治
    # ========================================================
    $ current_act = 2
    call act_transition("第二幕", "攻占巴士底狱")

    scene bg bastille
    play sound "crowd_shout.wav"

    npc2 "巴士底狱是封建专制的象征！冲啊！"
    play sound "cannon_fire.wav"

    fulina "（惊恐）什么？那些暴民竟然攻打巴士底狱！他们这是造反！"
    h "不，这不是造反，这是革命！他们在为自由而战！"

    # 道法知识点：自由与法治的关系（历史考点3：开始标志）
    menu:
        "你如何看待人民攻占巴士底狱的行为？"
        "这是违法行为，应该被镇压":
            $ change_value("rule", 10)
            $ change_value("freedom", -20)
            fulina "说得对！任何违反法律的行为都应该受到惩罚！"
        "这是人民争取自由的正义行为":
            $ change_value("freedom", 20)
            $ change_value("justice", 15)
            h "当旧的法律成为压迫人民的工具时，人民就有权推翻它，建立新的法治秩序。"
        "虽然目的是好的，但方式太暴力了":
            $ change_value("rule", 10)
            h "是啊，革命总是伴随着暴力和牺牲。但如果没有革命，人民永远得不到自由。"

    npc2 "巴士底狱被攻占了！革命胜利了！"

    # 收集品：巴士底狱牺牲者的亡魂碎片
    python:
        add_collectible("bastille_soul", "巴士底狱牺牲者的亡魂碎片")
    show screen collectible_notification("巴士底狱牺牲者的亡魂碎片")

    # ========================================================
    # 第三幕：《人权宣言》的光辉
    # 历史考点4-5 | 道法：人权、法治
    # 含卡牌使用
    # ========================================================
    $ current_act = 3
    call act_transition("第三幕", "《人权宣言》的光辉")

    scene bg national_assembly
    show robespierre

    # 历史考点4：《人权宣言》
    robespierre "现在，我们要制定一部伟大的宣言，向全世界宣告人类的权利！"
    robespierre "《人权宣言》第一条：在权利方面，人们生来是而且始终是自由平等的。"

    # 卡牌使用环节
    $ card_result = renpy.call_screen("card_use")
    if card_result == "human_rights":
        h "人权宣言卡生效！人权是每个人与生俱来的权利，不可剥夺，不可转让。"
        $ change_value("justice", 20)
    elif card_result == "freedom":
        h "自由卡生效！自由不是为所欲为，而是在法律范围内的自由。"
        $ change_value("freedom", 15)
    elif card_result == "equality":
        h "平等卡生效！法律面前人人平等，任何人都没有超越法律的特权。"
        $ change_value("equality", 15)
    elif card_result == "fairness":
        h "公平卡生效！公平要求社会为每个人提供同等的权利和机会。"
        $ change_value("justice", 15)
    elif card_result == "justice":
        h "正义卡生效！正义是社会制度的首要价值，法律应当维护正义。"
        $ change_value("justice", 15)
    elif card_result == "rule_of_law":
        h "法治卡生效！法治是自由的保障，也是人权的基石。"
        $ change_value("rule", 15)
    else:
        h "让我们继续聆听《人权宣言》的内容吧。"

    robespierre "第二条：任何政治结合的目的都在于保存人的自然的和不可动摇的权利。这些权利就是自由、财产、安全和反抗压迫。"
    robespierre "第十七条：私有财产神圣不可侵犯。"

    fulina "（被囚禁）什么私有财产神圣不可侵犯？我的宫殿、我的珠宝都是我的私有财产！你们凭什么夺走？"
    h "因为你的财产是建立在剥削人民的基础上的。真正的私有财产权，是保护每个人的合法财产，而不是少数人的特权。"

    # 历史考点5：1791年宪法
    robespierre "1791年，我们制定了第一部宪法，确立了君主立宪制，实行三权分立。"
    robespierre "立法权属于国民议会，行政权属于国王，司法权属于法院。"

    # 道法知识点：法治的价值
    menu:
        "为什么说宪法是法治的基础？"
        "宪法是国家的根本法，具有最高法律效力":
            $ change_value("rule", 15)
            h "没错！宪法是其他法律的立法基础和依据，任何法律都不得与宪法相抵触。"
        "宪法规定了公民的基本权利和义务":
            $ change_value("equality", 10)
            h "宪法保障公民的基本权利，同时也规定了公民必须履行的基本义务。"
        "宪法组织国家机构，规范权力运行":
            $ change_value("justice", 10)
            h "宪法设置国家机构，授予它们相应的职权，同时规范它们的权力运行，防止权力滥用。"

    # ========================================================
    # 第四幕：共和国的诞生与恐怖
    # 历史考点6-9 | 道法：自由的边界
    # 含收集品
    # ========================================================
    $ current_act = 4
    call act_transition("第四幕", "共和国的诞生与恐怖")

    scene bg palace_square
    play sound "crowd_cheer.wav"

    # 历史考点6：法兰西第一共和国
    npc3 "路易十六勾结外国势力，企图复辟！我们要求废除君主制，建立共和国！"
    robespierre "1792年，法兰西第一共和国成立了！"

    # 历史考点7：路易十六被处死
    scene bg execution
    play sound "guillotine.wav"

    louis "（临死前）我是无辜的！我原谅我的敌人。"

    # 收集品：路易十六的亡魂碎片
    python:
        add_collectible("louis_soul", "路易十六的亡魂碎片")
    show screen collectible_notification("路易十六的亡魂碎片")

    fulina "（颤抖）太可怕了！他们竟然把国王送上了断头台！"
    h "这就是革命的残酷。为了保卫共和国，他们不得不这样做。"

    # 历史考点8：雅各宾派统治
    robespierre "现在，我们要实行恐怖统治，严厉镇压所有反革命分子！"
    npc3 "凡是反对革命的人，都要被送上断头台！"

    # 道法知识点：自由的边界
    menu:
        "你如何看待雅各宾派的恐怖统治？"
        "这是必要的，为了保卫革命成果":
            $ change_value("justice", 10)
            robespierre "在革命时期，恐怖就是正义！"
        "这是对自由的践踏，革命已经走向了反面":
            $ change_value("freedom", 15)
            h "自由是有边界的。当自由变成了任意杀戮的自由，它就不再是真正的自由了。"
        "虽然有过激之处，但总体上是进步的":
            $ change_value("rule", 10)
            h "革命总是会有过激的行为。但我们不能因此否定革命的历史意义。"

    play sound "guillotine.wav"

    # 收集品：无辜市民的亡魂碎片（2枚）
    python:
        add_collectible("innocent_soul_1", "无辜市民的亡魂碎片·壹")
        add_collectible("innocent_soul_2", "无辜市民的亡魂碎片·贰")
    show screen collectible_notification("无辜市民的亡魂碎片 x2")

    h "太多人死去了。仅仅因为被怀疑是反革命，就被送上了断头台。"
    fulina "是啊，这已经不是革命了，这是屠杀。"

    # 历史考点9：热月政变
    scene bg national_assembly
    npc3 "罗伯斯庇尔的恐怖统治已经让所有人都感到恐惧！"
    npc3 "打倒罗伯斯庇尔！"
    play sound "guillotine.wav"

    # 收集品：罗伯斯庇尔的亡魂碎片
    python:
        add_collectible("robespierre_soul", "罗伯斯庇尔的亡魂碎片")
    show screen collectible_notification("罗伯斯庇尔的亡魂碎片")

    h "热月政变了。雅各宾派的统治结束了。"
    fulina "革命的高潮过去了。但法国需要一个强有力的人来稳定局势。"

    # ========================================================
    # 第五幕：拿破仑的传奇
    # 历史考点10-12 | 道法：平等、正义
    # ========================================================
    $ current_act = 5
    call act_transition("第五幕", "拿破仑的传奇")

    scene bg arc_de_triomphe
    show napoleon

    # 历史考点10：拿破仑帝国
    napoleon "我是拿破仑·波拿巴！我将带领法国走向辉煌！"
    napoleon "1804年，我加冕为皇帝，建立了法兰西第一帝国。"

    napoleon "我最伟大的功绩，是颁布了《拿破仑法典》。"
    napoleon "这部法典确认了资产阶级私有制，废除了封建特权，确立了自由平等的原则。"
    napoleon "它将成为所有资本主义国家立法的典范。"

    # 道法知识点：法律面前人人平等
    menu:
        "《拿破仑法典》体现了法治的哪一项基本原则？"
        "法律面前人人平等":
            $ change_value("equality", 15)
            h "没错！法典规定所有公民在法律面前一律平等，废除了贵族的所有特权。"
        "私有财产神圣不可侵犯":
            $ change_value("rule", 10)
            h "法典保护资产阶级的私有财产权，巩固了资产阶级革命的成果。"
        "契约自由":
            $ change_value("freedom", 10)
            h "法典规定了契约自由的原则，促进了资本主义经济的发展。"

    # 历史考点11：拿破仑对外战争的双重性质
    napoleon "我率领大军横扫欧洲，把法国大革命的思想传播到了整个欧洲！"
    napoleon "我打击了欧洲的封建势力，推动了欧洲的进步！"

    menu:
        "你如何评价拿破仑的对外战争？"
        "这是正义的战争，传播了革命思想":
            $ change_value("justice", 10)
            napoleon "我是革命的传播者！我将自由平等的思想带给了欧洲人民！"
        "这是侵略战争，给欧洲人民带来了灾难":
            $ change_value("rule", 10)
            h "但是，拿破仑的战争也掠夺了欧洲各国的财富，给当地人民带来了巨大的灾难。"
        "具有双重性质，既有进步性也有侵略性":
            $ change_value("justice", 15)
            h "你说得对。拿破仑的对外战争既有打击封建势力的进步性，也有侵略掠夺的非正义性。"

    # 历史考点12：滑铁卢与历史意义
    scene bg waterloo
    napoleon "滑铁卢……我失败了。"
    napoleon "但是，我的功绩不会被遗忘。我的法典将永垂不朽！"

    # 收集品：拿破仑的亡魂碎片
    python:
        add_collectible("napoleon_soul", "拿破仑的亡魂碎片")
    show screen collectible_notification("拿破仑的亡魂碎片")

    # ========================================================
    # 结局判定
    # ========================================================
    hide screen value_hud

    python:
        ending = check_ending("french_revolution")

    if ending == "afterlife":
        jump fr_afterlife_ending
    elif ending == "dramatic":
        jump fr_dramatic_ending
    else:
        jump fr_historical_ending

# ============================================================
# 结局一：历史结局（数值均衡，默认结局）
# ============================================================

label fr_historical_ending:
    scene bg opera_house
    show f serious
    show h solemn at right

    fulina "这就是真实的历史。法国大革命历时26年，最终以波旁王朝复辟告终。"
    h "但是，法国大革命的意义是不可磨灭的。"
    fulina "没错。法国大革命摧毁了法国的封建统治，传播了资产阶级自由民主的进步思想。"
    h "它不仅改变了法国的历史，也对整个世界历史的发展产生了深远的影响。"
    fulina "从道法的角度看，法国大革命告诉我们：自由、平等、公平、正义是人类的共同追求，而法治是实现这些价值的根本保障。"

    python:
        save_script_progress("french_revolution", "historical")

    jump fr_curtain_call

# ============================================================
# 结局二：戏剧结局（freedom>=80 且 equality>=80）
# ============================================================

label fr_dramatic_ending:
    scene bg versailles_garden
    show f marie_royal
    show h at right

    marie "谢谢你，胡桃。是你让我明白了什么是真正的自由和平等。"
    h "不用谢。每个人都应该有改过自新的机会。"
    marie "我愿意放弃所有的头衔和财富，成为一个普通的公民，用我的余生来赎罪。"
    fulina "（旁白）在这个结局里，玛丽·安托瓦内特没有被送上断头台。她在乡下过着简朴的生活，帮助那些贫困的农民。"
    h "虽然这不是真实的历史，但它让我们思考：在追求正义的同时，我们是否也应该保持人道主义的关怀？"
    fulina "正义不是冰冷的法律条文，它也应该有温度。"

    python:
        save_script_progress("french_revolution", "dramatic")

    jump fr_curtain_call

# ============================================================
# 结局三：往生结局（收集全部6个亡魂碎片）
# ============================================================

label fr_afterlife_ending:
    scene bg ghost_world
    show h ghost
    show marie_ghost
    show louis_ghost
    show robespierre_ghost
    show napoleon_ghost

    h "我是往生堂的胡桃。我来带你们走了。"
    marie_ghost "我不甘心！我曾经是法兰西的王后！"
    louis_ghost "我也不甘心！我是国王，我生来就应该统治法国！"
    robespierre_ghost "我是为了革命！我所做的一切都是为了自由和平等！"
    napoleon_ghost "我是拿破仑！我是世界的征服者！"

    h "在这里，没有国王，没有王后，没有革命者，也没有征服者。"
    h "在这里，你们都是平等的灵魂。"
    h "你们都曾经活过，爱过，恨过，奋斗过。现在，是时候放下一切了。"

    marie_ghost "（平静）是啊，一切都过去了。"
    louis_ghost "我错了。我只顾着自己享乐，却忘记了人民的疾苦。"
    robespierre_ghost "我也错了。我为了追求绝对的正义，却变成了一个暴君。"
    napoleon_ghost "我也错了。我为了自己的野心，让无数人失去了生命。"

    h "愿你们的灵魂安息。历史会记住你们的功过。"
    fulina "（旁白）胡桃为所有在法国大革命中死去的人举办了一场盛大的送别仪式。"
    h "历史不能改变，但我们可以从历史中吸取教训。"
    h "我们要珍惜今天的和平与自由，努力创造一个更加公平、正义、美好的世界。"

    python:
        save_script_progress("french_revolution", "afterlife")

    jump fr_curtain_call

# ============================================================
# 谢幕复盘（curtain_call）
# 使用JSON数据文件中的测试题
# ============================================================

label fr_curtain_call:
    scene bg opera_house
    show f normal
    show h normal at right

    fulina "演出圆满结束！感谢各位观众的观看！"
    h "现在，让我们一起来复盘今天学到的所有知识点吧。"

    # 知识点速查
    fulina "首先，我们来回顾一下历史知识点："
    fulina "1. 法国大革命的根本原因：封建专制制度阻碍资本主义发展"
    fulina "2. 导火线：1789年三级会议召开"
    fulina "3. 开始标志：1789年7月14日攻占巴士底狱"
    fulina "4. 纲领性文件：《人权宣言》，宣称人生而自由平等"
    fulina "5. 1791年宪法：确立君主立宪制，实行三权分立"
    fulina "6. 1792年：法兰西第一共和国成立"
    fulina "7. 1793年：路易十六被处死"
    fulina "8. 雅各宾派统治：革命达到高潮"
    fulina "9. 1794年：热月政变，雅各宾派统治结束"
    fulina "10. 1804年：拿破仑建立法兰西第一帝国，颁布《拿破仑法典》"
    fulina "11. 拿破仑对外战争：具有双重性质"
    fulina "12. 法国大革命的意义：摧毁封建统治，传播自由民主思想，具有世界影响"

    h "接下来是道法知识点："
    h "1. 自由：自由是在法律范围内的权利，法治标定自由的界限，也保障自由"
    h "2. 平等：法律面前人人平等，任何人都没有超越法律的特权"
    h "3. 公平：包括权利公平、规则公平、机会公平，是个人和社会发展的保障"
    h "4. 正义：是社会文明的尺度，法治追求的基本价值目标，司法是维护正义的最后一道防线"

    # 从JSON数据加载测试题
    python:
        import json
        quiz_score = 0
        quiz_total = 0
        _q_answered_correctly = False

        # 加载quiz_questions.json
        try:
            with open(renpy.loader.transfn("data/quiz_questions.json"), "r", encoding="utf-8") as qf:
                all_quizzes = json.load(qf)
                quiz_list = all_quizzes.get("french_revolution", [])
        except:
            quiz_list = []

    fulina "现在，我们来做一个小小的知识测试，看看大家掌握得怎么样！"

    # 逐题展示（使用JSON数据）
    $ _qi = 0
    while _qi < len(quiz_list):
        python:
            q = quiz_list[_qi]
            quiz_total += 1
            store._q_text = q.get("question", "")
            store._q_options = q.get("options", [])
            store._q_correct = q.get("answer", 0)
            store._q_explanation = q.get("explanation", "")
            store._q_subject = q.get("subject", "综合")
            store._q_idx = _qi + 1
            store._q_answered_correctly = False

        call fr_quiz_question

        if _q_answered_correctly:
            $ quiz_score += 1

        $ _qi += 1

    # 显示测试结果
    h "测试结束！你答对了 [quiz_score]/[quiz_total] 题。"
    if quiz_score == quiz_total:
        h "太棒了！你已经完全掌握了法国大革命的所有知识点！"
    elif quiz_score >= quiz_total * 0.6:
        h "不错！大部分知识点都掌握了，再巩固一下薄弱环节就更好了。"
    else:
        h "还需要多加复习哦。建议重新体验一遍剧本，关注知识点讲解部分。"

    fulina "希望大家在玩游戏的同时，也能学到有用的知识。"
    fulina "我们下次时空剧场再见！"

    return

# ============================================================
# 测试题单题展示（从JSON数据驱动）
# ============================================================

label fr_quiz_question:
    # 根据科目显示题目
    if _q_subject == "历史":
        fulina "第[_q_idx]题（历史）：[_q_text]"
    elif _q_subject == "道法":
        h "第[_q_idx]题（道法）：[_q_text]"
    else:
        fulina "第[_q_idx]题（综合）：[_q_text]"

    # 初始化用户选择
    $ _q_chosen_idx = -1

    # 动态生成菜单选项（最多4个选项）
    python:
        # 构建选项列表，确保至少有4个选项位
        menu_opts = list(store._q_options)
        while len(menu_opts) < 4:
            menu_opts.append("（无）")

    menu:
        "[menu_opts[0]]":
            $ _q_chosen_idx = 0
        "[menu_opts[1]]":
            $ _q_chosen_idx = 1
        "[menu_opts[2]]":
            $ _q_chosen_idx = 2
        "[menu_opts[3]]":
            $ _q_chosen_idx = 3

    # 判断答案
    python:
        store._q_answered_correctly = (store._q_chosen_idx == store._q_correct)
        correct_text = store._q_options[store._q_correct] if store._q_correct < len(store._q_options) else ""

    if _q_answered_correctly:
        if _q_subject == "历史":
            fulina "答对了！正确答案是{b}[correct_text]{/b}。[_q_explanation]"
        elif _q_subject == "道法":
            h "答对了！正确答案是{b}[correct_text]{/b}。[_q_explanation]"
        else:
            fulina "答对了！正确答案是{b}[correct_text]{/b}。[_q_explanation]"
    else:
        if _q_subject == "历史":
            fulina "答错了。正确答案是{b}[correct_text]{/b}。[_q_explanation]"
        elif _q_subject == "道法":
            h "答错了。正确答案是{b}[correct_text]{/b}。[_q_explanation]"
        else:
            fulina "答错了。正确答案是{b}[correct_text]{/b}。[_q_explanation]"

    return

# ============================================================
# 幕次切换效果（黑屏 -> 幕次标题 -> 淡入）
# ============================================================

label act_transition(act_title, act_subtitle):
    scene black with dissolve
    pause 1.0

    scene black
    centered "{size=60}{color=#d4a574}[act_title]{/color}{/size}"
    pause 1.5

    centered "{size=36}{color=#aabbcc}[act_subtitle]{/color}{/size}"
    pause 1.5

    scene black with dissolve
    pause 0.5

    return
