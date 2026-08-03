/**
 * KnowledgeGraph3DForce - 3D力导向知识图谱
 * 使用Three.js + d3-force-3d实现3D空间中的力导向布局
 */
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.128.0/examples/jsm/renderers/CSS2DRenderer.js';

class KnowledgeGraph3DForce {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.onNodeClick = options.onNodeClick || null;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.labelRenderer = null;
    this.controls = null;
    this.nodes3D = [];
    this.links3D = [];

    this.subjectColor = {
      history: 0xefbd8a,
      daofa: 0xb6c4ff,
      default: 0xa0c0e0
    };

    this.radiusMap = { core: 0.6, major: 0.35, minor: 0.2 };

    this.CORE_NODES = ['fr_h4','ir_h2','k_declaration','k_wuxu_08','k_sanminzhuyi'];
    this.MAJOR_NODES = ['fr_h3','fr_h12','ir_h5','ir_h8','k_lexington','k_constitution','k_wuxu_01','k_wuxu_05','k_wuchang','k_zhonghua_minguo'];

    this._init();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0e27);
    this.scene.fog = new THREE.FogExp2(0x0a0e27, 0.02);

    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 0, 20);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(this.width, this.height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.left = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0x404060);
    this.scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    this.scene.add(dirLight);

    this._addStarfield();

    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);

    this.time = 0;
    this._animate();
  }

  _addStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 800;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i*3] = (Math.random() - 0.5) * 200;
      starPositions[i*3+1] = (Math.random() - 0.5) * 200;
      starPositions[i*3+2] = (Math.random() - 0.5) * 200;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.5 });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  _getSizeType(id) {
    if (this.CORE_NODES.includes(id)) return 'core';
    if (this.MAJOR_NODES.includes(id)) return 'major';
    return 'minor';
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
        nodes.push({
          id: item.id,
          name: item.name,
          content: item.content,
          subject: cat,
          act: item.act,
          sizeType: sizeType,
          size: this.radiusMap[sizeType],
          color: this.subjectColor[cat] || this.subjectColor.default,
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10,
          z: (Math.random() - 0.5) * 10,
          vx: 0, vy: 0, vz: 0
        });
      });
    });

    // 创建连接：核心节点连接到同科目的其他节点
    const coreNodes = nodes.filter(n => n.sizeType === 'core');
    const nonCoreNodes = nodes.filter(n => n.sizeType !== 'core');

    coreNodes.forEach(core => {
      const sameSubject = nonCoreNodes.filter(n => n.subject === core.subject);
      sameSubject.forEach(n => {
        links.push({ source: core.id, target: n.id });
      });
    });

    // 同科目节点之间也连接
    categories.forEach(cat => {
      const catNodes = nodes.filter(n => n.subject === cat);
      for (let i = 0; i < catNodes.length - 1; i++) {
        if (Math.random() > 0.5) {
          links.push({ source: catNodes[i].id, target: catNodes[i+1].id });
        }
      }
    });

    this._buildGraph(nodes, links);
  }

  _clearScene() {
    this.nodes3D.forEach(n => {
      if (n.mesh) this.scene.remove(n.mesh);
      if (n.label) this.scene.remove(n.label);
    });
    this.links3D.forEach(l => {
      if (l.line) this.scene.remove(l.line);
    });
    this.nodes3D = [];
    this.links3D = [];
  }

  _buildGraph(nodes, links) {
    const nodeMap = {};
    nodes.forEach(n => { nodeMap[n.id] = n; });

    // 创建3D节点
    nodes.forEach(node => {
      const geometry = new THREE.SphereGeometry(node.size, 32, 32);
      const material = new THREE.MeshStandardMaterial({
        color: node.color,
        emissive: new THREE.Color(node.color).multiplyScalar(0.2),
        metalness: 0.5,
        roughness: 0.3
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(node.x, node.y, node.z);
      this.scene.add(mesh);

      const labelDiv = document.createElement('div');
      labelDiv.textContent = node.name;
      labelDiv.style.backgroundColor = 'rgba(10, 20, 40, 0.85)';
      labelDiv.style.color = '#ffffff';
      labelDiv.style.fontSize = node.sizeType === 'core' ? '14px' : '11px';
      labelDiv.style.fontWeight = node.sizeType === 'core' ? 'bold' : 'normal';
      labelDiv.style.padding = '4px 8px';
      labelDiv.style.borderRadius = '8px';
      labelDiv.style.borderLeft = `3px solid ${new THREE.Color(node.color).getStyle()}`;
      labelDiv.style.whiteSpace = 'nowrap';
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, node.size + 0.3, 0);
      mesh.add(label);

      this.nodes3D.push({ ...node, mesh, label });
    });

    // 创建3D连接线
    links.forEach(link => {
      const sourceNode = this.nodes3D.find(n => n.id === link.source);
      const targetNode = this.nodes3D.find(n => n.id === link.target);
      if (!sourceNode || !targetNode) return;

      const points = [
        sourceNode.mesh.position.clone(),
        targetNode.mesh.position.clone()
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x5a9eff,
        transparent: true,
        opacity: 0.3
      });
      const line = new THREE.Line(geometry, material);
      this.scene.add(line);

      this.links3D.push({ source: sourceNode, target: targetNode, line });
    });

    // 启动力模拟
    this._startSimulation(nodes, links, nodeMap);
  }

  _startSimulation(nodes, links, nodeMap) {
    const alpha = 0.3;
    const chargeStrength = -30;
    const linkDistance = 4;
    const centerStrength = 0.05;

    const simulate = () => {
      // 斥力
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dz = nodes[j].z - nodes[i].z;
          const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.1;
          const force = chargeStrength / (dist * dist);
          const fx = dx / dist * force;
          const fy = dy / dist * force;
          const fz = dz / dist * force;
          nodes[i].vx -= fx; nodes[i].vy -= fy; nodes[i].vz -= fz;
          nodes[j].vx += fx; nodes[j].vy += fy; nodes[j].vz += fz;
        }
      }

      // 弹簧力
      links.forEach(link => {
        const source = nodeMap[link.source];
        const target = nodeMap[link.target];
        if (!source || !target) return;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dz = target.z - source.z;
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.1;
        const force = (dist - linkDistance) * 0.05;
        const fx = dx / dist * force;
        const fy = dy / dist * force;
        const fz = dz / dist * force;
        source.vx += fx; source.vy += fy; source.vz += fz;
        target.vx -= fx; target.vy -= fy; target.vz -= fz;
      });

      // 中心引力
      nodes.forEach(node => {
        node.vx -= node.x * centerStrength;
        node.vy -= node.y * centerStrength;
        node.vz -= node.z * centerStrength;
      });

      // 更新位置
      nodes.forEach(node => {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.vz *= 0.9;
        node.x += node.vx * alpha;
        node.y += node.vy * alpha;
        node.z += node.vz * alpha;
      });

      // 更新3D位置
      this.nodes3D.forEach(n => {
        const node = nodes.find(nd => nd.id === n.id);
        if (node) {
          n.mesh.position.set(node.x, node.y, node.z);
        }
      });

      // 更新连接线
      this.links3D.forEach(l => {
        const positions = l.line.geometry.attributes.position.array;
        positions[0] = l.source.mesh.position.x;
        positions[1] = l.source.mesh.position.y;
        positions[2] = l.source.mesh.position.z;
        positions[3] = l.target.mesh.position.x;
        positions[4] = l.target.mesh.position.y;
        positions[5] = l.target.mesh.position.z;
        l.line.geometry.attributes.position.needsUpdate = true;
      });
    };

    // 运行模拟
    let iterations = 0;
    const runSim = () => {
      if (iterations < 300) {
        simulate();
        iterations++;
        requestAnimationFrame(runSim);
      }
    };
    runSim();
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.time += 0.016;

    if (this.stars) {
      this.stars.rotation.y += 0.0002;
    }

    if (this.controls) this.controls.update();

    if (this.renderer && this.camera && this.scene) {
      this.renderer.render(this.scene, this.camera);
    }
    if (this.labelRenderer && this.camera && this.scene) {
      this.labelRenderer.render(this.scene, this.camera);
    }
  }

  _onResize() {
    if (!this.container || !this.camera || !this.renderer || !this.labelRenderer) return;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.labelRenderer.setSize(this.width, this.height);
  }

  destroy() {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    if (this.labelRenderer && this.labelRenderer.domElement && this.labelRenderer.domElement.parentNode) {
      this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
    }
    if (this.controls) this.controls.dispose();
    window.removeEventListener('resize', this._resizeHandler);
  }
}

export { KnowledgeGraph3DForce };
export default KnowledgeGraph3DForce;