<template>
  <div class="flag-leaf-view">
    <div class="placeholder-card">
      <div class="placeholder-icon">
        <span class="leaf">🍃</span>
        <div class="ripple"></div>
      </div>
      <h2 class="placeholder-title">剑叶微表型分析</h2>
      <div class="placeholder-badge">
        <span class="badge-spinner"></span>
        功能开发中
      </div>
      <p class="placeholder-desc">
        该功能模块正在积极开发中，敬请期待！<br />
        我们将尽快上线剑叶智能分割与表型分析功能。
      </p>
      <router-link :to="{ name: 'home' }" class="back-link">← 返回首页</router-link>
    </div>
  </div>
</template>

<script setup>
</script>

<style scoped>
.flag-leaf-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80%;
  padding: 40px 20px;
  animation: pageIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes pageIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.placeholder-card {
  text-align: center;
  padding: 48px 40px;
  max-width: 500px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: var(--shadow-2xl);
}

.placeholder-icon {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.leaf {
  font-size: 52px;
  position: relative;
  z-index: 2;
  animation: leafFloat 3s ease-in-out infinite;
}

@keyframes leafFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(5deg); }
}

.ripple {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(76, 175, 80, 0.15) 0%, transparent 70%);
  animation: rippleExpand 2.5s ease-out infinite;
}

@keyframes rippleExpand {
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.6); opacity: 0; }
}

.placeholder-title {
  font-size: 1.6em;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0 0 12px;
}

.placeholder-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: linear-gradient(135deg, var(--color-warning-light), #fef9e7);
  border-radius: 50px;
  font-size: 0.82em;
  font-weight: 600;
  color: #b7791f;
  margin-bottom: 20px;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.badge-spinner {
  width: 10px;
  height: 10px;
  border: 2px solid rgba(245, 158, 11, 0.3);
  border-top-color: #b7791f;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.placeholder-desc {
  font-size: 0.92em;
  line-height: 1.8;
  color: var(--color-text-muted);
  margin: 0 0 28px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 0.92em;
  transition: all var(--transition-normal);
}

.back-link:hover {
  background: var(--color-primary-green-lightest);
  border-color: var(--color-primary-green-light);
  color: var(--color-primary-green-dark);
  transform: translateY(-2px);
  text-decoration: none;
}
</style>