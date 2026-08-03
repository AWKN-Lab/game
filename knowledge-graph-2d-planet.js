/**
 * KnowledgeGraph2DPlanet - 2D平面风格星球环绕式知识图谱
 * 使用Three.js的PlaneGeometry创建圆形平面纹理，模拟2D视觉效果
 */
import * as THREE from 'https://unpkg.com/three@0.128.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.128.0/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'https://unpkg.com/three@0.128.0/examples/jsm/renderers/CSS2DRenderer.js';

class KnowledgeGraph2DPlanet {
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
    this.satellites = [];
    this.corePlanet = null;
    this.stars = null;
    this.dustParticles = null;

    this.subjectColor = {
      history: 0xefbd8a,
      daofa: 0xb6c4ff,
      default: 0xa0c0e0
    };

    this.radiusMap = { core: 1.1, major: 0.5, minor: 0.3 };

    this.CORE_NODES = ['fr_h4','ir_h2','k_declaration','k_wuxu_08','k_sanminzhuyi'];
    this.MAJOR_NODES = ['fr_h3','fr_h12','ir_h5','ir_h8','k_lexington','k_constitution','k_wuxu_01','k_wuxu_05','k_wuchang','k_zhonghua_minguo'];

    this._init();
  }

  _init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x071a2b);
    this.scene.fog = new THREE.FogExp2(0x071a2b, 0.006);

    this.camera = new THREE.PerspectiveCamera(40, this.width / this.height, 0.1, 1000);
    this.camera.position.set(0, 2, 14);
    this.camera.lookAt(0, 0, 0);

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
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 1.2;
    this.controls.panSpeed = 0.8;
    this.controls.enableZoom = true;
    this.controls.enablePan = true;
    this.controls.autoRotate = false;
    this.controls.target.set(0, 0, 0);
    this.controls.maxPolarAngle = Math.PI / 2.2;

    this._addLights();
    this._addStarfield();

    this._resizeHandler = () => this._onResize();
    window.addEventListener('resize', this._resizeHandler);

    this.time = 0;
    this._animate();
  }

  _addLights() {
    const ambientLight = new THREE.AmbientLight(0x404060);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(3, 8, 4);
    this.scene.add(dirLight);

    const backLight = new THREE.PointLight(0x88aaff, 0.4);
    backLight.position.set(-2, 1, -3);
    this.scene.add(backLight);

    const fillLight = new THREE.PointLight(0xffaa66, 0.3);
    fillLight.position.set(4, 2, 2);
    this.scene.add(fillLight);

    this.centerGlow = new THREE.PointLight(0x3399ff, 0.6, 10);
    this.centerGlow.position.set(0, 0, 0);
    this.scene.add(this.centerGlow);
  }

  _addStarfield() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i*3] = (Math.random() - 0.5) * 200;
      starPositions[i*3+1] = (Math.random() - 0.5) * 100;
      starPositions[i*3+2] = (Math.random() - 0.5) * 100 - 40;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.6 });
    this.stars = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.stars);
  }

  _createCircleTexture(colorHex) {
    const canvas = document.createElement('canvas');
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size * 0.45;

    ctx.clearRect(0, 0, size, size);

    const mainColor = new THREE.Color(colorHex);
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, `rgba(${mainColor.r*255}, ${mainColor.g*255}, ${mainColor.b*255}, 1)`);
    gradient.addColorStop(0.6, `rgba(${mainColor.r*255}, ${mainColor.g*255}, ${mainColor.b*255}, 0.9)`);
    gradient.addColorStop(1, `rgba(${mainColor.r*255*0.7}, ${mainColor.g*255*0.7}, ${mainColor.b*255*0.7}, 0.85)`);

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius * 0.7, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius + 8, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${mainColor.r*255}, ${mainColor.g*255}, ${mainColor.b*255}, 0.2)`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius - 4, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.5)`;
    ctx.lineWidth = 3;
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  _createSatelliteLabel(title, details, colorHex) {
    const container = document.createElement('div');
    container.style.backgroundColor = `rgba(15, 25, 45, 0.9)`;
    container.style.borderLeft = `4px solid ${new THREE.Color(colorHex).getStyle()}`;
    container.style.borderRadius = '16px';
    container.style.padding = '6px 14px';
    container.style.backdropFilter = 'blur(12px)';
    container.style.boxShadow = '0 4px 15px rgba(0,0,0,0.4)';
    container.style.fontFamily = 'system-ui, "Segoe UI", sans-serif';
    container.style.minWidth = '130px';
    container.style.textAlign = 'center';
    container.style.color = '#f0f0f0';

    const titleElem = document.createElement('div');
    titleElem.textContent = title;
    titleElem.style.fontWeight = 'bold';
    titleElem.style.fontSize = '15px';
    titleElem.style.marginBottom = '5px';
    titleElem.style.color = new THREE.Color(colorHex).getStyle();
    titleElem.style.textShadow = '0 0 2px rgba(0,0,0,0.5)';

    const detailElem = document.createElement('div');
    detailElem.textContent = details;
    detailElem.style.fontSize = '11px';
    detailElem.style.lineHeight = '1.4';
    detailElem.style.opacity = '0.9';
    detailElem.style.whiteSpace = 'pre-line';

    container.appendChild(titleElem);
    container.appendChild(detailElem);
    return new CSS2DObject(container);
  }

  _getSizeType(id) {
    if (this.CORE_NODES.includes(id)) return 'core';
    if (this.MAJOR_NODES.includes(id)) return 'major';
    return 'minor';
  }

  loadData(data) {
    this._clearScene();

    const nodes = [];
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
      console.warn('KnowledgeGraph2DPlanet: No nodes to render');
      return;
    }

    this._buildGraph(nodes);
  }

  _clearScene() {
    if (this.satellites) {
      this.satellites.forEach(sat => {
        if (sat.mesh) this.scene.remove(sat.mesh);
        if (sat.label) this.scene.remove(sat.label);
        if (sat.line) this.scene.remove(sat.line);
      });
    }
    this.satellites = [];

    if (this.corePlanet) this.scene.remove(this.corePlanet);
    if (this.decorRing) this.scene.remove(this.decorRing);
    if (this.coreLabel) this.scene.remove(this.coreLabel);
    if (this.coreDots) this.scene.remove(this.coreDots);

    this.corePlanet = null;
    this.decorRing = null;
    this.coreLabel = null;
    this.coreDots = null;
  }

  _buildGraph(nodes) {
    const coreNodes = nodes.filter(n => n.sizeType === 'core');
    const nonCoreNodes = nodes.filter(n => n.sizeType !== 'core');

    if (coreNodes.length === 0) {
      console.warn('KnowledgeGraph2DPlanet: No core nodes found');
      return;
    }

    this._createCoreNode(coreNodes[0]);
    nonCoreNodes.forEach((node, idx) => {
      this._createSatellite(node, idx, nonCoreNodes.length);
    });
    this._addDustParticles();
  }

  _createCoreNode(coreNode) {
    const coreTexture = this._createCircleTexture(coreNode.color);
    const corePlaneMat = new THREE.MeshStandardMaterial({
      map: coreTexture,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true
    });
    this.corePlanet = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), corePlaneMat);
    this.corePlanet.position.set(0, 0, 0);
    this.scene.add(this.corePlanet);

    const decorRingGeo = new THREE.TorusGeometry(1.35, 0.03, 64, 300);
    const decorRingMat = new THREE.MeshStandardMaterial({
      color: 0x5a9eff,
      emissive: 0x1a4488,
      emissiveIntensity: 0.3,
      transparent: true
    });
    this.decorRing = new THREE.Mesh(decorRingGeo, decorRingMat);
    this.decorRing.rotation.x = Math.PI / 2;
    this.scene.add(this.decorRing);

    const coreDiv = document.createElement('div');
    coreDiv.textContent = `🌟 ${coreNode.name}`;
    coreDiv.style.backgroundColor = 'rgba(10, 30, 60, 0.85)';
    coreDiv.style.color = '#ffffff';
    coreDiv.style.fontSize = '18px';
    coreDiv.style.fontWeight = 'bold';
    coreDiv.style.padding = '12px 22px';
    coreDiv.style.borderRadius = '40px';
    coreDiv.style.border = '1px solid #3a86ff';
    coreDiv.style.boxShadow = '0 0 18px rgba(58,134,255,0.5)';
    coreDiv.style.backdropFilter = 'blur(8px)';
    coreDiv.style.textAlign = 'center';
    coreDiv.style.fontFamily = 'system-ui, "Segoe UI", monospace';
    coreDiv.style.letterSpacing = '1px';
    coreDiv.style.whiteSpace = 'pre-line';
    this.coreLabel = new CSS2DObject(coreDiv);
    this.coreLabel.position.set(0, 1.5, 0);
    this.scene.add(this.coreLabel);

    const glowDotsCount = 180;
    const dotGeo = new THREE.BufferGeometry();
    const dotPositions = new Float32Array(glowDotsCount * 3);
    for (let i = 0; i < glowDotsCount; i++) {
      const angle = (i / glowDotsCount) * Math.PI * 2;
      const r = 1.65;
      dotPositions[i*3] = Math.cos(angle) * r;
      dotPositions[i*3+1] = Math.sin(angle) * 0.2;
      dotPositions[i*3+2] = Math.sin(angle) * r;
    }
    dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPositions, 3));
    const dotMat = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.05 });
    this.coreDots = new THREE.Points(dotGeo, dotMat);
    this.scene.add(this.coreDots);
  }

  _createSatellite(node, index, total) {
    const angleStep = (Math.PI * 2) / total;
    const startAngle = index * angleStep;
    const radius = 3 + (index % 3) * 0.8;
    const speed = 0.003 + (index % 5) * 0.001;

    const texture = this._createCircleTexture(node.color);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.25,
      metalness: 0.05,
      transparent: true
    });
    const planeSize = node.size * 1.0;
    const satellitePlane = new THREE.Mesh(new THREE.PlaneGeometry(planeSize, planeSize), material);
    satellitePlane.castShadow = false;
    satellitePlane.receiveShadow = false;
    this.scene.add(satellitePlane);

    const label = this._createSatelliteLabel(node.name, node.content, node.color);
    this.scene.add(label);

    const linePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(radius, 0, 0)];
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x5a9eff, transparent: true, opacity: 0.65 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(line);

    this.satellites.push({
      mesh: satellitePlane,
      label: label,
      line: line,
      radius: radius,
      speed: speed,
      angle: startAngle,
      size: planeSize,
      color: node.color,
      data: node
    });
  }

  _addDustParticles() {
    const dustCount = 600;
    const dustGeo = new THREE.BufferGeometry();
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      const r = 2.0 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      dustPositions[i*3] = Math.cos(theta) * r;
      dustPositions[i*3+1] = (Math.random() - 0.5) * 0.8;
      dustPositions[i*3+2] = Math.sin(theta) * r;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMat = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.045, transparent: true, opacity: 0.3 });
    this.dustParticles = new THREE.Points(dustGeo, dustMat);
    this.scene.add(this.dustParticles);
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    this.time += 0.016;

    this.satellites.forEach(sat => {
      sat.angle += sat.speed;
      if (sat.angle > Math.PI * 2) sat.angle -= Math.PI * 2;

      const x = Math.cos(sat.angle) * sat.radius;
      const z = Math.sin(sat.angle) * sat.radius;
      const yOffset = Math.sin(sat.angle * 1.5) * 0.08;
      const y = yOffset;

      sat.mesh.position.set(x, y, z);
      sat.mesh.lookAt(this.camera.position);

      sat.label.position.set(x, y + 0.7, z);

      const positions = sat.line.geometry.attributes.position.array;
      positions[0] = 0;
      positions[1] = 0;
      positions[2] = 0;
      positions[3] = x;
      positions[4] = y;
      positions[5] = z;
      sat.line.geometry.attributes.position.needsUpdate = true;
    });

    if (this.decorRing) {
      this.decorRing.rotation.z += 0.005;
      this.decorRing.rotation.x += 0.003;
    }
    if (this.coreDots) {
      this.coreDots.rotation.y += 0.008;
      this.coreDots.rotation.x += 0.004;
    }
    if (this.stars) {
      this.stars.rotation.y += 0.0003;
      this.stars.rotation.x += 0.0002;
    }
    if (this.dustParticles) {
      this.dustParticles.rotation.y += 0.002;
    }
    if (this.centerGlow) {
      const intensity = 0.55 + Math.sin(this.time * 2.5) * 0.15;
      this.centerGlow.intensity = intensity;
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

export { KnowledgeGraph2DPlanet };
export default KnowledgeGraph2DPlanet;