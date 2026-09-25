<template>
  <div class="home-view">
    <section class="hero-section">
      <div class="hero-content">
        <div class="hero-badge">
          <span class="badge-dot"></span>
          智能图像分析平台
        </div>
        <h2 class="hero-title">
          水稻微表型<br />
          <span class="gradient-text">结构分割分析系统</span>
        </h2>
        <p class="hero-desc">
          基于深度学习的水稻茎秆与剑叶微表型智能分割平台，提供精准、高效、可视化的表型数据分析服务。
        </p>
        <div class="hero-actions">
          <router-link to="/stem" class="cta-button primary">
            <span>🚀 开始分析</span>
            <span class="cta-arrow">→</span>
          </router-link>
          <router-link to="/flag-leaf" class="cta-button secondary">
            🌿 剑叶分析
          </router-link>
        </div>
      </div>
      <div class="hero-visual">
        <div class="floating-card card-1">
          <span class="card-icon">🌾</span>
          <span class="card-label">茎秆分析</span>
        </div>
        <div class="floating-card card-2">
          <span class="card-icon">🍃</span>
          <span class="card-label">剑叶识别</span>
        </div>
        <div class="floating-card card-3">
          <span class="card-icon">📊</span>
          <span class="card-label">数据导出</span>
        </div>
      </div>
    </section>

    <section class="features-section">
      <h3 class="section-title">核心功能</h3>
      <div class="features-grid">
        <div class="feature-card" v-for="feature in features" :key="feature.title">
          <div class="feature-icon">{{ feature.icon }}</div>
          <h4 class="feature-title">{{ feature.title }}</h4>
          <p class="feature-desc">{{ feature.desc }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const features = ref([
  {
    icon: '🌱',
    title: '茎秆微表型分析',
    desc: '自动识别和分割水稻茎秆横截面，提取维管束数目、面积、茎秆直径等关键表型参数。'
  },
  {
    icon: '🍃',
    title: '剑叶智能分割',
    desc: '针对水稻剑叶进行精准分割和特征提取，为作物育种和生长监测提供数据支持。'
  },
  {
    icon: '⚡',
    title: '批量并行处理',
    desc: '支持文件夹批量上传，多任务并行处理，大幅提升分析效率，适用于大规模样本分析。'
  },
  {
    icon: '📈',
    title: '可视化展示',
    desc: '原始图像与分割结果对比展示，支持缩放、拖拽交互，直观查看模型分割效果。'
  },
  {
    icon: '📋',
    title: '灵活数据导出',
    desc: '支持 JSON 和 Excel 多种格式导出，可自定义数据字段和单位，方便下游数据分析。'
  },
  {
    icon: '🔒',
    title: '安全账户体系',
    desc: '完善的用户认证与额度管理系统，保障数据安全，提供稳定可靠的服务体验。'
  },
]);
</script>

<style scoped>
.home-view {
  padding: 20px 28px;
  animation: pageIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pageIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.hero-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 40px;
  padding: 40px 10px 50px;
  flex-wrap: wrap;
}

.hero-content {
  flex: 1;
  min-width: 320px;
  max-width: 600px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
  border-radius: 50px;
  font-size: 0.82em;
  font-weight: 600;
  color: var(--color-primary-green-darkest);
  margin-bottom: 20px;
  border: 1px solid rgba(76, 175, 80, 0.2);
}

.badge-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary-green);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.4); }
  50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
}

.hero-title {
  font-size: 2.5em;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 16px;
  color: var(--color-text-primary);
  letter-spacing: -0.5px;
}

.gradient-text {
  background: linear-gradient(135deg, var(--color-primary-green-dark) 0%, var(--color-primary-green) 50%, #66bb6a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 1.02em;
  line-height: 1.7;
  color: var(--color-text-secondary);
  margin: 0 0 28px;
}

.hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.cta-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 13px 26px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.95em;
  transition: all var(--transition-normal);
  text-decoration: none;
  cursor: pointer;
  border: none;
}

.cta-button.primary {
  background: linear-gradient(135deg, var(--color-primary-green), var(--color-primary-green-dark));
  color: white;
  box-shadow: 0 4px 14px rgba(76, 175, 80, 0.35);
}

.cta-button.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(76, 175, 80, 0.45);
  text-decoration: none;
}

.cta-arrow {
  display: inline-block;
  transition: transform var(--transition-normal);
}

.cta-button.primary:hover .cta-arrow {
  transform: translateX(4px);
}

.cta-button.secondary {
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
}

.cta-button.secondary:hover {
  background-color: var(--color-primary-green-lightest);
  border-color: var(--color-primary-green-light);
  color: var(--color-primary-green-dark);
  transform: translateY(-2px);
  text-decoration: none;
}

.hero-visual {
  flex: 1;
  min-width: 280px;
  height: 380px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-card {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  border: 1px solid rgba(255, 255, 255, 0.6);
  transition: all var(--transition-bounce);
  animation: floatCard 4s ease-in-out infinite;
}

.floating-card:hover {
  transform: scale(1.05) translateY(-4px);
  box-shadow: var(--shadow-xl);
}

.card-icon {
  font-size: 32px;
}

.card-label {
  font-size: 0.85em;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.card-1 {
  top: 40px;
  left: 30px;
  animation-delay: 0s;
}

.card-2 {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 0.5s;
  padding: 28px 32px;
}

.card-3 {
  bottom: 40px;
  right: 30px;
  animation-delay: 1s;
}

.card-1:hover,
.card-2:hover,
.card-3:hover {
  animation-play-state: paused;
}

@keyframes floatCard {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.card-2 {
  animation: floatCardCenter 4s ease-in-out infinite;
}

@keyframes floatCardCenter {
  0%, 100% { transform: translate(-50%, -50%); }
  50% { transform: translate(-50%, -54%); }
}

.features-section {
  padding: 20px 10px;
}

.section-title {
  font-size: 1.4em;
  font-weight: 700;
  margin: 0 0 24px;
  color: var(--color-text-primary);
  position: relative;
  padding-left: 16px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: linear-gradient(180deg, var(--color-primary-green), var(--color-primary-green-light));
  border-radius: 2px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.feature-card {
  padding: 22px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
  cursor: default;
  animation: cardSlideIn 0.5s ease-out backwards;
}

.feature-card:nth-child(1) { animation-delay: 0.05s; }
.feature-card:nth-child(2) { animation-delay: 0.1s; }
.feature-card:nth-child(3) { animation-delay: 0.15s; }
.feature-card:nth-child(4) { animation-delay: 0.2s; }
.feature-card:nth-child(5) { animation-delay: 0.25s; }
.feature-card:nth-child(6) { animation-delay: 0.3s; }

@keyframes cardSlideIn {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-green-light);
}

.feature-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
  border-radius: var(--radius-lg);
  margin-bottom: 14px;
  transition: transform var(--transition-bounce);
}

.feature-card:hover .feature-icon {
  transform: scale(1.1) rotate(-4deg);
}

.feature-title {
  font-size: 1.02em;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--color-text-primary);
}

.feature-desc {
  font-size: 0.86em;
  line-height: 1.6;
  color: var(--color-text-muted);
  margin: 0;
}
</style>