import { Platform, View } from 'react-native';

import ClientTabs from '@/components/client-tabs';
import { ClientTopBar } from '@/components/client-top-bar';

export default function ClientLayout() {
  if (Platform.OS === 'web') {
    return <ClientTabs />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ClientTopBar />
      <View style={{ flex: 1 }}>
        <ClientTabs />
      </View>
    </View>
  );
}
