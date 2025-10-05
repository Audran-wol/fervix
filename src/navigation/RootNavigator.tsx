import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/useTheme';

// Import screens
import HomeScreen from '../screens/Home/HomeScreen';
import InfoScreen from '../screens/Info/InfoScreen';
import SupportScreen from '../screens/Support/SupportScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import HeatingScreen from '../screens/Heating/HeatingScreen';
import TreatmentScreen from '../screens/Treatment/TreatmentScreen';
import CompletedScreen from '../screens/Completed/CompletedScreen';
import CoolingScreen from '../screens/cooling/CoolingScreen';
import FinalCompletedScreen from '../screens/FinalCompleted/FinalCompletedScreen';
import AbortedScreen from '../screens/Aborted/AbortedScreen';
import LanguagePickerScreen from '../screens/LanguagePicker/LanguagePickerScreen';
import QRCodeScreen from '../screens/QRCode/QRCodeScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Heating: undefined;
  Treatment: undefined;
  Completed: undefined;
  Cooling: undefined;
  FinalCompleted: undefined;
  Aborted: undefined;
  LanguagePicker: undefined;
  QRCode: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Info: undefined;
  Support: undefined;
  Settings: undefined;
  FinalCompleted: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator = () => {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();

  return (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: isDark ? colors.card : '#eceff3',
              borderTopWidth: 0,
              height: 64,
              paddingBottom: 4,
              paddingTop: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              elevation: 0,
              shadowOpacity: 0,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#9CA3AF',
            tabBarLabelStyle: {
              fontSize: 12,
              fontFamily: 'Roboto-Bold',
              color: isDark ? '#9CA3AF' : '#9CA3AF',
              marginTop: -1,
              marginBottom: 15,
            },
            tabBarIconStyle: {
              fontSize: 22,
            },
          }}
        >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: t('navigation.home'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
      <Tab.Screen
        name="Info"
        component={InfoScreen}
        options={{
          tabBarLabel: t('navigation.info'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarLabel: t('navigation.support'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('navigation.settings'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="FinalCompleted"
        component={FinalCompletedScreen}
        options={{
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
    </Tab.Navigator>
  );
};

export const RootNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Heating" component={HeatingScreen} />
        <Stack.Screen name="Treatment" component={TreatmentScreen} />
        <Stack.Screen name="Completed" component={CompletedScreen} />
        <Stack.Screen name="Cooling" component={CoolingScreen} />
        <Stack.Screen name="Aborted" component={AbortedScreen} />
        <Stack.Screen name="LanguagePicker" component={LanguagePickerScreen} />
        <Stack.Screen name="QRCode" component={QRCodeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
