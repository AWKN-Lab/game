/**
 * KnowledgeGraphForce3D - 3D力导向知识图谱
 * 基于D3力导向算法计算布局，在3D空间中渲染
 * 特性：D3力模拟布局、3D球体渲染、暗线、文字标签、鼠标悬停高亮、行星公转
 */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import BaseKnowledgeGraph from './base-knowledge-graph.js';

class KnowledgeGraphForce3D extends BaseKnowledgeGraph {
  constructor(containerId, options = {}) {
    super(containerId, options);
    
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.nodes3D = [];
    this.links3D = [];
    this.nodeMeshes = new Map();
    this.linkMeshes = [];
    this.particleSystems = [];
    this.labelsContainer = null;
    this.nodeLabels = new Map();

    this.groupColor = {
      french_revolution: 0xefbd8a,
      industrial_revolution: 0xb6c4ff,
      wuxu_reform: 0xa0c0e0,
      xinhai_revolution: 0xefbd8a,
      american_revolution: 0xb6c4ff
    };

    this.groupColorCSS = {
      french_revolution: '#efbd8a',
      industrial_revolution: '#b6c4ff',
      wuxu_reform: '#a0c0e0',
      xinhai_revolution: '#efbd8a',
      american_revolution: '#b6c4ff'
    };

    this.radiusMap = { core: 2.5, major: 1.5, minor: 0.9 };

    this.highlightedNodes = new Set();
    this.highlightedLinks = new Set();
    this.selectedNode = null;
    this.hoveredNode = null;

    this._init();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b1a);
    this.scene.fog = new THREE.FogExp2(0x050b1a, 0.008);

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 50);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.8;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    this._addLights();
    this._addStarfield();
    this._createLabelsContainer();

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

  _addLights() {
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 10, 10);
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x6688ff, 0.4, 100);
    pointLight.position.set(-10, -10, -10);
    this.scene.add(pointLight);
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
      case 'high': count = 2000;
        break;
      case 'medium': count = 1000;
        break;
      case 'low':
      default: count = 500;
        break;
    }
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i*3] = (Math.random() - 0.5) * 300;
      positions[i*3+1] = (Math.random() - 0.5) * 300;
      positions[i*3+2] = (Math.random() - 0.5) * 300;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    });
    this.stars = new THREE.Points(geometry, material);
    this.scene.add(this.stars);
  }





  loadData(data) {
    this._clearScene();

    const nodes = [];
    const links = [];
    const categories = Object.keys(data);

    categories.forEach(cat => {
      const items = data[cat];
      if (!items || items.length === 0) return;
      items.forEach(item => {
        const sizeType = this._getSizeType(item.id);
        const group = this._getGroup(item.id);
        nodes.push({
          id: item.id,
          name: item.name,
          content: item.content,
          group: group,
          act: item.act,
          sizeType: sizeType,
          size: this.radiusMap[sizeType],
          color: this.groupColor[group] || this.groupColor.american_revolution,
          colorCSS: this.groupColorCSS[group] || this.groupColorCSS.american_revolution,
          x: 0, y: 0, z: 0
        });
      });
    });

    if (nodes.length === 0) return;

    const coreNodes = nodes.filter(n => n.sizeType === 'core');
    const nonCoreNodes = nodes.filter(n => n.sizeType !== 'core');

    coreNodes.forEach(core => {
      const sameGroup = nonCoreNodes.filter(n => n.group === core.group);
      sameGroup.forEach(n => {
        links.push({ source: core.id, target: n.id, color: core.color });
      });
    });

    this.nodes3D = nodes;
    this.links3D = links;

    this._runD3ForceSimulation();
    this._buildGraph();
  }

  _runD3ForceSimulation() {
    const groups = ['french_revolution', 'industrial_revolution', 'wuxu_reform', 'xinhai_revolution', 'american_revolution'];
    const groupCenters = {};
    const groupRadius = 25;
    groups.forEach((grp, idx) => {
      const angle = (idx / groups.length) * Math.PI * 2 - Math.PI / 2;
      groupCenters[grp] = {
        x: Math.cos(angle) * groupRadius,
        y: Math.sin(angle) * groupRadius
      };
    });

    this.nodes3D.forEach(node => {
      const center = groupCenters[node.group] || { x: 0, y: 0 };
      node.cx = center.x;
      node.cy = center.y;
    });

    const simulation = d3.forceSimulation(this.nodes3D)
      .force('charge', d3.forceManyBody().strength(d => -80 - d.size * 20).distanceMax(150))
      .force('link', d3.forceLink(this.links3D)
        .id(d => d.id)
        .distance(d => {
          const sourceNode = this.nodes3D.find(n => n.id === d.source);
          const targetNode = this.nodes3D.find(n => n.id === d.target);
          if (!sourceNode || !targetNode) return 50;
          if (sourceNode.sizeType === 'core' || targetNode.sizeType === 'core') return 20;
          return 40;
        })
        .strength(d => {
          const sourceNode = this.nodes3D.find(n => n.id === d.source);
          const targetNode = this.nodes3D.find(n => n.id === d.target);
          if (!sourceNode || !targetNode) return 0.3;
          return sourceNode.group === targetNode.group ? 0.8 : 0.05;
        })
      )
      .force('center', d3.forceCenter(0, 0).strength(0.01))
      .force('collision', d3.forceCollide().radius(d => d.size * 5).strength(0.8))
      .force('x', d3.forceX(d => d.cx).strength(0.1))
      .force('y', d3.forceY(d => d.cy).strength(0.1));

    for (let i = 0; i < 300; i++) {
      simulation.tick();
    }

    simulation.stop();

    this.nodes3D.forEach(node => {
      const zOffset = (Math.random() - 0.5) * 15;
      node.z = zOffset;
    });

    this._setupOrbitsFromD3Layout();
  }

  _setupOrbitsFromD3Layout() {
    const coreNodes = this.nodes3D.filter(n => n.sizeType === 'core');
    const majorNodes = this.nodes3D.filter(n => n.sizeType === 'major');
    const minorNodes = this.nodes3D.filter(n => n.sizeType === 'minor');

    coreNodes.forEach(node => {
      node.orbitRadius = 0;
      node.orbitSpeed = 0;
      node.orbitAngle = 0;
      node.orbitCenterX = node.x;
      node.orbitCenterY = node.y;
      node.orbitCenterZ = node.z;
      node.orbitInclination = 0;
      node.baseZ = node.z;
    });

    majorNodes.forEach((node, idx) => {
      let nearestCore = coreNodes[0];
      let minDist = Infinity;
      coreNodes.forEach(core => {
        const dx = node.x - core.x;
        const dy = node.y - core.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
          minDist = dist;
          nearestCore = core;
        }
      });

      node.orbitCenterX = nearestCore.x;
      node.orbitCenterY = nearestCore.y;
      node.orbitCenterZ = nearestCore.z;
      node.orbitRadius = Math.max(5, minDist * 0.8);
      node.orbitSpeed = 0.003 + (idx % 5) * 0.001;
      node.orbitAngle = Math.atan2(node.y - nearestCore.y, node.x - nearestCore.x);
      node.orbitInclination = (Math.random() - 0.5) * 0.5;
      node.baseZ = node.z;
    });

    minorNodes.forEach((node, idx) => {
      let nearestCore = coreNodes[0];
      let minDist = Infinity;
      coreNodes.forEach(core => {
        const dx = node.x - core.x;
        const dy = node.y - core.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < minDist) {
          minDist = dist;
          nearestCore = core;
        }
      });

      node.orbitCenterX = nearestCore.x;
      node.orbitCenterY = nearestCore.y;
      node.orbitCenterZ = nearestCore.z;
      node.orbitRadius = Math.max(8, minDist * 0.8);
      node.orbitSpeed = 0.002 + (idx % 7) * 0.0005;
      node.orbitAngle = Math.atan2(node.y - nearestCore.y, node.x - nearestCore.x);
      node.orbitInclination = (Math.random() - 0.5) * 0.8;
      node.baseZ = node.z;
    });
  }

  _clearScene() {
    this.nodeMeshes.forEach(mesh => this.scene.remove(mesh));
    this.nodeMeshes.clear();
    this.linkMeshes.forEach(l => this.scene.remove(l.line));
    this.linkMeshes = [];
    this.particleSystems.forEach(p => this.scene.remove(p));
    this.particleSystems = [];
    this.highlightedNodes.clear();
    this.highlightedLinks.clear();
    this.selectedNode = null;
    this.hoveredNode = null;
    
    if (this.labelsContainer) {
      this.labelsContainer.innerHTML = '';
    }
    this.nodeLabels.clear();
  }

  _buildGraph() {
    const nodeMap = {};
    this.nodes3D.forEach(n => { nodeMap[n.id] = n; });

    this.nodes3D.forEach(node => {
      const geometry = new THREE.SphereGeometry(node.size, 32, 32);
      const material = new THREE.MeshPhongMaterial({
        color: node.color,
        emissive: new THREE.Color(node.color).multiplyScalar(0.15),
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.35,
        shininess: 100
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.x, node.y, node.z);
      mesh.userData = { node: node, originalScale: 1 };

      const haloGeo = new THREE.SphereGeometry(node.size * 1.5, 16, 16);
      const haloMat = new THREE.MeshBasicMaterial({
        color: node.color,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      mesh.add(halo);

      this.scene.add(mesh);
      this.nodeMeshes.set(node.id, mesh);

      this._createLabel(node);
    });

    this.links3D.forEach(link => {
      const source = nodeMap[link.source];
      const target = nodeMap[link.target];
      if (!source || !target) return;

      const points = [new THREE.Vector3(source.x, source.y, source.z), new THREE.Vector3(target.x, target.y, target.z)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x333344,
        transparent: true,
        opacity: 0.04
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);
      this.linkMeshes.push({ line, source, target, material });

      this._createLinkParticles(source, target, link.color || 0x5a9eff);
    });

    this._setupInteraction();
  }

  _createLabel(node) {
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      color: ${node.colorCSS};
      font-size: ${node.sizeType === 'core' ? '13px' : node.sizeType === 'major' ? '11px' : '9px'};
      font-weight: ${node.sizeType === 'core' ? 'bold' : 'normal'};
      text-shadow: 0 0 4px rgba(0,0,0,0.8), 0 0 8px ${node.colorCSS}40;
      white-space: nowrap;
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
      opacity: 0.4;
    `;
    label.textContent = node.name;
    this.labelsContainer.appendChild(label);
    this.nodeLabels.set(node.id, label);
  }

  _updateLabels() {
    const widthHalf = this.width / 2;
    const heightHalf = this.height / 2;

    this.nodes3D.forEach(node => {
      const mesh = this.nodeMeshes.get(node.id);
      const label = this.nodeLabels.get(node.id);
      if (!mesh || !label) return;

      const pos = mesh.position.clone();
      pos.project(this.camera);

      const x = (pos.x * widthHalf) + widthHalf;
      const y = -(pos.y * heightHalf) + heightHalf;

      if (pos.z < 1) {
        label.style.display = 'block';
        label.style.left = `${x}px`;
        label.style.top = `${y - node.size * 15 - 15}px`;
        label.style.transform = 'translate(-50%, -100%)';
      } else {
        label.style.display = 'none';
      }
    });
  }

  _createLinkParticles(source, target, color) {
    const particleCount = 3;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: color,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(geometry, material);
    particles.userData = { source, target, progress: Math.random() };
    this.scene.add(particles);
    this.particleSystems.push(particles);
  }

  _setupInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    this._clickHandler = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(Array.from(this.nodeMeshes.values()));

      if (intersects.length > 0) {
        const node = intersects[0].object.userData.node;
        this._selectNode(node);
      } else {
        this._deselectNode();
      }
    };

    this._mousemoveHandler = (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(Array.from(this.nodeMeshes.values()));

      if (intersects.length > 0) {
        const node = intersects[0].object.userData.node;
        if (this.hoveredNode !== node.id) {
          this.hoveredNode = node.id;
          this._highlightNode(node.id);
        }
      } else {
        if (this.hoveredNode) {
          this.hoveredNode = null;
          this._clearHighlight();
        }
      }
    };

    this.renderer.domElement.addEventListener('click', this._clickHandler);
    this.renderer.domElement.addEventListener('mousemove', this._mousemoveHandler);
  }

  _hoverNode(node) {
    if (this.selectedNode) return;

    this.highlightedNodes.clear();
    this.highlightedLinks.clear();
    this.highlightedNodes.add(node.id);

    this.links3D.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      if (sourceId === node.id || targetId === node.id) {
        this.highlightedLinks.add(link);
        const otherId = sourceId === node.id ? targetId : sourceId;
        this.highlightedNodes.add(otherId);
      }
    });

    this._updateVisuals();
  }

  _unhoverNode() {
    if (this.selectedNode) return;
    this.highlightedNodes.clear();
    this.highlightedLinks.clear();
    this._updateVisuals();
  }

  _selectNode(node) {
    this.selectedNode = node;
    this.highlightedNodes.clear();
    this.highlightedLinks.clear();

    this.highlightedNodes.add(node.id);

    this.links3D.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      if (sourceId === node.id || targetId === node.id) {
        this.highlightedLinks.add(link);
        const otherId = sourceId === node.id ? targetId : sourceId;
        this.highlightedNodes.add(otherId);
      }
    });

    this._updateVisuals();

    if (this.onNodeClick) {
      this.onNodeClick(node);
    }
  }

  _deselectNode() {
    this.selectedNode = null;
    this.highlightedNodes.clear();
    this.highlightedLinks.clear();
    this._updateVisuals();
  }

  _updateVisuals() {
    const hasHighlight = this.highlightedNodes.size > 0;

    this.nodeMeshes.forEach((mesh, id) => {
      const isHighlighted = this.highlightedNodes.has(id);
      const node = mesh.userData.node;

      if (hasHighlight) {
        if (isHighlighted) {
          mesh.material.opacity = 1;
          mesh.material.emissiveIntensity = 0.8;
          mesh.scale.setScalar(1.5);
        } else {
          mesh.material.opacity = 0.08;
          mesh.material.emissiveIntensity = 0.05;
          mesh.scale.setScalar(0.7);
        }
      } else {
        mesh.material.opacity = 0.35;
        mesh.material.emissiveIntensity = 0.2;
        mesh.scale.setScalar(1);
      }
    });

    this.nodeLabels.forEach((label, id) => {
      const isHighlighted = this.highlightedNodes.has(id);
      if (hasHighlight) {
        if (isHighlighted) {
          label.style.opacity = '1';
          label.style.transform = 'translate(-50%, -100%) scale(1.2)';
        } else {
          label.style.opacity = '0.1';
          label.style.transform = 'translate(-50%, -100%) scale(0.8)';
        }
      } else {
        label.style.opacity = '0.4';
        label.style.transform = 'translate(-50%, -100%) scale(1)';
      }
    });

    this.linkMeshes.forEach(({ line, material, source, target }) => {
      const link = this.links3D.find(l => {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        return (s === source.id && t === target.id) || (s === target.id && t === source.id);
      });

      const isHighlighted = link && this.highlightedLinks.has(link);

      if (hasHighlight) {
        if (isHighlighted) {
          material.opacity = 0.8;
          material.color.setHex(0xffffff);
        } else {
          material.opacity = 0.01;
          material.color.setHex(0x111122);
        }
      } else {
        material.opacity = 0.04;
        material.color.setHex(0x333344);
      }
    });
  }

  _animate() {
    this._animationId = requestAnimationFrame(() => this._animate());

    this.nodes3D.forEach(node => {
      if (node.orbitRadius > 0) {
        node.orbitAngle += node.orbitSpeed;
        const cosInc = Math.cos(node.orbitInclination);
        const sinInc = Math.sin(node.orbitInclination);

        const offsetX = Math.cos(node.orbitAngle) * node.orbitRadius;
        const offsetY = Math.sin(node.orbitAngle) * node.orbitRadius * sinInc;
        const offsetZ = Math.sin(node.orbitAngle) * node.orbitRadius * cosInc;

        node.x = node.orbitCenterX + offsetX;
        node.y = node.orbitCenterY + offsetY;
        node.z = node.baseZ + offsetZ * 0.3;

        const mesh = this.nodeMeshes.get(node.id);
        if (mesh) {
          mesh.position.set(node.x, node.y, node.z);
        }
      }
    });

    this.linkMeshes.forEach(({ line, source, target }) => {
      const positions = line.geometry.attributes.position.array;
      positions[0] = source.x; positions[1] = source.y; positions[2] = source.z;
      positions[3] = target.x; positions[4] = target.y; positions[5] = target.z;
      line.geometry.attributes.position.needsUpdate = true;
    });

    this.particleSystems.forEach(particles => {
      const { source, target } = particles.userData;
      particles.userData.progress += 0.008;
      if (particles.userData.progress > 1) particles.userData.progress = 0;

      const t = particles.userData.progress;
      const positions = particles.geometry.attributes.position.array;
      positions[0] = source.x + (target.x - source.x) * t;
      positions[1] = source.y + (target.y - source.y) * t;
      positions[2] = source.z + (target.z - source.z) * t;
      particles.geometry.attributes.position.needsUpdate = true;
    });

    this.nodeMeshes.forEach(mesh => {
      mesh.rotation.y += 0.005;
      mesh.rotation.x += 0.002;
    });

    if (this.stars) {
      this.stars.rotation.y += 0.0002;
      this.stars.rotation.x += 0.0001;
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

    // 移除鼠标事件监听器
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.removeEventListener('click', this._clickHandler);
      this.renderer.domElement.removeEventListener('mousemove', this._mousemoveHandler);
    }

    this.scene?.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (this.labelsContainer && this.labelsContainer.parentNode) {
      this.labelsContainer.parentNode.removeChild(this.labelsContainer);
    }

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

export { KnowledgeGraphForce3D };
export default KnowledgeGraphForce3D;
