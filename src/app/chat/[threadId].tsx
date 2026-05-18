import { useLocalSearchParams } from "expo-router";
import React from "react";

import { ChatScreen } from "@/components/chat/ChatScreen";

export default function ThreadChatRoute() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const id =
    typeof threadId === "string" && threadId.length > 0 ? threadId : null;
  return <ChatScreen threadId={id} />;
}
