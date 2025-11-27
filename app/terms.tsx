// app/terms.tsx
import { ScrollView, StyleSheet, Pressable } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

export default function TermsScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors} // same gradient as RentConfirmation
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Text style={[styles.title, { color: theme.colors.primary }]}>
        Terms & Conditions
      </Text>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          1. Acceptance of Terms
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.primary }]}>
          By using VoltVault, you agree to abide by these Terms & Conditions and
          our Privacy Policy. If you do not agree, please do not use the app.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          2. Rental Policy
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.primary }]}>
          You agree to rent and return Volts (powerbanks) responsibly. Any
          damaged or lost Volts may incur fees according to the rental policy.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          3. Wallet & Payments
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.primary }]}>
          All wallet top-ups and transactions are final once confirmed. Ensure
          that your account balance and payment information are correct before
          completing any transaction.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          4. User Conduct
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.primary }]}>
          You must not misuse the service, damage kiosks, or engage in fraudulent
          activities. Violations may lead to suspension of your VoltVault account.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          5. Changes to Terms
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.primary }]}>
          VoltVault reserves the right to modify these Terms & Conditions at any
          time. Continued use of the service implies acceptance of the updated
          terms.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          6. Contact Us
        </Text>
        <Text style={[styles.paragraph, { color: theme.colors.primary }]}>
          For questions, contact our support team at support@voltvault.com
        </Text>
      </ScrollView>

      <Pressable
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.back()}
      >
        <Text style={[styles.buttonText, { color: theme.colors.onPrimary }]}>
          I Understand
        </Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 12, marginTop: 50, textAlign: "center" },
  scroll: { flex: 1, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginTop: 16 },
  paragraph: { fontSize: 14, marginTop: 6, lineHeight: 20 },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { fontWeight: "bold", fontSize: 16 },
});
