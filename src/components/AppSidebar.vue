<template>
  <aside class="app-sidebar">
    <nav>
      <ul>
        <li>
          <router-link to="/" exact-active-class="active-link">主页</router-link>
        </li>
        <li>
          <router-link to="/user-center" exact-active-class="active-link">用户中心</router-link>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<script setup>
</script>

<style scoped>
.app-sidebar {
  width: 200px;
  background-color: rgba(46, 125, 50, 0.8);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  color: white;
  padding-top: 20px;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.2);
}

nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

nav li a {
  display: block;
  padding: 15px 20px;
  color: white;
  text-decoration: none;
  transition: background-color 0.2s;
}

nav li a:hover {
  background-color: #388e3c; /* 悬停时深一点的绿色 */
}

/* 当前激活链接的样式 */
.active-link {
  background-color: #1b5e20; /* 更深的绿色 */
  font-weight: bold;
}
</style>