const STORAGE_KEY = 'tarantulapp.ratePrompt.v1'

const MIN_LAUNCHES_BEFORE_PROMPT = 6
const MIN_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000
const PROMPT_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000
const MAX_PROMPTS = 3

function nowMs() {
  return Date.now()
}

function defaultState(ts = nowMs()) {
  return {
    firstSeenAt: ts,
    lastSeenAt: ts,
    launchCount: 0,
    promptCount: 0,
    lastPromptAt: null,
    rated: false,
    disabled: false,
  }
}

export function readRatePromptState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return defaultState()
    return {
      ...defaultState(),
      ...parsed,
    }
  } catch (_) {
    return defaultState()
  }
}

function saveRatePromptState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function registerRatePromptAppOpen() {
  const ts = nowMs()
  const state = readRatePromptState()
  const next = {
    ...state,
    firstSeenAt: Number.isFinite(state.firstSeenAt) ? state.firstSeenAt : ts,
    lastSeenAt: ts,
    launchCount: (Number.isFinite(state.launchCount) ? state.launchCount : 0) + 1,
  }
  saveRatePromptState(next)
  return next
}

export function shouldShowRatePrompt(state) {
  if (!state || state.disabled || state.rated) return false
  if ((state.launchCount || 0) < MIN_LAUNCHES_BEFORE_PROMPT) return false
  if (!state.firstSeenAt || nowMs() - state.firstSeenAt < MIN_ACCOUNT_AGE_MS) return false
  if ((state.promptCount || 0) >= MAX_PROMPTS) return false
  if (!state.lastPromptAt) return true
  return nowMs() - state.lastPromptAt >= PROMPT_COOLDOWN_MS
}

export function markRatePromptShown() {
  const ts = nowMs()
  const state = readRatePromptState()
  const next = {
    ...state,
    promptCount: (state.promptCount || 0) + 1,
    lastPromptAt: ts,
  }
  saveRatePromptState(next)
  return next
}

export function markRatePromptRated() {
  const state = readRatePromptState()
  const next = {
    ...state,
    rated: true,
  }
  saveRatePromptState(next)
  return next
}

export function markRatePromptDisabled() {
  const state = readRatePromptState()
  const next = {
    ...state,
    disabled: true,
  }
  saveRatePromptState(next)
  return next
}
