import { chromium } from "playwright";

// 캐시 구조 정의 (한 번 가져온 내용을 일정 시간 동안 재사용)
type CacheEntry = {
  content: string;
  fetchedAt: number; // 가져온 시각 (밀리초)
};

// 메모리 캐시 (서버가 실행되는 동안 유지됨)
const cache = new Map<string, CacheEntry>();

// 캐시 유효 시간: 1시간 (3600초 × 1000밀리초)
const CACHE_TTL = 60 * 60 * 1000;

// 나무위키 페이지를 Playwright(브라우저)로 가져오는 함수
export async function fetchNamuWiki(
  pageName: string,
  maxLength = 4000
): Promise<string> {
  // 캐시에 유효한 데이터가 있으면 브라우저 실행 없이 바로 반환
  const cached = cache.get(pageName);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.content;
  }

  // Chromium 브라우저를 백그라운드에서 실행 (headless = 화면 없이 조용히 실행)
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();

    // 나무위키 세븐나이츠 같은 페이지 주소로 이동
    await page.goto(`https://namu.wiki/w/${encodeURIComponent(pageName)}`, {
      waitUntil: "load", // 기본 로딩만 기다림 (networkidle은 광고 때문에 타임아웃 남)
      timeout: 15000,
    });
    // SPA 콘텐츠가 JavaScript로 렌더링될 시간을 2초 추가로 기다림
    await page.waitForTimeout(2000);

    // 나무위키 본문 영역에서 텍스트만 추출
    // (광고, 메뉴, 사이드바 등 불필요한 부분 제외)
    const content = await page.evaluate(() => {
      // 나무위키 본문 컨테이너 찾기
      const article =
        document.querySelector("article") ||
        document.querySelector(".wiki-content") ||
        document.querySelector('[class*="content"]');

      if (!article) return document.body.innerText;

      // 광고, 편집 버튼 등 불필요한 요소 제거
      const removes = article.querySelectorAll(
        "script, style, nav, .edit-section, [class*='ad'], [class*='toc']"
      );
      removes.forEach((el) => el.remove());

      return article.innerText;
    });

    // 너무 긴 내용은 앞부분만 사용 (Claude에게 너무 많은 내용을 주면 오히려 혼란)
    const trimmed =
      content.length > maxLength
        ? content.substring(0, maxLength) + "\n...(이하 생략)"
        : content;

    // 캐시에 저장 (다음 요청부터는 브라우저 실행 안 해도 됨)
    cache.set(pageName, { content: trimmed, fetchedAt: Date.now() });

    return trimmed;
  } finally {
    // 작업이 끝나면 반드시 브라우저 종료 (메모리 낭비 방지)
    await browser.close();
  }
}
