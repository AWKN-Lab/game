/**
 * script-registry.js — 剧本注册表（全局唯一数据源）
 * 所有页面通过 <script src="script-registry.js"> 引入
 */
window.SCRIPT_REGISTRY = {
  french_revolution: {
    id: 'french_revolution', name: '法国大革命', file: 'game-scene.html',
    subtitle: '自由、平等、博爱——革命的代价与启示',
    era: '1789-1799', difficulty: '★★★★☆',
    collectibles: 5, knowledgePoints: 16,
    bgImage: 'images/bg/french_revolution_card.jpg',
    facts: [
      '7月14日是法国的国庆日，纪念1789年攻占巴士底狱。',
      '法国大革命中，国民议会通过了《人权宣言》，宣告了人权、自由、平等的原则。',
      '路易十六在位期间，法国面临严重的财政危机，这是大革命爆发的重要原因之一。',
      '拿破仑法典确立了法律面前人人平等的原则，对世界各国的法律体系产生了深远影响。',
      '法国大革命持续了约十年（1789-1799），彻底改变了法国乃至欧洲的政治格局。'
    ]
  },
  american_revolution: {
    id: 'american_revolution', name: '美国独立战争', file: 'american_revolution.html',
    subtitle: '自由星火——从抗争到建国',
    era: '1775-1783', difficulty: '★★★☆☆',
    collectibles: 5, knowledgePoints: 10,
    bgImage: 'images/bg/independence_hall.jpg',
    facts: [
      '1773年波士顿倾茶事件是美国独立战争的导火线。',
      '1776年7月4日《独立宣言》发表，宣告美利坚合众国诞生。',
      '1787年宪法确立了三权分立原则，成为世界宪政典范。',
      '萨拉托加大捷是美国独立战争的转折点，此后法国开始援助美国。',
      '美国独立战争既是一场民族解放战争，也是一场资产阶级革命。'
    ]
  },
  industrial_revolution: {
    id: 'industrial_revolution', name: '蒸汽时代的光与影', file: 'industrial_revolution.html',
    subtitle: '机器轰鸣下的进步与代价',
    era: '1760-1840', difficulty: '★★★☆☆',
    collectibles: 5, knowledgePoints: 13,
    bgImage: 'images/bg/industrial_revolution_card.jpg',
    facts: [
      '工业革命最早开始于18世纪60年代的英国纺织业。',
      '瓦特改良蒸汽机是工业革命最重要的发明之一。',
      '1833年英国《工厂法》规定9岁以下儿童不得在纺织厂工作。',
      '工业革命形成了工业资产阶级和工业无产阶级两大对立阶级。',
      '史蒂芬孙发明了蒸汽机车，开启了铁路运输时代。'
    ]
  },
  wuxu_reform: {
    id: 'wuxu_reform', name: '戊戌变法', file: 'wuxu_reform.html',
    subtitle: '百日维新——变法图强的悲壮尝试',
    era: '1898', difficulty: '★★★☆☆',
    collectibles: 4, knowledgePoints: 10,
    bgImage: 'images/bg/wuxu_study.jpg',
    facts: [
      '1895年公车上书拉开了戊戌变法的序幕。',
      '戊戌变法从1898年6月11日到9月21日，仅持续103天，史称"百日维新"。',
      '谭嗣同等六人被杀害，史称"戊戌六君子"。',
      '戊戌变法是一场自上而下的资产阶级改良运动。',
      '戊戌变法虽然失败，但起到了思想启蒙的作用。'
    ]
  },
  xinhai_revolution: {
    id: 'xinhai_revolution', name: '辛亥革命', file: 'xinhai_revolution.html',
    subtitle: '共和破晓——帝制的终结',
    era: '1911-1912', difficulty: '★★★★☆',
    collectibles: 6, knowledgePoints: 15,
    bgImage: 'images/bg/wuchang_1911.jpg',
    facts: [
      '1911年10月10日武昌起义爆发，因农历辛亥年而得名"辛亥革命"。',
      '孙中山提出的三民主义是辛亥革命的指导思想。',
      '《中华民国临时约法》是中国第一部具有资产阶级共和国宪法性质的文件。',
      '辛亥革命推翻了清王朝，结束了中国两千多年的封建君主专制制度。',
      '辛亥革命使民主共和观念深入人心，任何复辟帝制的企图都必然失败。'
    ]
  }
};
