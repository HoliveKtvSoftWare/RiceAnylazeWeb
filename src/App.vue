<template>
  <div id="app-layout">
    <transition name="layout-fade" mode="out-in">
      <div v-if="authStore.isAuthenticated" class="layout-with-sidebar">
        <AppSidebar ref="sidebarRef" @toggle-collapse="onSidebarToggle" />
        <div class="main-content-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
          <AppHeader />
          <main class="page-content">
            <RouterView v-slot="{ Component, route: viewRoute }">
              <transition :key="viewRoute.fullPath" name="page-fade" mode="out-in">
                <component :is="Component" />
              </transition>
            </RouterView>
          </main>
        </div>
      </div>
      <div v-else-if="showPublicHeader" class="public-content-wrapper">
        <AppHeader />
        <main class="page-content">
          <RouterView v-slot="{ Component, route: viewRoute }">
            <transition :key="viewRoute.fullPath" name="page-fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </RouterView>
        </main>
      </div>
      <div v-else class="full-page-wrapper">
        <RouterView v-slot="{ Component, route: viewRoute }">
          <transition :key="viewRoute.fullPath" name="page-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </div>
    </transition>

    <!-- 全局批次分割进度浮层（独立于 layout 过渡，跨页面保持） -->
    <transition name="batch-progress-float">
      <div v-if="authStore.isAuthenticated && analysisStore.batchProgress.visible" class="batch-progress-float">
        <div class="batch-progress-card" :class="{ done: analysisStore.batchProgress.completed >= analysisStore.batchProgress.total }">
          <div class="batch-progress-title">
            <span class="batch-progress-spinner" :class="{ done: analysisStore.batchProgress.completed >= analysisStore.batchProgress.total }"></span>
            <span class="batch-progress-badge">{{ progressTypeLabel }}</span>
            <span>{{ analysisStore.batchProgress.completed >= analysisStore.batchProgress.total ? '分割完成' : '分割处理中' }}</span>
          </div>
          <span class="batch-progress-count">
            {{ Math.min(analysisStore.batchProgress.completed, analysisStore.batchProgress.total) }}/{{ analysisStore.batchProgress.total }}
          </span>
          <div class="batch-progress-track">
            <div
              class="batch-progress-fill"
              :class="{ done: analysisStore.batchProgress.completed >= analysisStore.batchProgress.total }"
              :style="{ width: analysisStore.batchProgressPercent + '%' }"
            ></div>
          </div>
          <span class="batch-progress-percent">{{ analysisStore.batchProgressPercent }}%</span>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useAuthStore } from '@/stores/auth';
import { useAnalysisStore } from '@/stores/analysis';

const authStore = useAuthStore();
const analysisStore = useAnalysisStore();
const route = useRoute();

const sidebarRef = ref(null);
const sidebarCollapsed = ref(false);

const onSidebarToggle = (collapsed) => {
  sidebarCollapsed.value = collapsed;
};

const showPublicHeader = computed(() => {
  return route.meta.requiresAuth === false && route.name !== 'login' && route.name !== 'register';
});

const progressTypeLabel = computed(() => {
  const map = { stem: '茎秆', flag_leaf: '剑叶' };
  return map[analysisStore.batchProgress.type] || '';
});

onMounted(async () => {
  await authStore.tryAutoLogin();
});
</script>

<style>
#app-layout {
  min-height: 100vh;
}

.layout-with-sidebar {
  display: flex;
  min-height: 100vh;
  width: 100%;
}

.main-content-wrapper {
  flex-grow: 1;
  margin-left: 200px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  transition: margin-left var(--transition-normal, 0.3s ease);
}

.main-content-wrapper.sidebar-collapsed {
  margin-left: 72px;
}

.public-content-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
}

.full-page-wrapper {
  min-height: 100vh;
  width: 100%;
}

.page-content {
  height: 90%;
  flex-grow: 1;
  margin: 5px;
  padding: 5px;
  border-radius: var(--radius-xl);
  background-color: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: var(--shadow-lg);
  box-sizing: border-box;
  overflow-y: auto;
}

.layout-fade-enter-active,
.layout-fade-leave-active {
  transition: opacity var(--transition-normal);
}

.layout-fade-enter-from,
.layout-fade-leave-to {
  opacity: 0;
}

.page-fade-enter-active {
  animation: pageFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.page-fade-leave-active {
  animation: pageFadeOut 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pageFadeOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-8px); }
}

/* ==================== 全局批次分割进度浮层 ==================== */
.batch-progress-float {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  pointer-events: none;
}

.batch-progress-card {
  pointer-events: auto;
  min-width: 480px;
  max-width: 640px;
  padding: 7px 16px;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: var(--radius-full);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(76, 175, 80, 0.2);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-progress-card.done {
  border-color: rgba(34, 197, 94, 0.35);
  background: linear-gradient(135deg, rgba(220, 252, 231, 0.96), rgba(255, 255, 255, 0.96));
  box-shadow: 0 12px 40px rgba(34, 197, 94, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08);
}

.batch-progress-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82em;
  font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap;
  flex-shrink: 0;
}

.batch-progress-badge {
  padding: 1px 7px;
  font-size: 0.78em;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, var(--color-primary-green-light), var(--color-primary-green));
  border-radius: 999px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.batch-progress-spinner {
  width: 12px;
  height: 12px;
  border: 2px solid rgba(76, 175, 80, 0.22);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

.batch-progress-spinner.done {
  border-color: var(--color-success);
  animation: none;
  background: var(--color-success);
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.batch-progress-spinner.done::after {
  content: '';
  position: absolute;
  left: 2px;
  top: -1px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.batch-progress-count {
  font-size: 0.78em;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 1px 8px;
  background: var(--color-primary-green-bg);
  border-radius: 50px;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  white-space: nowrap;
}

.batch-progress-card.done .batch-progress-count {
  background: rgba(34, 197, 94, 0.12);
  color: var(--color-success);
}

.batch-progress-track {
  flex: 1;
  width: auto;
  height: 5px;
  background: rgba(0, 0, 0, 0.07);
  border-radius: 999px;
  overflow: hidden;
  min-width: 60px;
}

.batch-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-green-light), var(--color-primary-green));
  border-radius: 999px;
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.batch-progress-fill.done {
  background: linear-gradient(90deg, #22c55e, #16a34a);
}

.batch-progress-percent {
  font-size: 0.75em;
  font-weight: 700;
  color: var(--color-primary-green-dark);
  font-variant-numeric: tabular-nums;
  opacity: 0.75;
  flex-shrink: 0;
  white-space: nowrap;
  min-width: 36px;
  text-align: right;
}

.batch-progress-float-enter-active {
  animation: batchProgressFloatIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.batch-progress-float-leave-active {
  animation: batchProgressFloatOut 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes batchProgressFloatIn {
  from { opacity: 0; transform: translateX(-50%) translateY(30px) scale(0.9); }
  to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@keyframes batchProgressFloatOut {
  from { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
  to { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.95); }
}
</style>