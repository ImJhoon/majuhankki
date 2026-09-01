import { API_BASE_URL } from '../config/api.js'

const nativeFetch = window.fetch.bind(window)
let csrfRequest = null

/**
 * 다른 Origin의 프론트엔드에서는 백엔드 쿠키를 읽을 수 없으므로,
 * 상태 변경 직전에 /auth/csrf 응답 토큰을 받아 같은 발급 흐름의 쿠키와 함께 사용합니다.
 * 동시에 발생한 발급 요청만 공유하고, 완료된 토큰은 장기 보관하지 않습니다.
 */
export async function getCsrfToken(fetchImpl = nativeFetch) {
  if (!csrfRequest) {
    csrfRequest = fetchImpl(`${API_BASE_URL}/auth/csrf`, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async (response) => {
        const body = await readJson(response)
        const token = body?.data?.token

        if (!response.ok || !body?.success || !token) {
          throw new Error('CSRF 토큰을 발급받지 못했습니다.')
        }

        return token
      })
      .finally(() => {
        csrfRequest = null
      })
  }

  return csrfRequest
}

async function readJson(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null

  try {
    return await response.json()
  } catch {
    return null
  }
}
