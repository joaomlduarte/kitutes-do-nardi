import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ComandasListScreen from './ComandasListScreen';
import ComandaDetailScreen from './ComandaDetailScreen';

const Stack = createNativeStackNavigator();

export default function ComandasScreen() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Lista"
        component={ComandasListScreen}
        options={{ title: 'Comandas' }}
      />
      <Stack.Screen
        name="Comanda"
        component={ComandaDetailScreen}
        options={({ route }) => ({ title: route.params?.comandaNome || 'Comanda' })}
      />
    </Stack.Navigator>
  );
}
