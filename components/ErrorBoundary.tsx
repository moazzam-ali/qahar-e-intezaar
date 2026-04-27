import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";

type State = { error: Error | null; info: { componentStack?: string | null } | null };

/**
 * Top-level error boundary. Without this, an uncaught render-time error in
 * any descendant gives a blank white screen on physical devices in release
 * builds — the original symptom that prompted this rewrite. With it, the user
 * sees a quiet apology and a Retry that resets boundary state.
 *
 * The error and component stack are rendered (collapsed by default) so future
 * crashes are reportable from a real device without a debugger attached.
 */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    this.setState({ info });
    console.error("[ErrorBoundary] caught", error, info?.componentStack);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>Something broke.</Text>
          <Text style={styles.title}>
            The app caught an error before it could render.
          </Text>
          <Text style={styles.body}>
            {this.state.error.message ?? String(this.state.error)}
          </Text>
          {this.state.info?.componentStack ? (
            <Text style={styles.stack} selectable>
              {this.state.info.componentStack.trim()}
            </Text>
          ) : null}
          <Pressable
            onPress={this.reset}
            style={({ pressed }) => [
              styles.retry,
              { opacity: pressed ? 0.7 : 1 },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    flexGrow: 1,
    padding: 32,
    justifyContent: "center",
    gap: 12,
  },
  eyebrow: {
    ...typography.sectionHeader,
    color: colors.textSecondary,
  },
  title: {
    fontFamily: "Fraunces_400Regular",
    fontSize: 26,
    color: colors.textPrimary,
    marginBottom: 6,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  stack: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: "Courier",
    marginTop: 8,
  },
  retry: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    backgroundColor: colors.accent,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  retryText: {
    ...typography.bodyMedium,
    color: colors.surface,
  },
});
