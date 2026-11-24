import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, ChipGroup, IconButton, OptionCard, Screen, TextField } from '@/components/ui';
import {
  BIO_MAX,
  HABITS,
  INTEREST_CATEGORIES,
  INTENTS,
  MAX_INTERESTS,
  MAX_PROMPTS,
  MAX_VALUES,
  PROMPT_ANSWER_MAX,
  PROMPTS,
  VALUES,
} from '@/features/onboarding/options';
import type { ProfilePrompt } from '@/features/onboarding/types';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, spacing } from '@/theme';

const TITLES: Record<string, string> = {
  about: 'About me',
  intent: 'Looking for',
  interests: 'Interests',
  values: 'Values',
  lifestyle: 'Lifestyle',
  height: 'Height',
  prompts: 'Prompts',
};

export default function EditSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const key = section ?? 'about';
  const { profile, saveProfile } = useMyProfile();
  const [busy, setBusy] = useState(false);

  const [bio, setBio] = useState(profile.bio ?? '');
  const [intent, setIntent] = useState(profile.intent ?? '');
  const [interests, setInterests] = useState<string[]>(profile.interests ?? []);
  const [values, setValues] = useState<string[]>(profile.values ?? []);
  const [drinking, setDrinking] = useState(profile.habits?.drinking ?? '');
  const [smoking, setSmoking] = useState(profile.habits?.smoking ?? '');
  const [exercise, setExercise] = useState(profile.habits?.exercise ?? '');
  const [heightCm, setHeightCm] = useState(profile.heightCm != null ? String(profile.heightCm) : '');
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(
    profile.prompts?.length ? profile.prompts : [{ id: '1', question: PROMPTS[0], answer: '' }],
  );

  const save = async () => {
    setBusy(true);
    try {
      if (key === 'about') await saveProfile({ bio: bio.trim() });
      if (key === 'intent') await saveProfile({ intent: intent || undefined });
      if (key === 'interests') await saveProfile({ interests });
      if (key === 'values') await saveProfile({ values });
      if (key === 'lifestyle') {
        await saveProfile({
          habits: {
            drinking: drinking || undefined,
            smoking: smoking || undefined,
            exercise: exercise || undefined,
          },
        });
      }
      if (key === 'height') {
        const n = Number(heightCm);
        await saveProfile({ heightCm: Number.isFinite(n) && n > 0 ? Math.round(n) : null });
      }
      if (key === 'prompts') {
        const cleaned = prompts
          .map((p, i) => ({
            id: p.id || String(i + 1),
            question: p.question,
            answer: p.answer.trim(),
          }))
          .filter((p) => p.answer.length > 0)
          .slice(0, MAX_PROMPTS);
        await saveProfile({ prompts: cleaned });
      }
      router.back();
    } catch {
      Alert.alert('Couldn’t save', 'Check your connection and try again.');
      setBusy(false);
    }
  };

  return (
    <Screen
      header={
        <View style={styles.header}>
          <IconButton
            accessibilityLabel="Back"
            onPress={router.back}
            icon={<ChevronLeft size={22} color={colors.plum} />}
          />
          <AppText variant="heading" style={styles.title}>
            {TITLES[key] ?? 'Edit'}
          </AppText>
          <View style={styles.spacer} />
        </View>
      }
      footer={<Button title="Save" onPress={save} loading={busy} />}>
      {key === 'about' ? (
        <TextField
          placeholder="A few lines about you"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={BIO_MAX}
          helperText={`${bio.length}/${BIO_MAX}`}
        />
      ) : null}

      {key === 'intent' ? (
        <View style={styles.stack}>
          {INTENTS.map((option) => (
            <OptionCard
              key={option.value}
              title={option.label}
              subtitle={option.description}
              selected={intent === option.value}
              onPress={() => setIntent(option.value)}
            />
          ))}
        </View>
      ) : null}

      {key === 'interests' ? (
        <View style={styles.stack}>
          <AppText variant="caption" color="textMuted">
            Choose up to {MAX_INTERESTS} · {interests.length}/{MAX_INTERESTS}
          </AppText>
          {INTEREST_CATEGORIES.map((category) => (
            <View key={category.title} style={styles.category}>
              <AppText variant="label">{category.title}</AppText>
              <ChipGroup
                options={category.options}
                selected={interests}
                max={MAX_INTERESTS}
                onChange={setInterests}
              />
            </View>
          ))}
        </View>
      ) : null}

      {key === 'values' ? (
        <View style={styles.stack}>
          <AppText variant="caption" color="textMuted">
            Choose up to {MAX_VALUES} · {values.length}/{MAX_VALUES}
          </AppText>
          <ChipGroup options={VALUES} selected={values} onChange={setValues} max={MAX_VALUES} />
        </View>
      ) : null}

      {key === 'lifestyle' ? (
        <View style={styles.stack}>
          <AppText variant="label">{HABITS.exercise.label}</AppText>
          {HABITS.exercise.options.map((option) => (
            <OptionCard
              key={option}
              title={option}
              selected={exercise === option}
              onPress={() => setExercise(option)}
            />
          ))}
          <AppText variant="label">{HABITS.drinking.label}</AppText>
          {HABITS.drinking.options.map((option) => (
            <OptionCard
              key={option}
              title={option}
              selected={drinking === option}
              onPress={() => setDrinking(option)}
            />
          ))}
          <AppText variant="label">{HABITS.smoking.label}</AppText>
          {HABITS.smoking.options.map((option) => (
            <OptionCard
              key={option}
              title={option}
              selected={smoking === option}
              onPress={() => setSmoking(option)}
            />
          ))}
        </View>
      ) : null}

      {key === 'height' ? (
        <TextField
          label="Height (cm)"
          placeholder="e.g. 170"
          value={heightCm}
          onChangeText={(text) => setHeightCm(text.replace(/\D/g, '').slice(0, 3))}
          keyboardType="number-pad"
          helperText="We show this as centimetres for everyone."
        />
      ) : null}

      {key === 'prompts' ? (
        <View style={styles.stack}>
          {prompts.map((prompt, index) => (
            <View key={prompt.id} style={styles.prompt}>
              <AppText variant="bodyStrong">{prompt.question}</AppText>
              <TextField
                placeholder="Your answer"
                value={prompt.answer}
                onChangeText={(answer) =>
                  setPrompts((current) => current.map((p, i) => (i === index ? { ...p, answer } : p)))
                }
                multiline
                maxLength={PROMPT_ANSWER_MAX}
              />
            </View>
          ))}
          {prompts.length < MAX_PROMPTS ? (
            <Button
              title="Add another prompt"
              variant="secondary"
              onPress={() =>
                setPrompts((current) => [
                  ...current,
                  {
                    id: String(current.length + 1),
                    question: PROMPTS[current.length % PROMPTS.length],
                    answer: '',
                  },
                ])
              }
            />
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  spacer: {
    width: 44,
  },
  stack: {
    gap: spacing.sm,
  },
  category: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  prompt: {
    gap: spacing.xs,
  },
});
