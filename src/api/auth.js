import request from '@/utils/request'
import http from '@/utils/http'

// 发送验证码
export const authSendCodeService = (data) => {
  return request({
    url: '/api/auth/send-code',
    method: 'post',
    data,
  })
}

// 用户注册
export const authRegisterService = (data) => {
  return request({
    url: '/api/auth/register',
    method: 'post',
    data,
  })
}

// 用户登录
export const authLoginService = (data) => {
  return http.post('/api/auth/login', data)
}

// 忘记密码（已废弃，使用发送验证码接口）
export const authForgetPasswordService = (data) => {
  return request({
    url: '/user/forget-password',
    method: 'post',
    data,
  })
}

// 重置密码
export const authResetPasswordService = (data) => {
  return request({
    url: '/api/auth/reset-password',
    method: 'post',
    data,
  })
}
