// 1. 지도 오브젝트 태그 가져오기
const MapObject = document.getElementById("SvgObject");

// 🛠️ 중복 실행 방지용 스위치 (팝업 두 번 뜨는 문제 해결!)
let isEventAttached = false;

// [main.js] setupMapEvents 함수를 호출하기 전에 추가
console.log("⏳ [대기 중] 기상청에서 데이터를 불러오는 중입니다...");

// 데이터가 준비되었다는 신호(dataReady)를 받으면 그때 지도 이벤트를 연결
window.addEventListener('dataReady', () => {
    console.log("✅ [완료] 모든 데이터가 창고에 들어왔습니다! 이제 지도를 클릭하세요.");
    setupMapEvents(); 
});

function setupMapEvents() {
    // 이미 한 번 실행됐으면 쿨하게 패스!
    if (isEventAttached) return; 
    isEventAttached = true;
    
    console.log("🔎 [1단계] 지도 설정 함수가 한 번만 안전하게 실행되었어!");
    const SvgDoc = MapObject.contentDocument;

    if (!SvgDoc) return;

    const FishSpots = SvgDoc.querySelectorAll(".FishSpot");

    FishSpots.forEach(Spot => {
        Spot.addEventListener('click', function(event) {
            // 🛠️ 혹시 모를 내부 요소 중복 클릭 이벤트 전파 차단
            event.stopPropagation();
            
            // data-spot 가져오고 앞뒤 공백 무자비하게 제거
            const rawSpotName = Spot.getAttribute('data-spot');
            const SpotName = rawSpotName ? rawSpotName.trim() : "이름표_없음";
            
            console.log(`\n🎯 [클릭 감지!] 가져온 이름표: [${SpotName}]`);
            console.log("📦 현재 창고 데이터 목록:", window.GlobalOceanData);

            // 창고 자체가 없는 경우
            if (!window.GlobalOceanData) {
                console.error("❌ 창고 자체가 없어! dataDisplay.js에서 저장이 안 된 거야.");
                alert("데이터 창고가 비어있습니다.");
                return;
            }

            const TargetData = window.GlobalOceanData[SpotName];

            if (TargetData) {
                console.log("✅ 매칭 성공! 바텀 시트를 올립니다.");
                const SheetContent = document.getElementById('SheetContent');
                SheetContent.innerHTML = `
                    <h2 style="margin-top: 0;">${SpotName}</h2>
                    <ul style="line-height: 1.8;">
                        <li><strong>수온:</strong> ${TargetData.WaterTemp}</li>
                        <li><strong>기온:</strong> ${TargetData.AirTemp}</li>
                        <li><strong>풍속:</strong> ${TargetData.WindSpeed}</li>
                        <li><strong>풍향:</strong> ${TargetData.WindDirection}</li>
                        <li><strong>유의파고:</strong> ${TargetData.WaveHeight}</li>
                        <li><strong>조위:</strong> ${TargetData.TideLevel}</li>
                    </ul>
                `;
                document.getElementById('BottomSheet').classList.add('Show');
            } else {
                console.error(`❌ 창고에서 [${SpotName}] 데이터를 못 찾았어!`);
                alert(`데이터 없음: [${SpotName}]`);
            }
        });
    });
}

// 지도 로딩 타이밍 체크 (자물쇠가 있어서 이제 안전함)
if (MapObject) {
    MapObject.addEventListener("load", setupMapEvents);
    setTimeout(() => {
        if (MapObject.contentDocument && MapObject.contentDocument.querySelector('svg')) {
            setupMapEvents();
        }
    }, 500);
}

// 닫기 버튼 로직
const closeBtn = document.getElementById('CloseSheetBtn');
if (closeBtn) {
    closeBtn.addEventListener('click', function() {
        document.getElementById('BottomSheet').classList.remove('Show');
    });
}