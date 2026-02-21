import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { RootStackParamList } from './src/types';

import HomeScreen from './src/screens/HomeScreen';
import CreateChildScreen from './src/screens/CreateChildScreen';
import AlbumListScreen from './src/screens/AlbumListScreen';
import AlbumDetailScreen from './src/screens/AlbumDetailScreen';
import CreateAlbumScreen from './src/screens/CreateAlbumScreen';
import ExportPDFScreen from './src/screens/ExportPDFScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <View style={styles.root}>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          {/* 홈: 아이 목록 */}
          <Stack.Screen name="Home" component={HomeScreen} />
          {/* 아이 생성/수정 */}
          <Stack.Screen name="CreateChild" component={CreateChildScreen} />
          {/* 아이별 앨범 목록 */}
          <Stack.Screen name="AlbumList" component={AlbumListScreen} />
          {/* 앨범 상세 */}
          <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
          {/* 앨범 생성/수정 */}
          <Stack.Screen name="CreateAlbum" component={CreateAlbumScreen} />
          {/* PDF 내보내기 */}
          <Stack.Screen name="ExportPDF" component={ExportPDFScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
