import Anthropic from "@anthropic-ai/sdk";
import { fetchUniverseData } from "@/lib/namuWiki";

const UNIVERSE_BASE: Record<string, string> = {
  삼국지: `- 삼국지: 정사 진수의 삼국지와 나관중의 삼국지연의에 등장하는 인물, 전투, 책략, 시대 배경에 정통합니다. 역사적 사실과 소설적 각색을 구분해서 답합니다.`,
  세븐나이츠: `- 세븐나이츠: 넷마블 넥서스의 모바일 RPG 세븐나이츠 세계관 전문가입니다. 아래 제공된 세계관 정보를 적극 활용해서 답해주세요.`,
  반지의제왕: `- 반지의 제왕: J.R.R. 톨킨의 반지의 제왕 및 호빗, 실마릴리온에 등장하는 인물, 종족, 마법, 역사에 정통합니다.`,
};

async function buildSystemPrompt(universes: string[]): Promise<string> {
  const sections: string[] = [];
  for (const u of universes) {
    const base = UNIVERSE_BASE[u] ?? "";
    const fileData = await fetchUniverseData(u);
    sections.push(fileData ? `${base}\n\n[${u} 세계관 상세 정보]\n${fileData}` : base);
  }
  const isCrossover = universes.length > 1;
  return `당신은 다음 세계관에 정통한 전문가입니다:\n\n${sections.join("\n\n")}\n\n답변 원칙:\n- 불확실한 내용은 명시하세요.\n${isCrossover ? "- 크로스오버 질문에 적극적으로 답해주세요." : "- 친절하고 상세하게 답해주세요."}`;
}

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    const { messages, universes } = (await request.json()) as {
      messages: Message[];
      universes: string[];
    };

    const selectedUniverses = universes?.length > 0 ? universes : ["삼국지"];
    const systemPrompt = await buildSystemPrompt(selectedUniverses);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 스트리밍 대신 단순 응답으로 테스트 (문제 원인 파악용)
    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    console.error("[/api/chat] 오류:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(`오류: ${message}`, { status: 500 });
  }
}
