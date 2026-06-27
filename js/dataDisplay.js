/**
 * ==========================================
 * 1. 전역 상태 및 캐싱 (Global State & Caching)
 * ==========================================
 * 기상청 해양관측 데이터는 파일 크기가 크기 때문에 매번 호출하면 느려집니다.
 * 따라서 최초 1회만 불러와서 아래 변수에 저장(캐싱)해두고 재사용합니다.
 */
let cachedSeaObsLines = []; // 파싱된 바다 데이터 텍스트 줄(Line)들을 담아둘 배열
let isInitialized = false;  // 데이터를 한 번이라도 불러왔는지 체크하는 스위치

/**
 * ==========================================
 * 2. 핵심 유틸리티 함수 (Math & Logic)
 * ==========================================
 */

/**
 * 위도, 경도를 기상청 단기예보 전용 격자 좌표(NX, NY)로 변환
 * 기상청은 일반적인 GPS(위경도) 대신 한반도를 바둑판처럼 나눈 고유 격자(X, Y)를 사용합니다.
 * 이 함수는 '람베르트 정각원추도법'이라는 복잡한 수학 공식을 통해 GPS를 바둑판 좌표로 바꿔줍니다.
 */
function convertGrid(v1, v2) {
    const RE = 6371.00877; // 지구 반경 (km)
    const GRID = 5.0;      // 격자 간격 (km)
    const SLAT1 = 30.0;    // 투영 위도 1 (표준 위도)
    const SLAT2 = 60.0;    // 투영 위도 2 (표준 위도)
    const OLON = 126.0;    // 기준점 경도
    const OLAT = 38.0;     // 기준점 위도
    const XO = 43;         // 기준점 X 좌표
    const YO = 136;        // 기준점 Y 좌표

    const DEGRAD = Math.PI / 180.0; // 각도를 라디안으로 변환하는 상수
    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    // 투영 계수 계산
    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);
    
    let rs = {}; // 결과값을 담을 객체
    let ra = Math.tan(Math.PI * 0.25 + (v1) * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    let theta = v2 * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI; 
    theta *= sn;
    
    // 최종 격자 X, Y 산출 (반올림 처리)
    rs['nx'] = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    rs['ny'] = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
    
    return rs;
}

/**
 * 기상청 API 호출을 위한 기준 시간(base_date, base_time) 연산
 * 기상청은 현재 시간이 12시 정각이라고 해서 12시 데이터를 바로 주지 않습니다. (관측/처리 지연시간 존재)
 * 그래서 안전하게 과거 시간을 기준으로 API를 요청해야 에러가 나지 않습니다.
 */
function getKmaBaseDateTime(type) {
    const now = new Date();
    
    // 데이터 처리 지연시간을 고려해 현재 시간에서 10분을 뺍니다.
    now.setMinutes(now.getMinutes() - 10);
    
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const baseDate = `${year}${month}${date}`; // 예: "20231024"
    
    let hours = now.getHours();
    let minutes = now.getMinutes();
    
    if (type === 'ncst') {
        // 초단기실황(ncst)은 매시간 40분쯤에 새 데이터가 나옵니다.
        // 40분 이전이라면 이전 시간 데이터를 요청해야 합니다.
        if (minutes < 40) {
            hours -= 1;
            if (hours < 0) { hours = 23; } // 자정(0시) 이전이면 23시로 변경
        }
        return { date: baseDate, time: String(hours).padStart(2, '0') + '00' };
    } else if (type === 'fcst') {
        // 단기예보(fcst)는 하루에 딱 8번(2,5,8,11,14,17,20,23시)만 발표됩니다.
        // 현재 시간과 가장 가까운 과거의 발표 시간을 찾아냅니다.
        const fTimes = [2, 5, 8, 11, 14, 17, 20, 23];
        let baseHour = 2;
        for (let i = fTimes.length - 1; i >= 0; i--) {
            if (hours >= fTimes[i]) {
                baseHour = fTimes[i];
                break;
            }
        }
        return { date: baseDate, time: String(baseHour).padStart(2, '0') + '00' };
    }
}

/**
 * 하버사인(Haversine) 공식을 활용한 두 위경도 간의 직선 거리 계산
 * 지구가 둥글기 때문에 단순 평면 계산이 아닌 구면 삼각법을 사용하여 정확한 거리를 구합니다.
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구의 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // 결과는 km 단위
}

/**
 * ==========================================
 * 3. 데이터 파싱 및 통신 (Data Fetching & Parsing)
 * ==========================================
 */

/**
 * 캐싱된 거대한 텍스트 배열에서 내가 원하는 관측소의 데이터만 딱 뽑아내는 함수
 * 엑셀의 VLOOKUP 같은 역할을 합니다.
 */
function findSeaObsData(lines, tp, keyword) {
    const targetLine = lines.find(line => {
        // 각 줄을 콤마(,)로 쪼갭니다.
        const columns = line.split(',').map(item => item.trim());
        // 0번째 열(장비타입)이 일치하고, 3번째 열(관측소 이름)에 키워드가 포함되어 있는지 검사
        return columns[0] === tp && columns[3] && columns[3].includes(keyword);
    });
    // 찾았다면 배열로 쪼개서 반환, 못 찾았으면 null 반환
    return targetLine ? targetLine.split(',').map(item => item.trim()) : null;
}

/**
 * 국립해양조사원(KHOA) API 호출 (실시간 조위 데이터)
 */
async function fetchKhoaTideData(obsCode) {
    if (!obsCode) return null;
    const url = `https://apis.data.go.kr/1192136/surveyTideLevel/GetSurveyTideLevelApiService?serviceKey=${KHOA_API_KEY}&type=json&obsCode=${obsCode}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const rawText = await response.text();
        const data = JSON.parse(rawText);
        
        // JSON 구조를 깊게 타고 들어가서 실제 조위(cm) 데이터만 추출합니다.
        const items = data?.body?.items?.item;
        if (items && items.length > 0) {
            return {
                obsCode: obsCode,
                obsvtrNm: items[0].obsvtrNm,
                obsrvnDt: items[0].obsrvnDt,
                bscTdlvHgt: items[0].bscTdlvHgt // 실시간 물높이 (cm)
            };
        }
        return null;
    } catch (error) {
        console.error(`[fetchKhoaTideData] Error for obsCode ${obsCode}:`, error);
        return null; // 에러가 나도 전체 앱이 죽지 않도록 null을 반환하고 부드럽게 넘어갑니다.
    }
}

/**
 * 기상청 동네예보 API 호출 (현재 기온 및 하늘 상태)
 */
async function fetchKmaWeather(nx, ny) {
    const ncstTime = getKmaBaseDateTime('ncst'); // 실황 시간 계산
    const fcstTime = getKmaBaseDateTime('fcst'); // 예보 시간 계산
    
    // URL 생성
    const ncstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${KHOA_API_KEY}&pageNo=1&numOfRows=20&dataType=JSON&base_date=${ncstTime.date}&base_time=${ncstTime.time}&nx=${nx}&ny=${ny}`;
    const fcstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${KHOA_API_KEY}&pageNo=1&numOfRows=50&dataType=JSON&base_date=${fcstTime.date}&base_time=${fcstTime.time}&nx=${nx}&ny=${ny}`;

    let weatherResult = { currentTemp: '자료없음', skyStatus: '자료없음' };

    try {
        // 두 개의 API를 동시에 병렬로 요청하여 속도를 2배로 끌어올립니다.
        const [ncstRes, fcstRes] = await Promise.all([fetch(ncstUrl), fetch(fcstUrl)]);
        
        // 1. 기온(T1H) 추출 로직
        if (ncstRes.ok) {
            const ncstData = await ncstRes.json();
            const items = ncstData?.response?.body?.items?.item || [];
            const t1hItem = items.find(i => i.category === 'T1H'); 
            if (t1hItem) weatherResult.currentTemp = t1hItem.obsrValue + ' ℃';
        }

        // 2. 하늘상태(SKY) 추출 로직
        if (fcstRes.ok) {
            const fcstData = await fcstRes.json();
            const items = fcstData?.response?.body?.items?.item || [];
            const skyItem = items.find(i => i.category === 'SKY'); 
            if (skyItem) {
                // 기상청 코드를 사람이 읽기 쉬운 한글로 매핑
                const mapSkyStatus = { '1': '맑음', '3': '구름많음', '4': '흐림' };
                weatherResult.skyStatus = mapSkyStatus[skyItem.fcstValue] || '자료없음';
            }
        }
    } catch (e) {
        console.error("[fetchKmaWeather] API fetch failed:", e);
    }
    return weatherResult;
}

/**
 * 초기화 및 캐싱: 앱이 켜질 때 전국 해양 데이터를 메모리에 올려둡니다.
 */
async function initWeatherSystem() {
    if (isInitialized) return; // 이미 다운로드 받았으면 무시
    
    // 기상청 API 허브 (가장 빠른 실시간 텍스트 데이터)
    const seaObsUrl = `https://apihub.kma.go.kr/api/typ01/url/sea_obs.php?stn=0&help=0&authKey=${MY_API_KEY}`;
    try {
        const res = await fetch(seaObsUrl);
        if (!res.ok) throw new Error("KMA API Server Error");
        
        // 텍스트가 한글 깨짐 없이 나오도록 euc-kr로 디코딩합니다.
        const buffer = await res.arrayBuffer();
        cachedSeaObsLines = new TextDecoder('euc-kr')
            .decode(buffer)
            .split('\n')
            .filter(l => l.trim() !== '' && !l.startsWith('#')); // 주석(#)과 빈 줄은 버립니다.
            
        isInitialized = true; // 세팅 완료 도장 쾅!
    } catch (e) {
        console.error("[initWeatherSystem] Initialization failed:", e);
    }
}

/**
 * ==========================================
 * 4. 메인 오케스트레이션 (Main Orchestration)
 * ==========================================
 */

/**
 * 타겟 위경도에서 가장 인접한 가상 해양 관측소 객체 반환
 * 사용자의 GPS 위치와 가장 가까운 바다 관측소를 찾는 로직입니다.
 */
function findNearestMarineStation(lat, lon) {
    let nearestStation = null;
    let minDistance = Infinity; // 초기 최단 거리는 무한대로 설정

    for (const region in VIRTUAL_STATION_MAP) {
        for (const station of VIRTUAL_STATION_MAP[region]) {
            // 캐시된 텍스트에서 해당 관측소의 실제 GPS 위치를 찾아냅니다.
            const tideData = findSeaObsData(cachedSeaObsLines, station.tideStation.tp, station.tideStation.keyword);
            
            if (tideData && tideData[4] && tideData[5]) { // 4번 인덱스: 경도, 5번: 위도
                const sLon = parseFloat(tideData[4]);
                const sLat = parseFloat(tideData[5]);
                
                // 내 위치(lat, lon)와 관측소 위치(sLat, sLon)의 실제 거리를 계산
                const dist = getDistance(lat, lon, sLat, sLon);
                
                // 기존 최단 거리보다 지금 계산한 거리가 더 짧으면 갱신
                if (dist < minDistance) {
                    minDistance = dist;
                    nearestStation = station;
                }
            }
        }
    }
    return nearestStation;
}

/**
 * [최종 통합 함수] 파라미터로 입력된 좌표 기준 통합 기상 및 해양 데이터 조회
 * 이 함수 하나만 호출하면 모든 날씨 정보가 예쁘게 정리되어 나옵니다.
 */
async function getWeatherDataByCoords(lat, lon) {
    // 0. 준비 안 됐으면 준비(초기화)부터 시킵니다.
    if (!isInitialized) {
        await initWeatherSystem();
    }

    // 1. 육상 날씨 데이터 처리
    const grid = convertGrid(lat, lon); // GPS -> 기상청 격자 변환
    const landWeather = await fetchKmaWeather(grid.nx, grid.ny); // 기온, 하늘상태 획득

    // 2. 근접 해양 관측소 데이터 처리
    const nearestStation = findNearestMarineStation(lat, lon);
    let marineWeather = null;

    if (nearestStation) {
        // 국립해양조사원 조위 + 기상청 파고부이 + 기상청 조위관측소 데이터를 전부 긁어옵니다.
        const khoaTideData = await fetchKhoaTideData(nearestStation.tideObsCode);
        const waveData = findSeaObsData(cachedSeaObsLines, nearestStation.waveStation.tp, nearestStation.waveStation.keyword);
        const tideData = findSeaObsData(cachedSeaObsLines, nearestStation.tideStation.tp, nearestStation.tideStation.keyword);

        // 기상청 데이터의 결측치(고장나서 안 들어오는 값)를 예쁘게 null로 필터링하는 내부 함수
        const getKmaVal = (arr, idx) => {
            if (!arr || !arr[idx]) return null;
            const val = arr[idx].trim();
            return (val === 'null' || val === '-' || val === '' || val === '-99.0' || val === '-99') ? null : val;
        };

        // 데이터를 섞어서 최적의 결과를 조립합니다. 
        // 예: 파고부이에 수온(10) 데이터가 없으면 조위관측소 수온(10)을 대체해서 사용 (|| 연산자 활용)
        marineWeather = {
            spotName: nearestStation.spotName,
            waterTemp: getKmaVal(waveData, 10) || getKmaVal(tideData, 10),
            waveHeight: getKmaVal(waveData, 6),
            tideLevel: khoaTideData?.bscTdlvHgt,
            windSpeed: getKmaVal(tideData, 8) || getKmaVal(waveData, 8),
            windDirection: getKmaVal(tideData, 7) || getKmaVal(waveData, 7)
        };
    }

    // 3. 최종 객체를 반환합니다.
    return {
        requestedCoords: { lat, lon },
        land: landWeather,
        marine: marineWeather
    };
}

// 스크립트가 브라우저에 로딩되자마자 백그라운드에서 조용히 다운로드를 시작합니다.
initWeatherSystem();