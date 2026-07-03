// api/geocode.js
export default async function handler(req, res) {
    const { lat, lon } = req.query;
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    // 네이버 Reverse Geocoding API 주소 (coords 파라미터는 경도,위도 순서여야 함!)
    const url = `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lon},${lat}&output=json&orders=admcode`;

    try {
        const response = await fetch(url, {
            headers: {
                'X-NCP-APIGW-API-KEY-ID': clientId,
                'X-NCP-APIGW-API-KEY': clientSecret
            }
        });
        
        if (!response.ok) throw new Error("네이버 지도 API 서버 응답 실패");
        
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}