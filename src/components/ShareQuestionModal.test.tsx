import React, {ReactElement} from 'react';
import {Clipboard, Share} from 'react-native';
import {fireEvent, render, screen, waitFor} from '@testing-library/react-native';
import {ThemeProvider} from '../theme';
import {ToastProvider} from './Toast';
import {ShareQuestionModal} from './ShareQuestionModal';
import {pl} from '../i18n/pl';

const QUESTION = 'Co Cię dziś rozśmieszyło?';

const renderModal = (ui: ReactElement) =>
  render(
    <ThemeProvider>
      <ToastProvider>{ui}</ToastProvider>
    </ThemeProvider>,
  );

const open = (onClose = jest.fn()) =>
  renderModal(
    <ShareQuestionModal visible question={QUESTION} onClose={onClose} />,
  );

describe('ShareQuestionModal', () => {
  beforeEach(() => jest.clearAllMocks());

  test('previews the card the other person will meet', async () => {
    open();

    expect(
      await screen.findByTestId('share-question-preview-body'),
    ).toHaveTextContent(QUESTION);
    expect(screen.getByText(pl.shareQuestion.previewFooter)).toBeOnTheScreen();
  });

  // Both actions send the same thing, which is why the message is built once.
  test('sharing hands the question, the invitation and the link to the sheet', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    } as never);
    open();

    fireEvent.press(await screen.findByTestId('share-question-share'));

    await waitFor(() => expect(share).toHaveBeenCalled());
    const {message} = share.mock.calls[0][0] as {message: string};
    expect(message).toContain(QUESTION);
    expect(message).toContain(pl.shareQuestion.previewInvite);
    expect(message).toContain('jaity.app');
    share.mockRestore();
  });

  test('copying puts the same text on the clipboard', async () => {
    const setString = jest.spyOn(Clipboard, 'setString').mockImplementation();
    const share = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    } as never);
    open();

    fireEvent.press(await screen.findByTestId('share-question-copy'));
    fireEvent.press(screen.getByTestId('share-question-share'));

    await waitFor(() => expect(share).toHaveBeenCalled());
    const shared = (share.mock.calls[0][0] as {message: string}).message;
    expect(setString).toHaveBeenCalledWith(shared);
    setString.mockRestore();
    share.mockRestore();
  });

  // Through the toast, not an Alert: it reports something that already happened
  // and must not demand a tap to get out of the way.
  test('copying says so without interrupting', async () => {
    jest.spyOn(Clipboard, 'setString').mockImplementation();
    open();

    fireEvent.press(await screen.findByTestId('share-question-copy'));

    expect(screen.getByTestId('toast')).toHaveTextContent(
      pl.shareQuestion.copied,
    );
  });

  test('the close button closes it', async () => {
    const onClose = jest.fn();
    open(onClose);

    fireEvent.press(await screen.findByTestId('share-question-close'));

    expect(onClose).toHaveBeenCalled();
  });

  // "Download the image" is the one action left out, because rasterising the
  // preview needs a native dependency. Pinned so its absence stays a decision.
  test('offers exactly the two actions that need no native dependency', async () => {
    open();

    expect(await screen.findByTestId('share-question-share')).toBeOnTheScreen();
    expect(screen.getByTestId('share-question-copy')).toBeOnTheScreen();
    expect(screen.queryByTestId('share-question-image')).toBeNull();
  });

  // The 3C boundary holds inside a preview just as it does on the card: the
  // question is what a couple reads, wherever it is drawn.
  test('the previewed question does not glow', async () => {
    open();

    const body = await screen.findByTestId('share-question-preview-body');
    const style = Object.assign(
      {},
      ...[body.props.style].flat(Infinity).filter(Boolean),
    );

    expect(style.textShadowRadius).toBeFalsy();
  });
});
