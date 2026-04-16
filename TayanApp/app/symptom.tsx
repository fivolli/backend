import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { getGeoOrNull } from '@/lib/location';
import { setLastRequestId } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';
import { AppIcon } from '@/components/app-icon';

export default function SymptomScreen() {
  const params = useLocalSearchParams<{ severity?: string }>();
  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const danger = useThemeColor({}, 'danger');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const background = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');
  const titleColor = useThemeColor({ light: primary, dark: '#E7ECF5' }, 'text');
  const infoSurface = useThemeColor({ light: background, dark: '#1A2236' }, 'surface');
  const { me, token, lang } = useAuth();

  const preselected = params.severity === 'unstable' ? 'unstable' : params.severity === 'light' ? 'light' : '';
  const [severity, setSeverity] = React.useState<'unstable' | 'light' | ''>(preselected);
  const [severityLocked, setSeverityLocked] = React.useState<boolean>(Boolean(preselected));
  const [symptoms, setSymptoms] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const isVolunteer = me?.role === 'volunteer';

  async function sendSos() {
    if (!token) {
      Alert.alert(t(lang, 'home.need_sign_in'), t(lang, 'home.sign_in_first'), [
        { text: t(lang, 'common.cancel'), style: 'cancel' },
        { text: t(lang, 'common.open_profile'), onPress: () => router.push('/profile') },
      ]);
      return;
    }

    Alert.alert(
      t(lang, 'home.sos_title'),
      t(lang, 'home.sos_confirm'),
      [
        { text: t(lang, 'common.cancel'), style: 'cancel' },
        {
          text: t(lang, 'common.send'),
          style: 'destructive',
          onPress: async () => {
            try {
              const geo = await getGeoOrNull();
              const lat = geo?.lat ?? 42.8746;
              const lng = geo?.lng ?? 74.5698;
              const created = await api<{ id: number; status: string }>('/requests', {
                method: 'POST',
                token,
                lang,
                body: { kind: 'sos', lat, lng, address: '', severity: 'critical' },
              });
              if (created?.id) {
                await setLastRequestId(created.id);
                router.push({ pathname: '/map', params: { id: String(created.id) } });
              }
            } catch (e: any) {
              Alert.alert(t(lang, 'home.sos_error_title'), e?.message ? String(e.message) : t(lang, 'home.sos_error_fallback'));
            }
          },
        },
      ]
    );
  }

  async function sendSymptomRequest() {
    if (!token) {
      Alert.alert(t(lang, 'home.need_sign_in'), t(lang, 'home.sign_in_first'), [
        { text: t(lang, 'common.cancel'), style: 'cancel' },
        { text: t(lang, 'common.open_profile'), onPress: () => router.push('/profile') },
      ]);
      return;
    }

    if (!severity) {
      Alert.alert(t(lang, 'symptom.choose_state_title'), t(lang, 'symptom.choose_state_text'));
      return;
    }

    if (!symptoms.trim()) {
      Alert.alert(t(lang, 'symptom.fill_symptoms_title'), t(lang, 'symptom.fill_symptoms_text'));
      return;
    }

    setSending(true);
    try {
      const geo = await getGeoOrNull();
      const lat = geo?.lat ?? 42.8746;
      const lng = geo?.lng ?? 74.5698;

      const created = await api<{ id: number; status: string }>('/requests', {
        method: 'POST',
        token,
        lang,
        body: {
          kind: 'symptom',
          severity,
          symptoms: symptoms.trim(),
          address: address.trim(),
          comments: comments.trim(),
          lat,
          lng,
        },
      });

      if (created?.id) {
        await setLastRequestId(created.id);
        router.push({ pathname: '/map', params: { id: String(created.id) } });
      } else {
        Alert.alert(t(lang, 'common.done'), t(lang, 'symptom.request_sent'));
      }
    } catch (e: any) {
      Alert.alert(t(lang, 'common.error'), e?.message ? String(e.message) : t(lang, 'symptom.request_send_failed'));
    } finally {
      setSending(false);
    }
  }

  function chooseSeverity(next: 'unstable' | 'light') {
    if (isVolunteer) {
      Alert.alert(t(lang, 'common.unavailable'), t(lang, 'symptom.volunteer_blocked'));
      router.replace('/home');
      return;
    }
    setSeverity(next);
    setSeverityLocked(false);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}
      >
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={{ color: '#fff', fontSize: 18 }}>←</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>{t(lang, 'symptom.title')}</ThemedText>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isVolunteer ? (
          <View style={styles.volBox}>
            <View style={[styles.alertBox, { backgroundColor: surface, borderColor: border }]}>
              <ThemedText style={[styles.alertText, { color: titleColor }]}>
                {t(lang, 'symptom.volunteer_blocked')}
              </ThemedText>
            </View>

            <Pressable onPress={sendSos} style={[styles.btnSolid, { backgroundColor: danger }]}>
              <ThemedText style={styles.btnTextLight}>{t(lang, 'symptom.send_sos')}</ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
              {severityLocked && severity ? (
                <ThemedText style={[styles.stateTitle, { color: titleColor }]}>
                  {severity === 'unstable' ? t(lang, 'symptom.state_unstable') : t(lang, 'symptom.state_light')}
                </ThemedText>
              ) : (
                <>
                  <ThemedText style={[styles.chooseTitle, { color: titleColor }]}>{t(lang, 'symptom.choose_state_title')}</ThemedText>
                  <View style={styles.sevList}>
                    <Pressable
                      onPress={() => chooseSeverity('unstable')}
                      style={({ pressed }) => [
                        styles.sevBtn,
                        severity === 'unstable'
                          ? { backgroundColor: primary, borderColor: primary }
                          : { backgroundColor: surface, borderColor: border },
                        pressed ? { opacity: 0.9 } : null,
                      ]}
                    >
                      <ThemedText style={[styles.sevBtnText, severity === 'unstable' ? { color: '#fff' } : { color: titleColor }]}>
                        {t(lang, 'symptom.state_unstable_btn')}
                      </ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => chooseSeverity('light')}
                      style={({ pressed }) => [
                        styles.sevBtn,
                        severity === 'light'
                          ? { backgroundColor: primary, borderColor: primary }
                          : { backgroundColor: surface, borderColor: border },
                        pressed ? { opacity: 0.9 } : null,
                      ]}
                    >
                      <ThemedText style={[styles.sevBtnText, severity === 'light' ? { color: '#fff' } : { color: titleColor }]}>
                        {t(lang, 'symptom.state_light_btn')}
                      </ThemedText>
                    </Pressable>
                  </View>

                  {severity ? (
                    <View style={[styles.alertBox, { backgroundColor: infoSurface, borderColor: border, marginTop: 12 }]}>
                      <ThemedText style={[styles.alertText, { color: titleColor }]}>
                        {t(lang, 'symptom.selected_prefix')}{' '}
                        <ThemedText style={{ fontWeight: '700' }}>{severity === 'unstable' ? t(lang, 'symptom.state_unstable_plain') : t(lang, 'symptom.state_light_plain')}</ThemedText>
                      </ThemedText>
                    </View>
                  ) : (
                    <View style={[styles.alertBox, { backgroundColor: surface, borderColor: danger, marginTop: 12 }]}>
                      <ThemedText style={[styles.alertText, { color: danger }]}>{t(lang, 'symptom.choose_state_text')}</ThemedText>
                    </View>
                  )}
                </>
              )}
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{t(lang, 'symptom.symptoms_label')}</ThemedText>
              <TextInput
                value={symptoms}
                onChangeText={setSymptoms}
                placeholder={t(lang, 'symptom.symptoms_placeholder')}
                placeholderTextColor="#999"
                multiline
                style={[styles.textArea, { backgroundColor: surface, borderColor: border, color: text }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{t(lang, 'symptom.address_label')}</ThemedText>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder={t(lang, 'symptom.address_placeholder')}
                placeholderTextColor="#999"
                style={[styles.input, { backgroundColor: surface, borderColor: border, color: text }]}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={[styles.inputLabel, { color: titleColor }]}>{t(lang, 'symptom.comments_label')}</ThemedText>
              <TextInput
                value={comments}
                onChangeText={setComments}
                placeholder={t(lang, 'symptom.comments_placeholder')}
                placeholderTextColor="#999"
                multiline
                style={[styles.textArea, { backgroundColor: surface, borderColor: border, color: text }]}
              />
            </View>

            <View style={[styles.alertBox, { backgroundColor: infoSurface, borderColor: border }]}
            >
              <ThemedText style={[styles.alertText, { color: titleColor }]}>
                💡 <ThemedText style={{ fontWeight: '700' }}>{t(lang, 'symptom.tip_label')}</ThemedText> {t(lang, 'symptom.tip_text')}
              </ThemedText>
            </View>

            <Pressable
              onPress={sendSymptomRequest}
              disabled={sending}
              style={({ pressed }) => [
                styles.btnSolid,
                { backgroundColor: danger, marginTop: 12, opacity: sending ? 0.7 : pressed ? 0.9 : 1 },
              ]}
            >
              <View style={styles.btnContentRow}>
                <AppIcon name="email" size={18} color="#fff" />
                <ThemedText style={styles.btnTextLight}>{sending ? t(lang, 'common.sending') : t(lang, 'symptom.send_request')}</ThemedText>
              </View>
            </Pressable>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff', flex: 1 },
  content: { padding: 24 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  volBox: { gap: 12 },
  chooseTitle: { fontWeight: '700', marginBottom: 10 },
  stateTitle: { fontWeight: '700', margin: 0 },
  sevList: { gap: 10 },
  sevBtn: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sevBtnText: { fontWeight: '700' },
  alertBox: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  alertText: { lineHeight: 20 },

  inputGroup: { marginTop: 12, gap: 8 },
  inputLabel: { fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    // Prevent iPhone Safari from auto-zooming focused inputs on web.
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 96,
    fontSize: 16,
    textAlignVertical: 'top',
  },

  btnSolid: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnTextLight: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
