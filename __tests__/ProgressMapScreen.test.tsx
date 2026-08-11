import React from 'react';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {ProgressMapScreen} from '../src/screens/ProgressMapScreen';
import {getProgress} from '../src/api/progress';
import type {RootStackParamList} from '../src/navigation/types';
import type {Milestone, Progress} from '../src/domain/types';
import {pl} from '../src/i18n/pl';

jest.mock('../src/api/progress', () => ({getProgress: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'ProgressMap'>;

const milestone = (
  ordering: number,
  threshold: number,
  unlocked: boolean,
): Milestone => ({
  slug: `m${ordering}`,
  name: `Kamień ${ordering}`,
  threshold,
  ordering,
  unlocked,
  unlockedAt: unlocked ? '2026-07-20T18:30:00.000Z' : null,
});

const progress: Progress = {
  totalPlayed: 120,
  nextThreshold: 150,
  milestones: [
    milestone(1, 10, true),
    milestone(2, 30, true),
    milestone(3, 60, true),
    milestone(4, 100, true),
    milestone(5, 150, false),
    milestone(6, 250, false),
    milestone(7, 400, false),
  ],
};

function makeProps(): Props {
  return {
    navigation: {navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn()},
    route: {key: 'ProgressMap', name: 'ProgressMap', params: undefined},
  } as unknown as Props;
}

describe('ProgressMapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getProgress).mockResolvedValue(progress);
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
  });

  test('renders a label for every milestone', async () => {
    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    progress.milestones.forEach(m => {
      expect(screen.getByTestId(`progress-label-${m.slug}`)).toBeOnTheScreen();
    });
  });

  test('shows every milestone name, including the locked ones', async () => {
    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    expect(screen.getByText('Kamień 1')).toBeOnTheScreen();
    // Locked, and still named — the map is meant to show what lies ahead.
    expect(screen.getByText('Kamień 7')).toBeOnTheScreen();
  });

  test('shows the threshold under each milestone', async () => {
    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    expect(screen.getByText(pl.progress.cards(150))).toBeOnTheScreen();
  });

  test('counts down to the next milestone on the current one only', async () => {
    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    expect(screen.getByTestId('progress-remaining-m5')).toHaveTextContent(
      pl.progress.remaining(120, 150, 30),
    );
    expect(screen.queryByTestId('progress-remaining-m4')).toBeNull();
    expect(screen.queryByTestId('progress-remaining-m6')).toBeNull();
  });

  test('puts the "now" badge on the current milestone only', async () => {
    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    expect(screen.getByTestId('progress-badge-m5')).toBeOnTheScreen();
    expect(screen.queryByTestId('progress-badge-m1')).toBeNull();
  });

  test('a complete map counts down to nothing', async () => {
    jest.mocked(getProgress).mockResolvedValue({
      totalPlayed: 500,
      nextThreshold: null,
      milestones: progress.milestones.map(m => ({...m, unlocked: true})),
    });

    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    expect(screen.queryByTestId('progress-badge-m5')).toBeNull();
    progress.milestones.forEach(m => {
      expect(screen.queryByTestId(`progress-remaining-${m.slug}`)).toBeNull();
    });
  });

  test('a fresh couple sees the first milestone as the current one', async () => {
    jest.mocked(getProgress).mockResolvedValue({
      totalPlayed: 0,
      nextThreshold: 10,
      milestones: progress.milestones.map(m => ({
        ...m,
        unlocked: false,
        unlockedAt: null,
      })),
    });

    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    expect(screen.getByTestId('progress-badge-m1')).toBeOnTheScreen();
    expect(screen.getByTestId('progress-remaining-m1')).toHaveTextContent(
      pl.progress.remaining(0, 10, 10),
    );
  });

  // The artwork has seven nodes baked into its geometry. A seed that grows must
  // give a partial map, never a crash or a blank screen.
  test('survives more milestones than the map has nodes', async () => {
    jest.mocked(getProgress).mockResolvedValue({
      ...progress,
      milestones: [
        ...progress.milestones,
        milestone(8, 600, false),
        milestone(9, 900, false),
      ],
    });

    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    expect(screen.getByTestId('progress-label-m7')).toBeOnTheScreen();
    expect(screen.queryByTestId('progress-label-m8')).toBeNull();
    expect(screen.queryByTestId('progress-label-m9')).toBeNull();
  });

  test('survives fewer milestones than the map has nodes', async () => {
    jest.mocked(getProgress).mockResolvedValue({
      totalPlayed: 5,
      nextThreshold: 10,
      milestones: [milestone(1, 10, false), milestone(2, 30, false)],
    });

    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    await screen.findByTestId('progress-map');
    expect(screen.getByTestId('progress-label-m1')).toBeOnTheScreen();
    expect(screen.queryByTestId('progress-label-m3')).toBeNull();
  });

  test('shows an empty state rather than a bare trail when nothing is seeded', async () => {
    jest.mocked(getProgress).mockResolvedValue({
      totalPlayed: 0,
      nextThreshold: null,
      milestones: [],
    });

    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    expect(await screen.findByTestId('progress-empty')).toHaveTextContent(
      pl.progress.empty,
    );
    expect(screen.queryByTestId('progress-map')).toBeNull();
  });

  // P11: the alert that used to fire here closed and left the couple on the
  // empty state, because `!progress` is true after a failed request too — a
  // dropped connection told them their journey had not started yet.
  test('a failed load is an error, not an empty journey', async () => {
    jest.mocked(getProgress).mockRejectedValue(new Error('network'));

    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    expect(await screen.findByTestId('progress-error')).toBeOnTheScreen();
    expect(screen.getByText(pl.progress.loadError)).toBeOnTheScreen();
    expect(screen.queryByTestId('progress-empty')).toBeNull();
    expect(screen.queryByText(pl.progress.empty)).toBeNull();
  });

  test('a lost connection says so instead of blaming the map', async () => {
    // The screens used to alert a fixed `loadError` for every failure, so
    // networkError could never appear. This is why the slice needs no
    // connectivity banner: the message already tells the truth.
    const offline = {isAxiosError: true, response: undefined};
    jest.mocked(axios.isAxiosError).mockImplementation(err => err === offline);
    jest.mocked(getProgress).mockRejectedValue(offline);

    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);

    expect(await screen.findByText(pl.common.networkError)).toBeOnTheScreen();
    expect(screen.queryByText(pl.progress.loadError)).toBeNull();
  });

  test('retry fetches the progress again', async () => {
    jest.mocked(getProgress).mockRejectedValueOnce(new Error('network'));

    renderWithQueryClient(<ProgressMapScreen {...makeProps()} />);
    await screen.findByTestId('progress-error');

    jest.mocked(getProgress).mockResolvedValue(progress);
    fireEvent.press(screen.getByTestId('progress-error-retry'));

    await waitFor(() => expect(getProgress).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('progress-map')).toBeOnTheScreen();
  });
});
