# Project2 Frontend

Vite 기반 바닐라 JavaScript 프론트엔드입니다.

## 실행

```powershell
npm.cmd install
npm.cmd run dev
```

개발 서버는 `http://localhost:3000`에서 실행됩니다.

백엔드 환경변수는 다음과 같이 설정합니다.

```env
FRONTEND_ORIGIN=http://localhost:3000
OAUTH2_SUCCESS_REDIRECT_URI=http://localhost:3000/oauth/callback
```

로컬 개발에서는 `VITE_API_BASE_URL`을 비워 두고 Vite가 REST·OAuth·SockJS 요청을 `http://localhost:8080`으로 프록시하도록 합니다. 배포 환경에서는 Cloudflare Pages의 `VITE_API_BASE_URL`에 슬래시로 끝나지 않는 Render HTTPS Origin(예: `https://example.onrender.com`)을 지정합니다. 실제 비밀값은 프론트엔드 환경변수에 저장하지 않습니다.

상태 변경 요청 직전에 `GET /auth/csrf`를 호출하고 응답의 `data.token`을 `X-XSRF-TOKEN` 헤더로 전달합니다. 프론트엔드는 다른 Origin의 백엔드 CSRF 쿠키를 직접 읽거나 완료된 토큰을 장기 캐시하지 않습니다.

## OAuth 동작

- 카카오 로그인 버튼은 브라우저를 백엔드 OAuth 시작 경로로 이동시킵니다.
- `/oauth/callback`은 CSRF 토큰 발급 후 일회성 코드를 서비스 토큰으로 교환합니다.
- Access Token은 현재 탭의 `sessionStorage`에만 보관합니다.
- Refresh Token은 JavaScript에서 읽지 않고 백엔드가 발급한 HttpOnly 쿠키로 관리합니다.
- 임시 닉네임 사용자는 `/profile/setup` 안내 화면으로 이동합니다. 실제 프로필 입력 폼은 프로필 수정 API와 함께 구현합니다.
