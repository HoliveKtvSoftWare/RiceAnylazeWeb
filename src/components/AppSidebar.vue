<template>
  <aside class="app-sidebar">
    <div class="sidebar-brand" title="水稻微表型结构分割平台">
      <Wheat class="brand-mark" :size="23" aria-hidden="true" />
      <span class="brand-text">水稻微表型</span>
    </div>
    <nav>
      <ul>
        <li>
          <router-link to="/" active-class="active-link" title="主页">
            <Home class="nav-icon" :size="18" aria-hidden="true" />
            <span class="nav-label">主页</span>
          </router-link>
        </li>

        <!-- 分析：父菜单，展开后是茎秆 / 剑叶两个子页面 -->
        <li class="nav-group">
          <button
              type="button"
              class="nav-group-toggle"
              :class="{ 'is-open': isAnalysisOpen, 'has-active': isAnalysisRoute }"
              :aria-expanded="String(isAnalysisOpen)"
              aria-controls="analysis-submenu"
              title="分析"
              @click="toggleAnalysis"
          >
            <FlaskConical class="nav-icon" :size="18" aria-hidden="true" />
            <span class="nav-label">分析</span>
            <ChevronDown class="group-caret" :class="{ open: isAnalysisOpen }" :size="15" aria-hidden="true" />
          </button>

          <Transition name="submenu">
            <ul v-show="isAnalysisOpen" id="analysis-submenu" class="nav-sublist">
              <li v-for="entry in analysisEntries" :key="entry.key">
                <router-link :to="entry.route" active-class="active-link" :title="entry.label">
                  <component :is="entry.icon" class="nav-icon sub-icon" :size="16" aria-hidden="true" />
                  <span class="nav-label">{{ entry.label }}</span>
                </router-link>
              </li>
            </ul>
          </Transition>
        </li>

        <li>
          <router-link to="/user-center" active-class="active-link" title="用户中心">
            <UserRound class="nav-icon" :size="18" aria-hidden="true" />
            <span class="nav-label">用户中心</span>
          </router-link>
        </li>
      </ul>
    </nav>
    <div class="sidebar-foot">
      <Microscope class="nav-icon" :size="18" aria-hidden="true" />
      <span class="nav-label">v1.0</span>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { ChevronDown, FlaskConical, Home, Leaf, Microscope, Sprout, UserRound, Wheat } from '@lucide/vue';
import { TASK_GROUPS } from '@/utils/taskGroups';

const route = useRoute();

const analysisEntries = [
  { key: 'stem', label: TASK_GROUPS.stem.label, route: TASK_GROUPS.stem.route, icon: Sprout },
  { key: 'leaf', label: TASK_GROUPS.leaf.label, route: TASK_GROUPS.leaf.route, icon: Leaf },
];

const isAnalysisRoute = computed(
  () => analysisEntries.some((entry) => route.path === entry.route),
);

// 进入分析页时自动展开；离开后保留用户手动展开/收起的选择
const isAnalysisOpen = ref(isAnalysisRoute.value);

watch(isAnalysisRoute, (active) => {
  if (active) isAnalysisOpen.value = true;
});

const toggleAnalysis = () => {
  isAnalysisOpen.value = !isAnalysisOpen.value;
};
</script>

<style scoped>
.app-sidebar {
  width: var(--sidebar-w, 200px);
  background: linear-gradient(180deg, #1f7a3d 0%, #17602f 100%);
  color: #fff;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 2px 0 16px rgba(16, 40, 24, 0.12);
  z-index: 900;
  box-sizing: border-box;
  transition: width 0.2s ease;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 16px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}

.brand-mark {
  flex-shrink: 0;
}

.brand-text {
  font-weight: 600;
  font-size: 0.98em;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

nav {
  flex: 1;
  padding: 10px 8px;
  min-height: 0;
  overflow-y: auto;
}

nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

nav li a,
.nav-group-toggle {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 10px 12px;
  width: 100%;
  color: rgba(255, 255, 255, 0.92);
  background: transparent;
  border: none;
  text-decoration: none;
  border-radius: var(--radius-sm, 8px);
  font-size: 0.95em;
  font-family: inherit;
  font-weight: 500;
  text-align: left;
  box-sizing: border-box;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
  white-space: nowrap;
}

nav li a:hover,
.nav-group-toggle:hover {
  background-color: rgba(255, 255, 255, 0.14);
  color: #fff;
  text-decoration: none;
}

/* 当前激活链接 */
.active-link {
  background-color: rgba(255, 255, 255, 0.96) !important;
  color: var(--color-primary-green-dark, #1f7a3d) !important;
  font-weight: 600;
  box-shadow: var(--shadow-xs);
}

/* 子菜单：所在大类处于激活状态时，父项也要有明显标记 */
.nav-group-toggle.has-active {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.1);
}

.group-caret {
  margin-left: auto;
  flex-shrink: 0;
  transition: transform 0.18s ease;
  opacity: 0.85;
}

.group-caret.open {
  transform: rotate(180deg);
}

/* 子菜单列表：缩进 + 左侧引导线，与父项区分层次 */
nav .nav-sublist {
  margin: 2px 0 2px 18px;
  padding-left: 8px;
  border-left: 1px solid rgba(255, 255, 255, 0.22);
  gap: 2px;
}

nav .nav-sublist li a {
  padding: 8px 10px;
  font-size: 0.9em;
}

/* 展开/收起过渡：淡入 + 轻微下移 + 高度收展，避免子菜单"啪"地出现 */
.submenu-enter-active,
.submenu-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease, max-height 0.24s ease;
  overflow: hidden;
  max-height: 120px;
}

.submenu-enter-from,
.submenu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
  max-height: 0;
}

/* 系统设置里关掉动画时不强加过渡 */
@media (prefers-reduced-motion: reduce) {
  .submenu-enter-active,
  .submenu-leave-active {
    transition: none;
  }
}

.nav-icon {
  font-size: 1.05em;
  line-height: 1;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.sub-icon {
  width: 16px;
}

.sidebar-foot {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 20px 16px;
  font-size: 0.8em;
  color: rgba(255, 255, 255, 0.7);
  border-top: 1px solid rgba(255, 255, 255, 0.14);
  white-space: nowrap;
}

/* 窄屏：只留图标 */
@media (max-width: 1100px) {
  .brand-text,
  .nav-label {
    display: none;
  }
  .sidebar-brand,
  nav li a,
  .nav-group-toggle,
  .sidebar-foot {
    justify-content: center;
    padding-left: 0;
    padding-right: 0;
  }
  /* 图标条模式下子菜单直接铺开（否则 v-show 的内联 display:none 会把它藏掉），且不再缩进 */
  nav .nav-sublist {
    display: flex !important;
    margin-left: 0;
    padding-left: 0;
    border-left: none;
  }
  .group-caret {
    display: none;
  }
}
</style>
