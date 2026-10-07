<template>
  <header class="app-header">
    <div class="header-title">
      <span class="title-icon">🌾</span>
      <h1>水稻微表型结构分割平台</h1>
    </div>
    <div class="user-info" v-if="authStore.isAuthenticated">
      <div class="dropdown" ref="dropdownRef" @click="openDropdown" @mouseenter="handleMouseEnter" @mouseleave="handleMouseLeave">
        <div class="dropdown-trigger">
          <div class="avatar">{{ avatarInitial }}</div>
          <span class="user-name">{{ authStore.user?.email || '用户' }}</span>
          <span class="dropdown-arrow" :class="{ open: isDropdownOpen }">▾</span>
        </div>
        <transition name="dropdown">
          <div class="dropdown-menu" v-show="isDropdownOpen">
            <div class="menu-header">
              <div class="menu-avatar">{{ avatarInitial }}</div>
              <div class="menu-user">
                <div class="menu-email">{{ authStore.user?.email || '用户' }}</div>
                <div class="menu-badge">已登录</div>
              </div>
            </div>
            <div class="menu-divider"></div>
            <button class="dropdown-item" @click.stop="goToUserCenter">
              <span class="item-icon">👤</span>
              <span>用户中心</span>
            </button>
            <button class="dropdown-item logout-btn" @click.stop="handleLogout">
              <span class="item-icon">🚪</span>
              <span>退出登录</span>
            </button>
          </div>
        </transition>
      </div>
    </div>
    <div class="user-info" v-else>
      <button class="login-button" @click="goToLogin">
        <span>登录</span>
        <span class="login-arrow">→</span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();
const isDropdownOpen = ref(false);
const dropdownOpenSource = ref(null);
const dropdownRef = ref(null);
let hoverCloseTimer = null;

const avatarInitial = computed(() => {
  const email = authStore.user?.email || 'U';
  return email.charAt(0).toUpperCase();
});

const openDropdown = () => {
  dropdownOpenSource.value = 'click';
  isDropdownOpen.value = !isDropdownOpen.value;
  clearTimeout(hoverCloseTimer);
};

const handleMouseEnter = () => {
  clearTimeout(hoverCloseTimer);
  if (!isDropdownOpen.value) {
    dropdownOpenSource.value = 'hover';
    isDropdownOpen.value = true;
  }
};

const handleMouseLeave = () => {
  clearTimeout(hoverCloseTimer);
  hoverCloseTimer = setTimeout(() => {
    if (dropdownOpenSource.value === 'hover') {
      isDropdownOpen.value = false;
      dropdownOpenSource.value = null;
    }
  }, 150);
};

const closeDropdown = () => {
  isDropdownOpen.value = false;
  dropdownOpenSource.value = null;
  clearTimeout(hoverCloseTimer);
};

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown();
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
  clearTimeout(hoverCloseTimer);
});

const goToUserCenter = () => {
  closeDropdown();
  router.push('/user-center');
};

const handleLogout = async () => {
  closeDropdown();
  await authStore.logoutAction();
  router.push('/login');
};

const goToLogin = () => {
  router.push('/login');
};
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 28px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.82));
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(200, 230, 201, 0.5);
  color: var(--color-primary-green-darkest);
  position: relative;
  z-index: 999;
  box-shadow: var(--shadow-xs);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-light));
  border-radius: var(--radius-lg);
}

.header-title h1 {
  margin: 0;
  font-size: 1.25em;
  font-weight: 700;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, var(--color-primary-green-darkest), var(--color-primary-green-dark));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.user-info {
  position: relative;
}

.dropdown {
  cursor: pointer;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 50px;
  transition: all var(--transition-normal);
  background: transparent;
  border: 1px solid transparent;
}

.dropdown-trigger:hover {
  background-color: rgba(76, 175, 80, 0.08);
  border-color: rgba(76, 175, 80, 0.2);
}

.dropdown-trigger:hover,
.dropdown-trigger:hover .user-name {
  color: var(--color-primary-green-darkest);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-green), var(--color-primary-green-dark));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.9em;
  box-shadow: 0 2px 6px rgba(76, 175, 80, 0.3);
}

.user-name {
  font-size: 0.9em;
  color: var(--color-text-secondary);
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  display: inline-block;
  transition: transform var(--transition-normal);
  font-size: 0.9em;
  color: var(--color-text-muted);
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  background: white;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  min-width: 240px;
  z-index: 1000;
  overflow: hidden;
  transform-origin: top right;
}

.menu-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-bg));
}

.menu-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-green), var(--color-primary-green-dark));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1em;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
}

.menu-user {
  display: flex;
  flex-direction: column;
}

.menu-email {
  font-size: 0.88em;
  font-weight: 600;
  color: var(--color-text-primary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menu-badge {
  font-size: 0.72em;
  color: var(--color-primary-green-dark);
  font-weight: 500;
}

.menu-divider {
  height: 1px;
  background: var(--color-border-light);
  margin: 4px 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 18px;
  text-align: left;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: 0.9em;
  font-weight: 500;
  transition: all var(--transition-fast);
  border-radius: 0;
}

.dropdown-item:hover {
  background-color: var(--color-primary-green-lightest);
  color: var(--color-primary-green-darkest);
  transform: none;
}

.dropdown-item .item-icon {
  width: 20px;
  text-align: center;
}

.dropdown-item.logout-btn {
  color: var(--color-error);
}

.dropdown-item.logout-btn:hover {
  background-color: var(--color-error-light);
  color: var(--color-error);
}

.login-button {
  background: linear-gradient(135deg, var(--color-primary-green), var(--color-primary-green-dark));
  color: white;
  border: none;
  padding: 9px 22px;
  border-radius: 50px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 600;
  transition: all var(--transition-normal);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.25);
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(76, 175, 80, 0.4);
}

.login-button:hover .login-arrow {
  transform: translateX(4px);
}

.login-arrow {
  display: inline-block;
  transition: transform var(--transition-normal);
}
</style>