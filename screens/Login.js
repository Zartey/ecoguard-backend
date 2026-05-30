import React from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import { Button, ErrorBox, Field } from "../components/UI";

export default function Login({
  loginType,
  setLoginType,
  loginForm,
  setLoginForm,
  loginError,
  setLoginError,
  login,
  biometricLogin,
  goCadastro,
  goRecuperar,
}) {
  async function handleBiometricAuth() {
    try {
      const hardwareSuportado = await LocalAuthentication.hasHardwareAsync();

      if (!hardwareSuportado) {
        Alert.alert(
          "Aviso",
          "Este dispositivo não possui suporte para biometria."
        );
        return;
      }

      const biometriaCadastrada = await LocalAuthentication.isEnrolledAsync();

      if (!biometriaCadastrada) {
        Alert.alert(
          "Biometria não encontrada",
          "Cadastre uma digital, Face ID ou senha facial nas configurações do celular."
        );
        return;
      }

      await biometricLogin();
    } catch (error) {
      Alert.alert("Erro", "Ocorreu um erro ao iniciar o login biométrico.");
    }
  }

  return (
    <SafeAreaView style={styles.darkScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#052E16" />

      <ScrollView contentContainerStyle={styles.authContainer}>
        <View style={styles.brandIcon}>
          <Image
            source={require("../assets/LogoMarca-.png")}
            style={styles.logo}
          />
        </View>

        <Text style={styles.brandTitle}>EcoGuard</Text>

        <Text style={styles.brandSubtitle}>
          Denuncie, acompanhe e proteja o meio ambiente com rapidez, segurança e
          zero burocracia
        </Text>

        <View style={styles.authSwitch}>
          <TouchableOpacity
            style={[
              styles.authSwitchItem,
              loginType === "usuario" && styles.authSwitchActive,
            ]}
            onPress={() => {
              setLoginType("usuario");
              setLoginError("");
              setLoginForm({
                usuario: "",
                senha: "",
              });
            }}
          >
            <Text
              style={[
                styles.authSwitchText,
                loginType === "usuario" && styles.authSwitchTextActive,
              ]}
            >
              Usuário
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.authSwitchItem,
              loginType === "admin" && styles.authSwitchActive,
            ]}
            onPress={() => {
              setLoginType("admin");
              setLoginError("");
              setLoginForm({
                usuario: "",
                senha: "",
              });
            }}
          >
            <Text
              style={[
                styles.authSwitchText,
                loginType === "admin" && styles.authSwitchTextActive,
              ]}
            >
              Administrador
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.authCard}>
          <Text style={styles.authTitle}>
            {loginType === "admin" ? "Acesso administrativo" : "Acesse sua conta"}
          </Text>

          <Field
            label="Usuário"
            value={loginForm.usuario}
            onChangeText={(value) => {
              setLoginForm({
                ...loginForm,
                usuario: value,
              });

              setLoginError("");
            }}
            placeholder={loginType === "admin" ? "admin" : "Digite seu usuário"}
          />

          <Field
            label="Senha"
            value={loginForm.senha}
            onChangeText={(value) => {
              setLoginForm({
                ...loginForm,
                senha: value,
              });

              setLoginError("");
            }}
            placeholder="Digite sua senha"
            secureTextEntry
          />

          <ErrorBox message={loginError} />

          <Button title="Entrar" onPress={login} icon="log-in" />

          <TouchableOpacity
            style={styles.biometricButton}
            onPress={handleBiometricAuth}
          >
            <Ionicons name="finger-print" size={28} color="#166534" />

            <Text style={styles.biometricText}>
              {loginType === "admin"
                ? "Entrar como Administrador com Biometria"
                : "Entrar com Biometria"}
            </Text>
          </TouchableOpacity>

          {loginType === "usuario" && (
            <>
              <Button
                title="Criar cadastro"
                variant="outline"
                onPress={goCadastro}
                icon="user-plus"
              />

              <Button
                title="Recuperar senha"
                variant="soft"
                onPress={goRecuperar}
                icon="refresh-cw"
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  darkScreen: {
    flex: 1,
    backgroundColor: "#052E16",
  },

  authContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },

  brandIcon: {
    width: 94,
    height: 94,
    borderRadius: 30,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 18,
  },

  logo: {
    width: 100,
    height: 100,
    alignSelf: "center",
  },

  brandTitle: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },

  brandSubtitle: {
    fontSize: 15,
    color: "#BBF7D0",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 26,
    lineHeight: 22,
  },

  authSwitch: {
    flexDirection: "row",
    backgroundColor: "#064E3B",
    borderRadius: 18,
    padding: 5,
    marginBottom: 18,
  },

  authSwitchItem: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },

  authSwitchActive: {
    backgroundColor: "#22C55E",
  },

  authSwitchText: {
    color: "#D1FAE5",
    fontWeight: "800",
  },

  authSwitchTextActive: {
    color: "#052E16",
  },

  authCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
  },

  authTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: "#052E16",
    marginBottom: 16,
  },

  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
    marginBottom: 15,
    padding: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  biometricText: {
    marginLeft: 10,
    color: "#166534",
    fontWeight: "bold",
    fontSize: 15,
    textAlign: "center",
    flexShrink: 1,
  },
});