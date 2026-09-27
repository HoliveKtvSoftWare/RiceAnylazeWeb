<template>
  <div id="app-layout">
    <template v-if="authStore.isAuthenticated">
      <AppSidebar />
      <div class="main-content-wrapper">
        <AppHeader />
        <main class="page-content">
          <RouterView /> </main>
      </div>
    </template>
    <template v-else>
      <RouterView />
    </template>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

// 应用加载时尝试自动登录
onMounted(async () => {
  await authStore.tryAutoLogin();
});
</script>

<style>
/* 移除 scoped，让样式影响全局布局 */

/* 基础重置和字体 */
body {
  margin: 0;
  font-family: var(--font-sans, Avenir, Helvetica, Arial, sans-serif);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-text, #1f2d3a);
  background-color: var(--color-background, #f2f7f3);
}

#app-layout {
  display: flex;
  min-height: 100vh;
}

.main-content-wrapper {
  flex-grow: 1; /* 占据剩余空间 */
  margin-left: var(--sidebar-w, 200px); /* 为侧边栏留出空间 */
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-width: 0;
  overflow: hidden;
}

/* 仅在登录后应用 margin-left */
#app-layout > template:first-of-type .main-content-wrapper {
  margin-left: var(--sidebar-w, 200px);
}
/* 未登录时不需要 margin-left */
#app-layout > template:last-of-type .main-content-wrapper {
  margin-left: 0;
}
/* 未登录时 RouterView 直接显示 */
#app-layout > template:last-of-type > div { /* Assuming RouterView is wrapped */
  width: 100%;
}

/* 内容区：透明底 + 独立滚动，标题栏与侧边栏固定 */
.page-content {
  padding: 18px 20px 20px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  background-color: transparent;
  box-sizing: border-box;
}

/* 修正未登录页面的样式，使其居中 */
#app-layout > template:last-of-type > div { /* Target the RouterView container for unauthenticated routes */
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start; /* Align login box to the top */
  padding-top: 50px; /* Add some top padding */
  box-sizing: border-box;
}

/* 窄屏：收起侧边栏文字，仅留图标 */
@media (max-width: 1100px) {
  :root {
    --sidebar-w: 68px;
  }
}
</style>