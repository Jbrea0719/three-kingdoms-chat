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

const UNIVERSES = [
  { id: "삼국지", label: "⚔️ 삼국지" },
  { id: "세븐나이츠", label: "🗡️ 세븐나이츠" },
  { id: "반지의제왕", label: "🧙 반지의 제왕" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUniverses, setSelectedUniverses] = useState<string[]>(["삼국지"]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nicknameInput, setNicknameInput] = useState("");
  const [showModal, setShowModal] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 앱 시작 시 저장된 닉네임 확인
  useEffect(() => {
    const saved = localStorage.getItem("chat_nickname");
    if (saved) {
      setSessionId(saved);
    } else {
      setShowModal(true);
    }
  }, []);

  // 닉네임 확정 후 대화 기록 불러오기
  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/messages?session_id=${encodeURIComponent(sessionId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length > 0) {
          setMessages(data.messages.map((m: { role: "user" | "assistant"; content: string }) => ({
            role: m.role,
            content: m.content,
          })));
        }
      })
      .catch(() => {});
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function confirmNickname() {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    localStorage.setItem("chat_nickname", trimmed);
    setSessionId(trimmed);
    setShowModal(false);
  }

  function toggleUniverse(id: string) {
    setSelectedUniverses((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
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
        body: JSON.stringify({
          messages: updatedMessages,
          universes: selectedUniverses,
          session_id: sessionId,
        }),
      });

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

  const isCrossover = selectedUniverses.length > 1;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* 닉네임 입력 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 w-80 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-800 mb-2">닉네임을 입력하세요</h2>
            <p className="text-sm text-gray-500 mb-4">대화 기록이 닉네임에 저장됩니다</p>
            <Input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmNickname()}
              placeholder="예: 정민, 조조, 제갈량"
              className="mb-4"
              autoFocus
            />
            <Button
              onClick={confirmNickname}
              disabled={!nicknameInput.trim()}
              className="w-full bg-red-800 hover:bg-red-700 text-white"
            >
              시작하기
            </Button>
          </div>
        </div>
      )}

      {/* 상단 헤더 */}
      <header className="bg-red-800 text-white px-6 py-4 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">📚 세계관 전문가 챗봇</h1>
            <p className="text-red-200 text-sm">세계관을 선택하고 무엇이든 물어보세요</p>
          </div>
          {sessionId && (
            <div className="text-right">
              <p className="text-red-200 text-xs">접속 중</p>
              <p className="text-white text-sm font-medium">{sessionId}</p>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {UNIVERSES.map((u) => {
            const isSelected = selectedUniverses.includes(u.id);
            return (
              <button
                key={u.id}
                onClick={() => toggleUniverse(u.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? "bg-white text-red-800"
                    : "bg-red-700 text-red-200 hover:bg-red-600"
                }`}
              >
                {u.label}
              </button>
            );
          })}
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
