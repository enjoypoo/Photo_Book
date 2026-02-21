# 📸 아이 포토북 (Kids Photo Book)

아이의 소중한 순간을 사진, 이야기, 위치, 날씨와 함께 기록하는 스마트폰 앱입니다.

## 주요 기능

- **앨범 생성**: 여러 장의 사진을 한 페이지에 등록
- **상세 기록**: 날짜, 촬영 위치(GPS 자동 감지), 날씨, 전체 이야기 작성
- **개별 캡션**: 각 사진마다 독립적인 캡션/설명 작성
- **날짜별 목록**: 월별로 그룹화된 앨범 리스트
- **PDF 내보내기**: 선택한 앨범을 소책자 형태의 PDF로 생성 및 공유
- **풀스크린 사진 보기**: 사진 탭하면 전체화면으로 감상

## 기술 스택

- **Framework**: Expo (React Native) + TypeScript
- **Navigation**: React Navigation v7
- **Storage**: AsyncStorage
- **Image Picker**: expo-image-picker
- **Location**: expo-location
- **PDF**: expo-print + expo-sharing

## 설치 및 실행

```bash
npm install
npx expo start
```

iOS 시뮬레이터: `i` / Android 에뮬레이터: `a`

## 프로젝트 구조

```
src/
  types/        # TypeScript 타입 정의
  constants/    # 색상, 날씨 옵션 등 상수
  store/        # AsyncStorage CRUD
  utils/        # 날짜 포맷, PDF 생성
  screens/      # 화면 컴포넌트
    HomeScreen.tsx         # 홈 (앨범 목록)
    CreateAlbumScreen.tsx  # 앨범 생성/수정
    AlbumDetailScreen.tsx  # 앨범 상세보기
    ExportPDFScreen.tsx    # PDF 내보내기
  components/   # 재사용 컴포넌트
    AlbumCard.tsx          # 앨범 목록 카드
```

## 권한

- 카메라 (사진 촬영)
- 사진 라이브러리 (사진 선택)
- 위치 (GPS 자동 감지)
