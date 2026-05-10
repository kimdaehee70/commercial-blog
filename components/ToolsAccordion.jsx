// 📁 저장 위치: D:\banjang-blog\banjang-blog\components\ToolsAccordion.jsx
// 사진편집기 탭 — photo-editor 페이지를 그대로 임베드
// (이전: 워터마크 + 사진편집 아코디언 / 현재: 단일 사진편집기 화면)

import dynamic from "next/dynamic";

const PhotoEditorPage = dynamic(() => import("../pages/photo-editor"), { ssr: false });

export default function ToolsAccordion() {
  return (
    <div style={{ marginTop: 0 }}>
      <PhotoEditorPage />
    </div>
  );
}
