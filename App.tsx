import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { RootStackParamList } from './src/types';
import HomeScreen from './src/screens/HomeScreen';
import CreateAlbumScreen from './src/screens/CreateAlbumScreen';
import AlbumDetailScreen from './src/screens/AlbumDetailScreen';
import ExportPDFScreen from './src/screens/ExportPDFScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="CreateAlbum" component={CreateAlbumScreen} />
          <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
          <Stack.Screen name="ExportPDF" component={ExportPDFScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
