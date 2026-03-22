import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { DarkTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './src/api';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import ReportScreen from './src/screens/ReportScreen';
import MyReportsScreen from './src/screens/MyReportsScreen';
import MapScreen from './src/screens/MapScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#f1f5f9',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155', height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen}
        options={{ tabBarLabel: 'Home', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🏠</Text> }} />
      <Tab.Screen name="Report" component={ReportScreen}
        options={{ tabBarLabel: 'Report', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📸</Text>, title: 'Report Damage' }} />
      <Tab.Screen name="MyReports" component={MyReportsScreen}
        options={{ tabBarLabel: 'My Reports', tabBarIcon: () => <Text style={{ fontSize: 20 }}>📋</Text>, title: 'My Reports' }} />
      <Tab.Screen name="Map" component={MapScreen}
        options={{ tabBarLabel: 'Map', tabBarIcon: () => <Text style={{ fontSize: 20 }}>🗺️</Text>, title: 'Damage Map' }} />
    </Tab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        await api.init(); // 🔥 IMPORTANT

        const token = await AsyncStorage.getItem('token');
        const userData = await AsyncStorage.getItem('user');

        if (token && userData) {
          api.setToken(token);

          // 🔥 VERIFY TOKEN (VERY IMPORTANT)
          try {
            await api.get('/auth/me'); // or any protected route
            setUser(JSON.parse(userData));
          } catch (err) {
            console.log("❌ Token invalid, logging out");
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            api.setToken(null);
          }
        }
      } catch (e) {
        console.log("Auth load error:", e);
      }

      setLoading(false);
    };

    loadAuth();
  }, []);
  const handleLogin = async (token, userData) => {
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
    api.setToken(token);
    setUser(userData);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    api.setToken(null);
    setUser(null);
  };

  if (loading) return null;
  const MyTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#6366f1',
      background: '#0f172a',
      card: '#1e293b',
      text: '#f1f5f9',
      border: '#334155',
      notification: '#ef4444',
    },
  };
  return (
    <NavigationContainer theme={MyTheme}>
      <StatusBar style="light" />
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main">
            {() => <MainTabs />}
          </Stack.Screen>
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#f1f5f9' }}>
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
          <Stack.Screen name="Register">
            {(props) => <RegisterScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
