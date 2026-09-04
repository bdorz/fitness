import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../shared/theme/colors';
import { downloadAndInstallApk } from './apkDownloader';
import {
  AppUpdateError,
  describeUpdateError,
  UpdateErrorDetails,
} from './updateErrors';
import {
  CURRENT_VERSION,
  fetchLatestRelease,
  GithubReleaseAsset,
  hasNewVersion,
} from './updateService';

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'latest'
  | 'available'
  | 'downloading';

export default function SettingsScreen() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [latestTag, setLatestTag] = useState('');
  const [downloadAsset, setDownloadAsset] = useState<GithubReleaseAsset | null>(
    null,
  );
  const [progress, setProgress] = useState(0);
  const [lastError, setLastError] = useState<UpdateErrorDetails | null>(null);

  function showUpdateError(error: unknown) {
    const details = describeUpdateError(error);
    setLastError(details);
    const technical = details.technical
      ? `\n\n技術資訊：${details.technical}`
      : '';
    Alert.alert(
      `${details.title} [${details.code}]`,
      `${details.message}\n\n排除方式：${details.suggestion}${technical}`,
    );
  }

  async function checkUpdate() {
    setLastError(null);
    setStatus('checking');
    try {
      const release = await fetchLatestRelease();
      setLatestTag(release.tag_name.replace(/^v/i, ''));
      if (!hasNewVersion(release.tag_name)) {
        setStatus('latest');
        return;
      }
      const apk = release.assets.find(asset =>
        asset.name.toLowerCase().endsWith('.apk'),
      );
      if (!apk) {
        throw new AppUpdateError('UPD-105');
      }
      setDownloadAsset(apk);
      setStatus('available');
    } catch (error) {
      setStatus('idle');
      showUpdateError(error);
    }
  }

  async function downloadUpdate() {
    setLastError(null);
    setProgress(0);
    setStatus('downloading');
    try {
      if (!downloadAsset) {
        throw new AppUpdateError('UPD-201', 'missing download asset');
      }
      await downloadAndInstallApk(downloadAsset, CURRENT_VERSION, setProgress);
      setStatus('available');
    } catch (error) {
      setStatus('available');
      showUpdateError(error);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>設定</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTitle}>APP 更新</Text>
            <Text style={styles.hint}>目前版本 v{CURRENT_VERSION}</Text>
          </View>
          {status === 'available' && (
            <Text style={styles.badge}>v{latestTag} 可更新</Text>
          )}
          {status === 'latest' && (
            <Text style={[styles.badge, styles.latestBadge]}>已是最新</Text>
          )}
        </View>
        <Text style={styles.description}>
          連線至 GitHub Releases 檢查新版，並可直接下載 APK 開始安裝。
        </Text>
        {status === 'downloading' ? (
          <View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              下載中 {Math.round(progress * 100)}%
            </Text>
          </View>
        ) : status === 'available' ? (
          <TouchableOpacity
            style={[styles.button, styles.downloadButton]}
            onPress={downloadUpdate}
          >
            <Text style={styles.buttonText}>下載並安裝 v{latestTag}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.button}
            onPress={checkUpdate}
            disabled={status === 'checking'}
          >
            <Text style={styles.buttonText}>
              {status === 'checking'
                ? '檢查中…'
                : status === 'latest'
                ? '再次檢查'
                : '檢查更新'}
            </Text>
          </TouchableOpacity>
        )}
        {lastError && (
          <View style={styles.errorCard}>
            <Text style={styles.errorCode} selectable>
              錯誤代碼 {lastError.code}
            </Text>
            <Text style={styles.errorMessage}>{lastError.message}</Text>
            <Text style={styles.errorSuggestion}>{lastError.suggestion}</Text>
            {lastError.technical && (
              <Text style={styles.errorTechnical} numberOfLines={3} selectable>
                {lastError.technical}
              </Text>
            )}
          </View>
        )}
      </View>
      <Text style={styles.footnote}>
        安裝新版前，Android 可能會要求允許此 APP 安裝未知來源應用程式。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 20, paddingHorizontal: 20, paddingBottom: 14 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    margin: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: Colors.text },
  hint: { fontSize: 12, color: Colors.text2, marginTop: 4 },
  description: {
    fontSize: 13,
    color: Colors.text2,
    lineHeight: 20,
    marginVertical: 18,
  },
  badge: {
    fontSize: 11,
    color: Colors.red,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontWeight: '700',
  },
  latestBadge: { color: Colors.green, backgroundColor: Colors.greenDim },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 11,
    paddingVertical: 13,
    alignItems: 'center',
  },
  downloadButton: { backgroundColor: Colors.green },
  buttonText: { fontSize: 15, color: Colors.white, fontWeight: '800' },
  progressTrack: {
    height: 8,
    backgroundColor: Colors.card3,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.text2,
    textAlign: 'center',
    marginTop: 8,
  },
  errorCard: {
    marginTop: 14,
    padding: 12,
    backgroundColor: 'rgba(248,113,113,0.08)',
    borderColor: 'rgba(248,113,113,0.28)',
    borderWidth: 1,
    borderRadius: 10,
  },
  errorCode: { color: Colors.red, fontSize: 12, fontWeight: '800' },
  errorMessage: { color: Colors.text, fontSize: 12, marginTop: 6 },
  errorSuggestion: {
    color: Colors.text2,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },
  errorTechnical: {
    color: Colors.text3,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 7,
  },
  footnote: {
    fontSize: 11,
    color: Colors.text3,
    lineHeight: 17,
    marginHorizontal: 24,
  },
});
