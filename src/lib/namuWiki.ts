import fs from "fs";
import path from "path";

// 세계관별 로컬 데이터 파일 경로 (파일에서 직접 읽어오는 방식)
const DATA_FILES: Partial<Record<string, string>> = {
  세븐나이츠: path.join(process.cwd(), "src/data/seven-knights.txt"),
};

// 세계관 정보를 파일에서 읽어서 반환
export async function fetchUniverseData(universeName: string): Promise<string> {
  const filePath = DATA_FILES[universeName];
  if (!filePath) return "";

  try {
    // fs.readFileSync = 파일을 읽어서 텍스트로 반환하는 Node.js 기본 기능
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return ""; // 파일이 없으면 빈 문자열 반환
  }
}
