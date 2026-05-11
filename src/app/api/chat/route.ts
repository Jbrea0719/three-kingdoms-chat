import Anthropic from "@anthropic-ai/sdk";
import { fetchUniverseData } from "@/lib/namuWiki";
import { supabase } from "@/lib/supabase";

const UNIVERSE_BASE: Record<string, string> = {
  삼국지: `- 삼국지: 정사 진수의 삼국지와 나관중의 삼국지연의에 등장하는 인물, 전투, 책략, 시대 배경에 정통합니다. 역사적 사실과 소설적 각색을 구분해서 답합니다.`,
  세븐나이츠: `- 세븐나이츠: 넷마블 넥서스의 모바일 수집형 RPG 세븐나이츠 세계관 전문가입니다.
- 세븐나이츠 고유 정보(영웅, 스킬, 세계관)를 최우선으로 활용하세요.
- 세븐나이츠 정보가 부족하거나 불명확한 경우, 다음을 참고해 설득력 있게 답변하세요:
  * 유사 수집형 RPG: 서머너즈워, 에픽세븐, 몬스터 길들이기, 브레이브나인
  * 판타지 애니메이션/게임: 페어리테일, 블리치, 나루토, 파이널판타지 시리즈
- 참고 자료를 활용할 때는 세븐나이츠의 분위기(빛/어둠 대립, 판타지 기사단 세계관)에 맞게 재해석해서 답하세요.
- "정확한 정보가 없다"고 거절하기보다, 세계관에 어울리는 그럴듯한 답변을 먼저 제시하고 필요시 "세계관 해석 기준"임을 짧게 언급하세요.`,
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
  return `당신은 다음 세계관에 정통한 전문가입니다:

${sections.join("\n\n")}

답변 원칙:
- 불확실한 내용은 그렇다고 명시하세요.
- 역사/원작 기반 내용과 추측성 내용을 구분해서 답하세요.
${isCrossover
  ? "- 여러 세계관이 선택되어 있으므로 크로스오버 질문에도 적극적으로 답해주세요. 각 캐릭터의 원작 능력치를 근거로 흥미롭게 분석해주세요."
  : "- 해당 세계관 범위 내에서 친절하고 상세하게 답해주세요."
}`;
}

type Message = { role: "user" | "assistant"; content: string };

export async function POST(request: Request) {
  try {
    const { messages, universes, session_id } = (await request.json()) as {
      messages: Message[];
      universes: string[];
      session_id?: string;
    };

    const selectedUniverses = universes?.length > 0 ? universes : ["삼국지"];
    const systemPrompt = await buildSystemPrompt(selectedUniverses);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // 스트리밍: Claude가 생성하는 텍스트를 실시간으로 조각조각 전송
    const stream = await client.messages.stream({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
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

        // 스트리밍 완료 후 Supabase에 저장
        if (session_id) {
          await supabase.from("messages").insert([
            { session_id, role: "user", content: userMessage.content, universes: selectedUniverses.join(",") },
            { session_id, role: "assistant", content: assistantText, universes: selectedUniverses.join(",") },
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
