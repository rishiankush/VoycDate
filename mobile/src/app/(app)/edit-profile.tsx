import { Image } from 'expo-image';
import { router } from 'expo-router';
import {
  Briefcase,
  ChevronLeft,
  Cigarette,
  Dumbbell,
  GlassWater,
  Heart,
  Plus,
  Ruler,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppText, IconButton, Screen } from '@/components/ui';
import { INTENTS, MAX_PHOTOS } from '@/features/onboarding/options';
import { formatHeight } from '@/features/onboarding/units';
import { AttributeRow, EditCard, Pill, SectionHeader } from '@/features/profile/ProfileRows';
import { useMyProfile } from '@/features/profile/MyProfileProvider';
import { colors, layout, radii, spacing } from '@/theme';

function openSection(section: string) {
  router.push({ pathname: '/(app)/edit-section', params: { section } });
}

export default function EditProfileScreen() {
  const { profile } = useMyProfile();
  const photos = profile.photos ?? [];
  const slots = Array.from({ length: MAX_PHOTOS }, (_, i) => photos[i] ?? null);
  const intentLabel = INTENTS.find((i) => i.value === profile.intent)?.label;
  const habits = [
    profile.habits?.exercise,
    profile.habits?.drinking,
    profile.habits?.smoking,
  ].filter(Boolean);
  const lifestyleSummary = habits.length ? habits.join(' · ') : null;

  return (
    <Screen
      header={
        <View style={styles.header}>
          <IconButton
            accessibilityLabel="Back"
            onPress={router.back}
            icon={<ChevronLeft size={22} color={colors.plum} />}
          />
          <AppText variant="heading" style={styles.headerTitle}>
            Edit profile
          </AppText>
          <View style={styles.headerSpacer} />
        </View>
      }>
      <View style={styles.grid}>
        {slots.map((photo, index) => (
          <PressableSlot key={index} index={index} uri={photo?.url} isMain={index === 0} />
        ))}
      </View>
      <AppText variant="caption" color="textMuted" style={styles.gridHint}>
        Your photos and video intro show on Discover. Tap a section below to edit details.
      </AppText>

      <SectionHeader title="About you" subtitle="The basics people see first." />
      <AttributeRow
        icon={<Heart size={18} color={colors.plum} />}
        label="About me"
        value={profile.bio?.trim() ? profile.bio.trim().slice(0, 42) + (profile.bio.length > 42 ? '…' : '') : null}
        onPress={() => openSection('about')}
      />
      {profile.mode === 'date' ? (
        <AttributeRow
          icon={<Briefcase size={18} color={colors.plum} />}
          label="Looking for"
          value={intentLabel}
          onPress={() => openSection('intent')}
        />
      ) : null}
      <AttributeRow
        icon={<Ruler size={18} color={colors.plum} />}
        label="Height"
        value={profile.heightCm != null ? formatHeight(profile.heightCm) : null}
        onPress={() => openSection('height')}
        last
      />

      <SectionHeader title="Lifestyle" subtitle="Cover the things most people are curious about." />
      <AttributeRow
        icon={<Dumbbell size={18} color={colors.plum} />}
        label="Exercise"
        value={profile.habits?.exercise}
        onPress={() => openSection('lifestyle')}
      />
      <AttributeRow
        icon={<GlassWater size={18} color={colors.plum} />}
        label="Drinking"
        value={profile.habits?.drinking}
        onPress={() => openSection('lifestyle')}
      />
      <AttributeRow
        icon={<Cigarette size={18} color={colors.plum} />}
        label="Smoking"
        value={profile.habits?.smoking}
        onPress={() => openSection('lifestyle')}
        last
      />

      <SectionHeader title="Interests" subtitle="Get specific about the things you love." />
      <EditCard
        accessibilityLabel="Edit interests"
        onPress={() => openSection('interests')}>
        {(profile.interests?.length ?? 0) > 0 ? (
          <View style={styles.pills}>
            {profile.interests!.map((item) => (
              <Pill key={item} label={item} />
            ))}
          </View>
        ) : (
          <AppText variant="body" color="textMuted">
            Add interests
          </AppText>
        )}
      </EditCard>

      <SectionHeader title="Values" subtitle="Choose qualities that matter to you." />
      <EditCard accessibilityLabel="Edit values" onPress={() => openSection('values')}>
        {(profile.values?.length ?? 0) > 0 ? (
          <View style={styles.pills}>
            {profile.values!.map((item) => (
              <Pill key={item} label={item} />
            ))}
          </View>
        ) : (
          <AppText variant="body" color="textMuted">
            Add values
          </AppText>
        )}
      </EditCard>

      <SectionHeader title="Prompts" subtitle="Let people know what it’s like to date you." />
      <EditCard accessibilityLabel="Edit prompts" onPress={() => openSection('prompts')}>
        {(profile.prompts?.length ?? 0) > 0 ? (
          <View style={styles.promptPreview}>
            <AppText variant="bodyStrong">{profile.prompts![0].question}</AppText>
            <AppText variant="body" color="text">
              {profile.prompts![0].answer}
            </AppText>
            {(profile.prompts?.length ?? 0) > 1 ? (
              <AppText variant="caption" color="textMuted">
                +{(profile.prompts?.length ?? 0) - 1} more
              </AppText>
            ) : null}
          </View>
        ) : (
          <AppText variant="body" color="textMuted">
            Add prompts
          </AppText>
        )}
      </EditCard>

      {lifestyleSummary ? (
        <AppText variant="caption" color="textMuted" style={styles.footerNote}>
          Tip: stronger profiles fill About, Interests and Prompts.
        </AppText>
      ) : null}
    </Screen>
  );
}

function PressableSlot({ index, uri, isMain }: { index: number; uri?: string; isMain?: boolean }) {
  return (
    <View style={styles.slot}>
      {uri ? (
        <Image source={{ uri }} style={styles.slotImage} contentFit="cover" />
      ) : (
        <View style={styles.slotEmpty}>
          <Plus size={22} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.slotBadge}>
        <AppText variant="label" color="white" style={styles.slotBadgeText}>
          {isMain ? 'Main' : String(index + 1)}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  gridHint: {
    marginBottom: spacing.sm,
  },
  slot: {
    width: '31.5%',
    aspectRatio: 0.78,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.pinkTint,
  },

  slotImage: {
    width: '100%',
    height: '100%',
  },
  slotEmpty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.pinkBorder,
    borderStyle: 'dashed',
    borderRadius: radii.sm,
  },
  slotBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(8,52,63,0.75)',
  },
  slotBadgeText: {
    fontSize: 11,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  promptPreview: {
    gap: 4,
  },
  footerNote: {
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
    paddingHorizontal: layout.screenPadding > 0 ? 0 : 0,
  },
});
