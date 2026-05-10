import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const lastMessage = messages?.[messages.length - 1]?.content ?? "";

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 256,
      messages: [{ role: "user", content: lastMessage }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return new Response(text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("[api/chat] 오류:", error);
    return new Response(`오류: ${String(error)}`, { status: 500 });
  }
}
