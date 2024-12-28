document.addEventListener('DOMContentLoaded', () => {
    const recordButton = document.querySelector('.custom-record-button');
    const audioPlayer = document.getElementById('audioPlayer');
    const downloadButton = document.getElementById('downloadButton');
    const homeButton = document.getElementById('homeButton');
    const dropZone = document.getElementById('dropZone');
    const loadingScreen = document.getElementById('loadingScreen');
    const container = document.querySelector('.container');  // 원래 화면 요소
    const songKeyInput = document.getElementById('songKey');
    
    // 각 페이지마다 설정된 녹음 시간 읽어오기 (단위: 밀리초)
    const recordingTime = parseInt(document.querySelector('meta[name="record-time"]').content, 10);

    let mediaRecorder;
    let audioChunks = [];

    if (!dropZone || !loadingScreen || !songKeyInput) {
        console.error("필수 요소(dropZone, loadingScreen, songKey)가 없습니다.");
        return;
    }
    // 드래그 오버 이벤트 처리 (드래그 중일 때 스타일 변경)
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault(); // 기본 동작 방지 (드롭을 가능하게 함)
        dropZone.classList.add('dragover'); // 드래그 오버 상태 스타일 추가
    });

    // 드롭 이벤트 처리
    dropZone.addEventListener('drop', (event) => {
        event.preventDefault(); // 기본 동작 방지
        dropZone.classList.remove('dragover'); // 드래그 오버 상태 제거

        const files = event.dataTransfer.files; // 드롭된 파일들
        if (files.length > 0) {
            const file = files[0]; // 첫 번째 파일만 가져오기
            handleFileUpload(file); // 파일 처리 함수 호출
        } else {
            alert('오디오 파일을 업로드하세요!');
        }
    });

    
    // 드래그 앤 드롭 이벤트 설정
    dropZone.addEventListener('drop', (event) => {
        event.preventDefault();
        dropZone.classList.remove('dragover');  // 드래그오버 상태 제거
    
        const files = event.dataTransfer.files;  // 드롭된 파일들
    
        // 파일이 하나라도 있다면
        if (files.length > 0) {
            const file = files[0];  // 첫 번째 파일 가져오기
            const formData = new FormData();
            formData.append('file', file);  // 파일 추가
            formData.append('song_key', songKeyInput.value); // 선택된 노래 키 추가
    
            // 로딩 화면 활성화
            console.log("분석을 시작합니다...");
            loadingScreen.style.display = 'flex'; // 로딩 화면 표시
            dropZone.style.display = 'none'; // 드롭 영역 숨기기
    
            // 서버로 데이터 전송
            fetch('http://127.0.0.1:5000/compare', {
                method: 'POST',
                body: formData,
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('서버 응답 실패');
                }
                return response.json();
            })
            .then(data => {
                loadingScreen.style.display = 'none'; // 로딩 화면 숨기기
                if (data.redirect_url) {
                    window.location.href = data.redirect_url;  // 결과 페이지로 리다이렉트
                } else {
                    alert('서버에서 유효한 URL을 반환하지 않았습니다.');
                }
            })
            .catch(error => {
                console.error("분석 중 오류 발생:", error);
                alert("분석 중 문제가 발생했습니다. 다시 시도해주세요.");
                loadingScreen.style.display = 'none';
                dropZone.style.display = 'block'; // 드롭 영역 복구
            });
        } else {
            alert('오디오 파일을 업로드하세요!');
        }
    });
    

    // 파일 처리 함수
    function handleFileUpload(file) {
        if (file.type.startsWith('audio/')) {
            const fileUrl = URL.createObjectURL(file);
            audioPlayer.src = fileUrl;
            audioPlayer.style.display = 'block';
            
            // 파일 업로드 완료 시 분석 시작
            startAnalysis();
        } else {
            alert('오디오 파일만 업로드 가능합니다.');
        }
    }

    // 분석 시작 함수
    function startAnalysis() {
        // 로딩 화면 보이기
        loadingScreen.style.display = 'flex';
        container.style.display = 'none';
    
        // 업로드된 파일 가져오기
        const formData = new FormData();
        const fileInput = document.getElementById('audioFile'); // 파일 입력 ID 확인
        const songKey = document.getElementById('songKey').value; // 선택된 곡 키
    
        formData.append('file', fileInput.files[0]);
        formData.append('song_key', songKey);
    
        // 서버로 파일 전송
        fetch('/compare', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            // 서버에서 받은 유사도 점수와 리다이렉트 URL
            const score = data.score;
            const redirectUrl = data.redirect_url;
    
            console.log(`Score: ${score}`); // 디버깅용 콘솔 출력
    
            // 로딩 화면 숨기고 결과 화면으로 이동
            loadingScreen.style.display = 'none';
            container.style.display = 'block';
            window.location.href = redirectUrl;
        })
        .catch(error => {
            console.error('Error:', error);
            loadingScreen.style.display = 'none';
            container.style.display = 'block';
            alert('분석 중 오류가 발생했습니다.');
        });
    }
    


    // 녹음 버튼 기능
    recordButton.addEventListener('click', () => {
        if (recordButton.textContent === '녹음 시작') {
            startRecording();
        } else {
            powerStopRecording();
        }
    });

    // 홈 버튼 클릭 이벤트
    homeButton.addEventListener('click', () => {
        window.location.href = '/';  // index.html 대신 '/' 경로로 이동
    });
    

    // 녹음 시작
    async function startRecording() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;

            // 다운로드 링크 활성화
            downloadButton.href = audioUrl;
            downloadButton.style.display = 'inline-block'; // 다운로드 버튼 보이기

            // 자동 다운로드 시작 (파일 이름 지정)
            downloadButton.download = 'recorded_audio.mp3';  // 파일 이름 설정
            downloadButton.click();  // 자동으로 다운로드 클릭 이벤트 실행
        };

        mediaRecorder.start();
        recordButton.textContent = '중단';

        // 녹음 시간이 지나면 자동으로 녹음을 중지
        setTimeout(() => {
            stopRecording();
        }, recordingTime);  // recordingTime에 맞춰 중지 (단위: 밀리초)
    }

    let isPowerStop = false;  // powerStopRecording이 호출되었는지 여부를 추적하는 변수

    // 녹음 중지
    function stopRecording() {
        mediaRecorder.stop();  // 녹음 중지
        recordButton.textContent = '녹음 시작';
        
        // powerStopRecording이 호출되지 않았을 때만 알림 표시
        if (!isPowerStop) {
            alert('녹음이 종료되었습니다.'); 
        }
    }
    
    // powerStopRecording 함수
    function powerStopRecording() {
        mediaRecorder.stop();  // 녹음 중지
        recordButton.textContent = '녹음 시작';
        
        isPowerStop = true;  // powerStopRecording이 호출되었음을 표시
        alert('녹음이 중단되었습니다.');
    }
    
    
});