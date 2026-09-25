<template>
  <div class="register-container">
    <div class="register-card">
      <div class="card-header">
        <div class="brand-icon">🌱</div>
        <h2>创建新账户</h2>
        <p class="card-subtitle">加入我们，开启水稻表型分析之旅</p>
      </div>
      <form @submit.prevent="handleRegister" class="register-form">
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
              placeholder="至少6位字符"
              required
              autocomplete="new-password"
            />
          </div>
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <div class="input-wrapper">
            <span class="input-icon">🔐</span>
            <input
              type="password"
              id="confirmPassword"
              v-model="confirmPassword"
              placeholder="再次输入密码"
              required
              autocomplete="new-password"
            />
          </div>
        </div>

        <transition name="form-msg">
          <div v-if="errorMessage" class="error-message">
            <span class="msg-icon">⚠️</span>
            {{ errorMessage }}
          </div>
        </transition>
        <transition name="form-msg">
          <div v-if="successMessage" class="success-message">
            <span class="msg-icon">✅</span>
            {{ successMessage }}
          </div>
        </transition>

        <button type="submit" class="submit-button" :disabled="isLoading">
          <span v-if="isLoading" class="loading-spinner"></span>
          <span v-else class="btn-text">注 册</span>
        </button>
      </form>
      <div class="card-footer">
        <span>已有账户？</span>
        <router-link to="/login" class="login-link">返回登录 ←</router-link>
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
const confirmPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);

const authStore = useAuthStore();
const router = useRouter();

const handleRegister = async () => {
  if (password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致。';
    return;
  }

  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  const success = await authStore.registerAction({
    email: email.value,
    password: password.value,
  });

  isLoading.value = false;

  if (success) {
    successMessage.value = '注册成功！即将跳转到登录页面...';
    setTimeout(() => {
      router.push({ name: 'login' });
    }, 2000);
  } else {
    errorMessage.value = '注册失败，该邮箱可能已被占用。';
  }
};
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 420px;
  padding: 36px 32px 28px;
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
  margin-bottom: 28px;
}

.brand-icon {
  font-size: 44px;
  width: 68px;
  height: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 14px;
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
  font-size: 1.4em;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.3px;
}

.card-subtitle {
  margin: 6px 0 0;
  font-size: 0.86em;
  color: var(--color-text-muted);
}

.register-form {
  text-align: left;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.84em;
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
  padding: 11px 14px 11px 42px;
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

.input-wrapper:focus-within .input-icon {
  opacity: 1;
  transform: scale(1.1);
}

.submit-button {
  width: 100%;
  padding: 12px 20px;
  background: linear-gradient(135deg, var(--color-primary-green), var(--color-primary-green-dark));
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.98em;
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

.form-msg-enter-active {
  animation: msgIn 0.3s ease-out;
}

.form-msg-leave-active {
  animation: msgOut 0.2s ease-in;
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
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border-light);
  font-size: 0.88em;
  color: var(--color-text-muted);
}

.login-link {
  font-weight: 600;
  color: var(--color-primary-green-dark);
  transition: all var(--transition-fast);
}

.login-link:hover {
  color: var(--color-primary-green-darkest);
  text-decoration: underline;
}
</style>