import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Button } from "./Button";

interface State {
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    if (__DEV__) {
      console.error("[ErrorBoundary]", error, info);
    }
  }

  reset = () => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {this.props.fallbackTitle ?? "Something went wrong"}
        </Text>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollInner}>
          <Text style={styles.body}>{this.state.error.message}</Text>
          {this.state.error.stack ? (
            <Text style={styles.stack}>{this.state.error.stack}</Text>
          ) : null}
        </ScrollView>
        <Button title="Try again" onPress={this.reset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: "center",
    backgroundColor: "#0B0B0E",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#ECECEC",
    textAlign: "center",
  },
  scroll: { maxHeight: 280 },
  scrollInner: { paddingVertical: 8 },
  body: { fontSize: 14, color: "#FF5C7A", marginBottom: 12 },
  stack: { fontSize: 11, color: "#9A9AA8", fontFamily: "monospace" },
});
