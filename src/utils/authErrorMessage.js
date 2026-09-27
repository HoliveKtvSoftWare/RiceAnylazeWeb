const AUTH_ERROR_MESSAGES = {
  LOGIN_BAD_CREDENTIALS: '邮箱或密码不正确，请重试。',
  LOGIN_USER_NOT_EXIST: '该邮箱尚未注册，请先注册。',
  REGISTER_USER_ALREADY_EXISTS: '该邮箱已注册，请直接登录。',
  REGISTER_INVALID_PASSWORD: '密码不符合要求，请换一个密码。',
}

function getValidationMessage(detail) {
  if (!Array.isArray(detail)) return null

  const messages = detail
    .map((item) => (typeof item === 'string' ? item : item?.msg))
    .filter(Boolean)

  if (messages.some((message) => /email|valid email/i.test(message))) {
    return '邮箱格式不正确。'
  }

  if (messages.length > 0) return messages.join('；')
  return null
}

export function getAuthErrorMessage(error, fallback = '请求失败，请稍后重试。') {
  const detail = error?.response?.data?.detail
  const validationMessage = getValidationMessage(detail)
  if (validationMessage) return validationMessage

  if (typeof detail === 'string') {
    return AUTH_ERROR_MESSAGES[detail] || fallback
  }

  return fallback
}
