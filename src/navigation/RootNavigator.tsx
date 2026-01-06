import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/useTheme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from '../screens/Home/HomeScreen';
import InfoScreen from '../screens/Info/InfoScreen';
import SupportScreen from '../screens/Support/SupportScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';
import HeatingScreen from '../screens/Heating/HeatingScreen';
import TreatmentScreen from '../screens/Treatment/TreatmentScreen';
import CoolingScreen from '../screens/cooling/CoolingScreen';
import FinalCompletedScreen from '../screens/FinalCompleted/FinalCompletedScreen';
import AbortedScreen from '../screens/Aborted/AbortedScreen';
import LanguagePickerScreen from '../screens/LanguagePicker/LanguagePickerScreen';
import QRCodeScreen from '../screens/QRCode/QRCodeScreen';

export type RootStackParamList = {
  MainTabs: undefined;
  Heating: undefined;
  Treatment: undefined;
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
  const insets = useSafeAreaInsets();

  return (
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: isDark ? colors.card : '#F5F5F5',
              borderTopWidth: 0,
              height: 64 + insets.bottom, // Add safe area bottom padding
              paddingBottom: Math.max(insets.bottom, 4), // Ensure minimum 4px or safe area
              paddingTop: 0,
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
              elevation: 8, // Add elevation to ensure it's above system UI
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: -2 },
              shadowRadius: 4,
              position: 'absolute', // Ensure it's positioned above everything
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 1000, // High z-index to ensure it's on top
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: isDark ? '#9CA3AF' : '#9CA3AF',
            tabBarLabelStyle: {
              fontSize: 12,
              fontFamily: 'Roboto-Bold',
              fontWeight: 'bold',
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
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
            ),
          }}
        />
      <Tab.Screen
        name="Info"
        component={InfoScreen}
        options={{
          tabBarLabel: t('navigation.info'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "information-circle" : "information-circle-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Support"
        component={SupportScreen}
        options={{
          tabBarLabel: t('navigation.support'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "mail" : "mail-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('navigation.settings'),
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />
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
        <Stack.Screen name="Cooling" component={CoolingScreen} />
        <Stack.Screen name="Aborted" component={AbortedScreen} />
        <Stack.Screen name="LanguagePicker" component={LanguagePickerScreen} />
        <Stack.Screen name="QRCode" component={QRCodeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
