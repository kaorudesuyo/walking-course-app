"use client";
import SplashScreen from "./SplashScreen";

/**
 * アプリ全体のクライアント側ラッパー。
 * スプラッシュ演出を子要素（アプリ本体）の上に重ねて表示する。
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SplashScreen />
      {children}
    </>
  );
}
