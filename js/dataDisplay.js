// 통신 낭비를 막고 데이터를 한 번만 불러와서 쓰기 위한 전역 상태 변수임
let isInitialized = false;
// 기상청 해양관측 실황 데이터(거대한 텍스트 파일)를 줄바꿈 단위로 쪼개서 담아둘 캐싱 배열임
let cachedSeaObsLines = [];

/**
 * 시스템 초기화 및 기상청 해양관측 데이터 캐싱 함수
 * 앱이 켜질 때 최초 1회만 실행되어 전국 바다 데이터를 메모리에 올려둠
 */
async function initWeatherSystem() {
    // 이미 데이터를 불러왔다면 중복 호출을 막고 바로 빠져나감
    if (isInitialized) return;
    
    // MY_API_KEY는 apikey.js 파일에 전역 변수로 선언되어 있어야 정상 작동함
    const seaObsUrl = `/api/seaObs`;
    
    try {
        const res = await fetch(seaObsUrl);
        if (!res.ok) throw new Error("KMA API Server Error");
        
        // 기상청 텍스트 데이터가 한글(euc-kr)로 인코딩되어 있어서 텍스트 깨짐을 막기 위해 arrayBuffer로 받아 디코딩 처리함
        const buffer = await res.arrayBuffer();
        cachedSeaObsLines = new TextDecoder('euc-kr').decode(buffer).split('\n').filter(l => l.trim() !== '' && !l.startsWith('#'));
        
        // 세팅 완료 플래그를 true로 변경함
        isInitialized = true;
        console.log("[System] 날씨 및 해양 데이터 통합 시스템 초기화 완료");
    } catch (e) {
        console.error("[initWeatherSystem] 초기화 실패:", e);
    }
}

/**
 * [단기예보용] 위경도(GPS) 좌표를 기상청 전용 격자(NX, NY)로 변환하는 함수
 * 기상청은 일반 위경도를 쓰지 않고 한반도를 바둑판처럼 나눈 격자를 쓰기 때문에 이 변환 과정이 필수임 (람베르트 정각원추도법 적용)
 */
function convertGrid(lat, lon) {
    // 변환에 필요한 기상청 공식 지구 반경 및 격자 규격 상수들임
    const RE = 6371.00877; 
    const GRID = 5.0;      
    const SLAT1 = 30.0;    
    const SLAT2 = 60.0;    
    const OLON = 126.0;    
    const OLAT = 38.0;     
    const XO = 43;         
    const YO = 136;        

    // 각도를 라디안으로 변환하는 상수
    const DEGRAD = Math.PI / 180.0;
    
    const re = RE / GRID;
    const slat1 = SLAT1 * DEGRAD;
    const slat2 = SLAT2 * DEGRAD;
    const olon = OLON * DEGRAD;
    const olat = OLAT * DEGRAD;

    // 투영 계수 계산 (복잡한 구면 삼각법 수식임)
    let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
    let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
    sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
    let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
    ro = (re * sf) / Math.pow(ro, sn);
    
    let ra = Math.tan(Math.PI * 0.25 + (lat) * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    let theta = lon * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;

    // 계산된 X, Y 좌표를 반올림하여 최종 nx, ny 정수 격자값으로 반환함
    return {
        nx: Math.floor(ra * Math.sin(theta) + XO + 0.5),
        ny: Math.floor(ro - Math.cos(theta) * ra + YO + 0.5)
    };
}

/**
 * 지구가 둥글다는 것을 고려하여 하버사인(Haversine) 공식으로 두 위경도 좌표 간의 실제 거리를 구하는 유틸리티 함수임
 * 사용자의 현재 위치와 가장 가까운 바다 관측소를 찾을 때 사용함
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름(km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

/**
 * YYYYMMDD 형태의 문자열 8자리를 자바스크립트 Date 객체로 변환해 주는 헬퍼 함수임
 * 날짜 간의 덧셈/뺄셈(며칠 뒤인지 계산)을 할 때 요긴하게 쓰임
 */
function parseDateString(dateStr) {
    return new Date(dateStr.substring(0, 4), parseInt(dateStr.substring(4, 6)) - 1, dateStr.substring(6, 8));
}

/**
 * [해양통신] 수만 줄짜리 캐싱된 텍스트 배열에서 내가 원하는 관측소의 코드명(keyword)이 들어간 한 줄만 딱 뽑아내는 함수임
 */
function findSeaObsData(lines, tp, keyword) {
    const targetLine = lines.find(line => {
        const columns = line.split(',').map(item => item.trim());
        // 0번째 열(장비타입)이 일치하고 3번째 열(관측소명)에 키워드가 포함되어 있는지 검사함
        return columns[0] === tp && columns[3] && columns[3].includes(keyword);
    });
    // 찾았으면 콤마 기준으로 쪼개서 배열로 반환하고, 없으면 null 처리함
    return targetLine ? targetLine.split(',').map(item => item.trim()) : null;
}

/**
 * [해양통신] 국립해양조사원(KHOA)의 실시간 조위(물높이) API를 호출하는 함수임
 */
async function fetchKhoaTideData(obsCode) {
    if (!obsCode) return null;
    const url = `/api/tide?obsCode=${obsCode}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        
        const rawText = await response.text();
        const data = JSON.parse(rawText);
        
        // 깊숙한 JSON 구조를 뚫고 들어가 실제 데이터 배열을 꺼냄
        const items = data?.body?.items?.item;
        if (items && items.length > 0) {
            return {
                obsCode: obsCode,
                obsvtrNm: items[0].obsvtrNm,
                obsrvnDt: items[0].obsrvnDt,
                bscTdlvHgt: items[0].bscTdlvHgt // 조위(cm)
            };
        }
        return null;
    } catch (error) {
        // 통신이 실패해도 앱 전체가 죽지 않도록 에러만 찍고 null을 반환하여 부드럽게 넘김
        console.error(`[fetchKhoaTideData] Error for obsCode ${obsCode}:`, error);
        return null;
    }
}

/**
 * [단기예보] 기상청 단기예보(오늘~3일 뒤) API 호출 및 파싱 로직
 * 오늘 데이터는 1시간 단위로(hourly), 내일~모레 데이터는 일 단위(daily) 요약본으로 가공해서 반환함
 */
async function fetchKmaShortTermWeather(nx, ny, targetDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const baseDate = `${year}${month}${day}`;
    // 단기예보를 안정적으로 받아오기 위해 새벽 5시(0500) 발표 데이터를 기준으로 삼음
    const baseTime = "0500"; 

    // 미래 3일치 데이터를 빠짐없이 긁어오기 위해 numOfRows를 1000이라는 큰 숫자로 세팅함
    const fcstUrl = `/api/shortTerm?base_date=${baseDate}&base_time=${baseTime}&nx=${nx}&ny=${ny}`;
    
    let result = { hourly: [], daily: [] };

    try {
        const res = await fetch(fcstUrl);
        if (!res.ok) return result;

        const fcstData = await res.json();
        const items = fcstData?.response?.body?.items?.item || [];

        const hourlyMap = {};
        const dailyMap = {};
        const mapSkyStatus = { '1': '맑음', '3': '구름많음', '4': '흐림' };

        items.forEach(item => {
            const fDate = item.fcstDate; // 예보 날짜
            const fTime = item.fcstTime; // 예보 시간
            const val = item.fcstValue;  // 예보 값

            // 1. 당일(오늘) 데이터 처리: 시간대별로 묶음
            if (fDate === targetDate) {
                // 지나간 과거 시간은 버리고 현재 시간(now.getHours) 이후의 데이터만 화면에 뿌리기 위해 필터링함
                if (parseInt(fTime.substring(0, 2)) >= now.getHours()) {
                    if (!hourlyMap[fTime]) {
                        // 기본 객체 구조에 pop(강수확률) 필드를 추가함
                        hourlyMap[fTime] = { hour: fTime.substring(0, 2) + "시", temp: "자료없음", sky: "자료없음", pop: "자료없음" };
                    }
                    if (item.category === 'TMP') hourlyMap[fTime].temp = val + ' ℃';
                    if (item.category === 'SKY') hourlyMap[fTime].sky = mapSkyStatus[val] || '자료없음';
                    if (item.category === 'POP') hourlyMap[fTime].pop = val + '%'; // 시간별 강수확률 파싱 로직 추가함
                }
            } 
            // 2. 미래(내일~글피) 데이터 처리: 중기예보랑 합치기 위해 일별로 데이터를 압축함
            else if (fDate > targetDate) {
                if (!dailyMap[fDate]) {
                    dailyMap[fDate] = { 
                        date: fDate, temps: [], 
                        skyAm: "자료없음", skyPm: "자료없음", 
                        popAm: "0%", popPm: "0%" 
                    };
                }
                
                // 일일 최저/최고 기온을 계산하기 위해 해당 날짜의 모든 기온(TMP)을 배열에 일단 밀어 넣음
                if (item.category === 'TMP') dailyMap[fDate].temps.push(parseFloat(val));
                
                // 오전(09시)과 오후(15시) 하늘 상태를 대표값으로 샘플링함
                if (item.category === 'SKY') {
                    if (fTime === '0900') dailyMap[fDate].skyAm = mapSkyStatus[val];
                    if (fTime === '1500') dailyMap[fDate].skyPm = mapSkyStatus[val];
                }
                // 오전(09시)과 오후(15시) 강수 확률을 대표값으로 샘플링함
                if (item.category === 'POP') {
                    if (fTime === '0900') dailyMap[fDate].popAm = val + '%';
                    if (fTime === '1500') dailyMap[fDate].popPm = val + '%';
                }
            }
        });

        // 맵에 쌓인 객체들을 시간순(오름차순)으로 정렬하여 최종 배열로 만듦
        result.hourly = Object.values(hourlyMap).sort((a, b) => a.hour.localeCompare(b.hour));
        const tDateObj = parseDateString(targetDate);

        // 일별 요약 데이터 가공: 모아둔 기온 배열에서 Math.min, Math.max로 최저/최고 기온을 뽑아냄
        result.daily = Object.values(dailyMap).map(day => {
            const fDateObj = parseDateString(day.date);
            // 목표 날짜 대비 며칠 뒤인지(dayOffSet) 숫자로 계산함 (중기예보 배열과 자연스럽게 이어붙이기 위함)
            const diffDays = Math.ceil(Math.abs(fDateObj - tDateObj) / (1000 * 60 * 60 * 24)); 
            
            const minT = Math.min(...day.temps);
            const maxT = Math.max(...day.temps);

            return {
                dayOffSet: diffDays, 
                // 온도가 없어서 Infinity가 나오면 방어 코드로 하이픈(-) 처리함
                minTemp: (minT !== Infinity ? minT : "-") + " ℃",
                maxTemp: (maxT !== -Infinity ? maxT : "-") + " ℃",
                skyAm: day.skyAm,
                skyPm: day.skyPm,
                popAm: day.popAm,
                popPm: day.popPm
            };
        });

        return result;
    } catch (e) {
        console.error("[fetchKmaShortTermWeather] 단기예보 호출 실패:", e);
        return result;
    }
}

/**
 * [중기예보] 기상청 주간예보 발표 시간(tmFc)을 계산하는 함수
 * 중기예보는 매일 06시, 18시에만 발표하므로 현재 시간이 그 경계에 걸쳐있는지 확인해야 에러가 안 남
 */
function getMidTermBaseTime() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = now.getHours();

    let baseHour = "0600";
    let baseDate = `${year}${month}${date}`;

    // 아직 새벽 6시가 안 넘었으면 전날 18시 데이터를 써야 함
    if (hours < 6) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        baseDate = `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`;
        baseHour = "1800";
    } 
    // 저녁 6시가 넘었으면 최신 업데이트된 오늘 18시 데이터를 씀
    else if (hours >= 18) {
        baseHour = "1800";
    }
    // 그 외(06시~17시 59분)는 기본값인 오늘 06시 데이터를 유지함

    return `${baseDate}${baseHour}`;
}

/**
 * [중기예보] 주간 기온(최저/최고) 및 육상 예보(하늘/강수확률) 2개 API를 통합 조회하는 함수
 * (4일 뒤 ~ 10일 뒤 데이터를 커버함)
 */
async function fetchMidTermWeather(taRegId, landRegId) {
    const tmFc = getMidTermBaseTime();
    
    // API 주소를 각각 분리해서 준비함
    const taUrl = `/api/midTermTa?regId=${taRegId}&tmFc=${tmFc}`;
    const landUrl = `/api/midTermLand?regId=${landRegId}&tmFc=${tmFc}`;
    
    let weeklyArray = [];

    try {
        // Promise.all을 써서 기온과 육상 예보를 동시에 병렬로 던지고 기다림 (통신 속도 단축)
        const [taRes, landRes] = await Promise.all([fetch(taUrl), fetch(landUrl)]);
        
        if (taRes.ok && landRes.ok) {
            const taData = await taRes.json();
            const landData = await landRes.json();
            
            const taItem = taData?.response?.body?.items?.item?.[0];
            const landItem = landData?.response?.body?.items?.item?.[0];

            if (taItem && landItem) {
                // 기상청 최신 명세(2024.11)에 따르면 06시 발표는 4일 후부터, 18시 발표는 5일 후부터 데이터가 존재함
                const is0600 = tmFc.endsWith("0600");
                const startDay = is0600 ? 4 : 5; 
                
                // 최대 10일 뒤까지 반복문을 돌며 객체를 하나씩 생성해서 배열에 밀어 넣음
                for (let i = startDay; i <= 10; i++) {
                    const dayData = {
                        dayOffSet: i, 
                        minTemp: taItem[`taMin${i}`] ? taItem[`taMin${i}`] + ' ℃' : "자료없음",
                        maxTemp: taItem[`taMax${i}`] ? taItem[`taMax${i}`] + ' ℃' : "자료없음"
                    };

                    // 4~7일차는 오전/오후 예보가 나뉘어져 있고, 8~10일차는 하루 통합 예보로만 나오는 기상청 규칙을 분기 처리함
                    if (i <= 7) {
                        dayData.skyAm = landItem[`wf${i}Am`]; 
                        dayData.skyPm = landItem[`wf${i}Pm`]; 
                        dayData.popAm = landItem[`rnSt${i}Am`] + '%'; 
                        dayData.popPm = landItem[`rnSt${i}Pm`] + '%'; 
                    } else {
                        dayData.skyAm = landItem[`wf${i}`]; 
                        dayData.skyPm = landItem[`wf${i}`];
                        dayData.popAm = landItem[`rnSt${i}`] + '%';
                        dayData.popPm = landItem[`rnSt${i}`] + '%';
                    }

                    weeklyArray.push(dayData);
                }
            }
        }
    } catch (e) {
        console.error("[fetchMidTermWeather] 중기예보 호출 실패:", e);
    }
    
    return weeklyArray;
}

/**
 * [해양통신] 사용자가 선택한 위경도를 기반으로 전국 가상 관측소들을 거리가 가까운 순서대로 정렬하여 반환하는 함수
 * (결측치 발생 시 가장 가까운 다른 관측소 데이터를 빌려오기 위해 배열로 반환함)
 */
function getSortedMarineStations(lat, lon) {
    let stationsList = [];

    // VIRTUAL_STATION_MAP 객체를 통째로 순회하면서 모든 관측소와의 거리를 계산함
    for (const region in VIRTUAL_STATION_MAP) {
        for (const station of VIRTUAL_STATION_MAP[region]) {
            const tideData = findSeaObsData(cachedSeaObsLines, station.tideStation.tp, station.tideStation.keyword);
            // 텍스트에서 파싱해온 실제 관측소의 경도(4번째), 위도(5번째) 값이 유효할 때만 거리 계산을 수행함
            if (tideData && tideData[4] && tideData[5]) { 
                const sLon = parseFloat(tideData[4]);
                const sLat = parseFloat(tideData[5]);
                const dist = getDistance(lat, lon, sLat, sLon);
                
                stationsList.push({ station: station, dist: dist });
            }
        }
    }
    // 거리가 가까운 순(오름차순)으로 정렬하여 최종 배열을 반환함
    return stationsList.sort((a, b) => a.dist - b.dist);
}

/**
 * [최종 통합 오케스트레이션 함수]
 * 사용자가 던져준 위경도(lat, lon)와 날짜(targetDate)를 바탕으로 단기예보, 중기예보, 해양 실시간 데이터를 모두 모아 하나의 객체로 이쁘게 포장해서 프론트엔드로 넘김
 */
async function getWeatherDataByCoords(lat, lon, targetDate) {
    // 혹시 초기화가 안 되어 있다면 여기서 강제로 한번 실행시킴
    if (!isInitialized) await initWeatherSystem();

    // 1. 단기 예보 호출 (오늘치 시간별 데이터와 1~3일치 일별 요약본을 가져옴)
    const grid = convertGrid(lat, lon); 
    const shortTermData = await fetchKmaShortTermWeather(grid.nx, grid.ny, targetDate); 

    // 2. 중기 예보 호출 (4~10일치 주간예보를 가져옴. 하드코딩된 코드는 창원/경남 기준임)
    const midTermData = await fetchMidTermWeather('11H20301', '11H20000');

    // 3. 육상 주간 배열 병합 작업
    // 단기예보에서 뽑아온 1~3일치 데이터와 중기예보 4~10일치 데이터를 빈틈없이 하나로 연결하는 과정임
    const combinedMidTermMap = {};
    
    // 맵에 1~3일차를 먼저 채워 넣음
    shortTermData.daily.forEach(day => {
        combinedMidTermMap[day.dayOffSet] = day;
    });
    // 맵에 4~10일차를 마저 채워 넣음 (이미 데이터가 있으면 덮어쓰지 않고 넘어감)
    midTermData.forEach(day => {
        if (!combinedMidTermMap[day.dayOffSet]) {
            combinedMidTermMap[day.dayOffSet] = day;
        }
    });
    
    // dayOffSet(며칠 뒤) 기준으로 오름차순 정렬하여 1일부터 10일까지 이어지는 깔끔한 배열 완성함
    const finalWeeklyArray = Object.values(combinedMidTermMap).sort((a, b) => a.dayOffSet - b.dayOffSet);

    // 4. 해양 실시간 데이터 통신 가동 및 결측치 보정(Fallback) 로직
    const sortedStations = getSortedMarineStations(lat, lon);
    let marineWeather = null;

    if (sortedStations.length > 0) {
        // 기상청 센서 고장으로 인한 결측치(null, '-', '-99')를 안전하게 거르는 헬퍼 함수임
        const getKmaVal = (arr, idx) => {
            if (!arr || !arr[idx]) return null;
            const val = arr[idx].trim();
            return (val === 'null' || val === '-' || val === '' || val === '-99.0' || val === '-99') ? null : val;
        };

        // 가장 가까운 관측소를 메인(스팟 이름 제공용)으로 잡음
        const nearestStation = sortedStations[0].station;

        // 데이터를 덧씌울 빈 껍데기 객체를 준비함
        marineWeather = {
            spotName: nearestStation.spotName,
            waterTemp: null,
            waveHeight: null,
            tideLevel: null,
            windSpeed: null,
            windDirection: null
        };

        // 거리가 가까운 관측소부터 순회하며 빈 값이 있으면 그 값을 빌려와서 채움
        for (const item of sortedStations) {
            const currentStation = item.station;
            const waveData = findSeaObsData(cachedSeaObsLines, currentStation.waveStation.tp, currentStation.waveStation.keyword);
            const tideData = findSeaObsData(cachedSeaObsLines, currentStation.tideStation.tp, currentStation.tideStation.keyword);

            // 파고부이와 조위관측소 데이터 중 하나라도 유효한 값이 있고, 현재 marineWeather에 값이 비어있다면 채움
            if (marineWeather.waterTemp === null) marineWeather.waterTemp = getKmaVal(waveData, 10) || getKmaVal(tideData, 10);
            if (marineWeather.waveHeight === null) marineWeather.waveHeight = getKmaVal(waveData, 6);
            if (marineWeather.windSpeed === null) marineWeather.windSpeed = getKmaVal(tideData, 8) || getKmaVal(waveData, 8);
            if (marineWeather.windDirection === null) marineWeather.windDirection = getKmaVal(tideData, 7) || getKmaVal(waveData, 7);
            
            // 조위 데이터는 별도 API 통신이 필요하므로 값이 비어있을 때만 비동기로 통신을 시도함
            if (marineWeather.tideLevel === null) {
                const khoaTideData = await fetchKhoaTideData(currentStation.tideObsCode);
                if (khoaTideData && khoaTideData.bscTdlvHgt) {
                    marineWeather.tideLevel = khoaTideData.bscTdlvHgt;
                }
            }

            // 모든 해양 데이터 항목이 성공적으로 채워졌다면 더 이상 먼 관측소를 뒤질 필요 없이 반복문을 종료함
            if (marineWeather.waterTemp && marineWeather.waveHeight && marineWeather.windSpeed && marineWeather.windDirection && marineWeather.tideLevel) {
                break;
            }
        }
    }

    // 5. 프론트엔드가 화면에 그리기 좋게 최종 구조를 잡아서 반환함
    return {
        requestedCoords: { lat, lon }, // 요청받은 좌표 확인용
        targetDate: targetDate,        // 기준이 된 날짜
        landShortTerm: shortTermData.hourly, // 오늘 하루 동안의 시간별 촘촘한 날씨 (내부에 pop 필드가 추가됨)
        landMidTerm: finalWeeklyArray,       // 1일 뒤부터 10일 뒤까지 하나로 합쳐진 일별 주간 날씨
        marine: marineWeather                // 결측치가 보정된 해양 실황 데이터
    };
}