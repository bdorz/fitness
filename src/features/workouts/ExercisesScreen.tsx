import React, { useState, useCallback, useEffect } from 'react';
import {
  AppState,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import {
  useFocusEffect,
  useRoute,
  useNavigation,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../app/navigation/types';
import { Colors } from '../../shared/theme/colors';
import { Exercise, ExerciseTemplate, WorkoutCategory } from './types';
import {
  getCategories,
  getExerciseTemplates,
  mergeExerciseTemplates,
  deleteExerciseTemplate,
  updateCategory,
  deleteCategory,
  addExercise,
  updateExercise,
  deleteExercise,
  toggleExercise,
  resetAllExercises,
} from './workoutRepository';
import {
  addRestTimerFinishedListener,
  addRestTimerTickListener,
  cancelRestTimer,
  digitsOnly,
  formatRestDuration,
  getRestTimerState,
  requestRestTimerNotificationPermission,
  restDurationSeconds,
  splitRestDuration,
  startRestTimer,
} from './restTimer';

type RouteProps = RouteProp<RootStackParamList, 'Exercises'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'Exercises'>;

interface ExForm {
  templateId: string | null | undefined;
  name: string;
  weight: string;
  unit: 'kg' | 'lbs';
  sets: string;
  reps: string;
  restMinutes: string;
  restSeconds: string;
}

interface ActiveTimer {
  timerId: string;
  exerciseName: string;
  remainingSeconds: number;
}

const EMPTY_FORM: ExForm = {
  templateId: null,
  name: '',
  weight: '',
  unit: 'kg',
  sets: '',
  reps: '',
  restMinutes: '',
  restSeconds: '',
};

function templateLabel(template: ExerciseTemplate): string {
  return `${template.name}・${template.weight || '未記重量'}${
    template.weight ? (template.unit === 'lbs' ? ' 磅' : ' kg') : ''
  }`;
}

export default function ExercisesScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { categoryId } = route.params;

  const [category, setCategory] = useState<WorkoutCategory | null>(null);
  const [templates, setTemplates] = useState<ExerciseTemplate[]>([]);
  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [templateSearch, setTemplateSearch] = useState('');
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catName, setCatName] = useState('');
  const [exModalVisible, setExModalVisible] = useState(false);
  const [exForm, setExForm] = useState<ExForm>(EMPTY_FORM);
  const [editExId, setEditExId] = useState<string | null>(null);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

  const loadData = useCallback(async () => {
    const cats = await getCategories();
    const found = cats.find(c => c.id === categoryId) ?? null;
    setCategory(found);
    setTemplates(await getExerciseTemplates());
  }, [categoryId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      getRestTimerState()
        .then(timer => {
          setActiveTimer(
            timer.active &&
              timer.timerId &&
              timer.exerciseName &&
              timer.remainingSeconds
              ? {
                  timerId: timer.timerId,
                  exerciseName: timer.exerciseName,
                  remainingSeconds: timer.remainingSeconds,
                }
              : null,
          );
        })
        .catch(() => setActiveTimer(null));
    }, [loadData]),
  );

  useEffect(() => {
    const tickSubscription = addRestTimerTickListener(event => {
      setActiveTimer(event);
    });
    const finishedSubscription = addRestTimerFinishedListener(event => {
      setActiveTimer(null);
      if (AppState.currentState === 'active') {
        Alert.alert(
          '組間休息結束',
          `${event.exerciseName} 可以開始下一組了！`,
        );
      }
    });

    return () => {
      tickSubscription?.remove();
      finishedSubscription?.remove();
    };
  }, []);

  // ── Category ────────────────────────────────────────────────────────
  function openEditCat() {
    if (!category) {
      return;
    }
    setCatName(category.name);
    setCatModalVisible(true);
  }

  async function handleSaveCat() {
    if (!category || !catName.trim()) {
      return;
    }
    await updateCategory(category.id, catName.trim());
    await loadData();
    setCatModalVisible(false);
  }

  function confirmDeleteCat() {
    if (!category) {
      return;
    }
    Alert.alert(
      '確認刪除',
      `確定要刪除「${category.name}」？\n所有動作也會一併刪除。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            if (
              category.exercises.some(ex => ex.id === activeTimer?.timerId)
            ) {
              await cancelRestTimer();
              setActiveTimer(null);
            }
            await deleteCategory(category.id);
            navigation.goBack();
          },
        },
      ],
    );
  }

  // ── Exercise ────────────────────────────────────────────────────────
  function openAddEx() {
    setEditExId(null);
    setExForm(EMPTY_FORM);
    setTemplateSearch('');
    setExModalVisible(true);
  }

  function openEditEx(ex: Exercise) {
    const rest = splitRestDuration(ex.restSeconds);
    setEditExId(ex.id);
    setTemplateSearch('');
    setExForm({
      templateId: ex.templateId,
      name: ex.name,
      weight: ex.weight,
      unit: ex.unit,
      sets: ex.sets,
      reps: ex.reps,
      restMinutes: rest.minutes,
      restSeconds: rest.seconds,
    });
    setExModalVisible(true);
  }

  async function handleSaveEx() {
    if (!exForm.name.trim()) {
      return;
    }
    const { restMinutes, restSeconds, ...exerciseFields } = exForm;
    const data = {
      ...exerciseFields,
      name: exForm.name.trim(),
      restSeconds: restDurationSeconds(restMinutes, restSeconds),
    };
    try {
      if (editExId) {
        await updateExercise(categoryId, editExId, data);
      } else {
        await addExercise(categoryId, data);
      }
      await loadData();
      setExModalVisible(false);
    } catch (error) {
      Alert.alert(
        '無法儲存動作',
        error instanceof Error ? error.message : '請稍後再試。',
      );
    }
  }

  function selectTemplate(template: ExerciseTemplate) {
    setExForm(form => ({
      ...form,
      templateId: template.id,
      name: template.name,
      weight: template.weight,
      unit: template.unit,
    }));
  }

  function startNewTemplate() {
    setExForm(form => ({
      ...form,
      templateId: null,
      name: '',
      weight: '',
      unit: 'kg',
    }));
  }

  async function confirmMerge(target: ExerciseTemplate) {
    const source = templates.find(item => item.id === mergeSourceId);
    if (!source || source.id === target.id) {
      return;
    }
    const categories = await getCategories();
    const count = categories.reduce(
      (sum, item) =>
        sum +
        item.exercises.filter(exercise => exercise.templateId === source.id)
          .length,
      0,
    );
    Alert.alert(
      '合併動作卡片',
      `將「${templateLabel(source)}」併入「${templateLabel(
        target,
      )}」？\n${count} 筆既有動作會改用保留卡片的名稱、重量與單位；各筆的組數、次數、休息時間及完成狀態不變。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '合併',
          onPress: async () => {
            try {
              await mergeExerciseTemplates(source.id, target.id);
              await loadData();
              setMergeSourceId(null);
              setMergeModalVisible(false);
            } catch (error) {
              Alert.alert(
                '合併失敗',
                error instanceof Error ? error.message : '請稍後再試。',
              );
            }
          },
        },
      ],
    );
  }

  async function confirmDeleteTemplate(template: ExerciseTemplate) {
    const categories = await getCategories();
    const count = categories.reduce(
      (sum, item) =>
        sum +
        item.exercises.filter(exercise => exercise.templateId === template.id)
          .length,
      0,
    );
    Alert.alert(
      '刪除動作卡片',
      `刪除「${templateLabel(template)}」？${count} 筆已建立的訓練動作會保留原名稱、重量、組數、次數與休息時間，但不再與這張卡片連動。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '刪除卡片',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExerciseTemplate(template.id);
              await loadData();
              if (mergeSourceId === template.id) {
                setMergeSourceId(null);
              }
            } catch (error) {
              Alert.alert(
                '刪除失敗',
                error instanceof Error ? error.message : '請稍後再試。',
              );
            }
          },
        },
      ],
    );
  }

  function confirmDeleteEx(ex: Exercise) {
    Alert.alert('確認刪除', `確定要刪除「${ex.name}」？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
          if (activeTimer?.timerId === ex.id) {
            await cancelRestTimer();
            setActiveTimer(null);
          }
          await deleteExercise(categoryId, ex.id);
          await loadData();
        },
      },
    ]);
  }

  async function handleToggle(exId: string) {
    await toggleExercise(categoryId, exId);
    await loadData();
  }

  async function handleTimerPress(ex: Exercise) {
    if (activeTimer?.timerId === ex.id) {
      await cancelRestTimer();
      setActiveTimer(null);
      return;
    }
    if (!ex.restSeconds) {
      Alert.alert('尚未設定休息時間', '請先編輯動作並設定組間休息時間。');
      return;
    }

    try {
      const notificationsEnabled =
        await requestRestTimerNotificationPermission();
      if (!notificationsEnabled) {
        Alert.alert(
          '通知權限未開啟',
          '倒數仍會執行並震動，但系統通知不會顯示。可到 Android 設定中開啟通知。',
        );
      }
      await startRestTimer(ex.id, ex.name, ex.restSeconds);
      setActiveTimer({
        timerId: ex.id,
        exerciseName: ex.name,
        remainingSeconds: ex.restSeconds,
      });
    } catch (error) {
      Alert.alert(
        '無法啟動計時',
        error instanceof Error ? error.message : '請稍後再試。',
      );
    }
  }

  function confirmReset() {
    Alert.alert('重置確認', '確定要重置所有勾選嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: async () => {
          await resetAllExercises(categoryId);
          await loadData();
        },
      },
    ]);
  }

  // ── Render ───────────────────────────────────────────────────────────
  if (!category) {
    return null;
  }

  const done = category.exercises.filter(e => e.completed).length;
  const total = category.exercises.length;
  const pct = total ? done / total : 0;
  const allDone = total > 0 && done === total;

  function renderExercise({ item, index }: { item: Exercise; index: number }) {
    return (
      <TouchableOpacity
        style={[styles.exCard, item.completed && styles.exCardDone]}
        onPress={() => handleToggle(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, item.completed && styles.checkboxDone]}>
          {item.completed && <Text style={styles.checkmark}>✓</Text>}
        </View>

        <View style={styles.exInfo}>
          <View style={styles.exTitleRow}>
            <Text style={styles.exNum}>{index + 1}.</Text>
            <Text
              style={[styles.exName, item.completed && styles.exNameDone]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>
          {(!!item.weight ||
            !!item.sets ||
            !!item.reps ||
            !!item.restSeconds) && (
            <View style={styles.exTags}>
              {!!item.weight && (
                <View style={[styles.tag, styles.tagWeight]}>
                  <Text style={[styles.tagText, styles.tagTextWeight]}>
                    {item.weight} {item.unit === 'lbs' ? '磅' : 'kg'}
                  </Text>
                </View>
              )}
              {!!item.sets && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.sets} 組</Text>
                </View>
              )}
              {!!item.reps && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.reps} 下</Text>
                </View>
              )}
              {!!item.restSeconds && (
                <View style={styles.tag}>
                  <Text style={styles.tagText}>
                    休息 {formatRestDuration(item.restSeconds)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.exActions}>
          <TouchableOpacity
            style={[
              styles.timerBtn,
              activeTimer?.timerId === item.id && styles.timerBtnActive,
            ]}
            onPress={() => handleTimerPress(item)}
            accessibilityRole="button"
            accessibilityLabel={
              activeTimer?.timerId === item.id
                ? `取消 ${item.name} 組間休息倒數`
                : `開始 ${item.name} 組間休息倒數`
            }
          >
            <Text
              style={[
                styles.timerBtnText,
                activeTimer?.timerId === item.id && styles.timerBtnTextActive,
              ]}
            >
              {activeTimer?.timerId === item.id
                ? formatRestDuration(activeTimer.remainingSeconds)
                : '⏱'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exActionBtn}
            onPress={() => openEditEx(item)}
          >
            <Text style={styles.exActionIcon}>✏</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exActionBtn}
            onPress={() => confirmDeleteEx(item)}
          >
            <Text style={[styles.exActionIcon, { color: Colors.red }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {category.name}
        </Text>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            setMergeSourceId(null);
            setMergeModalVisible(true);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.manageText}>整理卡片</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={openEditCat}>
          <Text style={styles.headerBtnIcon}>✏</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={confirmDeleteCat}>
          <Text style={[styles.headerBtnIcon, { color: Colors.red }]}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      {total > 0 && (
        <View style={styles.progSection}>
          <View style={styles.progBg}>
            <View
              style={[
                styles.progFill,
                { width: `${Math.round(pct * 100)}%` as any },
              ]}
            />
          </View>
          <Text style={[styles.progLabel, allDone && { color: Colors.green }]}>
            {allDone ? '🎉 全部完成！' : `${done} / ${total} 完成`}
          </Text>
        </View>
      )}

      {/* List or Empty */}
      {category.exercises.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>💪</Text>
          <Text style={styles.emptyText}>還沒有動作</Text>
          <Text style={styles.emptyHint}>點擊右下角 + 新增動作</Text>
        </View>
      ) : (
        <FlatList
          data={category.exercises}
          keyExtractor={item => item.id}
          renderItem={renderExercise}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <TouchableOpacity style={styles.resetBtn} onPress={confirmReset}>
              <Text style={styles.resetBtnText}>重置所有勾選</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAddEx}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Category Edit Modal */}
      <Modal
        visible={catModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCatModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setCatModalVisible(false)}
        >
          <KeyboardAvoidingView>
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>編輯訓練日</Text>
              <Text style={styles.fieldLabel}>名稱</Text>
              <TextInput
                style={styles.input}
                value={catName}
                onChangeText={setCatName}
                placeholder="訓練日名稱"
                placeholderTextColor={Colors.text3}
                autoFocus
                onSubmitEditing={handleSaveCat}
                returnKeyType="done"
              />
              <View style={styles.sheetBtns}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSec]}
                  onPress={() => setCatModalVisible(false)}
                >
                  <Text style={styles.btnSecText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPri]}
                  onPress={handleSaveCat}
                >
                  <Text style={styles.btnPriText}>儲存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Exercise Add/Edit Modal */}
      <Modal
        visible={exModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setExModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setExModalVisible(false)}
        >
          <KeyboardAvoidingView>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.sheet} onStartShouldSetResponder={() => true}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>
                  {editExId ? '編輯動作' : '新增動作'}
                </Text>

                <Text style={styles.fieldLabel}>共用動作卡片</Text>
                <Text style={styles.fieldHelp}>
                  選取卡片可帶入名稱、重量與單位。修改這些資料會同步到所有使用此卡片的訓練日；組數、次數與休息時間只影響這筆紀錄。
                </Text>
                {exForm.templateId === undefined && (
                  <Text style={styles.fieldHelp}>
                    這筆紀錄目前沒有連動卡片；可直接編輯原紀錄，或選取卡片重新關聯。
                  </Text>
                )}
                <TextInput
                  style={styles.input}
                  value={templateSearch}
                  onChangeText={setTemplateSearch}
                  placeholder="搜尋名稱或重量"
                  placeholderTextColor={Colors.text3}
                  accessibilityLabel="搜尋動作卡片"
                />
                <TouchableOpacity
                  style={[
                    styles.templateCard,
                    exForm.templateId === null && styles.templateCardActive,
                  ]}
                  onPress={startNewTemplate}
                  accessibilityRole="button"
                >
                  <Text style={styles.templateTitle}>＋ 建立新動作卡片</Text>
                </TouchableOpacity>
                {templates
                  .filter(template =>
                    templateLabel(template)
                      .normalize('NFKC')
                      .toLocaleLowerCase()
                      .includes(
                        templateSearch
                          .normalize('NFKC')
                          .trim()
                          .toLocaleLowerCase(),
                      ),
                  )
                  .map(template => (
                    <TouchableOpacity
                      key={template.id}
                      style={[
                        styles.templateCard,
                        exForm.templateId === template.id &&
                          styles.templateCardActive,
                      ]}
                      onPress={() => selectTemplate(template)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.templateTitle}>{template.name}</Text>
                      <Text style={styles.templateDetail}>
                        {template.weight || '未記重量'}{' '}
                        {template.weight
                          ? template.unit === 'lbs'
                            ? '磅'
                            : 'kg'
                          : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}

                <Text style={styles.fieldLabel}>動作名稱</Text>
                <TextInput
                  style={styles.input}
                  value={exForm.name}
                  onChangeText={v => setExForm(f => ({ ...f, name: v }))}
                  placeholder="例：機械肩推、臥推、深蹲…"
                  placeholderTextColor={Colors.text3}
                  autoFocus
                  returnKeyType="next"
                />

                <View style={styles.fieldRow}>
                  <View style={styles.fieldFlex2}>
                    <Text style={styles.fieldLabel}>重量</Text>
                    <TextInput
                      style={styles.input}
                      value={exForm.weight}
                      onChangeText={v => setExForm(f => ({ ...f, weight: v }))}
                      placeholder="0"
                      placeholderTextColor={Colors.text3}
                      keyboardType="decimal-pad"
                      returnKeyType="next"
                    />
                  </View>
                  <View style={styles.fieldFlex1}>
                    <Text style={styles.fieldLabel}>單位</Text>
                    <View style={styles.unitToggle}>
                      <TouchableOpacity
                        style={[
                          styles.unitBtn,
                          exForm.unit === 'kg' && styles.unitBtnActive,
                        ]}
                        onPress={() => setExForm(f => ({ ...f, unit: 'kg' }))}
                      >
                        <Text
                          style={[
                            styles.unitBtnText,
                            exForm.unit === 'kg' && styles.unitBtnTextActive,
                          ]}
                        >
                          kg
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.unitBtn,
                          exForm.unit === 'lbs' && styles.unitBtnActive,
                        ]}
                        onPress={() => setExForm(f => ({ ...f, unit: 'lbs' }))}
                      >
                        <Text
                          style={[
                            styles.unitBtnText,
                            exForm.unit === 'lbs' && styles.unitBtnTextActive,
                          ]}
                        >
                          磅
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>組數</Text>
                    <TextInput
                      style={styles.input}
                      value={exForm.sets}
                      onChangeText={v => setExForm(f => ({ ...f, sets: v }))}
                      placeholder="4"
                      placeholderTextColor={Colors.text3}
                      keyboardType="number-pad"
                      returnKeyType="next"
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.fieldLabel}>次數（下）</Text>
                    <TextInput
                      style={styles.input}
                      value={exForm.reps}
                      onChangeText={v => setExForm(f => ({ ...f, reps: v }))}
                      placeholder="12"
                      placeholderTextColor={Colors.text3}
                      keyboardType="number-pad"
                      returnKeyType="next"
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>組間休息時間</Text>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.restUnitLabel}>分鐘</Text>
                    <TextInput
                      style={styles.input}
                      value={exForm.restMinutes}
                      onChangeText={v =>
                        setExForm(f => ({
                          ...f,
                          restMinutes: digitsOnly(v, 2),
                        }))
                      }
                      placeholder="分"
                      placeholderTextColor={Colors.text3}
                      keyboardType="number-pad"
                      returnKeyType="next"
                      maxLength={2}
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.restUnitLabel}>秒數</Text>
                    <TextInput
                      style={styles.input}
                      value={exForm.restSeconds}
                      onChangeText={v =>
                        setExForm(f => ({
                          ...f,
                          restSeconds: digitsOnly(v, 2),
                        }))
                      }
                      placeholder="秒"
                      placeholderTextColor={Colors.text3}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      maxLength={2}
                      onSubmitEditing={handleSaveEx}
                    />
                  </View>
                </View>

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSec]}
                    onPress={() => setExModalVisible(false)}
                  >
                    <Text style={styles.btnSecText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPri]}
                    onPress={handleSaveEx}
                  >
                    <Text style={styles.btnPriText}>儲存</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>

      {/* Merge existing cards without changing local training fields. */}
      <Modal
        visible={mergeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMergeModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setMergeModalVisible(false)}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.mergeContent}
          >
            <View style={styles.sheet} onStartShouldSetResponder={() => true}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>整理既有動作卡片</Text>
              <Text style={styles.fieldHelp}>
                升級時，名稱、重量與單位相同的舊動作會自動共用卡片。同名但重量不同的舊卡片可手動合併，或刪除多餘卡片。刪除卡片不會刪除已建立的訓練動作。
              </Text>
              <Text style={styles.fieldLabel}>要合併的卡片</Text>
              {templates.map(template => (
                <View key={template.id} style={styles.templateRow}>
                  <TouchableOpacity
                    style={[
                      styles.templateCard,
                      styles.templateRowCard,
                      mergeSourceId === template.id && styles.templateCardActive,
                    ]}
                    onPress={() => setMergeSourceId(template.id)}
                    accessibilityRole="button"
                  >
                    <Text style={styles.templateTitle}>
                      {templateLabel(template)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.templateDelete}
                    onPress={() => confirmDeleteTemplate(template)}
                    accessibilityRole="button"
                    accessibilityLabel={`刪除 ${templateLabel(template)} 卡片`}
                  >
                    <Text style={styles.templateDeleteText}>刪除</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {templates.length === 0 && (
                <Text style={styles.fieldHelp}>目前沒有動作卡片。</Text>
              )}
              {mergeSourceId && (
                <>
                  <Text style={styles.fieldLabel}>選擇保留的卡片</Text>
                  {templates
                    .filter(template => template.id !== mergeSourceId)
                    .map(template => (
                      <TouchableOpacity
                        key={template.id}
                        style={styles.templateCard}
                        onPress={() => confirmMerge(template)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.templateTitle}>
                          {templateLabel(template)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </>
              )}
              <TouchableOpacity
                style={[styles.btn, styles.btnSec]}
                onPress={() => setMergeModalVisible(false)}
              >
                <Text style={styles.btnSecText}>關閉</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: { padding: 4, marginRight: 4 },
  backIcon: { fontSize: 28, color: Colors.accent, lineHeight: 32 },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  headerBtn: { padding: 8 },
  headerBtnIcon: { fontSize: 18, color: Colors.text2 },
  manageText: { fontSize: 13, color: Colors.accent, fontWeight: '700' },
  mergeContent: { flexGrow: 1, justifyContent: 'flex-end' },
  progSection: { paddingHorizontal: 16, paddingBottom: 14 },
  progBg: {
    height: 8,
    backgroundColor: Colors.card3,
    borderRadius: 99,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 99,
  },
  progLabel: { fontSize: 13, color: Colors.text2, textAlign: 'right' },
  list: { padding: 12, paddingBottom: 100 },
  exCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  exCardDone: { opacity: 0.5 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: Colors.text3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  checkmark: {
    fontSize: 16,
    color: Colors.bg,
    fontWeight: '800',
    lineHeight: 20,
  },
  exInfo: { flex: 1, minWidth: 0 },
  exTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 6,
  },
  exNum: { fontSize: 13, color: Colors.text2 },
  exName: { fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1 },
  exNameDone: { textDecorationLine: 'line-through', color: Colors.text2 },
  exTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: {
    backgroundColor: Colors.card2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagWeight: { backgroundColor: Colors.accentDim },
  tagText: { fontSize: 12, color: Colors.text2 },
  tagTextWeight: { color: Colors.accent },
  exActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 6,
  },
  timerBtn: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 7,
    borderRadius: 9,
    backgroundColor: Colors.card2,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBtnActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  timerBtnText: { fontSize: 16, color: Colors.text2, fontWeight: '800' },
  timerBtnTextActive: { fontSize: 12, color: Colors.white },
  exActionBtn: { padding: 6 },
  exActionIcon: { fontSize: 16, color: Colors.text2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 64, marginBottom: 16, opacity: 0.3 },
  emptyText: { fontSize: 17, fontWeight: '600', color: Colors.text2 },
  emptyHint: { fontSize: 14, color: Colors.text3, marginTop: 6 },
  resetBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetBtnText: { fontSize: 14, color: Colors.text2 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  fabText: {
    fontSize: 30,
    color: Colors.white,
    lineHeight: 34,
    marginTop: -2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  fieldHelp: {
    fontSize: 12,
    lineHeight: 18,
    color: Colors.text2,
    marginBottom: 10,
  },
  templateCard: {
    backgroundColor: Colors.card3,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  templateCardActive: { borderColor: Colors.accent },
  templateRow: { flexDirection: 'row', gap: 8 },
  templateRowCard: { flex: 1 },
  templateDelete: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginBottom: 7,
    borderRadius: 10,
    backgroundColor: Colors.card3,
  },
  templateDeleteText: { color: Colors.red, fontSize: 12, fontWeight: '700' },
  templateTitle: { fontSize: 14, color: Colors.text, fontWeight: '700' },
  templateDetail: { fontSize: 12, color: Colors.text2 },
  input: {
    backgroundColor: Colors.card3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.text,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldFlex2: { flex: 2 },
  fieldFlex1: { flex: 1 },
  fieldHalf: { flex: 1 },
  restUnitLabel: { fontSize: 12, color: Colors.text2, marginBottom: 6 },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card3,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 16,
    height: 46,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  unitBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  unitBtnActive: { backgroundColor: Colors.accent },
  unitBtnText: { fontSize: 14, fontWeight: '700', color: Colors.text2 },
  unitBtnTextActive: { color: Colors.white },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnPri: { backgroundColor: Colors.accent },
  btnSec: { backgroundColor: Colors.card3 },
  btnPriText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  btnSecText: { fontSize: 16, fontWeight: '700', color: Colors.text2 },
});
