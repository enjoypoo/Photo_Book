/**
 * SortableList v2 — Drag-to-reorder with ghost/floating card UX
 *
 * Visual feedback:
 *  - Dragged card lifts and floats above the list (scale + shadow)
 *  - Ghost placeholder stays at original position (dashed outline)
 *  - Drop zone highlights the destination slot (purple border)
 *  - Other items spring-animate to make room
 *  - On release: card snaps to target position, then list reorders
 *
 * Stability fix:
 *  - All mutable values (onOrderChange, items, etc.) accessed via refs
 *  - panResponders only recreated when item COUNT changes
 *  - No callback prop in useMemo deps → gestures never interrupted mid-drag
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, PanResponder, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface DragHandleProps {
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
}

interface Props<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, isDragging: boolean, handle: DragHandleProps) => React.ReactNode;
  onOrderChange: (newData: T[]) => void;
  itemHeight: number;
  contentContainerStyle?: object;
  ListHeaderComponent?: React.ReactNode;
}

export default function SortableList<T>({
  data,
  keyExtractor,
  renderItem,
  onOrderChange,
  itemHeight,
  contentContainerStyle,
  ListHeaderComponent,
}: Props<T>) {
  const [items, setItems] = useState<T[]>(data);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // ── Refs: always up-to-date, safe to read inside PanResponder callbacks ──
  const itemsRef = useRef<T[]>(data);
  const onOrderChangeRef = useRef(onOrderChange);
  const keyExtractorRef = useRef(keyExtractor);
  const itemHeightRef = useRef(itemHeight);

  // Keep refs in sync every render (no deps needed)
  onOrderChangeRef.current = onOrderChange;
  keyExtractorRef.current = keyExtractor;
  itemHeightRef.current = itemHeight;

  const activeIndexRef = useRef(-1);
  const hoverIndexRef = useRef(-1);
  const scrollOffsetRef = useRef(0);
  const capturedScrollY = useRef(0);
  const headerHeightRef = useRef(0);
  const dragBaseY = useRef(0);

  const dragY = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shiftAnims = useRef<Animated.Value[]>(data.map(() => new Animated.Value(0)));

  // Sync when external data changes (deletion / addition from parent)
  useEffect(() => {
    const newKeys = data.map(keyExtractorRef.current).join(',');
    const curKeys = itemsRef.current.map(keyExtractorRef.current).join(',');
    if (newKeys !== curKeys) {
      setItems(data);
      itemsRef.current = data;
      while (shiftAnims.current.length < data.length) {
        shiftAnims.current.push(new Animated.Value(0));
      }
      shiftAnims.current.length = data.length;
    }
  }, [data]);

  // ── Shift animations: stable because shiftAnims is a ref ──
  const updateShifts = useCallback((from: number, to: number) => {
    const h = itemHeightRef.current;
    shiftAnims.current.forEach((anim, i) => {
      if (i === from) return;
      let toValue = 0;
      if (from < to && i > from && i <= to) toValue = -h;
      else if (from > to && i >= to && i < from) toValue = h;
      Animated.spring(anim, { toValue, useNativeDriver: true, tension: 360, friction: 28 }).start();
    });
  }, []); // no deps — uses itemHeightRef

  const resetShifts = useCallback(() => {
    // Instant reset — no spring-back animation so the list doesn't jump on drop
    shiftAnims.current.forEach(anim => anim.setValue(0));
  }, []);

  // ── Commit reorder after snap animation ──
  const commitReorder = useCallback((from: number, to: number) => {
    setActiveIndex(-1);
    setIsDragging(false);
    setScrollEnabled(true);
    resetShifts();
    dragY.setValue(0);

    if (from !== to) {
      const newItems = [...itemsRef.current];
      const [removed] = newItems.splice(from, 1);
      newItems.splice(to, 0, removed);
      setItems(newItems);
      itemsRef.current = newItems;
      onOrderChangeRef.current(newItems);   // ← ref, never stale
    }
  }, [dragY, resetShifts]);

  // ── PanResponders: only recreated when item COUNT changes ──
  const panResponders = useMemo(
    () =>
      Array.from({ length: items.length }, (_, index) =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,

          onPanResponderGrant: () => {
            capturedScrollY.current = scrollOffsetRef.current;
            const h = itemHeightRef.current;
            const startY = headerHeightRef.current + index * h - capturedScrollY.current;
            dragBaseY.current = startY;
            dragY.setValue(startY);

            activeIndexRef.current = index;
            hoverIndexRef.current = index;

            setActiveIndex(index);
            setIsDragging(true);
            setScrollEnabled(false);

            Animated.spring(scaleAnim, {
              toValue: 1.06,
              useNativeDriver: true,
              tension: 280,
              friction: 18,
            }).start();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },

          onPanResponderMove: (_, gs) => {
            const h = itemHeightRef.current;
            dragY.setValue(dragBaseY.current + gs.dy);

            const newHover = Math.max(
              0,
              Math.min(itemsRef.current.length - 1, Math.round(index + gs.dy / h)),
            );
            if (newHover !== hoverIndexRef.current) {
              hoverIndexRef.current = newHover;
              updateShifts(index, newHover);
              Haptics.selectionAsync();
            }
          },

          onPanResponderRelease: () => {
            const from = activeIndexRef.current;
            const to = hoverIndexRef.current;

            activeIndexRef.current = -1;
            hoverIndexRef.current = -1;

            // Scale back to normal, then immediately commit (no position snap)
            // Position snap caused a visible pause + list-jump after drop
            scaleAnim.setValue(1);
            commitReorder(from, to);

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },

          onPanResponderTerminate: () => {
            scaleAnim.setValue(1);
            activeIndexRef.current = -1;
            hoverIndexRef.current = -1;
            dragY.setValue(0);
            resetShifts();
            setActiveIndex(-1);
            setIsDragging(false);
            setScrollEnabled(true);
          },
        }),
      ),
    // Only recreate when count changes — everything else uses refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items.length],
  );

  return (
    <View style={styles.container}>
      <ScrollView
        scrollEnabled={scrollEnabled}
        onScroll={e => { scrollOffsetRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={false}
      >
        {ListHeaderComponent ? (
          <View onLayout={e => { headerHeightRef.current = e.nativeEvent.layout.height; }}>
            {ListHeaderComponent}
          </View>
        ) : null}

        {items.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <Animated.View
              key={keyExtractor(item)}
              style={{
                transform: [{ translateY: shiftAnims.current[index] ?? new Animated.Value(0) }],
              }}
            >
              {/*
               * ★ FREEZE FIX ★
               * The View wrapper and renderItem are ALWAYS rendered with the SAME
               * component tree structure — only props/styles change.
               *
               * Why this matters: React reconciles same-position same-type nodes
               * in-place (no unmount). So the panHandlers View keeps its native ID
               * across re-renders → React Native never terminates the active gesture.
               *
               * Previous attempts (conditional ghost vs card) changed the tree
               * structure, causing React to unmount+remount the card and killing
               * the gesture on every state update after onPanResponderGrant.
               */}
              <View style={isActive ? styles.slotHidden : undefined}>
                {renderItem(item, index, false, {
                  panHandlers: panResponders[index]?.panHandlers ?? {},
                })}
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Floating dragged card — follows the finger */}
      {isDragging && activeIndex >= 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floatingCard,
            { transform: [{ translateY: dragY }, { scale: scaleAnim }] },
          ]}
        >
          {renderItem(items[activeIndex], activeIndex, true, { panHandlers: {} })}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Hides the slot card while keeping it mounted (opacity 0, not unmounted)
  slotHidden: {
    opacity: 0,
  },

  floatingCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.3,
    shadowRadius: 22,
    elevation: 18,
  },
});
