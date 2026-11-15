import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Spacing, themedStyles } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

export type ScreenProps = ScrollViewProps & {
  scroll?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
};

export function Screen({ children, scroll = true, contentContainerStyle, edges, style, ...rest }: ScreenProps) {
  useTheme();
  return (
    <SafeAreaView style={styles.safeArea} edges={edges ?? ['top']}>
      <View style={styles.centerer}>
        {scroll ? (
          <ScrollView
            style={[styles.flexFull, style]}
            contentContainerStyle={[styles.content, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            {...rest}>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flexFull, styles.content, style, contentContainerStyle]}>{children}</View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerer: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  flexFull: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
}));
