import React from "react";
import { StyleSheet, Dimensions } from "react-native";
import { Button, Text, Card, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function ReturnSuccess() {
  const router = useRouter();
  const theme = useTheme();
  const screenWidth = Dimensions.get("window").width;

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Card
        style={[styles.card, { width: screenWidth * 0.9, backgroundColor: theme.colors.onPrimary }]}
        mode="elevated"
      >
        <Card.Content style={styles.cardContent}>
          <Ionicons name="checkmark-circle" size={80} color={theme.colors.primary} />

          <Text
            variant="headlineMedium"
            style={[styles.text, { color: theme.colors.primary }]}
          >
            Return Successful!
          </Text>

          <Text style={[styles.subText, { color: theme.colors.primary }]}>
            Thank you for returning the power bank.{"\n"}
            We hope to see you again soon!
          </Text>

          <Button
            mode="contained"
            onPress={() => router.push("/volts")}
            style={styles.button}
            labelStyle={styles.buttonLabel}
            buttonColor={theme.colors.primary}
          >
            Back to Home
          </Button>
        </Card.Content>
      </Card>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 20,
    elevation: 6,
  },
  cardContent: {
    alignItems: "center",
    gap: 20,
  },
  text: {
    fontWeight: "700",
    marginTop: 10,
    textAlign: "center",
  },
  subText: {
    textAlign: "center",
    fontSize: 15,
    marginHorizontal: 10,
    lineHeight: 22,
  },
  button: {
    marginTop: 15,
    borderRadius: 14,
    width: "85%",
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
