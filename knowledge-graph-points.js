/**
 * KnowledgeGraphPoints - 点云式知识图谱
 * 基于 stellavault 参考实现，按知识点组团分组
 * 特性：Points点云渲染、按5个组团分组、节点层级透明度、悬停高亮当前节点+连线
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';

class KnowledgeGraphPoints {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.onNodeClick = options.onNodeClick || null;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.points = null;
    this.glowPoints = null;
    this.lines = null;
    this.labelsContainer = null;
    this.nodeLabels = new Map();

    this.nodes = [];
    this.links = [];
    this.nodeMap = new Map();

    this.subjectColor = {
      history: [0.937, 0.741, 0.541],
      daofa: [0.714, 0.769, 1.0],
      default: [0.627, 0.753, 0.878]
    };

    this.subjectColorCSS = {
      history: '#efbd8a',
      daofa: '#b6c4ff',
      default: '#a0c0e0'
    };

    // 5个知识点组团的中心位置（圆形分布）
    this.groupCenters = {
      french_revolution: { x: -35, y: 20, z: 0 },      // 法国大革命 - 左上
      industrial_revolution: { x: 35, y: 20, z: 0 },   // 工业革命 - 右上
      american_revolution: { x: -35, y: -20, z: 0 },   // 美国独立战争 - 左下
      wuxu_reform: { x: 0, y: 0, z: 0 },               // 戊戌变法 - 中心
      xinhai_revolution: { x: 35, y: -20, z: 0 }       // 辛亥革命 - 右下
    };

    this.radiusMap = { core: 18, major: 8, minor: 5 };
    this.opacityMap = { core: 1.0, major: 0.7, minor: 0.4 };

    this.CORE_NODES = ['fr_h4','ir_h2','k_declaration','k_wuxu_08','k_sanminzhuyi'];
    this.MAJOR_NODES = ['fr_h3','fr_h12','ir_h5','ir_h8','k_lexington','k_constitution','k_wuxu_01','k_wuxu_05','k_wuchang','k_zhonghua_minguo'];

    this.highlightedNodeId = null;
    this.pulseTime = 0;

    this._init();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 150);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.minDistance = 50;
    this.controls.maxDistance = 500;

    this._addLights();
    this._addStarfield();
    this._createCircleTexture();
    this._createLabelsContainer();
    this._setupInteraction();

    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);

    this._animate();
  }

  _createLabelsContainer() {
    this.labelsContainer = document.createElement('div');
    this.labelsContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1;';
    this.container.style.position = 'relative';
    this.container.appendChild(this.labelsContainer);
  }

  _createCircleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this.circleTexture = new THREE.CanvasTexture(canvas);
    this.circleTexture.needsUpdate = true;
  }

  _addLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 10, 10);
    this.scene.add(dirLight);
  }

  _detectDevicePerformance() {
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    const cpuCores = navigator.hardwareConcurrency || 4;
    const hasMemoryInfo = performance && performance.memory;
    const memoryAvailable = hasMemoryInfo ? performance.memory.jsHeapSizeLimit : 8 * 1024 * 1024 * 1024;

    if (isMobile) return 'low';
    if (cpuCores >= 8 && memoryAvailable >= 4 * 1024 * 1024 * 1024) return 'high';
    if (cpuCores >= 4 && memoryAvailable >= 2 * 1024 * 1024 * 1024) return 'medium';
    return 'low';
  }

  _addStarfield() {
    const performanceLevel = this._detectDevicePerformance();
    let count;
    switch (performanceLevel) {
      case 'high': count = 3000;
        break;
      case 'medium': count = 1500;
        break;
      case 'low':
      default: count = 500;
        break;
    }
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3] = (Math.random() - 0.5) * 600;
      positions[i*3+1] = (Math.random() - 0.5) * 600;
      positions[i*3+2] = (Math.random() - 0.5) * 600;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true
    });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }

  _getSizeType(id) {
    if (this.CORE_NODES.includes(id)) return 'core';
    if (this.MAJOR_NODES.includes(id)) return 'major';
    return 'minor';
  }

  // 获取知识点所属组团
  _getGroup(id) {
    if (id.startsWith('fr_')) return 'french_revolution';
    if (id.startsWith('ir_')) return 'industrial_revolution';
    if (id.startsWith('k_wuxu_')) return 'wuxu_reform';
    if (id.startsWith('k_xh_') || id.startsWith('k_sanmin') || id.startsWith('k_wuchang') || id.startsWith('k_zhonghua_minguo') || id.startsWith('k_tongmenghui') || id.startsWith('k_xingzhonghui') || id.startsWith('k_qingdi') || id.startsWith('k_linshi') || id.startsWith('k_minzhu_gonghe') || id.startsWith('k_yuan_shikai') || id.startsWith('k_juxianxing')) return 'xinhai_revolution';
    if (id.startsWith('k_root_') || id.startsWith('k_war_nature') || id.startsWith('k_legacy') || id.startsWith('k_continental') || id.startsWith('k_saratoga') || id.startsWith('k_yorktown') || id.startsWith('k_boston_') || id.startsWith('k_lexington') || id.startsWith('k_declaration') || id.startsWith('k_constitution')) return 'american_revolution';
    return 'american_revolution'; // 其他k_*默认美国独立战争
  }

  loadData(data) {
    this._clearScene();

    const nodes = [];
    const links = [];
    const groupMap = new Map(); // 临时存储每个组团的节点

    // 遍历data（实际结构是 {history: [...], daofa: [...]}）
    Object.keys(data).forEach(subject => {
      const items = data[subject];
      if (!Array.isArray(items)) return;

      items.forEach(item => {
        const groupKey = this._getGroup(item.id);
        const center = this.groupCenters[groupKey] || { x: 0, y: 0, z: 0 };
        const sizeType = this._getSizeType(item.id);

        const node = {
          id: item.id,
          name: item.name,
          content: item.content,
          subject: subject,
          group: groupKey,
          center: center,
          act: item.act,
          sizeType: sizeType,
          depth: sizeType === 'core' ? 0 : sizeType === 'major' ? 1 : 2,
          size: this.radiusMap[sizeType],
          baseOpacity: this.opacityMap[sizeType],
          color: this.subjectColor[subject] || this.subjectColor.default,
          colorCSS: this.subjectColorCSS[subject] || this.subjectColorCSS.default,
          x: 0, y: 0, z: 0
        };

        nodes.push(node);

        // 记录该组团的core节点
        if (!groupMap.has(groupKey)) groupMap.set(groupKey, []);
        if (sizeType === 'core') groupMap.get(groupKey).push(node.id);
      });
    });

    if (nodes.length === 0) return;

    // 连线：同组团内，非core节点连接到该组团的core节点
    nodes.forEach(node => {
      if (node.sizeType !== 'core') {
        const coreIds = groupMap.get(node.group) || [];
        const parentId = coreIds[0]; // 使用该组团的第一个core节点作为父节点
        if (parentId) {
          links.push({ source: parentId, target: node.id, strength: 0.3 });
        }
      }
    });

    this.nodes = nodes;
    this.links = links;

    this._runD3ForceSimulation();
    this._buildGraph();
  }

  _runD3ForceSimulation() {
    // 每个节点向其组团中心聚拢
    this.nodes.forEach(node => {
      node.cx = node.center.x;
      node.cy = node.center.y;
      node.cz = node.center.z;
    });

    const simulation = d3.forceSimulation(this.nodes)
      .force('link', d3.forceLink(this.links)
        .id(d => d.id)
        .strength(d => d.strength || 0.2)
        .distance(d => {
          const src = this.nodes.find(n => n.id === d.source);
          const tgt = this.nodes.find(n => n.id === d.target);
          return (src && tgt) ? src.size + tgt.size + 15 : 80;
        })
      )
      .force('charge', d3.forceManyBody().strength(d => -80 - d.size * 4).distanceMax(300))
      .force('collision', d3.forceCollide().radius(d => d.size + 8).strength(0.8).iterations(2))
      .force('x', d3.forceX(d => d.cx).strength(0.15))
      .force('y', d3.forceY(d => d.cy).strength(0.15))
      .force('center', d3.forceCenter(0, 0).strength(0.01))
      .alpha(0.8)
      .alphaDecay(0.02);

    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }
    simulation.stop();

    // 添加Z轴变化
    this.nodes.forEach(node => {
      node.z = node.cz + (Math.random() - 0.5) * 30;
    });
  }

  _clearScene() {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
      this.points.material.dispose();
      this.points = null;
    }
    if (this.glowPoints) {
      this.scene.remove(this.glowPoints);
      this.glowPoints.geometry.dispose();
      this.glowPoints.material.dispose();
      this.glowPoints = null;
    }
    if (this.lines) {
      this.scene.remove(this.lines);
      this.lines.geometry.dispose();
      this.lines.material.dispose();
      this.lines = null;
    }
    this.highlightedNodeId = null;

    if (this.labelsContainer) {
      this.labelsContainer.innerHTML = '';
    }
    this.nodeLabels.clear();
  }

  _buildGraph() {
    this.nodeMap = new Map(this.nodes.map(n => [n.id, n]));

    const n = this.nodes.length;
    const positions = new Float32Array(n * 3);
    const colors = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const glowSizes = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      positions[i*3] = node.x;
      positions[i*3+1] = node.y;
      positions[i*3+2] = node.z;

      const col = node.color;
      const op = node.baseOpacity;
      colors[i*3] = col[0] * op;
      colors[i*3+1] = col[1] * op;
      colors[i*3+2] = col[2] * op;

      sizes[i] = node.size;
      glowSizes[i] = node.size * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      map: this.circleTexture,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    glowGeometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));
    glowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizes, 1));

    const glowMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      map: this.circleTexture,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.glowPoints = new THREE.Points(glowGeometry, glowMaterial);
    this.scene.add(this.glowPoints);

    this._buildLines();
    this._buildLabels();
  }

  _buildLabels() {
    this.nodes.forEach(node => {
      const label = document.createElement('div');
      label.style.cssText = `
        position: absolute;
        color: ${node.colorCSS};
        font-size: ${node.sizeType === 'core' ? '14px' : node.sizeType === 'major' ? '12px' : '10px'};
        font-weight: ${node.sizeType === 'core' ? 'bold' : 'normal'};
        text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 8px ${node.colorCSS}40;
        white-space: nowrap;
        pointer-events: none;
        transition: opacity 0.2s;
        opacity: ${node.baseOpacity};
      `;
      label.textContent = node.name;
      this.labelsContainer.appendChild(label);
      this.nodeLabels.set(node.id, label);
    });
  }

  _buildLines() {
    if (this.links.length === 0) return;

    const positions = [];
    const colors = [];

    this.links.forEach(link => {
      const source = this.nodeMap.get(link.source);
      const target = this.nodeMap.get(link.target);
      if (!source || !target) return;

      positions.push(source.x, source.y, source.z, target.x, target.y, target.z);

      const avgDepth = (source.depth + target.depth) / 2;
      const lineOpacity = avgDepth === 0 ? 0.4 : avgDepth === 0.5 ? 0.3 : 0.15;
      const col = source.color;
      colors.push(col[0] * lineOpacity, col[1] * lineOpacity, col[2] * lineOpacity, col[0] * lineOpacity, col[1] * lineOpacity, col[2] * lineOpacity);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false
    });

    this.lines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.lines);
  }

  _setupInteraction() {
    const raycaster = new THREE.Raycaster();
    raycaster.params.Points.threshold = 15;
    const mouse = new THREE.Vector2();

    this.renderer.domElement.addEventListener('mousemove', (event) => {
      if (!this.renderer || this.renderer.isContextLost()) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.points);

      if (intersects.length > 0) {
        const idx = intersects[0].index;
        const node = this.nodes[idx];
        if (node && this.highlightedNodeId !== node.id) {
          this.highlightedNodeId = node.id;
          this._highlightNode(node);
        }
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        if (this.highlightedNodeId !== null) {
          this.highlightedNodeId = null;
          this._unhighlightAll();
        }
        this.renderer.domElement.style.cursor = 'default';
      }
    });

    this.renderer.domElement.addEventListener('click', (event) => {
      if (!this.renderer || this.renderer.isContextLost()) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObject(this.points);

      if (intersects.length > 0) {
        const idx = intersects[0].index;
        const node = this.nodes[idx];
        if (node && this.onNodeClick) this.onNodeClick(node);
      }
    });
  }

  _highlightNode(node) {
    const colAttr = this.points.geometry.getAttribute('color');
    const sizeAttr = this.points.geometry.getAttribute('size');
    const glowColAttr = this.glowPoints.geometry.getAttribute('color');
    const glowSizeAttr = this.glowPoints.geometry.getAttribute('size');

    // 只高亮当前节点，不扩散到关联节点
    for (let i = 0; i < this.nodes.length; i++) {
      const n = this.nodes[i];
      const col = n.color;
      const isCurrent = n.id === node.id;

      if (isCurrent) {
        // 当前节点：完整颜色 + 放大
        colAttr.setXYZ(i, col[0], col[1], col[2]);
        sizeAttr.setX(i, n.size * 1.5);
        glowColAttr.setXYZ(i, col[0], col[1], col[2]);
        glowSizeAttr.setX(i, n.size * 3);
      } else {
        // 其他节点：变暗
        const dim = 0.15;
        colAttr.setXYZ(i, col[0] * dim, col[1] * dim, col[2] * dim);
        sizeAttr.setX(i, n.size * 0.6);
        glowColAttr.setXYZ(i, col[0] * dim * 0.3, col[1] * dim * 0.3, col[2] * dim * 0.3);
        glowSizeAttr.setX(i, n.size * 0.8);
      }
    }

    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    glowColAttr.needsUpdate = true;
    glowSizeAttr.needsUpdate = true;

    // 更新标签 - 只高亮当前节点
    this.nodeLabels.forEach((label, id) => {
      const isCurrent = id === node.id;
      label.style.opacity = isCurrent ? '1' : '0.1';
    });

    // 只高亮与当前节点直接相连的连线
    if (this.lines) {
      const lineColors = this.lines.geometry.getAttribute('color');
      let colorIdx = 0;
      this.links.forEach(link => {
        const source = this.nodeMap.get(link.source);
        const target = this.nodeMap.get(link.target);
        if (!source || !target) return;

        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        const isConnected = (sourceId === node.id || targetId === node.id);

        const col = source.color;
        if (isConnected) {
          lineColors.setXYZ(colorIdx, col[0], col[1], col[2]);
          lineColors.setXYZ(colorIdx + 1, col[0], col[1], col[2]);
        } else {
          const dim = 0.02;
          lineColors.setXYZ(colorIdx, col[0] * dim, col[1] * dim, col[2] * dim);
          lineColors.setXYZ(colorIdx + 1, col[0] * dim, col[1] * dim, col[2] * dim);
        }
        colorIdx += 2;
      });
      lineColors.needsUpdate = true;
    }
  }

  _unhighlightAll() {
    const colAttr = this.points.geometry.getAttribute('color');
    const sizeAttr = this.points.geometry.getAttribute('size');
    const glowColAttr = this.glowPoints.geometry.getAttribute('color');
    const glowSizeAttr = this.glowPoints.geometry.getAttribute('size');

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];
      const col = node.color;
      const op = node.baseOpacity;
      colAttr.setXYZ(i, col[0] * op, col[1] * op, col[2] * op);
      sizeAttr.setX(i, node.size);
      glowColAttr.setXYZ(i, col[0] * op * 0.8, col[1] * op * 0.8, col[2] * op * 0.8);
      glowSizeAttr.setX(i, node.size * 2);
    }

    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    glowColAttr.needsUpdate = true;
    glowSizeAttr.needsUpdate = true;

    this.nodeLabels.forEach((label, id) => {
      const node = this.nodeMap.get(id);
      if (node) label.style.opacity = node.baseOpacity;
    });

    // 恢复连线颜色
    if (this.lines) {
      const lineColors = this.lines.geometry.getAttribute('color');
      let colorIdx = 0;
      this.links.forEach(link => {
        const source = this.nodeMap.get(link.source);
        const target = this.nodeMap.get(link.target);
        if (!source || !target) return;

        const avgDepth = (source.depth + target.depth) / 2;
        const lineOpacity = avgDepth === 0 ? 0.4 : avgDepth === 0.5 ? 0.3 : 0.15;
        const col = source.color;
        lineColors.setXYZ(colorIdx, col[0] * lineOpacity, col[1] * lineOpacity, col[2] * lineOpacity);
        lineColors.setXYZ(colorIdx + 1, col[0] * lineOpacity, col[1] * lineOpacity, col[2] * lineOpacity);
        colorIdx += 2;
      });
      lineColors.needsUpdate = true;
    }
  }

  _updateLabels() {
    const widthHalf = this.width / 2;
    const heightHalf = this.height / 2;

    this.nodes.forEach(node => {
      const label = this.nodeLabels.get(node.id);
      if (!label) return;

      const vector = new THREE.Vector3(node.x, node.y, node.z);
      vector.project(this.camera);

      const x = (vector.x * widthHalf) + widthHalf;
      const y = -(vector.y * heightHalf) + heightHalf;

      if (vector.z < 1) {
        label.style.display = 'block';
        label.style.left = `${x}px`;
        label.style.top = `${y - 15}px`;
        label.style.transform = 'translate(-50%, -100%)';
      } else {
        label.style.display = 'none';
      }
    });
  }

  _animate() {
    this._animationId = requestAnimationFrame(() => this._animate());

    if (this.highlightedNodeId && this.points) {
      this.pulseTime += 0.04;
      const breath = 1.3 + Math.sin(this.pulseTime) * 0.2;

      const sizeAttr = this.points.geometry.getAttribute('size');
      const glowSizeAttr = this.glowPoints.geometry.getAttribute('size');
      for (let i = 0; i < this.nodes.length; i++) {
        if (this.nodes[i].id === this.highlightedNodeId) {
          const baseSize = this.nodes[i].size * 1.5;
          sizeAttr.setX(i, baseSize * breath);
          glowSizeAttr.setX(i, baseSize * breath * 2);
        }
      }
      sizeAttr.needsUpdate = true;
      glowSizeAttr.needsUpdate = true;
    }

    if (this.stars) {
      this.stars.rotation.y += 0.0002;
    }

    this._updateLabels();

    if (this.controls) this.controls.update();
    if (this.renderer && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  _onResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  destroy() {
    if (this._animationId) cancelAnimationFrame(this._animationId);
    this._clearScene();

    if (this.stars) {
      this.scene.remove(this.stars);
      this.stars.geometry.dispose();
      this.stars.material.dispose();
    }

    if (this.labelsContainer && this.labelsContainer.parentNode) {
      this.labelsContainer.parentNode.removeChild(this.labelsContainer);
    }

    if (this.circleTexture) this.circleTexture.dispose();

    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }

    if (this.controls) this.controls.dispose();
    window.removeEventListener('resize', this._resizeHandler);
  }
}

export { KnowledgeGraphPoints };
export default KnowledgeGraphPoints;
