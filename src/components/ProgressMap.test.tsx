import React from 'react';
import {StyleSheet} from 'react-native';
import {Path} from 'react-native-svg';
import {render, screen} from '@testing-library/react-native';
import {ThemeProvider} from '../theme';
import {ProgressMap} from './ProgressMap';
import nodesData from '../assets/progressMap/nodes.json';
import type {Milestone, Progress} from '../domain/types';

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

// The artwork is authored against this viewBox; rendering at exactly this width
// means scale === 1, so viewBox coordinates and screen points coincide.
const [, , VIEWBOX_W] = nodesData.viewBox;

const renderMap = (width: number, value: Progress = progress) =>
  render(
    <ThemeProvider>
      <ProgressMap progress={value} width={width} />
    </ThemeProvider>,
  );

const flatStyle = (testID: string) =>
  StyleSheet.flatten(screen.getByTestId(testID).props.style) as Record<
    string,
    number
  >;

describe('ProgressMap layout', () => {
  test('keeps the artwork aspect ratio', () => {
    renderMap(VIEWBOX_W);

    const style = flatStyle('progress-map');
    expect(style.width).toBe(390);
    expect(style.height).toBe(880);
  });

  test('halves the height when rendered at half the width', () => {
    renderMap(VIEWBOX_W / 2);

    const style = flatStyle('progress-map');
    expect(style.width).toBe(195);
    expect(style.height).toBe(440);
  });

  // The SVG scales itself, the text laid over it does not. If a label's
  // position is not scaled by the same factor, it drifts away from its node —
  // invisibly at phone width, where the factor happens to be near 1.
  test('scales label positions by the same factor as the artwork', () => {
    const node = nodesData.nodes[0];

    renderMap(VIEWBOX_W);
    const atFullWidth = flatStyle('progress-label-m1');
    expect(atFullWidth.left).toBe(node.label.x);

    screen.unmount();

    renderMap(VIEWBOX_W / 2);
    const atHalfWidth = flatStyle('progress-label-m1');
    expect(atHalfWidth.left).toBe(node.label.x / 2);
  });

  test('scales vertical label positions too', () => {
    const node = nodesData.nodes[0];

    renderMap(VIEWBOX_W);
    const full = flatStyle('progress-label-m1');

    screen.unmount();

    renderMap(VIEWBOX_W / 2);
    const half = flatStyle('progress-label-m1');

    // Both are the node's y minus half the label block, so halving the scale
    // halves the node contribution while the block height stays fixed.
    const blockH = full.height;
    expect(full.top).toBe(node.label.y - blockH / 2);
    expect(half.top).toBe(node.label.y / 2 - blockH / 2);
  });

  // Right-hand nodes anchor their text by its right edge, so the offset is
  // measured from the far side of the viewBox.
  test('anchors right-side labels from the right edge', () => {
    const rightNode = nodesData.nodes[1];
    expect(rightNode.label.align).toBe('right');

    renderMap(VIEWBOX_W);

    const style = flatStyle('progress-label-m2');
    expect(style.right).toBe(VIEWBOX_W - rightNode.label.x);
  });

  // The badge rect is derived from the node position rather than read from
  // nodes.json, because the file only carries one — for node 5, the node the
  // illustration happened to draw as current. Checking the derived placement
  // against that one recorded rect is what proves the derivation matches the
  // artwork.
  test('places and scales the "now" badge as the artwork does', () => {
    const currentNode = nodesData.nodes[4];
    expect(currentNode.badge).not.toBeNull();

    renderMap(VIEWBOX_W / 2);

    const style = flatStyle('progress-badge-m5');
    expect(style.left).toBe(currentNode.badge!.x / 2);
    expect(style.top).toBe(currentNode.badge!.y / 2);
    expect(style.width).toBe(currentNode.badge!.w / 2);
    expect(style.height).toBe(currentNode.badge!.h / 2);
  });

  // ...and the reason the derivation matters: any node can be the current one.
  test('gives the badge to whichever milestone is current', () => {
    const early: Progress = {
      totalPlayed: 0,
      nextThreshold: 10,
      milestones: progress.milestones.map(m => ({
        ...m,
        unlocked: false,
        unlockedAt: null,
      })),
    };

    renderMap(VIEWBOX_W, early);

    expect(screen.getByTestId('progress-badge-m1')).toBeOnTheScreen();
    expect(screen.queryByTestId('progress-badge-m5')).toBeNull();
  });
});

describe('ProgressMap trail', () => {
  const dashPatterns = () =>
    screen.UNSAFE_getAllByType(Path).map(p => p.props.strokeDasharray);

  test('draws a solid stretch behind, dashes ahead', () => {
    renderMap(VIEWBOX_W);

    // Six trail segments come first, then the node glyphs.
    const trail = dashPatterns().slice(0, 6);
    expect(trail).toEqual([
      undefined,
      undefined,
      undefined,
      '7 7',
      '1 9',
      '1 9',
    ]);
  });

  test('turns a segment solid once its milestone is unlocked', () => {
    const advanced: Progress = {
      ...progress,
      totalPlayed: 160,
      nextThreshold: 250,
      milestones: progress.milestones.map(m =>
        m.ordering === 5 ? {...m, unlocked: true} : m,
      ),
    };

    renderMap(VIEWBOX_W, advanced);

    const trail = dashPatterns().slice(0, 6);
    // The stretch into milestone 5 was dashed and is now walked. Clearing a
    // dash pattern is exactly what react-native-svg cannot do on a recycled
    // view under Fabric on iOS (upstream #3006), which is why the segments are
    // keyed by state and remount instead.
    expect(trail[3]).toBeUndefined();
    expect(trail[4]).toBe('7 7');
  });
});
