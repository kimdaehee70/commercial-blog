// lib/storage.js
// localStorage 공통 유틸 — debounce 자동저장 + 안전 getter/setter
// SSR(서버사이드) 안전 / try-catch 처리 / 용량 초과 시 silent fail

import { useEffect, useRef, useState } from "react";

const isBrowser = typeof window !== "undefined";

// ─────────────────────────────────────────────────────
// 1) 기본 getter / setter — 직접 호출용
// ─────────────────────────────────────────────────────
export function storageGet(key, fallback = null) {
  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

export function storageSet(key, value) {
  if (!isBrowser) return false;
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    // QuotaExceededError 등 — 조용히 실패
    console.warn("[storage] set 실패:", key, e?.message);
    return false;
  }
}

export function storageRemove(key) {
  if (!isBrowser) return;
  try { localStorage.removeItem(key); } catch (e) {}
}

// ─────────────────────────────────────────────────────
// 2) usePersistentState — useState + 자동 저장/복구
//    - mount 시 localStorage에서 자동 복구
//    - 값 변경 시 debounce(기본 500ms) 후 저장
// ─────────────────────────────────────────────────────
export function usePersistentState(key, initialValue, options = {}) {
  const { debounceMs = 500, skipSave } = options;
  // skipSave: (value) => boolean — true 반환 시 저장 건너뜀

  // mount 전엔 initialValue, mount 후 1회 복구
  const [value, setValue] = useState(initialValue);
  const restoredRef = useRef(false);
  const timerRef    = useRef(null);

  // 마운트 시 복구
  useEffect(() => {
    const saved = storageGet(key, undefined);
    if (saved !== undefined && saved !== null) {
      setValue(saved);
    }
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 값 변경 시 debounce 저장
  useEffect(() => {
    if (!restoredRef.current) return; // 복구 전엔 저장 안 함
    if (typeof skipSave === "function" && skipSave(value)) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      storageSet(key, value);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [key, value, debounceMs, skipSave]);

  return [value, setValue];
}

// ─────────────────────────────────────────────────────
// 3) 키 네임스페이스 — 일관성 위해 상수로
// ─────────────────────────────────────────────────────
export const SK = {
  // index.js (글쓰기 본체)
  INDEX_STATE      : "cb.index.state.v1",     // messages, stage, result, input, region 등 묶음
  INDEX_RIGHT_TAB  : "cb.index.rightTab.v1",
  INDEX_INDUSTRY   : "cb.index.industry.v1",
  INDEX_RESULT     : "cb.index.result.v1",
  INDEX_INPUT      : "cb.index.input.v1",
  INDEX_MESSAGES   : "cb.index.messages.v1",
  INDEX_STAGE      : "cb.index.stage.v1",
  INDEX_REGION     : "cb.index.region.v1",

  // PhotoEditor (탭/단독 공용 — 가게이름·워터마크 설정 공유)
  PE_WM_TEXT       : "cb.pe.wmText.v1",       // 가게 이름 (★ 사용자 요청 핵심)
  PE_WM_ENABLED    : "cb.pe.wmEnabled.v1",
  PE_WM_STYLE      : "cb.pe.wmStyle.v1",
  PE_WM_POSITION   : "cb.pe.wmPosition.v1",
  PE_THEME1        : "cb.pe.theme1.v1",
  PE_THEME2        : "cb.pe.theme2.v1",
  PE_LOGO          : "photoEditor.logoDataUrl", // (기존 키 유지 — 하위호환)
};
