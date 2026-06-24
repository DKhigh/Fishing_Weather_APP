const VIRTUAL_STATION_MAP = {
    // 1. 경기도 / 인천 권역
    "Gyeonggi": [
      { spotName: "영흥도/대부도권", waveStation: { tp: "C", keyword: "영흥" }, tideStation: { tp: "N", keyword: "인천" }, lhawsId: null },
      { spotName: "인천항/연안부두권", waveStation: { tp: "C", keyword: "인천" }, tideStation: { tp: "N", keyword: "인천" }, lhawsId: null },
      { spotName: "국화도/화성권", waveStation: { tp: "C", keyword: "국화" }, tideStation: { tp: "N", keyword: "평택" }, lhawsId: null }
    ],

    // 2. 충청남도 권역
    "Chungnam": [
      { spotName: "태안/안면도권", waveStation: { tp: "C", keyword: "태안" }, tideStation: { tp: "N", keyword: "안흥" }, lhawsId: null },
      { spotName: "보령/오천항권", waveStation: { tp: "C", keyword: "보령" }, tideStation: { tp: "N", keyword: "보령" }, lhawsId: null },
      { spotName: "서천/홍원항권", waveStation: { tp: "C", keyword: "서천" }, tideStation: { tp: "N", keyword: "장항" }, lhawsId: null }
    ],

    // 3. 전라북도 권역
    "Jeonbuk": [
      { spotName: "군산/비응항권", waveStation: { tp: "C", keyword: "군산" }, tideStation: { tp: "N", keyword: "군산" }, lhawsId: null },
      { spotName: "부안/격포항권", waveStation: { tp: "C", keyword: "부안" }, tideStation: { tp: "N", keyword: "위도" }, lhawsId: null },
      { spotName: "고창/구시포권", waveStation: { tp: "C", keyword: "고창" }, tideStation: { tp: "N", keyword: "영광" }, lhawsId: null }
    ],

    // 4. 전라남도 권역
    "Jeonnam": [
      { spotName: "목포/압해도권", waveStation: { tp: "C", keyword: "목포" }, tideStation: { tp: "N", keyword: "목포" }, lhawsId: null },
      { spotName: "여수/돌산권", waveStation: { tp: "C", keyword: "여수" }, tideStation: { tp: "N", keyword: "여수" }, lhawsId: null },
      { spotName: "완도/신지도권", waveStation: { tp: "C", keyword: "완도" }, tideStation: { tp: "N", keyword: "완도" }, lhawsId: null }
    ],

    // 5. 경상남도 / 부산 / 울산 권역
    "Gyeongnam": [
      { spotName: "거제/통영권", waveStation: { tp: "C", keyword: "거제" }, tideStation: { tp: "N", keyword: "통영" }, lhawsId: null },
      { spotName: "부산/진해권", waveStation: { tp: "C", keyword: "기장" }, tideStation: { tp: "N", keyword: "부산" }, lhawsId: null },
      { spotName: "남해/삼천포권", waveStation: { tp: "C", keyword: "남해" }, tideStation: { tp: "N", keyword: "삼천포" }, lhawsId: null }
    ],

    // 6. 경상북도 권역
    "Gyeongbuk": [
      { spotName: "포항/영일만권", waveStation: { tp: "C", keyword: "포항" }, tideStation: { tp: "N", keyword: "포항" }, lhawsId: null },
      { spotName: "울진/후포항권", waveStation: { tp: "C", keyword: "울진" }, tideStation: { tp: "N", keyword: "후포" }, lhawsId: null },
      { spotName: "영덕/강구항권", waveStation: { tp: "C", keyword: "영덕" }, tideStation: { tp: "N", keyword: "후포" }, lhawsId: null }
    ],

    // 7. 강원도 권역
    "Gangwon": [
      { spotName: "속초/고성권", waveStation: { tp: "C", keyword: "속초" }, tideStation: { tp: "N", keyword: "속초" }, lhawsId: null },
      { spotName: "강릉/주문진권", waveStation: { tp: "C", keyword: "옥계" }, tideStation: { tp: "N", keyword: "묵호" }, lhawsId: null },
      { spotName: "삼척/임원항권", waveStation: { tp: "C", keyword: "임원" }, tideStation: { tp: "N", keyword: "삼척" }, lhawsId: null }
    ],

    // 8. 제주도 권역 (등표 ID 세팅 완료)
    "Jeju": [
      { spotName: "제주항/북부권", waveStation: { tp: "C", keyword: "제주" }, tideStation: { tp: "N", keyword: "제주" }, lhawsId: null },
      { spotName: "성산포/동부권", waveStation: { tp: "C", keyword: "우도" }, tideStation: { tp: "N", keyword: "성산" }, lhawsId: 960 }, // 지귀도 등표
      { spotName: "서귀포/남부권", waveStation: { tp: "C", keyword: "중문" }, tideStation: { tp: "N", keyword: "서귀포" }, lhawsId: 960 }, // 지귀도 등표
      { spotName: "모슬포/서부권", waveStation: { tp: "C", keyword: "영락" }, tideStation: { tp: "N", keyword: "모슬포" }, lhawsId: null }
    ]
};