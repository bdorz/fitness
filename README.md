# 健身紀錄

Android 健身追蹤 App，使用 React Native 開發。訓練與身體紀錄儲存於本機端，僅在檢查及下載 APP 更新時連線至 GitHub。

[![Build & Release APK](https://github.com/bdorz/fitness/actions/workflows/build.yml/badge.svg)](https://github.com/bdorz/fitness/actions/workflows/build.yml)

## 下載 APK

前往 [Releases 頁面](https://github.com/bdorz/fitness/releases/latest) 下載最新版 APK 安裝。

安裝後也可以開啟 APP 的「設定」分頁，點擊「檢查更新」。有新版本時可直接下載 APK 並啟動 Android 安裝程序；第一次使用可能需要允許 APP 安裝未知來源應用程式。

## 功能

- **訓練類別**：新增胸、背、肩、腿、核心、有氧等訓練日，支援新增／編輯／刪除
- **動作紀錄**：每個類別可新增動作，設定名稱、重量（kg 或 lbs）、組數、次數
- **勾選追蹤**：勾選已完成的動作，進度條顯示完成比例
- **身體紀錄**：每天記錄體重與腰圍，支援同日更新、歷史編輯及刪除
- **近期摘要**：顯示最新體重、最新腰圍與最近 7 筆平均體重
- **重量換算**：kg ⇌ lbs 雙向即時換算，附常用重量對照表
- **APP 內更新**：從 GitHub Releases 檢查版本、下載 APK 並啟動安裝
- **置中圖示**：Android Launcher 啞鈴 ICON 已針對各螢幕密度重新置中

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
- react-native-blob-util 下載 Android 更新 APK
- GitHub Actions 自動建置並發佈 APK

專案採功能分區：畫面、型別與資料存取放在各自的 `src/features` 目錄；導覽與共用主題則分別位於 `src/app`、`src/shared`。完整說明請見 [專案架構](docs/ARCHITECTURE.md)。

APP 內更新具備斷線續傳、三次自動重試及檔案完整性驗證。若設定頁出現錯誤代碼，請參考 [更新錯誤代碼](docs/UPDATE_ERRORS.md)。

## 發布新版本

發布前請同步更新以下版本號：

- `package.json` 的 `version`
- `android/app/build.gradle` 的 `versionCode` 與 `versionName`
- `src/features/settings/updateService.ts` 的 `CURRENT_VERSION`

本機需先安裝 [GitHub CLI](https://cli.github.com/) 並完成 `gh auth login`。提交並推送程式碼後，執行：

```powershell
git add .
git commit -m "release: v1.0.3"
git push origin main
npm run release:android
```

`release:android` 會檢查三處版本號是否一致、建置 APK、建立或更新同版本的 GitHub Release，最後不論成功或失敗都會刪除本機 APK。若只想測試建置，可執行 `npm run build`；APK 會留在 Android 的 `build` 目錄，但該目錄及所有 APK 均已由 Git 忽略。

也可以從 GitHub Actions 手動執行 **Build & Release APK**；工作流程會讀取 `package.json` 版本號，發布後清除 runner 上的 APK。

APP 會查詢 `bdorz/fitness` 的最新 GitHub Release；Release 必須包含 `.apk` 檔案，APP 內下載按鈕才會出現。
