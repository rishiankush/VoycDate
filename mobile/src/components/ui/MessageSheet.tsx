import { AppText } from './AppText';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';

export type MessageSheetAction = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export type MessageSheetState = {
  title: string;
  body: string;
  primary?: MessageSheetAction;
  secondary?: MessageSheetAction;
} | null;

type MessageSheetProps = {
  notice: MessageSheetState;
  onClose: () => void;
};

/** Notice / confirm bottom sheet — replaces system Alert.alert for in-app messaging. */
export function MessageSheet({ notice, onClose }: MessageSheetProps) {
  return (
    <BottomSheet visible={Boolean(notice)} onClose={onClose}>
      {notice ? (
        <>
          <AppText variant="title">{notice.title}</AppText>
          <AppText variant="body" color="textMuted">
            {notice.body}
          </AppText>
          {notice.primary ? (
            <Button
              title={notice.primary.label}
              variant={notice.primary.variant ?? 'primary'}
              onPress={() => {
                const run = notice.primary!.onPress;
                onClose();
                run();
              }}
            />
          ) : null}
          {notice.secondary ? (
            <Button
              title={notice.secondary.label}
              variant={notice.secondary.variant ?? 'secondary'}
              onPress={() => {
                const run = notice.secondary!.onPress;
                onClose();
                run();
              }}
            />
          ) : (
            <Button title="OK" variant="secondary" onPress={onClose} />
          )}
        </>
      ) : null}
    </BottomSheet>
  );
}
