// api/tide.js
export default async function handler(req, res) {
  const { obsCode } = req.query;
  const apiKey = process.env.KHOA_API_KEY;
  
  // 기존에 쓰시던 공공데이터포털(조위관측소) 진짜 주소로 원복!
  const url = `https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService?serviceKey=${apiKey}&type=json&obsCode=${obsCode}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("해양조사원 서버 응답 실패");

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}