import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { PaperclipIcon, SendIcon, StopIcon } from "@/components/common/Icons";
import { TextInput } from "@/components/common/TextInput";
import { AttachmentBrief, AttachmentPreview } from "./AttachmentPreview";

import {
  PreparedAttachment,
  discardPreparedAttachment,
  prepareAttachment,
} from "@/ai/attachmentPipeline";
import { useActiveModel } from "@/hooks/useActiveModel";
import { useTheme } from "@/hooks/useTheme";
import { Radius, Spacing } from "@/theme";

const MIN_COMPOSER_HEIGHT = 44;
const MAX_MULTILINE_HEIGHT = 200;

export interface ComposerProps {
  threadId: string;
  disabled: boolean;
  disabledReason?: string;
  isGenerating: boolean;
  onSend: (
    content: string,
    attachments: PreparedAttachment[],
  ) => Promise<void> | void;
  onStop: () => Promise<void> | void;
}

interface ComposerAttachment extends PreparedAttachment {
  brief: AttachmentBrief;
}

function toBrief(p: PreparedAttachment): AttachmentBrief {
  return {
    id: p.id,
    kind: p.kind,
    mimeType: p.mimeType,
    filename: p.filename,
    localUri: p.localUri,
    sizeBytes: p.sizeBytes,
    unsupportedReason: p.unsupportedReason,
  };
}

export function Composer({
  threadId,
  disabled,
  disabledReason,
  isGenerating,
  onSend,
  onStop,
}: ComposerProps) {
  const { colors } = useTheme();
  const { supportsVision } = useActiveModel();
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSend =
    !disabled &&
    !isGenerating &&
    (content.trim().length > 0 || attachments.length > 0);

  const pickImage = useCallback(async () => {
    if (!supportsVision) {
      Alert.alert(
        "Vision not supported",
        "The active model does not support images. Switch to a vision model (e.g. Gemma 4 E2B or Qwen3.5 VL) in Models.",
      );
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow access to your photo library to attach images.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.9,
        exif: false,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const prepared = prepareAttachment({
        threadId,
        source: {
          uri: asset.uri,
          filename: asset.fileName ?? null,
          mimeType: asset.mimeType ?? "image/jpeg",
          size: asset.fileSize ?? null,
        },
      });
      setAttachments((prev) => [
        ...prev,
        { ...prepared, brief: toBrief(prepared) },
      ]);
    } catch (err) {
      Alert.alert(
        "Could not attach image",
        err instanceof Error ? err.message : String(err),
      );
    }
  }, [supportsVision, threadId]);

  const takePhoto = useCallback(async () => {
    if (!supportsVision) {
      Alert.alert(
        "Vision not supported",
        "The active model does not support images. Switch to a vision model in Models.",
      );
      return;
    }
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission needed",
          "Allow camera access to take a photo.",
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.9,
        exif: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const prepared = prepareAttachment({
        threadId,
        source: {
          uri: asset.uri,
          filename: asset.fileName ?? `photo-${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? "image/jpeg",
          size: asset.fileSize ?? null,
        },
      });
      setAttachments((prev) => [
        ...prev,
        { ...prepared, brief: toBrief(prepared) },
      ]);
    } catch (err) {
      Alert.alert(
        "Could not take photo",
        err instanceof Error ? err.message : String(err),
      );
    }
  }, [supportsVision, threadId]);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
        multiple: false,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const prepared = prepareAttachment({
        threadId,
        source: {
          uri: asset.uri,
          filename: asset.name ?? null,
          mimeType: asset.mimeType ?? null,
          size: asset.size ?? null,
        },
      });
      setAttachments((prev) => [
        ...prev,
        { ...prepared, brief: toBrief(prepared) },
      ]);
    } catch (err) {
      Alert.alert(
        "Could not attach file",
        err instanceof Error ? err.message : String(err),
      );
    }
  }, [threadId]);

  const openAttachMenu = useCallback(() => {
    const options = ["Photo library", "Take photo", "Files", "Cancel"];
    const cancelButtonIndex = 3;
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (idx) => {
          if (idx === 0) void pickImage();
          else if (idx === 1) void takePhoto();
          else if (idx === 2) void pickDocument();
        },
      );
    } else {
      Alert.alert("Attach", undefined, [
        { text: "Photo library", onPress: () => void pickImage() },
        { text: "Take photo", onPress: () => void takePhoto() },
        { text: "Files", onPress: () => void pickDocument() },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  }, [pickDocument, pickImage, takePhoto]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target) discardPreparedAttachment(target);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const submit = useCallback(async () => {
    if (!canSend) return;
    const trimmed = content.trim();
    const atts = attachments.map(({ brief: _b, ...rest }) => rest);
    setSubmitting(true);
    try {
      await onSend(trimmed, atts);
      setContent("");
      setAttachments([]);
    } catch (err) {
      Alert.alert(
        "Could not send message",
        err instanceof Error ? err.message : String(err),
      );
    } finally {
      setSubmitting(false);
    }
  }, [attachments, canSend, content, onSend]);

  const showStop = isGenerating;

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: colors.composerBg, borderColor: colors.border },
      ]}>
      {attachments.length > 0 ? (
        <ScrollView
          horizontal={false}
          contentContainerStyle={styles.attachList}
          showsVerticalScrollIndicator={false}>
          {attachments.map((a) => (
            <AttachmentPreview
              key={a.id}
              attachment={a.brief}
              onRemove={() => removeAttachment(a.id)}
            />
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attach"
          hitSlop={8}
          onPress={openAttachMenu}
          disabled={disabled || isGenerating}
          style={[
            styles.iconBtn,
            {
              backgroundColor: colors.surfaceMuted,
              opacity: disabled || isGenerating ? 0.5 : 1,
            },
          ]}>
          <PaperclipIcon size={20} color={colors.text} />
        </Pressable>
        <TextInput
          variant="flat"
          containerStyle={styles.inputContainer}
          multiline
          blurOnSubmit={false}
          editable={!disabled}
          placeholder={disabledReason ?? "Message…"}
          value={content}
          onChangeText={setContent}
          scrollEnabled
          style={styles.composerInput}
        />
        {showStop ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop generating"
            onPress={() => void onStop()}
            style={[styles.sendBtn, { backgroundColor: colors.danger }]}>
            <StopIcon size={16} color="#FFFFFF" />
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            disabled={!canSend || submitting}
            onPress={() => void submit()}
            style={[
              styles.sendBtn,
              {
                backgroundColor: canSend ? colors.primary : colors.surfaceMuted,
                opacity: canSend ? 1 : 0.65,
              },
            ]}>
            <SendIcon
              size={20}
              color={canSend ? colors.primaryText : colors.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: Spacing.sm,
  },
  attachList: { gap: Spacing.xs },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  inputContainer: {
    flex: 1,
    minHeight: MIN_COMPOSER_HEIGHT,
    maxHeight: MAX_MULTILINE_HEIGHT,
    alignSelf: "stretch",
  },
  composerInput: {
    minHeight: MIN_COMPOSER_HEIGHT - 16,
    maxHeight: MAX_MULTILINE_HEIGHT - 16,
  },
});
