import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import nodesData from '../assets/progressMap/nodes.json';
import {
  NodeState,
  SegmentState,
  cardsToNext,
  mapNodes,
  segmentStates,
} from '../domain/progressMap';
import { Progress } from '../domain/types';
import { Theme, useTheme } from '../theme';
import { pl } from '../i18n/pl';

type Props = {
  progress: Progress;
  // Rendered width in points. The map keeps the artwork's aspect ratio, so the
  // height follows from this.
  width: number;
};

const [, , VIEWBOX_W, VIEWBOX_H] = nodesData.viewBox;

// Fixed height for a label block so it can be centred on its node without
// measuring text first. Roughly two lines plus the "jeszcze N" line.
const LABEL_BLOCK_H = 64;

// Where the "now" plate sits: the offset from its node to the plate's CENTRE,
// in viewBox units. Derived rather than read from nodes.json — that file carries
// a `badge` rect only for node 5, because node 5 is the one the illustration
// happened to draw as current, and reading it would leave the badge homeless
// whenever any other node is the current one.
//
// Position only, no size. The plate used to be a scaled SVG <Rect> with the word
// laid over it in a box of the same scaled width, and that pairing is what cut
// "TERAZ" down to "TERA" on Android: the box shrank with the map (42 viewBox
// units, so 33.6dp on a 360dp screen) while the word did not (fontSize 11 plus
// letterSpacing 1.5 is a constant 39.4dp). Below roughly a 428dp screen the word
// no longer fit, and Android clips what iOS lets overflow — which is exactly why
// only the testers saw it. Plate and word are now one self-sizing View, so the
// plate cannot be narrower than what it holds.
const BADGE_CENTRE = { dx: 0, dy: 42 };

// A transparent box the plate is centred in, big enough that no plausible word
// reaches its edge. It exists so the pill can size itself to its text without
// anything having to measure that text first.
export const BADGE_BOX = { w: 140, h: 40 };

// The artwork draws each trail segment as a symmetric cubic curve: it leaves
// its node straight down, bulges halfway across, and arrives straight down into
// the next. Deriving it from the node coordinates keeps nodes.json the single
// source of geometry — the alternative, six hand-copied `d` strings, would need
// syncing separately on every re-export.
function segmentPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
): string {
  const bend = (to.y - from.y) / 2;
  return `M${from.x} ${from.y} C${from.x} ${from.y + bend} ${to.x} ${
    to.y - bend
  } ${to.x} ${to.y}`;
}

export function ProgressMap({ progress, width }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const nodes = useMemo(() => mapNodes(progress), [progress]);
  const segments = useMemo(() => segmentStates(nodes), [nodes]);
  const remaining = cardsToNext(progress);

  // Everything positional is authored against the 390x880 viewBox, so screen
  // coordinates are viewBox coordinates times this. The SVG scales itself;
  // the text laid over it does not, so it has to be scaled by hand — and any
  // label that skips this lands next to the wrong node.
  const scale = width / VIEWBOX_W;
  const height = VIEWBOX_H * scale;

  const geometry = nodesData.nodes;
  const trail = nodesData.segments;

  return (
    <View testID="progress-map" style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}>
        {segments.map((state, index) => {
          const from = geometry[index];
          const to = geometry[index + 1];
          if (!from || !to) {
            return null;
          }
          return (
            <Path
              // Keyed by state, not just by index. react-native-svg cannot
              // clear strokeDasharray on a recycled view under Fabric on iOS
              // (upstream #3006), so a segment going todo -> done would keep
              // the dashes of its previous life. Changing the key remounts it
              // instead of recycling.
              key={`${trail[index].id}-${state}`}
              d={segmentPath(from, to)}
              stroke={trailStroke(theme, state)}
              strokeWidth={2}
              fill="none"
              strokeDasharray={trailDash(state)}
              strokeLinecap={state === 'done' ? undefined : 'round'}
            />
          );
        })}

        {nodes.map((node, index) => {
          const point = geometry[index];
          if (!point) {
            return null;
          }
          return (
            <MilestoneNode
              key={node.milestone.slug}
              x={point.x}
              y={point.y}
              state={node.state}
              theme={theme}
            />
          );
        })}
      </Svg>

      {nodes.map((node, index) => {
        const point = geometry[index];
        if (!point) {
          return null;
        }
        const alignRight = point.label.align === 'right';
        return (
          <View
            key={node.milestone.slug}
            testID={`progress-label-${node.milestone.slug}`}
            style={[
              styles.label,
              alignRight ? styles.labelRight : styles.labelLeft,
              { top: point.label.y * scale - LABEL_BLOCK_H / 2 },
              alignRight
                ? { right: (VIEWBOX_W - point.label.x) * scale }
                : { left: point.label.x * scale },
            ]}
            pointerEvents="none">
            <Text
              style={[styles.name, node.state === 'locked' && styles.nameLocked]}
              numberOfLines={2}>
              {node.milestone.name}
            </Text>
            <Text style={styles.threshold}>
              {pl.progress.cards(node.milestone.threshold)}
            </Text>
            {node.state === 'current' && remaining !== null && (
              <Text
                testID={`progress-remaining-${node.milestone.slug}`}
                style={styles.remaining}>
                {pl.progress.remaining(
                  progress.totalPlayed,
                  node.milestone.threshold,
                  remaining,
                )}
              </Text>
            )}
          </View>
        );
      })}

      {/* Plate and word together. The outer box only positions; the pill inside
          it takes its size from the text, which is what keeps the word whole on
          a narrow screen. */}
      {nodes.map((node, index) => {
        const point = geometry[index];
        if (node.state !== 'current' || !point) {
          return null;
        }
        return (
          <View
            key={`badge-${node.milestone.slug}`}
            testID={`progress-badge-${node.milestone.slug}`}
            style={[
              styles.badgeBox,
              {
                left: (point.x + BADGE_CENTRE.dx) * scale - BADGE_BOX.w / 2,
                top: (point.y + BADGE_CENTRE.dy) * scale - BADGE_BOX.h / 2,
              },
            ]}
            pointerEvents="none">
            <View
              testID={`progress-badge-plate-${node.milestone.slug}`}
              style={styles.badge}>
              <Text style={styles.badgeText}>{pl.progress.nowBadge}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// One milestone in one of its three looks. The artwork repeats the same shapes
// at each node, so the whole of #milestones collapses into this.
function MilestoneNode({
  x,
  y,
  state,
  theme,
}: {
  x: number;
  y: number;
  state: NodeState;
  theme: Theme;
}) {
  const { colors } = theme;

  if (state === 'unlocked') {
    return (
      <>
        <Circle
          cx={x}
          cy={y}
          r={26}
          fill={colors.gold.primary}
          stroke={colors.gold.borderStrong}
          strokeWidth={1}
        />
        <Path
          d={`M${x - 8} ${y + 0.5} L${x - 2.5} ${y + 6} L${x + 8.5} ${y - 5.5}`}
          fill="none"
          stroke={colors.bg.base}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  if (state === 'current') {
    return (
      <>
        <Circle cx={x} cy={y} r={44} fill={colors.gold.primary} fillOpacity={0.09} />
        <Circle cx={x} cy={y} r={35} fill={colors.gold.primary} fillOpacity={0.07} />
        <Circle
          cx={x}
          cy={y}
          r={28}
          fill={colors.bg.surface}
          stroke={colors.gold.primary}
          strokeWidth={2}
        />
        <Circle cx={x} cy={y} r={6} fill={colors.gold.primary} />
        {/* The plate is NOT drawn here. It is the background of the View that
            holds its word, below — one object, so it cannot end up narrower
            than the text it is a plate for. */}
      </>
    );
  }

  return (
    <>
      <Circle
        cx={x}
        cy={y}
        r={23}
        fill={colors.bg.surface}
        stroke={colors.border.subtle}
        strokeWidth={1}
      />
      <Path
        d={`M${x - 3.5} ${y - 1} V${y - 3.4} C${x - 3.5} ${y - 5.4} ${
          x - 1.9
        } ${y - 7} ${x} ${y - 7} C${x + 1.9} ${y - 7} ${x + 3.5} ${y - 5.4} ${
          x + 3.5
        } ${y - 3.4} V${y - 1}`}
        fill="none"
        stroke={colors.text.muted}
        strokeWidth={1.4}
      />
      <Rect
        x={x - 5.9}
        y={y - 1}
        width={11.8}
        height={8.6}
        rx={2}
        fill={colors.bg.elevated}
        stroke={colors.gold.border}
        strokeWidth={1}
      />
    </>
  );
}

function trailStroke(theme: Theme, state: SegmentState): string {
  if (state === 'done') {
    return theme.colors.gold.deep;
  }
  return state === 'active' ? theme.colors.gold.primary : theme.colors.gold.border;
}

// `done` returns undefined deliberately: a walked stretch is solid. See the key
// comment above for why undefined alone is not enough to clear it on iOS.
function trailDash(state: SegmentState): string | undefined {
  if (state === 'active') {
    return '7 7';
  }
  return state === 'todo' ? '1 9' : undefined;
}

const createStyles = (theme: Theme) => {
  const { colors, typography, spacing } = theme;
  return StyleSheet.create({
    label: {
      position: 'absolute',
      height: LABEL_BLOCK_H,
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    // Left-anchored text starts at the node's label point and runs to the far
    // edge; right-anchored text is the mirror image.
    labelLeft: {
      right: 0,
      alignItems: 'flex-start',
    },
    labelRight: {
      left: 0,
      alignItems: 'flex-end',
    },
    name: {
      fontFamily: typography.family.heading,
      fontSize: typography.size.h3,
      color: colors.text.primary,
    },
    nameLocked: {
      color: colors.text.muted,
    },
    threshold: {
      fontFamily: typography.family.body,
      fontSize: typography.size.micro,
      color: colors.text.muted,
      letterSpacing: typography.letterSpacing.label,
      textTransform: 'uppercase',
      marginTop: spacing.xs,
    },
    remaining: {
      fontFamily: typography.family.body,
      fontSize: typography.size.bodySm,
      color: colors.gold.primary,
      marginTop: spacing.xs,
    },
    // Positions only. Deliberately roomy and transparent: it never clips, which
    // is the whole point of it existing rather than the pill being placed
    // directly.
    badgeBox: {
      position: 'absolute',
      width: BADGE_BOX.w,
      height: BADGE_BOX.h,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // The plate. No width and no height on purpose — it takes both from the
    // word inside it, and a fixed size here is exactly the bug that cut the last
    // letter off on Android. `rx={3}` in the artwork, so 3 rather than radius.sm.
    badge: {
      backgroundColor: colors.burgundy.base,
      borderRadius: 3,
      paddingHorizontal: spacing.xs,
    },
    badgeText: {
      fontFamily: typography.family.body,
      fontSize: typography.size.micro,
      color: colors.text.primary,
      letterSpacing: typography.letterSpacing.label,
    },
  });
};
