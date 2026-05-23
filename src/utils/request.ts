import axios from 'axios'
import md5 from 'js-md5'

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/api'
const SECRET = 'pixease-sign-secret-2026'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

function generateSign(params: Record<string, unknown>): Record<string, string> {
  const timestamp = Date.now().toString()
  const nonce = Math.random().toString(36).substring(2, 12)

  const allParams: Record<string, unknown> = { ...params }
  const keys = Object.keys(allParams).sort()

  let signStr = ''
  keys.forEach((key, index) => {
    if (allParams[key] !== undefined && allParams[key] !== null) {
      signStr += `${key}=${allParams[key]}${index < keys.length - 1 ? '&' : ''}`
    }
  })

  if (signStr) signStr += '&'
  signStr += `timestamp=${timestamp}&nonce=${nonce}&secret=${SECRET}`

  const sign = md5(signStr)

  return { timestamp, nonce, sign }
}

request.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const params: Record<string, unknown> = {}

  if (config.method?.toLowerCase() === 'get') {
    Object.assign(params, config.params)
  } else if (config.data) {
    Object.assign(params, config.data)
  }

  const { timestamp, nonce, sign } = generateSign(params)

  config.headers['X-Sign'] = sign
  config.headers['X-Timestamp'] = timestamp
  config.headers['X-Nonce'] = nonce

  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }

  return config
})

request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code !== 200) {
      if (res.code === 401 || res.code === 1003 || res.code === 1004) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token')
        }
      }
      return Promise.reject(res)
    }
    return res
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default request