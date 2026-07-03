// api/tide.js
export default async function handler(req, res) {
  // 프론트엔드에서 보낸 ?obsCode=DT_0043 값을 가져옵니다.
  const { obsCode } = req.query;
  const apiKey = process.env.KHOA_API_KEY;
  
  // 만약 기존에 쓰시던 공공데이터포털(국립해양조사원) API 주소가 있다면 아래 URL을 그에 맞게 수정하시면 됩니다.
  const url = `https://www.khoa.go.kr/api/oceangrid/tideObsPreTab/search.do?ServiceKey=${apiKey}&ObsCode=${obsCode}&ResultType=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("해양조사원 서버 응답 실패");

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}