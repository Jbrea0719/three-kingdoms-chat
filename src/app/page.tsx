import { redirect } from "next/navigation";

// 루트 페이지(/) 접속 시 /chat으로 자동 이동
export default function Home() {
  redirect("/chat");
}
