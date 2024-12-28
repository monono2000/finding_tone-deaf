import os
import librosa
import ffmpeg 
import numpy as np
from scipy.spatial.distance import euclidean
from fastdtw import fastdtw
from flask import Flask, request, redirect, url_for, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 모든 CORS 요청 허용

@app.route('/favicon.ico')
def favicon():
    return '', 204  # 204 No Content 상태 코드 반환

# 기본 노래 경로 설정
BASE_SONGS = {
    "little_star": "static/songs/little_star.wav",
    "eta": "static/songs/eta.wav",
    "love_yonsei": "static/songs/love_yonsei.wav",
}

# MFCC 특징 추출 함수
def extract_mfcc(file_path):
    y, sr = librosa.load(file_path, sr=16000)  # 오디오 로드
    y = librosa.to_mono(y)  # 단일 채널로 변환
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13).T  # MFCC 추출
    return mfcc

# DTW 유사도 계산 함수
def calculate_similarity(base_path, uploaded_path):
    mfcc_base = extract_mfcc(base_path)
    mfcc_uploaded = extract_mfcc(uploaded_path)
    distance, _ = fastdtw(mfcc_base, mfcc_uploaded, dist=euclidean)
    return distance


def convert_mp3_to_wav(mp3_path, wav_path):
    try:
        ffmpeg.input(mp3_path).output(wav_path).run()  # ffmpeg로 MP3 -> WAV 변환
    except ffmpeg.Error as e:
        print(f"Error converting file: {e}")
        raise

@app.route('/')
def index():
    return render_template('index.html')  # 기본 경로에서 index.html 렌더링

@app.route('/song1')
def song1():
    return render_template('song1.html')

@app.route('/song2')
def song2():
    return render_template('song2.html')

@app.route('/song3')
def song3():
    return render_template('song3.html')


# 파일 업로드 및 비교 API
@app.route('/compare', methods=['POST'])
def compare():
    if 'file' not in request.files or 'song_key' not in request.form:
        return jsonify({"error": "No file or song_key provided"}), 400

    uploaded_file = request.files['file']
    song_key = request.form['song_key']

    if song_key not in BASE_SONGS:
        return jsonify({"error": "Invalid song_key provided"}), 400

    # 파일 저장 및 분석 로직
    upload_path = os.path.join("uploads", uploaded_file.filename)
    uploaded_file.save(upload_path)

    if uploaded_file.filename.endswith('.mp3'):
        wav_path = os.path.splitext(upload_path)[0] + '.wav'
        convert_mp3_to_wav(upload_path, wav_path)  # MP3를 WAV로 변환
        upload_path = wav_path  # 변환된 WAV 경로로 업로드 경로 변경
    
    base_path = BASE_SONGS[song_key]
    distance = calculate_similarity(base_path, upload_path)

    print(f"유사도 값: {distance}")

    # 유사도 기준에 따라 JSON 응답 반환
    if distance < 35000:
        return jsonify({"redirect_url": "/good"}), 200
    elif distance < 70000:
        return jsonify({"redirect_url": "/soso"}), 200
    else :
        return jsonify({"redirect_url": "/bad"}), 200

    
@app.route('/good')
def good():
    return render_template('good.html')  # good.html 반환

#실패페이지
@app.route('/bad')
def bad():
    return render_template('bad.html')  # bad.html 반환

@app.route('/soso')
def soso():
    return render_template('soso.html')  # bad.html 반환



if __name__ == '__main__':
    os.makedirs("uploads", exist_ok=True)
    app.run(debug=True)
