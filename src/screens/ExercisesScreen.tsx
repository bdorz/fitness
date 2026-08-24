import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import {useFocusEffect, useRoute, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList, WorkoutCategory, Exercise} from '../types';
import {
  getCategories,
  updateCategory,
  deleteCategory,
  addExercise,
  updateExercise,
  deleteExercise,
  toggleExercise,
  resetAllExercises,
} from '../storage/database';
import {Colors} from '../context/colors';

type RouteProps = RouteProp<RootStackParamList, 'Exercises'>;
type NavProp = NativeStackNavigationProp<RootStackParamList, 'Exercises'>;

interface ExForm {
  name: string;
  weight: string;
  unit: 'kg' | 'lbs';
  sets: string;
  reps: string;
}

const EMPTY_FORM: ExForm = {
  name: '',
  weight: '',
  unit: 'kg',
  sets: '',
  reps: '',
};

export default function ExercisesScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const {categoryId} = route.params;

  const [category, setCategory] = useState<WorkoutCategory | null>(null);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [catName, setCatName] = useState('');
  const [exModalVisible, setExModalVisible] = useState(false);
  const [exForm, setExForm] = useState<ExForm>(EMPTY_FORM);
  const [editExId, setEditExId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const cats = await getCategories();
    const found = cats.find(c => c.id === categoryId) ?? null;
    setCategory(found);
  }, [categoryId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

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
        {text: '取消', style: 'cancel'},
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
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
    setExModalVisible(true);
  }

  function openEditEx(ex: Exercise) {
    setEditExId(ex.id);
    setExForm({
      name: ex.name,
      weight: ex.weight,
      unit: ex.unit,
      sets: ex.sets,
      reps: ex.reps,
    });
    setExModalVisible(true);
  }

  async function handleSaveEx() {
    if (!exForm.name.trim()) {
      return;
    }
    const data = {...exForm, name: exForm.name.trim()};
    if (editExId) {
      await updateExercise(categoryId, editExId, data);
    } else {
      await addExercise(categoryId, data);
    }
    await loadData();
    setExModalVisible(false);
  }

  function confirmDeleteEx(ex: Exercise) {
    Alert.alert('確認刪除', `確定要刪除「${ex.name}」？`, [
      {text: '取消', style: 'cancel'},
      {
        text: '刪除',
        style: 'destructive',
        onPress: async () => {
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

  function confirmReset() {
    Alert.alert('重置確認', '確定要重置所有勾選嗎？', [
      {text: '取消', style: 'cancel'},
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

  function renderExercise({
    item,
    index,
  }: {
    item: Exercise;
    index: number;
  }) {
    return (
      <TouchableOpacity
        style={[styles.exCard, item.completed && styles.exCardDone]}
        onPress={() => handleToggle(item.id)}
        activeOpacity={0.7}>
        <View
          style={[styles.checkbox, item.completed && styles.checkboxDone]}>
          {item.completed && (
            <Text style={styles.checkmark}>✓</Text>
          )}
        </View>

        <View style={styles.exInfo}>
          <View style={styles.exTitleRow}>
            <Text style={styles.exNum}>{index + 1}.</Text>
            <Text
              style={[
                styles.exName,
                item.completed && styles.exNameDone,
              ]}
              numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          {(!!item.weight || !!item.sets || !!item.reps) && (
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
            </View>
          )}
        </View>

        <View style={styles.exActions}>
          <TouchableOpacity
            style={styles.exActionBtn}
            onPress={() => openEditEx(item)}>
            <Text style={styles.exActionIcon}>✏</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exActionBtn}
            onPress={() => confirmDeleteEx(item)}>
            <Text style={[styles.exActionIcon, {color: Colors.red}]}>✕</Text>
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
          style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {category.name}
        </Text>
        <TouchableOpacity style={styles.headerBtn} onPress={openEditCat}>
          <Text style={styles.headerBtnIcon}>✏</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={confirmDeleteCat}>
          <Text style={[styles.headerBtnIcon, {color: Colors.red}]}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Progress */}
      {total > 0 && (
        <View style={styles.progSection}>
          <View style={styles.progBg}>
            <View
              style={[
                styles.progFill,
                {width: `${Math.round(pct * 100)}%` as any},
              ]}
            />
          </View>
          <Text style={[styles.progLabel, allDone && {color: Colors.green}]}>
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
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={confirmReset}>
              <Text style={styles.resetBtnText}>重置所有勾選</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openAddEx}
        activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Category Edit Modal */}
      <Modal
        visible={catModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCatModalVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setCatModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={styles.sheet}
              onStartShouldSetResponder={() => true}>
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
                  onPress={() => setCatModalVisible(false)}>
                  <Text style={styles.btnSecText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPri]}
                  onPress={handleSaveCat}>
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
        onRequestClose={() => setExModalVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setExModalVisible(false)}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View
                style={styles.sheet}
                onStartShouldSetResponder={() => true}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>
                  {editExId ? '編輯動作' : '新增動作'}
                </Text>

                <Text style={styles.fieldLabel}>動作名稱</Text>
                <TextInput
                  style={styles.input}
                  value={exForm.name}
                  onChangeText={v => setExForm(f => ({...f, name: v}))}
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
                      onChangeText={v =>
                        setExForm(f => ({...f, weight: v}))
                      }
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
                        onPress={() =>
                          setExForm(f => ({...f, unit: 'kg'}))
                        }>
                        <Text
                          style={[
                            styles.unitBtnText,
                            exForm.unit === 'kg' &&
                              styles.unitBtnTextActive,
                          ]}>
                          kg
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.unitBtn,
                          exForm.unit === 'lbs' && styles.unitBtnActive,
                        ]}
                        onPress={() =>
                          setExForm(f => ({...f, unit: 'lbs'}))
                        }>
                        <Text
                          style={[
                            styles.unitBtnText,
                            exForm.unit === 'lbs' &&
                              styles.unitBtnTextActive,
                          ]}>
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
                      onChangeText={v =>
                        setExForm(f => ({...f, sets: v}))
                      }
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
                      onChangeText={v =>
                        setExForm(f => ({...f, reps: v}))
                      }
                      placeholder="12"
                      placeholderTextColor={Colors.text3}
                      keyboardType="number-pad"
                      returnKeyType="done"
                      onSubmitEditing={handleSaveEx}
                    />
                  </View>
                </View>

                <View style={styles.sheetBtns}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnSec]}
                    onPress={() => setExModalVisible(false)}>
                    <Text style={styles.btnSecText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPri]}
                    onPress={handleSaveEx}>
                    <Text style={styles.btnPriText}>儲存</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  backBtn: {padding: 4, marginRight: 4},
  backIcon: {fontSize: 28, color: Colors.accent, lineHeight: 32},
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
  },
  headerBtn: {padding: 8},
  headerBtnIcon: {fontSize: 18, color: Colors.text2},
  progSection: {paddingHorizontal: 16, paddingBottom: 14},
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
  progLabel: {fontSize: 13, color: Colors.text2, textAlign: 'right'},
  list: {padding: 12, paddingBottom: 100},
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
  exCardDone: {opacity: 0.5},
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
  checkboxDone: {backgroundColor: Colors.green, borderColor: Colors.green},
  checkmark: {
    fontSize: 16,
    color: Colors.bg,
    fontWeight: '800',
    lineHeight: 20,
  },
  exInfo: {flex: 1, minWidth: 0},
  exTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 6,
  },
  exNum: {fontSize: 13, color: Colors.text2},
  exName: {fontSize: 15, fontWeight: '700', color: Colors.text, flex: 1},
  exNameDone: {textDecorationLine: 'line-through', color: Colors.text2},
  exTags: {flexDirection: 'row', flexWrap: 'wrap', gap: 4},
  tag: {
    backgroundColor: Colors.card2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagWeight: {backgroundColor: Colors.accentDim},
  tagText: {fontSize: 12, color: Colors.text2},
  tagTextWeight: {color: Colors.accent},
  exActions: {flexDirection: 'column', gap: 2, marginLeft: 6},
  exActionBtn: {padding: 6},
  exActionIcon: {fontSize: 16, color: Colors.text2},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyIcon: {fontSize: 64, marginBottom: 16, opacity: 0.3},
  emptyText: {fontSize: 17, fontWeight: '600', color: Colors.text2},
  emptyHint: {fontSize: 14, color: Colors.text3, marginTop: 6},
  resetBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetBtnText: {fontSize: 14, color: Colors.text2},
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
    shadowOffset: {width: 0, height: 4},
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
  fieldRow: {flexDirection: 'row', gap: 10},
  fieldFlex2: {flex: 2},
  fieldFlex1: {flex: 1},
  fieldHalf: {flex: 1},
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
  unitBtn: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  unitBtnActive: {backgroundColor: Colors.accent},
  unitBtnText: {fontSize: 14, fontWeight: '700', color: Colors.text2},
  unitBtnTextActive: {color: Colors.white},
  sheetBtns: {flexDirection: 'row', gap: 10, marginTop: 4},
  btn: {flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
  btnPri: {backgroundColor: Colors.accent},
  btnSec: {backgroundColor: Colors.card3},
  btnPriText: {fontSize: 16, fontWeight: '700', color: Colors.white},
  btnSecText: {fontSize: 16, fontWeight: '700', color: Colors.text2},
});
