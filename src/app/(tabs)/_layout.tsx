import { Platform, View } from 'react-native';

import { AdminTopBar } from '@/components/admin-top-bar';
import AppTabs from '@/components/app-tabs';

export default function TabLayout() {
  if (Platform.OS === 'web') {
    return <AppTabs />;
  }

  return (
    <View style={{ flex: 1 }}>
      <AdminTopBar />
      <View style={{ flex: 1 }}>
        <AppTabs />
      </View>
    </View>
  );
}
