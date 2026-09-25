<template>
  <aside class="app-sidebar">
    <div class="sidebar-logo">
      <div class="logo-icon">🌾</div>
      <div class="logo-text">
        <span class="logo-title">水稻</span>
        <span class="logo-sub">微表型分析</span>
      </div>
    </div>
    <nav>
      <ul>
        <li v-for="item in navItems" :key="item.path">
          <router-link
            :to="item.path"
            :exact-active-class="'active-link'"
            class="nav-link"
          >
            <span class="nav-icon">{{ item.icon }}</span>
            <span class="nav-label">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>
    </nav>
    <div class="sidebar-footer">
      <div class="footer-version">v1.0.0</div>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';

const navItems = ref([
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/stem', label: '水稻茎秆', icon: '🌱' },
  { path: '/flag-leaf', label: '水稻剑叶', icon: '🍃' },
  { path: '/user-center', label: '用户中心', icon: '👤' },
]);
</script>

<style scoped>
.app-sidebar {
  width: 220px;
  background: linear-gradient(180deg, rgba(27, 94, 32, 0.95) 0%, rgba(46, 125, 50, 0.92) 100%);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  color: white;
  padding: 0;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  box-shadow: var(--shadow-lg);
}

.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  margin-bottom: 8px;
}

.logo-icon {
  font-size: 28px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-lg);
}

.logo-text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.logo-title {
  font-size: 1.1em;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.logo-sub {
  font-size: 0.72em;
  opacity: 0.75;
  letter-spacing: 0.5px;
}

nav {
  flex: 1;
  padding: 8px 12px;
  overflow-y: auto;
}

nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

nav li {
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  font-size: 0.93em;
  position: relative;
  overflow: hidden;
  transition: all var(--transition-normal);
}

.nav-link::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  background: linear-gradient(180deg, #81c784, #c8e6c9);
  border-radius: 0 3px 3px 0;
  transition: height var(--transition-normal);
}

.nav-link:hover {
  background-color: rgba(255, 255, 255, 0.12);
  color: white;
  transform: translateX(4px);
}

.nav-link:hover::before {
  height: 60%;
}

.nav-icon {
  font-size: 1.15em;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
  transition: transform var(--transition-normal);
}

.nav-link:hover .nav-icon {
  transform: scale(1.15);
}

.nav-label {
  flex: 1;
  white-space: nowrap;
}

.active-link {
  background: linear-gradient(135deg, rgba(76, 175, 80, 0.4), rgba(129, 199, 132, 0.25));
  color: white;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2), 0 2px 8px rgba(0, 0, 0, 0.15);
}

.active-link::before {
  height: 70%;
}

.active-link .nav-icon {
  transform: scale(1.15);
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
}

.footer-version {
  font-size: 0.75em;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 1px;
}
</style>