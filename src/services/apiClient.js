import axios from 'axios'

// 创建 axios 实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api', // 您设置了 /api 后缀，确认后端路由是否匹配
  timeout: 10000, // 设置请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// --- 请求拦截器 ---
// 在每个请求发送前，自动附加认证 Token
apiClient.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 Token
    const token = localStorage.getItem('authToken')
    if (token) {
      // 如果 Token 存在，添加到 Authorization 请求头
      config.headers.Authorization = `Bearer ${token}`
      console.debug('Token attached:', token) // 增加调试日志
    } else {
      console.debug('No token found in localStorage.') // 增加调试日志
    }
    return config
  },
  (error) => {
    // 处理请求发送前的错误
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 处理后端返回的响应或错误
apiClient.interceptors.response.use(
  (response) => {
    // 如果响应成功 (状态码 2xx)，直接返回响应数据
    console.debug('Response received:', response.status, response.data) // 增加调试日志
    return response
  },
  (error) => {
    // 如果后端返回了错误响应 (状态码非 2xx)
    if (error.response) {
      const status = error.response.status
      console.error(`Error Response Status: ${status}`, error.response.data) // 记录错误状态和内容

      if (status === 401) {
        // --- 处理 401 Unauthorized ---
        // 可能是 Token 过期或无效
        console.warn('Unauthorized access (401). Clearing token and redirecting to login.')
        localStorage.removeItem('authToken')
        // 可以在这里添加更复杂的逻辑，比如尝试刷新 Token (如果后端支持)
        // 使用 Vue Router 跳转而不是直接修改 window.location (更推荐)
        // import router from '@/router'; // 假设你的 router 在这里
        // router.push('/login');
        // 暂时先用 window.location 跳转
        window.location.href = '/login'
        // 返回一个已被处理的 Promise，避免后续代码继续处理这个错误
        return Promise.reject(new Error('Unauthorized: Redirecting to login.'))

      } else if (status >= 400 && status < 500) {
        // --- 处理其他客户端错误 (4xx) ---
        // 例如 400 Bad Request, 404 Not Found, 403 Forbidden
        // 通常这些错误表示前端发送的数据有问题或权限不足
        // 可以考虑在这里显示一个通用的错误提示给用户
        alert(`客户端错误: ${error.response.data?.detail || error.message}`);

      } else if (status >= 500) {
        // --- 处理服务器端错误 (5xx) ---
        // 例如 500 Internal Server Error
        // 这通常表示后端代码出错了
        // 可以考虑显示一个“服务器繁忙”的提示
        // alert(`服务器错误: ${error.message}`);
      }
    } else if (error.request) {
      // --- 处理网络错误 (请求已发出，但没有收到响应) ---
      console.error('Network Error:', error.message)
      // 可能是后端服务没启动、网络不通等
      alert('网络连接错误，请检查您的网络或稍后再试。');
    } else {
      // --- 处理请求设置错误 ---
      // 在设置请求时就发生了错误
      // console.error('Request Setup Error:', error.message)
    }

    // 对于所有未被特殊处理的错误，继续将错误抛出，
    // 以便调用处的 .catch() 可以捕获并处理
    return Promise.reject(error)
  }
)

export default apiClient
