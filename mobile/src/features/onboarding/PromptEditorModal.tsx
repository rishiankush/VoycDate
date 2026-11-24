import { ChevronRight, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, IconButton, TextField } from '@/components/ui';
import { colors, layout, spacing } from '@/theme';

import { PROMPT_ANSWER_MAX, PROMPTS } from './options';
import type { ProfilePrompt } from './types';

type PromptEditorModalProps = {
  visible: boolean;
  initial: ProfilePrompt | null;
  usedQuestions: string[];
  onSave: (prompt: ProfilePrompt) => void;
  onClose: () => void;
};

export function PromptEditorModal({ visible, initial, usedQuestions, onSave, onClose }: PromptEditorModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible ? (
        <PromptEditor
          key={initial?.id ?? 'new'}
          initial={initial}
          usedQuestions={usedQuestions}
          onSave={onSave}
          onClose={onClose}
        />
      ) : null}
    </Modal>
  );
}

function PromptEditor({ initial, usedQuestions, onSave, onClose }: Omit<PromptEditorModalProps, 'visible'>) {
  const [question, setQuestion] = useState(initial?.question ?? null);
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const available = PROMPTS.filter((p) => p === initial?.question || !usedQuestions.includes(p));
  const trimmed = answer.trim();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <AppText variant="heading">{question ? 'Your answer' : 'Choose a prompt'}</AppText>
        <IconButton accessibilityLabel="Close" onPress={onClose} size={40} icon={<X size={20} color={colors.plum} />} />
      </View>

      {question ? (
        <View style={styles.answer}>
          <Pressable accessibilityRole="button" onPress={() => setQuestion(null)} hitSlop={8}>
            <AppText variant="bodyStrong" color="plum">
              {question}
            </AppText>
            <AppText variant="caption" style={styles.change}>
              Change prompt
            </AppText>
          </Pressable>
          <TextField
            placeholder="Write your answer"
            value={answer}
            onChangeText={setAnswer}
            multiline
            maxLength={PROMPT_ANSWER_MAX}
            autoFocus
            helperText={`${answer.length}/${PROMPT_ANSWER_MAX}`}
          />
          <Button
            title="Save"
            disabled={!trimmed}
            onPress={() => onSave({ id: initial?.id ?? `${Date.now()}`, question, answer: trimmed })}
          />
        </View>
      ) : (
        <FlatList
          data={available}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => setQuestion(item)}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <AppText variant="bodyLarge" color="text" style={styles.rowText}>
                {item}
              </AppText>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.sm,
  },
  answer: {
    paddingHorizontal: layout.screenPadding,
    gap: spacing.md,
  },
  change: {
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
  },
  rowPressed: {
    backgroundColor: colors.pinkTint,
  },
  rowText: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.pinkBorder,
    marginLeft: layout.screenPadding,
  },
});
