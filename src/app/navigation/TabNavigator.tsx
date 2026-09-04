import React from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BodyRecordsScreen from '../../features/body-records/BodyRecordsScreen';
import ConverterScreen from '../../features/converter/ConverterScreen';
import SettingsScreen from '../../features/settings/SettingsScreen';
import WorkoutsScreen from '../../features/workouts/WorkoutsScreen';
import { Colors } from '../../shared/theme/colors';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

function iconStyle(base: TextStyle, color: string) {
  return [base, { color }];
}

function WorkoutsIcon({ color }: { color: string }) {
  return <Text style={iconStyle(styles.workoutsIcon, color)}>🏋️</Text>;
}

function BodyRecordsIcon({ color }: { color: string }) {
  return <Text style={iconStyle(styles.standardIcon, color)}>📈</Text>;
}

function ConverterIcon({ color }: { color: string }) {
  return <Text style={iconStyle(styles.converterIcon, color)}>⚖️</Text>;
}

function SettingsIcon({ color }: { color: string }) {
  return <Text style={iconStyle(styles.standardIcon, color)}>⚙️</Text>;
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.text3,
        tabBarStyle: {
          backgroundColor: Colors.card,
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 58,
          paddingBottom: 6,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
        options={{
          tabBarLabel: '訓練',
          tabBarIcon: WorkoutsIcon,
        }}
      />
      <Tab.Screen
        name="BodyRecords"
        component={BodyRecordsScreen}
        options={{
          tabBarLabel: '身體',
          tabBarIcon: BodyRecordsIcon,
        }}
      />
      <Tab.Screen
        name="Converter"
        component={ConverterScreen}
        options={{
          tabBarLabel: '換算',
          tabBarIcon: ConverterIcon,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '設定',
          tabBarIcon: SettingsIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  workoutsIcon: { fontSize: 22, lineHeight: 26, textAlign: 'center' },
  standardIcon: { fontSize: 21, lineHeight: 25 },
  converterIcon: { fontSize: 22 },
});
