# 專案架構

```text
fitness/
├─ assets/                    # 設計與品牌原始資產，不直接參與 App bundle
│  └─ branding/
├─ docs/                      # 維護文件
├─ scripts/                   # Android 建置與發布工具
├─ src/
│  ├─ app/
│  │  └─ navigation/          # 導覽器與 route 型別
│  ├─ features/
│  │  ├─ body-records/        # 身體紀錄畫面、型別、儲存層
│  │  ├─ converter/           # 重量換算功能
│  │  ├─ settings/            # 設定畫面與更新服務
│  │  └─ workouts/            # 訓練畫面、型別、儲存層與計時器橋接
│  └─ shared/
│     └─ theme/               # 跨功能共用的色彩與主題
├─ android/                   # React Native Android 原生專案
├─ AGENTS.md                  # 專案維護、驗證與發布規則
├─ App.tsx                    # App 根元件與最外層 providers
└─ index.js                   # React Native 進入點
```

## 放置原則

- 功能專用的畫面、型別、資料存取放在同一個 `src/features/<feature>` 內。
- 訓練資料與共用動作卡片一同存於 AsyncStorage；舊版類別陣列在首次讀取時轉換，僅將名稱、重量及單位完全相同的動作關聯，並保留各紀錄的組數、次數、休息時間與完成狀態。
- 身體紀錄維持每日一筆；舊紀錄缺少的體脂率、內臟脂肪與肌肉量讀取為空值。
- 只有兩個以上功能共用的程式碼才放入 `src/shared`。
- App 層級的導覽與組裝邏輯放在 `src/app`，不放功能實作。
- 組間休息倒數由 `android/app/src/main/java/com/fitnessapp/RestTimerModule.kt` 執行，React Native 畫面透過 `workouts/restTimer.ts` 接收倒數事件；時間到由 Android 原生層震動並發送系統通知。
- Android 產物只存在平台的 `build` 目錄，不複製到專案根目錄。
- APK、AAB 與暫存發布目錄一律不納入 Git；正式安裝檔以 GitHub Releases 為準。

## APK 流程

- `npm run build`：只建置 Android release APK，供本機驗證。
- `npm run release:android`：建置並上傳 GitHub Release，結束後自動刪除本機 APK。
- GitHub Actions：手動觸發後使用 `package.json` 的版本號發布，最後清除 runner 產物。
