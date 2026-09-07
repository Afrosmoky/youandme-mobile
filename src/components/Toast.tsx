import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTheme, Theme } from '../theme';

// How long a message stays up before it fades. Long enough to read a sentence,
// short enough that it is gone before it becomes something to dismiss.
const VISIBLE_MS = 2600;
const FADE_MS = 200;

type ToastValue = {
  show: (message: string) => void;
};

const ToastContext = createContext<ToastValue | undefined>(undefined);

/**
 * A short message that appears, says one thing, and goes away by itself.
 *
 * The app had no such thing: everything went through Alert.alert, which is a
 * modal with a button — right for "your changes were saved", wrong for
 * acknowledging a tap on a heart, where interrupting the couple to make them
 * dismiss a dialog is worse than saying nothing at all.
 *
 * Deliberately narrow, and meant to stay that way: one function, one string, no
 * severities, no actions, no queue. A second message while one is up replaces
 * it, because two toasts stacking is the beginning of a notification system.
 *
 * NOT a general error channel. If error toasts are ever wanted, the decision at
 * that point is "these replace the Alerts", not "we now have two ways of telling
 * the couple something" — noted in refactor-roadmap.md so the question is
 * answered before it is asked.
 *
 * No new dependency: RN's own Animated, and an absolutely positioned view over
 * the navigator.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (next: string) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      setMessage(next);
      // Reset rather than continue: a second message arriving mid-fade would
      // otherwise inherit whatever opacity the last one had got to.
      opacity.setValue(0);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start();

      timer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: FADE_MS,
          useNativeDriver: true,
        }).start(({ finished }) => {
          // Only clear if the fade actually ran to the end. A message shown
          // while this one was fading has already taken over the view, and
          // wiping it here would blank it a fifth of a second later.
          if (finished) {
            setMessage(null);
          }
        });
      }, VISIBLE_MS);
    },
    [opacity],
  );

  useEffect(
    () => () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    },
    [],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message !== null && <ToastView message={message} opacity={opacity} />}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context;
}

function ToastView({
  message,
  opacity,
}: {
  message: string;
  opacity: Animated.Value;
}) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    // pointerEvents none throughout: the toast reports something that already
    // happened, so it must never eat a tap meant for what is underneath it.
    <View style={styles.host} pointerEvents="none">
      <Animated.View style={[styles.toast, { opacity }]}>
        <Text testID="toast" style={styles.text}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius } = theme;
  return StyleSheet.create({
    host: {
      position: 'absolute',
      left: 0,
      right: 0,
      // Above the bottom edge rather than on it: the couple's thumb is down
      // there, and so is the home indicator.
      bottom: spacing.xxxl * 2,
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    toast: {
      backgroundColor: colors.bg.elevated,
      borderWidth: 1,
      borderColor: colors.border.gold,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
    },
    text: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.primary,
      textAlign: 'center',
    },
  });
};
