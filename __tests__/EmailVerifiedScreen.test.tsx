import React from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {screen, waitFor} from '@testing-library/react-native';
import {renderWithQueryClient} from '../src/test/renderWithQueryClient';
import {EmailVerifiedScreen} from '../src/screens/EmailVerifiedScreen';
import {queryKeys} from '../src/queries/queryKeys';
import type {RootStackParamList} from '../src/navigation/types';
import {pl} from '../src/i18n/pl';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerified'>;

function makeProps(): Props {
  return {
    navigation: {navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn()},
    route: {key: 'EmailVerified', name: 'EmailVerified', params: undefined},
  } as unknown as Props;
}

// Where jaity://email-verified lands. The verifying happened on the backend, so
// this screen only confirms it - and drops the status the app is still holding.
describe('EmailVerifiedScreen', () => {
  test('confirms the verification in words', () => {
    renderWithQueryClient(<EmailVerifiedScreen {...makeProps()} />);

    expect(screen.getByTestId('email-verified-title')).toHaveTextContent(
      pl.emailVerified.title,
    );
    expect(screen.getByTestId('email-verified-body')).toHaveTextContent(
      pl.emailVerified.body,
    );
    expect(screen.getByTestId('email-verified-badge')).toHaveTextContent(
      pl.emailVerified.badge,
    );
  });

  // The load-bearing part: the app was almost certainly running while the
  // browser did the verifying, so the cached status still says `false` and the
  // profile's "confirm your email" banner would stay up.
  test('drops the cached verification status', async () => {
    const {queryClient} = renderWithQueryClient(
      <EmailVerifiedScreen {...makeProps()} />,
    );
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    renderWithQueryClient(<EmailVerifiedScreen {...makeProps()} />, queryClient);

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.verificationStatus,
      }),
    );
  });
});
