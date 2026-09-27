<template>
  <header class="app-header">
    <div class="header-title">
      <h1><Wheat class="title-icon" :size="22" aria-hidden="true" />水稻微表型结构分割平台</h1>
      <span class="header-sub">茎秆截面 &amp; 剑叶切片 · 自动分割与指标导出</span>
    </div>
    <div class="user-info" v-if="authStore.isAuthenticated">
      <div class="dropdown" ref="dropdownRef" @click="openDropdown">
        <span class="avatar">{{ userInitial }}</span>
        <span class="dropdown-trigger">
          {{ authStore.user?.email || '用户' }}
          <ChevronDown class="dropdown-arrow" :class="{ open: isDropdownOpen }" :size="15" aria-hidden="true" />
        </span>
        <div class="dropdown-menu" v-show="isDropdownOpen">
          <button class="dropdown-item" @click.stop="goToUserCenter">
            <UserRound class="item-icon" :size="16" aria-hidden="true" />用户中心
          </button>
          <button class="dropdown-item logout-btn" @click.stop="handleLogout">
            <LogOut class="item-icon" :size="16" aria-hidden="true" />退出登录
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth'; // 导入 auth store
import { useRouter } from 'vue-router';
import { ChevronDown, LogOut, UserRound, Wheat } from '@lucide/vue';

const authStore = useAuthStore();
const router = useRouter();
const isDropdownOpen = ref(false);
const dropdownRef = ref(null);

// 头像上用邮箱首字母
const userInitial = computed(() => {
  const email = authStore.user?.email || '';
  return email ? email[0].toUpperCase() : 'U';
});

const openDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

const closeDropdown = () => {
  isDropdownOpen.value = false;
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
});

const goToUserCenter = () => {
  isDropdownOpen.value = false;
  router.push('/user-center'); // 跳转到用户中心页面
};

const handleLogout = async () => {
  isDropdownOpen.value = false;
  await authStore.logoutAction(); // 调用退出登录方法
  router.push('/login'); // 跳转到登录页面
};
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 10px 22px;
  min-height: var(--header-h);
  box-sizing: border-box;
  background-color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px) saturate(160%);
  -webkit-backdrop-filter: blur(12px) saturate(160%);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-xs);
  color: var(--color-primary-green-darkest);
  position: sticky;
  top: 0;
  z-index: 800;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.header-title h1 {
  margin: 0;
  font-size: 1.22em;
  font-weight: 650;
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title-icon { flex-shrink: 0; color: var(--color-primary-green-dark); }

.header-sub {
  font-size: 0.78em;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info {
  position: relative;
  flex-shrink: 0;
}

.dropdown {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 10px 5px 5px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.dropdown:hover {
  border-color: var(--color-primary-green-light);
  box-shadow: var(--shadow-xs);
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-green), var(--color-primary-green-dark));
  color: #fff;
  font-size: 0.82em;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.dropdown-trigger {
  display: inline-flex;
  align-items: center;
  font-size: 0.9em;
  color: var(--color-text);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-arrow {
  display: inline-block;
  transition: transform 0.25s ease;
  font-size: 0.7em;
  margin-left: 3px;
  color: var(--color-text-muted);
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  min-width: 160px;
  padding: 6px;
  z-index: 1000;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 9px 10px;
  text-align: left;
  border: none;
  border-radius: var(--radius-xs);
  background: none;
  cursor: pointer;
  color: var(--color-text);
  font-size: 0.92em;
  transition: background-color 0.16s ease;
}

.dropdown-item:hover {
  background-color: var(--color-primary-green-lightest);
}

.item-icon {
  width: 16px;
  text-align: center;
  opacity: 0.8;
}

.dropdown-item.logout-btn {
  color: var(--color-error);
}

.dropdown-item.logout-btn:hover {
  background-color: #fdecee;
}

@media (max-width: 820px) {
  .header-sub {
    display: none;
  }
  .dropdown-trigger {
    max-width: 90px;
  }
}
</style>
