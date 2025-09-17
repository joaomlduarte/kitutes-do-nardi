// App.js
import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import ComandasScreen from './src/screens/ComandasScreen';
import ProdutosScreen from './src/screens/ProdutosScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import ExportarScreen from './src/screens/ExportarScreen';
import ConfigScreen from './src/screens/ConfigScreen';
import { COLORS } from './src/theme';

const Tab = createBottomTabNavigator();

const LightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.card,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
  },
};

export default function App() {
  return (
    <NavigationContainer theme={LightTheme}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: COLORS.card },
          headerTitleStyle: { color: COLORS.text, fontWeight: '800' },
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: { backgroundColor: COLORS.card },
          tabBarIcon: ({ color, size }) => {
            const map = {
              Comandas: 'receipt',
              Produtos: 'pricetags',
              Dashboard: 'stats-chart',
              Histórico: 'time',
              Exportar: 'download',
              Config: 'settings',
            };
            return <Ionicons name={map[route.name] || 'ellipse'} color={color} size={size} />;
          },
        })}
      >
        <Tab.Screen name="Comandas" component={ComandasScreen} />
        <Tab.Screen name="Produtos" component={ProdutosScreen} />
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Histórico" component={HistoricoScreen} />
        <Tab.Screen name="Exportar" component={ExportarScreen} />
        <Tab.Screen name="Config" component={ConfigScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
