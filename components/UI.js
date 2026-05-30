import React from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>

      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.textArea]}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

export function Button({ title, onPress, variant = "primary", icon }) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.button,
        variant === "outline" && styles.buttonOutline,
        variant === "danger" && styles.buttonDanger,
        variant === "soft" && styles.buttonSoft,
      ]}
    >
      {icon && (
        <Feather
          name={icon}
          size={18}
          color={
            variant === "outline" || variant === "soft"
              ? "#166534"
              : "#FFFFFF"
          }
        />
      )}

      <Text
        style={[
          styles.buttonText,
          (variant === "outline" || variant === "soft") &&
            styles.buttonOutlineText,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export function ErrorBox({ message }) {
  if (!message) {
    return null;
  }

  return (
    <View style={styles.errorBox}>
      <Feather name="alert-circle" size={18} color="#B91C1C" />

      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function Header({ title, subtitle, back, onLogout, onNotifications, notificationCount = 0 }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {back && (
          <TouchableOpacity onPress={back} style={styles.backButton}>
            <Feather name="arrow-left" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <View style={styles.headerTextBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

          {subtitle ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.headerActions}>
        {onNotifications ? (
          <TouchableOpacity onPress={onNotifications} style={styles.headerIcon}>
            <Feather name="bell" size={21} color="#FFFFFF" />

            {notificationCount > 0 ? (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notificationCount > 9 ? "9+" : notificationCount}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        ) : null}

        {onLogout ? (
          <TouchableOpacity onPress={onLogout} style={styles.headerIcon}>
            <Feather name="log-out" size={21} color="#FFFFFF" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export function StatCard({ label, value, icon }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Feather name={icon} size={18} color="#166534" />
      </View>

      <Text style={styles.statValue}>{value}</Text>

      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },

  fieldLabel: {
    fontSize: 13,
    color: "#14532D",
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0F172A",
  },

  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },

  button: {
    backgroundColor: "#15803D",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  buttonOutline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#15803D",
  },

  buttonSoft: {
    backgroundColor: "#DCFCE7",
  },

  buttonDanger: {
    backgroundColor: "#DC2626",
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  buttonOutlineText: {
    color: "#166534",
  },

  errorBox: {
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },

  errorText: {
    color: "#B91C1C",
    fontWeight: "800",
    flex: 1,
    fontSize: 13,
  },

  header: {
    backgroundColor: "#064E3B",
    paddingTop: 46,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  backButton: {
    marginRight: 14,
  },

  headerTextBox: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
  },

  headerSubtitle: {
    color: "#BBF7D0",
    marginTop: 4,
    fontSize: 13,
  },

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 10,
  },

  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },

  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statValue: {
    color: "#064E3B",
    fontSize: 22,
    fontWeight: "900",
  },

  statLabel: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 2,
  },
});