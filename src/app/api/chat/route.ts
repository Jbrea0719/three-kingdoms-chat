import Anthropic from "@anthropic-ai/sdk";
import { fetchUniverseData } from "@/lib/namuWiki";

// 각 세계관의 기본 설명
const UNIVERSE_BASE: Record<string, string> = {
  삼국지: `- 삼국지: 정사 진수의 삼국지와 나관중의 삼국지연의에 등장하는 인물, 전투, 책략, 시대 배경에 정통합니다. 역사적 사실과 소설적 각색을 구분해서 답합니다.`,
  세븐나이츠: `- 세븐나이츠: 넷마블 넥서스의 모바일 RPG 세븐나이츠 세계관 전문가입니다. 아래 제공된 세계관 정보를 적극 활용해서 답해주세요.`,
  반지의제왕: `- 반지의 제왕: J.R.R. 톨킨의 반지의 제왕 및 호빗, 실마릴리온에 등장하는 인물, 종족, 마법, 역사에 정통합니다.`,
};

// 선택된 세계관들로 시스템 프롬프트 동적 생성
async function buildSystemPrompt(universes: string[]): Promise<string> {
  const sections: string[] = [];

  for (const u of universes) {
    const base = UNIVERSE_BASE[u] ?? "";
    // 파일 데이터가 있는 세계관은 내용을 함께 전달
    const fileData = await fetchUniverseData(u);
    if (fileData) {
      sections.push(`${base}\n\n[${u} 세계관 상세 정보]\n${fileData}`);
    } else {
      sections.push(base);
    }
  }

  const isCrossover = universes.length > 1;

  return `당신은 다음 세계관에 정통한 전문가입니다:

${sections.join("\n\n")}

답변 원칙:
- 불확실한 내용은 그렇다고 명시하세요.
- 역사/원작 기반 내용과 추측성 내용을 구분해서 답하세요.
${
  isCrossover
    ? `- 여러 세계관이 선택되어 있으므로 크로스오버 질문에도 적극적으로 답해주세요. 각 캐릭터의 원작 능력치를 근거로 흥미롭게 분석해주세요.`
    : `- 해당 세계관 범위 내에서 친절하고 상세하게 답해주세요.`
}`;
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(request: Request) {
  try {
  const { messages, universes } = (await request.json()) as {
    messages: Message[];
    universes: string[];
  };

  const selectedUniverses = universes?.length > 0 ? universes : ["삼국지"];

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = await buildSystemPrompt(selectedUniverses);

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemPrompt,
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
  } catch (error) {
    // 오류 내용을 Vercel 런타임 로그에 기록
    console.error("[/api/chat] 오류 발생:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`오류: ${message}`, { status: 500 });
  }
}
