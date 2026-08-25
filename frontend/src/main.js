import './style.css'
import { startKakaoLogin, startGoogleLogin, login, logout } from './auth/auth-api.js'
import { clearAccessToken, getAccessToken } from './auth/token-storage.js'
import { renderOAuthCallback } from './pages/oauth-callback.js'

const app = document.querySelector('#app')

if (window.location.pathname === '/oauth/callback') {
  renderOAuthCallback(app)
} else if (window.location.pathname === '/profile/setup') {
  renderProfileSetup(app)
} else if (getAccessToken()) {
  renderHome(app)
} else {
  renderLogin(app)
}

/**
 * 로그인 폼 렌더러 (카카오, 구글, 일반 로그인)
 */
function renderLogin(container) {
  container.innerHTML = `
    <main class="page-shell">
      <section class="auth-card" aria-labelledby="login-title">
        <div class="brand-mark" aria-hidden="true">P2</div>
        <p class="eyebrow">PROJECT 2</p>
        <h1 id="login-title">함께할 사람을 만나보세요</h1>
        
        <!-- 소셜 로그인 그룹 -->
        <div class="social-login-group" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
          <button id="kakao-login" class="kakao-button" type="button">
            카카오로 계속하기
          </button>
          <button id="google-login" class="google-button" type="button" style="background-color: #ffffff; color: #757575; border: 1px solid #ddd; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
            구글로 계속하기
          </button>
        </div>

        <!-- 구분선 -->
        <div style="margin: 20px 0; display: flex; align-items: center; width: 100%;">
          <hr style="flex: 1; border: none; border-top: 1px solid #ddd;">
          <span style="padding: 0 10px; color: #aaa; font-size: 12px;">또는</span>
          <hr style="flex: 1; border: none; border-top: 1px solid #ddd;">
        </div>

        <!-- 일반 이메일 로그인 폼 -->
        <form id="local-login-form" style="display: flex; flex-direction: column; gap: 12px; width: 100%;">
          <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; width: 100%;">
            <label for="email" style="font-size: 12px; font-weight: bold; color: #666;">이메일</label>
            <input type="email" id="email" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" placeholder="example@test.com">
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; width: 100%;">
            <label for="password" style="font-size: 12px; font-weight: bold; color: #666;">비밀번호</label>
            <input type="password" id="password" required style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;" placeholder="비밀번호를 입력하세요">
          </div>
          <p id="error-message" style="color: #ff3333; font-size: 12px; margin: 0; text-align: left; display: none;"></p>
          <button type="submit" class="primary-link" style="width: 100%; padding: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; text-align: center; display: block; box-sizing: border-box;">
            로그인
          </button>
        </form>

        <p class="notice" style="margin-top: 20px;">로그인하면 서비스 이용약관과 개인정보 처리방침에 동의하게 됩니다.</p>
      </section>
    </main>
  `

  container.querySelector('#kakao-login').addEventListener('click', startKakaoLogin)
  container.querySelector('#google-login').addEventListener('click', startGoogleLogin)
  
  container.querySelector('#local-login-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = container.querySelector('#email').value
    const password = container.querySelector('#password').value
    const errorEl = container.querySelector('#error-message')
    errorEl.style.display = 'none'

    try {
      await login(email, password)
      window.location.reload()
    } catch (err) {
      errorEl.textContent = err.message
      errorEl.style.display = 'block'
    }
  })
}

/**
 * 로그인 성공 홈 화면
 */
function renderHome(container) {
  container.innerHTML = `
    <main class="page-shell">
      <section class="auth-card" aria-labelledby="home-title">
        <div class="brand-mark" aria-hidden="true">P2</div>
        <p class="eyebrow">LOGIN COMPLETE</p>
        <h1 id="home-title">로그인되었습니다</h1>
        <p class="description">이제 인증이 필요한 Project2 API를 호출할 수 있습니다.</p>
        
        <!-- 안전한 로그아웃 버튼 -->
        <button id="logout-btn" class="primary-link" style="width: 100%; padding: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; margin-bottom: 12px;">
          안전하게 로그아웃
        </button>
        
        <button id="clear-session" class="secondary-link" type="button">이 브라우저의 로그인 플래그 지우기</button>
      </section>
    </main>
  `

  container.querySelector('#logout-btn').addEventListener('click', async () => {
    await logout()
    clearAccessToken()
    window.location.replace('/')
  })

  container.querySelector('#clear-session').addEventListener('click', () => {
    clearAccessToken()
    window.location.replace('/')
  })
}

/**
 * 프로필 설정화면 (신규 가입 유저)
 */
function renderProfileSetup(container) {
  container.innerHTML = `
    <main class="page-shell">
      <section class="auth-card" aria-labelledby="profile-title">
        <p class="eyebrow">PROFILE SETUP</p>
        <h1 id="profile-title">프로필 설정이 필요합니다</h1>
        <p class="description">임시 닉네임이 발급되었습니다. 프로필 수정 API 구현 후 이 화면에 입력 폼을 연결합니다.</p>
        <a class="primary-link" href="/">우선 홈으로 이동</a>
      </section>
    </main>
  `
}
