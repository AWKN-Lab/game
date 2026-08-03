/**
 * KnowledgeGraph3D - 3D知识图谱组件（Three.js 星球环绕式）
 * 实现中心核心知识点被多个次要知识点像行星一样环绕旋转的效果
 * 支持交互式控制：鼠标拖拽旋转、右键平移、滚轮缩放
 */
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.128.0/examples/jsm/renderers/CSS2DRenderer.js';

class KnowledgeGraph3D {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.onNodeClick = options.onNodeClick || null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.labelRenderer = null;
    this.controls = null;
    this.satellites = [];
    this.corePlanet = null;
    this.stars = null;
    this.dustParticles = null;

    this.subjectColor = {
      history: 0xefbd8a,
      daofa: 0xb6c4ff,
      default: 0xa0c0e0
    };

    this.radiusMap = { core: 1.2, major: 0.5, minor: 0.3 };

    this.CORE_NODES = ['fr_h4','ir_h2','k_declaration','k_wuxu_08','k_sanminzhuyi'];
    this.MAJOR_NODES = ['fr_h3','fr_h12','ir_h5','ir_h8','k_lexington','k_constitution','k_wuxu_01','k_wuxu_05','k_wuchang','k_zhonghua_minguo'];

    this._init();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050b1a);
    this.scene.fog = new THREE.FogExp2(0x050b1a, 0.008);

    // 初始化相机
    const width = this.container.getBoundingClientRect().width;
    const height = this.container.getBoundingClientRect().height;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(8, 5, 12);
    this.camera.lookAt(0, 0, 0);

    // 初始化WebGL渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // 初始化CSS2渲染器（用于文字标签）
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.left = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);

    // 初始化轨道控制
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 1.0;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 0, 0);

    // 添加灯光
    this._addLights();

    // 添加星空背景
    this._addStarfield();

    // 窗口 resize 事件
    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);

    // 动画循环
    this._animate();
  }

  _addLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404060);
    this.scene.add(ambientLight);

    // 主光源方向光
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.receiveShadow = false;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    // 补光
    const backLight = new THREE.PointLight(0xaa8866, 0.5);
    backLight.position.set(-3, 2, -4);
    this.scene.add(backLight);

    const fillLight = new THREE.PointLight(0x6688aa, 0.4);
    fillLight.position.set(4, 3, 2);
    this.scene.add(fillLight);

    // 中心球体周围光晕
    this.coreGlow = new THREE.PointLight(0x3399ff, 0.8, 12);
    this.coreGlow.position.set(0, 0, 0);
    this.scene.add(this.coreGlow);
  }

  _addStarfield() {
    // 星空粒子
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i*3] = (Math.random() - 0.5) * 200;
      starPositions[i*3+1] = (Math.random() - 0.5) * 100;
      starPositions[i*3+2] = (Math.random() - 0.5) * 150 - 50;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.15, transparent: true, opacity: 0.6 });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);

    // 飘浮粒子
    const dustParticleCount = 800;
    const dustGeometry = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustParticleCount * 3);
    for (let i = 0; i < dustParticleCount; i++) {
      const r = 2.0 + Math.random() * 3.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      dustPositions[i*3] = r * Math.sin(phi) * Math.cos(theta);
      dustPositions[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * 0.5;
      dustPositions[i*3+2] = r * Math.cos(phi);
    }
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.05, transparent: true, opacity: 0.4 });
    this.dustParticles = new THREE.Points(dustGeometry, dustMat);
    this.scene.add(this.dustParticles);
  }

  _getSizeType(id) {
    if (this.CORE_NODES.includes(id)) return 'core';
    if (this.MAJOR_NODES.includes(id)) return 'major';
    return 'minor';
  }

  loadData(data) {
    // 清除旧内容
    this._clearScene();

    const nodes = [];

    // 构建节点
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
          color: this.subjectColor[cat] || this.subjectColor.default
        });
      });
    });

    if (nodes.length === 0) {
      console.warn('KnowledgeGraph3D: No nodes to render');
      return;
    }

    this._buildGraph(nodes);
  }

  _clearScene() {
    // 清除卫星
    this.satellites.forEach(sat => {
      if (sat.mesh) this.scene.remove(sat.mesh);
      if (sat.label) this.scene.remove(sat.label);
      if (sat.line) this.scene.remove(sat.line);
    });
    this.satellites = [];

    // 清除核心
    if (this.corePlanet) this.scene.remove(this.corePlanet);
    if (this.glowHalo) this.scene.remove(this.glowHalo);
    if (this.coreRing) this.scene.remove(this.coreRing);
    if (this.coreLabel) this.scene.remove(this.coreLabel);
    if (this.decorRing) this.scene.remove(this.decorRing);
    if (this.flowRing) this.scene.remove(this.flowRing);
    if (this.flowRing2) this.scene.remove(this.flowRing2);

    this.corePlanet = null;
    this.glowHalo = null;
    this.coreRing = null;
    this.coreLabel = null;
    this.decorRing = null;
    this.flowRing = null;
    this.flowRing2 = null;
  }

  _buildGraph(nodes) {
    // 筛选核心节点
    const coreNodes = nodes.filter(n => n.sizeType === 'core');
    const nonCoreNodes = nodes.filter(n => n.sizeType !== 'core');

    if (coreNodes.length === 0) {
      console.warn('KnowledgeGraph3D: No core nodes found');
      return;
    }

    // 创建核心节点
    this._createCoreNode(coreNodes[0]);

    // 创建环绕的次要节点
    nonCoreNodes.forEach((node, idx) => {
      this._createSatellite(node, idx, nonCoreNodes.length);
    });
  }

  _createCoreNode(coreNode) {
    // 核心球体
    const coreGeometry = new THREE.SphereGeometry(this.radiusMap.core, 64, 64);
    const coreMaterial = new THREE.MeshStandardMaterial({
      color: coreNode.color,
      emissive: new THREE.Color(coreNode.color).multiplyScalar(0.3),
      emissiveIntensity: 0.35,
      metalness: 0.7,
      roughness: 0.3,
      flatShading: false
    });
    this.corePlanet = new THREE.Mesh(coreGeometry, coreMaterial);
    this.corePlanet.castShadow = true;
    this.corePlanet.receiveShadow = false;
    this.scene.add(this.corePlanet);

    // 核心外围光晕环
    const glowRingGeometry = new THREE.SphereGeometry(this.radiusMap.core * 1.1, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: coreNode.color,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide
    });
    this.glowHalo = new THREE.Mesh(glowRingGeometry, glowMaterial);
    this.scene.add(this.glowHalo);

    // 核心周围旋转粒子环
    const ringParticleCount = 180;
    const ringParticleGeo = new THREE.BufferGeometry();
    const ringPositions = new Float32Array(ringParticleCount * 3);
    for (let i = 0; i < ringParticleCount; i++) {
      const angle = (i / ringParticleCount) * Math.PI * 2;
      const radius = this.radiusMap.core * 1.375;
      ringPositions[i*3] = Math.cos(angle) * radius;
      ringPositions[i*3+1] = Math.sin(angle) * radius * 0.3;
      ringPositions[i*3+2] = Math.sin(angle) * radius;
    }
    ringParticleGeo.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
    const ringParticleMat = new THREE.PointsMaterial({ color: coreNode.color, size: 0.045, transparent: true });
    this.coreRing = new THREE.Points(ringParticleGeo, ringParticleMat);
    this.scene.add(this.coreRing);

    // 核心标签
    const coreDiv = document.createElement('div');
    coreDiv.textContent = `🌟 ${coreNode.name}`;
    coreDiv.style.backgroundColor = 'rgba(0, 20, 50, 0.85)';
    coreDiv.style.color = '#ffffff';
    coreDiv.style.fontSize = '18px';
    coreDiv.style.fontWeight = 'bold';
    coreDiv.style.padding = '12px 20px';
    coreDiv.style.borderRadius = '30px';
    coreDiv.style.border = `1px solid ${new THREE.Color(coreNode.color).getStyle()}`;
    coreDiv.style.boxShadow = `0 0 20px rgba(${coreNode.color >> 16}, ${(coreNode.color >> 8) & 0xff}, ${coreNode.color & 0xff}, 0.5)`;
    coreDiv.style.backdropFilter = 'blur(8px)';
    coreDiv.style.textAlign = 'center';
    coreDiv.style.fontFamily = 'system-ui, "Segoe UI", monospace';
    coreDiv.style.letterSpacing = '1px';
    this.coreLabel = new CSS2DObject(coreDiv);
    this.coreLabel.position.set(0, this.radiusMap.core * 1.5, 0);
    this.scene.add(this.coreLabel);

    // 装饰环
    const decorativeRingGeo = new THREE.TorusGeometry(this.radiusMap.core * 1.2, 0.03, 64, 300);
    const decorativeMat = new THREE.MeshStandardMaterial({ 
      color: coreNode.color, 
      emissive: new THREE.Color(coreNode.color).multiplyScalar(0.5), 
      emissiveIntensity: 0.3 
    });
    this.decorRing = new THREE.Mesh(decorativeRingGeo, decorativeMat);
    this.decorRing.rotation.x = Math.PI / 2;
    this.scene.add(this.decorRing);

    // 流光环
    const flowRingPoints = [];
    const flowRadius = this.radiusMap.core * 1.58;
    for (let i = 0; i <= 180; i++) {
      const angle = (i / 180) * Math.PI * 2;
      const x = Math.cos(angle) * flowRadius;
      const z = Math.sin(angle) * flowRadius;
      flowRingPoints.push(new THREE.Vector3(x, 0.2, z));
    }
    const flowRingGeo = new THREE.BufferGeometry().setFromPoints(flowRingPoints);
    const flowRingMat = new THREE.LineBasicMaterial({ color: coreNode.color });
    this.flowRing = new THREE.LineLoop(flowRingGeo, flowRingMat);
    this.scene.add(this.flowRing);

    const flowRingPoints2 = [];
    for (let i = 0; i <= 180; i++) {
      const angle = (i / 180) * Math.PI * 2;
      const x = Math.cos(angle) * (flowRadius + 0.15);
      const z = Math.sin(angle) * (flowRadius + 0.15);
      flowRingPoints2.push(new THREE.Vector3(x, -0.15, z));
    }
    const flowRingGeo2 = new THREE.BufferGeometry().setFromPoints(flowRingPoints2);
    this.flowRing2 = new THREE.LineLoop(flowRingGeo2, flowRingMat);
    this.scene.add(this.flowRing2);
  }

  _createSatellite(node, index, total) {
    const angleStep = (Math.PI * 2) / total;
    const startAngle = index * angleStep;
    const radius = 3 + (index % 3) * 0.8; // 不同轨道半径
    const speed = 0.003 + (index % 5) * 0.001; // 不同公转速度

    // 卫星球体
    const sphereGeo = new THREE.SphereGeometry(node.size, 48, 48);
    const material = new THREE.MeshStandardMaterial({
      color: node.color,
      metalness: 0.4,
      roughness: 0.3,
      emissive: new THREE.Color(node.color),
      emissiveIntensity: 0.15
    });
    const satelliteMesh = new THREE.Mesh(sphereGeo, material);
    satelliteMesh.castShadow = true;
    satelliteMesh.receiveShadow = false;
    this.scene.add(satelliteMesh);

    // 标签
    const labelDiv = document.createElement('div');
    labelDiv.textContent = node.name;
    labelDiv.style.backgroundColor = 'rgba(10, 20, 40, 0.85)';
    labelDiv.style.borderLeft = `4px solid ${new THREE.Color(node.color).getStyle()}`;
    labelDiv.style.borderRadius = '12px';
    labelDiv.style.padding = '8px 14px';
    labelDiv.style.backdropFilter = 'blur(12px)';
    labelDiv.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
    labelDiv.style.fontFamily = 'system-ui, "Segoe UI", sans-serif';
    labelDiv.style.minWidth = '130px';
    labelDiv.style.textAlign = 'center';
    labelDiv.style.color = '#f0f0f0';
    labelDiv.style.fontSize = '14px';
    labelDiv.style.fontWeight = 'bold';
    const label = new CSS2DObject(labelDiv);
    this.scene.add(label);

    // 连线
    const linePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(radius, 0, 0)];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x5a9eff, transparent: true, opacity: 0.7 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(line);

    // 创建轨道
    this._createOrbit(radius, 0x88aaff);

    // 存储卫星数据
    this.satellites.push({
      mesh: satelliteMesh,
      label: label,
      line: line,
      radius: radius,
      speed: speed,
      angle: startAngle,
      size: node.size,
      color: node.color,
      data: node
    });
  }

  _createOrbit(radius, color = 0x88aaff) {
    const points = [];
    const segments = 128;
    const angleStep = (Math.PI * 2) / segments;
    for (let i = 0; i <= segments; i++) {
      const angle = i * angleStep;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      points.push(new THREE.Vector3(x, 0, z));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.35 });
    const orbit = new THREE.LineLoop(geometry, material);
    this.scene.add(orbit);
    return orbit;
  }

  _animate() {
    requestAnimationFrame(() => this._animate());

    // 更新卫星位置
    this.satellites.forEach(sat => {
      sat.angle += sat.speed;
      if (sat.angle > Math.PI * 2) sat.angle -= Math.PI * 2;

      const x = Math.cos(sat.angle) * sat.radius;
      const z = Math.sin(sat.angle) * sat.radius;
      const y = Math.sin(sat.angle * 2) * 0.12;

      sat.mesh.position.set(x, y, z);
      sat.label.position.set(x, y + sat.size + 0.3, z);

      const positions = sat.line.geometry.attributes.position.array;
      positions[0] = 0;
      positions[1] = 0;
      positions[2] = 0;
      positions[3] = x;
      positions[4] = y;
      positions[5] = z;
      sat.line.geometry.attributes.position.needsUpdate = true;
    });

    // 核心动画
    if (this.corePlanet) {
      this.corePlanet.rotation.y += 0.003;
    }
    if (this.glowHalo) {
      this.glowHalo.rotation.x += 0.001;
      this.glowHalo.rotation.z += 0.002;
    }
    if (this.decorRing) {
      this.decorRing.rotation.z += 0.005;
      this.decorRing.rotation.x += 0.003;
    }
    if (this.coreRing) {
      this.coreRing.rotation.y += 0.01;
      this.coreRing.rotation.x += 0.005;
    }
    if (this.flowRing) {
      this.flowRing.rotation.y += 0.008;
    }
    if (this.flowRing2) {
      this.flowRing2.rotation.y -= 0.005;
    }

    // 星空动画
    if (this.stars) {
      this.stars.rotation.y += 0.0005;
      this.stars.rotation.x += 0.0003;
    }
    if (this.dustParticles) {
      this.dustParticles.rotation.y += 0.001;
      this.dustParticles.rotation.x += 0.0005;
    }

    // 核心光源呼吸效果
    if (this.coreGlow) {
      const time = Date.now() * 0.001;
      const intensity = 0.7 + Math.sin(time * 2) * 0.15;
      this.coreGlow.intensity = intensity;
    }

    // 更新控制器
    if (this.controls) {
      this.controls.update();
    }

    // 渲染
    if (this.renderer && this.camera && this.scene) {
      this.renderer.render(this.scene, this.camera);
    }
    if (this.labelRenderer && this.camera && this.scene) {
      this.labelRenderer.render(this.scene, this.camera);
    }
  }

  _onResize() {
    if (!this.container || !this.camera || !this.renderer || !this.labelRenderer) return;

    const width = this.container.getBoundingClientRect().width;
    const height = this.container.getBoundingClientRect().height;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  }

  destroy() {
    if (this.simulation) this.simulation.stop();
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement && this.renderer.domElement.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
    }
    if (this.labelRenderer && this.labelRenderer.domElement && this.labelRenderer.domElement.parentNode) {
      this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
    }
    if (this.controls) {
      this.controls.dispose();
    }
    window.removeEventListener('resize', this._resizeHandler);
  }
}

export { KnowledgeGraph3D };
export default KnowledgeGraph3D;