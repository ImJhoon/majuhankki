export const DEMO_STORAGE_KEY = 'majuhankki.demo.v1'

export const STEPS = Object.freeze([
  'START',
  'PERSONALITY',
  'CONDITIONS',
  'SEARCHING',
  'PROPOSAL',
  'CHAT',
  'COMPLETE',
])

export const PERSONALITY_OPTIONS = Object.freeze({
  pace: [
    { value: 'slow', label: '천천히', description: '여유 있게 식사를 즐겨요' },
    { value: 'balanced', label: '적당히', description: '편안한 속도로 먹어요' },
    { value: 'quick', label: '빠르게', description: '식사 시간을 알차게 써요' },
  ],
  conversation: [
    { value: 'warm', label: '도란도란', description: '서로의 이야기를 듣고 싶어요' },
    { value: 'light', label: '가볍게', description: '가벼운 이야기부터 시작해요' },
    { value: 'quiet', label: '조용하게', description: '말없이 편안한 시간도 좋아요' },
  ],
})

export const CONDITION_OPTIONS = Object.freeze({
  regions: ['성수동', '연남동', '전포동'],
  foods: ['한식', '일식', '중식', '양식', '동남아 음식', '분식', '패스트푸드', '카페·디저트'],
})

export const SCENARIOS = Object.freeze({
  한식: {
    profile: {
      name: '온유',
      initial: '온',
      description: '편안한 대화와 천천히 즐기는 식사를 좋아하는 가상 프로필이에요.',
      tags: ['편안한 대화', '메뉴 탐색', '여유로운 식사'],
    },
    reasons: ['같은 음식 취향을 공유해요', '식사 속도가 잘 맞아요', '편안한 대화를 선호해요'],
  },
  면요리: {
    profile: {
      name: '다온',
      initial: '다',
      description: '새로운 메뉴를 찾아보고 가벼운 이야기를 나누는 가상 프로필이에요.',
      tags: ['가벼운 대화', '메뉴 탐험', '적당한 식사'],
    },
    reasons: ['같은 음식 취향을 공유해요', '대화 분위기가 잘 맞아요', '오늘 저녁 시간이 맞아요'],
  },
  채식: {
    profile: {
      name: '해봄',
      initial: '해',
      description: '새로운 맛을 발견하고 조용한 식사를 즐기는 가상 프로필이에요.',
      tags: ['조용한 식사', '취향 발견', '천천히 알아가기'],
    },
    reasons: ['같은 음식 취향을 공유해요', '식사 속도가 잘 맞아요', '차분한 만남을 선호해요'],
  },
})

const SCENARIO_BY_FOOD = Object.freeze({
  한식: '한식', 일식: '면요리', 중식: '면요리', 양식: '한식',
  '동남아 음식': '면요리', 분식: '한식', 패스트푸드: '한식', '카페·디저트': '채식',
})

const PLACE_BY_FOOD = Object.freeze({
  한식: ['소담 밥상', '따뜻한 반찬과 국 메뉴가 있는 조용한 식당', 6],
  일식: ['하루 식탁', '정갈한 한 상과 면 요리를 즐길 수 있는 식당', 4],
  중식: ['홍등 키친', '여럿이 나눠 먹기 좋은 중식당', 5],
  양식: ['오브제 키친', '파스타와 화덕 메뉴를 선보이는 작은 식당', 7],
  '동남아 음식': ['사이공 테이블', '향긋한 면과 라이스 메뉴가 있는 식당', 5],
  분식: ['모락 분식', '따뜻한 분식 메뉴를 편하게 즐기는 식당', 3],
  패스트푸드: ['버거 스테이션', '버거와 사이드 메뉴를 함께 고르는 캐주얼 매장', 4],
  '카페·디저트': ['오후의 정원', '커피와 디저트를 천천히 즐기는 카페', 5],
})

export const CHAT_MESSAGES = Object.freeze([
  { from: 'match', text: '안녕하세요! 오늘 어떤 메뉴가 가장 기대되세요?', time: '18:12' },
  { from: 'me', text: '따뜻한 한 끼와 편안한 대화를 기대하고 있어요 :)', time: '18:13' },
  { from: 'match', text: '좋아요. 약속 장소에서 천천히 만나요!', time: '18:14' },
])

export function scenarioFor(food, region = '성수동') {
  const scenario = SCENARIOS[SCENARIO_BY_FOOD[food]] || SCENARIOS['한식']
  const [name, description, walk] = PLACE_BY_FOOD[food] || PLACE_BY_FOOD['한식']
  return { ...scenario, place: { name, description, detail: `${region} · ${food || '한식'} · 도보 ${walk}분` } }
}

export function isValidDemoState(state) {
  if (!state || !STEPS.includes(state.step)) return false

  const step = STEPS.indexOf(state.step)
  if (step >= STEPS.indexOf('CONDITIONS')) {
    if (!PERSONALITY_OPTIONS.pace.some(({ value }) => value === state.personality?.pace)) return false
    if (!PERSONALITY_OPTIONS.conversation.some(({ value }) => value === state.personality?.conversation)) return false
  }
  if (step >= STEPS.indexOf('SEARCHING')) {
    return CONDITION_OPTIONS.regions.includes(state.conditions?.region)
      && CONDITION_OPTIONS.foods.includes(state.conditions?.food)
      && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(state.conditions?.time || '')
  }
  return true
}
