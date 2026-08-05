// [v37] MainHero — 우측 메인 대기 화면. /main-img.png 표시.
// [v38 2026-07-22] cover → contain. cover는 컨테이너 비율이 이미지와 다를 때
//   상하(또는 좌우)를 잘라내어 상단 카피가 잘리는 문제가 있었다. contain은 잘림 없이 전체를 담고
//   남는 여백은 backgroundColor로 채운다. 스크롤 발생 시에도 이미지가 항상 완전히 보인다.
export default function MainHero() {
  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        backgroundImage: "url('/main-img.png')",
        backgroundSize: "contain",
        backgroundPosition: "top center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#f7f7fb",
      }}
    />
  );
}
