# 健身紀錄

Android 健身追蹤 App，使用 React Native 開發，完全離線運作，資料儲存於本機端。

[![Build & Release APK](https://github.com/bdorz/fitness/actions/workflows/build.yml/badge.svg)](https://github.com/bdorz/fitness/actions/workflows/build.yml)

## 下載 APK

前往 [Releases 頁面](https://github.com/bdorz/fitness/releases) 下載最新版 APK 安裝。

## 功能

- **訓練類別**：新增胸、背、肩、腿、核心、有氧等訓練日，支援新增／編輯／刪除
- **動作紀錄**：每個類別可新增動作，設定名稱、重量（kg 或 lbs）、組數、次數
- **勾選追蹤**：勾選已完成的動作，進度條顯示完成比例
- **重量換算**：kg ⇌ lbs 雙向即時換算，附常用重量對照表

## 開發環境

### 啟動 Metro

```sh
npm start
```

### 執行 Android

```sh
npm run android
```

## 技術架構

- React Native 0.85.3 + TypeScript
- React Navigation（Stack + Bottom Tab）
- AsyncStorage 本機資料儲存
- GitHub Actions 自動建置並發佈 APK
