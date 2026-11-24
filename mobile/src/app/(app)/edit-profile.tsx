import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { AppText, Button, ChipGroup, IconButton, Screen, SelectTile, TextField } from '@/components/ui';
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

export default function EditProfileScreen() {
  const { profile, saveProfile } = useMyProfile();
  const [bio, setBio] = useState(profile.bio ?? '');
  const [intent, setIntent] = useState(profile.intent ?? '');
  const [interests, setInterests] = useState<string[]>(profile.interests ?? []);
  const [values, setValues] = useState<string[]>(profile.values ?? []);
  const [drinking, setDrinking] = useState(profile.habits?.drinking ?? '');
  const [smoking, setSmoking] = useState(profile.habits?.smoking ?? '');
  const [exercise, setExercise] = useState(profile.habits?.exercise ?? '');
  const [prompts, setPrompts] = useState<ProfilePrompt[]>(
    profile.prompts?.length
      ? profile.prompts
      : [{ id: '1', question: PROMPTS[0], answer: '' }],
  );
  const [saving, setSaving] = useState(false);

  const interestOptions = useMemo(() => INTEREST_CATEGORIES.flatMap((c) => c.options), []);

  const save = async () => {
    const trimmedBio = bio.trim();
    const cleanedPrompts = prompts
      .map((p, i) => ({
        id: p.id || String(i + 1),
        question: p.question,
        answer: p.answer.trim(),
      }))
      .filter((p) => p.answer.length > 0)
      .slice(0, MAX_PROMPTS);

    setSaving(true);
    try {
      await saveProfile({
        bio: trimmedBio,
        intent: intent || undefined,
        interests,
        values,
        habits: {
          drinking: drinking || undefined,
          smoking: smoking || undefined,
          exercise: exercise || undefined,
        },
        prompts: cleanedPrompts,
      });
      router.back();
    } catch {
      Alert.alert('Couldn’t save', 'Check your connection and try again.');
      setSaving(false);
    }
  };

  return (
    <Screen
      header={
        <View style={styles.header}>
          <AppText variant="heading">Edit profile</AppText>
          <IconButton accessibilityLabel="Close" onPress={router.back} icon={<X size={20} color={colors.plum} />} />
        </View>
      }
      footer={<Button title="Save" onPress={save} loading={saving} />}>
      <View style={styles.section}>
        <AppText variant="label">About me</AppText>
        <TextField
          placeholder="A few lines about you"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={BIO_MAX}
          helperText={`${bio.length}/${BIO_MAX}`}
        />
      </View>

      {profile.mode === 'date' ? (
        <View style={styles.section}>
          <AppText variant="label">Looking for</AppText>
          <View style={styles.wrap}>
            {INTENTS.map((option) => (
              <SelectTile
                key={option.value}
                label={option.label}
                selected={intent === option.value}
                onPress={() => setIntent(option.value)}
              />
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="label">Interests · {interests.length}/{MAX_INTERESTS}</AppText>
        <ChipGroup options={interestOptions} selected={interests} onChange={setInterests} max={MAX_INTERESTS} />
      </View>

      <View style={styles.section}>
        <AppText variant="label">Values · {values.length}/{MAX_VALUES}</AppText>
        <ChipGroup options={VALUES} selected={values} onChange={setValues} max={MAX_VALUES} />
      </View>

      <View style={styles.section}>
        <AppText variant="label">{HABITS.drinking.label}</AppText>
        <View style={styles.wrap}>
          {HABITS.drinking.options.map((option) => (
            <SelectTile key={option} label={option} selected={drinking === option} onPress={() => setDrinking(option)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="label">{HABITS.smoking.label}</AppText>
        <View style={styles.wrap}>
          {HABITS.smoking.options.map((option) => (
            <SelectTile key={option} label={option} selected={smoking === option} onPress={() => setSmoking(option)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="label">{HABITS.exercise.label}</AppText>
        <View style={styles.wrap}>
          {HABITS.exercise.options.map((option) => (
            <SelectTile key={option} label={option} selected={exercise === option} onPress={() => setExercise(option)} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="label">Prompts</AppText>
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

      <AppText variant="caption" color="textMuted">
        Photos and your video intro are managed from onboarding for now — re-record from Profile if needed.
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  section: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  prompt: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
});
