<template>
  <div class="login-container with-photo-bg">
    <div class="login-form">
    <div class="form-brand">
      <Wheat class="brand-mark" :size="34" aria-hidden="true" />
      <h2>水稻微表型结构分割平台</h2>
      <p class="brand-sub">茎秆截面 &amp; 剑叶切片 · 自动分割与指标导出</p>
    </div>
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">邮箱</label>
        <input type="email" id="email" v-model="email" placeholder="you@example.com" required />
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" v-model="password" placeholder="请输入密码" required />
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <button type="submit" class="primary submit-btn" :disabled="isLoading">
        {{ isLoading ? '登录中...' : '登录' }}
      </button>
    </form>
    <p class="form-foot">
      还没有账户？ <router-link to="/register">去注册</router-link>
    </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router'; // 1. 导入 useRouter
import { useAuthStore } from '@/stores/auth'; // 2. 导入 auth store
import { Wheat } from '@lucide/vue';

// --- 响应式状态 ---
const email = ref('');
const password = ref('');
const errorMessage = ref(''); // 用于显示登录错误信息
const isLoading = ref(false); // 用于控制按钮禁用和显示加载状态

// --- 获取 Store 和 Router 实例 ---
const authStore = useAuthStore(); // 3. 获取 auth store 实例
const router = useRouter(); // 4. 获取 router 实例

// --- 方法 ---
const handleLogin = async () => {
  isLoading.value = true; // 开始登录，设置加载状态
  errorMessage.value = ''; // 清除旧的错误信息

  // 5. 调用 store 中的 loginAction
  const success = await authStore.loginAction(email.value, password.value);

  isLoading.value = false; // 结束登录，清除加载状态

  if (success) {
    // 6. 登录成功 -> 跳转到主页（近期分析记录）
    console.log('Login successful, navigating to home...');
    router.push({ name: 'home' }); // 使用命名路由跳转
  } else {
    // 7. 登录失败 -> 显示后端返回的可操作错误
    errorMessage.value = authStore.lastError || '登录失败，请稍后重试。';
    console.error('Login failed in component.');
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center; /* 垂直居中 */
  min-height: 100vh;
  width: 100%;
  background-attachment: fixed;
  box-sizing: border-box;
  padding: 24px;
}

.login-form {
  max-width: 400px;
  padding: 28px 26px 22px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  border-radius: var(--radius-lg, 16px);
  text-align: center;
  background-color: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(14px) saturate(160%);
  -webkit-backdrop-filter: blur(14px) saturate(160%);
  box-shadow: var(--shadow-lg, 0 20px 48px rgba(16, 40, 24, 0.14));
  width: 100%;
  box-sizing: border-box;
}

.form-brand {
  margin-bottom: 22px;
}

.brand-mark {
  display: block;
  margin: 0 auto 6px;
  color: var(--color-primary-green-dark, #1f7a3d);
}

.form-brand h2 {
  margin: 0;
  font-size: 1.28em;
  color: var(--color-primary-green-darkest, #14532d);
}

.brand-sub {
  margin: 6px 0 0;
  font-size: 0.8em;
  color: var(--color-text-muted, #6b7a89);
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.85em;
  font-weight: 500;
  color: var(--color-text-muted, #6b7a89);
}

.form-group input {
  width: 100%;
  box-sizing: border-box;
}

.error-message {
  color: var(--color-error, #dc3545);
  margin-bottom: 15px;
  font-size: 0.88em;
  text-align: left;
}

.submit-btn {
  width: 100%;
  padding: 11px 15px;
  font-size: 1em;
  margin-top: 4px;
}

.form-foot {
  margin: 18px 0 0;
  font-size: 0.88em;
  color: var(--color-text-muted, #6b7a89);
}
</style>
