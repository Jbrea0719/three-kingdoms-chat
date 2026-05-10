import Anthropic from "@anthropic-ai/sdk";

// 삼국지 전문가 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 삼국지(정사 진수의 삼국지 + 나관중의 삼국지연의)에 정통한 전문가입니다.
사용자 질문에 역사적 사실과 소설적 각색을 구분해서 친절히 답해주세요.
불확실한 내용은 그렇다고 명시하세요.`;

// 클라이언트에서 받는 메시지 타입
type Message = {
  role: "user" | "assistant";
  content: string;
};

// POST /api/chat 핸들러
export async function POST(request: Request) {
  const { messages } = (await request.json()) as { messages: Message[] };

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Claude API 스트리밍 요청
  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  // ReadableStream으로 변환해서 클라이언트에 전달
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        // 텍스트 델타만 추출해서 전송
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
