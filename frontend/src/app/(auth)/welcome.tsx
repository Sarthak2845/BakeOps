import { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

import { AppText } from '@/components/ui/text';
import { BrandGradient, Colors, Fonts, FontSizes, MaxContentWidth, Radii, Spacing, themedStyles } from '@/constants/theme';
import { useTheme } from '@/lib/theme-context';

export default function WelcomeScreen() {
  useTheme();
  const logoAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoAnim, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(textAnim, { toValue: 1, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [logoAnim, textAnim]);

  return (
    <LinearGradient colors={BrandGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.centerer}>
          <View style={styles.hero}>
            <Animated.View
              style={{
                opacity: logoAnim,
                transform: [
                  { scale: logoAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
                ],
              }}>
              <View style={styles.logoRing}>
                <Image source={require('../../../assets/images/logo-mark.png')} style={styles.logo} resizeMode="contain" />
              </View>
            </Animated.View>

            <Animated.View
              style={{
                opacity: textAnim,
                transform: [{ translateY: textAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              }}>
              <AppText variant="display" style={styles.wordmark}>
                BakeOps
              </AppText>
              <AppText variant="body" style={styles.tagline}>
                Orders, receipts & reminders — all in one place.
              </AppText>
            </Animated.View>
          </View>

          <Animated.View style={[styles.actions, { opacity: textAnim }]}>
            <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={() => router.push('/register')}>
              <AppText variant="bodyBold" style={styles.primaryButtonLabel}>
                Get Started
              </AppText>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={() => router.push('/login')}>
              <AppText variant="bodyBold" style={styles.secondaryButtonLabel}>
                I already have an account
              </AppText>
            </Pressable>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = themedStyles(() => ({
  fill: {
    flex: 1,
  },
  centerer: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  logoRing: {
    width: 128,
    height: 128,
    borderRadius: Radii.xl,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 76,
    height: 76,
  },
  wordmark: {
    color: Colors.white,
    fontSize: 36,
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  actions: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  primaryButton: {
    backgroundColor: Colors.white,
    borderRadius: Radii.pill,
    paddingVertical: Spacing.two + 6,
    alignItems: 'center',
  },
  primaryButtonLabel: {
    color: Colors.brand,
    fontSize: FontSizes.bodyLarge,
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two + 2,
  },
  secondaryButtonLabel: {
    color: Colors.white,
    fontFamily: Fonts.bodyBold,
  },
  pressed: {
    opacity: 0.85,
  },
}));
