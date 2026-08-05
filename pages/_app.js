// pages/_app.js
// StoreProvider로 전체 앱 wrap
// 기존 _app.js가 있다면 StoreProvider만 추가하세요

import { StoreProvider } from '../contexts/StoreContext';

export default function MyApp({ Component, pageProps }) {
  return (
    <StoreProvider>
      <Component {...pageProps} />
    </StoreProvider>
  );
}
