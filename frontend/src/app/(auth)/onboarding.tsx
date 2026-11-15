import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, ScrollView, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/ui/text';
import { BrandGradient, Colors, MaxContentWidth, Radii, Spacing, themedStyles } from '@/constants/theme';
import { completeOnboarding } from '@/lib/onboarding';
import { type ThemePreference, useTheme } from '@/lib/theme-context';

type IconName = keyof typeof Ionicons.glyphMap;

interface Slide {
  key: string;
  eyebrow: string;
  title: string;
  body: string;
  tint: () => string;
  Illustration: (props: { t: Animated.Value }) => ReactNode;
}

// ---------------------------------------------------------------------------
// Animation helpers

/** A 0 → 1 value that replays while its slide is on screen (static when motion is reduced). */
function useLoop(active: boolean, reduceMotion: boolean, duration = 2600) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      t.setValue(1);
      return;
    }
    if (!active) {
      t.stopAnimation();
      t.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
        Animated.delay(1600),
        Animated.timing(t, { toValue: 0, duration: 0, useNativeDriver: false }),
        Animated.delay(250),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, reduceMotion, t, duration]);
  return t;
}

/** Fades and slides an element in during [from, to] of the loop. */
function enter(t: Animated.Value, from: number, to: number, dy = 14, dx = 0) {
  return {
    opacity: t.interpolate({ inputRange: [0, from, to, 1], outputRange: [0, 0, 1, 1] }),
    transform: [
      { translateY: t.interpolate({ inputRange: [0, from, to, 1], outputRange: [dy, dy, 0, 0] }) },
      { translateX: t.interpolate({ inputRange: [0, from, to, 1], outputRange: [dx, dx, 0, 0] }) },
    ],
  };
}

// ---------------------------------------------------------------------------
// Illustrations: small versions of the app's own screens

function MiniRow({ icon, color, title, sub, right }: { icon: IconName; color: string; title: string; sub: string; right?: ReactNode }) {
  return (
    <View style={styles.miniRow}>
      <View style={[styles.miniIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={14} color={Colors.white} />
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="small" color={Colors.textMuted} numberOfLines={1}>
          {sub}
        </AppText>
      </View>
      {right}
    </View>
  );
}

function TodayIllustration({ t }: { t: Animated.Value }) {
  const bar = t.interpolate({ inputRange: [0, 0.15, 0.55, 1], outputRange: ['0%', '0%', '62%', '62%'] });
  const bob = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 0] });
  return (
    <View style={styles.illo}>
      <Animated.View style={enter(t, 0, 0.15)}>
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <AppText variant="eyebrow" color="rgba(255,255,255,0.85)">
            Today
          </AppText>
          <AppText variant="h2" color={Colors.white}>
            4 deliveries
          </AppText>
          <View style={styles.track}>
            <Animated.View style={[styles.trackFill, { width: bar }]} />
          </View>
          <View style={styles.heroStats}>
            {[
              ['2', 'delivered'],
              ['1', 'ready'],
              ['1', 'to bake'],
            ].map(([n, l]) => (
              <View key={l}>
                <AppText variant="bodyBold" color={Colors.white}>
                  {n}
                </AppText>
                <AppText variant="small" color="rgba(255,255,255,0.85)">
                  {l}
                </AppText>
              </View>
            ))}
          </View>
        </LinearGradient>
      </Animated.View>
      <Animated.View style={enter(t, 0.3, 0.45, 0, 30)}>
        <MiniRow icon="time-outline" color={Colors.brand} title="Priya · 11:00 am" sub="Black Forest Cake 1kg" right={<View style={[styles.pill, { backgroundColor: Colors.success }]}><AppText variant="small" color={Colors.white}>Ready</AppText></View>} />
      </Animated.View>
      <Animated.View style={enter(t, 0.42, 0.57, 0, 30)}>
        <MiniRow icon="time-outline" color={Colors.accentSoft} title="Rahul · 4:00 pm" sub="Red Velvet + cupcakes" right={<View style={[styles.pill, { backgroundColor: Colors.accentSoft }]}><AppText variant="small" color={Colors.white}>Baking</AppText></View>} />
      </Animated.View>
      <Animated.View style={[styles.floatChip, styles.floatChipRight, enter(t, 0.6, 0.75), { transform: [{ translateY: bob }] }]}>
        <Ionicons name="restaurant-outline" size={14} color={Colors.brand} />
        <AppText variant="small" style={styles.bold}>
          3× Black Forest to bake
        </AppText>
      </Animated.View>
    </View>
  );
}

function OrdersIllustration({ t }: { t: Animated.Value }) {
  const items: [string, string][] = [
    ['Black Forest Cake 1kg', '₹790'],
    ['Cupcakes (box of 6)', '₹240'],
    ['Birthday candles', '₹50'],
  ];
  const chips = ['Black Forest 1kg', 'Cupcakes', 'Red Velvet', 'Candles'];
  return (
    <View style={styles.illo}>
      <View style={styles.chipRow}>
        {chips.map((c, i) => {
          const picked = i === 0 || i === 1 || i === 3;
          const at = [0.12, 0.3, 0, 0.48][i];
          return (
            <Animated.View
              key={c}
              style={[
                styles.chip,
                picked && {
                  backgroundColor: t.interpolate({ inputRange: [0, at, at + 0.06, 1], outputRange: [Colors.card, Colors.card, Colors.backgroundMuted, Colors.backgroundMuted] }),
                  borderColor: t.interpolate({ inputRange: [0, at, at + 0.06, 1], outputRange: [Colors.border, Colors.border, Colors.brand, Colors.brand] }),
                },
              ]}>
              <AppText variant="small" style={styles.bold}>
                + {c}
              </AppText>
            </Animated.View>
          );
        })}
      </View>
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={[styles.avatar, { backgroundColor: Colors.accent }]}>
            <AppText variant="bodyBold" color={Colors.white}>
              P
            </AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyBold">Priya Sharma</AppText>
            <AppText variant="small" color={Colors.textMuted}>
              Birthday · Tomorrow, 5 pm
            </AppText>
          </View>
        </View>
        {items.map(([name, price], i) => (
          <Animated.View key={name} style={[styles.itemRow, enter(t, [0.15, 0.33, 0.51][i], [0.27, 0.45, 0.63][i], -22)]}>
            <AppText variant="small" style={styles.qty}>
              1×
            </AppText>
            <AppText variant="small" style={[styles.flex, styles.bold]}>
              {name}
            </AppText>
            <AppText variant="small" style={styles.bold}>
              {price}
            </AppText>
          </Animated.View>
        ))}
        <Animated.View style={[styles.totalRow, enter(t, 0.66, 0.8, 0)]}>
          <AppText variant="bodyBold">Total</AppText>
          <AppText variant="h2" color={Colors.brand}>
            ₹1,080
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}

const STEPS = ['Received', 'Confirmed', 'Baking', 'Ready', 'Delivered'];

function TrackingIllustration({ t }: { t: Animated.Value }) {
  const fill = t.interpolate({ inputRange: [0, 0.3, 0.85, 1], outputRange: ['0%', '0%', '100%', '100%'] });
  return (
    <View style={styles.illo}>
      <Animated.View style={[styles.bubble, enter(t, 0, 0.18, 0, -24)]}>
        <View style={styles.bubbleHead}>
          <Ionicons name="logo-whatsapp" size={16} color={Colors.success} />
          <AppText variant="small" style={styles.bold}>
            Sunita&apos;s Cake Studio
          </AppText>
        </View>
        <AppText variant="small">Hi Priya! Track your order here:</AppText>
        <AppText variant="small" color={Colors.brand} style={styles.bold}>
          bakeops.me/track/sunita/…
        </AppText>
      </Animated.View>

      <Animated.View style={[styles.card, enter(t, 0.15, 0.3)]}>
        <AppText variant="eyebrow">Hi Priya, your order is</AppText>
        <AppText variant="h2" color={Colors.brand}>
          Updating live
        </AppText>
        <View style={styles.timeline}>
          <View style={styles.timelineTrack}>
            <Animated.View style={[styles.timelineFill, { width: fill }]} />
          </View>
          {STEPS.map((s, i) => {
            const at = 0.3 + (i / (STEPS.length - 1)) * 0.55;
            const on = t.interpolate({ inputRange: [0, at - 0.01, at, 1], outputRange: [0, 0, 1, 1] });
            return (
              <View key={s} style={styles.timelineStep}>
                <Animated.View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: on.interpolate({ inputRange: [0, 1], outputRange: [Colors.card, Colors.brand] }),
                      borderColor: on.interpolate({ inputRange: [0, 1], outputRange: [Colors.backgroundMuted, Colors.brand] }),
                      transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                    },
                  ]}>
                  <Animated.View style={{ opacity: on }}>
                    <Ionicons name="checkmark" size={12} color={Colors.white} />
                  </Animated.View>
                </Animated.View>
                <AppText variant="small" style={styles.stepLabel} numberOfLines={1}>
                  {s}
                </AppText>
              </View>
            );
          })}
        </View>
      </Animated.View>
    </View>
  );
}

function MoneyIllustration({ t }: { t: Animated.Value }) {
  const grow = (from: number, to: number, target: number) =>
    t.interpolate({ inputRange: [0, from, to, 1], outputRange: [0, 0, target, target] });
  const wiggle = t.interpolate({ inputRange: [0, 0.7, 0.75, 0.8, 0.85, 0.9, 1], outputRange: ['0deg', '0deg', '-14deg', '12deg', '-8deg', '0deg', '0deg'] });
  return (
    <View style={styles.illo}>
      <Animated.View style={enter(t, 0, 0.15)}>
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
          <AppText variant="eyebrow" color="rgba(255,255,255,0.85)">
            Outstanding
          </AppText>
          <AppText variant="h1" color={Colors.white}>
            ₹3,960
          </AppText>
          <View style={styles.moneyBar}>
            <Animated.View style={[styles.moneySeg, { flex: grow(0.15, 0.35, 3), backgroundColor: 'rgba(255,255,255,0.45)' }]} />
            <Animated.View style={[styles.moneySeg, { flex: grow(0.3, 0.5, 2), backgroundColor: '#FDBA74' }]} />
            <Animated.View style={[styles.moneySeg, { flex: grow(0.45, 0.65, 1), backgroundColor: Colors.white }]} />
          </View>
          <AppText variant="small" color="rgba(255,255,255,0.85)">
            Later · This week · Overdue
          </AppText>
        </LinearGradient>
      </Animated.View>
      <Animated.View style={enter(t, 0.35, 0.5, 0, 30)}>
        <MiniRow icon="wallet-outline" color={Colors.success} title="Rahul Mehta · ₹1,180" sub="Marked paid · cash" right={<Ionicons name="checkmark-circle" size={22} color={Colors.success} />} />
      </Animated.View>
      <Animated.View style={[styles.miniRow, enter(t, 0.55, 0.68, 0, 30)]}>
        <Animated.View style={[styles.miniIcon, { backgroundColor: Colors.accent, transform: [{ rotate: wiggle }] }]}>
          <Ionicons name="gift-outline" size={14} color={Colors.white} />
        </Animated.View>
        <View style={styles.flex}>
          <AppText variant="bodyBold">Priya&apos;s birthday in 3 days</AppText>
          <AppText variant="small" color={Colors.textMuted}>
            Last time: Black Forest Cake 1kg
          </AppText>
        </View>
      </Animated.View>
    </View>
  );
}

const THEMES: { value: ThemePreference; label: string; icon: IconName }[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'Auto', icon: 'phone-portrait-outline' },
];

function ThemeIllustration({ t }: { t: Animated.Value }) {
  const { preference, setPreference } = useTheme();
  const float = t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -8, 0] });
  return (
    <View style={styles.illo}>
      <Animated.View style={[styles.logoWrap, { transform: [{ translateY: float }] }]}>
        <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoTile}>
          <Image source={require('../../../assets/images/logo-mark.png')} style={styles.logoMark} contentFit="contain" />
        </LinearGradient>
      </Animated.View>
      <View style={styles.themeRow}>
        {THEMES.map((o) => {
          const active = preference === o.value;
          return (
            <Pressable
              key={o.value}
              onPress={() => setPreference(o.value)}
              style={[styles.themeOption, active && styles.themeOptionActive]}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${o.label} theme`}>
              <Ionicons name={o.icon} size={22} color={active ? Colors.white : Colors.text} />
              <AppText variant="bodyBold" color={active ? Colors.white : Colors.text}>
                {o.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const SLIDES: Slide[] = [
  {
    key: 'today',
    eyebrow: 'Your day at a glance',
    title: 'Know what to bake, deliver and collect',
    body: 'Open the app and see today’s deliveries, what’s late, what still needs baking and how much money to collect.',
    tint: () => Colors.brand,
    Illustration: TodayIllustration,
  },
  {
    key: 'orders',
    eyebrow: 'Orders in seconds',
    title: 'Tap your menu, not your keyboard',
    body: 'Pick a regular customer, tap items from your saved menu, choose a delivery slot. Prices fill themselves in.',
    tint: () => Colors.accent,
    Illustration: OrdersIllustration,
  },
  {
    key: 'tracking',
    eyebrow: 'Live order tracking',
    title: '“Is my cake ready?” Answered.',
    body: 'Send customers a tracking link on WhatsApp. They watch their order move from received to delivered, without calling you.',
    tint: () => Colors.success,
    Illustration: TrackingIllustration,
  },
  {
    key: 'money',
    eyebrow: 'Get paid, never forget',
    title: 'See who owes what, remember every birthday',
    body: 'Outstanding money split into overdue and this week, one-tap reminders, and a nudge before your customers’ special days.',
    tint: () => Colors.accentSoft,
    Illustration: MoneyIllustration,
  },
  {
    key: 'theme',
    eyebrow: 'One last thing',
    title: 'Pick your look',
    body: 'Light for the morning rush, dark for late-night icing, or Auto to follow your phone. You can change it any time in Profile.',
    tint: () => Colors.brand,
    Illustration: ThemeIllustration,
  },
];

// ---------------------------------------------------------------------------
// Screen

function SlidePage({
  slide,
  index,
  width,
  height,
  scrollX,
  active,
  reduceMotion,
}: {
  slide: Slide;
  index: number;
  width: number;
  /** Full slide height, so the text sits at the bottom and the illustration fills the rest. */
  height: number;
  scrollX: Animated.Value;
  active: boolean;
  reduceMotion: boolean;
}) {
  const t = useLoop(active, reduceMotion);
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const illoStyle = {
    opacity: scrollX.interpolate({ inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
    transform: [
      { translateX: scrollX.interpolate({ inputRange: range, outputRange: [width * 0.35, 0, -width * 0.35], extrapolate: 'clamp' }) },
      { scale: scrollX.interpolate({ inputRange: range, outputRange: [0.86, 1, 0.86], extrapolate: 'clamp' }) },
    ],
  };
  const textStyle = {
    opacity: scrollX.interpolate({ inputRange: range, outputRange: [0, 1, 0], extrapolate: 'clamp' }),
    transform: [{ translateY: scrollX.interpolate({ inputRange: range, outputRange: [24, 0, 24], extrapolate: 'clamp' }) }],
  };
  const blobStyle = {
    transform: [{ scale: scrollX.interpolate({ inputRange: range, outputRange: [0.6, 1, 0.6], extrapolate: 'clamp' }) }],
  };

  return (
    <View style={[styles.page, { width }, height > 0 ? { height } : null]}>
      <View style={styles.pageInner}>
        <View style={styles.stage}>
          <Animated.View style={[styles.blob, { backgroundColor: slide.tint() }, blobStyle]} />
          <Animated.View style={[styles.stageContent, illoStyle]}>
            <slide.Illustration t={t} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.copy, textStyle]}>
          <AppText variant="eyebrow" color={slide.tint()}>
            {slide.eyebrow}
          </AppText>
          <AppText variant="h1" style={styles.title}>
            {slide.title}
          </AppText>
          <AppText variant="body" color={Colors.textMuted} style={styles.body}>
            {slide.body}
          </AppText>
        </Animated.View>
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  useTheme();
  // Measure the real space the slides get. useWindowDimensions alone can report
  // 0 on web (the page is pre-rendered without knowing the screen size).
  const window = useWindowDimensions();
  const [measured, setMeasured] = useState({ width: 0, height: 0 });
  const width = measured.width || window.width;
  const height = measured.height;
  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    const h = Math.round(e.nativeEvent.layout.height);
    if (w > 0 && (w !== measured.width || h !== measured.height)) setMeasured({ width: w, height: h });
  };
  const scrollX = useRef(new Animated.Value(0)).current;
  const scroller = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const last = index === SLIDES.length - 1;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  // Track the visible slide from the scroll position (also works for swipes on web).
  useEffect(() => {
    const id = scrollX.addListener(({ value }) => {
      const i = Math.round(value / Math.max(width, 1));
      setIndex((prev) => (prev === i ? prev : Math.min(Math.max(i, 0), SLIDES.length - 1)));
    });
    return () => scrollX.removeListener(id);
  }, [scrollX, width]);

  function goTo(i: number) {
    scroller.current?.scrollTo({ x: i * width, animated: !reduceMotion });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <View style={styles.brand}>
          <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brandMark}>
            <Image source={require('../../../assets/images/logo-mark.png')} style={styles.brandMarkImage} contentFit="contain" />
          </LinearGradient>
          <AppText variant="bodyBold">BakeOps</AppText>
        </View>
        {!last ? (
          <Pressable onPress={completeOnboarding} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip introduction">
            <AppText variant="bodyBold" color={Colors.textMuted}>
              Skip
            </AppText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.flex} onLayout={onLayout}>
      {width > 0 ? (
      <Animated.ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        style={styles.flex}>
        {SLIDES.map((slide, i) => (
          <SlidePage key={slide.key} slide={slide} index={i} width={width} height={height} scrollX={scrollX} active={i === index} reduceMotion={reduceMotion} />
        ))}
      </Animated.ScrollView>
      ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.dots} accessibilityRole="tablist">
          {SLIDES.map((s, i) => {
            const range = [(i - 1) * width, i * width, (i + 1) * width];
            return (
              <Pressable key={s.key} onPress={() => goTo(i)} hitSlop={6} accessibilityRole="tab" accessibilityState={{ selected: i === index }} accessibilityLabel={`Slide ${i + 1}`}>
                <Animated.View
                  style={[
                    styles.dot2,
                    {
                      width: scrollX.interpolate({ inputRange: range, outputRange: [8, 26, 8], extrapolate: 'clamp' }),
                      opacity: scrollX.interpolate({ inputRange: range, outputRange: [0.35, 1, 0.35], extrapolate: 'clamp' }),
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {last ? (
          <Pressable onPress={completeOnboarding} style={({ pressed }) => [styles.cta, pressed && styles.pressed]} accessibilityRole="button">
            <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ctaFill}>
              <AppText variant="bodyBold" color={Colors.white} style={styles.ctaLabel}>
                Get started
              </AppText>
              <Ionicons name="arrow-forward" size={18} color={Colors.white} />
            </LinearGradient>
          </Pressable>
        ) : (
          <Pressable onPress={() => goTo(index + 1)} style={({ pressed }) => [styles.next, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Next">
            <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextFill}>
              <Ionicons name="arrow-forward" size={22} color={Colors.white} />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = themedStyles(() => ({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  bold: {
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkImage: {
    width: 20,
    height: 20,
  },
  // No flex here: in a horizontal ScrollView, flex:1 overrides the slide's
  // width and collapses every slide to zero width.
  page: {
    alignItems: 'center',
  },
  pageInner: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  stage: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageContent: {
    width: '100%',
  },
  blob: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    opacity: 0.16,
  },
  copy: {
    paddingBottom: Spacing.three,
    gap: Spacing.one + 2,
  },
  title: {
    marginTop: 2,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot2: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand,
  },
  next: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  nextFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: {
    flex: 1,
    maxWidth: 220,
    height: 56,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  ctaFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  ctaLabel: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.85,
  },

  // Illustrations
  illo: {
    gap: Spacing.two + 2,
  },
  heroCard: {
    borderRadius: Radii.lg,
    padding: Spacing.three,
    gap: 4,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.one,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  miniRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    padding: Spacing.two + 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  miniIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radii.pill,
  },
  floatChip: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  floatChipRight: {
    right: -6,
    top: -18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.backgroundMuted,
    borderRadius: Radii.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  qty: {
    color: Colors.brandDark,
    fontWeight: '800',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '88%',
    backgroundColor: Colors.successSoft,
    borderRadius: Radii.md,
    borderTopLeftRadius: 4,
    padding: Spacing.two + 4,
    gap: 2,
  },
  bubbleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  timeline: {
    flexDirection: 'row',
    marginTop: Spacing.two,
  },
  timelineTrack: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    top: 11,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.backgroundMuted,
    overflow: 'hidden',
  },
  timelineFill: {
    height: '100%',
    backgroundColor: Colors.brand,
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  moneyBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: Spacing.two,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  moneySeg: {
    height: '100%',
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: Spacing.three,
  },
  logoTile: {
    width: 120,
    height: 120,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoMark: {
    width: 76,
    height: 76,
  },
  themeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.three,
    borderRadius: Radii.md,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  themeOptionActive: {
    backgroundColor: Colors.brand,
    borderColor: Colors.brand,
  },
}));
