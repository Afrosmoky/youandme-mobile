import React from 'react';
import axios from 'axios';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {CategoryPickerScreen} from './CategoryPickerScreen';
import {listCategories} from '../api/categories';
import {startSession} from '../api/sessions';
import type {RootStackParamList} from '../navigation/types';
import {pl} from '../i18n/pl';

jest.mock('../api/categories', () => ({listCategories: jest.fn()}));
jest.mock('../api/sessions', () => ({startSession: jest.fn()}));

type Props = NativeStackScreenProps<RootStackParamList, 'CategoryPicker'>;
type RenderProp = (p: object) => React.ReactElement;

// Pulls the latest navigation.setOptions payload and renders a header render
// prop (the real navigator isn't mounted under Jest).
function renderHeader(props: Props, key: 'headerRight') {
  const calls = jest.mocked(props.navigation.setOptions).mock.calls;
  const opts = calls[calls.length - 1][0];
  return render((opts[key] as unknown as RenderProp)({}));
}

const categories = [
  {
    slug: 'randka',
    name: 'Randka',
    description: null,
    tone: null,
    premiumOnly: false,
    ordering: 3,
  },
  {
    slug: 'na_poznanie',
    name: 'Na poznanie',
    description: null,
    tone: null,
    premiumOnly: false,
    ordering: 1,
  },
  {
    slug: 'intymnosc',
    name: 'Intymność',
    description: null,
    tone: null,
    premiumOnly: false,
    ordering: 2,
  },
];

const session = {
  ulid: 's_01',
  mode: 'local',
  category: {slug: 'na_poznanie', name: 'Na poznanie'},
  startedAt: '2026-06-15T20:14:00Z',
  endedAt: null,
  currentIndex: 0,
  remainingCount: 20,
  cardsDrawnCount: 0,
  cardsSavedCount: 0,
};

const navigate = jest.fn();

function makeProps(): Props {
  return {
    navigation: {navigate, setOptions: jest.fn(), goBack: jest.fn()},
    route: {key: 'CategoryPicker', name: 'CategoryPicker', params: undefined},
  } as unknown as Props;
}

describe('CategoryPickerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(listCategories).mockResolvedValue(categories);
    jest.mocked(startSession).mockResolvedValue(session);
    jest.mocked(axios.isAxiosError).mockReturnValue(false);
  });

  test('renders a tile for each category from the API', async () => {
    render(<CategoryPickerScreen {...makeProps()} />);

    expect(await screen.findByTestId('category-na_poznanie')).toBeOnTheScreen();
    expect(screen.getByTestId('category-intymnosc')).toBeOnTheScreen();
    expect(screen.getByTestId('category-randka')).toBeOnTheScreen();
  });

  test('renders the mix button', async () => {
    render(<CategoryPickerScreen {...makeProps()} />);

    expect(await screen.findByTestId('category-picker-mix')).toBeOnTheScreen();
  });

  test('the header memories button navigates to Memories', async () => {
    const props = makeProps();
    render(<CategoryPickerScreen {...props} />);
    await screen.findByTestId('category-na_poznanie');

    const header = renderHeader(props, 'headerRight');
    fireEvent.press(header.getByTestId('category-picker-memories'));

    expect(navigate).toHaveBeenCalledWith('Memories');
  });

  test('tapping a category starts a session and navigates to Question', async () => {
    render(<CategoryPickerScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('category-na_poznanie'));

    await waitFor(() =>
      expect(startSession).toHaveBeenCalledWith('na_poznanie'),
    );
    expect(navigate).toHaveBeenCalledWith('Question', {sessionUlid: 's_01'});
  });

  test('tapping mix starts a session with null', async () => {
    render(<CategoryPickerScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('category-picker-mix'));

    await waitFor(() => expect(startSession).toHaveBeenCalledWith(null));
  });

  test('a 409 response resumes the active session without params', async () => {
    jest
      .mocked(startSession)
      .mockRejectedValueOnce({response: {status: 409}});
    jest.mocked(axios.isAxiosError).mockReturnValue(true);

    render(<CategoryPickerScreen {...makeProps()} />);
    fireEvent.press(await screen.findByTestId('category-na_poznanie'));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('Question'));
  });

  test('shows a spinner while categories are loading', () => {
    jest.mocked(listCategories).mockReturnValue(new Promise(() => {}));

    render(<CategoryPickerScreen {...makeProps()} />);

    expect(screen.getByText(pl.categoryPicker.loading)).toBeOnTheScreen();
  });

  test('shows an error message when loading categories fails', async () => {
    jest.mocked(listCategories).mockRejectedValueOnce(new Error('network'));

    render(<CategoryPickerScreen {...makeProps()} />);

    expect(
      await screen.findByTestId('category-picker-error'),
    ).toHaveTextContent(pl.categoryPicker.error);
  });
});
