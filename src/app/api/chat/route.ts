import Anthropic from "@anthropic-ai/sdk";

// 지원하는 세계관 목록
const UNIVERSE_PROMPTS: Record<string, string> = {
  삼국지: `- 삼국지: 정사 진수의 삼국지와 나관중의 삼국지연의에 등장하는 인물, 전투, 책략, 시대 배경에 정통합니다. 역사적 사실과 소설적 각색을 구분해서 답합니다.`,
  세븐나이츠: `- 세븐나이츠: 넷마블의 모바일 RPG 세븐나이츠 세계관에 등장하는 영웅들(루시우스, 레이첼, 판도라 등), 진영(빛/어둠/자연 등), 스킬 체계, 스토리, 세계관 설정에 정통합니다.`,
  반지의제왕: `- 반지의 제왕: J.R.R. 톨킨의 반지의 제왕 및 호빗, 실마릴리온에 등장하는 인물, 종족, 마법, 역사에 정통합니다.`,
};

// 선택된 세계관들로 시스템 프롬프트 동적 생성
function buildSystemPrompt(universes: string[]): string {
  const selected = universes
    .map((u) => UNIVERSE_PROMPTS[u])
    .filter(Boolean)
    .join("\n");

  const isCrossover = universes.length > 1;

  return `당신은 다음 세계관에 정통한 전문가입니다:

${selected}

답변 원칙:
- 불확실한 내용은 그렇다고 명시하세요.
- 역사/원작 기반 내용과 추측성 내용을 구분해서 답하세요.
${
  isCrossover
    ? `- 여러 세계관이 선택되어 있으므로 크로스오버 질문(예: "손오공이 여포와 싸우면?")에도 적극적으로 답해주세요. 각 캐릭터의 원작 능력치를 근거로 흥미롭게 분석해주세요.`
    : `- 해당 세계관 범위 내에서 친절하고 상세하게 답해주세요.`
}`;
}

// 클라이언트에서 받는 타입
type Message = {
  role: "user" | "assistant";
  content: string;
};

// POST /api/chat 핸들러
export async function POST(request: Request) {
  const { messages, universes } = (await request.json()) as {
    messages: Message[];
    universes: string[];
  };

  // 세계관이 하나도 선택 안 됐으면 기본값으로 삼국지 사용
  const selectedUniverses = universes?.length > 0 ? universes : ["삼국지"];

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: buildSystemPrompt(selectedUniverses),
    messages,
  });

  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
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
