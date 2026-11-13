import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Colors, MaxContentWidth, Radii, Spacing, themedStyles } from '@/constants/theme';
import { getErrorMessage } from '@/lib/errors';
import { AppText } from './text';
import { useTheme } from '@/lib/theme-context';

export type ToastTone = 'error' | 'success' | 'info';

interface ToastState {
  id: number;
  tone: ToastTone;
  title?: string;
  message: string;
}

interface ToastContextValue {
  show: (toast: { tone?: ToastTone; title?: string; message: string }) => void;
  error: (message: string, title?: string) => void;
  success: (message: string, title?: string) => void;
  /** Shows any thrown error as a user-readable message; handy as a `.catch()` handler. */
  fromError: (err: unknown, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles = (): Record<ToastTone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> => ({
  error: { bg: Colors.dangerSoft, fg: Colors.dangerSoftText, icon: 'alert-circle' },
  success: { bg: Colors.successSoft, fg: Colors.successSoftText, icon: 'checkmark-circle' },
  info: { bg: Colors.backgroundMuted, fg: Colors.brandDark, icon: 'information-circle' },
});

// React Native's Alert.alert is a no-op on web, so every user-facing message
// goes through this in-app toast instead — it renders the same on all platforms.
export function ToastProvider({ children }: { children: ReactNode }) {
  useTheme();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);
  const insets = useSafeAreaInsets();

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback<ToastContextValue['show']>(({ tone = 'info', title, message }) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: nextId.current++, tone, title, message });
    timer.current = setTimeout(() => setToast(null), tone === 'error' ? 6000 : 3500);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      error: (message, title) => show({ tone: 'error', title, message }),
      success: (message, title) => show({ tone: 'success', title, message }),
      fromError: (err, title) => show({ tone: 'error', title, message: getErrorMessage(err) }),
    }),
    [show]
  );

  const tone = toast ? toneStyles()[toast.tone] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && tone ? (
        <View pointerEvents="box-none" style={[styles.host, { top: insets.top + Spacing.two }]}>
          <Pressable
            key={toast.id}
            onPress={dismiss}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
            style={[styles.toast, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon} size={20} color={tone.fg} />
            <View style={styles.text}>
              {toast.title ? (
                <AppText variant="bodyBold" color={tone.fg}>
                  {toast.title}
                </AppText>
              ) : null}
              <AppText variant="body" color={tone.fg}>
                {toast.message}
              </AppText>
            </View>
            <Ionicons name="close" size={16} color={tone.fg} />
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const styles = themedStyles(() => ({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    width: '100%',
    maxWidth: MaxContentWidth - Spacing.three * 2,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.md,
    shadowColor: '#171123',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  text: {
    flex: 1,
    gap: 2,
  },
}));
