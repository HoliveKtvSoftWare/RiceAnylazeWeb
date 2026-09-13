import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import HomeView from '../views/HomeView.vue';
import StemView from '../views/StemView.vue';
import FlagLeafView from '../views/FlagLeafView.vue';
import UserCenterView from '../views/UserCenterView.vue';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { requiresAuth: false }
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView,
      meta: { requiresAuth: false }
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: false }
    },
    {
      path: '/stem',
      name: 'stem',
      component: StemView,
      meta: { requiresAuth: true }
    },
    {
      path: '/flag-leaf',
      name: 'flag-leaf',
      component: FlagLeafView,
      meta: { requiresAuth: true }
    },
    {
      path: '/user-center',
      name: 'user-center',
      component: UserCenterView,
      meta: { requiresAuth: true }
    }
  ]
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  const requiresAuth = to.meta.requiresAuth;
  const isAuthenticated = authStore.isAuthenticated;

  console.debug(`Navigating to ${to.path}. Requires auth: ${requiresAuth}, Is authenticated: ${isAuthenticated}`);

  if (requiresAuth && !isAuthenticated) {
    console.warn(`Redirecting to /login from ${to.path}`);
    next({ name: 'login' });
  } else if (!requiresAuth && isAuthenticated && (to.name === 'login' || to.name === 'register')) {
    console.debug(`User already authenticated. Redirecting from ${to.path} to /`);
    next({ name: 'home' });
  } else {
    next();
  }
});

export default router;