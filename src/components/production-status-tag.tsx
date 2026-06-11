import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  getProductionStatusLabel,
  type ProductionStatus,
} from '@/types/project';

type ProductionStatusTagProps = {
  status: ProductionStatus;
};

function getTagColors(
  status: ProductionStatus,
  theme: ReturnType<typeof useTheme>,
) {
  if (status === 'production_completed') {
    return { background: `${theme.success}22`, border: theme.success, text: theme.success };
  }
  if (status === 'post_production') {
    return { background: `${theme.warning}22`, border: theme.warning, text: theme.warning };
  }
  if (status === 'project_registered') {
    return { background: `${theme.accent}22`, border: theme.accent, text: theme.accent };
  }
  return { background: `${theme.info}22`, border: theme.info, text: theme.info };
}

export function ProductionStatusTag({ status }: ProductionStatusTagProps) {
  const theme = useTheme();
  const colors = getTagColors(status, theme);

  return (
    <View
      style={[
        styles.tag,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}>
      <ThemedText
        type="small"
        style={{
          color: colors.text,
          fontWeight: '700',
        }}>
        {getProductionStatusLabel(status)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
});
