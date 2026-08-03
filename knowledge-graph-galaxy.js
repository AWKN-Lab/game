/**
 * KnowledgeGraphGalaxy - 分级星系知识图谱
 * 视觉以 2D 恒星/云星体为主，交互保留 3D 视角与缩放。
 * 特性：
 * - 星系按 D3 环绕布局分布
 * - 星系内中心恒星 + 分层轨道环绕
 * - 背景为流动的点云星系
 * - 鼠标悬停仅高亮，不压暗其他节点
 * - 滚轮缩放优先朝鼠标所指的知识点/星系推进
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { TrackballControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/TrackballControls.js';
import BaseKnowledgeGraph from './base-knowledge-graph.js';

class KnowledgeGraphGalaxy extends BaseKnowledgeGraph {
  constructor(containerId, options = {}) {
    super(containerId, options);

    this.d3 = globalThis.d3 || null;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.clock = new THREE.Clock();

    this.pointer = new THREE.Vector2(5, 5);
    this.pointerClient = { x: -1, y: -1 };
    this.raycaster = new THREE.Raycaster();
    this.zoomPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    this.tempFocusPoint = new THREE.Vector3();

    this.labelsContainer = null;
    this.hoveredNodeId = null;
    this._pointerInside = false;

    this.nodeMap = new Map();
    this.nodeMeshes = new Map();
    this.nodeLabels = new Map();
    this.galaxies = new Map();
    this.interactiveMeshes = [];

    this.graphObjects = [];
    this.linkLines = [];
    this.orbitRings = [];
    this.cloudBodies = [];
    this.backgroundGalaxies = [];
    this.backgroundGlows = [];

    this.textureCache = new Map();
    this.circleTexture = null;

    this.groupLabelMap = {
      french_revolution: '法国大革命',
      industrial_revolution: '工业革命',
      american_revolution: '美国独立战争',
      wuxu_reform: '戊戌变法',
      xinhai_revolution: '辛亥革命'
    };

    this.groupPalette = {
      french_revolution: { primary: 0xffc27d, secondary: 0xffe7b0 },
      industrial_revolution: { primary: 0x91b8ff, secondary: 0xdde7ff },
      american_revolution: { primary: 0x7de1ff, secondary: 0xd9f9ff },
      wuxu_reform: { primary: 0x7ed3c0, secondary: 0xdbfff6 },
      xinhai_revolution: { primary: 0xff9a7d, secondary: 0xffe0d8 }
    };

    this.subjectColor = {
      history: 0x55ccff,
      daofa: 0x22ff88,
      default: 0xa0c0e0
    };

    this.subjectColorCSS = {
      history: '#55ccff',
      daofa: '#22ff88',
      default: '#a0c0e0'
    };

    this.visualSizeMap = {
      hub: 11.1,
      core: 2.8,
      major: 5.7,
      minor: 7.08
    };

    this.opacityMap = {
      hub: 1,
      core: 0.98,
      major: 0.9,
      minor: 0.74
    };

    this.anchorLayout = {
      french_revolution: { x: -22, y: 9, z: -2 },
      industrial_revolution: { x: 22, y: 9, z: 2 },
      american_revolution: { x: -30, y: -8, z: -3 },
      wuxu_reform: { x: 0, y: -12, z: 4 },
      xinhai_revolution: { x: 30, y: -8, z: -1 }
    };

    this.defaultCameraPosition = new THREE.Vector3(0, 5, 172);
    this.defaultTarget = new THREE.Vector3(0, 0, 0);
    this.starfieldCountMultiplier = options.starfieldCountMultiplier || 1;
    this.starfieldOpacityMultiplier = options.starfieldOpacityMultiplier || 1;
    this.starfieldSizeMultiplier = options.starfieldSizeMultiplier || 1;
    this.backdropOpacityMultiplier = options.backdropOpacityMultiplier || 1;

    this._init();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.FogExp2(0x000000, 0.0042);

    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 1200);
    this.camera.position.copy(this.defaultCameraPosition);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new TrackballControls(this.camera, this.renderer.domElement);
    this.controls.rotateSpeed = 3.6;
    this.controls.zoomSpeed = 1.05;
    this.controls.panSpeed = 0.8;
    this.controls.noPan = false;
    this.controls.noZoom = false;
    this.controls.noRotate = false;
    this.controls.staticMoving = false;
    this.controls.dynamicDampingFactor = 0.08;
    this.controls.minDistance = 42;
    this.controls.maxDistance = 230;
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();

    this._createCircleTexture();
    this._addLights();
    this._addStarfield();
    this._addFlowingBackdrop();
    this._createLabelsContainer();
    this._bindEvents();

    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);

    this._animate();
  }

  _createCircleTexture() {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.92)');
    gradient.addColorStop(0.55, 'rgba(255,255,255,0.42)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    this.circleTexture = new THREE.CanvasTexture(canvas);
    this.circleTexture.needsUpdate = true;
  }

  _createLabelsContainer() {
    this.labelsContainer = document.createElement('div');
    this.labelsContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:2;';
    this.container.style.position = 'relative';
    this.container.appendChild(this.labelsContainer);
  }

  _bindEvents() {
    this._pointerMoveHandler = event => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointerClient.x = event.clientX;
      this.pointerClient.y = event.clientY;
      this._pointerInside = true;
    };

    this._pointerLeaveHandler = () => {
      this._pointerInside = false;
      this.pointer.set(5, 5);
      this.pointerClient.x = -1;
      this.pointerClient.y = -1;
      if (this.hoveredNodeId) {
        this.hoveredNodeId = null;
        this._applyHoverState();
      }
    };

    this._clickHandler = () => {
      if (!this.hoveredNodeId) return;
      const node = this.nodeMap.get(this.hoveredNodeId);
      if (node && node.kind !== 'hub' && this.onNodeClick) {
        this.onNodeClick(node);
      }
    };

    this._wheelHandler = event => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointerClient.x = event.clientX;
      this.pointerClient.y = event.clientY;
      this._pointerInside = true;

      const focus = this._getZoomFocusPoint();
      if (focus) {
        this.controls.target.lerp(focus, this.hoveredNodeId ? 0.45 : 0.24);
      }
    };

    this.renderer.domElement.addEventListener('pointermove', this._pointerMoveHandler);
    this.renderer.domElement.addEventListener('pointerleave', this._pointerLeaveHandler);
    this.renderer.domElement.addEventListener('click', this._clickHandler);
    this.renderer.domElement.addEventListener('wheel', this._wheelHandler, true);
  }

  _addLights() {
    const ambient = new THREE.AmbientLight(0x7387ba, 0.9);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.72);
    keyLight.position.set(20, 22, 18);
    this.scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x6fd7ff, 0.55, 260);
    fillLight.position.set(-28, 12, 45);
    this.scene.add(fillLight);

    const warmLight = new THREE.PointLight(0xffc27d, 0.45, 240);
    warmLight.position.set(30, -8, 38);
    this.scene.add(warmLight);
  }

  _addStarfield() {
    const baseCount = window.matchMedia('(pointer: coarse)').matches ? 1400 : 2800;
    const count = Math.round(baseCount * this.starfieldCountMultiplier);
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 500;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 280;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 500 - 80;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xf4fbff,
      map: this.circleTexture,
      size: 0.62 * this.starfieldSizeMultiplier,
      transparent: true,
      opacity: Math.min(0.92, 0.34 * this.starfieldOpacityMultiplier),
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.starfield = new THREE.Points(geometry, material);
    this.starfield.position.z = -80;
    this.scene.add(this.starfield);
  }

  _addFlowingBackdrop() {
    const configs = [
      { position: new THREE.Vector3(-34, 15, -78), width: 144, height: 50, depth: 30, colorA: 0x173f68, colorB: 0x72d4ff, count: 1260, driftX: 2.9, driftY: 1.1, speed: 0.036, rotation: 0.006, opacity: 0.16 * this.backdropOpacityMultiplier },
      { position: new THREE.Vector3(36, -14, -92), width: 166, height: 62, depth: 38, colorA: 0x12294f, colorB: 0x7cb6ff, count: 1480, driftX: 2.1, driftY: 1.4, speed: 0.029, rotation: -0.005, opacity: 0.13 * this.backdropOpacityMultiplier },
      { position: new THREE.Vector3(-6, 4, -114), width: 214, height: 84, depth: 46, colorA: 0x0c1d34, colorB: 0x34739a, count: 1680, driftX: 1.4, driftY: 0.9, speed: 0.023, rotation: 0.004, opacity: 0.1 * this.backdropOpacityMultiplier },
      { position: new THREE.Vector3(10, 22, -134), width: 238, height: 96, depth: 52, colorA: 0x081428, colorB: 0x1d4764, count: 1740, driftX: 1.1, driftY: 0.7, speed: 0.018, rotation: -0.003, opacity: 0.06 * this.backdropOpacityMultiplier }
    ];

    configs.forEach((config, index) => {
      const points = this._createBackgroundGalaxy(config, index);
      this.backgroundGalaxies.push(points);
      this.scene.add(points);
    });
  }

  _createBackgroundGalaxy(config, index) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(config.count * 3);
    const colors = new Float32Array(config.count * 3);
    const colorA = new THREE.Color(config.colorA);
    const colorB = new THREE.Color(config.colorB);

    for (let i = 0; i < config.count; i++) {
      const ratio = Math.random();
      const spread = Math.pow(Math.random(), 0.72);
      const ribbon = (Math.random() - 0.5) * config.height;
      const x = (Math.random() - 0.5) * config.width;
      const y = Math.sin((x / config.width) * Math.PI * (1.2 + index * 0.3)) * config.height * 0.18 + ribbon * spread;
      const z = (Math.random() - 0.5) * config.depth;
      const color = ratio > 0.45 ? colorA : colorB;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.28 + index * 0.22,
      vertexColors: true,
      map: this.circleTexture,
      transparent: true,
      opacity: config.opacity,
      sizeAttenuation: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(config.position);
    points.userData = {
      basePosition: config.position.clone(),
      driftX: config.driftX,
      driftY: config.driftY,
      speed: config.speed,
      rotationSpeed: config.rotation,
      phase: index * 1.4 + 0.6
    };

    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: this._createCloudTexture(config.colorA, config.colorB, `bg-${index}`),
        transparent: true,
        opacity: config.opacity * 0.92,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    glow.scale.set(config.width * 0.86, config.height * 1.28, 1);
    glow.position.copy(config.position);
    glow.userData = { phase: index * 1.7 + 0.2, rotationSpeed: config.rotation * 0.8 };
    this.backgroundGlows.push(glow);
    this.scene.add(glow);

    return points;
  }

  loadData(data) {
    if (!this.d3) {
      console.error('KnowledgeGraphGalaxy: D3 未加载，无法生成星系布局');
      return;
    }

    this._clearScene();

    const galaxies = this._buildGalaxyData(data);
    if (galaxies.length === 0) return;

    this._layoutGalaxyCenters(galaxies);
    galaxies.forEach(galaxy => this._layoutSatelliteOrbits(galaxy));
    galaxies.forEach(galaxy => this._createGalaxyScene(galaxy));
    galaxies.forEach(galaxy => this.galaxies.set(galaxy.key, galaxy));

    this._setInitialPositions();
  }

  _buildGalaxyData(data) {
    const galaxyMap = new Map();
    const sizePriority = { core: 0, major: 1, minor: 2 };

    Object.entries(data).forEach(([subject, items]) => {
      if (!Array.isArray(items)) return;

      items.forEach(item => {
        const groupKey = this._getGroup(item.id);
        const palette = this.groupPalette[groupKey] || this.groupPalette.american_revolution;

        if (!galaxyMap.has(groupKey)) {
          galaxyMap.set(groupKey, {
            key: groupKey,
            label: this.groupLabelMap[groupKey] || groupKey,
            palette: palette,
            satellites: [],
            currentPosition: new THREE.Vector3(),
            ringDefs: []
          });
        }

        const sizeType = this._getSizeType(item.id);
        const node = {
          id: item.id,
          name: item.name,
          content: item.content,
          subject: subject,
          group: groupKey,
          act: item.act,
          kind: 'satellite',
          sizeType: sizeType,
          visualSize: this.visualSizeMap[sizeType],
          baseOpacity: this.opacityMap[sizeType],
          color: this.subjectColor[subject] || this.subjectColor.default,
          colorCSS: this.subjectColorCSS[subject] || this.subjectColorCSS.default,
          worldPosition: new THREE.Vector3()
        };

        galaxyMap.get(groupKey).satellites.push(node);
        this.nodeMap.set(node.id, node);
      });
    });

    const galaxies = Array.from(galaxyMap.values());

    galaxies.forEach((galaxy, index) => {
      galaxy.satellites.sort((a, b) => {
        const bandDelta = sizePriority[a.sizeType] - sizePriority[b.sizeType];
        if (bandDelta !== 0) return bandDelta;
        const actDelta = (a.act || 99) - (b.act || 99);
        if (actDelta !== 0) return actDelta;
        return a.name.localeCompare(b.name, 'zh-CN');
      });

      galaxy.hubNode = {
        id: `${galaxy.key}__hub`,
        name: galaxy.label,
        content: `${galaxy.label}知识星系`,
        group: galaxy.key,
        subject: 'history',
        kind: 'hub',
        sizeType: 'hub',
        visualSize: this.visualSizeMap.hub,
        baseOpacity: 1,
        color: galaxy.palette.primary,
        colorCSS: this._hexToCss(galaxy.palette.primary),
        worldPosition: new THREE.Vector3()
      };

      galaxy.index = index;
      galaxy.floatPhase = index * 1.08 + 0.4;
      galaxy.floatSpeed = 0.26 + index * 0.018;
      galaxy.floatX = 1.6 + (index % 2) * 0.45;
      galaxy.floatY = 0.9 + (index % 3) * 0.28;
      galaxy.floatZ = 1.8 + (index % 2) * 0.35;
      galaxy.spinSpeed = (0.1 + index * 0.012) * (index % 2 === 0 ? 1 : -1);
      galaxy.spinOffset = index * 0.74;

      this.nodeMap.set(galaxy.hubNode.id, galaxy.hubNode);
    });

    return galaxies;
  }

  _layoutGalaxyCenters(galaxies) {
    if (galaxies.length === 1) {
      galaxies[0].basePosition = new THREE.Vector3(0, 0, 0);
      return;
    }

    const metaNodes = galaxies.map(galaxy => {
      const anchor = this.anchorLayout[galaxy.key] || { x: 0, y: 0, z: 0 };
      return {
        id: galaxy.key,
        weight: galaxy.satellites.length,
        x: anchor.x,
        y: anchor.y,
        anchorX: anchor.x,
        anchorY: anchor.y,
        anchorZ: anchor.z
      };
    });

    const simulation = this.d3.forceSimulation(metaNodes)
      .force('charge', this.d3.forceManyBody().strength(-920).distanceMax(180))
      .force('collision', this.d3.forceCollide().radius(d => 11 + d.weight * 1.4).strength(1))
      .force('x', this.d3.forceX(d => d.anchorX).strength(0.24))
      .force('y', this.d3.forceY(d => d.anchorY).strength(0.24))
      .alpha(0.88)
      .alphaDecay(0.05);

    for (let i = 0; i < 180; i++) simulation.tick();
    simulation.stop();

    metaNodes.forEach((meta, index) => {
      const galaxy = galaxies.find(item => item.key === meta.id);
      if (!galaxy) return;

      galaxy.basePosition = new THREE.Vector3(
        meta.x * 0.78,
        meta.y * 0.54,
        meta.anchorZ + (index % 2 === 0 ? -0.6 : 0.7)
      );
    });
  }

  _layoutSatelliteOrbits(galaxy) {
    const baseRadius = { core: 8.7, major: 14.2, minor: 20.4 };
    const speedMap = { core: 0.34, major: 0.21, minor: 0.11 };
    const depthMap = { core: 0.58, major: 0.76, minor: 0.96 };

    const layoutNodes = galaxy.satellites.map((node, index) => {
      const seedAngle = (index / Math.max(galaxy.satellites.length, 1)) * Math.PI * 2;
      const desiredRadius =
        baseRadius[node.sizeType] +
        (node.subject === 'daofa' ? 1.4 : 0) +
        ((node.act || 1) - 1) * 0.45 +
        (index % 3) * 0.55;

      return {
        ref: node,
        desiredRadius: desiredRadius,
        x: Math.cos(seedAngle) * desiredRadius,
        y: Math.sin(seedAngle) * desiredRadius
      };
    });

    const simulation = this.d3.forceSimulation(layoutNodes)
      .force('charge', this.d3.forceManyBody().strength(-40))
      .force('radial', this.d3.forceRadial(d => d.desiredRadius, 0, 0).strength(0.94))
      .force('collision', this.d3.forceCollide().radius(d => d.ref.visualSize * 1.8 + 0.8).strength(1).iterations(3))
      .force('center', this.d3.forceCenter(0, 0).strength(0.05))
      .alpha(1)
      .alphaDecay(0.05);

    for (let i = 0; i < 200; i++) simulation.tick();
    simulation.stop();

    const maxRadius = { core: 0, major: 0, minor: 0 };

    layoutNodes.forEach((entry, index) => {
      const node = entry.ref;
      const angle = Math.atan2(entry.y, entry.x);
      const radius = Math.max(7, Math.hypot(entry.x, entry.y));

      node.orbitAngle0 = angle;
      node.orbitRadiusX = radius * (node.subject === 'history' ? 1.04 : 0.98);
      node.orbitRadiusY = radius * depthMap[node.sizeType] * (0.78 + Math.random() * 0.24);
      node.orbitRadiusZ = radius * (0.82 + Math.random() * 0.22);
      node.orbitSpeed = speedMap[node.sizeType] + (index % 4) * 0.014;
      node.orbitYOffset = node.subject === 'history' ? -0.35 : 0.42;
      node.orbitTiltX = (Math.random() - 0.5) * 1.05;
      node.orbitTiltZ = (Math.random() - 0.5) * 0.95;
      node.orbitPrecession = Math.random() * Math.PI * 2;
      node.orbitPrecessionSpeed = 0.035 + Math.random() * 0.045;
      node.orbitJitter = 0.06 + Math.random() * 0.05;
      node.phase = Math.random() * Math.PI * 2;

      maxRadius[node.sizeType] = Math.max(maxRadius[node.sizeType], node.orbitRadiusX);
    });

    const inner = Math.max(maxRadius.core + 1.6, 10.2);
    const middle = Math.max(maxRadius.major + 2, inner + 4.5);
    const outer = Math.max(maxRadius.minor + 2.4, middle + 5.3);

    galaxy.ringDefs = [
      { radiusX: inner, radiusY: inner * 0.7, opacity: 0.2, color: galaxy.palette.secondary, tilt: 0.03 },
      { radiusX: middle, radiusY: middle * 0.8, opacity: 0.15, color: this.subjectColor.history, tilt: 0.02 },
      { radiusX: outer, radiusY: outer * 0.9, opacity: 0.12, color: this.subjectColor.daofa, tilt: 0.015 }
    ];
  }

  _createGalaxyScene(galaxy) {
    this._createCloudPlanetCluster(galaxy);
    this._createNodeMesh(galaxy.hubNode, galaxy.palette.primary, 'hub');
    this._createLabel(galaxy.hubNode);

    galaxy.satellites.forEach(node => {
      this._createNodeMesh(node, node.color, node.sizeType);
      this._createLinkLine(galaxy.hubNode, node);
      this._createLabel(node);
    });
  }

  _createNodeMesh(node, color, variant) {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const material = new THREE.MeshBasicMaterial({
      map: this._createNodeTexture(color, variant),
      transparent: true,
      alphaTest: variant === 'hub' ? 0.16 : 0.08,
      opacity: node.baseOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(node.visualSize, node.visualSize, 1);
    mesh.renderOrder = variant === 'hub' ? 6 : 5;
    mesh.userData = {
      nodeId: node.id,
      group: node.group,
      kind: node.kind,
      baseScale: node.visualSize,
      interactionScale: 1
    };

    this.scene.add(mesh);
    this.graphObjects.push(mesh);
    this.nodeMeshes.set(node.id, mesh);
    this.interactiveMeshes.push(mesh);
  }

  _createCloudPlanetCluster(galaxy) {
    const outerRing = galaxy.ringDefs[2]?.radiusX || 18;
    const group = new THREE.Group();
    const side = galaxy.index % 2 === 0 ? -1 : 1;
    const baseOffset = new THREE.Vector3(side * outerRing * 0.55, (galaxy.index % 3 - 1) * 2.8, -4.8 + galaxy.index * 1.2);

    group.userData = {
      group: galaxy.key,
      baseOffset: baseOffset,
      phase: galaxy.index * 0.9 + 0.6,
      driftX: 1.1 + (galaxy.index % 2) * 0.3,
      driftY: 0.7 + (galaxy.index % 3) * 0.22,
      driftZ: 0.95 + (galaxy.index % 2) * 0.24,
      spinSpeed: 0.08 + galaxy.index * 0.012
    };

    const mainTexture = this._createCloudTexture(galaxy.palette.primary, galaxy.palette.secondary, `${galaxy.key}-cloud-main`);
    const mistTexture = this._createCloudTexture(galaxy.palette.secondary, galaxy.palette.primary, `${galaxy.key}-cloud-mist`);
    const coreTexture = this._createNodeTexture(galaxy.palette.primary, 'major');

    const main = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: mainTexture,
        transparent: true,
        alphaTest: 0.04,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    main.scale.set(12 + galaxy.index * 0.6, 8.8 + galaxy.index * 0.55, 1);
    main.userData.baseOpacity = 0.42;
    main.userData.baseScale = main.scale.clone();
    group.add(main);

    const mist = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: mistTexture,
        transparent: true,
        alphaTest: 0.035,
        opacity: 0.24,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    mist.scale.set(16 + galaxy.index * 0.8, 11.8 + galaxy.index * 0.6, 1);
    mist.userData.baseOpacity = 0.24;
    mist.userData.baseScale = mist.scale.clone();
    group.add(mist);

    const core = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: coreTexture,
        transparent: true,
        alphaTest: 0.05,
        opacity: 0.3,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    core.scale.set(5.4, 5.4, 1);
    core.userData.baseOpacity = 0.3;
    core.userData.baseScale = core.scale.clone();
    group.add(core);

    this.scene.add(group);
    this.graphObjects.push(group);
    this.cloudBodies.push(group);
  }

  _createLinkLine(hubNode, node) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));

    const material = new THREE.LineBasicMaterial({
      color: node.color,
      transparent: true,
      opacity: node.sizeType === 'minor' ? 0.08 : 0.14,
      depthWrite: false
    });

    const line = new THREE.Line(geometry, material);
    line.renderOrder = 2;
    line.userData = {
      group: node.group,
      nodeId: node.id,
      hubId: hubNode.id,
      baseOpacity: material.opacity
    };

    this.scene.add(line);
    this.graphObjects.push(line);
    this.linkLines.push(line);
  }

  _createLabel(node) {
    const el = document.createElement('div');
    const isHub = node.kind === 'hub';
    const isCore = node.sizeType === 'core';
    const isMajor = node.sizeType === 'major';
    const fontSizeValue = Math.max(
      5,
      (isHub ? 16 : isCore ? 13 : isMajor ? 12 : 11)
      - 4
      - (isHub ? 4 : 0)
      - (isCore ? 3 : 0)
      - (isMajor ? 2 : 0)
      - (node.sizeType === 'minor' ? 2 : 0)
    );
    const fontSize = `${fontSizeValue}px`;
    const fontWeight = isHub ? '700' : node.sizeType === 'minor' ? '500' : '600';
    const isMinor = node.sizeType === 'minor';
    const isPlainText = isHub || isCore || isMajor || isMinor;
    const padding = isPlainText ? '0' : '3px 8px';
    const bg = isPlainText ? 'transparent' : 'rgba(7, 19, 36, 0.58)';
    const border = isPlainText ? 'none' : `1px solid ${node.colorCSS}88`;
    const boxShadow = isPlainText ? 'none' : `0 0 14px ${node.colorCSS}16`;
    const textColor = isHub ? '#f8fbff' : node.colorCSS;
    const activeTextColor = isHub ? '#ffffff' : node.colorCSS;
    const baseOpacity = isHub ? 1 : isMinor ? 0.368 : 0.88;
    const textShadow = isHub
      ? `0 0 16px ${node.colorCSS}4f, 0 0 28px rgba(255,255,255,0.1)`
      : isMinor
        ? `0 1px 2px rgba(0,0,0,0.9), 0 0 8px ${node.colorCSS}22`
        : `0 0 10px ${node.colorCSS}1f`;
    const activeTextShadow = isMinor
      ? `0 0 12px ${node.colorCSS}40`
      : isHub
        ? `0 0 18px ${node.colorCSS}66, 0 0 32px rgba(255,255,255,0.16)`
        : textShadow;

    el.style.cssText = [
      'position:absolute',
      'left:0',
      'top:0',
      'pointer-events:none',
      'white-space:nowrap',
      `padding:${padding}`,
      `border-radius:${isMinor ? '0' : '999px'}`,
      `font-size:${fontSize}`,
      `font-weight:${fontWeight}`,
      `color:${textColor}`,
      `background:${bg}`,
      `border:${border}`,
      `backdrop-filter:${isPlainText ? 'none' : 'blur(10px)'}`,
      'transform:translate(-50%, -50%)',
      `box-shadow:${boxShadow}`,
      `text-shadow:${textShadow}`,
      'transition:opacity 0.2s, transform 0.2s, color 0.2s, text-shadow 0.2s',
      `opacity:${baseOpacity}`
    ].join(';');
    el.textContent = node.name;
    el.dataset.nodeId = node.id;
    el.dataset.baseColor = textColor;
    el.dataset.activeColor = activeTextColor;
    el.dataset.baseTextShadow = textShadow;
    el.dataset.activeTextShadow = activeTextShadow;
    el.dataset.baseOpacity = `${baseOpacity}`;

    this.labelsContainer.appendChild(el);
    this.nodeLabels.set(node.id, el);
  }

  _getHoveredLabelNodeId() {
    if (!this._pointerInside || this.pointerClient.x < 0 || this.pointerClient.y < 0) return null;

    let bestMatch = null;

    this.nodeLabels.forEach((label, id) => {
      if (label.style.display === 'none') return;
      const rect = label.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      if (
        this.pointerClient.x < rect.left ||
        this.pointerClient.x > rect.right ||
        this.pointerClient.y < rect.top ||
        this.pointerClient.y > rect.bottom
      ) {
        return;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const distance = Math.hypot(this.pointerClient.x - centerX, this.pointerClient.y - centerY);
      const area = rect.width * rect.height;

      if (!bestMatch || area < bestMatch.area || (Math.abs(area - bestMatch.area) < 0.5 && distance < bestMatch.distance)) {
        bestMatch = { id, area, distance };
      }
    });

    return bestMatch ? bestMatch.id : null;
  }

  _createNodeTexture(colorHex, variant) {
    const key = `node-${colorHex}-${variant}`;
    if (this.textureCache.has(key)) return this.textureCache.get(key);

    const canvas = document.createElement('canvas');
    const size = variant === 'hub' ? 768 : 384;
    const center = size / 2;
    const ctx = canvas.getContext('2d');
    const color = new THREE.Color(colorHex);

    canvas.width = size;
    canvas.height = size;

    const outerRadius = variant === 'hub' ? size * 0.39 : variant === 'core' ? size * 0.32 : variant === 'major' ? size * 0.28 : size * 0.24;
    const glowRadius = outerRadius * (variant === 'hub' ? 2.35 : 2.05);

    const glow = ctx.createRadialGradient(center, center, 0, center, center, glowRadius);
    glow.addColorStop(0, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.98)`);
    glow.addColorStop(0.28, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.42)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(center, center, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    if (variant === 'hub') {
      ctx.save();
      ctx.translate(center, center);
      ctx.strokeStyle = 'rgba(255,255,255,0.44)';
      ctx.lineWidth = size * 0.018;
      for (let i = 0; i < 8; i++) {
        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.moveTo(0, -outerRadius * 1.1);
        ctx.lineTo(0, -outerRadius * 1.7);
        ctx.stroke();
      }
      ctx.restore();
    }

    const core = ctx.createRadialGradient(center, center, 0, center, center, outerRadius);
    core.addColorStop(0, 'rgba(255,255,255,1)');
    core.addColorStop(0.18, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 1)`);
    core.addColorStop(0.72, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, 0.92)`);
    core.addColorStop(1, `rgba(${Math.round(color.r * 160)}, ${Math.round(color.g * 160)}, ${Math.round(color.b * 160)}, 0)`);

    ctx.beginPath();
    ctx.arc(center, center, outerRadius, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(center, center, outerRadius * 0.82, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${variant === 'minor' ? 0.18 : 0.32})`;
    ctx.lineWidth = size * 0.01;
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = true;
    texture.needsUpdate = true;
    this.textureCache.set(key, texture);
    return texture;
  }

  _createCloudTexture(primaryHex, secondaryHex, key) {
    const cacheKey = `cloud-${key}`;
    if (this.textureCache.has(cacheKey)) return this.textureCache.get(cacheKey);

    const canvas = document.createElement('canvas');
    const size = 512;
    const center = size / 2;
    const ctx = canvas.getContext('2d');
    const primary = new THREE.Color(primaryHex);
    const secondary = new THREE.Color(secondaryHex);

    canvas.width = size;
    canvas.height = size;

    const baseGlow = ctx.createRadialGradient(center, center, 0, center, center, size * 0.42);
    baseGlow.addColorStop(0, `rgba(${Math.round(primary.r * 255)}, ${Math.round(primary.g * 255)}, ${Math.round(primary.b * 255)}, 0.52)`);
    baseGlow.addColorStop(0.65, `rgba(${Math.round(secondary.r * 255)}, ${Math.round(secondary.g * 255)}, ${Math.round(secondary.b * 255)}, 0.18)`);
    baseGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = baseGlow;
    ctx.beginPath();
    ctx.ellipse(center, center, size * 0.42, size * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * size * 0.18;
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius * 0.75;
      const blobSize = size * (0.08 + Math.random() * 0.14);
      const color = Math.random() > 0.45 ? primary : secondary;
      const alpha = 0.1 + Math.random() * 0.14;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, blobSize);

      gradient.addColorStop(0, `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, blobSize, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = true;
    texture.needsUpdate = true;
    this.textureCache.set(cacheKey, texture);
    return texture;
  }

  _setInitialPositions() {
    this._updateScene(this.clock.getElapsedTime());
    this._applyHoverState();
  }

  _updateScene(elapsed) {
    this.backgroundGalaxies.forEach((points, index) => {
      const data = points.userData;
      const driftX = Math.cos(elapsed * data.speed + data.phase) * data.driftX;
      const driftY = Math.sin(elapsed * (data.speed + 0.05) + data.phase) * data.driftY;
      points.position.set(
        data.basePosition.x + driftX,
        data.basePosition.y + driftY,
        data.basePosition.z
      );
      points.rotation.z = elapsed * data.rotationSpeed + data.phase * 0.1;
      points.rotation.y = Math.sin(elapsed * 0.05 + data.phase) * 0.08;

      const glow = this.backgroundGlows[index];
      if (glow) {
        glow.position.copy(points.position);
        glow.lookAt(this.camera.position);
        glow.rotation.z = elapsed * data.rotationSpeed * 0.5 + data.phase * 0.08;
      }
    });

    if (this.starfield) {
      this.starfield.rotation.y = elapsed * 0.01;
      this.starfield.rotation.x = Math.sin(elapsed * 0.05) * 0.04;
    }

    this.galaxies.forEach(galaxy => {
      galaxy.currentPosition.set(
        galaxy.basePosition.x + Math.cos(elapsed * galaxy.floatSpeed + galaxy.floatPhase) * galaxy.floatX,
        galaxy.basePosition.y + Math.sin(elapsed * (galaxy.floatSpeed + 0.16) + galaxy.floatPhase) * galaxy.floatY,
        galaxy.basePosition.z + Math.sin(elapsed * (galaxy.floatSpeed + 0.08) + galaxy.floatPhase) * galaxy.floatZ
      );
      galaxy.hubNode.worldPosition.copy(galaxy.currentPosition);

      const hubMesh = this.nodeMeshes.get(galaxy.hubNode.id);
      if (hubMesh) {
        const pulse = 1 + Math.sin(elapsed * 2 + galaxy.floatPhase) * 0.05;
        const scale = hubMesh.userData.baseScale * hubMesh.userData.interactionScale * pulse;
        hubMesh.position.copy(galaxy.currentPosition);
        hubMesh.lookAt(this.camera.position);
        hubMesh.rotation.z += Math.sin(elapsed * 0.7 + galaxy.floatPhase) * 0.04;
        hubMesh.scale.set(scale, scale, 1);
      }

      this.cloudBodies
        .filter(body => body.userData.group === galaxy.key)
        .forEach((body, index) => {
          const data = body.userData;
          const t = elapsed * data.spinSpeed + data.phase;
          const localX = data.baseOffset.x + Math.cos(t) * data.driftX;
          const localY = data.baseOffset.y + Math.sin(t * 1.25) * data.driftY;
          const localZ = data.baseOffset.z + Math.sin(t * 0.9) * data.driftZ;
          const planeRotation = galaxy.spinOffset * 0.2 + elapsed * galaxy.spinSpeed * 0.12;
          const rotX = localX * Math.cos(planeRotation) - localY * Math.sin(planeRotation);
          const rotY = localX * Math.sin(planeRotation) + localY * Math.cos(planeRotation);

          body.position.set(
            galaxy.currentPosition.x + rotX,
            galaxy.currentPosition.y + rotY,
            galaxy.currentPosition.z + localZ
          );

          body.children.forEach((child, childIndex) => {
            child.lookAt(this.camera.position);
            child.rotation.z = elapsed * (0.04 + childIndex * 0.02) + data.phase * 0.3 + index * 0.1;
            if (child.userData.baseOpacity) {
              child.material.opacity = child.userData.baseOpacity * (0.92 + Math.sin(t + childIndex) * 0.08);
            }
          });
        });

      galaxy.satellites.forEach((node, index) => {
        const mesh = this.nodeMeshes.get(node.id);
        if (!mesh) return;

        const theta = node.orbitAngle0 + elapsed * node.orbitSpeed;
        const phi = theta * (1.14 + node.orbitJitter) + node.phase;
        const local = new THREE.Vector3(
          Math.cos(theta) * node.orbitRadiusX + Math.cos(phi * 0.85) * node.orbitRadiusX * node.orbitJitter,
          Math.sin(phi) * node.orbitRadiusY + node.orbitYOffset,
          Math.sin(theta) * node.orbitRadiusZ + Math.sin(phi * 1.12) * node.orbitRadiusZ * node.orbitJitter
        );
        const tiltX = node.orbitTiltX + Math.sin(elapsed * 0.31 + node.phase) * 0.08;
        const tiltZ = node.orbitTiltZ + Math.cos(elapsed * 0.28 + node.phase) * 0.07;
        const precession = node.orbitPrecession + elapsed * node.orbitPrecessionSpeed + galaxy.spinOffset * 0.22 + elapsed * galaxy.spinSpeed * 0.16;
        local.applyAxisAngle(new THREE.Vector3(1, 0, 0), tiltX);
        local.applyAxisAngle(new THREE.Vector3(0, 0, 1), tiltZ);
        local.applyAxisAngle(new THREE.Vector3(0, 1, 0), precession);

        node.worldPosition.set(
          galaxy.currentPosition.x + local.x,
          galaxy.currentPosition.y + local.y,
          galaxy.currentPosition.z + local.z
        );

        const pulse = node.sizeType === 'core'
          ? 1 + Math.sin(elapsed * 2.5 + node.phase) * 0.07
          : node.sizeType === 'major'
            ? 1 + Math.sin(elapsed * 1.9 + node.phase) * 0.05
            : 1;

        const scale = mesh.userData.baseScale * mesh.userData.interactionScale * pulse;
        mesh.position.copy(node.worldPosition);
        mesh.lookAt(this.camera.position);
        mesh.rotation.z += Math.sin(elapsed * 0.8 + node.phase + index * 0.08) * 0.04;
        mesh.scale.set(scale, scale, 1);
      });
    });

    this.linkLines.forEach(line => {
      const node = this.nodeMap.get(line.userData.nodeId);
      const hub = this.nodeMap.get(line.userData.hubId);
      if (!node || !hub) return;

      const positions = line.geometry.attributes.position.array;
      positions[0] = hub.worldPosition.x;
      positions[1] = hub.worldPosition.y;
      positions[2] = hub.worldPosition.z;
      positions[3] = node.worldPosition.x;
      positions[4] = node.worldPosition.y;
      positions[5] = node.worldPosition.z;
      line.geometry.attributes.position.needsUpdate = true;
    });
  }

  _getZoomFocusPoint() {
    if (this.hoveredNodeId) {
      const node = this.nodeMap.get(this.hoveredNodeId);
      if (!node) return null;
      return node.kind === 'hub'
        ? this.galaxies.get(node.group)?.currentPosition || node.worldPosition
        : node.worldPosition;
    }

    if (!this._pointerInside) return null;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.zoomPlane.constant = -this.controls.target.z;
    if (this.raycaster.ray.intersectPlane(this.zoomPlane, this.tempFocusPoint)) {
      return this.tempFocusPoint;
    }

    return null;
  }

  _updateInteraction() {
    if (!this._pointerInside || this.interactiveMeshes.length === 0) {
      if (this.hoveredNodeId) {
        this.hoveredNodeId = null;
        this._applyHoverState();
      }
      this.renderer.domElement.style.cursor = 'grab';
      return;
    }

    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.interactiveMeshes, false);
    const meshNodeId = intersects.length > 0 ? intersects[0].object.userData.nodeId : null;
    const labelNodeId = this._getHoveredLabelNodeId();
    const nodeId = labelNodeId || meshNodeId;

    if (nodeId !== this.hoveredNodeId) {
      this.hoveredNodeId = nodeId;
      this._applyHoverState();
    }

    this.renderer.domElement.style.cursor = nodeId ? 'pointer' : 'grab';
  }

  _applyHoverState() {
    const hovered = this.hoveredNodeId ? this.nodeMap.get(this.hoveredNodeId) : null;

    this.nodeMeshes.forEach((mesh, id) => {
      const node = this.nodeMap.get(id);
      if (!node) return;
      mesh.material.opacity = node.baseOpacity;
      mesh.userData.interactionScale = 1;
    });

    this.linkLines.forEach(line => {
      line.material.opacity = line.userData.baseOpacity;
    });

    this.cloudBodies.forEach(body => {
      body.children.forEach(child => {
        if (child.userData.baseOpacity) {
          child.material.opacity = child.userData.baseOpacity;
        }
      });
    });

    this.nodeLabels.forEach((label, id) => {
      const node = this.nodeMap.get(id);
      if (!node) return;
      label.style.opacity = label.dataset.baseOpacity || (node.kind === 'hub' ? '1' : node.sizeType === 'minor' ? '0.46' : '0.88');
      label.style.transform = 'translate(-50%, -50%) scale(1)';
      label.style.color = label.dataset.baseColor || '';
      label.style.textShadow = label.dataset.baseTextShadow || '';
    });

    if (!hovered) return;

    this.nodeMeshes.forEach((mesh, id) => {
      const node = this.nodeMap.get(id);
      if (!node || node.group === hovered.group) return;
      mesh.material.opacity = Math.max(0.08, node.baseOpacity * 0.16);
      mesh.userData.interactionScale = 0.9;
    });

    this.linkLines.forEach(line => {
      if (line.userData.group !== hovered.group) {
        line.material.opacity = 0.015;
      }
    });

    this.linkLines.forEach(line => {
      if (line.userData.group === hovered.group) {
        line.material.opacity = Math.max(line.material.opacity, line.userData.baseOpacity + 0.2);
      }
    });

    this.cloudBodies.forEach(body => {
      if (body.userData.group === hovered.group) return;
      body.children.forEach(child => {
        if (child.userData.baseOpacity) {
          child.material.opacity = child.userData.baseOpacity * 0.14;
        }
      });
    });

    this.nodeLabels.forEach((label, id) => {
      const node = this.nodeMap.get(id);
      if (!node || node.group === hovered.group) return;
      label.style.opacity = node.kind === 'hub' ? '0.18' : node.sizeType === 'minor' ? '0.12' : '0.16';
      label.style.transform = 'translate(-50%, -50%) scale(0.95)';
      label.style.color = label.dataset.baseColor || '';
      label.style.textShadow = label.dataset.baseTextShadow || '';
    });

    this.nodeMeshes.forEach((mesh, id) => {
      const node = this.nodeMap.get(id);
      if (!node || node.group !== hovered.group || id === hovered.id) return;
      mesh.material.opacity = node.kind === 'hub' ? 1 : node.sizeType === 'minor' ? 0.96 : 0.98;
      mesh.userData.interactionScale = node.kind === 'hub' ? 1.08 : node.sizeType === 'minor' ? 1.12 : 1.08;
    });

    this.nodeLabels.forEach((label, id) => {
      const node = this.nodeMap.get(id);
      if (!node || node.group !== hovered.group || id === hovered.id) return;
      label.style.opacity = node.kind === 'hub' ? '1' : node.sizeType === 'minor' ? '0.94' : '1';
      label.style.transform = `translate(-50%, -50%) scale(${node.sizeType === 'minor' ? '1.04' : '1.02'})`;
      label.style.color = label.dataset.activeColor || label.dataset.baseColor || '';
      label.style.textShadow = label.dataset.activeTextShadow || label.dataset.baseTextShadow || '';
    });

    const hoveredMesh = this.nodeMeshes.get(hovered.id);
    if (hoveredMesh) {
      hoveredMesh.material.opacity = 1;
      hoveredMesh.userData.interactionScale = hovered.kind === 'hub' ? 1.18 : 1.24;
    }

    const hoveredLabel = this.nodeLabels.get(hovered.id);
    if (hoveredLabel) {
      hoveredLabel.style.opacity = '1';
      hoveredLabel.style.transform = 'translate(-50%, -50%) scale(1.06)';
      hoveredLabel.style.color = hoveredLabel.dataset.activeColor || hoveredLabel.dataset.baseColor || '';
      hoveredLabel.style.textShadow = hoveredLabel.dataset.activeTextShadow || hoveredLabel.dataset.baseTextShadow || '';
    }

    if (hovered.kind === 'hub') {
      this.linkLines.forEach(line => {
        if (line.userData.group === hovered.group) {
          line.material.opacity = Math.max(0.38, line.userData.baseOpacity + 0.28);
        }
      });
      return;
    }

    const hubId = `${hovered.group}__hub`;
    const hubMesh = this.nodeMeshes.get(hubId);
    if (hubMesh) {
      hubMesh.material.opacity = 1;
      hubMesh.userData.interactionScale = 1.08;
    }

      const hubLabel = this.nodeLabels.get(hubId);
    if (hubLabel) {
      hubLabel.style.opacity = '1';
      hubLabel.style.transform = 'translate(-50%, -50%) scale(1.03)';
      hubLabel.style.color = hubLabel.dataset.activeColor || hubLabel.dataset.baseColor || '';
      hubLabel.style.textShadow = hubLabel.dataset.activeTextShadow || hubLabel.dataset.baseTextShadow || '';
    }

    this.linkLines.forEach(line => {
      if (line.userData.nodeId === hovered.id) {
        line.material.opacity = 0.5;
      }
    });

  }

  _updateLabels() {
    const widthHalf = this.width / 2;
    const heightHalf = this.height / 2;

    this.nodeLabels.forEach((label, id) => {
      const node = this.nodeMap.get(id);
      const mesh = this.nodeMeshes.get(id);
      if (!node || !mesh) return;

      const position = mesh.position.clone().project(this.camera);
      const visibleByDepth = position.z < 1;

      if (!visibleByDepth) {
        label.style.display = 'none';
        return;
      }

      const x = (position.x * widthHalf) + widthHalf;
      const y = -(position.y * heightHalf) + heightHalf;
      const offsetX = node.kind === 'hub' ? 0 : node.sizeType === 'core' ? 2 : node.sizeType === 'major' ? 1 : 0;
      const offsetY = node.kind === 'hub' ? 36 : node.sizeType === 'core' ? 22 : node.sizeType === 'major' ? 17 : 14;
      label.style.display = 'block';
      label.style.left = `${x + offsetX}px`;
      label.style.top = `${y - offsetY}px`;
    });
  }

  _clearScene() {
    this.hoveredNodeId = null;
    this.nodeMeshes.clear();
    this.nodeLabels.clear();
    this.galaxies.clear();
    this.nodeMap.clear();
    this.interactiveMeshes = [];
    this.linkLines = [];
    this.orbitRings = [];
    this.cloudBodies = [];

    this.graphObjects.forEach(object => {
      this.scene.remove(object);
      this._disposeObject(object);
    });
    this.graphObjects = [];

    if (this.labelsContainer) {
      this.labelsContainer.innerHTML = '';
    }
  }

  _disposeObject(object) {
    object.traverse(child => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => this._disposeMaterial(material));
        } else {
          this._disposeMaterial(child.material);
        }
      }
    });
  }

  _disposeMaterial(material) {
    material.dispose();
  }

  _hexToCss(hex) {
    return `#${hex.toString(16).padStart(6, '0')}`;
  }

  _animate() {
    this._animationId = requestAnimationFrame(() => this._animate());

    const elapsed = this.clock.getElapsedTime();
    this._updateScene(elapsed);
    this._updateInteraction();
    this._updateLabels();

    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
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
    if (this.controls?.handleResize) this.controls.handleResize();
  }

  resetView() {
    if (!this.camera || !this.controls) return;
    this.camera.position.copy(this.defaultCameraPosition);
    this.camera.up.set(0, 1, 0);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
    this._updateLabels();
  }

  destroy() {
    if (this.renderer?.domElement) {
      this.renderer.domElement.removeEventListener('pointermove', this._pointerMoveHandler);
      this.renderer.domElement.removeEventListener('pointerleave', this._pointerLeaveHandler);
      this.renderer.domElement.removeEventListener('click', this._clickHandler);
      this.renderer.domElement.removeEventListener('wheel', this._wheelHandler, true);
    }

    this._clearScene();

    if (this.starfield) {
      this.scene.remove(this.starfield);
      this._disposeObject(this.starfield);
      this.starfield = null;
    }

    this.backgroundGalaxies.forEach(object => {
      this.scene.remove(object);
      this._disposeObject(object);
    });
    this.backgroundGalaxies = [];

    this.backgroundGlows.forEach(object => {
      this.scene.remove(object);
      this._disposeObject(object);
    });
    this.backgroundGlows = [];

    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();

    if (this.circleTexture) {
      this.circleTexture.dispose();
      this.circleTexture = null;
    }

    if (this.controls?.dispose) {
      this.controls.dispose();
      this.controls = null;
    }

    super.destroy();
  }
}

export { KnowledgeGraphGalaxy };
export default KnowledgeGraphGalaxy;
