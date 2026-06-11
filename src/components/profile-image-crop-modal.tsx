import { Image } from 'expo-image';
import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
} from 'react-native';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  clampCropOffset,
  cropImageToSquareDataUri,
  getCoverScale,
} from '@/lib/crop-image-web';

const VIEWPORT_SIZE = 280;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type ProfileImageCropModalProps = {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onConfirm: (croppedUri: string) => void | Promise<void>;
};

export function ProfileImageCropModal({
  visible,
  imageUri,
  onClose,
  onConfirm,
}: ProfileImageCropModalProps) {
  const theme = useTheme();
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [submitting, setSubmitting] = useState(false);
  const offsetRef = useRef(offset);
  const zoomRef = useRef(zoom);
  const imageSizeRef = useRef(imageSize);
  const dragStartRef = useRef({ offsetX: 0, offsetY: 0 });

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    imageSizeRef.current = imageSize;
  }, [imageSize]);

  useEffect(() => {
    if (!visible || !imageUri) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setImageSize({ width: 0, height: 0 });
  }, [visible, imageUri]);

  const layout = useMemo(() => {
    if (!imageSize.width || !imageSize.height) {
      return { width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, left: 0, top: 0 };
    }

    const scale = getCoverScale(imageSize.width, imageSize.height, VIEWPORT_SIZE) * zoom;
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;

    return {
      width,
      height,
      left: (VIEWPORT_SIZE - width) / 2 + offset.x,
      top: (VIEWPORT_SIZE - height) / 2 + offset.y,
    };
  }, [imageSize, offset.x, offset.y, zoom]);

  const applyDrag = (dx: number, dy: number) => {
    const { width, height } = imageSizeRef.current;
    if (!width || !height) return;

    const next = clampCropOffset(
      dragStartRef.current.offsetX + dx,
      dragStartRef.current.offsetY + dy,
      width,
      height,
      VIEWPORT_SIZE,
      zoomRef.current,
    );
    setOffset({ x: next.offsetX, y: next.offsetY });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStartRef.current = {
            offsetX: offsetRef.current.x,
            offsetY: offsetRef.current.y,
          };
        },
        onPanResponderMove: (_event: GestureResponderEvent, gesture: PanResponderGestureState) => {
          applyDrag(gesture.dx, gesture.dy);
        },
        onPanResponderRelease: (_event, gesture) => {
          applyDrag(gesture.dx, gesture.dy);
        },
      }),
    [],
  );

  const handleZoomChange = (value: number) => {
    const { width, height } = imageSize;
    if (!width || !height) {
      setZoom(value);
      return;
    }

    setZoom(value);
    setOffset((current) => {
      const next = clampCropOffset(current.x, current.y, width, height, VIEWPORT_SIZE, value);
      return { x: next.offsetX, y: next.offsetY };
    });
  };

  const handleConfirm = async () => {
    if (!imageUri || !imageSize.width || !imageSize.height) return;

    setSubmitting(true);
    try {
      const croppedUri = await cropImageToSquareDataUri(imageUri, {
        imageWidth: imageSize.width,
        imageHeight: imageSize.height,
        viewportSize: VIEWPORT_SIZE,
        zoom,
        offsetX: offset.x,
        offsetY: offset.y,
      });
      await onConfirm(croppedUri);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <ThemedView style={[styles.panel, { borderColor: theme.border, backgroundColor: theme.background }]}>
          <ThemedText type="smallBold">Crop profile picture</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Drag to reposition and use the slider to zoom.
          </ThemedText>

          <View
            style={[styles.viewport, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            {...panResponder.panHandlers}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                onLoad={(event) => {
                  const { width, height } = event.source;
                  if (width && height) {
                    setImageSize({ width, height });
                  }
                }}
                style={[
                  styles.image,
                  {
                    width: layout.width,
                    height: layout.height,
                    left: layout.left,
                    top: layout.top,
                  },
                ]}
                contentFit="fill"
              />
            ) : null}
            <View
              pointerEvents="none"
              style={[styles.circleGuide, { borderColor: theme.accent }]}
            />
          </View>

          <View style={styles.zoomRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Zoom
            </ThemedText>
            {createElement('input', {
              type: 'range',
              min: MIN_ZOOM,
              max: MAX_ZOOM,
              step: 0.02,
              value: zoom,
              onChange: (event: { target: { value: string } }) => {
                handleZoomChange(Number(event.target.value));
              },
              style: {
                width: '100%',
                accentColor: theme.accent,
                cursor: 'pointer',
              },
            })}
          </View>

          <View style={styles.actions}>
            <PrimaryButton
              label="Cancel"
              variant="secondary"
              onPress={onClose}
              disabled={submitting}
              style={styles.actionButton}
            />
            <PrimaryButton
              label={submitting ? 'Saving…' : 'Use Photo'}
              onPress={() => void handleConfirm()}
              disabled={submitting || !imageSize.width}
              style={styles.actionButton}
            />
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  panel: {
    width: '100%',
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  viewport: {
    width: VIEWPORT_SIZE,
    height: VIEWPORT_SIZE,
    alignSelf: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  image: {
    position: 'absolute',
  },
  circleGuide: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderRadius: VIEWPORT_SIZE / 2,
    margin: Spacing.one,
  },
  zoomRow: {
    gap: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
  },
});
