class KnowledgeGraphChord {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.onNodeClick = options.onNodeClick || null;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.subjectColor = {
      history: '#efbd8a',
      daofa: '#b6c4ff',
      default: '#a0c0e0'
    };

    this.groupCenters = {
      french_revolution: { x: 0.3, y: 0.4 },
      industrial_revolution: { x: 0.7, y: 0.4 },
      american_revolution: { x: 0.3, y: 0.7 },
      wuxu_reform: { x: 0.5, y: 0.55 },
      xinhai_revolution: { x: 0.7, y: 0.7 }
    };

    this.radiusMap = { core: 14, major: 6, minor: 4 };
    this.opacityMap = { core: 1.0, major: 0.7, minor: 0.4 };

    this.CORE_NODES = ['fr_h4','ir_h2','k_declaration','k_wuxu_08','k_sanminzhuyi'];
    this.MAJOR_NODES = ['fr_h3','fr_h12','ir_h5','ir_h8','k_lexington','k_constitution','k_wuxu_01','k_wuxu_05','k_wuchang','k_zhonghua_minguo'];

    this.svg = null;
    this.simulation = null;
    this.nodes = [];
    this.links = [];
    this.linkElements = [];
    this.nodeElements = [];
    this.labelElements = [];
    this._animationId = null;
    this._canvas = null;
    this._ctx = null;
    this._stars = [];
    this._starRotation = 0;
    this._focalLength = 500;
    this._time = 0;
    this._isDragging = false;
    this._draggedCoreId = null;

    this._init();
  }

  _init() {
    this._canvas = document.createElement('canvas');
    this._canvas.width = this.width;
    this._canvas.height = this.height;
    this._canvas.style.position = 'absolute';
    this._canvas.style.top = '0';
    this._canvas.style.left = '0';
    this._canvas.style.pointerEvents = 'none';
    this.container.appendChild(this._canvas);
    this._ctx = this._canvas.getContext('2d');
    this._generateStars();

    this.svg = d3.select(this.container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .style('position', 'absolute')
      .style('top', '0')
      .style('left', '0');

    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _generateStars() {
    this._stars = [];
    for (let i = 0; i < 2500; i++) {
      const colorRoll = Math.random();
      let color = '#ffffff';
      if (colorRoll < 0.1) color = '#efbd8a';
      else if (colorRoll < 0.2) color = '#b6c4ff';
      this._stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.2,
        color: color
      });
    }
  }

  _drawStarfield() {
    this._ctx.clearRect(0, 0, this.width, this.height);
    this._ctx.fillStyle = '#0a0e27';
    this._ctx.fillRect(0, 0, this.width, this.height);

    this._starRotation += 0.0002;
    const cx = this.width / 2;
    const cy = this.height / 2;
    const cosR = Math.cos(this._starRotation);
    const sinR = Math.sin(this._starRotation);

    for (let i = 0; i < this._stars.length; i++) {
      const s = this._stars[i];
      const dx = s.x - cx;
      const dy = s.y - cy;
      const rx = dx * cosR - dy * sinR + cx;
      const ry = dx * sinR + dy * cosR + cy;
      this._ctx.beginPath();
      this._ctx.arc(rx, ry, s.r, 0, Math.PI * 2);
      this._ctx.fillStyle = s.color;
      this._ctx.globalAlpha = s.opacity;
      this._ctx.fill();
    }
    this._ctx.globalAlpha = 1;
  }

  _getSizeType(id) {
    if (this.CORE_NODES.includes(id)) return 'core';
    if (this.MAJOR_NODES.includes(id)) return 'major';
    return 'minor';
  }

  _getGroup(id) {
    if (id.startsWith('fr_')) return 'french_revolution';
    if (id.startsWith('ir_')) return 'industrial_revolution';
    if (id.startsWith('k_wuxu_')) return 'wuxu_reform';
    if (id.startsWith('k_xh_') || id.startsWith('k_sanmin') || id.startsWith('k_wuchang') || id.startsWith('k_zhonghua_minguo') || id.startsWith('k_tongmenghui') || id.startsWith('k_xingzhonghui') || id.startsWith('k_qingdi') || id.startsWith('k_linshi') || id.startsWith('k_minzhu_gonghe') || id.startsWith('k_yuan_shikai') || id.startsWith('k_juxianxing')) return 'xinhai_revolution';
    if (id.startsWith('k_root_') || id.startsWith('k_war_nature') || id.startsWith('k_legacy') || id.startsWith('k_continental') || id.startsWith('k_saratoga') || id.startsWith('k_yorktown') || id.startsWith('k_boston_') || id.startsWith('k_lexington') || id.startsWith('k_declaration') || id.startsWith('k_constitution')) return 'american_revolution';
    return 'american_revolution';
  }

  loadData(data) {
    this._clearScene();

    this.nodes = [];
    this.links = [];
    const groupMap = new Map();

    Object.keys(data).forEach(subject => {
      const items = data[subject];
      if (!Array.isArray(items)) return;

      items.forEach(item => {
        const groupKey = this._getGroup(item.id);
        const centerRatio = this.groupCenters[groupKey] || { x: 0.5, y: 0.5 };
        const center = {
          x: this.width * centerRatio.x,
          y: this.height * centerRatio.y
        };
        const sizeType = this._getSizeType(item.id);

        this.nodes.push({
          id: item.id,
          name: item.name,
          content: item.content,
          subject: subject,
          group: groupKey,
          center: center,
          act: item.act,
          sizeType: sizeType,
          depth: sizeType === 'core' ? 0 : sizeType === 'major' ? 1 : 2,
          r: this.radiusMap[sizeType],
          baseOpacity: this.opacityMap[sizeType],
          color: this.subjectColor[subject] || this.subjectColor.default,
          orbitRadius: 0,
          orbitSpeed: 0,
          orbitAngle: 0,
          orbitInclination: 0,
          orbitCenterX: 0,
          orbitCenterY: 0,
          z: 0
        });

        if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
        if (sizeType === 'core') groupMap.get(groupKey).push(item.id);
      });
    });

    this.nodes.forEach(node => {
      if (node.sizeType !== 'core') {
        const coreIds = groupMap.get(node.group) || [];
        const parentId = coreIds[0];
        if (parentId) {
          this.links.push({ source: parentId, target: node.id, strength: 0.3 });
        }
      }
    });

    this._buildGraph();
  }

  _clearScene() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    this.svg.selectAll('.link').remove();
    this.svg.selectAll('.node').remove();
    this.svg.selectAll('.label').remove();
    if (this.simulation) this.simulation.stop();
    this.linkElements = [];
    this.nodeElements = [];
    this.labelElements = [];
  }

  _buildGraph() {
    const width = this.width;
    const height = this.height;

    this.nodes.forEach(d => {
      d.cx = d.center.x;
      d.cy = d.center.y;
    });

    this.simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links)
        .id(d => d.id)
        .strength(d => d.strength || 0.2)
        .distance(d => {
          const src = this.nodes.find(n => n.id === d.source);
          const tgt = this.nodes.find(n => n.id === d.target);
          return (src && tgt) ? src.r + tgt.r + 30 : 50;
        })
      )
      .force('charge', d3.forceManyBody().strength(d => -80 - d.r * 4).distanceMax(200))
      .force('collision', d3.forceCollide().radius(d => d.r + 6).strength(0.8).iterations(2))
      .force('x', d3.forceX(d => d.cx).strength(0.06))
      .force('y', d3.forceY(d => d.cy).strength(0.06))
      .force('center', d3.forceCenter(width / 2, height / 2).strength(0.01))
      .alpha(0.8)
      .alphaDecay(0.02);

    this.simulation.stop();
    for (let i = 0; i < 300; i++) {
      this.simulation.tick();
    }
    const margin = 60;
    this.nodes.forEach(d => {
      d.x = Math.max(margin, Math.min(width - margin, d.x));
      d.y = Math.max(margin, Math.min(height - margin, d.y));
    });
    this.simulation.stop();

    this.nodes.forEach(d => {
      if (d.sizeType === 'core') {
        d.orbitCenterX = d.x;
        d.orbitCenterY = d.y;
      } else {
        const coreNode = this.nodes.find(n => n.sizeType === 'core' && n.group === d.group);
        if (coreNode) {
          d.orbitCenterX = coreNode.x;
          d.orbitCenterY = coreNode.y;
        }
        if (d.sizeType === 'major') {
          d.orbitRadius = 40 + Math.random() * 20;
          d.orbitSpeed = 0.008 + Math.random() * 0.004;
        } else {
          d.orbitRadius = 70 + Math.random() * 30;
          d.orbitSpeed = 0.003 + Math.random() * 0.003;
        }
        d.orbitAngle = Math.random() * Math.PI * 2;
        d.orbitInclination = (Math.random() - 0.5) * 30 * (Math.PI / 180);
      }
    });

    const linkGroup = this.svg.append('g').attr('class', 'links');
    const link = linkGroup.selectAll('.link')
      .data(this.links)
      .enter().append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', d => {
        const source = typeof d.source === 'object' ? d.source : this.nodes.find(n => n.id === d.source);
        return source ? source.color : '#5a9eff';
      })
      .attr('stroke-opacity', d => {
        const source = typeof d.source === 'object' ? d.source : this.nodes.find(n => n.id === d.source);
        const target = typeof d.target === 'object' ? d.target : this.nodes.find(n => n.id === d.target);
        if (!source || !target) return 0.15;
        const avgDepth = (source.depth + target.depth) / 2;
        return avgDepth === 0 ? 0.4 : avgDepth === 0.5 ? 0.3 : 0.15;
      })
      .attr('stroke-width', d => {
        const source = typeof d.source === 'object' ? d.source : this.nodes.find(n => n.id === d.source);
        return source && source.sizeType === 'core' ? 1.5 : 0.8;
      });

    this.linkElements = link;

    const nodeGroup = this.svg.append('g').attr('class', 'nodes');
    const node = nodeGroup.selectAll('.node')
      .data(this.nodes)
      .enter().append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', (event, d) => {
          if (d.sizeType !== 'core') return;
          this._isDragging = true;
          this._draggedCoreId = d.id;
        })
        .on('drag', (event, d) => {
          if (d.sizeType !== 'core') return;
          d.orbitCenterX = event.x;
          d.orbitCenterY = event.y;
          d.x = event.x;
          d.y = event.y;
          this.nodes.forEach(child => {
            if (child.group === d.group && child.sizeType !== 'core') {
              child.orbitCenterX = event.x;
              child.orbitCenterY = event.y;
            }
          });
        })
        .on('end', (event, d) => {
          if (d.sizeType !== 'core') return;
          this._isDragging = false;
          this._draggedCoreId = null;
        }));

    node.append('circle')
      .attr('class', 'glow')
      .attr('r', d => d.r + 4)
      .attr('fill', d => d.color)
      .attr('opacity', d => d.baseOpacity * 0.15);

    node.append('circle')
      .attr('class', 'body')
      .attr('r', d => d.r)
      .attr('fill', d => d.color)
      .attr('stroke', 'rgba(255,255,255,0.5)')
      .attr('stroke-width', d => d.sizeType === 'core' ? 2 : 1)
      .attr('opacity', d => d.baseOpacity);

    this.nodeElements = node;

    const labelGroup = this.svg.append('g').attr('class', 'labels');
    const label = labelGroup.selectAll('.label')
      .data(this.nodes)
      .enter().append('text')
      .attr('class', 'label')
      .attr('dy', d => -d.r - 6)
      .attr('text-anchor', 'middle')
      .attr('fill', '#ffffff')
      .attr('font-size', d => d.sizeType === 'core' ? '13px' : d.sizeType === 'major' ? '11px' : '9px')
      .attr('font-weight', d => d.sizeType === 'core' ? 'bold' : 'normal')
      .attr('opacity', d => d.baseOpacity)
      .style('text-shadow', '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.5)')
      .text(d => d.name);

    this.labelElements = label;

    node.on('mouseover', (event, d) => {
      this._highlightNode(d);
    }).on('mouseout', (event, d) => {
      this._unhighlightAll();
    });

    if (this.onNodeClick) {
      node.on('click', (event, d) => {
        this.onNodeClick(d);
      });
    }

    this._startAnimation();
  }

  _startAnimation() {
    const animate = () => {
      this._time += 1;
      this._drawStarfield();
      this._updateOrbitalPositions();
      this._renderFrame();
      this._animationId = requestAnimationFrame(animate);
    };
    this._animationId = requestAnimationFrame(animate);
  }

  _updateOrbitalPositions() {
    this.nodes.forEach(d => {
      if (d.sizeType === 'core') {
        const pulse = 1 + 0.05 * Math.sin(this._time * 0.03);
        d._pulse = pulse;
        d.z = 0;
      } else {
        d.orbitAngle += d.orbitSpeed;
        const rawX = d.orbitRadius * Math.cos(d.orbitAngle);
        const rawY = d.orbitRadius * Math.sin(d.orbitAngle) * Math.cos(d.orbitInclination);
        const rawZ = d.orbitRadius * Math.sin(d.orbitAngle) * Math.sin(d.orbitInclination);
        d.x = d.orbitCenterX + rawX;
        d.y = d.orbitCenterY + rawY;
        d.z = rawZ;
      }
    });
  }

  _renderFrame() {
    const fl = this._focalLength;

    this.linkElements.attr('d', d => {
      const source = d.source;
      const target = d.target;
      const sx = source.x;
      const sy = source.y;
      const tx = target.x;
      const ty = target.y;
      const midX = (sx + tx) / 2;
      const midY = (sy + ty) / 2;
      const coreX = target.orbitCenterX || source.orbitCenterX || midX;
      const coreY = target.orbitCenterY || source.orbitCenterY || midY;
      const ctrlX = midX + (coreX - midX) * 0.3;
      const ctrlY = midY + (coreY - midY) * 0.3;
      return `M${sx},${sy} Q${ctrlX},${ctrlY} ${tx},${ty}`;
    });

    this.linkElements.attr('stroke-opacity', d => {
      const target = d.target;
      const source = d.source;
      const zRef = target.sizeType !== 'core' ? target.z : (source.sizeType !== 'core' ? source.z : 0);
      const baseOpacity = (() => {
        const avgDepth = (source.depth + target.depth) / 2;
        return avgDepth === 0 ? 0.4 : avgDepth === 0.5 ? 0.3 : 0.15;
      })();
      const zFactor = Math.max(0.2, Math.min(1.0, 1 + zRef / (fl * 2)));
      return baseOpacity * zFactor;
    });

    this.nodeElements.attr('transform', d => {
      if (d.sizeType === 'core') {
        const pulse = d._pulse || 1;
        return `translate(${d.orbitCenterX},${d.orbitCenterY}) scale(${pulse})`;
      }
      const zOffset = d.z * 0.1;
      const scaleFactor = 1 + d.z / fl;
      return `translate(${d.x},${d.y + zOffset}) scale(${scaleFactor})`;
    });

    this.nodeElements.selectAll('.body').attr('opacity', d => {
      if (d.sizeType === 'core') return d.baseOpacity;
      const zFactor = Math.max(0.2, Math.min(1.0, 1 + d.z / (fl * 2)));
      return d.baseOpacity * zFactor;
    });

    this.nodeElements.selectAll('.glow').attr('opacity', d => {
      if (d.sizeType === 'core') return d.baseOpacity * 0.15;
      const zFactor = Math.max(0.2, Math.min(1.0, 1 + d.z / (fl * 2)));
      return d.baseOpacity * 0.15 * zFactor;
    });

    this.labelElements.each(function(d) {
      const el = d3.select(this);
      if (d.sizeType === 'core') {
        el.attr('x', d.orbitCenterX)
          .attr('y', d.orbitCenterY)
          .attr('opacity', d.baseOpacity)
          .attr('font-size', '13px');
      } else {
        const zOffset = d.z * 0.1;
        const scaleFactor = 1 + d.z / fl;
        const zFactor = Math.max(0.2, Math.min(1.0, 1 + d.z / (fl * 2)));
        const baseFontSize = d.sizeType === 'major' ? 11 : 9;
        const fontSize = baseFontSize * scaleFactor;
        el.attr('x', d.x)
          .attr('y', d.y + zOffset)
          .attr('opacity', d.baseOpacity * zFactor)
          .attr('font-size', fontSize + 'px');
      }
    });
  }

  _highlightNode(node) {
    this.nodeElements.selectAll('.body')
      .transition().duration(200)
      .attr('opacity', d => d.id === node.id ? 1 : 0.1)
      .attr('r', d => d.id === node.id ? d.r * 1.3 : d.r);

    this.nodeElements.selectAll('.glow')
      .transition().duration(200)
      .attr('opacity', d => d.id === node.id ? 0.3 : 0.02)
      .attr('r', d => d.id === node.id ? d.r * 1.3 + 4 : d.r + 4);

    this.labelElements
      .transition().duration(200)
      .attr('opacity', d => d.id === node.id ? 1 : 0.1)
      .attr('font-size', d => {
        if (d.id !== node.id) {
          if (d.sizeType === 'core') return '13px';
          if (d.sizeType === 'major') return '11px';
          return '9px';
        }
        if (d.sizeType === 'core') return '15px';
        if (d.sizeType === 'major') return '13px';
        return '11px';
      });

    this.linkElements
      .transition().duration(200)
      .attr('stroke-opacity', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const isConnected = (sourceId === node.id || targetId === node.id);
        return isConnected ? 0.8 : 0.02;
      })
      .attr('stroke-width', d => {
        const sourceId = typeof d.source === 'object' ? d.source.id : d.source;
        const targetId = typeof d.target === 'object' ? d.target.id : d.target;
        const isConnected = (sourceId === node.id || targetId === node.id);
        return isConnected ? 2 : 0.5;
      });
  }

  _unhighlightAll() {
    const fl = this._focalLength;

    this.nodeElements.selectAll('.body')
      .transition().duration(200)
      .attr('opacity', d => {
        if (d.sizeType === 'core') return d.baseOpacity;
        const zFactor = Math.max(0.2, Math.min(1.0, 1 + d.z / (fl * 2)));
        return d.baseOpacity * zFactor;
      })
      .attr('r', d => d.r);

    this.nodeElements.selectAll('.glow')
      .transition().duration(200)
      .attr('opacity', d => {
        if (d.sizeType === 'core') return d.baseOpacity * 0.15;
        const zFactor = Math.max(0.2, Math.min(1.0, 1 + d.z / (fl * 2)));
        return d.baseOpacity * 0.15 * zFactor;
      })
      .attr('r', d => d.r + 4);

    this.labelElements
      .transition().duration(200)
      .attr('opacity', d => {
        if (d.sizeType === 'core') return d.baseOpacity;
        const zFactor = Math.max(0.2, Math.min(1.0, 1 + d.z / (fl * 2)));
        return d.baseOpacity * zFactor;
      })
      .attr('font-size', d => d.sizeType === 'core' ? '13px' : d.sizeType === 'major' ? '11px' : '9px');

    this.linkElements
      .transition().duration(200)
      .attr('stroke-opacity', d => {
        const source = typeof d.source === 'object' ? d.source : this.nodes.find(n => n.id === d.source);
        const target = typeof d.target === 'object' ? d.target : this.nodes.find(n => n.id === d.target);
        if (!source || !target) return 0.15;
        const avgDepth = (source.depth + target.depth) / 2;
        const baseOpacity = avgDepth === 0 ? 0.4 : avgDepth === 0.5 ? 0.3 : 0.15;
        const zRef = target.sizeType !== 'core' ? target.z : (source.sizeType !== 'core' ? source.z : 0);
        const zFactor = Math.max(0.2, Math.min(1.0, 1 + zRef / (fl * 2)));
        return baseOpacity * zFactor;
      })
      .attr('stroke-width', d => {
        const source = typeof d.source === 'object' ? d.source : this.nodes.find(n => n.id === d.source);
        return source && source.sizeType === 'core' ? 1.5 : 0.8;
      });
  }

  _onResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.svg.attr('width', this.width).attr('height', this.height);
    this._canvas.width = this.width;
    this._canvas.height = this.height;
    this._generateStars();

    this.nodes.forEach(d => {
      const centerRatio = this.groupCenters[d.group] || { x: 0.5, y: 0.5 };
      d.center.x = this.width * centerRatio.x;
      d.center.y = this.height * centerRatio.y;
      d.cx = d.center.x;
      d.cy = d.center.y;
    });

    const offsetMap = new Map();
    this.nodes.forEach(d => {
      if (d.sizeType === 'core') {
        const oldCx = d.orbitCenterX || d.x;
        const oldCy = d.orbitCenterY || d.y;
        d.x = d.cx;
        d.y = d.cy;
        d.orbitCenterX = d.cx;
        d.orbitCenterY = d.cy;
        offsetMap.set(d.group, { dx: d.cx - oldCx, dy: d.cy - oldCy });
      }
    });

    const margin = 60;
    this.nodes.forEach(d => {
      if (d.sizeType !== 'core') {
        const offset = offsetMap.get(d.group);
        if (offset) {
          d.orbitCenterX += offset.dx;
          d.orbitCenterY += offset.dy;
          d.x += offset.dx;
          d.y += offset.dy;
        }
        d.x = Math.max(margin, Math.min(this.width - margin, d.x));
        d.y = Math.max(margin, Math.min(this.height - margin, d.y));
      }
    });
  }

  destroy() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    if (this.simulation) this.simulation.stop();
    if (this._canvas && this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }
    this._canvas = null;
    this._ctx = null;
    if (this.svg) this.svg.remove();
    window.removeEventListener('resize', this._resizeHandler);
  }
}

if (typeof window !== 'undefined') {
  window.KnowledgeGraphChord = KnowledgeGraphChord;
}
