export default async function handler(req, res) {
    // 프론트엔드에서 넘겨준 날짜, 시간, X좌표, Y좌표를 꺼냄
    const { base_date, base_time, nx, ny } = req.query;
    // Vercel 금고에서 공공데이터포털 키를 꺼냄
    const apiKey = process.env.KHOA_API_KEY;
    
    const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${apiKey}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("단기예보 서버 응답 실패");
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}