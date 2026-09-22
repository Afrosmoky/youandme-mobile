import React, { useMemo } from 'react';
import {
  Clipboard,
  Modal,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GoldButton } from './GoldButton';
import { OutlineButton } from './OutlineButton';
import { Logo } from './Logo';
import { useToast } from './Toast';
import { Theme, useTheme, withGlowRoom } from '../theme';
import { pl } from '../i18n/pl';

// Where the shared card points. Same landing page the referral share uses; the
// two say different things about the same app.
const SHARE_URL = 'https://jaity.app';

type Props = {
  visible: boolean;
  // The card being shared. Null closes the modal by having nothing to show.
  question: string | null;
  onClose: () => void;
};

/**
 * Sharing one question, after the web's modal: a title, a line of explanation, a
 * PREVIEW of the card, and the actions under it.
 *
 * The preview is a rendered view rather than an image, exactly as on the web —
 * which is what makes two of the three actions free. Sharing and copying work on
 * text; only "download the image" needs the card rasterised, and that needs a
 * native dependency (react-native-view-shot, plus something to reach the gallery)
 * so it is deliberately not here. The preview is built from our own tokens, so it
 * is dark where the web's is light: the web has a light theme, this app does not.
 *
 * Clipboard comes from React Native core. It warns that it has moved out of core
 * and will go one day, and that is a real future cost — but the alternative today
 * is a native dependency for one button, and the whole point of leaving the image
 * out was not paying that for this modal.
 */
export function ShareQuestionModal({ visible, question, onClose }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { show } = useToast();

  // What travels: the question, the invitation, and the link. Built once so the
  // two actions cannot drift into sharing different things.
  const message =
    question === null
      ? ''
      : `${question}\n\n${pl.shareQuestion.previewInvite}\n${SHARE_URL}`;

  const onShare = async () => {
    try {
      await Share.share({ message });
    } catch {
      // The sheet failed to open. Nothing was promised and nothing was claimed.
    }
  };

  const onCopy = () => {
    Clipboard.setString(message);
    // The toast rather than an Alert, for the reason it exists: this reports
    // something that already happened and must not demand a tap.
    show(pl.shareQuestion.copied);
  };

  return (
    <Modal
      visible={visible && question !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View testID="share-question-modal" style={styles.sheet}>
          <TouchableOpacity
            testID="share-question-close"
            onPress={onClose}
            accessibilityLabel={pl.shareQuestion.close}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.close}>
            <Text style={styles.closeGlyph}>✕</Text>
          </TouchableOpacity>

          <Text style={styles.title}>{pl.shareQuestion.title}</Text>
          <Text style={styles.subtitle}>{pl.shareQuestion.subtitle}</Text>

          {/* The card as the other person will meet it: the wordmark, the
              question, and where it came from. */}
          <View testID="share-question-preview" style={styles.preview}>
            <Logo size={theme.typography.size.h3} />
            <Text
              testID="share-question-preview-body"
              style={styles.previewBody}>
              {question}
            </Text>
            <Text style={styles.previewInvite}>
              {pl.shareQuestion.previewInvite}
            </Text>
            <Text style={styles.previewFooter}>
              {pl.shareQuestion.previewFooter}
            </Text>
          </View>

          <GoldButton
            testID="share-question-share"
            title={pl.shareQuestion.shareAction}
            onPress={onShare}
            style={styles.action}
          />
          <OutlineButton
            testID="share-question-copy"
            title={pl.shareQuestion.copyAction}
            onPress={onCopy}
            style={styles.action}
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing, radius, glow } = theme;
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    sheet: {
      backgroundColor: colors.bg.base,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border.gold,
      padding: spacing.xxl,
    },
    close: {
      position: 'absolute',
      top: spacing.md,
      right: spacing.lg,
      zIndex: 1,
    },
    closeGlyph: {
      fontFamily: typography.family.body,
      fontSize: typography.size.h3,
      color: colors.text.muted,
    },
    title: withGlowRoom({
      ...glow.heading,
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
      textAlign: 'center',
    }),
    subtitle: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
    },
    preview: {
      backgroundColor: colors.bg.surface,
      borderWidth: 1.5,
      borderColor: colors.gold.deep,
      borderRadius: radius.md,
      padding: spacing.xl,
      alignItems: 'center',
    },
    // The question, and NOT glowing — the 3C boundary holds inside a preview
    // just as it does on the card itself.
    previewBody: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
      textAlign: 'center',
      lineHeight: typography.size.h3 * 1.4,
      marginTop: spacing.xl,
      marginBottom: spacing.xl,
    },
    previewInvite: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.secondary,
      textAlign: 'center',
    },
    previewFooter: {
      fontFamily: typography.family.body,
      fontSize: typography.size.micro,
      color: colors.text.muted,
      marginTop: spacing.lg,
    },
    action: {
      marginTop: spacing.md,
    },
  });
};
