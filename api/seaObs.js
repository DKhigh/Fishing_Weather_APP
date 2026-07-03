// api/seaObs.js
export default async function handler(req, res) {
  // Vercel 금고에서 기상청 키를 꺼내옵니다.
  const apiKey = process.env.KMA_API_KEY;
  const url = `https://apihub.kma.go.kr/api/typ01/url/sea_obs.php?stn=0&help=0&authKey=${apiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("기상청 서버 응답 실패");

    // 기상청의 euc-kr 텍스트가 깨지지 않도록 바이너리 버퍼 상태 그대로 프론트엔드에 전달합니다.
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'application/octet-stream');
    
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}