import Feather from "@expo/vector-icons/Feather";
import React from "react";
import { StyleProp, TextStyle, View, ViewStyle } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export interface IconProps {
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

type FeatherName = React.ComponentProps<typeof Feather>["name"];

function useIconColor(override?: string): string {
  const { colors } = useTheme();
  return override ?? colors.text;
}

function Icon({
  name,
  size = 22,
  color,
  style,
}: IconProps & { name: FeatherName }) {
  const resolved = useIconColor(color);
  return <Feather name={name} size={size} color={resolved} style={style} />;
}

export function Dot({
  size = 6,
  color,
  style,
}: {
  size?: number;
  color?: string;
  style?: ViewStyle;
}) {
  const c = useIconColor(color);
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c,
        },
        style,
      ]}
    />
  );
}

export const MenuIcon = (p: IconProps) => <Icon name="menu" {...p} />;
export const NewChatIcon = (p: IconProps) => <Icon name="edit-2" {...p} />;
export const SendIcon = (p: IconProps) => <Icon name="arrow-up" {...p} />;
export const StopIcon = (p: IconProps) => <Icon name="square" {...p} />;
export const PlusIcon = (p: IconProps) => <Icon name="plus" {...p} />;
export const CloseIcon = (p: IconProps) => <Icon name="x" {...p} />;
export const BackIcon = (p: IconProps) => <Icon name="chevron-left" {...p} />;
export const ChevronRightIcon = (p: IconProps) => (
  <Icon name="chevron-right" {...p} />
);
export const MoreIcon = (p: IconProps) => (
  <Icon name="more-horizontal" {...p} />
);
export const RegenerateIcon = (p: IconProps) => (
  <Icon name="refresh-cw" {...p} />
);
export const CopyIcon = (p: IconProps) => <Icon name="copy" {...p} />;
export const TrashIcon = (p: IconProps) => <Icon name="trash-2" {...p} />;
export const EditIcon = (p: IconProps) => <Icon name="edit-2" {...p} />;
export const PinIcon = (p: IconProps) => <Icon name="star" {...p} />;
export const PinOutlineIcon = (p: IconProps) => <Icon name="bookmark" {...p} />;
export const SearchIcon = (p: IconProps) => <Icon name="search" {...p} />;
export const SettingsIcon = (p: IconProps) => <Icon name="settings" {...p} />;
export const CheckIcon = (p: IconProps) => <Icon name="check" {...p} />;
export const SparkleIcon = (p: IconProps) => <Icon name="zap" {...p} />;
export const ImageIcon = (p: IconProps) => <Icon name="image" {...p} />;
export const DocIcon = (p: IconProps) => <Icon name="file-text" {...p} />;
export const AudioIcon = (p: IconProps) => <Icon name="mic" {...p} />;
export const VideoIcon = (p: IconProps) => <Icon name="video" {...p} />;
export const PaperclipIcon = (p: IconProps) => <Icon name="paperclip" {...p} />;
