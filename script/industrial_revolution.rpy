# -*- coding: utf-8 -*-
# 时空剧场 - 蒸汽时代的光与影
# 第一次工业革命 完整工程化剧本
#
# 四维数值：labor（劳动）/ justice（正义）/ responsibility（责任）/ life（生命）
# 收集品：工人日记碎片（4个）
# 结局：historical / dramatic / afterlife

# ============================================================
# 角色定义（本剧本专用NPC）
# ============================================================

define watt = Character("瓦特", color="#4682b4")
define hargreaves = Character("哈格里夫斯", color="#6a5acd")
define stephenson = Character("史蒂芬孙", color="#228b22")
define factory_owner = Character("工厂主布莱克", color="#8b4513")
define worker = Character("纺织女工玛丽", color="#d3d3d3")
define child_worker = Character("童工汤姆", color="#ffb6c1")
define slum_resident = Character("贫民窟居民", color="#a9a9a9")

# ============================================================
# 剧本入口
# ============================================================

label industrial_revolution_start:

    # 初始化剧本（设置四维数值、卡牌、收集品等）
    $ init_script("industrial_revolution")

    # 显示四维数值HUD
    show screen value_hud

    # ========================================================
    # 开场 —— 歌剧院
    # ========================================================

    scene bg opera_house with dissolve

    fulina "下一场演出开始！今天我们要走进那个充满浓烟与机器轰鸣的时代——第一次工业革命！"

    h "工业革命？就是那个让人类从手工劳动变成机器生产的时代对吧？"

    fulina "没错！我将扮演工厂主的女儿伊莎贝拉，亲眼见证蒸汽时代的到来！"

    h "那我就扮演一个名叫莉莉的纺织女工，看看普通工人在那个时代的生活。"

    fulina "准备好了吗？让我们回到1760年代的英国——"

    pause 1.0

    # ========================================================
    # 第一幕：珍妮机的诞生
    # ========================================================

    $ current_act = 1

    scene black with dissolve
    centered "{size=40}{color=#d4a574}第一幕{/color}{/size}\n\n{size=28}珍妮机的诞生{/size}"
    pause 2.0

    scene bg cotton_mill_1760 with dissolve

    worker "莉莉，快点！今天要织完十匹布，不然又要被扣工资了！"

    h "知道了，玛丽阿姨。可是手摇纺车太慢了，我怎么也赶不完。"

    fulina "（好奇地打量着简陋的纺车）你们每天这样工作，能赚多少钱？"

    worker "一天工作十六个小时，只能赚半个便士。勉强够买两个黑面包。"

    h "十六个小时……连孩子也要这样工作吗？"

    worker "当然。我的小儿子才六岁，已经在矿场里干活了。"

    fulina "（沉默）……这真是令人心酸。"

    scene bg steam_workshop with dissolve

    show hargreaves

    hargreaves "我有一个想法！如果用机器代替手工纺纱，效率会提高几十倍！"

    hargreaves "看！我发明了珍妮纺纱机！一次能纺出八根纱线！"

    h "（惊讶）八根！这比手摇纺车快了八倍！"

    fulina "（兴奋）生产工具的革新，往往标志着一个新时代的到来。"

    menu:
        "珍妮机的发明为什么是工业革命开始的标志？"

        "它极大提高了生产效率":
            $ change_value("labor", 15)
            h "对！生产工具的革新是生产力发展的重要标志。珍妮机让纺纱效率提高了八倍以上！"

        "它是第一台真正意义上的机器":
            $ change_value("labor", 10)
            fulina "没错！珍妮机的发明标志着人类从手工劳动向机器生产的重大转变。"

        "它推动了其他行业的技术革新":
            $ change_value("labor", 10)
            hargreaves "说得对！很快，织布、采矿、冶金，所有行业都会被机器改变！"

    h "珍妮机的发明，就像一颗火种，点燃了整个工业革命的火焰。"

    fulina "从1765年开始，英国的手工工场逐渐被机器工厂取代，一个崭新的时代拉开了序幕。"

    pause 1.0

    # ========================================================
    # 第二幕：蒸汽机的怒吼
    # ========================================================

    $ current_act = 2

    scene black with dissolve
    centered "{size=40}{color=#d4a574}第二幕{/color}{/size}\n\n{size=28}蒸汽机的怒吼{/size}"
    pause 2.0

    scene bg steam_workshop with dissolve

    show watt

    watt "珍妮机虽然好，但它还需要人力驱动。如果能找到一种更强大的动力……"

    watt "我改良了蒸汽机！它可以为任何机器提供动力！"

    play sound "steam_hiss.wav"

    fulina "（惊叹）太神奇了！机器自己动起来了！不需要人力、畜力，也不需要风力和水力！"

    watt "蒸汽机的意义不仅在于它本身，更在于它可以驱动一切机器。"

    watt "纺织厂、矿山、冶炼厂……所有地方都可以使用蒸汽机作为动力！"

    h "所以人类从此进入了蒸汽时代？"

    watt "是的。1785年，我的改良蒸汽机被广泛应用于工业生产，改变了整个世界。"

    menu:
        "你认为蒸汽机的发明是好事还是坏事？"

        "绝对是好事，极大提高了生产力":
            $ change_value("labor", 10)
            fulina "没错！蒸汽机让人类摆脱了对自然力的依赖，生产力实现了飞跃式发展！"

        "有好有坏，科技是一把双刃剑":
            $ change_value("justice", 15)
            h "科技能造福人类，但如果使用不当，也会带来灾难。关键在于人类如何使用它。"

        "对工人来说未必是好事，很多人因此失业":
            $ change_value("life", 10)
            h "很多手工工人因为机器的出现而失业，生活更加艰难。技术进步的代价，往往由最底层的人承担。"

    fulina "蒸汽机的广泛应用，标志着工业革命进入了核心阶段。"

    h "英国的生产力飞速增长，'世界工厂'的称号正在形成。"

    # --- 收集品：手工工人日记碎片（蒸汽机发明后自动获得）---

    $ add_collectible("handicraft_worker_diary", "手工工人日记碎片")
    show screen collectible_notification("手工工人日记碎片")
    pause 3.0
    hide screen collectible_notification

    h "等等……我在地上发现了一本破旧的日记。"

    h "（翻开日记，轻声念道）'1769年，蒸汽机来了。我的手艺不再值钱，二十年的纺纱经验，抵不过一台冰冷的机器。'"

    fulina "（低声）这是手工工人的心声……技术进步的背后，是无数人的失落。"

    h "我们把它带上吧。这些声音不应该被遗忘。"

    pause 1.0

    # ========================================================
    # 第三幕：工厂的阴影
    # ========================================================

    $ current_act = 3

    scene black with dissolve
    centered "{size=40}{color=#d4a574}第三幕{/color}{/size}\n\n{size=28}工厂的阴影{/size}"
    pause 2.0

    scene bg dark_factory with dissolve

    play sound "machine_noise.wav" loop

    show factory_owner

    factory_owner "快点！都给我快点！机器不能停！谁敢偷懒，扣一天工资！"

    show child_worker

    child_worker "（剧烈咳嗽）叔叔……我好难受……喉咙里全是棉絮……我想休息一会儿。"

    factory_owner "休息？休息就没有饭吃！你全家都指望你这点工资活着呢！再偷懒就把你赶出去！"

    h "（愤怒）他才八岁！你怎么能让他干这么重的活！"

    factory_owner "我付了他工资，他就应该为我干活！这是天经地义的！"

    fulina "（震惊）每天工作十六个小时，在充满棉絮和煤灰的环境里……这些孩子连呼吸都是痛苦的。"

    h "（握紧拳头）一定有什么办法能帮助这些孩子……"

    # --- 卡牌使用节点 ---

    $ card_result = renpy.call_screen("card_use")

    if card_result == "fairness":
        $ change_value("justice", 20)
        h "公平卡生效！每个人都应该享有平等的劳动权和休息权！童工是对人权的严重侵犯！"

        fulina "公平意味着社会资源应该合理分配，而不是让最弱势的群体承受最大的苦难。"

    elif card_result == "labor":
        $ change_value("labor", 15)
        h "劳动卡生效！劳动是光荣的，但强迫儿童从事超出其能力的劳动，是对劳动精神的亵渎！"

        fulina "劳动权应该受到保护，尤其是未成年人的劳动权益。"

    elif card_result == "responsibility":
        $ change_value("responsibility", 20)
        h "责任卡生效！作为工厂主，你有责任保障工人的生命安全和基本权益！这是法律赋予你的义务！"

        fulina "企业不仅要追求利润，更要承担社会责任。这是道法课教给我们的。"

    elif card_result is not None:
        $ use_card(card_result)
        h "卡牌已使用！虽然不是最合适的卡牌，但每一份力量都有意义。"

    else:
        h "（沉默片刻）……即使没有卡牌的力量，我们也不能对这些视而不见。"

        $ change_value("justice", 5)

    # --- 收集品：童工日记碎片（使用卡牌后获得）---

    $ add_collectible("child_worker_diary", "童工日记碎片")
    show screen collectible_notification("童工日记碎片")
    pause 3.0
    hide screen collectible_notification

    child_worker "（虚弱地递过一张纸）姐姐……这是我的日记……如果你能帮我把这些话带给更多人就好了……"

    h "（接过纸片，声音颤抖）'我今年八岁，每天凌晨四点起床，在工厂里站十六个小时。我的手指被机器轧断了两根。我最大的愿望，是能和其他孩子一样去上学。'"

    fulina "（眼眶泛红）……一个八岁的孩子，不应该承受这些。"

    h "我们会记住你的。"

    stop sound

    h "你看，这些工人每天在充满棉絮和煤灰的环境里工作十六个小时，很多人不到三十岁就病死了。"

    fulina "这太可怕了……我以前从来不知道工厂里是这样的。父亲总是说工厂给人们带来了就业和财富。"

    h "财富确实被创造了，但分配极度不均。工厂主住豪宅，工人住棚屋。"

    fulina "（坚定地）一定有办法改变这一切。"

    pause 1.0

    # ========================================================
    # 第四幕：火车的轰鸣
    # ========================================================

    $ current_act = 4

    scene black with dissolve
    centered "{size=40}{color=#d4a574}第四幕{/color}{/size}\n\n{size=28}火车的轰鸣{/size}"
    pause 2.0

    scene bg steam_train_railway with dissolve

    play sound "train_whistle.wav"

    show stephenson

    stevenson "我发明了蒸汽机车——'旅行号'！它能拉着几千吨的货物，以每小时二十四公里的速度前进！"

    "人群发出阵阵惊叹。"

    stevenson "1825年，世界上第一条公共铁路在英国斯托克顿正式通车！"

    fulina "火车的出现彻底改变了人们的出行方式，也让商品的运输变得更加便捷和廉价。"

    h "以前从伦敦到曼彻斯特需要四天，现在只需要几个小时。"

    stevenson "铁路将连接整个英国，甚至整个世界！"

    menu:
        "火车和铁路的发明带来了哪些影响？"

        "极大促进了交通运输和贸易发展":
            $ change_value("labor", 10)
            fulina "没错！铁路让商品和原材料能够快速流通，极大地促进了市场经济的发展。"

        "推动了城市化进程":
            $ change_value("responsibility", 10)
            h "铁路让大量农村人口涌入城市，加速了城市化，但也带来了住房、卫生等问题。"

        "改变了人们的生活方式和对距离的认知":
            $ change_value("life", 10)
            fulina "说得对！火车缩短了时空距离，人们的生活方式发生了翻天覆地的变化。"

    h "但是，你看天空——已经被黑烟染成了灰色。河水也变黑了，里面的鱼都死了。"

    fulina "（叹气）工业的进步，似乎总是以牺牲环境为代价。"

    # --- 收集品：铁路工人日记碎片（火车发明后自动获得）---

    $ add_collectible("railway_worker_diary", "铁路工人日记碎片")
    show screen collectible_notification("铁路工人日记碎片")
    pause 3.0
    hide screen collectible_notification

    h "（在铁轨旁捡到一本沾满油污的日记）"

    h "（念道）'1830年，我们修铁路。每天从日出干到日落，手上的水泡磨成了茧。已经有三个工友被塌方埋在了路基下面。他们说这是进步的代价，可为什么代价总是我们来付？'"

    fulina "每一条铁路的枕木下，都浸透了工人的血汗。"

    h "进步是真实的，但代价也是真实的。我们不能只看到前者，而忽视后者。"

    pause 1.0

    # ========================================================
    # 第五幕：工业革命的代价
    # ========================================================

    $ current_act = 5

    scene black with dissolve
    centered "{size=40}{color=#d4a574}第五幕{/color}{/size}\n\n{size=28}工业革命的代价{/size}"
    pause 2.0

    scene bg dark_factory with dissolve

    show slum_resident

    slum_resident "欢迎来到我们的'家'。"

    fulina "（捂住口鼻）这里的空气……到处都是刺鼻的臭味。"

    slum_resident "河里淌着工厂排出的废水，空气里飘着煤烟和化学品的味道。"

    slum_resident "十户人家挤在一间棚屋里，没有自来水，没有厕所，疾病四处蔓延。"

    h "霍乱、肺结核……这些疾病在贫民窟里肆虐。"

    show worker

    worker "我们建造了工厂，建造了铁路，创造了巨大的财富，可是这些财富都到哪里去了？"

    worker "工厂主们住在豪华的别墅里，而我们却住在肮脏的贫民窟里，吃不饱穿不暖。"

    fulina "（声音颤抖）我父亲……他也是工厂主。我从小锦衣玉食，从来不知道……"

    worker "小姐，这不是您的错。但您能来看看我们，至少说明您有一颗善良的心。"

    menu:
        "工业革命带来了哪些深刻的社会问题？"

        "贫富分化加剧":
            $ change_value("justice", 10)
            h "没错！财富集中在少数人手中，工人阶级越来越贫困。资本的积累，建立在工人的血汗之上。"

        "环境污染严重":
            $ change_value("responsibility", 10)
            fulina "工厂排放的废气废水污染了空气和水源，破坏了生态环境。泰晤士河一度成为'死河'。"

        "以上都是，而且问题远比想象中严重":
            $ change_value("justice", 15)
            $ change_value("responsibility", 15)
            h "你说得对。工业革命在创造巨大财富的同时，也带来了严重的社会问题和环境问题。"
            fulina "贫富分化、环境污染、童工问题、工人权益受损……这些问题交织在一起，构成了工业革命阴暗的一面。"

    # --- 收集品：贫民窟居民日记碎片（选择后获得）---

    $ add_collectible("slum_resident_diary", "贫民窟居民日记碎片")
    show screen collectible_notification("贫民窟居民日记碎片")
    pause 3.0
    hide screen collectible_notification

    slum_resident "（颤抖着双手递过一本发黄的日记）这是我父亲留下的。他让我把它交给有缘人。"

    h "（翻开日记，缓缓念道）"

    h "'1842年，伦敦。我在工厂干了三十年，最后因为肺病被赶了出来。没有养老金，没有医疗，什么都没有。'"

    h "'我用自己的双手建设了这个帝国，可这个帝国没有给我留下任何位置。'"

    h "'如果有人看到这本日记，请记住——每一个劳动者，都值得被尊重。'"

    fulina "（泪流满面）……"

    h "四本日记碎片，四个不同的声音，却诉说着同样的苦难。"

    fulina "这就是工业革命的另一面。它带来了进步，也带来了伤痛。"

    pause 1.5

    # ========================================================
    # 结局判定
    # ========================================================

    $ ending_type = check_ending("industrial_revolution")

    if ending_type == "afterlife":
        jump industrial_afterlife_ending
    elif ending_type == "dramatic":
        jump industrial_dramatic_ending
    else:
        jump industrial_historical_ending

# ============================================================
# 结局一：历史结局（默认）
# ============================================================

label industrial_historical_ending:

    $ save_script_progress("industrial_revolution", "historical")

    scene bg opera_house with dissolve

    fulina "这就是真实的历史。英国完成了工业革命，成为了世界上第一个工业国家，号称'世界工厂'。"

    h "但是，工业革命也留下了沉重的代价。"

    fulina "从18世纪60年代到19世纪上半期，英国率先完成了工业革命。"

    fulina "珍妮机、蒸汽机、火车、汽船……一系列发明创造极大地提高了社会生产力。"

    h "然而，生产力的发展并没有惠及所有人。工人阶级在极其恶劣的环境中劳动，儿童被迫成为廉价劳动力。"

    fulina "贫富分化加剧，环境污染严重，社会矛盾尖锐。"

    h "这些问题直到今天，仍然在影响着我们的世界。"

    fulina "从道法的角度看，发展经济不能以牺牲人的生命和环境为代价。"

    h "我们要在发展的同时，兼顾公平正义和可持续发展。"

    fulina "历史告诉我们，真正的进步，应该是所有人的进步。"

    jump industrial_curtain_call

# ============================================================
# 结局二：戏剧结局（responsibility>=80 且 justice>=80）
# ============================================================

label industrial_dramatic_ending:

    $ save_script_progress("industrial_revolution", "dramatic")

    scene bg cotton_mill_1760 with dissolve

    fulina "我继承了父亲的工厂，但我决定改变这一切。"

    fulina "我缩短了工人的工作时间，从每天十六小时减少到十小时。"

    fulina "我提高了工资，让每个工人都能吃饱穿暖。"

    fulina "我禁止雇佣十二岁以下的童工，并为年幼的工人开设了夜校。"

    fulina "我还安装了废气废水处理设备，发展绿色工业。"

    h "工人们终于过上了有尊严的生活，工厂周围的环境也变好了。"

    fulina "其他工厂主嘲笑我是'疯子伊莎贝拉'，说我会破产。"

    fulina "但事实证明，快乐的工人效率更高，忠诚的客户也越来越多。"

    h "原来，经济发展和环境保护、利润和良心，可以并行不悖。"

    fulina "这才是真正的可持续发展。"

    h "你用行动证明了，一个有责任心的企业家，可以改变很多。"

    fulina "不，不是我。是那些日记碎片里的人，是他们的苦难教会了我什么是真正的责任。"

    jump industrial_curtain_call

# ============================================================
# 结局三：往生结局（收集全部4个日记碎片 且 life>=80）
# ============================================================

label industrial_afterlife_ending:

    $ save_script_progress("industrial_revolution", "afterlife")

    scene bg opera_house with dissolve

    show h ghost

    h "我是往生堂的第七十七代堂主——胡桃。"

    h "我来带你们走了。"

    show worker_ghost

    worker_ghost "我们一辈子都在干活，从来没有享受过一天好日子。"

    show child_ghost

    child_ghost "我好想上学，好想和其他小朋友一起玩……可是我连做梦的时间都没有。"

    show railway_ghost

    railway_ghost "我的身体永远留在了那段铁轨下面。"

    show slum_ghost

    slum_ghost "我建设了这座城市，可这座城市没有我的容身之所。"

    h "（声音温柔而坚定）我知道你们受了很多苦。现在，一切都结束了。"

    h "（展开蝶羽）你们用自己的双手创造了一个新的时代。历史会记住你们的。"

    fulina "（旁白）胡桃为所有在工业革命中逝去的工人和儿童，举办了一场盛大的渡灵仪式。"

    h "每一个生命都值得被尊重。即使是最平凡的劳动者，也在书写着历史。"

    h "安息吧。在彼岸，没有机器的轰鸣，没有棉絮和煤灰。"

    h "只有阳光、草地，和你们从未拥有过的——自由。"

    "无数光点升上夜空，如萤火虫般闪烁，渐渐消散在银河之中。"

    jump industrial_curtain_call

# ============================================================
# 谢幕复盘
# ============================================================

label industrial_curtain_call:

    hide screen value_hud

    scene bg opera_house with dissolve

    show f normal
    show h normal at right

    fulina "演出圆满结束！现在让我们复盘今天的知识点。"

    pause 0.5

    # --- 历史知识点 ---

    fulina "【历史知识点】"

    fulina "1. 工业革命开始标志：1765年，哈格里夫斯发明珍妮纺纱机"

    fulina "2. 核心发明：1785年，瓦特改良蒸汽机，人类进入蒸汽时代"

    fulina "3. 交通运输革新：1807年富尔顿发明汽船，1825年史蒂芬孙发明火车"

    fulina "4. 生产组织变革：现代工厂制度确立，手工工场被机器工厂取代"

    fulina "5. 完成时间：1840年前后，英国率先完成工业革命"

    fulina "6. 深远影响：极大提高了社会生产力，使英国成为'世界工厂'"

    pause 0.5

    # --- 道法知识点 ---

    h "【道法知识点】"

    h "1. 劳动是财富的源泉，也是幸福的源泉。一切美好的梦想都需要通过劳动来实现。"

    h "2. 公民享有劳动权，用人单位必须保障劳动者的合法权益。"

    h "3. 科技是一把双刃剑，要趋利避害，让科技真正造福人类。"

    h "4. 发展经济不能以牺牲环境为代价，要坚持可持续发展战略。"

    h "5. 每一个劳动者都值得被尊重，无论他们的工作多么平凡。"

    h "6. 企业在追求利润的同时，应当承担相应的社会责任。"

    pause 0.5

    # --- 知识测试（从JSON数据文件加载）---
    # quiz_questions.json 中 industrial_revolution 部分的5道题

    fulina "现在进行知识测试！"

    # --- 第一题 ---

    fulina "【第一题 · 历史】工业革命开始的标志是什么？"

    menu:
        "A. 瓦特改良蒸汽机":
            fulina "答错了。瓦特改良蒸汽机是工业革命的核心发明，但不是开始的标志。"
            $ persistent.wrong_answers.append("ir_q1")
        "B. 哈格里夫斯发明珍妮机":
            fulina "答对了！1765年哈格里夫斯发明珍妮机，标志着工业革命的开始。"
            $ quiz_score += 1
        "C. 史蒂芬孙发明火车":
            fulina "答错了。火车是交通运输领域的重要发明，出现在工业革命之后。"
            $ persistent.wrong_answers.append("ir_q1")
        "D. 富尔顿发明汽船":
            fulina "答错了。汽船是水上交通运输的重要发明。"
            $ persistent.wrong_answers.append("ir_q1")

    $ quiz_total += 1

    # --- 第二题 ---

    h "【第二题 · 历史】工业革命中最重要的发明是什么？"

    menu:
        "A. 珍妮机":
            h "答错了。珍妮机是工业革命开始的标志，但不是最重要的发明。"
            $ persistent.wrong_answers.append("ir_q2")
        "B. 火车":
            h "答错了。火车是蒸汽机在交通运输领域的应用。"
            $ persistent.wrong_answers.append("ir_q2")
        "C. 瓦特改良蒸汽机":
            h "答对了！1785年瓦特改良蒸汽机，使人类进入蒸汽时代，是工业革命的核心发明。"
            $ quiz_score += 1
        "D. 汽船":
            h "答错了。汽船也是蒸汽机的应用之一。"
            $ persistent.wrong_answers.append("ir_q2")

    $ quiz_total += 1

    # --- 第三题 ---

    fulina "【第三题 · 道法】劳动的意义是什么？"

    menu:
        "A. 劳动只是为了赚钱":
            fulina "答错了。劳动的意义远不止赚钱。"
            $ persistent.wrong_answers.append("ir_q3")
        "B. 劳动是财富和幸福的源泉":
            fulina "答对了！劳动是财富的源泉、幸福的源泉，一切美好梦想通过劳动实现。"
            $ quiz_score += 1
        "C. 劳动是可有可无的":
            fulina "答错了。劳动是人类社会生存和发展的基础。"
            $ persistent.wrong_answers.append("ir_q3")
        "D. 只有体力劳动才有价值":
            fulina "答错了。体力劳动和脑力劳动都值得尊重，没有高低贵贱之分。"
            $ persistent.wrong_answers.append("ir_q3")

    $ quiz_total += 1

    # --- 第四题 ---

    h "【第四题 · 道法】工业革命带来的社会问题不包括？"

    menu:
        "A. 贫富分化加剧":
            h "答错了。贫富分化加剧是工业革命带来的重要社会问题。"
            $ persistent.wrong_answers.append("ir_q4")
        "B. 环境污染":
            h "答错了。工厂排放的废气废水造成了严重的环境污染。"
            $ persistent.wrong_answers.append("ir_q4")
        "C. 工人阶级生活改善":
            h "答对了！工业革命初期，工人阶级的生活反而恶化了。童工、长工时、恶劣环境是常态。"
            $ quiz_score += 1
        "D. 童工问题":
            h "答错了。童工问题是工业革命时期最严重的社会问题之一。"
            $ persistent.wrong_answers.append("ir_q4")

    $ quiz_total += 1

    # --- 第五题 ---

    fulina "【第五题 · 综合】从工业革命中我们应吸取什么教训？"

    menu:
        "A. 科技发展不需要考虑社会影响":
            fulina "答错了。科技发展必须考虑其社会影响和伦理后果。"
            $ persistent.wrong_answers.append("ir_q5")
        "B. 应在发展经济的同时关注社会公平和环境保护":
            fulina "答对了！这是工业革命留给我们最深刻的启示——实现经济、社会、环境的协调发展。"
            $ quiz_score += 1
        "C. 工业化是唯一的发展道路":
            fulina "答错了。不同国家应根据自身国情选择适合的发展道路。"
            $ persistent.wrong_answers.append("ir_q5")
        "D. 工人阶级的利益不重要":
            fulina "答错了。每一个社会成员的合法权益都应该受到保护。"
            $ persistent.wrong_answers.append("ir_q5")

    $ quiz_total += 1

    # --- 测试结果 ---

    pause 0.5

    fulina "测试完成！你的得分是 [quiz_score]/[quiz_total]。"

    if quiz_score >= 4:
        h "太棒了！你已经掌握了第一次工业革命的核心知识点！"
    elif quiz_score >= 3:
        h "不错！大部分知识点你都掌握了，再复习一下错题就更好了。"
    else:
        h "还需要加油哦！建议重新回顾一下今天的知识点。"

    # --- 收集品统计 ---

    fulina "收集品统计：工人日记碎片 [get_collectible_count()]/4"

    if get_collectible_count() >= 4:
        h "你收集了全部工人日记碎片！这些来自历史深处的声音，已经被你完整地保存了下来。"
    else:
        h "还有 [4 - get_collectible_count()] 个日记碎片没有找到。试着在关键节点做出不同的选择吧！"

    # --- 结尾 ---

    fulina "工业革命改变了世界，也改变了人类对自身力量的认知。"

    h "但无论技术如何进步，人始终是最重要的。"

    fulina "尊重劳动、追求正义、承担责任、珍爱生命——"

    h "这是工业革命留给我们最宝贵的遗产。"

    fulina "我们下次时空剧场再见！"

    return
