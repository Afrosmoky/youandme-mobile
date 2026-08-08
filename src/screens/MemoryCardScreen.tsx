import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useMemory } from '../queries/useMemory';
import { useSetMemoryFavorite } from '../queries/useSetMemoryFavorite';
import { useUpdateMemory } from '../queries/useUpdateMemory';
import { useDeleteMemory } from '../queries/useDeleteMemory';
import { parseApiError } from '../api/errors';
import { ScreenContainer } from '../components/ScreenContainer';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Banner } from '../components/Banner';
import { SectionLabel } from '../components/SectionLabel';
import { TextField } from '../components/TextField';
import { GoldButton } from '../components/GoldButton';
import { OutlineButton } from '../components/OutlineButton';
import { LikeHeart } from '../components/LikeHeart';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryCard'>;

const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'long',
  timeStyle: 'short',
});

// Same mapping as the list; both screens show the origin of a memory.
function originLabel(origin: string): string {
  switch (origin) {
    case 'session':
      return pl.memories.origin.session;
    case 'daily':
      return pl.memories.origin.daily;
    case 'challenge':
      return pl.memories.origin.challenge;
    case 'local_game':
      return pl.memories.origin.localGame;
    default:
      return origin;
  }
}

// One memory in full (P9): re-opened from the list, hearted, edited or removed
// here. Reads through useMemory rather than digging the memory out of the list
// cache, because in slice 2 the same screen opens from an anniversary push,
// where the memory is a year old and nowhere near the first cursor page.
export function MemoryCardScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { memoryUlid } = route.params;

  const { data: memory, isLoading, isError } = useMemory(memoryUlid);
  const favorite = useSetMemoryFavorite();
  const update = useUpdateMemory();
  const remove = useDeleteMemory();

  const [editing, setEditing] = useState(false);
  const [answerA, setAnswerA] = useState('');
  const [answerB, setAnswerB] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [topError, setTopError] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: { backgroundColor: theme.colors.bg.base },
      headerTintColor: theme.colors.gold.primary,
      headerShadowVisible: false,
      headerTitleAlign: 'center',
      // eslint-disable-next-line react/no-unstable-nested-components
      headerTitle: () => (
        <Text style={styles.headerTitle}>{pl.memoryCard.headerTitle}</Text>
      ),
    });
  }, [navigation, styles, theme]);

  // A memory that cannot be read is not a screen worth sitting on — most often
  // it is a push pointing at something since deleted. Fall back to the list
  // rather than leaving the couple on an empty card (Piotr's call).
  useEffect(() => {
    if (isError) {
      Alert.alert(pl.appTitle, pl.memoryCard.loadError);
      navigation.replace('Memories');
    }
  }, [isError, navigation]);

  const onToggleFavorite = () => {
    if (!memory || favorite.isPending) {
      return;
    }
    favorite.mutate(
      { ulid: memory.ulid, favorite: !memory.isFavorite },
      {
        onError: () => {
          Alert.alert(pl.appTitle, pl.memories.favoriteError);
        },
      },
    );
  };

  const onStartEditing = () => {
    if (!memory) {
      return;
    }
    // Seed both fields from the card. The edit is a full replacement, so the
    // screen has to start out holding everything the save will send.
    setAnswerA(memory.answerA);
    setAnswerB(memory.answerB ?? '');
    setFieldError(null);
    setTopError(null);
    setEditing(true);
  };

  const onSave = () => {
    if (!memory) {
      return;
    }
    if (answerA.trim().length === 0) {
      setFieldError(pl.memoryCard.emptyAnswer);
      return;
    }
    setFieldError(null);
    setTopError(null);
    const trimmedB = answerB.trim();
    update.mutate(
      {
        ulid: memory.ulid,
        answerA: answerA.trim(),
        // Both answers travel every time, and an emptied partner field travels
        // as an explicit null — that is how the contract says "they said
        // nothing", and leaving the key out would mean the same thing by
        // accident rather than on purpose.
        answerB: trimmedB.length > 0 ? trimmedB : null,
      },
      {
        onSuccess: () => setEditing(false),
        onError: err => {
          const parsed = parseApiError(err, pl.memoryCard.saveError);
          setFieldError(parsed.fields.answer_a ?? null);
          setTopError(parsed.topLevel);
        },
      },
    );
  };

  const onDelete = () => {
    if (!memory) {
      return;
    }
    Alert.alert(pl.memoryCard.deleteTitle, pl.memoryCard.deleteMessage, [
      { text: pl.memoryCard.cancel, style: 'cancel' },
      {
        text: pl.memoryCard.deleteConfirm,
        style: 'destructive',
        onPress: () =>
          remove.mutate(memory.ulid, {
            onSuccess: () => navigation.goBack(),
            onError: () => Alert.alert(pl.appTitle, pl.memoryCard.deleteError),
          }),
      },
    ]);
  };

  if (isLoading || !memory) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.gold.primary} />
      </View>
    );
  }

  return (
    <ScreenContainer testID="memory-card-screen">
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.categorySlot}>
            {memory.question.category && (
              <SectionLabel>{memory.question.category.name}</SectionLabel>
            )}
          </View>
          <Badge testID="memory-card-origin">{originLabel(memory.origin)}</Badge>
          <LikeHeart
            testID="memory-card-favorite"
            liked={memory.isFavorite}
            onToggle={onToggleFavorite}
            disabled={favorite.isPending}
          />
        </View>

        <Text testID="memory-card-question" style={styles.question}>
          {memory.question.body}
        </Text>

        {editing ? (
          <>
            {topError && (
              <Banner
                variant="error"
                testID="memory-card-error"
                title={topError}
                style={styles.banner}
              />
            )}
            <TextField
              testID="memory-card-answer-a-input"
              label={pl.memoryCard.answerLabel(memory.playerAName)}
              value={answerA}
              onChangeText={value => {
                setAnswerA(value);
                setFieldError(null);
              }}
              error={fieldError ?? undefined}
              multiline
            />
            <TextField
              testID="memory-card-answer-b-input"
              label={
                memory.playerBName
                  ? pl.memoryCard.answerLabel(memory.playerBName)
                  : pl.memoryCard.partnerAnswerLabel
              }
              value={answerB}
              onChangeText={setAnswerB}
              hint={pl.memoryCard.partnerHint}
              multiline
            />
            <GoldButton
              testID="memory-card-save"
              title={pl.memoryCard.save}
              onPress={onSave}
              loading={update.isPending}
              style={styles.action}
            />
            <OutlineButton
              testID="memory-card-cancel"
              title={pl.memoryCard.cancel}
              onPress={() => setEditing(false)}
              disabled={update.isPending}
            />
          </>
        ) : (
          <>
            <Text style={styles.playerLabel}>
              {pl.memories.player(memory.playerAName)}
            </Text>
            <Text testID="memory-card-answer-a" style={styles.answer}>
              {memory.answerA}
            </Text>

            {memory.answerB !== null && memory.playerBName && (
              <>
                <Text style={styles.playerLabel}>
                  {pl.memories.player(memory.playerBName)}
                </Text>
                <Text testID="memory-card-answer-b" style={styles.answer}>
                  {memory.answerB}
                </Text>
              </>
            )}

            <Text style={styles.date}>
              {dateFormatter.format(new Date(memory.answeredAt))}
            </Text>
          </>
        )}
      </Card>

      {!editing && (
        <>
          <OutlineButton
            testID="memory-card-edit"
            title={pl.memoryCard.edit}
            onPress={onStartEditing}
            style={styles.action}
          />
          <TouchableOpacity
            testID="memory-card-delete"
            onPress={onDelete}
            disabled={remove.isPending}>
            <Text style={styles.delete}>{pl.memoryCard.delete}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScreenContainer>
  );
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.bg.base,
    },
    headerTitle: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h2,
      color: colors.text.primary,
    },
    card: {
      marginBottom: spacing.xl,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    categorySlot: {
      flex: 1,
    },
    question: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
      marginBottom: spacing.lg,
    },
    banner: {
      marginBottom: spacing.lg,
    },
    playerLabel: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.text.muted,
      marginBottom: spacing.xs,
    },
    answer: {
      fontFamily: typography.family.body,
      fontSize: typography.size.body,
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    date: {
      fontFamily: typography.family.body,
      fontSize: typography.size.micro,
      color: colors.text.muted,
    },
    action: {
      marginBottom: spacing.md,
    },
    // Removing a memory is deliberately the quietest control on the screen: a
    // burgundy text link, not a button competing with "edit".
    delete: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.burgundy.accent,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
  });
};
