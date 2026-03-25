import { Suspense } from "react";
import "../styles/_variables.scss";
import "../styles/_keyframe-animations.scss";
import "./globals.css";
import GlobalLoadingOverlay from "@/components/GlobalLoadingOverlay";
import { APP_NAME } from "@/lib/config";

export const metadata = {
  title: APP_NAME,
  description: "엘바노헤어 고객 안내문 전자서명 시스템"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="app-body">
        {children}
        <Suspense fallback={null}>
          <GlobalLoadingOverlay />
        </Suspense>
      </body>
    </html>
  );
}
