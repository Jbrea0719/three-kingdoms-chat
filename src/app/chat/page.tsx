"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  role: "user" | "assistant";
  content: string;
};

// 지원하는 세계관 정의
const UNIVERSES = [
  { id: "삼국지", label: "⚔️ 삼국지" },
  { id: "세븐나이츠", label: "🗡️ 세븐나이츠" },
  { id: "반지의제왕", label: "🧙 반지의 제왕" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // 선택된 세계관 목록 (기본: 삼국지만 선택)
  const [selectedUniverses, setSelectedUniverses] = useState<string[]>(["삼국지"]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 세계관 토글 (선택/해제)
  function toggleUniverse(id: string) {
    setSelectedUniverses((prev) =>
      prev.includes(id)
        ? prev.filter((u) => u !== id) // 이미 선택됐으면 제거
        : [...prev, id]                 // 없으면 추가
    );
    // 세계관이 바뀌면 대화 초기화
    setMessages([]);
  }

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 선택된 세계관도 함께 전송
        body: JSON.stringify({ messages: updatedMessages, universes: selectedUniverses }),
      });

      // 서버 오류(500 등)가 오면 HTML 대신 오류 메시지를 표시
      if (!response.ok) throw new Error(`서버 오류: ${response.status}`);
      if (!response.body) throw new Error("응답 스트림이 없습니다.");

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: updated[updated.length - 1].content + chunk,
          };
          return updated;
        });
      }
    } catch (error) {
      console.error("오류:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "오류가 발생했습니다. 다시 시도해주세요." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // 현재 선택된 세계관이 크로스오버인지 여부
  const isCrossover = selectedUniverses.length > 1;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-red-800 text-white px-6 py-4 shadow-md">
        <h1 className="text-xl font-bold">📚 세계관 전문가 챗봇</h1>
        <p className="text-red-200 text-sm">세계관을 선택하고 무엇이든 물어보세요</p>

        {/* 세계관 선택 버튼 */}
        <div className="flex gap-2 mt-3 flex-wrap">
          {UNIVERSES.map((u) => {
            const isSelected = selectedUniverses.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleUniverse(u.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-white text-red-800"           // 선택됨: 흰 배경
                    : "bg-red-700 text-red-200 hover:bg-red-600" // 미선택: 어두운 배경
                }`}
              >
                {u.label}
              </button>
            );
          })}
          {/* 크로스오버 모드 안내 */}
          {isCrossover && (
            <span className="px-3 py-1 rounded-full text-sm bg-yellow-400 text-yellow-900 font-medium">
              ✨ 크로스오버 모드
            </span>
          )}
        </div>
      </header>

      {/* 메시지 목록 */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <p className="text-4xl mb-4">
                {isCrossover ? "✨" : UNIVERSES.find((u) => u.id === selectedUniverses[0])?.label.split(" ")[0] ?? "📚"}
              </p>
              <p className="text-lg font-medium">
                {isCrossover
                  ? `${selectedUniverses.map((u) => UNIVERSES.find((v) => v.id === u)?.label).join(" × ")} 크로스오버`
                  : `${UNIVERSES.find((u) => u.id === selectedUniverses[0])?.label} 세계관`}
              </p>
              <p className="text-sm mt-2">무엇이든 물어보세요!</p>
              {isCrossover && (
                <p className="text-xs mt-1 text-gray-400">예: "손오공이 여포와 싸우면 누가 이길까?"</p>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[80%] px-4 py-3 text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-red-800 text-white border-red-700"
                    : "bg-white text-gray-800 border-gray-200"
                }`}
              >
                {msg.content}
              </Card>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <Card className="px-4 py-3 bg-white border-gray-200">
                <span className="text-gray-400 animate-pulse">답변 작성 중...</span>
              </Card>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* 하단 입력창 */}
      <div className="border-t bg-white px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              selectedUniverses.length === 0
                ? "세계관을 먼저 선택해주세요"
                : "질문을 입력하세요... (Enter 전송)"
            }
            disabled={isLoading || selectedUniverses.length === 0}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim() || selectedUniverses.length === 0}
            className="bg-red-800 hover:bg-red-700 text-white"
          >
            전송
          </Button>
        </div>
      </div>
    </div>
  );
}
