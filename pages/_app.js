// 📁 저장 위치: D:\banjang-blog\banjang-blog\pages\_app.js

export default function App({ Component, pageProps }) {
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        button:focus,
        button:focus-visible,
        button:active {
          outline: none !important;
        }
        input:focus,
        textarea:focus {
          outline: none !important;
        }
        button {
          -webkit-tap-highlight-color: transparent;
        }
      `}</style>
      <Component {...pageProps} />
    </>
  );
}
