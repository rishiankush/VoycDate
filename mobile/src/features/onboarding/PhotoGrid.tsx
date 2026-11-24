import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { arrayRemove, arrayUnion } from 'firebase/firestore';
import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui';
import { deleteFile, uploadFile } from '@/lib/upload';
import { colors, fontFamily, radii, spacing } from '@/theme';

import { MAX_PHOTOS } from './options';
import { useOnboarding } from './OnboardingProvider';
import type { ProfilePhoto } from './types';

const MAX_EDGE = 1080;
const COLUMNS = 3;
const SLOT_ASPECT = 0.8;

type Upload = { id: string; uri: string; progress: number };

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

async function prepare(asset: ImagePicker.ImagePickerAsset) {
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > MAX_EDGE) {
    context.resize(asset.width >= asset.height ? { width: MAX_EDGE } : { height: MAX_EDGE });
  }
  const image = await context.renderAsync();
  return image.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
}

export function PhotoGrid() {
  const { uid, profile, saveProfile } = useOnboarding();
  const photos = profile.photos ?? [];
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [gridWidth, setGridWidth] = useState(0);
  const [openedAt] = useState(() => Date.now());
  const slotsLeft = MAX_PHOTOS - photos.length - uploads.length;

  const uploadAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    const id = newId();
    setUploads((u) => [...u, { id, uri: asset.uri, progress: 0 }]);
    try {
      const prepared = await prepare(asset);
      const { path, url } = await uploadFile(
        prepared.uri,
        `profiles/${uid}/photos/${id}.jpg`,
        'image/jpeg',
        { onProgress: (progress) => setUploads((u) => u.map((x) => (x.id === id ? { ...x, progress } : x))) },
      );
      const photo: ProfilePhoto = { id, path, url, width: prepared.width, height: prepared.height };
      await saveProfile({ photos: arrayUnion(photo) });
    } catch (error) {
      const detail = __DEV__ && error instanceof Error ? `\n\n${error.message}` : '';
      Alert.alert('Upload failed', `We couldn’t upload that photo. Please try again.${detail}`);
    } finally {
      setUploads((u) => u.filter((x) => x.id !== id));
    }
  };

  const pick = async () => {
    if (slotsLeft <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: slotsLeft,
      quality: 1,
    });
    if (result.canceled) return;
    result.assets.slice(0, slotsLeft).forEach(uploadAsset);
  };

  const remove = (photo: ProfilePhoto) => {
    saveProfile({ photos: arrayRemove(photo) }).then(() => deleteFile(photo.path));
  };

  const makeMain = (photo: ProfilePhoto) => {
    saveProfile({ photos: [photo, ...photos.filter((p) => p.id !== photo.id)] });
  };

  const openActions = (photo: ProfilePhoto, index: number) => {
    Alert.alert('Photo', undefined, [
      ...(index > 0 ? [{ text: 'Make main photo', onPress: () => makeMain(photo) }] : []),
      { text: 'Remove', style: 'destructive' as const, onPress: () => remove(photo) },
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const slotWidth = gridWidth ? (gridWidth - spacing.xs * (COLUMNS - 1)) / COLUMNS : 0;
  const slotSize = { width: slotWidth, height: slotWidth / SLOT_ASPECT };

  const rejection = profile.moderation?.lastRejection;
  const recentRejection = rejection?.at && openedAt - rejection.at.toMillis() < 24 * 3_600_000 ? rejection : null;

  return (
    <View style={styles.wrapper}>
      {recentRejection ? (
        <AppText variant="caption" color="danger">
          {recentRejection.reason}
        </AppText>
      ) : null}
    <View style={styles.grid} onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}>
      {Array.from({ length: MAX_PHOTOS }, (_, i) => {
        const photo = photos[i];
        const upload = photo ? undefined : uploads[i - photos.length];

        if (photo) {
          return (
            <Pressable
              key={photo.id}
              accessibilityRole="button"
              accessibilityLabel={i === 0 ? 'Main photo. Options' : `Photo ${i + 1}. Options`}
              onPress={() => openActions(photo, i)}
              style={[styles.slot, slotSize]}>
              <Image source={{ uri: photo.url }} style={styles.image} contentFit="cover" transition={150} />
              {i === 0 ? (
                <View style={styles.mainBadge}>
                  <AppText variant="caption" color="plum" style={styles.mainText}>
                    Main
                  </AppText>
                </View>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                onPress={() => remove(photo)}
                hitSlop={6}
                style={styles.removeButton}>
                <X size={14} color={colors.white} strokeWidth={3} />
              </Pressable>
            </Pressable>
          );
        }

        if (upload) {
          return (
            <View key={upload.id} style={[styles.slot, slotSize]}>
              <Image source={{ uri: upload.uri }} style={[styles.image, styles.uploading]} contentFit="cover" />
              <View style={styles.progressOverlay}>
                <ActivityIndicator color={colors.white} />
                <AppText variant="caption" color="white">
                  {Math.round(upload.progress * 100)}%
                </AppText>
              </View>
            </View>
          );
        }

        return (
          <Pressable
            key={`empty-${i}`}
            accessibilityRole="button"
            accessibilityLabel={`Add photo ${i + 1}`}
            onPress={pick}
            style={({ pressed }) => [styles.slot, slotSize, styles.empty, pressed && styles.emptyPressed]}>
            <Plus size={26} color={colors.plum} />
          </Pressable>
        );
      })}
    </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  slot: {
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.pinkTint,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  uploading: {
    opacity: 0.6,
  },
  progressOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs,
    backgroundColor: 'rgba(42, 11, 43, 0.35)',
  },
  empty: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.pinkBorderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPressed: {
    backgroundColor: colors.pinkTint,
  },
  mainBadge: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  mainText: {
    fontFamily: fontFamily.sansBold,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 11, 43, 0.6)',
  },
});
