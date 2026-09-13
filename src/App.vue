<template>
  <div id="app-layout">
    <template v-if="authStore.isAuthenticated">
      <AppSidebar />
      <div class="main-content-wrapper">
        <AppHeader />
        <main class="page-content">
          <RouterView />
        </main>
      </div>
    </template>
    <template v-else-if="showPublicHeader">
      <div class="public-content-wrapper">
        <AppHeader />
        <main class="page-content">
          <RouterView />
        </main>
      </div>
    </template>
    <template v-else>
      <RouterView />
    </template>
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
body {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  background-color: #f4f4f4;
}

#app-layout {
  display: flex;
}

.main-content-wrapper {
  flex-grow: 1;
  margin-left: 200px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  max-height: 100vh;
}

.public-content-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.page-content {
  height: 90%;
  flex-grow: 1;
  margin: 15px;
  padding: 10px;
  border-radius: 10px;
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-sizing: border-box;
}

#app-layout > template:last-of-type > div {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 50px;
  box-sizing: border-box;
}
</style>