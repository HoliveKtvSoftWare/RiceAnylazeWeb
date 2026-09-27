import test from 'node:test'
import assert from 'node:assert/strict'

import { getAuthErrorMessage } from '../src/utils/authErrorMessage.js'

test('maps invalid login credentials to an actionable message', () => {
  const error = { response: { data: { detail: 'LOGIN_BAD_CREDENTIALS' } } }

  assert.equal(getAuthErrorMessage(error, '登录失败'), '邮箱或密码不正确，请重试。')
})

test('maps duplicate registration to a login hint', () => {
  const error = { response: { data: { detail: 'REGISTER_USER_ALREADY_EXISTS' } } }

  assert.equal(getAuthErrorMessage(error, '注册失败'), '该邮箱已注册，请直接登录。')
})

test('formats FastAPI validation details without exposing an axios error', () => {
  const error = {
    response: {
      data: {
        detail: [{ msg: 'value is not a valid email address' }],
      },
    },
  }

  assert.equal(getAuthErrorMessage(error, '注册失败'), '邮箱格式不正确。')
})
