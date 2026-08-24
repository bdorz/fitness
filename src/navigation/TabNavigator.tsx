import React from 'react';
import {Text} from 'react-native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import WorkoutsScreen from '../screens/WorkoutsScreen';
import ConverterScreen from '../screens/ConverterScreen';
import BodyRecordsScreen from '../screens/BodyRecordsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {TabParamList} from '../types';
import {Colors} from '../context/colors';

const Tab = createBottomTabNavigator<TabParamList>();

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
        tabBarLabelStyle: {fontSize: 11, fontWeight: '600'},
      }}>
      <Tab.Screen
        name="Workouts"
        component={WorkoutsScreen}
        options={{
          tabBarLabel: '訓練',
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 22, lineHeight: 26, color, textAlign: 'center'}}>🏋️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="BodyRecords"
        component={BodyRecordsScreen}
        options={{
          tabBarLabel: '身體',
          tabBarIcon: ({color}) => <Text style={{fontSize: 21, lineHeight: 25, color}}>📈</Text>,
        }}
      />
      <Tab.Screen
        name="Converter"
        component={ConverterScreen}
        options={{
          tabBarLabel: '換算',
          tabBarIcon: ({color}) => (
            <Text style={{fontSize: 22, color}}>⚖️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '設定',
          tabBarIcon: ({color}) => <Text style={{fontSize: 21, lineHeight: 25, color}}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}
