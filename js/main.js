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
    console.log(" [main.js] 지도에서 찾은 낚시 스팟 개수: ${FishSpot.length}개");

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