import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import { api } from '@/lib/api';
import { t } from '@/lib/i18n';
import { useAuth } from '@/providers/auth-provider';

type ChatMessage = {
  id: number;
  request_id: number;
  sender_id: number;
  sender_role: string;
  sender_name?: string | null;
  text: string;
  created_at: string;
};

function normalizeMessage(raw: any): ChatMessage | null {
  if (!raw || (typeof raw !== 'object' && typeof raw !== 'function')) return null;
  const id = Number((raw as any).id);
  const request_id = Number((raw as any).request_id);
  const sender_id = Number((raw as any).sender_id);
  const sender_role = String((raw as any).sender_role || 'user');
  const sender_name = (raw as any).sender_name != null ? String((raw as any).sender_name) : null;
  const text = String((raw as any).text || '');
  const created_at = String((raw as any).created_at || '');

  if (!Number.isFinite(id) || id <= 0) return null;
  if (!Number.isFinite(request_id) || request_id <= 0) return null;
  if (!Number.isFinite(sender_id) || sender_id <= 0) return null;

  return {
    id,
    request_id,
    sender_id,
    sender_role,
    sender_name,
    text,
    created_at,
  };
}

export default function RequestChatScreen() {
  const params = useLocalSearchParams<{ id?: string; name?: string; role?: string; phone?: string }>();
  const requestId = params.id ? Number(params.id) : 0;
  const peerName = params.name ? String(params.name) : '';
  const peerRole = params.role ? String(params.role) : '';
  const peerPhoneFromParams = params.phone ? String(params.phone) : '';

  const insets = useSafeAreaInsets();
  const primary = useThemeColor({}, 'primary');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const bg = useThemeColor({}, 'background');
  const text = useThemeColor({}, 'text');

  const { token, lang, me } = useAuth();

  const headerTitle = useMemo(() => {
    const v = (peerName || '').trim();
    return v ? v : t(lang, 'request_chat.title');
  }, [peerName, lang]);

  const headerSubtitle = useMemo(() => {
    if (peerRole === 'volunteer') return t(lang, 'common.volunteer');
    if (peerRole === 'user') return t(lang, 'common.user');
    return '';
  }, [peerRole, lang]);

  const scrollRef = useRef<ScrollView | null>(null);
  const pollInFlightRef = useRef(false);
  const lastIdRef = useRef(0);

  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadError, setLoadError] = useState<string>('');
  const [peerPhone, setPeerPhone] = useState<string>(() => (peerPhoneFromParams || '').trim());

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const lastId = useMemo(() => {
    const m = messages[messages.length - 1];
    return m?.id ? Number(m.id) : 0;
  }, [messages]);

  useEffect(() => {
    lastIdRef.current = lastId;
  }, [lastId]);

  const canSend = useMemo(() => {
    return !sending && input.trim().length > 0;
  }, [sending, input]);

  const canCall = useMemo(() => {
    return Boolean((peerPhone || '').trim());
  }, [peerPhone]);

  async function callPeer() {
    const p = (peerPhone || '').trim();
    if (!p) return;
    void Linking.openURL(`tel:${p}`).catch(() => {
      Alert.alert(t(lang, 'common.phone_unavailable_title'), t(lang, 'common.phone_unavailable_text'));
    });
  }

  async function loadPeerPhone() {
    if (!requestId || !token) return;
    if ((peerPhone || '').trim()) return;

    try {
      if (me?.role === 'volunteer') {
        const r = await api<any>(`/volunteer/requests/${requestId}`, { method: 'GET', token, lang });
        const p = r?.user_phone != null ? String(r.user_phone).trim() : '';
        if (p) setPeerPhone(p);
        return;
      }

      const r = await api<any>(`/requests/${requestId}`, { method: 'GET', token, lang });
      const p = r?.volunteer_phone != null ? String(r.volunteer_phone).trim() : '';
      if (p) setPeerPhone(p);
    } catch {
      // best-effort
    }
  }

  async function loadInitial() {
    if (!requestId || !token) return;
    setLoadError('');
    setLoading(true);
    try {
      const r = await api<ChatMessage[]>(`/requests/${requestId}/chat/messages?limit=50`, { method: 'GET', token, lang });
      const next = (Array.isArray(r) ? r : []).map(normalizeMessage).filter(Boolean) as ChatMessage[];
      // Ensure stable ordering
      next.sort((a, b) => a.id - b.id);
      setMessages(next);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : t(lang, 'request_chat.load_failed');
      setLoadError(msg);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function pollNew() {
    if (!requestId || !token) return;
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;
    try {
      const after = Number(lastIdRef.current || 0);
      const q = after > 0 ? `?after_id=${encodeURIComponent(String(after))}&limit=200` : '?limit=200';
      const r = await api<ChatMessage[]>(`/requests/${requestId}/chat/messages${q}`, { method: 'GET', token, lang, timeoutMs: 15000 });
      if (!Array.isArray(r) || r.length === 0) return;
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => Number(m.id)));
        const next = [...prev];
        for (const raw of r) {
          const m = normalizeMessage(raw);
          if (!m) continue;
          const mid = Number(m.id);
          if (existing.has(mid)) continue;
          existing.add(mid);
          next.push(m);
        }
        next.sort((a, b) => a.id - b.id);
        return next;
      });
    } catch {
      // Best-effort polling: ignore.
    } finally {
      pollInFlightRef.current = false;
    }
  }

  async function send() {
    const value = input.trim();
    if (!value || !requestId || !token) return;

    setSending(true);
    setInput('');
    try {
      const r = await api<ChatMessage>(`/requests/${requestId}/chat/messages`, {
        method: 'POST',
        token,
        lang,
        body: { text: value },
      });
      const m = normalizeMessage(r);
      if (m) {
        setMessages((prev) => {
          const existing = new Set(prev.map((x) => Number(x.id)));
          if (existing.has(Number(m.id))) return prev;
          const next = [...prev, m];
          next.sort((a, b) => a.id - b.id);
          return next;
        });
      } else {
        await pollNew();
      }
    } catch (e: any) {
      setInput(value);
      // keep it simple: show error inline
      setLoadError(e?.message ? String(e.message) : t(lang, 'request_chat.send_failed'));
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, token, lang]);

  useEffect(() => {
    void loadPeerPhone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, token, lang, me?.role]);

  useEffect(() => {
    if (!requestId || !token) return;
    const timer = setInterval(() => {
      void pollNew();
    }, 3000);
    return () => clearInterval(timer);
  }, [requestId, token, lang]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: 24 + insets.top }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.headerTitle}>{headerTitle}</ThemedText>
            {headerSubtitle ? <ThemedText style={styles.headerSubtitle}>{headerSubtitle}</ThemedText> : null}
          </View>

          {canCall ? (
            <Pressable onPress={() => void callPeer()} style={styles.callTopBtn}>
              <ThemedText style={styles.callTopText}>☎︎</ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {!requestId ? (
        <View style={styles.center}>
          <ThemedText>{t(lang, 'request_chat.no_id')}</ThemedText>
        </View>
      ) : !token ? (
        <View style={styles.center}>
          <ThemedText>{t(lang, 'request_chat.need_sign_in')}</ThemedText>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.chatWrap, { backgroundColor: bg }]}>
            <ScrollView
              ref={(r) => {
                scrollRef.current = r;
              }}
              style={{ flex: 1, backgroundColor: bg }}
              contentContainerStyle={styles.chatMessages}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {loadError ? (
                <View style={[styles.errorPill, { backgroundColor: surface, borderColor: border }]}>
                  <ThemedText style={{ color: text, opacity: 0.85 }}>{loadError}</ThemedText>
                </View>
              ) : null}

              {!loadError && messages.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <ThemedText style={{ opacity: 0.65 }}>{t(lang, 'request_chat.empty')}</ThemedText>
                </View>
              ) : null}

              {messages.map((m) => {
                const mine = me?.id != null && Number(me.id) === Number(m.sender_id);
                const bubbleBg = mine ? primary : surface;
                const senderLabel = (m.sender_name || '').trim() || (m.sender_role === 'volunteer' ? t(lang, 'common.volunteer') : t(lang, 'common.user'));
                return (
                  <View
                    key={String(m.id)}
                    style={[styles.bubbleWrap, mine ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }, { maxWidth: '82%' }]}
                  >
                    {!mine ? (
                      <ThemedText style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>{senderLabel}</ThemedText>
                    ) : null}
                    <View
                      style={[
                        styles.bubble,
                        mine
                          ? { backgroundColor: bubbleBg }
                          : { backgroundColor: bubbleBg, borderColor: border, borderWidth: 1 },
                      ]}
                    >
                      <ThemedText style={[styles.bubbleText, mine ? { color: '#fff' } : { color: primary }]}>{m.text}</ThemedText>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.inputBar, { backgroundColor: surface, borderTopColor: border }]}>
              <View style={styles.inputRow}>
                <TextInput
                  value={input}
                  onChangeText={(v) => {
                    setLoadError('');
                    setInput(v);
                  }}
                  placeholder={t(lang, 'request_chat.input_placeholder')}
                  placeholderTextColor={String(border)}
                  style={[styles.input, { color: text, borderColor: border, backgroundColor: bg }]}
                  multiline
                />
                <Pressable
                  onPress={() => void send()}
                  disabled={!canSend}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    { backgroundColor: primary },
                    !canSend ? { opacity: 0.5 } : null,
                    pressed ? { opacity: 0.9 } : null,
                  ]}
                >
                  <ThemedText style={styles.sendBtnText}>{sending ? t(lang, 'common.sending') : t(lang, 'common.send')}</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      )}
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
  backText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  callTopBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callTopText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSubtitle: { color: '#fff', fontSize: 12, opacity: 0.8, marginTop: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  chatWrap: { flex: 1 },
  chatMessages: { padding: 16, gap: 12 },
  emptyWrap: { paddingVertical: 12, alignItems: 'center' },
  errorPill: { padding: 12, borderRadius: 14, borderWidth: 1 },
  bubbleWrap: { gap: 2 },
  bubble: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  inputBar: { borderTopWidth: 1, padding: 12 },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  input: { flex: 1, minHeight: 44, maxHeight: 120, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  sendBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '800' },
});
