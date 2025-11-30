import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme, Button, Divider, Surface } from "react-native-paper";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsScreen() {
  const router = useRouter();
  const theme = useTheme();

  const TermSection = ({ icon, title, children }: { icon: any, title: string, children: React.ReactNode }) => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>{title}</Text>
      </View>
      <Text style={[styles.paragraph, { color: theme.colors.onSurfaceVariant }]}>
        {children}
      </Text>
    </View>
  );

  return (
    <LinearGradient
      colors={(theme.colors as any).gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={{ flex: 1 }}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
            Terms & Conditions
          </Text>
        </View>

        {/* Content Card */}
        <Surface style={[styles.contentSurface, { backgroundColor: theme.colors.onPrimary }]} elevation={2}>
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={[styles.intro, { color: theme.colors.onSurface }]}>
              Welcome to VoltVault. By using our powerbank rental service, you agree to the following terms.
            </Text>

            <Divider style={{ marginVertical: 15 }} />

            <TermSection icon="timer-outline" title="1. Rental Duration & Return">
              The maximum rental duration for any single session is <Text style={{fontWeight: 'bold'}}>3 hours</Text>. 
              You must return the powerbank to any active station before this time expires.
              {"\n"}{"\n"}
              We provide a <Text style={{fontWeight: 'bold'}}>5-minute grace period</Text> after your rental time ends to allow for return processing.
            </TermSection>

            <TermSection icon="alert-circle-outline" title="2. Fees & Penalties">
              <Text style={{fontWeight: 'bold'}}>Late Returns:</Text> If you fail to return the device within the grace period, a penalty fee of <Text style={{fontWeight: 'bold', color: theme.colors.error}}>₱5.00 per minute</Text> will be automatically deducted from your wallet until the device is returned.
              {"\n"}{"\n"}
              <Text style={{fontWeight: 'bold'}}>Lost/Damaged:</Text> Unreturned devices after 24 hours or devices returned with significant damage will incur a full replacement fee of ₱1,500.00.
            </TermSection>

            <TermSection icon="wallet-outline" title="3. Wallet & Payments">
              A minimum wallet balance of <Text style={{fontWeight: 'bold'}}>₱100.00</Text> is required to initiate any rental.
              {"\n"}{"\n"}
              Wallet top-ups are final and <Text style={{fontWeight: 'bold'}}>non-refundable</Text>. Please ensure you verify amounts before topping up.
            </TermSection>

            <TermSection icon="location-outline" title="4. Usage & Vicinity">
              Powerbanks are equipped with anti-theft technology. They must remain within the <Text style={{fontWeight: 'bold'}}>designated campus/building vicinity</Text>.
              {"\n"}{"\n"}
              Taking the device outside the allowed area may trigger the built-in security alarm and lock the device.
            </TermSection>

            <TermSection icon="shield-checkmark-outline" title="5. User Responsibility">
              You are responsible for the device while it is in your possession. Do not attempt to dismantle, modify, or repair the powerbank.
            </TermSection>

            <View style={{ height: 20 }} />
          </ScrollView>
        </Surface>

        {/* Footer Action */}
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={() => router.back()}
            style={styles.button}
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            labelStyle={{ fontSize: 16, fontWeight: "bold" }}
          >
            I Understand
          </Button>
        </View>

      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  contentSurface: {
    flex: 1,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden', // Ensures scrollview respects corners
  },
  scrollContent: {
    padding: 24,
  },
  intro: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    paddingLeft: 28, // Indent text to align with title text (skipping icon)
  },
  footer: {
    padding: 20,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 6,
    elevation: 4,
  },
});