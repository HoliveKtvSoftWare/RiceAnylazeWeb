<template>
  <div id="app-layout">
    <transition name="layout-fade" mode="out-in">
      <div v-if="authStore.isAuthenticated" class="layout-with-sidebar">
        <AppSidebar />
        <div class="main-content-wrapper">
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
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { RouterView, useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();

const showPublicHeader = computed(() => {
  return route.meta.requiresAuth === false && route.name !== 'login' && route.name !== 'register';
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
  margin-left: 220px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-height: 100vh;
}

.public-content-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
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
</style>