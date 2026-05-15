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
import { onMounted } from 'vue'; // 导入 onMounted
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
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  background-color: #f4f4f4; /* 添加一个浅灰色背景 */
}

#app-layout {
  display: flex;
}

.main-content-wrapper {
  flex-grow: 1; /* 占据剩余空间 */
  margin-left: 200px; /* 为侧边栏留出空间 */
  display: flex;
  flex-direction: column;
  min-height: 100vh; /* 确保内容区至少和屏幕一样高 */
}

/* 仅在登录后应用 margin-left */
#app-layout > template:first-of-type .main-content-wrapper {
  margin-left: 200px;
}
/* 未登录时不需要 margin-left */
#app-layout > template:last-of-type .main-content-wrapper {
  margin-left: 0;
}
/* 未登录时 RouterView 直接显示 */
#app-layout > template:last-of-type > div { /* Assuming RouterView is wrapped */
  width: 100%;
}


.page-content {
  padding: 20px;
  flex-grow: 1; /* 占据剩余垂直空间 */
  background-color: #ffffff; /* 内容区白色背景 */
  margin: 20px; /* 与周围元素留出间距 */
  border-radius: 8px; /* 轻微圆角 */
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); /* 添加轻微阴影 */
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

</style>
