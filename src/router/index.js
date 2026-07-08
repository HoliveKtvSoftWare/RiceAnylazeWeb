import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import DashboardView from '../views/DashboardView.vue';
import UserCenterView from '../views/UserCenterView.vue';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  // 使用 HTML5 History 模式，URL 看起来更干净
  history: createWebHistory(import.meta.env.BASE_URL),
  // 定义路由规则
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false } // 访问页面不需要登录
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { requiresAuth: false } // 访问页面不需要登录
    },
    {
      // 根路径，通常是用户登录后看到的主页面
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true } // 需要登录才能访问
    },
    {
      // 新增用户中心路由
      path: '/user-center',
      name: 'user-center',
      component: UserCenterView,
      meta: { requiresAuth: true } // 需要登录才能访问
    }
  ]
});

// 在每次路由跳转之前执行，用于检查用户登录状态
router.beforeEach((to, from, next) => {
  // 获取认证 store 实例
  // 注意：Pinia store 必须在路由守卫内部获取，不能在顶层获取
  const authStore = useAuthStore();

  const requiresAuth = to.meta.requiresAuth; // 检查目标路由是否需要认证
  const isAuthenticated = authStore.isAuthenticated; // 检查用户是否已登录

  console.debug(`Navigating to ${to.path}. Requires auth: ${requiresAuth}, Is authenticated: ${isAuthenticated}`); // 调试日志

  if (requiresAuth && !isAuthenticated) {
    // 如果目标页面需要登录，但用户未登录 -> 跳转到登录页
    console.warn(`Redirecting to /login from ${to.path}`);
    next({ name: 'login' }); // 使用命名路由跳转
  } else if (!requiresAuth && isAuthenticated && (to.name === 'login' || to.name === 'register')) {
    // 如果目标页面是登录页或注册页，但用户已登录 -> 跳转到主看板页
    console.debug(`User already authenticated. Redirecting from ${to.path} to /`);
    next({ name: 'dashboard' });
  } else {
    // 其他所有情况（访问公共页、访问需登录页且已登录） -> 正常放行
    next();
  }
});

export default router;
