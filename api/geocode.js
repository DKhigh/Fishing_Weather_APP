// api/geocode.js
export default async function handler(req, res) {
    const { lat, lon } = req.query;
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    // 가이드 문서(Page 5, 6)를 반영한 정확한 URL 및 파라미터 조합
    const url = `https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc?request=coordsToaddr&coords=${lon},${lat}&sourcecrs=epsg:4326&output=json&orders=legalcode,admcode`;

    try {
        const response = await fetch(url, {
            headers: {
                // 가이드 문서(Page 5) 예시와 동일하게 헤더의 대소문자 규격을 맞춤
                'x-ncp-apigw-api-key-id': clientId,
                'x-ncp-apigw-api-key': clientSecret
            }
        });
        
        if (!response.ok) {
            // 에러 추적을 쉽게 하기 위해 상태 코드를 함께 출력
            throw new Error(`네이버 지도 API 응답 실패 (상태 코드: ${response.status})`);
        }
        
        const data = await response.json();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}