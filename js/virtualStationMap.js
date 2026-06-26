const VIRTUAL_STATION_MAP = {
  // 1. 경기도 / 인천 권역
  "Gyeonggi": [
    { spotName: "영흥도/대부도권", waveStation: { tp: "C", keyword: "영흥" }, tideStation: { tp: "N", keyword: "인천" }, tideObsCode: "DT_0043" }, // 영흥도
    { spotName: "인천항/연안부두권", waveStation: { tp: "C", keyword: "인천" }, tideStation: { tp: "N", keyword: "인천" }, tideObsCode: "DT_0001" }, // 인천
    { spotName: "국화도/화성권", waveStation: { tp: "C", keyword: "국화" }, tideStation: { tp: "N", keyword: "평택" }, tideObsCode: "DT_0002" }  // 평택
  ],

  // 2. 충청남도 권역
  "Chungnam": [
    { spotName: "태안/안면도권", waveStation: { tp: "C", keyword: "태안" }, tideStation: { tp: "N", keyword: "안흥" }, tideObsCode: "DT_0067" }, // 안흥
    { spotName: "보령/오천항권", waveStation: { tp: "C", keyword: "보령" }, tideStation: { tp: "N", keyword: "보령" }, tideObsCode: "DT_0025" }, // 보령
    { spotName: "서천/홍원항권", waveStation: { tp: "C", keyword: "서천" }, tideStation: { tp: "N", keyword: "장항" }, tideObsCode: "DT_0024" }  // 장항
  ],

  // 3. 전라북도 권역
  "Jeonbuk": [
    { spotName: "군산/비응항권", waveStation: { tp: "C", keyword: "군산" }, tideStation: { tp: "N", keyword: "군산" }, tideObsCode: "DT_0018" }, // 군산
    { spotName: "부안/격포항권", waveStation: { tp: "C", keyword: "부안" }, tideStation: { tp: "N", keyword: "위도" }, tideObsCode: "DT_0068" }, // 위도
    { spotName: "고창/구시포권", waveStation: { tp: "C", keyword: "고창" }, tideStation: { tp: "N", keyword: "영광" }, tideObsCode: "DT_0003" }  // 영광
  ],

  // 4. 전라남도 권역
  "Jeonnam": [
    { spotName: "목포/압해도권", waveStation: { tp: "C", keyword: "목포" }, tideStation: { tp: "N", keyword: "목포" }, tideObsCode: "DT_0007" }, // 목포
    { spotName: "여수/돌산권", waveStation: { tp: "C", keyword: "여수" }, tideStation: { tp: "N", keyword: "여수" }, tideObsCode: "DT_0016" }, // 여수
    { spotName: "완도/신지도권", waveStation: { tp: "C", keyword: "완도" }, tideStation: { tp: "N", keyword: "완도" }, tideObsCode: "DT_0027" }  // 완도
  ],
  
  // 5. 경상남도 / 부산 / 울산 권역
  "Gyeongnam": [
    { spotName: "거제/통영권", waveStation: { tp: "C", keyword: "거제" }, tideStation: { tp: "N", keyword: "통영" }, tideObsCode: "DT_0014" }, // 통영
    { spotName: "부산/진해권", waveStation: { tp: "C", keyword: "기장" }, tideStation: { tp: "N", keyword: "부산" }, tideObsCode: "DT_0005" }, // 부산
    { spotName: "남해/삼천포권", waveStation: { tp: "C", keyword: "남해" }, tideStation: { tp: "N", keyword: "삼천포" }, tideObsCode: "DT_0061" } // 삼천포
  ],

  // 6. 경상북도 권역
  "Gyeongbuk": [
    { spotName: "포항/영일만권", waveStation: { tp: "C", keyword: "포항" }, tideStation: { tp: "N", keyword: "포항" }, tideObsCode: "DT_0091" }, // 포항
    { spotName: "울진/후포항권", waveStation: { tp: "C", keyword: "울진" }, tideStation: { tp: "N", keyword: "후포" }, tideObsCode: "DT_0011" }, // 후포
    { spotName: "영덕/강구항권", waveStation: { tp: "C", keyword: "영덕" }, tideStation: { tp: "N", keyword: "후포" }, tideObsCode: "DT_0011" }  // 후포 (인접)
  ],

  // 7. 강원도 권역
  "Gangwon": [
    { spotName: "속초/고성권", waveStation: { tp: "C", keyword: "속초" }, tideStation: { tp: "N", keyword: "속초" }, tideObsCode: "DT_0012" }, // 속초
    { spotName: "강릉/주문진권", waveStation: { tp: "C", keyword: "옥계" }, tideStation: { tp: "N", keyword: "묵호" }, tideObsCode: "DT_0006" }, // 묵호
    { spotName: "삼척/임원항권", waveStation: { tp: "C", keyword: "임원" }, tideStation: { tp: "N", keyword: "삼척" }, tideObsCode: "DT_0057" }  // 동해항 (인접)
  ],

  // 8. 제주도 권역
  "Jeju": [
    { spotName: "제주항/북부권", waveStation: { tp: "C", keyword: "제주" }, tideStation: { tp: "N", keyword: "제주" }, tideObsCode: "DT_0004" }, // 제주
    { spotName: "성산포/동부권", waveStation: { tp: "C", keyword: "우도" }, tideStation: { tp: "N", keyword: "성산" }, tideObsCode: "DT_0022" }, // 성산포
    { spotName: "서귀포/남부권", waveStation: { tp: "C", keyword: "중문" }, tideStation: { tp: "N", keyword: "서귀포" }, tideObsCode: "DT_0010" }, // 서귀포
    { spotName: "모슬포/서부권", waveStation: { tp: "C", keyword: "영락" }, tideStation: { tp: "N", keyword: "모슬포" }, tideObsCode: "DT_0023" }  // 모슬포
  ]
};