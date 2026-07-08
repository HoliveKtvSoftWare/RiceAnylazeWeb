import apiClient from './apiClient'; // 导入配置好的 axios 实例

/**
 * 用户登录函数
 * @param {string} email - 用户邮箱
 * @param {string} password - 用户密码
 * @returns {Promise<object>} 包含 access_token 的响应数据或在出错时抛出错误
 */
const login = (email, password) => {
  // 创建 FormData 以匹配后端 /auth/jwt/login 的要求
  const formData = new FormData();
  formData.append('username', email); // 使用 email 填充 username 字段
  formData.append('password', password);
  formData.append('grant_type', 'password'); // 添加 grant_type

  // 发送 POST 请求，并覆盖 Content-Type
  // 返回原始的 Promise，错误由 apiClient 的拦截器或调用者处理
  return apiClient.post('/auth/jwt/login', formData, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }).then(response => response.data); // 成功时只返回 data 部分
};

/**
 * 用户注册函数
 * @param {object} userData - 包含 email 和 password (以及可选的 username) 的用户数据对象
 * @returns {Promise<object>} 注册成功后的用户数据或在出错时抛出错误
 */
const register = (userData) => {
  // 后端的 /auth/register 接口期望 JSON 数据，直接发送
  // 返回原始的 Promise
  return apiClient.post('/auth/register', {
    email: userData.email,
    password: userData.password,
    // 如果需要 username:
    // username: userData.username
  }).then(response => response.data); // 成功时只返回 data 部分
};

/**
 * 获取当前登录用户的信息
 * @returns {Promise<object>} 用户信息对象或抛出错误
 */
const getUserProfile = () => {
  console.debug('Fetching user profile...');
  // apiClient 的拦截器会自动添加 Token
  return apiClient.get('/users/me')
    .then(response => {
      console.debug('User profile fetched:', response.data);
      return response.data; // 返回包含 email, id, quota 等信息的对象
    })
    .catch(error => {
      console.error('Failed to fetch user profile:', error.response?.data || error.message);
      throw error;
    });
};

// 导出服务对象
export const authService = {
  login,
  register,
  getUserProfile
};
