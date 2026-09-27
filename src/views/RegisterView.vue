<template>
  <div class="register-container with-photo-bg">
    <div class="register-form">
    <h2>注册新账户</h2>
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label for="email">邮箱</label>
        <input type="email" id="email" v-model="email" placeholder="you@example.com" required />
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" v-model="password" placeholder="设置密码" required />
      </div>
      <div class="form-group">
        <label for="confirmPassword">确认密码</label>
        <input type="password" id="confirmPassword" v-model="confirmPassword" placeholder="再次输入密码" required />
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>

      <button type="submit" class="primary" :disabled="isLoading">
        {{ isLoading ? '注册中...' : '注册' }}
      </button>
    </form>
    <p class="form-foot">
      已有账户？ <router-link to="/login">返回登录</router-link>
    </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth'; // 1. 导入 auth store

// --- 响应式状态 ---
const email = ref('');
const password = ref('');
const confirmPassword = ref(''); // 新增确认密码字段
const errorMessage = ref('');
const successMessage = ref(''); // 用于显示注册成功信息
const isLoading = ref(false);

// --- 获取 Store 和 Router 实例 ---
const authStore = useAuthStore(); // 2. 获取 auth store 实例
const router = useRouter();

// --- 方法 ---
const handleRegister = async () => {
  // 3. 客户端密码验证
  if (password.value !== confirmPassword.value) {
    errorMessage.value = '两次输入的密码不一致。';
    return; // 提前退出
  }

  isLoading.value = true;
  errorMessage.value = '';
  successMessage.value = '';

  // 4. 调用 store 中的 registerAction
  const success = await authStore.registerAction({
    email: email.value,
    password: password.value,
  });

  isLoading.value = false;

  if (success) {
    // 5. 注册成功
    successMessage.value = '注册成功！即将跳转到登录页面...';
    // 延迟 2 秒后跳转，给用户反馈时间
    setTimeout(() => {
      router.push({ name: 'login' });
    }, 2000);
  } else {
    // 6. 注册失败 -> 显示后端返回的可操作错误
    errorMessage.value = authStore.lastError || '注册失败，请稍后重试。';
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
  box-sizing: border-box;
  padding: 24px;
}

.register-form {
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

.register-form h2 {
  margin: 0 0 20px;
  font-size: 1.22em;
  color: var(--color-primary-green-darkest, #14532d);
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

.success-message {
  color: var(--color-primary-green-dark, #1f7a3d);
  margin-bottom: 15px;
  font-size: 0.88em;
  text-align: left;
}

button[type="submit"] {
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
