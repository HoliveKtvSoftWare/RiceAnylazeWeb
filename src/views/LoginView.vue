<template>
  <div class="login-container">
    <div class="login-card">
      <div class="card-header">
        <div class="brand-icon">🌾</div>
        <h2>欢迎回来</h2>
        <p class="card-subtitle">登录以继续使用水稻微表型分析平台</p>
      </div>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email">邮箱地址</label>
          <div class="input-wrapper">
            <span class="input-icon">📧</span>
            <input
              type="email"
              id="email"
              v-model="email"
              placeholder="请输入您的邮箱"
              required
              autocomplete="email"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <div class="input-wrapper">
            <span class="input-icon">🔒</span>
            <input
              type="password"
              id="password"
              v-model="password"
              placeholder="请输入您的密码"
              required
              autocomplete="current-password"
            />
          </div>
        </div>
        <transition name="form-msg">
          <div v-if="errorMessage" class="error-message">
            <span class="msg-icon">⚠️</span>
            {{ errorMessage }}
          </div>
        </transition>
        <button type="submit" class="submit-button" :disabled="isLoading">
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else class="btn-text">登 录</span>
        </button>
      </form>
      <div class="card-footer">
        <span>还没有账户？</span>
        <router-link to="/register" class="register-link">立即注册 →</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = '';

  const success = await authStore.loginAction(email.value, password.value);

  isLoading.value = false;

  if (success) {
    router.push({ name: 'home' });
  } else {
    errorMessage.value = '邮箱或密码错误，请重试。';
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 36px 32px;
  border-radius: var(--radius-xl);
  text-align: center;
  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: var(--shadow-2xl);
  animation: cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(30px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.card-header {
  margin-bottom: 32px;
}

.brand-icon {
  font-size: 48px;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, var(--color-primary-green-lightest), var(--color-primary-green-light));
  border-radius: var(--radius-xl);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.card-header h2 {
  margin: 0;
  font-size: 1.5em;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.3px;
}

.card-subtitle {
  margin: 8px 0 0;
  font-size: 0.88em;
  color: var(--color-text-muted);
}

.login-form {
  text-align: left;
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: var(--color-text-secondary);
  letter-spacing: 0.3px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 1em;
  opacity: 0.7;
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  padding: 12px 14px 12px 42px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.95em;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  transition: all var(--transition-normal);
  outline: none;
  margin-bottom: 0;
}

.input-wrapper input:focus {
  border-color: var(--color-primary-green);
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.15);
}

.input-wrapper input:focus + .input-icon,
.input-wrapper:focus-within .input-icon {
  opacity: 1;
  transform: scale(1.1);
}

.submit-button {
  width: 100%;
  padding: 13px 20px;
  background: linear-gradient(135deg, var(--color-primary-green), var(--color-primary-green-dark));
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 1em;
  font-weight: 600;
  letter-spacing: 2px;
  margin-top: 8px;
  transition: all var(--transition-normal);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 4px 14px rgba(76, 175, 80, 0.35);
}

.submit-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(76, 175, 80, 0.45);
}

.submit-button:active:not(:disabled) {
  transform: translateY(0);
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.msg-icon {
  margin-right: 6px;
}

@keyframes msgIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes msgOut {
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(-6px); }
}

.card-footer {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border-light);
  font-size: 0.9em;
  color: var(--color-text-muted);
}

.register-link {
  font-weight: 600;
  color: var(--color-primary-green-dark);
  transition: all var(--transition-fast);
}

.register-link:hover {
  color: var(--color-primary-green-darkest);
  text-decoration: underline;
}
</style>