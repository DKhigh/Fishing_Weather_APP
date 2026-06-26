// 아직 미완성 우형이 css 코드 옮기고 마저 수정할 예정

// 1. 지도 오브젝트 태그 가져오기
const MapObject = document.getElementById("SvgObject");

// 2. 지도가 완전히 로드 된 이후 내부 요소에 접근
MapObject.addEventListener("load", function () {
    const SvgDoc = MapObject.contentDocument;

    // 3. SVG 내부의 모든 스팟 아이콘 찾기
    // 우형이가 SVG에 생선 아이콘에 FishSpot이라는 클래스로 부여했다고 가정함
    const FishSpots = SvgDoc.querySelectorAll(".FishSpot");
    FishSpots.forEach(Spot => {
        Spot.addEventListener('click', function() {
            // 4. 클릭한 스팟의 이름표(예: '속초/고성') 가져오기
            // HTML 표준 속성인 data-* 는 소문자를 쓰므로 그대로 둡니다.
            const SpotName = Spot.getAttribute('data-spot');

            // 5. 앞서 API로 받아둔 전역 창고(GlobalOceanData)에서 해당 지역 데이터 꺼내기
            const TargetData = VirtualStationMap[SpotName];

            if (TargetData) {
                // 6. 바텀 시트 안의 HTML 빈칸을 데이터로 갈아 끼우기
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

                // 7. 바텀 시트 스르륵 올리기 (CSS의 Show 클래스 추가)
                document.getElementById('BottomSheet').classList.add('Show');
            } else {
                alert("해당 지역의 날씨 데이터를 불러오지 못했습니다.");
            }
        });
    });
});