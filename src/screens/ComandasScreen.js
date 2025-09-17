// src/screens/ComandasScreen.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ComandasListScreen from './ComandasListScreen';
import ComandaDetailScreen from './ComandaDetailScreen';

const Stack = createNativeStackNavigator();

export default function ComandasScreen() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' }, headerTintColor: '#0f172a' }}>
      <Stack.Screen name="ComandasList" component={ComandasListScreen} options={{ title: 'Comandas' }} />
      <Stack.Screen name="ComandaDetail" component={ComandaDetailScreen} options={{ title: 'Comanda' }} />
    </Stack.Navigator>
  );
}
