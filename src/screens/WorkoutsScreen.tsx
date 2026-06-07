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
  StatusBar,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {RootStackParamList, TabParamList, WorkoutCategory} from '../types';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from '../storage/database';
import {Colors} from '../context/colors';

type NavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Workouts'>,
  NativeStackNavigationProp<RootStackParamList>
>;

function weekday(n: number) {
  return ['日', '一', '二', '三', '四', '五', '六'][n];
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${weekday(d.getDay())}`;
}

export default function WorkoutsScreen() {
  const navigation = useNavigation<NavProp>();
  const [categories, setCategories] = useState<WorkoutCategory[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalName, setModalName] = useState('');
  const [editTarget, setEditTarget] = useState<WorkoutCategory | null>(null);

  useFocusEffect(
    useCallback(() => {
      getCategories().then(setCategories);
    }, []),
  );

  function openAdd() {
    setEditTarget(null);
    setModalName('');
    setModalVisible(true);
  }

  function openEdit(cat: WorkoutCategory) {
    setEditTarget(cat);
    setModalName(cat.name);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setModalName('');
    setEditTarget(null);
  }

  async function handleSave() {
    const name = modalName.trim();
    if (!name) {
      return;
    }
    if (editTarget) {
      await updateCategory(editTarget.id, name);
    } else {
      await addCategory(name);
    }
    const updated = await getCategories();
    setCategories(updated);
    closeModal();
  }

  function confirmDelete(cat: WorkoutCategory) {
    Alert.alert(
      '確認刪除',
      `確定要刪除「${cat.name}」？\n所有動作記錄也會一併刪除。`,
      [
        {text: '取消', style: 'cancel'},
        {
          text: '刪除',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(cat.id);
            const updated = await getCategories();
            setCategories(updated);
          },
        },
      ],
    );
  }

  function renderItem({item}: {item: WorkoutCategory}) {
    const done = item.exercises.filter(e => e.completed).length;
    const total = item.exercises.length;
    const pct = total ? done / total : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate('Exercises', {categoryId: item.id})
        }
        activeOpacity={0.75}>
        <View style={styles.cardLeft}>
          <Text style={styles.catName}>{item.name}</Text>
          <View style={styles.progRow}>
            <View style={styles.progBg}>
              <View
                style={[
                  styles.progFill,
                  {width: `${Math.round(pct * 100)}%` as any},
                ]}
              />
            </View>
            <Text style={styles.progText}>
              {done}/{total}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => openEdit(item)}>
            <Text style={styles.actionIcon}>✏</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => confirmDelete(item)}>
            <Text style={[styles.actionIcon, {color: Colors.red}]}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={styles.header}>
        <Text style={styles.appTitle}>健身紀錄</Text>
        <Text style={styles.dateText}>{todayStr()}</Text>
      </View>

      {categories.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyText}>還沒有訓練項目</Text>
          <Text style={styles.emptyHint}>點擊右下角 + 開始新增</Text>
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeModal}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View
              style={styles.sheet}
              onStartShouldSetResponder={() => true}>
              <View style={styles.handle} />
              <Text style={styles.sheetTitle}>
                {editTarget ? '編輯訓練日' : '新增訓練日'}
              </Text>
              <Text style={styles.fieldLabel}>名稱</Text>
              <TextInput
                style={styles.input}
                value={modalName}
                onChangeText={setModalName}
                placeholder="例：胸、背、肩、腿、核心、有氧…"
                placeholderTextColor={Colors.text3}
                autoFocus
                onSubmitEditing={handleSave}
                returnKeyType="done"
              />
              <View style={styles.sheetBtns}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnSec]}
                  onPress={closeModal}>
                  <Text style={styles.btnSecText}>取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.btnPri]}
                  onPress={handleSave}>
                  <Text style={styles.btnPriText}>儲存</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.bg},
  header: {paddingTop: 20, paddingBottom: 14, paddingHorizontal: 20},
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  dateText: {fontSize: 13, color: Colors.text2, marginTop: 3},
  list: {padding: 12, paddingBottom: 90},
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
  cardLeft: {flex: 1},
  catName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  progRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  progBg: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.card3,
    borderRadius: 99,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 99,
  },
  progText: {fontSize: 12, color: Colors.text2, width: 36, textAlign: 'right'},
  cardActions: {flexDirection: 'row', gap: 4, marginLeft: 8},
  actionBtn: {padding: 8, borderRadius: 8},
  actionIcon: {fontSize: 18, color: Colors.text2},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  emptyIcon: {fontSize: 64, marginBottom: 16, opacity: 0.3},
  emptyText: {fontSize: 17, fontWeight: '600', color: Colors.text2},
  emptyHint: {fontSize: 14, color: Colors.text3, marginTop: 6},
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
    marginBottom: 20,
  },
  sheetBtns: {flexDirection: 'row', gap: 10},
  btn: {flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center'},
  btnPri: {backgroundColor: Colors.accent},
  btnSec: {backgroundColor: Colors.card3},
  btnPriText: {fontSize: 16, fontWeight: '700', color: Colors.white},
  btnSecText: {fontSize: 16, fontWeight: '700', color: Colors.text2},
});
