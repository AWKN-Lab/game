/**
 * BaseKnowledgeGraph - 知识图谱可视化组件基类
 * 提供共享配置、工具方法和资源管理基础
 */

class BaseKnowledgeGraph {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container #${containerId} not found`);
    }

    this.onNodeClick = options.onNodeClick || null;
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this._isVisible = true;
    this._isLoading = false;
    this._resizeHandler = null;
    this._animationId = null;

    // 共享配置常量
    this.CORE_NODES = ['fr_h4', 'ir_h2', 'k_declaration', 'k_wuxu_08', 'k_sanminzhuyi'];
    this.MAJOR_NODES = ['fr_h3', 'fr_h12', 'ir_h5', 'ir_h8', 'k_lexington', 'k_constitution', 'k_wuxu_01', 'k_wuxu_05', 'k_wuchang', 'k_zhonghua_minguo'];

    this.subjectColor = {
      history: 0xefbd8a,
      daofa: 0xb6c4ff,
      default: 0xa0c0e0
    };

    this.radiusMap = { core: 1.2, major: 0.5, minor: 0.3 };

    // 轨道动画常量
    this.ORBIT_BASE_RADIUS = 3;
    this.ORBIT_RADIUS_STEP = 0.8;
    this.ORBIT_RADIUS_VARIATION = 3;
    this.BASE_ROTATION_SPEED = 0.003;
    this.SPEED_VARIATION = 5;
    this.SPEED_STEP = 0.001;

    // 星空粒子常量
    this.STAR_COUNT_DESKTOP = 1500;
    this.STAR_COUNT_MOBILE = 500;
    this.STAR_COUNT = window.matchMedia('(pointer: coarse)').matches ? this.STAR_COUNT_MOBILE : this.STAR_COUNT_DESKTOP;
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

  setVisible(visible) {
    this._isVisible = visible;
    if (visible && this._animate) {
      this._animate();
    }
  }

  loadData(data) {
    if (this._isLoading) return;
    this._isLoading = true;
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
      console.warn(`${this.constructor.name}: No nodes to render`);
      this._isLoading = false;
      return;
    }

    this._buildGraph(nodes);
    this._isLoading = false;
  }

  _clearScene() {
    throw new Error('_clearScene() must be implemented by subclass');
  }

  _buildGraph(nodes) {
    throw new Error('_buildGraph() must be implemented by subclass');
  }

  _disposeThreeResources() {
    if (!this.scene) return;
    this.scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        } else {
          if (obj.material.map) obj.material.map.dispose();
          obj.material.dispose();
        }
      }
    });
  }

  _removeRenderer() {
    if (this.renderer) {
      this.renderer.dispose();
      if (this.renderer.domElement?.parentNode) {
        this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
      }
      this.renderer = null;
    }
    if (this.labelRenderer?.domElement?.parentNode) {
      this.labelRenderer.domElement.parentNode.removeChild(this.labelRenderer.domElement);
      this.labelRenderer = null;
    }
    if (this.controls) {
      this.controls.dispose();
      this.controls = null;
    }
  }

  _cancelAnimation() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
  }

  destroy() {
    this._cancelAnimation();
    this._disposeThreeResources();
    this._removeRenderer();
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
    }
  }
}

export { BaseKnowledgeGraph };
export default BaseKnowledgeGraph;
