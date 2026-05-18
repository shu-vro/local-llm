import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import { Attachment, AttachmentKind } from "@/db/repositories/attachmentsRepo";
import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing, Typography } from "@/theme";
import { formatBytes } from "@/utils/time";

import {
  AudioIcon,
  CloseIcon,
  DocIcon,
  ImageIcon,
  VideoIcon,
} from "@/components/common/Icons";

const PREVIEW_SIZE = 64;

export interface AttachmentPreviewProps {
  attachment: AttachmentBrief;
  onRemove?: () => void;
  showUnsupported?: boolean;
}

export interface AttachmentBrief {
  id: string;
  kind: AttachmentKind;
  mimeType: string | null;
  filename: string | null;
  localUri: string;
  sizeBytes: number | null;
  unsupportedReason?: string;
}

export function attachmentToBrief(a: Attachment): AttachmentBrief {
  return {
    id: a.id,
    kind: a.kind,
    mimeType: a.mimeType,
    filename: a.filename,
    localUri: a.localUri,
    sizeBytes: a.sizeBytes,
    unsupportedReason:
      typeof a.metadata?.unsupportedReason === "string"
        ? (a.metadata.unsupportedReason as string)
        : undefined,
  };
}

function KindIcon({ kind, color }: { kind: AttachmentKind; color: string }) {
  switch (kind) {
    case "image":
      return <ImageIcon size={22} color={color} />;
    case "audio":
      return <AudioIcon size={22} color={color} />;
    case "video":
      return <VideoIcon size={22} color={color} />;
    case "pdf":
    case "document":
      return <DocIcon size={22} color={color} />;
    case "other":
    default:
      return <DocIcon size={22} color={color} />;
  }
}

export function AttachmentPreview({
  attachment,
  onRemove,
  showUnsupported = true,
}: AttachmentPreviewProps) {
  const { colors } = useTheme();
  const isImage = attachment.kind === "image";
  const unsupported = !!attachment.unsupportedReason;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceMuted,
          borderColor: colors.border,
        },
      ]}>
      {isImage ? (
        <Image
          source={{ uri: attachment.localUri }}
          style={styles.thumb}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.thumb,
            styles.thumbFallback,
            { backgroundColor: colors.surface },
          ]}>
          <KindIcon kind={attachment.kind} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
          {attachment.filename ?? attachment.id}
        </Text>
        <Text
          style={[styles.meta, { color: colors.textMuted }]}
          numberOfLines={1}>
          {attachment.kind.toUpperCase()}
          {attachment.sizeBytes != null
            ? ` · ${formatBytes(attachment.sizeBytes)}`
            : ""}
        </Text>
        {unsupported && showUnsupported ? (
          <Text
            style={[styles.warn, { color: colors.warning }]}
            numberOfLines={2}>
            {attachment.unsupportedReason}
          </Text>
        ) : null}
      </View>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove attachment"
          hitSlop={10}
          onPress={onRemove}
          style={[
            styles.removeBtn,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
            },
          ]}>
          <CloseIcon size={16} color={colors.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    marginVertical: Spacing.xs / 2,
    gap: Spacing.sm,
  },
  thumb: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: Typography.size.md, fontWeight: Typography.weight.medium },
  meta: { fontSize: Typography.size.xs, marginTop: 2 },
  warn: { fontSize: Typography.size.xs, marginTop: 4 },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
