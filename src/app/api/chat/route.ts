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
    ? `[절대 규칙 — 자세한 답변]
- 반드시 3000자 이내의 완결된 답변을 작성하세요. 3000자를 절대 초과하지 마세요.
- 답변은 반드시 완결된 문장으로 끝나야 합니다. 절대로 단어나 문장 중간에서 잘리면 안 됩니다.
- 글자수 제한에 걸릴 것 같으면 다루는 항목 수를 줄이거나 핵심만 압축해서, 적더라도 완전한 내용으로 마무리하세요.
- 헤더(#), 목록(-, •), 표 등 구조가 도움된다면 자유롭게 사용하세요.
- 3000자로 전달해야 할 내용의 50% 미만밖에 커버하지 못할 경우:
  1) 3000자 이내의 핵심 요약을 먼저 완결성 있게 작성하고 (반드시 완결된 문장으로 끝낼 것)
  2) 바로 다음 줄에 __NEEDS_FULL__ 을 단독으로 작성하고
  3) 그 아래에 전체 답변을 이어서 작성하세요 (10000자 이내, 반드시 완결된 문장으로 끝낼 것)
- 50% 이상 커버 가능하면 __NEEDS_FULL__ 없이 3000자 이내로만 작성하세요.`
    : `[절대 규칙 — 기본 답변]
- 반드시 500자 이내로 작성하세요. 500자를 절대 초과하지 마세요. 어떤 질문에도 예외 없습니다.
- 답변은 반드시 완결된 문장으로 끝나야 합니다.
- 헤더(#), 목록(-, •, 번호), 표 등 마크다운 구조를 절대 사용하지 마세요. 순수 대화체 문장으로만 작성하세요.
- 항목별 세부 나열 금지. 질문 전체를 3~5문장으로 압축 요약하세요.
- 자세한 답변의 전체 내용을 조감하는 한 문단이어야 합니다. 자세한 답변의 일부처럼 보이면 안 됩니다.`;

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
      max_tokens: detailed ? 8192 : 500,
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
          } else if (chunk.type === "message_delta") {
            // max_tokens에 걸려 잘린 경우 클라이언트에 알림
            const delta = chunk.delta as { stop_reason?: string };
            if (delta.stop_reason === "max_tokens") {
              controller.enqueue(new TextEncoder().encode("__TRUNCATED__"));
            }
          }
        }
        // 스트리밍 완료 후 Supabase에 저장 — close() 전에 수행해야 함수 종료 전 완료 보장
        if (session_id && pair_id) {
          await supabase.from("messages").insert([
            { session_id, pair_id, role: "user", content: userMessage.content, universes: "전체", is_deleted: false },
            { session_id, pair_id, role: "assistant", content: assistantText, universes: "전체", is_deleted: false },
          ]);
        }

        controller.close();
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
