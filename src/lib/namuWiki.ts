import { SEVEN_KNIGHTS_DATA } from "@/data/sevenKnights";

// 세계관별 데이터 매핑 (fs 대신 직접 import해서 Vercel에서도 안정적으로 동작)
const UNIVERSE_DATA: Partial<Record<string, string>> = {
  세븐나이츠: SEVEN_KNIGHTS_DATA,
};

// 세계관 이름으로 데이터 반환
export async function fetchUniverseData(universeName: string): Promise<string> {
  return UNIVERSE_DATA[universeName] ?? "";
}
