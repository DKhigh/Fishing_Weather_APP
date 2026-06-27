/**
 * ==========================================
 * 지도 바텀 시트를 위한 전국 데이터 사전 적재
 * (dataDisplay.js 도구들을 활용함)
 * ==========================================
 */
async function loadAllMapData() {
    // 1. 지도 클릭용 데이터 창고 초기화
    window.GlobalOceanData = {};

    // 2. 친구가 만든 캐싱 시스템(dataDisplay.js)이 켜질 때까지 대기
    if (typeof isInitialized !== 'undefined' && !isInitialized) {
        await initWeatherSystem();
    }

    console.log(`[시스템] 지도 클릭용 전국 해양 데이터 적재 시작...`);

    // 3. 지도에 있는 모든 스팟을 돌면서 데이터를 조립하고 창고에 저장
    for (const region in VIRTUAL_STATION_MAP) {
        for (const station of VIRTUAL_STATION_MAP[region]) {
            // 친구가 만든 통신 및 파싱 함수 그대로 재사용!
            const khoaTideData = await fetchKhoaTideData(station.tideObsCode);
            const waveData = findSeaObsData(cachedSeaObsLines, station.waveStation.tp, station.waveStation.keyword);
            const tideData = findSeaObsData(cachedSeaObsLines, station.tideStation.tp, station.tideStation.keyword);

            const getKmaVal = (arr, idx) => {
                if (!arr || !arr[idx]) return null;
                const val = arr[idx].trim();
                return (val === 'null' || val === '-' || val === '' || val === '-99.0' || val === '-99') ? null : val;
            };

            const waterTemp = getKmaVal(waveData, 10) || getKmaVal(tideData, 10);
            const windSpeed = getKmaVal(tideData, 8) || getKmaVal(waveData, 8);
            const windDirection = getKmaVal(tideData, 7) || getKmaVal(waveData, 7);
            const waveHeight = getKmaVal(waveData, 6);
            const tideLevel = khoaTideData?.bscTdlvHgt;
            const airTemp = getKmaVal(tideData, 11) || getKmaVal(waveData, 11);
            const seaPressure = getKmaVal(tideData, 12) || getKmaVal(waveData, 12);

            // 🛠️ 우리가 만든 바텀 시트용 창고에 저장!
            window.GlobalOceanData[station.spotName] = {
                WaterTemp: waterTemp ? waterTemp + ' ℃' : '자료없음',
                WindSpeed: windSpeed ? windSpeed + ' m/s' : '자료없음',
                WindDirection: windDirection ? windDirection + ' °' : '자료없음',
                WaveHeight: waveHeight ? waveHeight + ' m' : '자료없음',
                TideLevel: tideLevel ? tideLevel + ' cm' : '자료없음',
                AirTemp: airTemp ? airTemp + ' ℃' : '자료없음',
                SeaPressure: seaPressure ? seaPressure + ' hPa' : '자료없음'
            };
        }
    }

    console.log(`[시스템] 지도 클릭용 데이터 적재 완료! 지도를 클릭해보세요.`);
    
    // 4. main.js에게 데이터 준비 끝났다고 신호(dataReady) 쏘기!
    window.dispatchEvent(new CustomEvent('dataReady'));
}

// 파일이 로드되면 바로 전국 데이터를 긁어오는 함수 실행
loadAllMapData();