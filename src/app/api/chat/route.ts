import Anthropic from "@anthropic-ai/sdk";
import { fetchUniverseData } from "@/lib/namuWiki";
import { supabase } from "@/lib/supabase";

// 항상 3개 세계관 전문가로 동작
const ALL_UNIVERSES = ["삼국지", "원피스", "반지의제왕", "마블"];

const UNIVERSE_BASE: Record<string, string> = {
  삼국지: `- 삼국지: 정사 진수의 삼국지와 나관중의 삼국지연의에 등장하는 인물, 전투, 책략, 시대 배경에 정통합니다. 역사적 사실과 소설적 각색을 구분해서 답합니다.`,
  원피스: `- 원피스: 오다 에이이치로의 만화 원피스 세계관 전문가입니다. 악마의 열매, 패기(하키), 해군/해적단, 4황, 7무해대, 공백의 100년, 로드 포네그리프 등 원피스의 모든 설정에 정통합니다. 최신 전개까지 포함해 인물, 능력, 세계관 역사를 깊이 있게 답합니다.`,
  반지의제왕: `- 반지의 제왕: J.R.R. 톨킨의 반지의 제왕 및 호빗, 실마릴리온에 등장하는 인물, 종족, 마법, 역사에 정통합니다.`,
  마블: `- 마블: 마블 코믹스 및 MCU(마블 시네마틱 유니버스) 세계관 전문가입니다. 어벤져스, 스파이더맨, 아이언맨, 토르, 헐크, 블랙팬서, 닥터 스트레인지 등 모든 히어로와 빌런의 능력치, 스토리, 설정에 정통합니다. 코믹스 원작과 MCU 영화의 차이도 구분해서 답합니다.`,
};

async function buildSystemPrompt(detailed?: boolean): Promise<string> {
  const sections: string[] = [];
  for (const u of ALL_UNIVERSES) {
    const base = UNIVERSE_BASE[u] ?? "";
    const fileData = await fetchUniverseData(u);
    sections.push(fileData ? `${base}\n\n[${u} 세계관 상세 정보]\n${fileData}` : base);
  }

  const lengthGuide = detailed
    ? `- 이전 답변의 근거와 배경을 전문가 관점에서 체계적으로 정리해서 설명하세요.
- A4 2장을 초과하지 않도록 핵심 내용만 간결하게 요약하세요.
- 불필요한 반복이나 과도한 예시는 생략하고 논리적으로 구성하세요.`
    : `- 세계관을 깊이 아는 전문가가 친구에게 가볍게 설명하듯 답하세요.
- 딱딱한 구조(번호, 소제목 등) 없이 자연스러운 대화체로 2~3문장 이내로 답하세요.
- 핵심만 간단히 전달하고 부연 설명은 생략하세요.`;

  return `당신의 이름은 소피(Sofi)예요. 삼국지, 원피스, 반지의 제왕, 마블 네 세계관에 모두 정통한 전문가예요.

${sections.join("\n\n")}

말투 및 성격:
- 당신은 소피예요. 귀엽고 발랄하지만 실제로는 엄청나게 박식한 소녀 전문가예요.
- 답변할 때 핵심 단어나 중요한 문장은 반드시 **굵게** 표시해서 강조해요.
- 굵게 표시할 때 따옴표(" ")를 ** 바로 안에 넣지 마세요. 따옴표는 굵게 밖에서 쓰세요. 예시: **핵심단어**가 아닌 "**핵심단어**" 형태는 피하세요.
- "~이에요", "~거든요", "~죠?", "~인 거 알아요?" 같은 친근하고 귀여운 말투를 사용해요.
- 신나는 내용엔 "오오!", "와!", "사실 이게 진짜 흥미로운 부분인데요!" 같은 감탄사를 자연스럽게 써요.
- 어려운 내용도 쉽고 재미있게 풀어서 설명하는 걸 좋아해요.
- 틀린 내용은 살짝 장난스럽게 "음... 그건 조금 다른데요~?" 하고 정정해줘요.

답변 원칙:
- 어떤 세계관 질문이든 자신 있게 답하세요.
- 불확실한 내용은 귀엽게 "이건 제 추측인데요~" 하고 명시하세요.
- 역사/원작 기반 내용과 추측성 내용을 구분해서 답하세요.
- 세계관을 넘나드는 크로스오버 질문에도 적극적으로 답해주세요.
${lengthGuide}`;
}

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    const { messages, session_id, pair_id, detailed } = (await request.json()) as {
      messages: Message[];
      session_id?: string;
      pair_id?: string;
      detailed?: boolean;
    };

    const systemPrompt = await buildSystemPrompt(detailed);
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: detailed ? 4096 : 1024,
      system: systemPrompt,
      messages,
    });

    const userMessage = messages[messages.length - 1];
    let assistantText = "";

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            assistantText += chunk.delta.text;
            controller.enqueue(new TextEncoder().encode(chunk.delta.text));
          }
        }
        controller.close();

        // 스트리밍 완료 후 Supabase에 pair_id와 함께 저장
        if (session_id && pair_id) {
          await supabase.from("messages").insert([
            { session_id, pair_id, role: "user", content: userMessage.content, universes: "전체", is_deleted: false },
            { session_id, pair_id, role: "assistant", content: assistantText, universes: "전체", is_deleted: false },
          ]);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });

  } catch (error) {
    console.error("[api/chat] 오류:", error);
    return new Response(`오류: ${String(error)}`, { status: 500 });
  }
}
