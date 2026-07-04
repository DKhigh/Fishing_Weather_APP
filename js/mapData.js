/**
 * 지도 바텀 시트를 위한 전국 해양 데이터 사전 적재 스크립트
 * dataDisplay.js에 정의된 통신 및 파싱 함수들을 재사용하여 전국 데이터를 미리 불러옴
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function loadAllMapData() {
    // 1. 지도 클릭 시 참조할 전역 데이터 객체(창고)를 초기화함
    window.GlobalOceanData = {};

    // 2. dataDisplay.js의 캐싱 시스템이 준비될 때까지 대기함
    if (typeof isInitialized !== 'undefined' && !isInitialized) {
        await initWeatherSystem();
    }

    console.log("[시스템] 지도 클릭용 전국 해양 데이터 적재 시작...");

    // 기상청 데이터의 결측치(null, '-', '-99.0' 등)를 걸러내고 깔끔한 null로 반환하는 내부 헬퍼 함수임
    const getKmaVal = (arr, idx) => {
        if (!arr || !arr[idx]) return null;
        const val = arr[idx].trim();
        return (val === 'null' || val === '-' || val === '' || val === '-99.0' || val === '-99') ? null : val;
    };

    let allStationsData = []; // 전국 관측소 데이터를 담을 임시 배열

    // 3. 1차 수집: 지도에 있는 모든 스팟을 돌면서 데이터를 조립하고 위치(lat, lon)를 파악함
    for (const region in VIRTUAL_STATION_MAP) {
        for (const station of VIRTUAL_STATION_MAP[region]) {
            const khoaTideData = await fetchKhoaTideData(station.tideObsCode);
            const waveData = findSeaObsData(cachedSeaObsLines, station.waveStation.tp, station.waveStation.keyword);
            const tideData = findSeaObsData(cachedSeaObsLines, station.tideStation.tp, station.tideStation.keyword);

            // 다른 관측소와의 거리 계산을 위해 현재 관측소의 위도, 경도를 파악함
            let lat = null, lon = null;
            if (tideData && tideData[4] && tideData[5]) {
                lon = parseFloat(tideData[4]);
                lat = parseFloat(tideData[5]);
            } else if (waveData && waveData[4] && waveData[5]) {
                lon = parseFloat(waveData[4]);
                lat = parseFloat(waveData[5]);
            }

            allStationsData.push({
                region: region,
                station: station,
                lat: lat,
                lon: lon,
                waterTemp: getKmaVal(waveData, 10) || getKmaVal(tideData, 10),
                windSpeed: getKmaVal(tideData, 8) || getKmaVal(waveData, 8),
                windDirection: getKmaVal(tideData, 7) || getKmaVal(waveData, 7),
                waveHeight: getKmaVal(waveData, 6),
                tideLevel: khoaTideData?.bscTdlvHgt,
                airTemp: getKmaVal(tideData, 11) || getKmaVal(waveData, 11),
                seaPressure: getKmaVal(tideData, 12) || getKmaVal(waveData, 12)
            });

            await delay(200)
        }
    }

    // 4. 2차 수집(결측치 보정): 결측치(null)가 있는 경우 가장 가까운 다른 관측소의 데이터로 대체함
    for (let i = 0; i < allStationsData.length; i++) {
        let current = allStationsData[i];
        
        let sortedNeighbors = [];

        // 좌표를 모른다고 무조건 포기(continue)하지 않도록 개선
        if (current.lat !== null && current.lon !== null) {
            // 1. 위치를 알 때: 기존처럼 '거리(distance)' 기준으로 가장 가까운 순서대로 정렬
            sortedNeighbors = allStationsData
                .filter((_, idx) => idx !== i && allStationsData[idx].lat !== null)
                .map(neighbor => {
                    return {
                        ...neighbor,
                        dist: getDistance(current.lat, current.lon, neighbor.lat, neighbor.lon)
                    };
                })
                .sort((a, b) => a.dist - b.dist);
        } else {
            // 2. 위치를 모를 때(기상청 완전 고장): 거리는 모르지만 '같은 권역'에 있는 관측소들을 1순위로 탐색
            sortedNeighbors = allStationsData.filter(neighbor => 
                neighbor.region === current.region && neighbor !== current && neighbor.lat !== null
            );
        }

        // 빈 값을 채워 넣을 대상 데이터 항목들
        const metrics = ['waterTemp', 'windSpeed', 'windDirection', 'waveHeight', 'tideLevel', 'airTemp', 'seaPressure'];
         
        for (const metric of metrics) {
            if (current[metric] === null) {
                // 가장 가까운 이웃(또는 같은 권역)부터 순회하며 유효한 값이 있는 것을 찾아서 빌려옴
                for (const neighbor of sortedNeighbors) {
                    if (neighbor[metric] !== null) {
                        current[metric] = neighbor[metric];
                        break; // 구멍을 메웠으므로 이웃 탐색을 멈춤
                    }
                }
            }
        }
    }

    // 5. 최종 적재: 보정 완료된 데이터를 UI 표출용 포맷에 맞춰 전역 객체(창고)에 저장함
    for (const item of allStationsData) {
        window.GlobalOceanData[item.station.spotName] = {
            WaterTemp: item.waterTemp ? item.waterTemp + ' ℃' : '자료없음',
            WindSpeed: item.windSpeed ? item.windSpeed + ' m/s' : '자료없음',
            WindDirection: item.windDirection ? item.windDirection + ' °' : '자료없음',
            WaveHeight: item.waveHeight ? item.waveHeight + ' m' : '자료없음',
            TideLevel: item.tideLevel ? item.tideLevel + ' cm' : '자료없음',
            AirTemp: item.airTemp ? item.airTemp + ' ℃' : '자료없음',
            SeaPressure: item.seaPressure ? item.seaPressure + ' hPa' : '자료없음'
        };
    }

    console.log("[시스템] 지도 클릭용 데이터 적재 완료. 지도를 클릭해 볼 수 있음.");
    
    // 6. 모든 데이터 적재가 끝났음을 알리는 커스텀 이벤트를 발생시킴
    // main.js 등 외부 스크립트에서 이 이벤트를 감지하여 로딩 화면을 제거하는 등의 후속 작업을 진행할 수 있게 함
    window.dispatchEvent(new CustomEvent('dataReady'));
}

// 파일이 브라우저에 로드되자마자 즉시 전국 데이터 수집을 백그라운드에서 시작함
loadAllMapData();


// 낚시 스팟별 & 월별 어종 데이터 하드코딩
const FishSpotData = {
    "제주도" :{
        name: "제주도 낚시 스팟",
        FishByMonth: {
            1: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            2: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            3: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            4: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            5: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            6: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            7: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            8: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            9: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            10: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            11: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            12: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}]
        }
    },
    "강원도" :{
        name: "강원도 낚시 스팟",
        FishByMonth: {
            1: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            2: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            3: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            4: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            5: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            6: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            7: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            8: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            9: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            10: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            11: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            12: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}]
        }
    },
    "경상북도" :{
        name: "경상북도 낚시 스팟",
        FishByMonth: {
            1: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            2: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            3: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            4: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            5: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            6: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            7: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            8: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            9: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            10: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            11: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            12: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}]
        }
    },
    "경상남도" :{
        name: "경상남도 낚시 스팟",
        FishByMonth: {
            1: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            2: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            3: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            4: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            5: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            6: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            7: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            8: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            9: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            10: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            11: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            12: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}]
        }
    },
    "전라남도" :{
        name: "전라남도 낚시 스팟",
        FishByMonth: {
            1: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            2: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            3: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            4: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            5: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            6: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            7: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            8: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            9: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            10: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            11: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            12: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}]
        }
    },
    "전라북도" :{
        name: "전라북도 낚시 스팟",
        FishByMonth: {
            1: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            2: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            3: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            4: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            5: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            6: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            7: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            8: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            9: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            10: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            11: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            12: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}]
        }
    },
    "충청남도" :{
        name: "충청남도 낚시 스팟",
        FishByMonth: {
            1: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            2: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            3: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            4: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            5: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            6: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            7: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            8: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            9: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            10: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            11: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            12: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}]
        }
    },
    "경기도" :{
        name: "경기도 낚시 스팟",
        FishByMonth: {
            1: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            2: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            3: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            4: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            5: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            6: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            7: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            8: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            9: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            10: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            11: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}],
            12: [{FishName: "방어", HtmlPath: "fishPage/fish.html"}]
        }
    }
};