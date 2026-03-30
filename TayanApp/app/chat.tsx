import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { clearAiPendingJobId, getAiPendingJobId, setAiPendingJobId } from '@/lib/storage';
import { useAuth } from '@/providers/auth-provider';

type ChatMessage = {
  id: string;
  type: 'bot' | 'user';
  text: string;
};

const COPY = {
  ru: {
    title: 'AI-помощник',
    online: 'Онлайн',
    inputPh: 'Введите ваш вопрос...',
    welcome1: 'Здравствуйте! Я AI-помощник приложения Tayan. Чем могу помочь?',
    welcome2:
      'Я могу:\n• Помочь определить симптомы\n• Подсказать первые шаги помощи\n• Ответить на вопросы о здоровье',
    actionsTitle: 'Что сделать сейчас:',
    redFlagsTitle: 'Срочно обратитесь за помощью, если:',
    questionsTitle: 'Уточняющие вопросы:',
    noAnswer: 'Нет ответа от AI.',
    aiError: 'Ошибка AI:',
  },
  en: {
    title: 'AI assistant',
    online: 'Online',
    inputPh: 'Enter your question...',
    welcome1: 'Hi! I am the Tayan AI assistant. How can I help?',
    welcome2: 'I can:\n• Help understand symptoms\n• Suggest first aid steps\n• Answer health questions',
    actionsTitle: 'What to do now:',
    redFlagsTitle: 'Seek urgent help if:',
    questionsTitle: 'Follow-up questions:',
    noAnswer: 'No AI answer.',
    aiError: 'AI error:',
  },
  kg: {
    title: 'AI жардамчы',
    online: 'Онлайн',
    inputPh: 'Сурооңузду жазыңыз...',
    welcome1: 'Салам! Мен Tayan колдонмосунун AI жардамчысымын. Кандай жардам бере алам?',
    welcome2:
      'Мен жардам берем:\n• Белгилерди түшүнүүгө\n• Биринчи жардам кадамдарына\n• Ден соолук боюнча суроолорго',
    actionsTitle: 'Азыр эмне кылуу керек:',
    redFlagsTitle: 'Тез жардам керек болсо:',
    questionsTitle: 'Тактоочу суроолор:',
    noAnswer: 'AI жооп берген жок.',
    aiError: 'AI катасы:',
  },
} as const;

type ChatLang = 'ru' | 'en' | 'kg';
type CopyPack = (typeof COPY)[ChatLang];
type TriageResponse = {
  answer?: string;
};
type AiJobCreateResponse = {
  job_id: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
};
type AiJobStatusResponse = {
  job_id: number;
  status: 'pending' | 'processing' | 'done' | 'failed';
  answer?: string;
  error?: string;
};
type AiHistoryItem = {
  role: 'user' | 'assistant';
  text: string;
};

const cachedMessages: Partial<Record<ChatLang, ChatMessage[]>> = {};

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatAiTriage(data: TriageResponse, copy: CopyPack): string {
  if (typeof data?.answer === 'string' && data.answer.trim()) {
    return data.answer.trim();
  }
  return copy.noAnswer;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorToText(e: any): string {
  const msg = e?.message;
  if (typeof msg === 'string' && msg.trim()) return msg;
  if (msg && typeof msg === 'object') {
    try {
      return JSON.stringify(msg);
    } catch {
      return String(msg);
    }
  }
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

async function createAiJob(text: string, token: string | undefined, lang: ChatLang, history: AiHistoryItem[]) {
  const apiLang = lang === 'kg' ? 'ky' : lang;
  return api<AiJobCreateResponse>('/ai/triage', {
    method: 'POST',
    token,
    lang,
    body: { text, lang: apiLang, history },
    timeoutMs: 15000,
  });
}

async function getAiJobStatus(jobId: number, token: string | undefined, lang: ChatLang) {
  return api<AiJobStatusResponse>(`/ai/triage/jobs/${jobId}`, {
    method: 'GET',
    token,
    lang,
    timeoutMs: 15000,
  });
}

export default function AiChatScreen() {
  const { lang, token } = useAuth() as any;
  const params = useLocalSearchParams<{ ai_job_id?: string }>();

  const langKey: ChatLang = lang === 'en' || lang === 'kg' || lang === 'ru' ? lang : 'ru';
  const copy = COPY[langKey];

  const insets = useSafeAreaInsets();

  const primary = useThemeColor({}, 'primary');
  const bg = useThemeColor({}, 'background');
  const surface = useThemeColor({}, 'surface');
  const border = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');

  const scrollRef = useRef<ScrollView | null>(null);
  const resumedJobRef = useRef<number | null>(null);
  const handledJobIdsRef = useRef<Set<number>>(new Set());

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const cached = cachedMessages[langKey];
    if (cached && cached.length) return cached;

    const initial: ChatMessage[] = [
      { id: makeId(), type: 'bot', text: copy.welcome1 },
      { id: makeId(), type: 'bot', text: copy.welcome2 },
    ];

    cachedMessages[langKey] = initial;
    return initial;
  });

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingFrame, setTypingFrame] = useState(0);

  const typingLabel =
    langKey === 'en'
      ? 'AI is typing...'
      : langKey === 'kg'
        ? 'AI жооп жазып жатат...'
        : 'AI печатает...';

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  useEffect(() => {
    cachedMessages[langKey] = messages;
  }, [langKey, messages]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length, isSending]);

  useEffect(() => {
    if (!isSending) {
      setTypingFrame(0);
      return;
    }

    const timer = setInterval(() => {
      setTypingFrame((prev) => (prev + 1) % 3);
    }, 420);

    return () => clearInterval(timer);
  }, [isSending]);

  async function pollAiJobUntilDone(jobId: number): Promise<string> {
    const startedAt = Date.now();
    const hardLimitMs = 3 * 60 * 1000;
    while (Date.now() - startedAt < hardLimitMs) {
      const status = await getAiJobStatus(jobId, token, langKey);
      if (status.status === 'done') {
        const text = formatAiTriage({ answer: status.answer || '' }, copy);
        if (!text || text === copy.noAnswer) throw new Error('empty ai answer');
        return text;
      }
      if (status.status === 'failed') {
        await clearAiPendingJobId();
        throw new Error(status.error || 'AI job failed');
      }
      await wait(1500);
    }
    throw new Error('AI job timed out');
  }

  async function resumePendingJob(jobId: number) {
    if (!Number.isFinite(jobId) || jobId <= 0) return;
    if (handledJobIdsRef.current.has(jobId)) return;
    if (resumedJobRef.current === jobId) return;
    resumedJobRef.current = jobId;
    setIsSending(true);
    try {
      await setAiPendingJobId(jobId);
      const botText = await pollAiJobUntilDone(jobId);
      await clearAiPendingJobId();
      handledJobIdsRef.current.add(jobId);
      setMessages((prev) => [...prev, { id: makeId(), type: 'bot', text: botText }]);
    } catch (e: any) {
      await clearAiPendingJobId();
      setMessages((prev) => [...prev, { id: makeId(), type: 'bot', text: `${copy.aiError} ${errorToText(e)}` }]);
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const fromPush = Number(params?.ai_job_id || 0);
      const saved = await getAiPendingJobId();
      const target = Number.isFinite(fromPush) && fromPush > 0 ? fromPush : saved || 0;
      if (!alive || !target) return;
      await resumePendingJob(target);
    })();
    return () => {
      alive = false;
    };
  }, [params?.ai_job_id]);

  async function send() {
    const text = input.trim();
    if (!text || isSending) return;

    const history: AiHistoryItem[] = messages
      .filter((m) => m.text !== copy.welcome1 && m.text !== copy.welcome2)
      .map((m) => {
        const role: AiHistoryItem['role'] = m.type === 'user' ? 'user' : 'assistant';
        return { role, text: m.text };
      })
      .slice(-6);

    setInput('');
    setMessages((prev) => [...prev, { id: makeId(), type: 'user', text }]);
    setIsSending(true);

    let jobId = 0;
    try {
      const job = await createAiJob(text, token, langKey, history);
      jobId = Number(job?.job_id || 0);
      if (!Number.isFinite(jobId) || jobId <= 0) throw new Error('invalid ai job id');
      if (handledJobIdsRef.current.has(jobId)) return;
      await setAiPendingJobId(jobId);
      const botText = await pollAiJobUntilDone(jobId);
      await clearAiPendingJobId();
      handledJobIdsRef.current.add(jobId);
      setMessages((prev) => [...prev, { id: makeId(), type: 'bot', text: botText }]);
    } catch (e: any) {
      const msg = `${copy.aiError} ${errorToText(e)}`;
      setMessages((prev) => [...prev, { id: makeId(), type: 'bot', text: msg }]);
      await clearAiPendingJobId();
    } finally {
      setIsSending(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: primary, paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ThemedText style={styles.backText}>←</ThemedText>
          </Pressable>

          <View style={styles.headerInfoRow}>
            <View style={[styles.botIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <ThemedText style={styles.botIcon}>🤖</ThemedText>
            </View>

            <View style={{ flex: 1 }}>
              <ThemedText style={styles.headerTitle}>{copy.title}</ThemedText>
              <ThemedText style={styles.headerSubtitle}>{isSending ? typingLabel : copy.online}</ThemedText>
            </View>
          </View>
        </View>
      </View>

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
            {messages.map((m) => {
              const isBot = m.type === 'bot';
              const bubbleBg = isBot ? surface : primary;

              return (
                <View
                  key={m.id}
                  style={[
                    styles.bubbleWrap,
                    isBot ? { alignSelf: 'flex-start' } : { alignSelf: 'flex-end' },
                    { maxWidth: '80%' },
                  ]}
                >
                  <View
                    style={[
                      styles.bubble,
                      isBot
                        ? { backgroundColor: bubbleBg, borderColor: border, borderWidth: 1 }
                        : { backgroundColor: bubbleBg },
                    ]}
                  >
                    <ThemedText style={[styles.bubbleText, isBot ? { color: textColor } : { color: '#fff' }]}>
                      {m.text}
                    </ThemedText>
                  </View>
                </View>
              );
            })}

            {isSending ? (
              <View style={[styles.bubbleWrap, { alignSelf: 'flex-start', maxWidth: '80%' }]}>
                <View
                  style={[
                    styles.bubble,
                    styles.typingBubble,
                    { backgroundColor: surface, borderColor: border, borderWidth: 1 },
                  ]}
                >
                  <View style={styles.typingDotsRow}>
                    {[0, 1, 2].map((dot) => (
                      <View
                        key={dot}
                        style={[
                          styles.typingDot,
                          {
                            backgroundColor: primary,
                            opacity: typingFrame === dot ? 1 : 0.28,
                            transform: [{ scale: typingFrame === dot ? 1.12 : 1 }],
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <ThemedText style={[styles.typingText, { color: textColor }]}>{typingLabel}</ThemedText>
                </View>
              </View>
            ) : null}
          </ScrollView>

          <View style={[styles.inputBar, { backgroundColor: surface, borderTopColor: border }]}>
            <View style={styles.inputRow}>
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder={copy.inputPh}
                placeholderTextColor="#9BA1A6"
                style={[styles.input, { borderColor: border, backgroundColor: surface, color: textColor }]}
                returnKeyType="send"
                onSubmitEditing={send}
                blurOnSubmit={false}
              />
              <Pressable
                onPress={send}
                disabled={!canSend}
                style={({ pressed }) => [
                  styles.sendBtn,
                  { backgroundColor: primary },
                  !canSend ? { opacity: 0.5 } : null,
                  pressed ? { opacity: 0.9 } : null,
                ]}
              >
                <ThemedText style={styles.sendText}>📤</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  backText: { color: '#fff', fontSize: 18 },
  headerInfoRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  botIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botIcon: { fontSize: 18, lineHeight: 22 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },

  chatWrap: { flex: 1, minHeight: 0 },
  chatMessages: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },

  bubbleWrap: { position: 'relative' },
  bubble: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 18 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  typingBubble: { minWidth: 120 },
  typingDotsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  typingDot: { width: 8, height: 8, borderRadius: 999 },
  typingText: { fontSize: 12, lineHeight: 16, opacity: 0.7 },

  inputBar: { padding: 16, borderTopWidth: 1 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderRadius: 12,
    fontSize: 14,
  },
  sendBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

