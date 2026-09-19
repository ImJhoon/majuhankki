import {
  CHAT_MESSAGES,
  CONDITION_OPTIONS,
  DEMO_STORAGE_KEY,
  isValidDemoState,
  PERSONALITY_OPTIONS,
  STEPS,
  scenarioFor,
} from './scenario.js'
import '../style.css'
import '../matching/matching-request.css'
import '../pages/chat.css'
import './demo.css'

const app = document.querySelector('#demo-app')
const initialState = () => ({
  step: 'START',
  personality: { pace: '', conversation: '' },
  conditions: { region: '', food: '', time: getDefaultDateTimeValue() },
})
let restoredFromStorage = false
let state = readState()
let searchTimer
let recovering = false
let conditionStep = 1
let scheduleModal = ''
let scheduleDraftDate = ''
let scheduleDraftTime = ''
let scheduleCalendarMonth = getMonthValue(new Date())

function readState() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(DEMO_STORAGE_KEY) || 'null')
    if (!saved || !STEPS.includes(saved.step)) return initialState()
    restoredFromStorage = true
    const next = initialState()
    next.step = saved.step
    next.personality.pace = optionValue(PERSONALITY_OPTIONS.pace, saved.personality?.pace)
    next.personality.conversation = optionValue(PERSONALITY_OPTIONS.conversation, saved.personality?.conversation)
    next.conditions.region = optionValue(CONDITION_OPTIONS.regions.map((value) => ({ value })), saved.conditions?.region)
    next.conditions.food = optionValue(CONDITION_OPTIONS.foods.map((value) => ({ value })), saved.conditions?.food)
    next.conditions.time = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(saved.conditions?.time || '')
      ? saved.conditions.time
      : getDefaultDateTimeValue()
    return isValidDemoState(next) ? next : initialState()
  } catch {
    return initialState()
  }
}

function optionValue(options, value) {
  return options.some((option) => option.value === value) ? value : ''
}

function saveState() {
  try {
    sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // 저장소를 사용할 수 없는 환경에서도 현재 탭의 체험은 계속한다.
  }
}

function setStep(step, { replace = false } = {}) {
  if (!STEPS.includes(step) || !isValidDemoState({ ...state, step })) return resetDemo()
  if (step === 'CONDITIONS' && state.step !== 'CONDITIONS') conditionStep = 1
  state.step = step
  saveState()
  const hash = `#${step.toLowerCase()}`
  if (replace) history.replaceState(null, '', hash)
  else if (location.hash !== hash) location.hash = hash
  render()
  window.scrollTo({ top: 0 })
}

function resetDemo() {
  clearTimeout(searchTimer)
  try {
    sessionStorage.removeItem(DEMO_STORAGE_KEY)
  } catch {
    // 비공개 모드에서 삭제할 값이 없을 때도 시작 화면으로 복구한다.
  }
  state = initialState()
  conditionStep = 1
  scheduleModal = ''
  scheduleDraftDate = ''
  scheduleDraftTime = ''
  history.replaceState(null, '', '#start')
  render()
}

function hashStep() {
  try {
    const value = decodeURIComponent(location.hash.slice(1)).toUpperCase()
    return value && STEPS.includes(value) ? value : null
  } catch {
    return null
  }
}

function syncFromHash() {
  const step = hashStep()
  if (!step || state.step !== step) return resetDemo()
  render()
}

function render() {
  if (!app) return
  clearTimeout(searchTimer)
  const content = {
    START: renderStart,
    PERSONALITY: renderPersonality,
    CONDITIONS: renderConditions,
    SEARCHING: renderSearching,
    PROPOSAL: renderProposal,
    CHAT: renderChat,
    COMPLETE: renderComplete,
  }[state.step]
  if (!content) return resetDemo()

  app.innerHTML = shell(content())
  document.body.classList.toggle('matching-time-modal-open', Boolean(scheduleModal))
  bindCommonActions()
  content.after?.()
  window.requestAnimationFrame(() => app.querySelector(scheduleModal ? '.matching-time-modal-close' : 'h1, h2, [autofocus]')?.focus({ preventScroll: true }))
}

function shell(markup) {
  const progress = STEPS.indexOf(state.step)
  return `
    <header class="glass-nav fixed left-0 top-0 z-40 w-full border-b border-outline-variant/20 shadow-sm">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-margin-mobile py-4 md:px-margin-desktop">
        <a class="flex items-center gap-3" href="#start" aria-label="체험용 데모 시작 화면으로 이동">
          <span class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-outline-variant/30 bg-brand-ivory shadow-md">
            <img src="/assets/branding/app-icon-kakao-ivory-128.png" alt="" class="h-full w-full object-cover" />
          </span>
          <img src="/assets/maju-hankki-wordmark-v2.png" alt="마주한끼" class="h-auto w-28 md:w-36" />
        </a>
        <div class="flex items-center gap-2 sm:gap-3">
          <span class="rounded-full border border-primary-container/30 bg-primary-container/10 px-3 py-1.5 text-xs font-extrabold text-primary">체험용 데모</span>
          ${state.step !== 'START' ? '<button class="btn-secondary rounded-full px-3 py-2 text-xs font-bold sm:px-4" type="button" data-action="reset">처음부터 다시</button>' : ''}
        </div>
      </div>
    </header>
    <div class="border-b border-outline-variant/30 bg-white/75 px-4 py-2 text-center text-xs font-semibold text-secondary" role="note">
      <span class="material-symbols-outlined mr-1 text-sm text-primary-container" aria-hidden="true">info</span>
      실제 사용자와 연결되지 않는 고정 시나리오입니다.
    </div>
    <main id="demo-main" class="min-h-[calc(100vh-126px)]" tabindex="-1">
      ${state.step !== 'START' ? `<div class="mx-auto max-w-5xl px-4 pt-5 sm:px-6"><div class="h-1.5 overflow-hidden rounded-full bg-outline-variant/30" aria-label="데모 진행 상태"><span class="block h-full rounded-full bg-primary-container transition-all" style="width:${progress / (STEPS.length - 1) * 100}%"></span></div></div>` : ''}
      ${markup}
    </main>
    <footer class="px-4 py-6 text-center text-xs text-secondary">마주 앉아 나누는 따뜻한 한 끼 · 체험용 콘텐츠</footer>
  `
}

function renderStart() {
  return `
    <section class="mx-auto flex max-w-7xl flex-col items-center gap-12 px-margin-mobile py-12 md:px-margin-desktop md:py-20 lg:flex-row lg:gap-16" aria-labelledby="start-title">
      <div class="flex-1 space-y-6 text-center lg:text-left">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-primary-container/10 px-3 py-1.5 text-xs font-extrabold text-primary">
          <span class="material-symbols-outlined text-base" aria-hidden="true">science</span> 체험용 고정 시나리오
        </span>
        <h1 id="start-title" tabindex="-1" class="font-headline text-3xl font-extrabold leading-tight tracking-tight text-brand-navy sm:text-4xl lg:text-5xl">
          오늘 저녁,<br class="hidden sm:block" /> 혼밥 말고 <span class="text-primary-container">마주한끼</span>
        </h1>
        <p class="mx-auto max-w-xl text-base leading-relaxed text-secondary sm:text-lg lg:mx-0">활동 지역, 식사 속도, 대화 선호도를 골라 나와 꼭 맞는 가상 밥친구를 만나는 핵심 흐름을 체험해 보세요.</p>
        <div class="mx-auto flex max-w-xl flex-col gap-3 rounded-card border border-outline-variant/30 bg-surface-container-lowest p-3 shadow-soft sm:flex-row lg:mx-0">
          <button class="btn-primary pulse-ring flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-bold shadow-md" type="button" data-action="start">
            <span class="material-symbols-outlined text-lg" aria-hidden="true">local_dining</span> 마주한끼 체험하기
          </button>
        </div>
        <p class="text-xs text-secondary">회원가입 없이 약 2분이면 충분해요.</p>
      </div>
      <div class="relative w-full max-w-lg flex-1 lg:max-w-none">
        <div class="relative flex h-[360px] w-full items-center justify-center overflow-hidden rounded-[32px] border border-outline-variant/30 bg-surface-container-low shadow-floating sm:h-[440px]">
          <img src="/assets/images/shared-meal-hero-clay.png" alt="마주 앉아 따뜻한 식사를 나누는 3D 클레이 일러스트" class="h-full w-full object-cover object-center" />
          <div class="absolute inset-0 bg-gradient-to-t from-brand-navy/60 via-transparent to-transparent"></div>
        </div>
      </div>
    </section>
    <section class="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop py-16" aria-labelledby="features-title">
      <div class="mx-auto mb-10 max-w-2xl text-center sm:mb-12">
        <h2 id="features-title" class="font-headline text-2xl font-extrabold text-brand-navy sm:text-3xl">마주한끼 이용 방법</h2>
        <p class="mx-auto mt-3 max-w-xl text-sm leading-6 text-secondary sm:text-base">원하는 지역과 식사 조건을 정하면, 편안하게 만날 밥친구를 찾을 수 있어요.</p>
      </div>
      <ol class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <li class="card-hover relative rounded-card border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-soft">
          <div class="mb-6 flex items-center justify-between"><span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-sm font-extrabold text-white shadow-sm">1</span><span class="material-symbols-outlined text-3xl text-primary-container">location_on</span></div>
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-container">지역 설정</p><h3 class="font-headline text-xl font-bold text-brand-navy">만날 지역을 정해요</h3><p class="mt-3 text-sm leading-6 text-secondary">활동 지역을 선택하고 지도에서 약속 위치를 확인해요.</p>
        </li>
        <li class="card-hover relative rounded-card border border-outline-variant/30 bg-surface-container-lowest p-6 shadow-soft">
          <div class="mb-6 flex items-center justify-between"><span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-sm font-extrabold text-white shadow-sm">2</span><span class="material-symbols-outlined text-3xl text-primary-container">tune</span></div>
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-container">조건 선택</p><h3 class="font-headline text-xl font-bold text-brand-navy">원하는 식사를 알려요</h3><p class="mt-3 text-sm leading-6 text-secondary">날짜·시간, 음식 카테고리, 대화와 식사 성향을 선택해요.</p>
        </li>
        <li class="card-hover relative rounded-card border border-outline-variant/30 bg-gradient-to-br from-white to-surface-container-low p-6 shadow-soft">
          <div class="mb-6 flex items-center justify-between"><span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-sm font-extrabold text-white shadow-sm">3</span><span class="material-symbols-outlined text-3xl text-primary-container">group</span></div>
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-container">매칭 제안</p><h3 class="font-headline text-xl font-bold text-brand-navy">밥친구를 확인해요</h3><p class="mt-3 text-sm leading-6 text-secondary">조건에 맞는 상대의 제안을 확인하고 수락 또는 거절할 수 있어요.</p>
        </li>
        <li class="card-hover relative rounded-card border border-outline-variant/30 bg-brand-navy p-6 text-white shadow-soft">
          <div class="mb-6 flex items-center justify-between"><span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container text-sm font-extrabold text-white shadow-sm">4</span><span class="material-symbols-outlined text-3xl text-primary-container">chat</span></div>
          <p class="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-primary-container">만남 준비</p><h3 class="font-headline text-xl font-bold">채팅으로 약속을 정해요</h3><p class="mt-3 text-sm leading-6 text-gray-200">매칭이 완료되면 서비스 안에서 대화하고 식사 약속을 준비해요.</p>
        </li>
      </ol>
      <div class="mt-6 flex flex-col gap-4 rounded-card border border-primary-container/20 bg-brand-ivory p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div class="flex items-start gap-3"><span class="material-symbols-outlined mt-0.5 text-2xl text-primary-container">verified_user</span><div><h3 class="font-headline text-lg font-bold text-brand-navy">식사 후기도 안전하게 남겨요</h3><p class="mt-1 text-sm leading-6 text-secondary">만남 후 만족도를 선택하고, 불편한 상황은 신고 기능으로 알려주세요.</p></div></div>
        <span class="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-bold text-brand-navy shadow-sm"><span class="material-symbols-outlined text-base text-primary-container">shield</span>서비스 안에서 안전하게</span>
      </div>
    </section>
  `
}

function renderPersonality() {
  const { pace, conversation } = state.personality
  return `
    <section class="personality-survey-page px-4 py-8 sm:px-6 sm:py-12" aria-labelledby="personality-title">
      <div class="mx-auto w-full max-w-4xl">
        <header class="mb-6">
          <h1 id="personality-title" tabindex="-1" class="font-headline text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">나만의 식사 성향 설정</h1>
          <p class="mt-1.5 text-sm leading-relaxed text-secondary">실제 서비스와 같은 선택 카드로 오늘의 식사 성향을 알려주세요.</p>
        </header>
        <form class="personality-survey-card rounded-[28px] border border-outline-variant/30 bg-white p-5 shadow-floating sm:p-8" data-form="personality">
          <div class="mb-8 rounded-2xl border border-primary-container/15 bg-brand-ivory/70 p-4 sm:p-5">
            <div class="mb-4 flex items-center justify-between gap-4"><div class="flex items-center gap-3"><span class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-container text-sm font-extrabold text-white">1</span><div><p class="text-sm font-extrabold text-brand-navy">식사 스타일</p><p class="mt-0.5 text-xs font-medium text-secondary">데모 2단계 중 첫 번째</p></div></div><span class="text-sm font-extrabold text-primary">50% <span class="font-semibold text-secondary">완료</span></span></div>
            <div class="h-2 overflow-hidden rounded-full bg-white/80"><div class="h-full w-1/2 rounded-full bg-primary-container"></div></div>
          </div>
          <div class="mb-8 max-w-2xl"><span class="mb-3 inline-flex items-center gap-1.5 rounded-full bg-primary-container/10 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.12em] text-primary"><span class="material-symbols-outlined text-sm" aria-hidden="true">tune</span>Step 1</span><h2 class="font-headline text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">함께 먹을 때의 기본 스타일</h2><p class="mt-2 text-sm leading-relaxed text-secondary sm:text-base">식사 속도와 대화 분위기에서 오늘의 나와 가까운 항목을 골라 주세요.</p></div>
          <fieldset class="mb-7 border-0 p-0">
            <legend class="mb-3 text-base font-extrabold text-brand-navy">식사 속도</legend>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">${PERSONALITY_OPTIONS.pace.map((item) => choiceCard('pace', item, pace, 'timer')).join('')}</div>
          </fieldset>
          <fieldset class="border-0 p-0">
            <legend class="mb-3 text-base font-extrabold text-brand-navy">대화 분위기</legend>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">${PERSONALITY_OPTIONS.conversation.map((item) => choiceCard('conversation', item, conversation, 'forum')).join('')}</div>
          </fieldset>
          <div class="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6"><button class="btn-secondary inline-flex min-h-11 items-center gap-1.5 rounded-xl px-4 text-sm font-bold" type="button" data-action="back" data-step="START"><span class="material-symbols-outlined text-base">arrow_back</span>이전</button><button class="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm font-extrabold shadow-glow-primary disabled:cursor-not-allowed disabled:opacity-50" type="submit" ${pace && conversation ? '' : 'disabled'}>다음 단계<span class="material-symbols-outlined text-base">arrow_forward</span></button></div>
        </form>
      </div>
    </section>
  `
}

function choiceCard(name, item, selected, icon) {
  const active = selected === item.value
  return `
    <label class="demo-choice-card group relative flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${active ? 'is-selected border-primary-container bg-primary-container/5 shadow-md' : 'border-slate-200 bg-white hover:border-primary-container/50 hover:bg-brand-ivory'}">
      <input class="sr-only" type="radio" name="${name}" value="${item.value}" ${active ? 'checked' : ''} />
      <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-primary-container text-white' : 'bg-surface-container-low text-secondary'}"><span class="material-symbols-outlined text-lg" aria-hidden="true">${icon}</span></span>
      <span><strong class="block text-sm font-extrabold text-brand-navy">${item.label}</strong><small class="mt-1 block text-xs leading-relaxed text-secondary">${item.description}</small></span>
      <span class="material-symbols-outlined absolute right-3 top-3 text-lg ${active ? 'text-primary-container' : 'text-slate-300'}" aria-hidden="true">check_circle</span>
    </label>
  `
}

function renderConditions() {
  const steps = [
    { key: 'time', label: '언제', title: '언제 만날까요?', description: '식사를 함께할 희망 시간을 선택해 주세요.', icon: 'schedule' },
    { key: 'region', label: '어디서', title: '어디에서 만날까요?', description: '함께 만나기 편한 약속 지역을 선택해 주세요.', icon: 'location_on', options: CONDITION_OPTIONS.regions },
    { key: 'food', label: '무엇을', title: '무엇을 먹을까요?', description: '함께 먹고 싶은 음식 카테고리를 골라 주세요.', icon: 'restaurant', options: CONDITION_OPTIONS.foods },
  ]
  const current = steps[conditionStep - 1]
  const progress = Math.round((conditionStep / steps.length) * 100)
  return `
    <section class="matching-page flex-grow px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="conditions-title">
      <div class="mx-auto w-full max-w-5xl">
        <header class="mb-6"><h1 id="conditions-title" class="font-headline text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">오늘의 밥친구를 찾아볼까요?</h1><p class="mt-2 max-w-2xl text-sm leading-6 text-secondary sm:text-base">몇 가지 조건을 차례로 알려주면, 서로 편안하게 마주 앉을 수 있는 상대를 찾아드려요.</p></header>
        <section class="matching-card matching-form-card mx-auto max-w-3xl rounded-[28px] bg-white p-5 sm:p-8" aria-labelledby="matching-step-title">
          <div class="mb-6 flex items-center gap-2"><span class="inline-flex items-center rounded-md bg-primary-container/15 px-2.5 py-1 text-xs font-extrabold tracking-wide text-primary">STEP ${conditionStep} / ${steps.length}</span><span class="hidden text-xs font-semibold text-secondary sm:inline">매칭 조건 설정</span></div>
          <div class="matching-stepper" aria-label="매칭 조건 진행 단계">${steps.map((step, index) => { const number = index + 1; const complete = number < conditionStep; return `<div class="matching-stepper-item ${number === conditionStep ? 'is-current' : ''} ${complete ? 'is-complete' : ''}" ${number === conditionStep ? 'aria-current="step"' : ''}><span class="matching-stepper-node">${complete ? '<span class="material-symbols-outlined text-sm">check</span>' : number}</span><span class="matching-stepper-label">${step.label}</span></div>` }).join('')}</div>
          <div class="matching-step-progress" role="progressbar" aria-label="매칭 조건 진행률" aria-valuemin="1" aria-valuemax="${steps.length}" aria-valuenow="${conditionStep}"><span style="width:${progress}%"></span></div>
          <div class="mb-7 mt-6 scroll-mt-28" aria-live="polite"><p class="text-xs font-extrabold tracking-[0.12em] text-primary-container">${current.label}</p><h2 id="matching-step-title" tabindex="-1" class="mt-1 font-headline text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">${current.title}</h2><p class="mt-2 text-sm leading-6 text-secondary">${current.description}</p></div>
          ${conditionStep > 1 ? `<div class="matching-selection-summary mb-6 flex flex-wrap gap-2" aria-label="앞서 선택한 조건">${demoSummaryChip('schedule', formatDateTime(state.conditions.time))}${conditionStep > 2 ? demoSummaryChip('location_on', state.conditions.region) : ''}</div>` : ''}
          <form data-form="conditions" class="space-y-7">
            ${conditionStep === 1 ? renderSchedulePicker() : `<section class="matching-food-picker rounded-3xl border border-outline-variant/40 bg-white p-4 sm:p-5">
              <div class="flex items-start gap-3"><span class="material-symbols-outlined rounded-full bg-primary-container/10 p-2 text-primary-container shadow-sm">${current.icon}</span><div><p class="text-xs font-semibold text-secondary">${current.label} 선택</p><h3 class="mt-1 text-base font-extrabold text-brand-navy">${current.title}</h3></div></div>
              <div class="matching-food-grid mt-5">${current.options.map((option) => conditionOption(current.key, option, state.conditions[current.key])).join('')}</div>
            </section>`}
            <div class="matching-form-actions mt-8 flex flex-col-reverse gap-3 border-t border-outline-variant/30 pt-6 sm:flex-row sm:items-center sm:justify-between">
              ${conditionStep > 1 ? '<button type="button" class="btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold" data-condition-prev><span class="material-symbols-outlined text-lg">arrow_back</span>이전</button>' : '<button type="button" class="btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold" data-action="back" data-step="PERSONALITY"><span class="material-symbols-outlined text-lg">arrow_back</span>성향 선택으로</button>'}
              ${conditionStep < steps.length ? `<button type="button" class="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-extrabold shadow-md disabled:cursor-not-allowed disabled:opacity-50" data-condition-next ${state.conditions[current.key] ? '' : 'disabled'}><span>다음 단계</span><span class="material-symbols-outlined text-lg">arrow_forward</span></button>` : `<button type="submit" class="btn-primary inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-sm font-extrabold shadow-glow-primary disabled:cursor-not-allowed disabled:opacity-50" ${Object.values(state.conditions).every(Boolean) ? '' : 'disabled'}><span class="material-symbols-outlined">local_dining</span><span>이 조건으로 매칭 시작하기</span></button>`}
            </div>
          </form>
        </section>
        <p class="mt-6 text-center text-xs leading-5 text-secondary">체험용 선택값이며 실제 사용자나 식당과 연결되지 않습니다.</p>
      </div>
    </section>
  `
}

function conditionOption(name, option, selected) {
  const active = selected === option
  const icons = {
    성수동: 'location_city', 연남동: 'map', 전포동: 'explore',
    한식: 'rice_bowl', 일식: 'ramen_dining', 중식: 'soup_kitchen', 양식: 'local_pizza',
    '동남아 음식': 'set_meal', 분식: 'bakery_dining', 패스트푸드: 'fastfood', '카페·디저트': 'local_cafe',
  }
  return `
    <button type="button" data-condition-name="${name}" data-condition-value="${option}" aria-pressed="${active}" class="matching-food-option ${active ? 'is-selected' : ''}"><span class="matching-food-option-icon material-symbols-outlined">${icons[option] || 'schedule'}</span><span class="matching-food-option-label">${option}</span><span class="matching-food-option-check material-symbols-outlined" aria-hidden="true">${active ? 'check_circle' : ''}</span></button>
  `
}

function demoSummaryChip(icon, value) {
  return `<span class="matching-summary-chip inline-flex min-w-0 items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-xs font-bold text-brand-navy"><span class="material-symbols-outlined text-sm text-primary-container">${icon}</span><span class="truncate">${value || '-'}</span></span>`
}

function renderWaitingSummaryItem(icon, label, value) {
  return `<div class="matching-waiting-summary-item flex min-w-0 items-center gap-3 px-4 py-3.5" role="listitem"><span class="matching-waiting-summary-icon material-symbols-outlined">${icon}</span><div class="min-w-0"><p class="text-[11px] font-bold text-secondary">${label}</p><p class="mt-1 truncate text-xs font-extrabold text-brand-navy">${value || '-'}</p></div></div>`
}

function renderSchedulePicker() {
  const { date, time } = splitDateTimeValue(state.conditions.time)
  return `
    <div class="matching-schedule-picker mt-3 rounded-3xl border border-outline-variant/40 bg-white p-4 sm:p-5">
      <div class="matching-schedule-fields mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)] lg:items-stretch lg:gap-6">
        <section class="matching-date-panel">
          <div><p class="text-sm font-extrabold text-brand-navy">식사 날짜</p><p class="mt-0.5 text-xs text-secondary">버튼을 눌러 만날 날짜를 선택해 보세요.</p></div>
          <button id="btn-open-schedule-date" type="button" class="matching-date-trigger mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-primary-container/30 bg-primary-container/8 px-4 py-3.5 text-left" aria-haspopup="dialog" aria-expanded="${scheduleModal === 'date'}">
            <span class="min-w-0"><span class="block text-[11px] font-extrabold tracking-wide text-secondary">선택한 날짜</span><span class="mt-1 block truncate text-lg font-extrabold text-brand-navy">${formatScheduleDate(date)}</span></span>
            <span class="matching-date-trigger-icon material-symbols-outlined shrink-0 rounded-full bg-white p-2 text-primary-container shadow-sm">chevron_right</span>
          </button>
          ${scheduleModal === 'date' ? renderScheduleDateModal(date) : ''}
        </section>
        <div class="matching-schedule-divider" aria-hidden="true"></div>
        <section class="matching-time-panel">
          <div><p class="text-sm font-extrabold text-brand-navy">식사 시간</p><p class="mt-0.5 text-xs text-secondary">버튼을 눌러 가능한 시간을 확인해 보세요.</p></div>
          <button id="btn-open-schedule-time" type="button" class="matching-time-trigger mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-primary-container/30 bg-primary-container/8 px-4 py-3.5 text-left" aria-haspopup="dialog" aria-expanded="${scheduleModal === 'time'}">
            <span class="min-w-0"><span class="block text-[11px] font-extrabold tracking-wide text-secondary">선택한 시간</span><span class="mt-1 block truncate text-lg font-extrabold text-brand-navy">${formatTimeLabel(time)}</span></span>
            <span class="matching-time-trigger-icon material-symbols-outlined shrink-0 rounded-full bg-white p-2 text-primary-container shadow-sm">chevron_right</span>
          </button>
          ${scheduleModal === 'time' ? renderScheduleTimeModal(date, time) : ''}
        </section>
      </div>
    </div>`
}

function renderScheduleDateModal(selectedDate) {
  const draftDate = scheduleDraftDate || selectedDate
  const calendarMonth = normalizeMonthValue(scheduleCalendarMonth, draftDate)
  const currentMonth = getMonthValue(new Date())
  const maximumMonth = getMonthValueFromDateTime(`${getMaximumDateValue()}T00:00`)
  return `
    <div id="matching-schedule-date-modal" class="matching-time-modal" role="dialog" aria-modal="true" aria-labelledby="matching-schedule-date-title">
      <button id="matching-schedule-date-backdrop" type="button" class="matching-time-modal-backdrop" tabindex="-1" aria-label="날짜 선택 닫기"></button>
      <div class="matching-time-modal-panel matching-date-modal-panel">
        <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-extrabold tracking-wide text-primary-container">날짜 선택</p><h4 id="matching-schedule-date-title" class="mt-1 font-headline text-xl font-extrabold text-brand-navy">식사 날짜를 골라 주세요</h4><p class="mt-1 text-sm leading-6 text-secondary">오늘부터 일주일 안에서 만날 날짜를 선택해 주세요.</p></div><button id="matching-schedule-date-close" type="button" class="matching-time-modal-close" aria-label="날짜 선택 닫기"><span class="material-symbols-outlined text-lg">close</span></button></div>
        <div class="matching-calendar mt-5 rounded-2xl border border-outline-variant/35 bg-white p-3.5 sm:p-4" aria-label="희망 식사 날짜 선택">
          <div class="flex items-center justify-between gap-3"><button id="matching-calendar-prev" type="button" ${calendarMonth <= currentMonth ? 'disabled' : ''} class="matching-calendar-nav" aria-label="이전 달"><span class="material-symbols-outlined text-lg">chevron_left</span></button><p class="text-sm font-extrabold text-brand-navy">${formatCalendarMonth(calendarMonth)}</p><button id="matching-calendar-next" type="button" ${calendarMonth >= maximumMonth ? 'disabled' : ''} class="matching-calendar-nav" aria-label="다음 달"><span class="material-symbols-outlined text-lg">chevron_right</span></button></div>
          <div class="matching-calendar-weekdays mt-4" aria-hidden="true">${['일', '월', '화', '수', '목', '금', '토'].map((day) => `<span>${day}</span>`).join('')}</div>
          <div class="matching-calendar-grid mt-2">${buildCalendarCells(calendarMonth, draftDate).map((cell) => `<button type="button" data-schedule-date="${cell.dateValue}" class="matching-calendar-day ${cell.isOutside ? 'is-outside' : ''} ${cell.isToday ? 'is-today' : ''} ${cell.isSelected ? 'is-selected' : ''}" ${cell.isDisabled ? 'disabled' : ''} aria-pressed="${cell.isSelected}" aria-label="${cell.ariaLabel}">${cell.day}</button>`).join('')}</div>
        </div>
        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button id="matching-schedule-date-cancel" type="button" class="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold">취소</button><button id="matching-schedule-date-confirm" type="button" class="btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-extrabold shadow-md" ${isDateSelectable(draftDate) ? '' : 'disabled'}><span class="material-symbols-outlined text-lg">check</span>이 날짜로 선택</button></div>
      </div>
    </div>`
}

function renderScheduleTimeModal(selectedDate, selectedTime) {
  const draftTime = scheduleDraftTime || selectedTime
  return `
    <div id="matching-schedule-time-modal" class="matching-time-modal" role="dialog" aria-modal="true" aria-labelledby="matching-schedule-time-title">
      <button id="matching-schedule-time-backdrop" type="button" class="matching-time-modal-backdrop" tabindex="-1" aria-label="시간 선택 닫기"></button>
      <div class="matching-time-modal-panel">
        <div class="flex items-start justify-between gap-4"><div><p class="text-xs font-extrabold tracking-wide text-primary-container">${formatScheduleDate(selectedDate)}</p><h4 id="matching-schedule-time-title" class="mt-1 font-headline text-xl font-extrabold text-brand-navy">식사 시간을 골라 주세요</h4><p class="mt-1 text-sm leading-6 text-secondary">밥친구와 만나기 편한 시간을 선택해 주세요.</p></div><button id="matching-schedule-time-close" type="button" class="matching-time-modal-close" aria-label="시간 선택 닫기"><span class="material-symbols-outlined text-lg">close</span></button></div>
        <div class="matching-time-modal-grid mt-5">${buildTimeSlots().map((timeValue) => { const available = isTimeAvailable(selectedDate, timeValue); return `<button type="button" data-schedule-time="${timeValue}" class="matching-time-slot ${draftTime === timeValue && available ? 'is-selected' : ''}" ${available ? '' : 'disabled'} aria-pressed="${draftTime === timeValue && available}">${formatTimeLabel(timeValue)}</button>` }).join('')}</div>
        <div class="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button id="matching-schedule-time-cancel" type="button" class="btn-secondary inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-bold">취소</button><button id="matching-schedule-time-confirm" type="button" class="btn-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-extrabold shadow-md" ${isTimeAvailable(selectedDate, draftTime) ? '' : 'disabled'}><span class="material-symbols-outlined text-lg">check</span>이 시간으로 선택</button></div>
      </div>
    </div>`
}

function splitDateTimeValue(value) {
  const [date = '', time = ''] = String(value || '').split('T')
  return { date, time: time.slice(0, 5) }
}

function parseDateValue(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

function parseMonthValue(value) {
  if (!/^\d{4}-\d{2}$/.test(String(value || ''))) return null
  const [year, month] = value.split('-').map(Number)
  return month >= 1 && month <= 12 ? new Date(year, month - 1, 1) : null
}

function toDateValue(date) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function getMonthValue(date) {
  return toDateValue(date).slice(0, 7)
}

function getMonthValueFromDateTime(value) {
  return getMonthValue(parseDateValue(splitDateTimeValue(value).date) || new Date())
}

function normalizeMonthValue(value, fallbackDateValue) {
  const current = parseMonthValue(getMonthValue(new Date()))
  const maximum = parseMonthValue(getMonthValueFromDateTime(`${getMaximumDateValue()}T00:00`))
  const candidate = parseMonthValue(value) || parseMonthValue(getMonthValueFromDateTime(`${fallbackDateValue || ''}T00:00`)) || current
  if (candidate < current) return getMonthValue(current)
  if (candidate > maximum) return getMonthValue(maximum)
  return getMonthValue(candidate)
}

function shiftMonthValue(value, amount) {
  const month = parseMonthValue(value) || new Date()
  month.setMonth(month.getMonth() + amount, 1)
  return getMonthValue(month)
}

function getMaximumDateValue() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 7)
  return toDateValue(date)
}

function isDateSelectable(value) {
  const date = parseDateValue(value)
  const today = parseDateValue(toDateValue(new Date()))
  const maximum = parseDateValue(getMaximumDateValue())
  return Boolean(date) && date >= today && date <= maximum
}

function buildCalendarCells(monthValue, selectedDate) {
  const month = parseMonthValue(monthValue) || new Date()
  const firstCell = new Date(month.getFullYear(), month.getMonth(), 1 - new Date(month.getFullYear(), month.getMonth(), 1).getDay())
  const today = toDateValue(new Date())
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell)
    date.setDate(firstCell.getDate() + index)
    const dateValue = toDateValue(date)
    const outside = date.getMonth() !== month.getMonth()
    return { dateValue, day: date.getDate(), isOutside: outside, isToday: dateValue === today, isSelected: dateValue === selectedDate, isDisabled: outside || !isDateSelectable(dateValue), ariaLabel: formatScheduleDate(dateValue) }
  })
}

function buildTimeSlots() {
  return Array.from({ length: 24 }, (_, index) => {
    const minutes = 10 * 60 + index * 30
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  })
}

function isTimeAvailable(dateValue, timeValue) {
  const date = parseDateValue(dateValue)
  if (!date || !/^\d{2}:\d{2}$/.test(timeValue || '')) return false
  const [hour, minute] = timeValue.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute).getTime() > Date.now()
}

function getDefaultTimeForDate(dateValue) {
  if (dateValue !== toDateValue(new Date())) return '12:00'
  const date = new Date(Date.now() + 10 * 60 * 1000)
  date.setSeconds(0, 0)
  date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30)
  return toDateValue(date) === dateValue ? `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}` : '12:00'
}

function getDefaultDateTimeValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000)
  date.setMinutes(Math.ceil(date.getMinutes() / 30) * 30, 0, 0)
  return `${toDateValue(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function formatScheduleDate(value) {
  return parseDateValue(value)?.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }) || '날짜를 선택해 주세요'
}

function formatCalendarMonth(value) {
  return parseMonthValue(value)?.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }) || ''
}

function formatTimeLabel(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return '시간을 선택해 주세요'
  const [hour, minute] = value.split(':').map(Number)
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

function formatDateTime(value) {
  const { date, time } = splitDateTimeValue(value)
  return `${formatScheduleDate(date)} ${formatTimeLabel(time)}`
}

function renderSearching() {
  searchTimer = window.setTimeout(() => {
    if (state.step === 'SEARCHING') setStep('PROPOSAL')
  }, 1400)
  return `
    <section class="matching-page px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="searching-title">
      <div class="mx-auto w-full max-w-5xl">
        <header class="mb-6"><h1 class="font-headline text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">오늘의 밥친구를 찾아볼까요?</h1><p class="mt-2 text-sm leading-6 text-secondary sm:text-base">선택한 조건을 바탕으로 체험용 추천을 준비하고 있어요.</p></header>
        <section class="matching-card matching-waiting-card rounded-[28px] bg-white px-5 py-8 text-center sm:px-10 sm:py-12" aria-live="polite">
          <div class="matching-waiting-scene mx-auto" aria-hidden="true"><div class="matching-waiting-person is-left"><span class="material-symbols-outlined">person</span></div><div class="matching-waiting-path is-left"><i></i><i></i><i></i></div><div class="matching-waiting-table"><span class="material-symbols-outlined">restaurant</span></div><div class="matching-waiting-path is-right"><i></i><i></i><i></i></div><div class="matching-waiting-person is-right"><span class="material-symbols-outlined">person</span></div></div>
          <h1 id="searching-title" tabindex="-1" class="mt-7 font-headline text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">조건이 잘 맞는 밥친구를 찾고 있어요</h1>
          <p class="mx-auto mt-3 max-w-lg text-sm leading-6 text-secondary">실제 매칭 대신 선택한 음식에 맞는 고정 프로필을 불러옵니다.</p>
          <div class="matching-waiting-summary mx-auto mt-8 grid max-w-2xl text-left sm:grid-cols-3" role="list" aria-label="선택한 매칭 조건">${renderWaitingSummaryItem('location_on', '약속 위치', state.conditions.region)}${renderWaitingSummaryItem('schedule', '식사 일시', formatDateTime(state.conditions.time))}${renderWaitingSummaryItem('restaurant', '음식', state.conditions.food)}</div>
          <div class="mx-auto mt-8 max-w-xl"><div class="matching-search-flow" role="progressbar" aria-label="체험용 매칭 상대 탐색 중"><span></span><span></span><span></span><span></span><span></span></div><p class="mt-3 text-sm font-bold text-brand-navy">체험용 상대를 살펴보고 있어요</p><p class="mt-1 text-xs font-semibold text-secondary">약 1초 후 제안이 도착합니다.</p></div>
        </section>
      </div>
    </section>
  `
}

function renderProposal() {
  const scenario = scenarioFor(state.conditions.food, state.conditions.region)
  const { profile } = scenario
  return `
    <section class="matching-page px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="proposal-title">
      <div class="mx-auto w-full max-w-5xl">
        <header class="mb-6"><h1 class="font-headline text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">오늘의 밥친구를 찾아볼까요?</h1><p class="mt-2 text-sm leading-6 text-secondary sm:text-base">실제 서비스와 같은 제안 카드에서 가상 프로필을 확인해 보세요.</p></header>
        <section class="matching-card rounded-[28px] bg-white p-5 sm:p-8" aria-live="polite">
          <div class="flex flex-col gap-3 border-b border-outline-variant/30 pb-5 sm:flex-row sm:items-center sm:justify-between"><div><span class="rounded-full bg-primary-container/10 px-3 py-1.5 text-xs font-extrabold text-primary">체험용 제안</span><h1 id="proposal-title" tabindex="-1" class="mt-3 font-headline text-2xl font-extrabold tracking-tight text-brand-navy">밥친구를 찾았어요</h1><p class="mt-1 text-sm text-secondary">가상 상대의 공개 프로필과 매칭 이유를 확인해 주세요.</p></div><div class="rounded-2xl bg-primary-container/10 px-4 py-3 text-left sm:text-right"><p class="text-xs font-bold text-secondary">남은 응답 시간</p><p class="mt-1 font-headline text-xl font-extrabold text-primary">체험 모드</p></div></div>
          <div class="mt-6 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div class="flex flex-col items-center justify-center rounded-3xl bg-surface-container-low px-5 py-7 text-center"><div class="matching-avatar flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-primary-container text-3xl font-extrabold text-white shadow-floating">${profile.initial}</div><h2 class="mt-4 font-headline text-xl font-extrabold text-brand-navy">${profile.name}</h2><p class="mt-2 text-xs text-secondary">체험용 가상 프로필</p><div class="mt-5 flex flex-wrap justify-center gap-2">${profile.tags.map((tag) => `<span class="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-navy shadow-sm">#${tag}</span>`).join('')}</div></div>
            <div class="flex flex-col justify-center"><div class="flex items-center justify-between gap-3 rounded-2xl border border-outline-variant/50 bg-white px-4 py-4 shadow-sm"><div><p class="text-xs font-bold text-secondary">이번 매칭 호환도</p><p class="mt-1 text-sm font-semibold text-brand-navy">서로의 식사 성향과 조건을 비교했어요</p></div><div class="font-headline text-3xl font-extrabold text-primary">96%</div></div><p class="mt-5 text-sm leading-6 text-secondary">${profile.description}</p><div class="mt-5 rounded-2xl bg-surface-container-low p-4"><p class="text-xs font-extrabold tracking-wide text-secondary">잘 맞는 이유</p><ul class="mt-2 space-y-2 text-sm leading-5 text-brand-navy">${scenario.reasons.map((reason) => `<li class="flex items-start gap-2"><span class="material-symbols-outlined mt-0.5 text-base text-success">check_circle</span><span>${reason}</span></li>`).join('')}</ul></div><div class="mt-6 grid gap-3 sm:grid-cols-2"><button class="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-extrabold shadow-md" type="button" data-action="accept"><span class="material-symbols-outlined">check</span>수락하기</button><button class="btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-full text-sm font-extrabold" type="button" data-action="reset"><span class="material-symbols-outlined">close</span>거절하기</button></div></div>
          </div>
        </section>
      </div>
    </section>
  `
}

function renderChat() {
  const scenario = scenarioFor(state.conditions.food, state.conditions.region)
  return `
    <section class="chat-page" aria-labelledby="chat-title">
      <div class="chat-layout demo-chat-layout">
        <section class="chat-shell">
          <header class="chat-header"><button class="chat-icon-button" type="button" data-action="back" data-step="PROPOSAL" aria-label="제안 화면으로 돌아가기"><span class="material-symbols-outlined">arrow_back</span></button><div class="chat-partner"><div class="demo-chat-avatar">${scenario.profile.initial}</div><div class="chat-partner-copy"><h1 id="chat-title" tabindex="-1">${scenario.profile.name}님과의 대화</h1><p>체험용 가상 프로필</p></div></div><span class="rounded-full bg-success/15 px-3 py-1.5 text-xs font-extrabold text-brand-navy">매칭 완료</span></header>
          <div class="chat-messages" role="log" aria-live="polite" aria-label="미리 준비된 채팅 메시지"><div class="chat-system-message"><span class="material-symbols-outlined">waving_hand</span><span>따뜻한 인사로 대화를 시작해 보세요.</span></div>${CHAT_MESSAGES.map((message) => `<div class="chat-message-row ${message.from === 'me' ? 'is-mine' : 'is-partner'}">${message.from === 'me' ? `<time class="chat-message-time">${message.time}</time><div class="chat-message-bubble">${message.text}</div>` : `<div class="chat-message-avatar">${scenario.profile.initial}</div><div class="chat-message-content"><span class="chat-message-nickname">${scenario.profile.name}</span><div class="chat-message-line"><div class="chat-message-bubble">${message.text}</div><time class="chat-message-time">${message.time}</time></div></div>`}</div>`).join('')}</div>
          <div class="demo-chat-note"><span class="material-symbols-outlined" aria-hidden="true">lock</span><span><strong>대화 미리보기</strong> 체험판에서는 준비된 메시지만 표시됩니다.</span></div>
        </section>
        <aside class="chat-map-panel demo-meeting-panel" aria-labelledby="chat-map-title"><header class="chat-map-header"><div><h2 id="chat-map-title">약속 정보</h2><p>선택한 조건과 추천 장소를 확인해 주세요.</p></div><span class="chat-map-header-icon material-symbols-outlined">event_available</span></header><div class="demo-meeting-summary"><div><span class="material-symbols-outlined">calendar_month</span><p>식사 일시<strong>${formatDateTime(state.conditions.time)}</strong></p></div><div><span class="material-symbols-outlined">location_on</span><p>약속 지역<strong>${state.conditions.region}</strong></p></div><div><span class="material-symbols-outlined">restaurant</span><p>음식<strong>${state.conditions.food}</strong></p></div></div><div class="demo-place-preview"><span class="material-symbols-outlined">restaurant</span><div><small>조건에 맞춘 추천 장소</small><strong>${scenario.place.name}</strong><p>${scenario.place.detail}</p><span>${scenario.place.description}</span></div></div><p class="chat-map-notice"><span class="material-symbols-outlined">info</span>실제 예약이나 사용자 위치를 사용하지 않는 체험용 장소입니다.</p><div class="px-5 pb-5"><button class="btn-primary flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-sm font-extrabold shadow-md" type="button" data-action="complete"><span class="material-symbols-outlined">check_circle</span>이 장소로 약속 확정하기</button></div></aside>
      </div>
    </section>
  `
}

function renderComplete() {
  const scenario = scenarioFor(state.conditions.food, state.conditions.region)
  const place = scenario.place
  return `
    <section class="matching-page px-4 py-8 sm:px-6 lg:px-8" aria-labelledby="complete-title">
      <div class="mx-auto w-full max-w-4xl"><section class="matching-card rounded-[28px] bg-white p-6 sm:p-9"><div class="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center"><div class="text-center lg:text-left"><div class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/15 text-success lg:mx-0"><span class="material-symbols-outlined text-4xl">celebration</span></div><span class="mt-5 inline-flex rounded-full bg-success/15 px-3 py-1.5 text-xs font-extrabold text-brand-navy">약속 확정</span><h1 id="complete-title" tabindex="-1" class="mt-3 font-headline text-3xl font-extrabold tracking-tight text-brand-navy">따뜻한 한 끼가 준비됐어요</h1><p class="mt-3 text-sm leading-6 text-secondary">${scenario.profile.name}님과 만날 시간과 장소를 한 번 더 확인해 주세요.</p></div><div class="rounded-3xl border border-outline-variant/40 bg-surface-container-low p-5 sm:p-6"><div class="grid gap-4 sm:grid-cols-2"><div><p class="text-xs font-bold text-secondary">밥친구</p><p class="mt-1 font-extrabold text-brand-navy">${scenario.profile.name}님</p></div><div><p class="text-xs font-bold text-secondary">식사 일시</p><p class="mt-1 font-extrabold text-brand-navy">${formatDateTime(state.conditions.time)}</p></div><div><p class="text-xs font-bold text-secondary">지역</p><p class="mt-1 font-extrabold text-brand-navy">${state.conditions.region}</p></div><div><p class="text-xs font-bold text-secondary">음식</p><p class="mt-1 font-extrabold text-brand-navy">${state.conditions.food}</p></div></div><article class="mt-5 flex items-center gap-4 border-t border-outline-variant/40 pt-5"><span class="material-symbols-outlined grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-container text-xl text-white">restaurant</span><div><span class="text-xs font-extrabold text-primary">확정한 장소</span><h2 class="mt-1 font-headline text-lg font-extrabold text-brand-navy">${place.name}</h2><p class="mt-1 text-xs font-semibold text-secondary">${place.detail}</p></div></article></div></div><div class="mt-8 flex flex-col-reverse gap-3 border-t border-outline-variant/30 pt-6 sm:flex-row sm:justify-end"><button class="btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-bold" type="button" data-action="back" data-step="CHAT"><span class="material-symbols-outlined">chat</span>채팅으로 돌아가기</button><button class="btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-extrabold shadow-glow-primary" type="button" data-action="reset"><span class="material-symbols-outlined">restart_alt</span>처음부터 다시 체험하기</button></div></section></div>
    </section>
  `
}

function bindCommonActions() {
  app.querySelectorAll('[data-action="reset"]').forEach((button) => button.addEventListener('click', resetDemo))
  app.querySelectorAll('[data-action="start"]').forEach((button) => button.addEventListener('click', () => setStep('PERSONALITY')))
  app.querySelectorAll('[data-action="accept"]').forEach((button) => button.addEventListener('click', () => setStep('CHAT')))
  app.querySelectorAll('[data-action="complete"]').forEach((button) => button.addEventListener('click', () => setStep('COMPLETE')))
  app.querySelectorAll('[data-action="back"]').forEach((button) => button.addEventListener('click', () => setStep(button.dataset.step)))
  app.querySelectorAll('[data-condition-name]').forEach((button) => button.addEventListener('click', () => {
    state.conditions[button.dataset.conditionName] = button.dataset.conditionValue
    saveState()
    render()
  }))
  app.querySelector('#btn-open-schedule-date')?.addEventListener('click', () => {
    scheduleDraftDate = splitDateTimeValue(state.conditions.time).date
    scheduleCalendarMonth = getMonthValueFromDateTime(state.conditions.time)
    scheduleModal = 'date'
    render()
  })
  app.querySelector('#btn-open-schedule-time')?.addEventListener('click', () => {
    scheduleDraftTime = splitDateTimeValue(state.conditions.time).time
    scheduleModal = 'time'
    render()
  })
  app.querySelectorAll('[data-schedule-date]').forEach((button) => button.addEventListener('click', () => {
    if (!isDateSelectable(button.dataset.scheduleDate)) return
    scheduleDraftDate = button.dataset.scheduleDate
    scheduleCalendarMonth = getMonthValueFromDateTime(`${scheduleDraftDate}T00:00`)
    render()
  }))
  app.querySelectorAll('[data-schedule-time]').forEach((button) => button.addEventListener('click', () => {
    const date = splitDateTimeValue(state.conditions.time).date
    if (!isTimeAvailable(date, button.dataset.scheduleTime)) return
    scheduleDraftTime = button.dataset.scheduleTime
    render()
  }))
  app.querySelector('#matching-calendar-prev')?.addEventListener('click', () => {
    scheduleCalendarMonth = shiftMonthValue(scheduleCalendarMonth, -1)
    render()
  })
  app.querySelector('#matching-calendar-next')?.addEventListener('click', () => {
    scheduleCalendarMonth = shiftMonthValue(scheduleCalendarMonth, 1)
    render()
  })
  app.querySelector('#matching-schedule-date-confirm')?.addEventListener('click', () => {
    if (!isDateSelectable(scheduleDraftDate)) return
    const currentTime = splitDateTimeValue(state.conditions.time).time
    state.conditions.time = `${scheduleDraftDate}T${isTimeAvailable(scheduleDraftDate, currentTime) ? currentTime : getDefaultTimeForDate(scheduleDraftDate)}`
    scheduleModal = ''
    saveState()
    render()
  })
  app.querySelector('#matching-schedule-time-confirm')?.addEventListener('click', () => {
    const date = splitDateTimeValue(state.conditions.time).date
    if (!isTimeAvailable(date, scheduleDraftTime)) return
    state.conditions.time = `${date}T${scheduleDraftTime}`
    scheduleModal = ''
    saveState()
    render()
  })
  ;['#matching-schedule-date-close', '#matching-schedule-date-cancel', '#matching-schedule-date-backdrop', '#matching-schedule-time-close', '#matching-schedule-time-cancel', '#matching-schedule-time-backdrop'].forEach((selector) => {
    app.querySelector(selector)?.addEventListener('click', () => {
      scheduleModal = ''
      render()
    })
  })
  app.querySelector('.matching-time-modal')?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      scheduleModal = ''
      render()
    }
  })
  app.querySelector('[data-condition-next]')?.addEventListener('click', () => {
    conditionStep += 1
    render()
  })
  app.querySelector('[data-condition-prev]')?.addEventListener('click', () => {
    conditionStep -= 1
    render()
  })

  app.querySelector('[data-form="personality"]')?.addEventListener('change', (event) => {
    if (event.target.name === 'pace' || event.target.name === 'conversation') state.personality[event.target.name] = event.target.value
    saveState()
    updatePersonalityForm()
  })
  app.querySelector('[data-form="personality"]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    if (state.personality.pace && state.personality.conversation) setStep('CONDITIONS')
  })
  app.querySelector('[data-form="conditions"]')?.addEventListener('submit', (event) => {
    event.preventDefault()
    if (Object.values(state.conditions).every(Boolean)) setStep('SEARCHING')
  })
}

function updatePersonalityForm() {
  const form = app.querySelector('[data-form="personality"]')
  if (!form) return
  form.querySelectorAll('.demo-choice-card').forEach((card) => {
    card.classList.toggle('is-selected', card.querySelector('input')?.checked === true)
  })
  const ready = state.personality.pace && state.personality.conversation
  const submit = form.querySelector('button[type="submit"]')
  if (submit) submit.disabled = !ready
}

function recover() {
  if (recovering) return
  recovering = true
  clearTimeout(searchTimer)
  try {
    sessionStorage.removeItem(DEMO_STORAGE_KEY)
  } catch {
    // 복구 단계에서는 저장소 오류를 무시한다.
  }
  state = initialState()
  conditionStep = 1
  scheduleModal = ''
  scheduleDraftDate = ''
  scheduleDraftTime = ''
  try {
    history.replaceState(null, '', '#start')
    render()
  } catch {
    app.textContent = '데모를 다시 시작하려면 페이지를 새로고침해 주세요.'
  } finally {
    recovering = false
  }
}

window.addEventListener('hashchange', syncFromHash)
window.addEventListener('error', recover)
window.addEventListener('unhandledrejection', recover)

const initialHash = hashStep()
const hashIsUnstarted = initialHash && STEPS.indexOf(initialHash) > 0 && !restoredFromStorage
const hashDoesNotMatchSavedStep = initialHash && restoredFromStorage && initialHash !== state.step
if (location.hash && (!initialHash || hashIsUnstarted || hashDoesNotMatchSavedStep)) resetDemo()
else {
  if (initialHash) state.step = initialHash
  saveState()
  history.replaceState(null, '', `#${state.step.toLowerCase()}`)
  render()
}
