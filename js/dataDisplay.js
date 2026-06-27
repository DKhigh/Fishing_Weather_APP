/**
* 1. 해양종합관측 데이터(sea_obs.php) 파싱 함수
* @description 원본 데이터가 콤마(,)로 명확히 구분되어 있으므로 split(',')을 사용합니다.
* @param {Array} lines - 줄바꿈으로 분리된 API 응답 텍스트 배열
* @param {string} tp - 관측 장비 타입 ('C': 파고부이, 'N': 조위관측소 등)
* @param {string} keyword - 찾고자 하는 지점명 (예: "제주", "우도")
* @returns {Array|null} 매칭된 데이터의 1차원 배열 반환. 없으면 null 반환.
*/
function findSeaObsData(lines, tp, keyword) {
    const targetLine = lines.find(line => {
        // 공백을 제거하며 콤마 기준으로 배열화
        const columns = line.split(',').map(item => item.trim());
        // 조건: 1번째 열(장비타입)이 일치하고, 4번째 열(지점명)에 키워드가 포함되어야 함
        return columns[0] === tp && columns[3] && columns[3].includes(keyword);
    });
    return targetLine ? targetLine.split(',').map(item => item.trim()) : null;
}

/*
* 2. 국립해양조사원 조위관측소 실측조위 데이터 페치 함수
* @description 실제 API 응답 구조에 맞춰 response 계층을 제외하고 body에 직접 접근합니다.
* @param {string} obsCode - 국립해양조사원 관측소 코드 (예: "DT_0004")
* @returns {Object|null} 실측조위 데이터 객체 반환. 실패 시 null 반환.
*/
async function fetchKhoaTideData(obsCode) {
    if (!obsCode) return null;

    // KHOA_API_KEY는 apikey.js에 선언되어 있어야 합니다.
    const url = `https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService?serviceKey=${KHOA_API_KEY}&type=json&obsCode=${obsCode}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP 통신 에러: ${response.status}`);
        }

        const rawText = await response.text();
        const data = JSON.parse(rawText);
        
        // 실제 응답 구조에 맞춰 response를 제거하고 header에 바로 접근합니다.
        const resultCode = data?.header?.resultCode;
        if (resultCode !== "00") {
          console.warn(`[KHOA API 경고] 관측소(${obsCode}) 응답 코드: ${resultCode} / 메시지: ${data?.header?.resultMsg}`);
        }
        
        // 실제 응답 구조에 맞춰 response를 제거하고 body에 바로 접근합니다.
        const items = data?.body?.items?.item;
        
        if (items && items.length > 0) {
          // 배열의 첫 번째 항목을 최신 관측 데이터로 간주
          const latestData = items[0];

          return {
            obsCode: obsCode,
            obsvtrNm: latestData.obsvtrNm,
            obsrvnDt: latestData.obsrvnDt,
            bscTdlvHgt: latestData.bscTdlvHgt // 실측조위 (단위: cm)
          };
        }
        
        return null;
    } catch (error) {
        console.error(`조위 데이터 페치 중 오류 발생 (관측소: ${obsCode}):`, error);
        return null;
    }
}

    /**
     * 메인 비동기 데이터 융합 함수 (전국 데이터 순회 처리로 확장)
     * @description 기상청 API를 1회만 호출하여 자원을 최적화하고, 가상 관측소 맵의 모든 권역을 순회합니다.
     */
    async function getAllIntegratedWeatherData() {
      console.log(`[시스템] 전국 해양 기상 데이터 병합 프로세스 시작...`);

      // 1. 기상청 API 1회 호출 설정 (전국 데이터 수신)
      const seaObsUrl = `https://apihub.kma.go.kr/api/typ01/url/sea_obs.php?stn=0&help=0&authKey=${MY_API_KEY}`;
      let seaObsLines = [];
      
      try {
        const seaObsResponse = await fetch(seaObsUrl);

        if (!seaObsResponse.ok) {
           throw new Error("기상청 API 서버 응답에 문제가 있습니다.");
        }

        const seaObsBuffer = await seaObsResponse.arrayBuffer();
        const decoder = new TextDecoder('euc-kr');
        const seaObsText = decoder.decode(seaObsBuffer);

        seaObsLines = seaObsText.split('\n').filter(line => line.trim() !== '' && !line.startsWith('#'));
        console.log(`[시스템] 기상청 전국 해양 데이터 로드 및 파싱 완료.`);
      } catch (error) {
        console.error(`기상청 데이터 페치 중 에러 발생:`, error);
        return; // 베이스 데이터가 없으면 프로세스 중단
      }

      // 2. 가상 관측소 맵의 모든 권역(Region)을 순회
      for (const regionKey in VIRTUAL_STATION_MAP) {
        console.log(`\n=========================================`);
        console.log(`[${regionKey}] 권역 데이터 처리 시작...`);
        console.log(`=========================================`);

        const stations = VIRTUAL_STATION_MAP[regionKey];

        // 3. 해당 권역 내의 모든 관측소(Station)를 순회
        for (const station of stations) {
          // 국립해양조사원 API 개별 호출 (공공데이터포털 과부하 방지를 위해 순차적 await 처리)
          const khoaTideData = await fetchKhoaTideData(station.tideObsCode);

          const mergedData = {
            spotName: station.spotName,
            waveData: findSeaObsData(seaObsLines, station.waveStation.tp, station.waveStation.keyword),
            tideData: findSeaObsData(seaObsLines, station.tideStation.tp, station.tideStation.keyword),
            khoaTideData: khoaTideData
          };

          console.log(`\n[${station.spotName}] 데이터 조립 완료:`);

          // 기상청 API 배열에서 공백 및 누락값 제거 후 안전하게 가져오는 헬퍼 함수
          const getKmaVal = (arr, idx) => {
            if (!arr || !arr[idx]) return null;
            const val = arr[idx].trim();
            // 결측치 데이터를 명시적으로 필터링 처리
            return (val === 'null' || val === '-' || val === '' || val === '-99.0' || val === '-99') ? null : val;
          };

          // 로그 분석 결과에 따른 정확한 인덱스 재매핑
          const waterTemp = getKmaVal(mergedData.waveData, 10) || getKmaVal(mergedData.tideData, 10);
          const windSpeed = getKmaVal(mergedData.tideData, 8) || getKmaVal(mergedData.waveData, 8);
          const windDirection = getKmaVal(mergedData.tideData, 7) || getKmaVal(mergedData.waveData, 7);
          const waveHeight = getKmaVal(mergedData.waveData, 6);
          const tideLevel = mergedData.khoaTideData?.bscTdlvHgt;
          const airTemp = getKmaVal(mergedData.tideData, 11) || getKmaVal(mergedData.waveData, 11);
          const seaPressure = getKmaVal(mergedData.tideData, 12) || getKmaVal(mergedData.waveData, 12);

          // 전역 객체(창고)에 데이터 저장하기
          window.GlobalOceanData[station.spotName] = {
                WaterTemp: waterTemp ? waterTemp + ' ℃' : '자료없음',
                WindSpeed: windSpeed ? windSpeed + ' m/s' : '자료없음',
                WindDirection: windDirection ? windDirection + ' °' : '자료없음',
                WaveHeight: waveHeight ? waveHeight + ' m' : '자료없음',
                TideLevel: tideLevel ? tideLevel + ' cm' : '자료없음',
                AirTemp: airTemp ? airTemp + ' ℃' : '자료없음',
                SeaPressure: seaPressure ? seaPressure + ' hPa' : '자료없음'
            };

          // 구분된 데이터 개별 출력
          console.log(`   └─ 수온: ${waterTemp ? waterTemp + ' ℃' : '자료없음'}`);
          console.log(`   └─ 풍속: ${windSpeed ? windSpeed + ' m/s' : '자료없음'}`);
          console.log(`   └─ 풍향: ${windDirection ? windDirection + ' °' : '자료없음'}`);
          console.log(`   └─ 유의파고: ${waveHeight ? waveHeight + ' m' : '자료없음'}`);
          console.log(`   └─ 조위: ${tideLevel ? tideLevel + ' cm' : '자료없음'}`);
          console.log(`   └─ 기온: ${airTemp ? airTemp + ' ℃' : '자료없음'}`);
          console.log(`   └─ 해면기압: ${seaPressure ? seaPressure + ' hPa' : '자료없음'}`);
        }
      }
      
      console.log(`\n[시스템] 전국 해양 기상 데이터 병합 프로세스 종료.`);
      // main.js에 데이터가 다 찼다는 신호를 보냄
      const event = new CustomEvent('dataReady');
      window.dispatchEvent(event);
    }

    // 전국 권역 테스트 실행
getAllIntegratedWeatherData();