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

    // SVG 내부에서 class="FishSpot"을 가진 모든 아이콘 찾기
    const FishSpots = SvgDoc.querySelectorAll(".FishSpot");
    console.log(`🎣 [main.js] 지도에서 찾은 낚시 스팟 개수: ${FishSpots.length}개`);

    FishSpots.forEach(Spot => {
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
}

/**
 * 🛠️ 핵심 연결고리: mapData.js가 보낸 데이터 로딩 완료 신호(dataReady)를 기다림
 */
window.addEventListener('dataReady', () => {
    console.log("🔔 [main.js] 전국 데이터 적재 완료 신호를 받았습니다! 지도 연결을 시작합니다.");
    setupMapEvents();
});

// 바텀 시트 닫기(X) 버튼 로직
const closeBtn = document.getElementById('CloseSheetBtn');
if (closeBtn) {
    closeBtn.addEventListener('click', function() {
        document.getElementById('BottomSheet').classList.remove('Show');
    });
}