<template>
  <div class="register-view">
    <h2>注册新账户</h2>
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label for="email">邮箱:</label>
        <input type="email" id="email" v-model="email" required />
      </div>
      <div class="form-group">
        <label for="password">密码:</label>
        <input type="password" id="password" v-model="password" required />
      </div>
      <div class="form-group">
        <label for="confirmPassword">确认密码:</label>
        <input type="password" id="confirmPassword" v-model="confirmPassword" required />
      </div>

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>

      <button type="submit" :disabled="isLoading">
        {{ isLoading ? '注册中...' : '注册' }}
      </button>
    </form>
    <p>
      已有账户？ <router-link to="/login">返回登录</router-link>
    </p>
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
    // 6. 注册失败
    // 这个错误信息可以做得更具体，比如从 store 中获取
    errorMessage.value = '注册失败，该邮箱可能已被占用。';
  }
};
</script>

<style scoped>
/* 样式与登录页基本一致 */
.register-view {
  max-width: 400px;
  margin: 50px auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  text-align: center;
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

.success-message {
  color: green;
  margin-bottom: 15px;
}

button {
  padding: 10px 15px;
  background-color: #28a745; /* 绿色按钮以示区别 */
  color: white;
  border: none;
  border-radius: 3px;
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
