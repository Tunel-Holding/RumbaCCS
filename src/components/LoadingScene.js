import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions, ActivityIndicator } from 'react-native';
import COLORS from '../constants/colors';

const { width } = Dimensions.get('window');

// Usage:
// <LoadingOverlay variant="brand-spinner" message="Cargando..." visible={isLoading} onHidden={() => {}} />
// If `visible` is omitted, the component will fade in on mount and unmount immediately when removed.
// Variants: brand-spinner | skeleton-cards | pulsing-logo | ticket-flip | topbar-progress | dots-bounce
export default function LoadingOverlay({ variant = 'brand-spinner', message = 'Cargando datos...', visible = true, onHidden }) {
  const [render, setRender] = useState(true);
  const opacity = useRef(new Animated.Value(0)).current;

  // Fade in on mount
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  // When visibility turns false (for screens that keep it mounted), fade out then unrender
  useEffect(() => {
    if (!visible) {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setRender(false);
          if (typeof onHidden === 'function') onHidden();
        }
      });
    } else {
      // ensure it's rendered again if parent toggles back to visible
      if (!render) setRender(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [visible, opacity, render, onHidden]);

  if (!render) return null;

  let content = null;
  switch (variant) {
    case 'skeleton-cards':
      content = <SkeletonCards message={message} />;
      break;
    case 'pulsing-logo':
      content = <PulsingLogo message={message} />;
      break;
    case 'ticket-flip':
      content = <TicketFlip message={message} />;
      break;
    case 'topbar-progress':
      content = <TopbarProgress message={message} />;
      break;
    case 'dots-bounce':
      content = <DotsBounce message={message} />;
      break;
    case 'brand-spinner':
    default:
      content = <BrandSpinner message={message} />;
  }

  return (
    <Animated.View style={{ flex: 1, opacity }} pointerEvents={visible ? 'auto' : 'none'}>
      {content}
    </Animated.View>
  );
}

function BaseOverlay({ children }) {
  return (
    <View style={[StyleSheet.absoluteFillObject, styles.full, { backgroundColor: COLORS.bg }]}> 
      <View style={styles.center}>{children}</View>
    </View>
  );
}

function BrandSpinner({ message }) {
  return (
    <BaseOverlay>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.msg}>{message}</Text>
    </BaseOverlay>
  );
}

function SkeletonCards({ message }) {
  // Shimmer animation across skeleton cards
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);
  const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });

  const Card = () => (
    <View style={styles.cardSkeleton}>
      <View style={styles.cardImageSkeleton}>
        <Animated.View style={[styles.shimmer, { transform: [{ translateX }] }]} />
      </View>
      <View style={styles.cardLine} />
      <View style={[styles.cardLine, { width: '60%' }]} />
      <View style={[styles.cardPill]} />
    </View>
  );

  return (
    <BaseOverlay>
      <View style={{ width: '100%', paddingHorizontal: 12 }}>
        <View style={styles.cardGrid}> 
          <Card />
          <Card />
        </View>
        <Text style={[styles.msg, { marginTop: 16 }]}>{message}</Text>
      </View>
    </BaseOverlay>
  );
}

function PulsingLogo({ message }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.12, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <BaseOverlay>
      <Animated.Text style={[styles.brandText, { transform: [{ scale }] }]}>R U M B A <Text style={{ color: COLORS.accent }}>CCS</Text></Animated.Text>
      <Text style={styles.msg}>{message}</Text>
    </BaseOverlay>
  );
}

function TicketFlip({ message }) {
  // A simple ticket-like block flipping in 3D
  const rotate = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [rotate]);
  const rotY = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <BaseOverlay>
      <Animated.View style={[styles.ticket, { transform: [{ rotateY: rotY }] }]} />
      <Text style={styles.msg}>{message}</Text>
    </BaseOverlay>
  );
}

function TopbarProgress({ message }) {
  const prog = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(prog, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: false }),
        Animated.timing(prog, { toValue: 0, duration: 0, easing: Easing.linear, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [prog]);
  const widthPct = prog.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <BaseOverlay>
      <View style={styles.topbarContainer}>
        <Animated.View style={[styles.topbarFill, { width: widthPct }]} />
      </View>
      <Text style={styles.msg}>{message}</Text>
    </BaseOverlay>
  );
}

function DotsBounce({ message }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const gen = (val, delay) => Animated.loop(Animated.sequence([
    Animated.timing(val, { toValue: -8, duration: 280, easing: Easing.out(Easing.quad), delay, useNativeDriver: true }),
    Animated.timing(val, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
  ]));

  useEffect(() => {
    const l1 = gen(dot1, 0); const l2 = gen(dot2, 120); const l3 = gen(dot3, 240);
    l1.start(); l2.start(); l3.start();
    return () => { l1.stop(); l2.stop(); l3.stop(); };
  }, [dot1, dot2, dot3]);

  return (
    <BaseOverlay>
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[styles.dot, { transform: [{ translateY: dot3 }] }]} />
      </View>
      <Text style={styles.msg}>{message}</Text>
    </BaseOverlay>
  );
}

const CARD_WIDTH = width < 600 ? width - 32 : (width - 48) / 2;

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  center: { alignItems: 'center', justifyContent: 'center' },
  msg: { color: COLORS.text, marginTop: 10, fontSize: 16 },

  // skeletons
  cardGrid: { flexDirection: width < 600 ? 'column' : 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cardSkeleton: { backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginBottom: 16, width: CARD_WIDTH, alignSelf: 'center', overflow: 'hidden' },
  cardImageSkeleton: { width: '100%', height: 150, borderRadius: 8, backgroundColor: COLORS.bgAlt, overflow: 'hidden' },
  shimmer: { position: 'absolute', top: 0, bottom: 0, width: '50%', backgroundColor: 'rgba(255,255,255,0.08)' },
  cardLine: { height: 12, backgroundColor: COLORS.bgAlt, borderRadius: 6, marginTop: 12 },
  cardPill: { height: 18, width: 120, backgroundColor: COLORS.secondary, borderRadius: 9, marginTop: 12, opacity: 0.6 },

  // pulsing logo
  brandText: { fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: 2 },

  // ticket flip
  ticket: { width: 160, height: 90, backgroundColor: COLORS.primary, borderRadius: 12, marginBottom: 8, backfaceVisibility: 'hidden' },

  // topbar progress
  topbarContainer: { width: '84%', height: 4, backgroundColor: COLORS.bgAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  topbarFill: { height: '100%', backgroundColor: COLORS.secondary },

  // dots
  dotsRow: { flexDirection: 'row', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, marginHorizontal: 4 },
});
