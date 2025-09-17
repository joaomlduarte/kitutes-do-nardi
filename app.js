import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from './src/screens/DashboardScreen';
import ComandasScreen from './src/screens/ComandasScreen';
import ProdutosScreen from './src/screens/ProdutosScreen';
import HistoricoScreen from './src/screens/HistoricoScreen';
import ExportarScreen from './src/screens/ExportarScreen';
import ConfigScreen from './src/screens/ConfigScreen';

import { initDb } from './src/storage/database';

const Tab = createBottomTabNavigator();

export default function App() {
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    (async () => {
      try { await initDb(); } finally { setReady(true); }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={{ headerShown: false }}>
        <Tab.Screen name="Dashboard" component={DashboardScreen}
          options={{ tabBarIcon: ({color,size}) => <Ionicons name="stats-chart" size={size} color={color} /> }} />
        <Tab.Screen name="Comandas" component={ComandasScreen}
          options={{ tabBarIcon: ({color,size}) => <Ionicons name="receipt" size={size} color={color} /> }} />
        <Tab.Screen name="Produtos" component={ProdutosScreen}
          options={{ tabBarIcon: ({color,size}) => <Ionicons name="pricetags" size={size} color={color} /> }} />
        <Tab.Screen name="Histórico" component={HistoricoScreen}
          options={{ tabBarIcon: ({color,size}) => <Ionicons name="time" size={size} color={color} /> }} />
        <Tab.Screen name="Exportar" component={ExportarScreen}
          options={{ tabBarIcon: ({color,size}) => <Ionicons name="cloud-download" size={size} color={color} /> }} />
        <Tab.Screen name="Config" component={ConfigScreen}
          options={{ tabBarIcon: ({color,size}) => <Ionicons name="settings" size={size} color={color} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
