<template>
  <nav class="navbar">
    <div class="nav-brand">
      <h1>Rice Analyzer</h1>
    </div>
    <div class="nav-links">
      <router-link to="/dashboard">仪表板</router-link>
      <router-link to="/login">登录</router-link>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'AppNavBar'
}
</script>

<style scoped>
.navbar {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-links a {
  color: white;
  text-decoration: none;
  margin-left: 1rem;
}
</style>