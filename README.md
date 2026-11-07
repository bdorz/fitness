# 健身紀錄

Android-only 健身追蹤 App，使用 React Native 與 TypeScript 開發。訓練與身體紀錄儲存於手機本機，僅在檢查及下載 APP 更新時連線至 GitHub。

[![Build & Release APK](https://github.com/bdorz/fitness/actions/workflows/build.yml/badge.svg)](https://github.com/bdorz/fitness/actions/workflows/build.yml)

## 下載 APK

前往 [Releases 頁面](https://github.com/bdorz/fitness/releases/latest) 下載最新版 APK 安裝。

安裝後也可以開啟 APP 的「設定」分頁，點擊「檢查更新」。有新版本時會交由 Android 系統 DownloadManager 在背景下載 APK，完成後開啟 Android 安裝程序；第一次使用可能需要允許 APP 安裝未知來源應用程式。

## 功能

- **訓練類別**：新增胸、背、肩、腿、核心、有氧等訓練日，支援新增／編輯／刪除
- **動作紀錄**：每個類別可新增動作，設定名稱、重量（kg 或 lbs）、組數、次數與組間休息時間
- **共用動作卡片**：首次輸入動作後可在其他訓練日選用；編輯卡片的名稱、重量與單位會同步到所有關聯紀錄，組數、次數與休息時間各自保存
- **既有動作整理**：相同名稱、重量與單位的舊動作會自動關聯；不同重量的舊卡片保持原樣，可從訓練日的「整理卡片」手動合併
- **組間休息計時**：點擊動作旁的碼表按鈕開始倒數，時間到會震動並顯示 Android 系統通知
- **勾選追蹤**：勾選已完成的動作，進度條顯示完成比例
- **身體紀錄**：每天記錄體重、腰圍、體脂率、內臟脂肪等級與肌肉量；後三項可留白，支援同日更新、歷史編輯及刪除
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
- Android 原生組間休息計時器與通知頻道，支援 APP 切到背景後繼續倒數
- react-native-blob-util 串接 Android DownloadManager 下載更新 APK
- GitHub Actions 自動建置並發佈 APK

專案採功能分區：畫面、型別與資料存取放在各自的 `src/features` 目錄；導覽與共用主題則分別位於 `src/app`、`src/shared`。完整說明請見 [專案架構](docs/ARCHITECTURE.md)。

APP 內更新使用 Android 系統背景下載服務，可在短暫斷線或 APP 進入背景時繼續下載。若設定頁出現錯誤代碼，請參考 [更新錯誤代碼](docs/UPDATE_ERRORS.md)。

## 維護與驗證原則

- 每次修改後都要回顧本 README、專案架構與相關文件，確認說明是否需要同步更新。
- 一般本機調整只執行與變更相關的 lint、TypeScript 或測試，不重複建置 Release APK。
- 只有準備提交、推送或發布時才執行 Android Release build。
- 發布 APK 時直接執行 `npm run release:android`，此指令已包含建置，不需要先執行 `npm run build`。

供程式維護工具遵循的完整規則請見 [AGENTS.md](AGENTS.md)。

## 發布新版本

發布前請同步更新以下版本號：

- `package.json` 的 `version`
- `package-lock.json` 的 `version`（執行 `npm version` 時同步更新）
- `android/app/build.gradle` 的 `versionCode` 與 `versionName`
- `src/features/settings/updateService.ts` 的 `CURRENT_VERSION`

本機需先安裝 [GitHub CLI](https://cli.github.com/) 並完成 `gh auth login`。完成程式檢查、提交並推送程式碼後，執行：

```powershell
git add .
git commit -m "release: vX.Y.Z"
git push origin main
npm run release:android
```

`release:android` 會檢查三處版本號是否一致、建置 APK、建立或更新同版本的 GitHub Release，最後不論成功或失敗都會刪除本機 APK。`npm run build` 僅供準備提交／推送但不發布時的最終 Android 驗證，不需要在每次一般修改後執行；產生的 APK 只位於已忽略的 Android `build` 目錄，驗證後應清除。

也可以從 GitHub Actions 手動執行 **Build & Release APK**；工作流程會讀取 `package.json` 版本號，發布後清除 runner 上的 APK。

APP 會查詢 `bdorz/fitness` 的最新 GitHub Release；Release 必須包含 `.apk` 檔案，APP 內下載按鈕才會出現。
