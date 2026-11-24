import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { MAX_PROMPTS } from '@/features/onboarding/options';
import { useOnboarding } from '@/features/onboarding/OnboardingProvider';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PromptEditorModal } from '@/features/onboarding/PromptEditorModal';
import type { ProfilePrompt } from '@/features/onboarding/types';
import { useOnboardingStep } from '@/features/onboarding/useOnboardingStep';
import { colors, radii, shadows, spacing } from '@/theme';

const STEP = '4.3';

export default function PromptsStep() {
  const { profile } = useOnboarding();
  const { complete, saving } = useOnboardingStep(STEP);
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(profile.prompts ?? []);
  const [editing, setEditing] = useState<ProfilePrompt | 'new' | null>(null);

  const save = (prompt: ProfilePrompt) => {
    setPrompts((list) =>
      list.some((p) => p.id === prompt.id) ? list.map((p) => (p.id === prompt.id ? prompt : p)) : [...list, prompt],
    );
    setEditing(null);
  };

  return (
    <OnboardingScreen
      stepId={STEP}
      title="Add prompts"
      subtitle={`Answer up to ${MAX_PROMPTS}. They give people an easy way to start talking.`}
      canContinue={prompts.length > 0}
      onContinue={() => complete({ profile: { prompts } })}
      busy={saving}>
      {prompts.map((prompt) => (
        <Pressable
          key={prompt.id}
          accessibilityRole="button"
          accessibilityLabel={`${prompt.question} ${prompt.answer}. Edit`}
          onPress={() => setEditing(prompt)}
          style={styles.card}>
          <View style={styles.cardText}>
            <AppText variant="label" color="plum">
              {prompt.question}
            </AppText>
            <AppText variant="bodyLarge" color="text">
              {prompt.answer}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove prompt"
            onPress={() => setPrompts((list) => list.filter((p) => p.id !== prompt.id))}
            hitSlop={8}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        </Pressable>
      ))}

      {prompts.length < MAX_PROMPTS ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditing('new')}
          style={({ pressed }) => [styles.add, pressed && styles.addPressed]}>
          <Plus size={18} color={colors.plum} />
          <AppText variant="button" color="plum">
            Add a prompt
          </AppText>
        </Pressable>
      ) : null}

      <PromptEditorModal
        visible={editing !== null}
        initial={editing === 'new' ? null : editing}
        usedQuestions={prompts.map((p) => p.question)}
        onSave={save}
        onClose={() => setEditing(null)}
      />
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  cardText: {
    flex: 1,
    gap: spacing.xxs,
  },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    height: 56,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.pinkBorderStrong,
  },
  addPressed: {
    backgroundColor: colors.pinkTint,
  },
});
