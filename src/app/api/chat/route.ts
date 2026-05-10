// 최소한의 테스트 라우트 - 아무것도 import 안 하고 단순 응답만 반환
export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const lastMessage = messages?.[messages.length - 1]?.content ?? "";
    return new Response(`테스트 응답: "${lastMessage}" 를 받았습니다.`, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    return new Response(`오류: ${String(error)}`, { status: 500 });
  }
}
