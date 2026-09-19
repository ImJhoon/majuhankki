import assert from 'node:assert/strict'
import test from 'node:test'
import { isValidDemoState, scenarioFor } from './scenario.js'

const completeState = {
  step: 'COMPLETE',
  personality: { pace: 'balanced', conversation: 'warm' },
  conditions: { region: '성수동', food: '한식', time: '2026-09-19T18:30' },
}

test('완료 단계는 모든 선택값이 유효해야 한다', () => {
  assert.equal(isValidDemoState(completeState), true)
  assert.equal(isValidDemoState({ ...completeState, conditions: { ...completeState.conditions, food: '' } }), false)
})

test('같은 음식은 같은 고정 시나리오를 반환한다', () => {
  assert.deepEqual(scenarioFor('한식'), scenarioFor('한식'))
})

test('추천 장소는 선택한 지역과 음식에 맞는다', () => {
  const scenario = scenarioFor('패스트푸드', '연남동')
  assert.equal(scenario.place.name, '버거 스테이션')
  assert.match(scenario.place.detail, /연남동 · 패스트푸드/)
})
