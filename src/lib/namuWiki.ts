// 세계관별 추가 데이터 (필요 시 여기에 추가)
const UNIVERSE_DATA: Partial<Record<string, string>> = {};

// 세계관 이름으로 데이터 반환
export async function fetchUniverseData(universeName: string): Promise<string> {
  return UNIVERSE_DATA[universeName] ?? "";
}
