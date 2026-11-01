# 專案維護規則

## 平台範圍

- 本專案只支援 Android，不新增或恢復 iOS、Xcode、CocoaPods、Ruby Bundler 相關檔案與指令。

## 每次修改後

- 回顧 `README.md`、`docs/ARCHITECTURE.md` 與相關文件，確認功能、架構、指令、版本或發布流程是否需要同步更新。
- 只有文件確實受到影響時才修改，避免加入與實作不一致或重複的說明。
- 依變更範圍執行 ESLint、TypeScript 與相關測試。
- 一般本機修改不要執行 Android Release build。

## Git 與發布

- 只有使用者明確要求提交、推送或發布時，才執行 Android Release build 驗證。
- 若要發布 APK，直接使用 `npm run release:android`；此指令已包含 Release build，不要先重複執行 `npm run build`。
- 發布流程結束後必須確認本機沒有 `.apk`、`.aab` 或 `.release/` 暫存檔。
- APK 只保留在 GitHub Releases，不提交進 Git。
- 未經使用者要求，不自行提交、推送、建立標籤或發布 Release。

## 版本

- 發布時同步更新 `package.json`、`package-lock.json`、`android/app/build.gradle` 與 `src/features/settings/updateService.ts`。
- Android `versionCode` 必須遞增，`versionName`、npm package version 與 `CURRENT_VERSION` 必須一致。
