// 1. 지도 오브젝트 태그 가져오기
const MapObject = document.getElementById("svgObject");

// 중복으로 클릭 귀(Event Listener)가 달리는 것을 막는 자물쇠 변수
let isEventAttached = false;

/**
 * 지도 내부의 스팟들을 찾아서 클릭 이벤트를 심어주는 핵심 함수
 */
function setupMapEvents() {
    if (isEventAttached) return; // 이미 이벤트를 달았다면 중복 실행 방지!
    isEventAttached = true;
    
    // object 태그 안의 실제 SVG 문서 뚫고 들어가기
    const SvgDoc = MapObject.contentDocument;

    if (!SvgDoc) {
        console.error("❌ [main.js] SVG 파일 내부 요소에 접근할 수 없습니다. Live Server로 실행 중인지 확인하세요.");
        return;
    }

    // SVG 내부에서 class="WSpot"을 가진 모든 아이콘 찾기
    const WSpots = SvgDoc.querySelectorAll(".WSpot");
    console.log(`🎣 [main.js] 지도에서 찾은 날씨 스팟 개수: ${WSpots.length}개`);

    WSpots.forEach(Spot => {
        Spot.addEventListener('click', function(event) {
            // 혹시 모를 이벤트 버블링(중복 클릭 현상) 차단
            event.stopPropagation();
            
            // 클릭한 스팟의 data-spot 값 가져오기 및 공백 제거
            const rawSpotName = Spot.getAttribute('data-spot');
            const SpotName = rawSpotName ? rawSpotName.trim() : "";

            console.log(`🎯 [지도 클릭!] 가져온 이름표: [${SpotName}]`);

            // mapData.js가 채워놓은 전역 창고 확인
            if (!window.GlobalOceanData) {
                alert("아직 해양 데이터 창고가 준비되지 않았습니다.");
                return;
            }

            // 창고에서 이름표가 일치하는 데이터 칸 꺼내기
            const TargetData = window.GlobalOceanData[SpotName];

            if (TargetData) {
                console.log("✅ 데이터 매칭 성공! 바텀 시트를 출력합니다.");
                
                // 바텀 시트 내부 HTML 동적으로 갈아 끼우기
                const SheetContent = document.getElementById('SheetContent');
                SheetContent.innerHTML = `
                    <h2 style="margin-top: 0;">${SpotName}</h2>
                    <ul style="line-height: 1.8; list-style: none; padding-left: 0;">
                        <li><strong>🌡️ 수온:</strong> ${TargetData.WaterTemp}</li>
                        <li><strong>☀️ 기온:</strong> ${TargetData.AirTemp}</li>
                        <li><strong>💨 풍속:</strong> ${TargetData.WindSpeed}</li>
                        <li><strong>🧭 풍향:</strong> ${TargetData.WindDirection}</li>
                        <li><strong>🌊 유의파고:</strong> ${TargetData.WaveHeight}</li>
                        <li><strong>물높이(조위):</strong> ${TargetData.TideLevel}</li>
                    </ul>
                `;

                // CSS 클래스를 추가해서 화면 밑에서 스르륵 올리기
                document.getElementById('BottomSheet').classList.add('Show');
            } else {
                console.warn(`❌ 창고에서 [${SpotName}] 데이터를 찾지 못했습니다.`);
                alert(`데이터가 없습니다: [${SpotName}]`);
            }
        });
    });

    // 낚시 스팟 클릭 이벤트 설정
    const FishSpots = SvgDoc.querySelectorAll(".FishSpot");
    console.log(" [main.js] 지도에서 찾은 낚시 스팟 개수: ${FishSpots.length}개");

    FishSpots.forEach(Spot => {
        Spot.addEventListener('click', function(event){
            event.stopPropagation();

            // 낚시 스팟의 이름표 가져오기 (SVG에 data-spot 속성 삽입 필요)
            const RawSpotName = Spot.getAttribute('data-spot');
            const SpotName = RawSpotName ? RawSpotName.trim() : "";

            // 현재 몇월인지 확인 (1~12월)
            const CurrentMonth = new Date().getMonth() + 1;
            console.log('[낚시 스팟 클릭] 이름표 : [${SpotName}], 현재 월 : ${CurrentMonth}월'); // 이건 디버깅용이라 배포땐 없애야함 

            // 하드 코딩한 물고기 데이터에서 스팟 정보 찾기
            const SpotData = FishSpotData[SpotName];
            if (SpotData && SpotData.FishByMonth[CurrentMonth]) {
                const CurrentFishes = SpotData.FishByMonth[CurrentMonth];
                console.log('${SpotName}의 ${CurrentMonth}월 어종 데이터 매칭 성공', CurrentFishes);

                // 여기에 팝업이나 새로운 바텀 시트 올리는 로직 작성하면 될듯?
                // 데이터 HTML로 변환
                let FishListHTML = CurrentFishes.map(fish => {
                    return `<li>
                        <a href="${fish.link}" style="display: block; padding: 10px; background: #f2f4f6; border-radius: 10px; margin-bottom: 8px; text-decoration: none; color: #191f28; font-weight: bold;">
                            ${fish.FishName} 정보 보기
                        </a>
                    </li>`; 
                }).join('');
                // 바텀 시트 데이터 삽입
                const FishSheetContent = document.getElementById('FishSheetContent');
                FishSheetContent.innerHTML = `
                    <h2 style="margin-top: 0; color: #2957a8;">${SpotName} (${CurrentMonth}월)</h2>
                    <p style="color: #4e5968; margin-bottom: 15px;">이달의 추천 어종을 확인해 보세요!</p>
                    <ul style="list-style: none; padding-left: 0;">
                        ${FishListHTML}
                    </ul>
                `;
                // 바텀 시트 스윽 올리기
                document.getElementById('FishBottomSheet').classList.add('Show');
                alert(`${SpotName}의 ${CurrentMonth}월 추천 어종은 ${CurrentFishes[0].FishName} 등 총 ${CurrentFishes.length}종 입니다!`);
            } else{
                console.warn(`❌ [${SpotName}]의 ${CurrentMonth}월 어종 데이터가 없습니다.`);
                // alert 위아래 이것들은 시트 넣기 전에 임시 출력용임.
                alert(`${SpotName}의 이번 달 어종 데이터가 준비되지 않았습니다.`);
            }
        });
    });
}

/**
 * 🛠️ 핵심 연결고리: mapData.js가 보낸 데이터 로딩 완료 신호(dataReady)를 기다림
 */
window.addEventListener('dataReady', () => {
    console.log("🔔 [main.js] 전국 데이터 적재 완료 신호를 받았습니다! 지도 연결을 시작합니다.");
    setupMapEvents();
});

// 시트 닫기 버튼 로직들 (사이드, 바텀 시트)

// 바텀 시트 닫기(X) 버튼 로직
const closeBtn = document.getElementById('CloseSheetBtn');
if (closeBtn) {
    closeBtn.addEventListener('click', function() {
        document.getElementById('BottomSheet').classList.remove('Show');
    });
}
// 낚시 어종 바텀 시트 닫기(X) 버튼 로직
const closeFishBtn = document.getElementById('CloseFishSheetBtn');
if (closeFishBtn) {
    closeFishBtn.addEventListener('click', function() {
        document.getElementById('FishBottomSheet').classList.remove('Show');
    });
}
// 사이드 시트 여닫기 로직
const infoBtn = document.getElementById('InfoBtn');
const sideSheet = document.getElementById('SideSheet');
const sideCloseBtn = document.getElementById('SideCloseBtn');


// 정보 버튼 클릭 시 사이드 시트 열기
if (infoBtn) {
    infoBtn.addEventListener('click', function() {
        sideSheet.classList.add('Show');
    });
}

// 사이드 시트 닫기 버튼 클릭 시 닫기
if (sideCloseBtn) {
    sideCloseBtn.addEventListener('click', function() {
        sideSheet.classList.remove('Show');
    });
}


/**
 * 시간별 날씨 칸들에 HTML을 생성해 삽입하는 렌더링 함수
 */
function renderHourlyWeather(hourlyDataArray) {
    // 1. getElementById 대신 querySelector를 사용합니다. 
    // (클래스명을 찾을 때는 CSS처럼 앞에 점(.)을 꼭 찍어야 합니다!)
    const scrollContainer = document.querySelector('.hourlyScroll');
    
    if (!scrollContainer) {
        console.warn("시간별 날씨 컨테이너(.hourlyScroll)를 찾을 수 없습니다.");
        return;
    }

    let htmlContent = '';

    hourlyDataArray.forEach((hourItem, index) => {
        let displayTime = index === 0 ? "현재" : hourItem.hour; // 첫 칸은 '현재'
        
        // 하늘상태 이모지
        let skyIcon = '☀️';
        if (hourItem.sky === '구름많음') skyIcon = '⛅';
        if (hourItem.sky === '흐림') skyIcon = '☁️';
        if (hourItem.pop !== '자료없음' && parseInt(hourItem.pop) > 50) skyIcon = '🌧️';

        // 2. 올려주신 HTML 코드에 맞춰서 클래스명을 'hourlyItem'으로 맞췄습니다.
        htmlContent += `
            <div class="hourlyItem">
                <span class="time">${displayTime}</span>
                <span class="icon">${skyIcon}</span>
                <span class="temp">${hourItem.temp}</span>
            </div>
        `;
    });

    // 컨테이너 안에 생성된 HTML 덩어리를 쏙 집어넣습니다.
    scrollContainer.innerHTML = htmlContent;
}

/**
 * 🌐 브라우저/스마트폰 GPS 좌표를 Promise 기반으로 가져오는 헬퍼 함수
 */
function getUserGPS() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("이 브라우저는 GPS를 지원하지 않습니다."));
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude
                });
            },
            (error) => reject(error),
            { enableHighAccuracy: true, timeout: 7000 } // 7초 동안 GPS 신호 대기
        );
    });
}

/**
 * 🛠️ 앱 로드 시 실제 GPS와 네이버 API를 이용해 주소 및 날씨 불러오기
 */
window.onload = async () => {
    console.log("🔔 메인 화면 날씨 위젯 로딩 시작...");

    // 1. 기본 예비값 설정 (GPS 실패 시 사용할 기존 김해시 기준 좌표 및 텍스트)
    let lat = 35.2285; 
    let lon = 128.8894;
    let addressText = "경상남도 창원시 의창구 (기본 위치)";

    try {
        // 2. 실제 스마트폰/브라우저 GPS 좌표 취득 시도
        const coords = await getUserGPS();
        lat = coords.lat;
        lon = coords.lon;
        console.log(`📍 GPS 좌표 취득 성공: 위도=${lat}, 경도=${lon}`);

        // 3. 2단계에서 만든 Vercel 네이버 주소 변환 프록시 API 호출
        const geoRes = await fetch(`/api/geocode?lat=${lat}&lon=${lon}`);
        if (geoRes.ok) {
            const geoData = await geoRes.json();
            
            // 네이버 행정동 데이터 추출 파싱 (시/도 + 시/군/구 + 읍/면/동)
            if (geoData.results && geoData.results[0]) {
                const region = geoData.results[0].region;
                const area1 = region.area1.name; // 예: 경상남도
                const area2 = region.area2.name; // 예: 창원시 의창구
                const area3 = region.area3.name; // 예: 명서동
                addressText = `${area1} ${area2} ${area3}`;
            }
        } else {
            console.warn("⚠️ 네이버 Geocoding API 응답 실패, 기본 위치 명칭을 사용합니다.");
        }
    } catch (error) {
        // 사용자가 [거부]를 누르거나 타임아웃이 나면 이쪽으로 들어옵니다.
        console.warn("⚠️ GPS 접근 권한이 없거나 오류가 발생하여 기본 위치를 사용합니다:", error.message);
    }

    // 4. index.html에서 만든 상단바 위치 텍스트를 실제 주소로 변경
    const locationElem = document.getElementById("locationText");
    if (locationElem) {
        locationElem.textContent = addressText;
    }

    // 5. 오늘 날짜 구하기 및 날씨 데이터 호출 (기존 작성하신 로직 유지)
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const targetDate = `${year}${month}${day}`;

        // 🌟 하드코딩된 좌표 대신 실제 취득한(혹은 예비용) lat, lon 전달!
        const weatherData = await getWeatherDataByCoords(lat, lon, targetDate);

        if (weatherData && weatherData.landShortTerm) {
            console.log("✅ 날씨 데이터 로드 성공!", weatherData);
            renderHourlyWeather(weatherData.landShortTerm);

            // 상단 날씨 위젯 (WeatherIcon, WeatherStatus, CurrentTemp, HighTemp, LowTemp)
            // 현재 기온 (CurrentTemp)
            const CurrentAirTemp = weatherData.landShortTerm[0].temp; 
            const CurrentTempElem = document.getElementById("CurrentTemp");
            if (CurrentTempElem){
                CurrentTempElem.innerText = `${CurrentAirTemp}℃`;
            }
            // 현재 날씨 상태 아이콘 및 세부설명 (WeatherIcon, WeatherStatus)
            const CurrentSky = weatherData.landShortTerm[0].sky; 
            const CurrentPop = parseInt(weatherData.landShortTerm[0].pop);

            // 하늘 상태랑 강수 확률 종합해서 이모지 결정
            let SkyIcon = '☀️';
            if (CurrentSky === '구름많음') SkyIcon = '⛅';
            if (CurrentSky === '흐림') SkyIcon = '☁️';
            if (!isNaN(CurrentPop) && CurrentPop > 50) SkyIcon = '🌧️';

            // 날씨 아이콘 삽입 (WeatherIcon)
            const IconElem = document.getElementById("WeatherIcon");
            if (IconElem) {
                IconElem.innerText = SkyIcon;
            }

            // 날씨 세부 설명 삽입 (WeatherStatus)
            const StatusElem = document.getElementById("WeatherStatus");
            if (StatusElem) {
                StatusElem.innerText = CurrentSky;
            }

            // 최고/최저 기온 (HighTemp, LowTemp)
            const TempValues = weatherData.landShortTerm.map(item => parseInt(item.temp)).filter(val => !isNaN(val));
            
            if (TempValues.length > 0) {
                // 배열중에 가장 큰값이랑 가장 작은값을 찾아서 최고/최저 기온으로 설정함
                const HighestTemp = Math.max(...TempValues) + "°C";
                const LowestTemp = Math.min(...TempValues) + "°C";

                // 최고 기온 삽입 (HighTemp)
                const HighTempElem = document.getElementById("HighTemp");
                if (HighTempElem) {
                    HighTempElem.innerText = HighestTemp;
                }

                // 최저 기온 삽입 (LowTemp)
                const LowTempElem = document.getElementById("LowTemp");
                if (LowTempElem) {
                    LowTempElem.innerText = LowestTemp;
                }
            }
        }
    } catch (weatherError) {
        console.error("❌ 날씨 데이터를 불러오는 중 치명적 에러 발생:", weatherError);
    }
};