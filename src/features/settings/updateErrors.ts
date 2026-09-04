export type UpdateErrorCode =
  | 'UPD-001'
  | 'UPD-101'
  | 'UPD-102'
  | 'UPD-103'
  | 'UPD-104'
  | 'UPD-105'
  | 'UPD-201'
  | 'UPD-202'
  | 'UPD-203'
  | 'UPD-204'
  | 'UPD-205'
  | 'UPD-206'
  | 'UPD-207'
  | 'UPD-301'
  | 'UPD-999';

interface ErrorDefinition {
  title: string;
  message: string;
  suggestion: string;
}

export interface UpdateErrorDetails extends ErrorDefinition {
  code: UpdateErrorCode;
  technical?: string;
}

const ERROR_DEFINITIONS: Record<UpdateErrorCode, ErrorDefinition> = {
  'UPD-001': {
    title: '平台不支援',
    message: 'APP 內更新目前只支援 Android。',
    suggestion: '請改從 GitHub Releases 手動下載適用版本。',
  },
  'UPD-101': {
    title: '無法檢查更新',
    message: '手機目前無法連線到 GitHub。',
    suggestion: '請切換 Wi-Fi／行動網路，並暫時關閉 VPN 或私人 DNS 後重試。',
  },
  'UPD-102': {
    title: '更新服務異常',
    message: 'GitHub 更新服務回傳非預期狀態。',
    suggestion: '請稍後重試；若持續發生，可到 GitHub Releases 手動下載。',
  },
  'UPD-103': {
    title: '版本資料異常',
    message: '無法解析 GitHub 回傳的版本資料。',
    suggestion: '請稍後重試，並回報此錯誤代碼。',
  },
  'UPD-104': {
    title: '尚無發布版本',
    message: 'GitHub 上目前找不到可用的 Release。',
    suggestion: '請確認專案 Releases 頁面是否已有正式版本。',
  },
  'UPD-105': {
    title: '找不到安裝檔',
    message: '最新 Release 沒有可下載的 APK。',
    suggestion: '請確認該 Release 已附加副檔名為 .apk 的檔案。',
  },
  'UPD-201': {
    title: '下載網址無效',
    message: 'APP 收到的 APK 下載網址不正確。',
    suggestion: '請重新檢查更新；若仍發生，請回報此錯誤代碼。',
  },
  'UPD-202': {
    title: '下載連線中斷',
    message: '下載已自動續傳重試三次，但網路仍然中斷。',
    suggestion: '請切換較穩定的網路，關閉 VPN／省電模式後再次下載。',
  },
  'UPD-203': {
    title: '下載服務異常',
    message: 'APK 伺服器回傳非預期的 HTTP 狀態。',
    suggestion: '請稍後重試，或從 GitHub Releases 手動下載。',
  },
  'UPD-204': {
    title: '下載檔案不完整',
    message: '下載後的 APK 大小與 GitHub 記錄不一致。',
    suggestion: '請確認手機剩餘空間與網路穩定度後重新下載。',
  },
  'UPD-205': {
    title: '儲存檔案失敗',
    message: 'APP 無法在手機快取空間建立或整理 APK。',
    suggestion: '請釋放手機空間、清除 APP 快取後再試。',
  },
  'UPD-206': {
    title: '系統下載失敗',
    message: 'Android 系統下載管理員無法完成 APK 下載。',
    suggestion: '請查看系統下載通知，確認網路、下載管理員及剩餘空間後重試。',
  },
  'UPD-207': {
    title: '缺少儲存權限',
    message: 'Android 未允許 APP 儲存更新檔。',
    suggestion: '請在系統設定允許儲存空間權限後重試。',
  },
  'UPD-301': {
    title: '無法開啟安裝程式',
    message: 'APK 已下載，但 Android 無法開啟安裝畫面。',
    suggestion: '請允許此 APP 安裝未知來源應用程式後重試。',
  },
  'UPD-999': {
    title: '未知更新錯誤',
    message: '更新時發生未預期的錯誤。',
    suggestion: '請重新啟動 APP 後再試，並回報此錯誤代碼。',
  },
};

export class AppUpdateError extends Error {
  constructor(
    public readonly code: UpdateErrorCode,
    public readonly technical?: string,
    public readonly retryable = false,
  ) {
    super(ERROR_DEFINITIONS[code].message);
    this.name = 'AppUpdateError';
  }
}

export function technicalMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
      ? error
      : String(error);
  return message
    .replace(/https?:\/\/\S+/gi, '[URL]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

export function classifyDownloadError(error: unknown): AppUpdateError {
  if (error instanceof AppUpdateError) {
    return error;
  }

  const message = technicalMessage(error);
  if (/download manager/i.test(message)) {
    return new AppUpdateError('UPD-206', message);
  }
  if (/permission|denied|EACCES/i.test(message)) {
    return new AppUpdateError('UPD-207', message);
  }
  if (/space|storage|write|file|directory|ENOSPC/i.test(message)) {
    return new AppUpdateError('UPD-205', message);
  }
  return new AppUpdateError('UPD-202', message);
}

export function describeUpdateError(error: unknown): UpdateErrorDetails {
  const updateError =
    error instanceof AppUpdateError
      ? error
      : new AppUpdateError('UPD-999', technicalMessage(error));
  return {
    code: updateError.code,
    ...ERROR_DEFINITIONS[updateError.code],
    technical: updateError.technical,
  };
}
