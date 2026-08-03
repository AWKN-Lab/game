/**
 * KnowledgeGraph - 知识图谱组件（D3.js 力导向星图）
 * 参考 knowledge-base.html 实现：
 * - 节点明暗层级（core/major/minor opacity）
 * - 背景星空粒子
 * - 多中心聚簇
 * - 拖拽、悬浮高亮
 */
class KnowledgeGraph {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.onNodeClick = options.onNodeClick || null;
    this.simulation = null;
    this.svg = null;

    // 科目颜色
    this.subjectColor = {
      history: '#efbd8a',
      daofa: '#b6c4ff',
      default: '#a0c0e0'
    };

    // 节点配置
    this.radiusMap = { core: 14, major: 6, minor: 4 };
    this.opacityMap = { core: 1.0, major: 0.7, minor: 0.4 };

    // 核心/大分支节点
    this.CORE_NODES = ['fr_h4','ir_h2','k_declaration','k_wuxu_08','k_sanminzhuyi'];
    this.MAJOR_NODES = ['fr_h3','fr_h12','ir_h5','ir_h8','k_lexington','k_constitution','k_wuxu_01','k_wuxu_05','k_wuchang','k_zhonghua_minguo'];

    this._init();
  }

  _init() {
    this.width = this.container.getBoundingClientRect().width;
    this.height = this.container.getBoundingClientRect().height;

    // 创建 SVG
    this.svg = d3.select(this.container).append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('display', 'block');

    // 发光滤镜定义
    const defs = this.svg.append('defs');
    this._addGlowFilter(defs, 'glow-gold', '#efbd8a', 3);
    this._addGlowFilter(defs, 'glow-blue', '#b6c4ff', 3);

    // Tooltip
    this.tooltip = d3.select(this.container).append('div')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('transition', 'opacity 0.2s')
      .style('z-index', '10')
      .style('max-width', '300px');

    // 窗口 resize
    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _addGlowFilter(defs, id, color, blur = 3) {
    const filter = defs.append('filter')
      .attr('id', id)
      .attr('x', '-50%').attr('y', '-50%')
      .attr('width', '200%').attr('height', '200%');
    filter.append('feGaussianBlur')
      .attr('stdDeviation', blur)
      .attr('result', 'coloredBlur');
    const feMerge = filter.append('feMerge');
    feMerge.append('feMergeNode').attr('in', 'coloredBlur');
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
  }

  _getSizeType(id) {
    if (this.CORE_NODES.includes(id)) return 'core';
    if (this.MAJOR_NODES.includes(id)) return 'major';
    return 'minor';
  }

  loadData(data) {
    // 清除旧内容
    this.svg.selectAll('*').remove();
    this.tooltip.html('');
    if (this.simulation) this.simulation.stop();

    // 重新创建 defs
    const defs = this.svg.append('defs');
    this._addGlowFilter(defs, 'glow-gold', '#efbd8a', 3);
    this._addGlowFilter(defs, 'glow-blue', '#b6c4ff', 3);

    const nodes = [];
    const links = [];

    // 构建节点（历史和道法统一处理）
    const categories = Object.keys(data);
    categories.forEach(cat => {
      const items = data[cat];
      if (!items || items.length === 0) return;

      items.forEach(item => {
        const sizeType = this._getSizeType(item.id);
        nodes.push({
          id: item.id,
          name: item.name,
          content: item.content,
          subject: cat,
          act: item.act,
          sizeType: sizeType,
          depth: sizeType === 'core' ? 0 : sizeType === 'major' ? 1 : 2,
          r: this.radiusMap[sizeType],
          opacity: this.opacityMap[sizeType]
        });
      });
    });

    // 连线：同科目内，非core节点连接到core节点
    nodes.forEach(node => {
      if (node.sizeType !== 'core') {
        const parent = nodes.find(n => n.subject === node.subject && n.sizeType === 'core');
        if (parent) {
          links.push({ source: parent.id, target: node.id, strength: 0.3 });
        }
      }
    });

    this._buildGraph(nodes, links);
  }

  _buildGraph(nodes, links) {
    const self = this;
    const width = this.width;
    const height = this.height;

    // 剧本中心（多中心聚簇）
    const scriptCenters = [
      { x: width * 0.3, y: height * 0.4 },
      { x: width * 0.7, y: height * 0.4 },
      { x: width * 0.5, y: height * 0.7 }
    ];

    // 为节点分配聚簇中心
    nodes.forEach((d, i) => {
      const center = scriptCenters[i % scriptCenters.length];
      d.cx = center.x;
      d.cy = center.y;
    });

    // 背景星空粒子
    const starGroup = this.svg.append('g').attr('class', 'starfield');
    for (let i = 0; i < 60; i++) {
      starGroup.append('circle')
        .attr('cx', Math.random() * width)
        .attr('cy', Math.random() * height)
        .attr('r', Math.random() * 1.5 + 0.5)
        .attr('fill', '#ffffff')
        .attr('opacity', Math.random() * 0.2 + 0.1);
    }

    // 力导向模拟
    this.simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).strength(d => d.strength || 0.2)
        .distance(d => {
          const src = nodes.find(n => n.id === d.source.id || n.id === d.source);
          const tgt = nodes.find(n => n.id === d.target.id || n.id === d.target);
          return (src && tgt) ? src.r + tgt.r + 30 : 50;
        }))
      .force('charge', d3.forceManyBody().strength(d => -80 - d.r * 4).distanceMax(200))
      .force('collision', d3.forceCollide().radius(d => d.r + 6).strength(0.8).iterations(2))
      .force('x', d3.forceX(d => d.cx).strength(0.06))
      .force('y', d3.forceY(d => d.cy).strength(0.06))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.01))
      .alpha(0.8)
      .alphaDecay(0.02);

    // 绘制连线（根据深度设置透明度）
    const link = this.svg.append('g')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('class', 'kg-link')
      .attr('stroke', d => {
        const src = nodes.find(n => n.id === (d.source.id || d.source));
        return this.subjectColor[src?.subject] || '#7f9fbf';
      })
      .attr('stroke-opacity', d => {
        const src = nodes.find(n => n.id === (d.source.id || d.source));
        const tgt = nodes.find(n => n.id === (d.target.id || d.target));
        const avgDepth = ((src?.depth || 0) + (tgt?.depth || 0)) / 2;
        return avgDepth === 0 ? 0.4 : avgDepth === 0.5 ? 0.3 : 0.15;
      })
      .attr('stroke-width', 1.2);

    // 按半径排序节点（大节点在上层）
    const sorted = [...nodes].sort((a, b) => b.r - a.r);

    // 节点组
    const nodeGroup = this.svg.append('g')
      .selectAll('g')
      .data(sorted, d => d.id)
      .enter().append('g')
      .style('cursor', 'grab');

    // 节点圆（根据深度设置明暗和发光）
    nodeGroup.append('circle')
      .attr('r', d => d.r)
      .attr('fill', d => this.subjectColor[d.subject] || this.subjectColor.default)
      .attr('opacity', d => d.opacity)
      .attr('filter', d => d.depth === 0 ? (d.subject === 'history' ? 'url(#glow-gold)' : 'url(#glow-blue)') : null)
      .attr('stroke', '#ffffff20')
      .attr('stroke-width', 1.2);

    // 文字标签
    const text = nodeGroup.append('text')
      .attr('fill', '#eef5ff')
      .attr('font-size', d => Math.min(d.r * 0.5, 12))
      .attr('font-weight', '500')
      .attr('font-family', '"Plus Jakarta Sans", sans-serif')
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.r + 10)
      .attr('opacity', d => d.opacity)
      .text(d => d.name.length > 7 ? d.name.substring(0, 6) + '…' : d.name);

    // 悬浮交互
    nodeGroup
      .on('mouseover', function(event, d) {
        // 当前节点放大 + 高亮
        d3.select(this).select('circle')
          .transition().duration(200)
          .attr('r', d.r + 3)
          .attr('opacity', 1);

        // 关联连线高亮
        link.filter(l => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source;
          const tid = typeof l.target === 'object' ? l.target.id : l.target;
          return sid === d.id || tid === d.id;
        })
          .attr('stroke-width', 2.5)
          .attr('stroke-opacity', 0.8);

        // 非关联节点变暗
        nodeGroup.filter(n => n.id !== d.id)
          .attr('opacity', 0.25);
        text.filter(n => n.id !== d.id)
          .attr('opacity', 0.15);

        // Tooltip
        const catLabel = d.subject === 'history' ? '历史' : '道法';
        const catColor = d.subject === 'history' ? '#efbd8a' : '#b6c4ff';

        self.tooltip
          .html(`
            <div style="background:rgba(10,14,39,0.95);border:1px solid ${catColor}40;border-radius:10px;padding:12px 16px;backdrop-filter:blur(8px);box-shadow:0 8px 32px rgba(0,0,0,0.5);">
              <div style="color:${catColor};font-weight:700;font-size:14px;margin-bottom:4px;">${d.name}</div>
              <div style="color:#c5c5d3;font-size:12px;line-height:1.6;">${d.content || ''}</div>
              <div style="margin-top:8px;display:flex;gap:6px;align-items:center;">
                <span style="background:${catColor}20;color:${catColor};padding:2px 8px;border-radius:4px;font-size:10px;">${catLabel}</span>
                <span style="background:rgba(255,255,255,0.08);color:#888;padding:2px 8px;border-radius:4px;font-size:10px;">第${d.act}幕</span>
              </div>
            </div>
          `)
          .style('opacity', '1');
      })
      .on('mousemove', function(event) {
        const rect = self.container.getBoundingClientRect();
        let tx = event.clientX - rect.left + 16;
        let ty = event.clientY - rect.top - 10;
        if (tx + 300 > self.width) tx -= 316;
        self.tooltip
          .style('left', tx + 'px')
          .style('top', ty + 'px');
      })
      .on('mouseout', function() {
        // 恢复全部样式
        nodeGroup.select('circle')
          .transition().duration(200)
          .attr('r', d => d.r)
          .attr('opacity', d => d.opacity);
        nodeGroup.attr('opacity', 1);
        text.attr('opacity', d => d.opacity);
        link.attr('stroke-width', 1.2)
          .attr('stroke-opacity', d => {
            const src = nodes.find(n => n.id === (d.source.id || d.source));
            const tgt = nodes.find(n => n.id === (d.target.id || d.target));
            const avgDepth = ((src?.depth || 0) + (tgt?.depth || 0)) / 2;
            return avgDepth === 0 ? 0.4 : avgDepth === 0.5 ? 0.3 : 0.15;
          });
        self.tooltip.style('opacity', '0');
      })
      .on('click', function(event, d) {
        if (self.onNodeClick) self.onNodeClick(d);
      })
      // 拖拽
      .call(d3.drag()
        .on('start', function(event, d) {
          if (!event.active) self.simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
          d3.select(this).style('cursor', 'grabbing');
        })
        .on('drag', function(event, d) {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', function(event, d) {
          if (!event.active) self.simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
          d3.select(this).style('cursor', 'grab');
        })
      );

    // 动画帧更新
    this.simulation.on('tick', () => {
      const margin = 60;
      nodes.forEach(d => {
        d.x = Math.max(margin, Math.min(width - margin, d.x));
        d.y = Math.max(margin, Math.min(height - margin, d.y));
      });

      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  _onResize() {
    this.width = this.container.getBoundingClientRect().width;
    this.height = this.container.getBoundingClientRect().height;
    if (this.simulation) {
      this.simulation.force('center', d3.forceCenter(this.width / 2, this.height / 2));
      this.simulation.alpha(0.3).restart();
    }
  }

  destroy() {
    if (this.simulation) this.simulation.stop();
    if (this.svg) this.svg.remove();
    if (this.tooltip) this.tooltip.remove();
    window.removeEventListener('resize', this._resizeHandler);
  }
}
