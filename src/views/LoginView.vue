<template>
  <div class="login-container">
    <div class="login-form">
    <h2>🌾水稻茎秆微表型结构分割平台</h2>
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="email">邮箱:</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">密码:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <button type="submit" :disabled="isLoading">
        {{ isLoading ? '登录中...' : '登录' }}
      </button>
    </form>
    <p>
      还没有账户？ <router-link to="/register">去注册</router-link>
    </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router'; // 1. 导入 useRouter
import { useAuthStore } from '@/stores/auth'; // 2. 导入 auth store

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
    // 6. 登录成功 -> 跳转到主看板页
    console.log('Login successful, navigating to dashboard...');
    router.push({ name: 'dashboard' }); // 使用命名路由跳转
  } else {
    // 7. 登录失败 -> 显示错误信息
    // 简单的错误提示，可以根据 authStore 中可能设置的更具体的错误信息来改进
    errorMessage.value = '邮箱或密码错误，请重试。';
    console.error('Login failed in component.');
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
  min-height: 100vh;
  width: 100%;
}

.login-form {
  max-width: 400px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  text-align: center;
  background-color: rgba(255, 255, 255, 0.7);
  width: 100%;
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
}

.form-group input {
  width: 100%;
  padding: 8px;
  box-sizing: border-box;
}

.error-message {
  color: red;
  margin-bottom: 15px;
}

button {
  padding: 10px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 2px;
  cursor: pointer;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

p {
  margin-top: 20px;
}
</style>