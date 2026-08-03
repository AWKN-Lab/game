// ============================================================
// 5 个剧本的 ESSAY_CHALLENGE 配置
// 每个剧本 1 道论述题，12 个句块（4正确+2相似+3错误+3同剧本混淆）
// ============================================================

var FRENCH_REVOLUTION_ESSAY = {
  prompt: "法国大革命不仅深刻改变了法国，也对世界历史产生了深远影响。请结合所学知识，从观点、史实、道法原理和启示四个方面，论述法国大革命对中国近代革命的启示。",
  slots: [
    { id: "opinion", label: "观点句", correctBlockId: "fr_b1" },
    { id: "fact", label: "历史史实句", correctBlockId: "fr_b2" },
    { id: "principle", label: "道法原理句", correctBlockId: "fr_b3" },
    { id: "conclusion", label: "结论/启示句", correctBlockId: "fr_b4" }
  ],
  pool: [
    { id: "fr_b1", text: "法国大革命传播的自由民主进步思想，为近代中国探索救国道路提供了重要的思想借鉴。", targetSlotId: "opinion", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["fr_h12"] },
    { id: "fr_b2", text: "1789年法国大革命摧毁了封建专制统治，1791年宪法确立三权分立原则，这些实践推动了19世纪全球资本主义革命浪潮。", targetSlotId: "fact", type: "correct", sourceAct: 3, sourceKnowledgeIds: ["fr_h4", "fr_h5", "fr_h12"] },
    { id: "fr_b3", text: "自由与法治相互联系、不可分割：法治标定了自由的界限，同时也是自由的保障，不违法的自由才是真正的自由。", targetSlotId: "principle", type: "correct", sourceAct: 2, sourceKnowledgeIds: ["fr_d2"] },
    { id: "fr_b4", text: "启示我们：在推进民主法治建设的过程中，既要保障公民的自由权利，又要维护社会的公平正义，实现自由与法治的统一。", targetSlotId: "conclusion", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["fr_d4", "fr_d6"] },
    { id: "fr_b5", text: "法国大革命传播的绝对自由理念，为近代中国追求完全不受限制的自由权利提供了直接的理论依据。", targetSlotId: "opinion", type: "similar", sourceAct: 2, sourceKnowledgeIds: ["fr_d1"] },
    { id: "fr_b6", text: "1789年《人权宣言》宣告了人人生而平等、法治保障自由的原则，成为法国大革命和世界民主运动的纲领性文件。", targetSlotId: "fact", type: "similar", sourceAct: 3, sourceKnowledgeIds: ["fr_h4"] },
    { id: "fr_b7", text: "自由就是为所欲为，不受任何法律和制度的约束，法国大革命充分证明了这一点。", targetSlotId: "principle", type: "wrong", sourceAct: 2, sourceKnowledgeIds: [] },
    { id: "fr_b8", text: "1789年拿破仑发动雾月政变，建立法兰西第一帝国，颁布《拿破仑法典》推动了欧洲的封建制度复兴。", targetSlotId: "fact", type: "wrong", sourceAct: 5, sourceKnowledgeIds: [] },
    { id: "fr_b9", text: "法国大革命的启示是：只有通过暴力革命推翻一切旧制度，才能实现真正的社会进步和人民幸福。", targetSlotId: "conclusion", type: "wrong", sourceAct: 4, sourceKnowledgeIds: [] },
    { id: "fr_b10", text: "公平通常指人们基于一定标准或原则，处理事情合情合理、不偏不倚，包括权利公平、规则公平、机会公平。", targetSlotId: "principle", type: "cross_script_context", sourceAct: 1, sourceKnowledgeIds: ["fr_d4"] },
    { id: "fr_b11", text: "拿破仑对外战争具有双重性质：既打击了欧洲封建势力、传播了革命思想，又侵犯了被征服国家的利益。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 5, sourceKnowledgeIds: ["fr_h11"] },
    { id: "fr_b12", text: "1793年路易十六被处死，标志着法国封建君主制的终结，雅各宾派掌权使大革命达到高潮。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 4, sourceKnowledgeIds: ["fr_h7", "fr_h8"] }
  ],
  explanations: {
    opinion: {
      correct: "观点句需要明确指出法国大革命对中国近代革命的启示方向，自由民主进步思想提供了思想借鉴，紧扣题目要求。",
      whyNot: "fr_b5 错在将“自由”曲解为“绝对自由”，与道法课本中“自由是有限制的、相对的”这一核心观点矛盾。fr_b6 虽然内容正确，但它是具体文献评价，不是观点概括句。"
    },
    fact: {
      correct: "史实句需要列举法国大革命中的关键事件，并说明其对世界革命的影响，形成完整的史实支撑。",
      whyNot: "fr_b6 内容正确但过于聚焦《人权宣言》单一文献，缺少对大革命整体进程和世界影响的概括。fr_b8 存在严重史实错误。fr_b11 和 fr_b12 虽然史实正确，但与本题“对中国近代革命的启示”主题不直接相关。"
    },
    principle: {
      correct: "道法原理句需要引用课本中的核心原理，自由与法治的关系是法国大革命留给后世最重要的制度遗产。",
      whyNot: "fr_b7 将自由等同于为所欲为，与课本核心观点完全相反。fr_b10 关于公平正义的表述本身正确，但本题讨论的是自由与法治的关系。"
    },
    conclusion: {
      correct: "结论句需要将史实与原理结合，提出对当代中国民主法治建设的启示，体现“理论+史实+现实”的三段式论述结构。",
      whyNot: "fr_b9 过于极端化，“只有暴力革命”的说法不符合课本对改革与革命关系的论述。"
    }
  },
  modelAnswer: "法国大革命传播的自由民主进步思想，为近代中国探索救国道路提供了重要的思想借鉴。1789年法国大革命摧毁了封建专制统治，1791年宪法确立三权分立原则，这些实践推动了19世纪全球资本主义革命浪潮。自由与法治相互联系、不可分割：法治标定了自由的界限，同时也是自由的保障，不违法的自由才是真正的自由。启示我们：在推进民主法治建设的过程中，既要保障公民的自由权利，又要维护社会的公平正义，实现自由与法治的统一。"
};

var INDUSTRIAL_REVOLUTION_ESSAY = {
  prompt: "工业革命极大地推动了人类社会进步，但也带来了严重的社会问题。请结合所学知识，从观点、史实、道法原理和启示四个方面，论述工业革命对社会公平的双重影响。",
  slots: [
    { id: "opinion", label: "观点句", correctBlockId: "ir_b1" },
    { id: "fact", label: "历史史实句", correctBlockId: "ir_b2" },
    { id: "principle", label: "道法原理句", correctBlockId: "ir_b3" },
    { id: "conclusion", label: "结论/启示句", correctBlockId: "ir_b4" }
  ],
  pool: [
    { id: "ir_b1", text: "工业革命是一把双刃剑，在极大提高生产力的同时，也加剧了社会贫富分化，对社会公平产生了深远影响。", targetSlotId: "opinion", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["ir_h5", "ir_h6"] },
    { id: "ir_b2", text: "工业革命期间，工厂主获得巨额利润，而工人劳动条件恶劣、工资低廉，童工现象普遍，形成了尖锐的阶级对立。", targetSlotId: "fact", type: "correct", sourceAct: 3, sourceKnowledgeIds: ["ir_h3", "ir_h6"] },
    { id: "ir_b3", text: "公平是个人生存和发展的重要保障，正义是社会制度的重要价值。维护社会公平需要关注弱势群体，保障劳动者合法权益。", targetSlotId: "principle", type: "correct", sourceAct: 3, sourceKnowledgeIds: ["ir_d2", "ir_d3"] },
    { id: "ir_b4", text: "启示我们：在推动科技创新和经济发展的同时，必须完善社会保障制度，关注弱势群体，走共同富裕的发展道路。", targetSlotId: "conclusion", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["ir_d6", "ir_d5"] },
    { id: "ir_b5", text: "工业革命在提高社会生产力的同时，也带来了环境污染和资源浪费等问题，对社会可持续发展构成了严峻挑战。", targetSlotId: "opinion", type: "similar", sourceAct: 5, sourceKnowledgeIds: ["ir_h6", "ir_d5"] },
    { id: "ir_b6", text: "工业革命使英国成为世界工厂，资本主义世界市场初步形成，西方先进、东方落后的世界格局由此确立。", targetSlotId: "fact", type: "similar", sourceAct: 5, sourceKnowledgeIds: ["ir_h7", "ir_h8"] },
    { id: "ir_b7", text: "工业革命使所有社会成员的生活水平都得到了显著提高，工人阶级与资本家共享了经济发展的成果。", targetSlotId: "fact", type: "wrong", sourceAct: 3, sourceKnowledgeIds: [] },
    { id: "ir_b8", text: "公平就是平均主义，要求所有人获得完全相同的收入和财富，这样才能实现真正的社会正义。", targetSlotId: "principle", type: "wrong", sourceAct: 3, sourceKnowledgeIds: [] },
    { id: "ir_b9", text: "科技创新只会带来社会问题，因此我们应该停止技术创新，回归传统手工生产方式。", targetSlotId: "conclusion", type: "wrong", sourceAct: 2, sourceKnowledgeIds: [] },
    { id: "ir_b10", text: "创新是引领发展的第一动力，科技创新能力已经成为综合国力竞争的决定性因素。", targetSlotId: "principle", type: "cross_script_context", sourceAct: 2, sourceKnowledgeIds: ["ir_d4"] },
    { id: "ir_b11", text: "1785年瓦特改良蒸汽机投入使用，人类进入蒸汽时代，蒸汽机是工业革命中最伟大的发明。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 2, sourceKnowledgeIds: ["ir_h2"] },
    { id: "ir_b12", text: "劳动是财富的源泉，也是幸福的源泉。人世间的美好梦想，都是通过劳动实现的。", targetSlotId: "principle", type: "cross_script_context", sourceAct: 1, sourceKnowledgeIds: ["ir_d1"] }
  ],
  explanations: {
    opinion: {
      correct: "观点句需要点明工业革命的双重性质，既推动生产力发展，又加剧社会不公平，紧扣“双重影响”的题目要求。",
      whyNot: "ir_b5 虽然提到了双重影响，但焦点放在了环境污染和可持续发展上，偏离了本题“社会公平”的主题。"
    },
    fact: {
      correct: "史实句需要具体描述工业革命中社会不公平的表现，用史实支撑“双重影响”的观点。",
      whyNot: "ir_b6 讲的是工业革命的世界影响和格局变化，与社会公平主题无关。ir_b7 严重违背史实，工业革命并未让所有社会成员受益。"
    },
    principle: {
      correct: "道法原理句需要引用公平正义的核心概念，并联系维护弱势群体权益的具体要求，将历史现象上升到理论高度。",
      whyNot: "ir_b8 将公平等同于平均主义，是课本明确反对的错误观点。ir_b10 和 ir_b12 虽然本身正确，但与本题“社会公平”主题不匹配。"
    },
    conclusion: {
      correct: "结论句需要从历史中提炼启示，经济发展与社会公平并重，走共同富裕道路，体现“史实→原理→现实”的论述逻辑。",
      whyNot: "ir_b9 全盘否定科技创新，与课本“创新是引领发展的第一动力”的核心观点矛盾。"
    }
  },
  modelAnswer: "工业革命是一把双刃剑，在极大提高生产力的同时，也加剧了社会贫富分化，对社会公平产生了深远影响。工业革命期间，工厂主获得巨额利润，而工人劳动条件恶劣、工资低廉，童工现象普遍，形成了尖锐的阶级对立。公平是个人生存和发展的重要保障，正义是社会制度的重要价值。维护社会公平需要关注弱势群体，保障劳动者合法权益。启示我们：在推动科技创新和经济发展的同时，必须完善社会保障制度，关注弱势群体，走共同富裕的发展道路。"
};

var AMERICAN_REVOLUTION_ESSAY = {
  prompt: "美国独立战争不仅结束了英国殖民统治，还通过1787年宪法确立了三权分立的政治体制。请结合所学知识，从观点、史实、道法原理和启示四个方面，论述三权分立原则对现代法治的意义。",
  slots: [
    { id: "opinion", label: "观点句", correctBlockId: "ar_b1" },
    { id: "fact", label: "历史史实句", correctBlockId: "ar_b2" },
    { id: "principle", label: "道法原理句", correctBlockId: "ar_b3" },
    { id: "conclusion", label: "结论/启示句", correctBlockId: "ar_b4" }
  ],
  pool: [
    { id: "ar_b1", text: "三权分立原则通过将国家权力分为行政、立法、司法三个独立部分并相互制衡，有效防止了权力滥用，成为现代法治国家的重要制度基石。", targetSlotId: "opinion", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["k_constitution", "k_separation"] },
    { id: "ar_b2", text: "1787年美国宪法规定：行政权归总统，立法权归国会，司法权归最高法院，三权相互制衡，确立了联邦制共和国体制。", targetSlotId: "fact", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["k_constitution", "k_separation"] },
    { id: "ar_b3", text: "规范国家权力运行以保障公民权利，是法治的核心价值追求。权力的合理配置和有效制约，是维护社会公平正义的制度保障。", targetSlotId: "principle", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["k_separation"] },
    { id: "ar_b4", text: "启示我们：建设法治国家需要完善权力制约和监督体系，确保权力在法治轨道上运行，切实保障公民的合法权益。", targetSlotId: "conclusion", type: "correct", sourceAct: 6, sourceKnowledgeIds: ["k_legacy"] },
    { id: "ar_b5", text: "三权分立原则将国家权力绝对分离为三个互不关联的部分，每个部门完全独立运作，不受其他部门的任何影响。", targetSlotId: "opinion", type: "similar", sourceAct: 5, sourceKnowledgeIds: ["k_separation"] },
    { id: "ar_b6", text: "1776年《独立宣言》提出“人人生而平等”，宣告了美利坚合众国的诞生，是美国资产阶级革命的重要法律文献。", targetSlotId: "fact", type: "similar", sourceAct: 3, sourceKnowledgeIds: ["k_declaration"] },
    { id: "ar_b7", text: "三权分立原则意味着立法权高于行政权和司法权，国会有权随时否决总统的决定和最高法院的判决。", targetSlotId: "principle", type: "wrong", sourceAct: 5, sourceKnowledgeIds: [] },
    { id: "ar_b8", text: "1787年美国宪法确立了君主立宪制政体，由乔治·华盛顿担任终身国王，三权分立保障了王权的合法行使。", targetSlotId: "fact", type: "wrong", sourceAct: 5, sourceKnowledgeIds: [] },
    { id: "ar_b9", text: "三权分立原则只适用于美国，对其他国家的法治建设没有任何借鉴意义和参考价值。", targetSlotId: "conclusion", type: "wrong", sourceAct: 5, sourceKnowledgeIds: [] },
    { id: "ar_b10", text: "美国独立战争既是一场民族解放战争，也是一场资产阶级革命，具有双重性质。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 5, sourceKnowledgeIds: ["k_war_nature"] },
    { id: "ar_b11", text: "1775年莱克星顿的枪声标志着美国独立战争正式爆发，1777年萨拉托加大捷是战争的转折点。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 2, sourceKnowledgeIds: ["k_lexington", "k_saratoga"] },
    { id: "ar_b12", text: "国家利益反映广大人民的共同需求，是人民利益的集中表现。在当代中国，国家利益与人民利益是高度统一的。", targetSlotId: "principle", type: "cross_script_context", sourceAct: 1, sourceKnowledgeIds: ["k_national_interest"] }
  ],
  explanations: {
    opinion: {
      correct: "观点句需要概括三权分立的核心价值，通过分权制衡防止权力滥用，并点明其对现代法治的基石作用。",
      whyNot: "ar_b5 错在将“分立”曲解为“绝对分离”，三权分立的核心是“相互制衡”而非“互不关联”。"
    },
    fact: {
      correct: "史实句需要准确描述1787年宪法中三权分立的具体内容，形成完整的制度描述。",
      whyNot: "ar_b6 讲的是《独立宣言》而非1787年宪法。ar_b8 存在严重史实错误。ar_b10 和 ar_b11 虽然史实正确，但讲的是战争过程和性质，与三权分立无关。"
    },
    principle: {
      correct: "道法原理句需要上升到法治的核心价值，规范权力运行以保障公民权利，将三权分立与法治精神联系起来。",
      whyNot: "ar_b7 完全曲解了三权分立的原则。ar_b12 讲的是国家利益，与权力制约无关。"
    },
    conclusion: {
      correct: "结论句需要从三权分立的历史实践中提炼对当代法治建设的启示，完善权力制约体系、保障公民权利。",
      whyNot: "ar_b9 过于绝对化，三权分立作为制度设计经验对各国法治建设都有参考价值。"
    }
  },
  modelAnswer: "三权分立原则通过将国家权力分为行政、立法、司法三个独立部分并相互制衡，有效防止了权力滥用，成为现代法治国家的重要制度基石。1787年美国宪法规定：行政权归总统，立法权归国会，司法权归最高法院，三权相互制衡，确立了联邦制共和国体制。规范国家权力运行以保障公民权利，是法治的核心价值追求。权力的合理配置和有效制约，是维护社会公平正义的制度保障。启示我们：建设法治国家需要完善权力制约和监督体系，确保权力在法治轨道上运行，切实保障公民的合法权益。"
};

var WUXU_REFORM_ESSAY = {
  prompt: "戊戌变法虽然失败了，但维新派人士展现出的强烈社会责任感至今仍具有深刻的现实意义。请结合所学知识，从观点、史实、道法原理和启示四个方面，论述从戊戌变法看改革者的社会责任。",
  slots: [
    { id: "opinion", label: "观点句", correctBlockId: "wr_b1" },
    { id: "fact", label: "历史史实句", correctBlockId: "wr_b2" },
    { id: "principle", label: "道法原理句", correctBlockId: "wr_b3" },
    { id: "conclusion", label: "结论/启示句", correctBlockId: "wr_b4" }
  ],
  pool: [
    { id: "wr_b1", text: "戊戌变法中的维新派以国家民族利益为重，勇于承担变法图强的历史责任，体现了强烈的社会责任感和爱国情怀。", targetSlotId: "opinion", type: "correct", sourceAct: 3, sourceKnowledgeIds: ["k_wuxu_06", "k_wuxu_d2"] },
    { id: "wr_b2", text: "1895年公车上书拉开维新变法序幕，1898年百日维新推行政治、经济、文化、军事改革，变法失败后谭嗣同甘愿赴死以唤醒国人。", targetSlotId: "fact", type: "correct", sourceAct: 1, sourceKnowledgeIds: ["k_wuxu_01", "k_wuxu_04", "k_wuxu_06"] },
    { id: "wr_b3", text: "承担责任有利于使潜能得到充分挖掘和发挥，有利于赢得他人的尊重和赞许，有利于构建和谐社会。每个人在不同角色中都承担着相应的责任。", targetSlotId: "principle", type: "correct", sourceAct: 3, sourceKnowledgeIds: ["k_wuxu_d2"] },
    { id: "wr_b4", text: "启示我们：作为新时代的青少年，应学习维新志士的家国情怀，增强社会责任感，将个人理想与国家发展紧密结合，勇于担当时代使命。", targetSlotId: "conclusion", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["k_wuxu_d1", "k_wuxu_d4"] },
    { id: "wr_b5", text: "戊戌变法中的维新派以个人政治利益为重，通过变法获取权力和地位，体现了精明的政治算计和实用主义精神。", targetSlotId: "opinion", type: "similar", sourceAct: 3, sourceKnowledgeIds: [] },
    { id: "wr_b6", text: "1898年戊戌变法涉及政治、经济、文化、军事四大领域改革，虽然仅持续103天，但在中国近代史上产生了深远影响。", targetSlotId: "fact", type: "similar", sourceAct: 2, sourceKnowledgeIds: ["k_wuxu_04", "k_wuxu_05"] },
    { id: "wr_b7", text: "承担责任只会带来代价和损失，没有任何回报，因此明智的人应该尽量避免承担社会责任。", targetSlotId: "principle", type: "wrong", sourceAct: 3, sourceKnowledgeIds: [] },
    { id: "wr_b8", text: "戊戌变法是一次自下而上的暴力革命运动，通过武装起义推翻了清朝封建统治，建立了资产阶级共和国。", targetSlotId: "fact", type: "wrong", sourceAct: 4, sourceKnowledgeIds: [] },
    { id: "wr_b9", text: "社会责任只是政府官员的事情，与普通民众和青少年无关，我们只需要做好自己的学业就够了。", targetSlotId: "conclusion", type: "wrong", sourceAct: 3, sourceKnowledgeIds: [] },
    { id: "wr_b10", text: "戊戌变法是一场自上而下的资产阶级改良运动，也是中国近代第一次思想解放运动。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 4, sourceKnowledgeIds: ["k_wuxu_08"] },
    { id: "wr_b11", text: "以爱国主义为核心的团结统一、爱好和平、勤劳勇敢、自强不息的伟大民族精神，是中华民族的精神支柱。", targetSlotId: "principle", type: "cross_script_context", sourceAct: 1, sourceKnowledgeIds: ["k_wuxu_d4"] },
    { id: "wr_b12", text: "1895年《马关条约》签订，割让台湾及澎湖列岛、赔偿白银二亿两，大大加深了中国的半殖民地化程度。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 1, sourceKnowledgeIds: ["k_wuxu_02"] }
  ],
  explanations: {
    opinion: {
      correct: "观点句需要概括维新派的核心精神，以国家民族利益为重、勇于承担历史责任，紧扣“社会责任”的题目要求。",
      whyNot: "wr_b5 将维新派高尚的爱国动机曲解为个人政治利益和政治算计，与历史事实和课本评价完全相反。"
    },
    fact: {
      correct: "史实句需要选取最能体现社会责任的关键事件，形成完整的史实链。",
      whyNot: "wr_b6 虽然内容正确，但只概括了变法的领域和时长，缺少具体人物和体现社会责任的事迹。wr_b8 存在严重史实错误。wr_b10 和 wr_b12 虽然史实正确，但与“社会责任”主题不直接相关。"
    },
    principle: {
      correct: "道法原理句需要阐述承担责任的意义这一核心知识点，将历史人物的事迹上升到理论高度。",
      whyNot: "wr_b7 完全否定承担责任的正面价值。wr_b11 讲的是民族精神的内涵，虽然与爱国相关，但不是本题讨论的责任概念。"
    },
    conclusion: {
      correct: "结论句需要从历史中提炼对当代青少年的启示，学习家国情怀、增强责任感、将个人与国家发展结合。",
      whyNot: "wr_b9 将社会责任局限于政府官员，与课本“每个公民都应承担社会责任”的观点矛盾。"
    }
  },
  modelAnswer: "戊戌变法中的维新派以国家民族利益为重，勇于承担变法图强的历史责任，体现了强烈的社会责任感和爱国情怀。1895年公车上书拉开维新变法序幕，1898年百日维新推行政治、经济、文化、军事改革，变法失败后谭嗣同甘愿赴死以唤醒国人。承担责任有利于使潜能得到充分挖掘和发挥，有利于赢得他人的尊重和赞许，有利于构建和谐社会。每个人在不同角色中都承担着相应的责任。启示我们：作为新时代的青少年，应学习维新志士的家国情怀，增强社会责任感，将个人理想与国家发展紧密结合，勇于担当时代使命。"
};

var XINHAI_REVOLUTION_ESSAY = {
  prompt: "辛亥革命推翻了清朝统治，结束了两千多年的封建君主专制制度，但未能改变中国半殖民地半封建社会的性质。请结合所学知识，从观点、史实、道法原理和启示四个方面，论述辛亥革命为何未能改变中国半殖民地半封建社会性质。",
  slots: [
    { id: "opinion", label: "观点句", correctBlockId: "xr_b1" },
    { id: "fact", label: "历史史实句", correctBlockId: "xr_b2" },
    { id: "principle", label: "道法原理句", correctBlockId: "xr_b3" },
    { id: "conclusion", label: "结论/启示句", correctBlockId: "xr_b4" }
  ],
  pool: [
    { id: "xr_b1", text: "辛亥革命虽然推翻了封建帝制，但由于资产阶级的软弱性和妥协性，未能完成反帝反封建的革命任务，未能改变中国半殖民地半封建的社会性质。", targetSlotId: "opinion", type: "correct", sourceAct: 4, sourceKnowledgeIds: ["k_juxianxing"] },
    { id: "xr_b2", text: "辛亥革命后，袁世凯窃取革命果实建立北洋军阀统治，帝国主义列强继续在华享有特权，封建地主土地所有制未被触动。", targetSlotId: "fact", type: "correct", sourceAct: 4, sourceKnowledgeIds: ["k_yuan_shikai", "k_juxianxing"] },
    { id: "xr_b3", text: "实现中华民族伟大复兴，必须找到符合中国国情的正确道路。辛亥革命的教训表明，资产阶级共和国的方案在中国行不通。", targetSlotId: "principle", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["k_xh_df7"] },
    { id: "xr_b4", text: "启示我们：只有坚持中国共产党的领导，走社会主义道路，才能真正实现民族独立、人民解放和国家富强。", targetSlotId: "conclusion", type: "correct", sourceAct: 5, sourceKnowledgeIds: ["k_xh_df7", "k_xh_df5"] },
    { id: "xr_b5", text: "辛亥革命彻底推翻了封建制度，结束了中国半殖民地半封建社会的历史，使中国走上了独立自主的发展道路。", targetSlotId: "opinion", type: "similar", sourceAct: 3, sourceKnowledgeIds: [] },
    { id: "xr_b6", text: "辛亥革命推翻了清朝统治，结束了两千多年的封建君主专制制度，建立了中华民国临时政府。", targetSlotId: "fact", type: "similar", sourceAct: 3, sourceKnowledgeIds: ["k_qingdi_tuiwei", "k_zhonghua_minguo"] },
    { id: "xr_b7", text: "辛亥革命失败的根本原因是革命者不够勇敢，如果谭嗣同等维新志士参与领导，革命一定会取得彻底胜利。", targetSlotId: "principle", type: "wrong", sourceAct: 4, sourceKnowledgeIds: [] },
    { id: "xr_b8", text: "辛亥革命后中国完全沦为帝国主义的殖民地，失去了所有主权和独立地位，成为西方列强的附庸。", targetSlotId: "fact", type: "wrong", sourceAct: 4, sourceKnowledgeIds: [] },
    { id: "xr_b9", text: "辛亥革命的启示是：革命永远无法解决社会问题，只有通过温和的改良和妥协才能推动社会进步。", targetSlotId: "conclusion", type: "wrong", sourceAct: 4, sourceKnowledgeIds: [] },
    { id: "xr_b10", text: "三民主义包括民族主义、民权主义和民生主义，是孙中山提出的革命指导思想。", targetSlotId: "principle", type: "cross_script_context", sourceAct: 1, sourceKnowledgeIds: ["k_sanminzhuyi"] },
    { id: "xr_b11", text: "辛亥革命使民主共和观念深入人心，从此任何复辟帝制的企图都必然失败。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 3, sourceKnowledgeIds: ["k_minzhu_gonghe"] },
    { id: "xr_b12", text: "《中华民国临时约法》是中国历史上第一部具有资产阶级共和国宪法性质的文件，规定主权属于全体国民。", targetSlotId: "fact", type: "cross_script_context", sourceAct: 3, sourceKnowledgeIds: ["k_linshi_yuefa"] }
  ],
  explanations: {
    opinion: {
      correct: "观点句需要准确概括辛亥革命的双重评价，推翻帝制的功绩与未能改变社会性质的局限，紧扣题目“为何未能改变”的要求。",
      whyNot: "xr_b5 过度夸大了辛亥革命的成果，彻底推翻封建制度和结束半殖民地半封建社会都不符合史实。"
    },
    fact: {
      correct: "史实句需要列举辛亥革命未能改变社会性质的具体证据，形成完整的论据链。",
      whyNot: "xr_b6 只讲了辛亥革命的成就，缺少对未能改变社会性质原因的史实支撑。xr_b8 严重违背史实。xr_b10、xr_b11、xr_b12 虽然史实正确，但与本题主题不直接相关。"
    },
    principle: {
      correct: "道法原理句需要从历史教训上升到理论认识，资产阶级共和国方案在中国行不通，必须找到符合国情的道路。",
      whyNot: "xr_b7 将革命失败归结为不够勇敢，完全忽略了阶级局限性这一根本原因，且人物也错配。xr_b10 讲的是三民主义内容，属于知识介绍而非原理分析。"
    },
    conclusion: {
      correct: "结论句需要从辛亥革命的教训中得出正确的历史启示，坚持党的领导和社会主义道路，体现历史与现实的逻辑联系。",
      whyNot: "xr_b9 全盘否定革命的作用，与课本对辛亥革命积极意义的肯定矛盾。"
    }
  },
  modelAnswer: "辛亥革命虽然推翻了封建帝制，但由于资产阶级的软弱性和妥协性，未能完成反帝反封建的革命任务，未能改变中国半殖民地半封建的社会性质。辛亥革命后，袁世凯窃取革命果实建立北洋军阀统治，帝国主义列强继续在华享有特权，封建地主土地所有制未被触动。实现中华民族伟大复兴，必须找到符合中国国情的正确道路。辛亥革命的教训表明，资产阶级共和国的方案在中国行不通。启示我们：只有坚持中国共产党的领导，走社会主义道路，才能真正实现民族独立、人民解放和国家富强。"
};
