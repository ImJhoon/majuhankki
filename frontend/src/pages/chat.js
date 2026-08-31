import { getAccessToken } from '../auth/token-storage.js'
import { navigateTo } from '../main.js'
import { getLatestMatchResult } from '../matching/matching-api.js'

/**
 * 채팅 페이지 (카카오톡 스타일 UI)
 * - project2.isLoggedIn 이 true 인 경우에만 접근 가능
 * - STOMP CONNECT 헤더에 JWT 쿠키를 포함 (HttpOnly 쿠키는 브라우저가 자동 전송)
 * - /app/chat/{roomId}/send 로 전송, /topic/chat/{roomId} 구독
 */
export function renderChatPage(container) {
  // 로그인 여부 확인
  if (!getAccessToken()) {
    navigateTo('/')
    return
  }

  container.innerHTML = `
    <main class="max-w-2xl mx-auto my-6 px-4 flex flex-col min-h-[600px]">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
        <div>
          <h2 class="text-2xl font-extrabold text-brand-navy">1:1 실시간 채팅</h2>
          <p class="text-xs text-secondary mt-1">상태: <span id="disp-status" class="font-bold text-slate-500">미연결</span></p>
        </div>
        <button id="btn-back" class="btn-secondary px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1">
          <span class="material-symbols-outlined text-sm">arrow_back</span>
          뒤로가기
        </button>
      </div>

      <!-- Room Info & Controls -->
      <div class="bg-surface-container-low rounded-2xl p-4 mb-4 border border-outline-variant/30 flex flex-wrap gap-4 items-center justify-between shadow-soft">
        <div class="text-xs space-y-1 text-secondary">
          <div><b>나의 ID:</b> <span id="disp-user-id" class="font-mono text-slate-600">불러오는 중...</span></div>
          <div><b>상대방 닉네임:</b> <span id="disp-partner-nickname" class="font-bold text-brand-navy">상대방</span></div>
          <div><b>채팅방 ID:</b> <span id="disp-room-id" class="font-bold text-brand-navy">-</span></div>
        </div>
        <div class="flex gap-2">
          <input type="number" id="room-id-input" value="1" min="1" class="w-16 bg-white border border-outline-variant/40 rounded-xl px-2 py-1 text-sm focus:ring-2 focus:ring-primary-container outline-none" />
          <button id="btn-connect" class="btn-primary px-4 py-1.5 rounded-full text-xs font-bold shadow-sm">채팅방 입장</button>
          <button id="btn-disconnect" disabled class="btn-secondary px-4 py-1.5 rounded-full text-xs font-bold disabled:opacity-50">연결 끊기</button>
        </div>
      </div>

      <!-- KakaoTalk Style Chat Window -->
      <div class="flex flex-col h-[550px] border border-outline-variant/30 rounded-card overflow-hidden shadow-floating bg-[#BACEE0]">
        <!-- Messages Area -->
        <div id="chat-box" class="flex-grow overflow-y-auto p-4 space-y-4">
          <div class="text-center my-2 text-xs text-slate-600 bg-white/40 rounded-full px-4 py-1 w-fit mx-auto shadow-sm">
             채팅방에 입장해 주세요.
          </div>
        </div>

        <!-- Input Area -->
        <div class="bg-white border-t border-slate-200 p-3 flex gap-2">
          <input type="text" id="msg-input" placeholder="메시지를 입력하세요..." disabled class="flex-grow bg-slate-100 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-container outline-none" />
          <button id="btn-send" disabled class="btn-primary px-5 py-2 rounded-xl text-sm font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed">전송</button>
        </div>
      </div>
    </main>
  `

  const roomIdFromQuery = new URLSearchParams(window.location.search).get('roomId')
  if (/^\d+$/.test(roomIdFromQuery || '')) {
    document.getElementById('room-id-input').value = roomIdFromQuery
  }

  // ── 상태 변수 ──────────────────────────────────────────────────────────────
  let stompClient  = null
  let subscription = null
  let myUserId     = null
  let partnerNickname = '상대방'
  let partnerUserId = null
  let partnerProfileImg = null

  // ── 정보 초기화는 하단에서 Promise.all로 진행합니다. ──────────────────────────

  // ── 카카오톡 스타일 말풍선 렌더링 ──────────────────────────────────────────────
  function appendChatMessage(senderId, nickname, message, isMine, customTime = null) {
    const box = document.getElementById('chat-box')
    if (!box) return

    const row = document.createElement('div')
    const timeVal = customTime ? new Date(customTime) : new Date()
    const timeStr = timeVal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    
    if (isMine) {
      row.className = 'flex justify-end items-end gap-1.5 mb-1.5 w-full'
      row.innerHTML = `
        <span class="text-[9px] text-slate-600/80 mb-0.5 select-none">${timeStr}</span>
        <div class="bg-[#FEE500] text-black text-sm p-2.5 rounded-l-2xl rounded-br-2xl max-w-[70%] shadow-sm whitespace-pre-wrap break-words border border-[#E4CE00]/30">${escapeHtml(message)}</div>
      `
    } else {
      row.className = 'flex items-start gap-2.5 mb-1.5 w-full'
      const initial = escapeHtml(nickname ? nickname.trim().charAt(0) : '상')
      
      const avatarHtml = partnerProfileImg
        ? `<img src="${escapeHtml(partnerProfileImg)}" class="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-slate-200" alt="avatar" />`
        : `<div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-brand-navy font-bold shrink-0 text-sm shadow-sm select-none">${initial}</div>`

      row.innerHTML = `
        ${avatarHtml}
        <div class="flex flex-col">
          <span class="text-[11px] text-slate-700 mb-0.5 font-semibold select-none">${escapeHtml(nickname || '상대방')}</span>
          <div class="flex items-end gap-1.5">
            <div class="bg-white text-black text-sm p-2.5 rounded-r-2xl rounded-bl-2xl max-w-[70%] shadow-sm whitespace-pre-wrap break-words border border-slate-200">${escapeHtml(message)}</div>
            <span class="text-[9px] text-slate-600/80 mb-0.5 select-none">${timeStr}</span>
          </div>
        </div>
      `
    }

    box.appendChild(row)
    box.scrollTop = box.scrollHeight
  }

  function appendSystemMessage(text, color = 'slate-600') {
    const box = document.getElementById('chat-box')
    if (!box) return

    const line = document.createElement('div')
    line.className = `text-center my-2 text-xs text-${color} bg-white/40 rounded-full px-4 py-1.5 w-fit mx-auto shadow-sm select-none`
    line.textContent = text
    box.appendChild(line)
    box.scrollTop = box.scrollHeight
  }

  function escapeHtml(str) {
    if (!str) return ''
    return str.replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;')
  }

  // ── CONNECT + SUBSCRIBE ────────────────────────────────────────────────────
  function connect() {
    const roomId = document.getElementById('room-id-input').value
    document.getElementById('disp-room-id').textContent = roomId
    document.getElementById('disp-status').textContent  = '연결 중...'

    const SockJS = window.SockJS
    const Stomp  = window.Stomp

    if (!SockJS || !Stomp) {
      appendSystemMessage('SockJS / STOMP 라이브러리가 로드되지 않았습니다.', 'red-700')
      return
    }

    const socket = new SockJS('/ws-chat')
    stompClient  = Stomp.over(socket)
    stompClient.debug = null

    stompClient.connect({}, function () {
      appendSystemMessage('채팅방 연결 성공!', 'green-700')
      document.getElementById('disp-status').textContent = '연결됨'
      document.getElementById('btn-connect').disabled    = true
      document.getElementById('btn-disconnect').disabled = false

      // 1. 이전 대화 내역 불러오기
      fetch(`/chatrooms/${roomId}/messages?size=50`, { credentials: 'include' })
        .then(r => r.json())
        .then(body => {
          if (body.success && body.data && body.data.content) {
            const box = document.getElementById('chat-box')
            if (box) box.innerHTML = '' // 초기 환영 메시지 삭제

            body.data.content.forEach(msg => {
              const isMine = msg.senderId === myUserId
              const nickname = isMine ? '나' : (msg.senderId === partnerUserId ? partnerNickname : '상대방')
              appendChatMessage(msg.senderId, nickname, msg.content, isMine, msg.sentAt)
            })
            appendSystemMessage('이전 대화 내역을 불러왔습니다.')
          }
        })
        .catch(err => {
          console.warn('이전 대화 내역 조회 실패:', err)
        })

      // 2. SUBSCRIBE (실시간 메시지 구독)
      subscription = stompClient.subscribe(`/topic/chat/${roomId}`, function (msg) {
        const body   = JSON.parse(msg.body)
        const isMine = body.sender === myUserId
        const nickname = isMine ? '나' : (body.sender === partnerUserId ? partnerNickname : '상대방')
        appendChatMessage(body.sender, nickname, body.message, isMine)
      })

      appendSystemMessage(`채팅방 ${roomId}번에 입장하였습니다.`)
      document.getElementById('msg-input').disabled = false
      document.getElementById('btn-send').disabled  = false
    }, function (err) {
      appendSystemMessage('연결 실패: ' + err, 'red-700')
      document.getElementById('disp-status').textContent = '연결 실패'
    })
  }

  // ── DISCONNECT ─────────────────────────────────────────────────────────────
  function disconnect() {
    if (stompClient) {
      if (subscription) subscription.unsubscribe()
      stompClient.disconnect(() => {
        appendSystemMessage('채팅방 연결이 종료되었습니다.', 'slate-500')
        resetUI()
      })
    }
  }

  // ── SEND ───────────────────────────────────────────────────────────────────
  function sendMessage() {
    const roomId  = document.getElementById('room-id-input').value
    const message = document.getElementById('msg-input').value.trim()
    if (!message || !stompClient) return

    stompClient.send(
      `/app/chat/${roomId}/send`,
      {},
      JSON.stringify({ roomId: Number(roomId), message })
    )
    document.getElementById('msg-input').value = ''
  }

  // ── UI 초기화 ──────────────────────────────────────────────────────────────
  function resetUI() {
    document.getElementById('disp-status').textContent  = '미연결'
    document.getElementById('disp-room-id').textContent = '-'
    document.getElementById('btn-connect').disabled     = false
    document.getElementById('btn-disconnect').disabled  = true
    document.getElementById('msg-input').disabled       = true
    document.getElementById('btn-send').disabled        = true
    stompClient  = null
    subscription = null
  }

  // ── 이벤트 바인딩 ──────────────────────────────────────────────────────────
  document.getElementById('btn-back').addEventListener('click', () => navigateTo('/'))
  document.getElementById('btn-connect').addEventListener('click', connect)
  document.getElementById('btn-disconnect').addEventListener('click', disconnect)
  document.getElementById('btn-send').addEventListener('click', sendMessage)
  document.getElementById('msg-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage()
  })

  // ── 사용자 정보 및 매칭 파트너 정보 먼저 가져오기 ──────────────────────────
  Promise.all([
    fetch('/users/me', { credentials: 'include' })
      .then(r => r.json())
      .catch(() => null),
    getLatestMatchResult()
      .catch(() => null)
  ]).then(([userBody, matchResult]) => {
    if (userBody && userBody.success && userBody.data) {
      myUserId = userBody.data.userId
      document.getElementById('disp-user-id').textContent = myUserId
    } else {
      document.getElementById('disp-user-id').textContent = '(조회 실패)'
    }

    if (matchResult && matchResult.partner) {
      partnerNickname = matchResult.partner.nickname || '상대방'
      partnerUserId = matchResult.partner.userId
      partnerProfileImg = matchResult.partner.profileImageUrl
      const partnerNameEl = document.getElementById('disp-partner-nickname')
      if (partnerNameEl) {
        partnerNameEl.textContent = partnerNickname
      }
    }

    // 정보를 다 확보한 상태에서 자동으로 입장 처리 진행
    if (/^\d+$/.test(roomIdFromQuery || '')) {
      connect()
    }
  })
}
