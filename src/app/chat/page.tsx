"use client"; // 클라이언트 컴포넌트 (state, 이벤트 처리 필요)

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

// 메시지 타입 정의
type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]); // 대화 히스토리
  const [input, setInput] = useState(""); // 입력창 텍스트
  const [isLoading, setIsLoading] = useState(false); // AI 응답 대기 중 여부
  const bottomRef = useRef<HTMLDivElement>(null); // 스크롤 최하단 참조

  // 새 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 메시지 전송 처리
  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    // 사용자 메시지를 히스토리에 추가
    const userMessage: Message = { role: "user", content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    // AI 응답을 스트리밍으로 받아 실시간으로 화면에 표시
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.body) throw new Error("응답 스트림이 없습니다.");

      // 빈 AI 메시지를 먼저 추가하고, 스트림 데이터가 올 때마다 내용 추가
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // 마지막 메시지(AI 응답)에 청크를 이어 붙임
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

  // 엔터 전송 / Shift+엔터 줄바꿈 처리
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-red-800 text-white px-6 py-4 shadow-md">
        <h1 className="text-xl font-bold">⚔️ 삼국지 전문가</h1>
        <p className="text-red-200 text-sm">정사 삼국지 & 삼국지연의 기반 AI 챗봇</p>
      </header>

      {/* 메시지 목록 */}
      <ScrollArea className="flex-1 px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            // 대화가 없을 때 안내 메시지
            <div className="text-center text-gray-400 mt-20">
              <p className="text-4xl mb-4">🏯</p>
              <p className="text-lg font-medium">삼국지에 대해 무엇이든 물어보세요</p>
              <p className="text-sm mt-2">예: "관우의 죽음은 어떻게 됐나요?"</p>
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
                    ? "bg-red-800 text-white border-red-700" // 사용자 메시지: 붉은색
                    : "bg-white text-gray-800 border-gray-200" // AI 메시지: 흰색
                }`}
              >
                {msg.content}
              </Card>
            </div>
          ))}

          {/* 로딩 인디케이터 */}
          {isLoading && messages[messages.length - 1]?.content === "" && (
            <div className="flex justify-start">
              <Card className="px-4 py-3 bg-white border-gray-200">
                <span className="text-gray-400 animate-pulse">답변 작성 중...</span>
              </Card>
            </div>
          )}

          {/* 스크롤 앵커 */}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* 하단 입력창 */}
      <div className="border-t bg-white px-4 py-4 shadow-up">
        <div className="max-w-2xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요... (Enter 전송, Shift+Enter 줄바꿈)"
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-red-800 hover:bg-red-700 text-white"
          >
            전송
          </Button>
        </div>
      </div>
    </div>
  );
}
