import React, { useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Theme, useTheme } from '../theme';

export type TabItem = {
  key: string;
  label: string;
};

type Props = {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
  // Each tab is `${testID}-${key}`.
  testID?: string;
};

// A row of text tabs, one of them active.
//
// Deliberately plain: gold text over a gold underline for the active one, muted
// for the rest, and nothing else. The same reasoning as the favourites filter it
// sits above — "a gold text toggle, not a segmented control we would have to
// restyle" — because the style guide (Wiktoria, task #36) has not landed and
// 3C repaints this whole layer anyway. Building a pill switch now would be
// building something to throw away.
//
// Dumb by construction, like EmptyState and PasswordInput: props in, nothing
// else. It owns no state and knows nothing about what the tabs contain.
export function Tabs({ items, value, onChange, style, testID }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={[styles.row, style]}>
      {items.map(item => {
        const active = item.key === value;
        return (
          <TouchableOpacity
            key={item.key}
            testID={testID ? `${testID}-${item.key}` : undefined}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(item.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}>
            <Text style={[styles.label, active && styles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.border.subtle,
    },
    // Equal halves rather than content width: two labels of very different
    // lengths would otherwise put the divider in a different place per tab.
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabActive: {
      borderBottomColor: colors.gold.primary,
    },
    label: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
      textAlign: 'center',
    },
    labelActive: {
      color: colors.gold.primary,
    },
  });
};
