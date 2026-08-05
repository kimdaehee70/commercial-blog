// components/RestaurantSelector.jsx
// Phase 9.5 — restaurant 전용 4단 select UI
//
// 철학 기준: PHILOSOPHY 2-1 (지역+행동+상황+목적), 2-2 (브랜드 노출 X)
// 카드 클릭 구조 ❌ / 검색 행동 조합 구조 ⭕
//
// 사용 흐름:
//   1) 업종 = restaurant 선택 시 기존 카테고리 탭·매장 카드 영역을 이 컴포넌트로 교체
//   2) 4단 select: 지역 → 카테고리 → 메뉴 → 상황 → 목적
//   3) 선택값으로 virtual program 객체 생성
//   4) 부모 컴포넌트에서 selectedTreatment로 사용 → generate body 전달

import { useState, useEffect, useMemo } from 'react';
import {
  RESTAURANT_REGIONS,
  RESTAURANT_CATS,
  RESTAURANT_MENUS,
  RESTAURANT_SITUATIONS,
  RESTAURANT_PURPOSES,
  RESTAURANT_TREATMENTS,
  buildDirection,
} from '../lib/restaurant-data';

export default function RestaurantSelector({ onChange }) {
  // ─────────────────────────────────────────────────────
  // 4단 select state
  // ─────────────────────────────────────────────────────
  const [region, setRegion]       = useState(RESTAURANT_REGIONS[0] || '구리');
  const [cat, setCat]             = useState('한식');
  const [menu, setMenu]           = useState('');
  const [situation, setSituation] = useState('');
  const [purpose, setPurpose]     = useState('');

  // 카테고리 변경 시 메뉴 자동 초기화
  useEffect(() => {
    const list = (RESTAURANT_MENUS[cat] || []);
    if (list.length > 0 && !list.includes(menu)) {
      setMenu(list[0]);
    } else if (list.length === 0) {
      setMenu('');
    }
  }, [cat]);

  // ─────────────────────────────────────────────────────
  // 메뉴 목록 (카테고리별)
  // ─────────────────────────────────────────────────────
  const menuOptions = useMemo(() => {
    return RESTAURANT_MENUS[cat] || [];
  }, [cat]);

  // ─────────────────────────────────────────────────────
  // 4단 조합 → virtual program 객체
  // ─────────────────────────────────────────────────────
  const virtualProgram = useMemo(() => {
    if (!region || !menu) return null;

    // 기존 RESTAURANT_TREATMENTS에 매칭되는 항목이 있으면 우선 사용
    const existing = RESTAURANT_TREATMENTS.find(
      t => t.region === region && t.menu === menu
    );
    if (existing) {
      return {
        ...existing,
        situation,  // 신규 필드
        purpose,    // 신규 필드
      };
    }

    // 없으면 virtual 조합 객체 생성 (2단계 메뉴 확장 시 사용)
    const direction = buildDirection({ menu, situation, purpose });
    return {
      id:        `rest_${cat}_${menu}_${region}_virtual`.replace(/\s/g, '_'),
      industry:  'restaurant',
      region,
      menu,
      cat,
      name:      direction.genericName || '이 식당',
      emoji:     '🍲',
      titlePatterns: [
        '{region} {menu} {situation} 솔직 후기',
        '{region} {menu}｜{purpose} 다녀온 후기',
        '{region} {menu} {situation} 다녀와서 정리',
      ],
      keywords: [
        `${region} ${menu}`,
        `${region} ${menu} 맛집`,
        `${region} ${situation || ''}`.trim(),
        `${region} ${menu} ${situation || ''}`.trim(),
      ].filter(Boolean),
      compareWith: '동일 지역 다른 한식집',
      nearbyHint:  `${region} 일대`,
      menuRef:     menu,
      catRef:      cat,
      // 신규 필드 — generateRestaurant 호출 시 body에 함께 전달
      situation,
      purpose,
    };
  }, [region, cat, menu, situation, purpose]);

  // 변경 알림
  useEffect(() => {
    if (onChange && virtualProgram) {
      onChange({
        program: virtualProgram,
        region,
        situation,
        purpose,
      });
    }
  }, [virtualProgram, region, situation, purpose, onChange]);

  // ─────────────────────────────────────────────────────
  // 선택 미리보기 (검색의도 시각화)
  // ─────────────────────────────────────────────────────
  const previewKeyword = [region, menu, situation, purpose].filter(Boolean).join(' ');

  return (
    <div className="restaurant-selector">
      <div className="rs-header">
        <span className="rs-badge">🍲 맛집·식당</span>
        <span className="rs-hint">검색 행동 조합 — 지역·메뉴·상황·목적</span>
      </div>

      <div className="rs-grid">
        {/* 1단: 지역 */}
        <div className="rs-field">
          <label>지역</label>
          <select value={region} onChange={e => setRegion(e.target.value)}>
            {RESTAURANT_REGIONS.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 2단: 카테고리 */}
        <div className="rs-field">
          <label>카테고리</label>
          <select value={cat} onChange={e => setCat(e.target.value)}>
            {RESTAURANT_CATS.filter(c => c !== '전체').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* 4단: 상황 */}
        <div className="rs-field">
          <label>상황</label>
          <select value={situation} onChange={e => setSituation(e.target.value)}>
            <option value="">선택 안 함</option>
            {RESTAURANT_SITUATIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 5단: 목적 */}
        <div className="rs-field">
          <label>목적</label>
          <select value={purpose} onChange={e => setPurpose(e.target.value)}>
            <option value="">선택 안 함</option>
            {RESTAURANT_PURPOSES.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 3단: 메뉴 — 카드형 (치과 시술카드 UI 재사용 · 값 흐름은 기존 menu state 동일) */}
      <div className="rs-menu-block">
        <label className="rs-menu-label">메뉴</label>
        {menuOptions.length === 0 ? (
          <div className="rs-menu-empty">(메뉴 없음)</div>
        ) : (
          <div className="rs-menu-cards">
            {menuOptions.map(m => (
              <button
                key={m}
                type="button"
                className={`rs-menu-card${menu === m ? ' active' : ''}`}
                onClick={() => setMenu(m)}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 검색의도 미리보기 */}
      <div className="rs-preview">
        <span className="rs-preview-label">예상 검색 키워드:</span>
        <span className="rs-preview-value">{previewKeyword || '(선택해주세요)'}</span>
      </div>

      {/* placeholder 안내 */}
      {virtualProgram && (
        <div className="rs-info-note">
          <span>본문 내 매장 표현:</span>
          <strong>"{virtualProgram.name}"</strong>
          <span className="rs-info-sub">(매장명 노출 X · 일반명 placeholder만)</span>
        </div>
      )}

      <style jsx>{`
        .restaurant-selector {
          padding: 20px;
          background: #fff8f0;
          border: 1px solid #f0d8b0;
          border-radius: 12px;
        }
        .rs-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px dashed #e0c898;
        }
        .rs-badge {
          font-weight: 700;
          font-size: 16px;
          color: #c88040;
        }
        .rs-hint {
          font-size: 13px;
          color: #888;
        }
        .rs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 12px;
        }
        .rs-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .rs-field label {
          font-size: 13px;
          font-weight: 600;
          color: #555;
        }
        .rs-field select {
          padding: 8px 10px;
          border: 1px solid #d8c098;
          border-radius: 6px;
          background: #fff;
          font-size: 14px;
        }
        .rs-menu-block {
          margin-top: 16px;
        }
        .rs-menu-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #555;
          margin-bottom: 8px;
        }
        .rs-menu-empty {
          font-size: 13px;
          color: #aaa;
          padding: 8px 0;
        }
        .rs-menu-cards {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 8px;
        }
        .rs-menu-card {
          padding: 12px 10px;
          border: 1px solid #e0c898;
          border-radius: 8px;
          background: #fff;
          font-size: 14px;
          font-weight: 600;
          color: #555;
          cursor: pointer;
          text-align: center;
          transition: all .15s ease;
        }
        .rs-menu-card:hover {
          border-color: #c88040;
          background: #fffaf0;
        }
        .rs-menu-card.active {
          border-color: #c88040;
          background: #c88040;
          color: #fff;
          box-shadow: 0 2px 6px rgba(200,128,64,.3);
        }
        .rs-preview {
          margin-top: 16px;
          padding: 10px 14px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #f0d8b0;
        }
        .rs-preview-label {
          font-size: 12px;
          color: #888;
          margin-right: 8px;
        }
        .rs-preview-value {
          font-weight: 600;
          color: #c88040;
        }
        .rs-info-note {
          margin-top: 10px;
          padding: 8px 12px;
          background: #fffaf0;
          border-radius: 6px;
          font-size: 13px;
          color: #888;
        }
        .rs-info-note strong {
          color: #c88040;
          margin: 0 6px;
        }
        .rs-info-sub {
          font-size: 11px;
          color: #aaa;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
}
