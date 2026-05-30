import React, { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";
import * as LocalAuthentication from "expo-local-authentication";

import Login from "./screens/Login";
import Cadastro from "./screens/Cadastro";
import RecuperarSenha from "./screens/RecuperarSenha";
import TelaInicial from "./screens/TelaInicial";
import Denuncia from "./screens/Denuncia";
import { apiRequest, API_URL } from "./config/api";

const SESSION_KEY = "ecoguard_session";
const BIOMETRIC_TOKEN_KEY = "ecoguard_biometric_token";
const BIOMETRIC_ENABLED_KEY = "ecoguard_biometric_enabled";
const BIOMETRIC_FALLBACK_KEY = "ecoguard_biometric_token_fallback";

const EMPTY_LOGIN_FORM = { usuario: "", senha: "" };

const EMPTY_REGISTER_FORM = {
  nome: "",
  cpf: "",
  usuario: "",
  email: "",
  cep: "",
  telefone: "",
  endereco: "",
  cidade: "",
  bio: "",
  senha: "",
  confirmarSenha: "",
  pergunta1: "",
  resposta1: "",
  pergunta2: "",
  resposta2: "",
};

const EMPTY_RECOVER_FORM = {
  usuario: "",
  cpf: "",
  resposta1: "",
  resposta2: "",
  novaSenha: "",
  confirmarSenha: "",
};

function safeJsonParse(value, fallback) {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

export default function App() {
  const [screen, setScreen] = useState("login");
  const [loginType, setLoginType] = useState("usuario");
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const [loginForm, setLoginForm] = useState(EMPTY_LOGIN_FORM);
  const [loginError, setLoginError] = useState("");
  const [registerForm, setRegisterForm] = useState(EMPTY_REGISTER_FORM);
  const [recoverStep, setRecoverStep] = useState(1);
  const [recoverUser, setRecoverUser] = useState(null);
  const [recoverError, setRecoverError] = useState("");
  const [recoverForm, setRecoverForm] = useState(EMPTY_RECOVER_FORM);

  useEffect(() => {
    startApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshFromApi() {
    const data = await apiRequest("/bootstrap");

    setUsers(Array.isArray(data.users) ? data.users : []);
    setReports(Array.isArray(data.reports) ? data.reports : []);
    setAuditLogs(Array.isArray(data.auditLogs) ? data.auditLogs : []);
    setNotifications(Array.isArray(data.notifications) ? data.notifications : []);

    return data;
  }

  async function startApp() {
    try {
      const data = await refreshFromApi();
      const savedSession = await AsyncStorage.getItem(SESSION_KEY);
      const session = safeJsonParse(savedSession, null);

      if (session?.id && session?.tipo) {
        const user = (data.users || []).find(
          (item) => item.id === session.id && item.tipo === session.tipo
        );

        if (user) {
          setCurrentUser(user);
          setScreen("home");
        } else {
          await clearSession();
        }
      }
    } catch (error) {
      console.log("Erro ao iniciar app:", error);

      setLoginError(
        `Não foi possível conectar ao banco/API. Verifique se o backend está rodando em ${API_URL}`
      );
    }
  }

  async function saveReports(newReports) {
    setReports(newReports);

    try {
      const data = await apiRequest("/reports/sync", {
        method: "POST",
        body: JSON.stringify({ reports: newReports }),
      });

      setReports(Array.isArray(data.reports) ? data.reports : newReports);
    } catch (error) {
      console.log("Erro ao salvar denúncias no banco:", error);
      Alert.alert(
        "Erro no banco",
        "A alteração apareceu na tela, mas não foi salva no banco. Verifique se a API está ligada."
      );
    }
  }

  async function saveSession(user) {
    await AsyncStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ id: user.id, tipo: user.tipo })
    );
  }

  async function clearSession() {
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  async function updateCurrentUser(updatedUser) {
    try {
      const data = await apiRequest(`/users/${updatedUser.id}`, {
        method: "PUT",
        body: JSON.stringify(updatedUser),
      });

      const userFromDb = data.user || updatedUser;

      setCurrentUser(userFromDb);
      setUsers((oldUsers) =>
        oldUsers.map((user) => (user.id === userFromDb.id ? userFromDb : user))
      );

      await refreshFromApi();
    } catch (error) {
      console.log("Erro ao atualizar perfil:", error);
      Alert.alert("Erro", error.message || "Não foi possível atualizar o perfil.");
    }
  }

  function createBiometricToken(user) {
    return JSON.stringify({
      tokenId: Crypto.randomUUID(),
      userId: user.id,
      tipo: user.tipo,
      createdAt: new Date().toISOString(),
    });
  }

  async function removeBiometricToken() {
    try {
      const secureStoreAvailable = await SecureStore.isAvailableAsync();

      if (secureStoreAvailable) {
        await SecureStore.deleteItemAsync(BIOMETRIC_TOKEN_KEY);
      }

      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await AsyncStorage.removeItem(BIOMETRIC_FALLBACK_KEY);
    } catch (error) {
      console.log("Erro ao remover token biométrico:", error);
    }
  }

  async function saveBiometricToken(user) {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();

      if (!hasHardware) {
        Alert.alert(
          "Biometria indisponível",
          "Este dispositivo não possui suporte para biometria."
        );
        return false;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!isEnrolled) {
        Alert.alert(
          "Biometria não cadastrada",
          "Cadastre uma digital, Face ID ou reconhecimento facial nas configurações do celular."
        );
        return false;
      }

      const authentication = await LocalAuthentication.authenticateAsync({
        promptMessage:
          user.tipo === "admin"
            ? "Confirme sua biometria para ativar o login do administrador"
            : "Confirme sua biometria para ativar o login seguro",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });

      if (!authentication.success) {
        Alert.alert(
          "Biometria cancelada",
          "O login biométrico não foi ativado porque a autenticação foi cancelada."
        );
        return false;
      }

      const token = createBiometricToken(user);
      const secureStoreAvailable = await SecureStore.isAvailableAsync();

      if (secureStoreAvailable) {
        await SecureStore.setItemAsync(BIOMETRIC_TOKEN_KEY, token);
      } else {
        await AsyncStorage.setItem(BIOMETRIC_FALLBACK_KEY, token);
      }

      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      await addAuditLog("biometria_ativada", { tipo: user.tipo }, user);

      return true;
    } catch (error) {
      console.log("Erro ao salvar token biométrico:", error);
      await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      Alert.alert(
        "Erro ao ativar biometria",
        "Não foi possível salvar o token biométrico."
      );
      return false;
    }
  }

  async function login() {
    const usuario = String(loginForm.usuario || "").trim();
    const senha = String(loginForm.senha || "").trim();

    setLoginError("");

    if (!usuario || !senha) {
      setLoginError("Preencha usuário e senha.");
      return;
    }

    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          usuario,
          senha,
          tipo: loginType,
        }),
      });

      const loggedUser = data.user;

      setCurrentUser(loggedUser);
      await saveSession(loggedUser);
      await refreshFromApi();

      setLoginForm(EMPTY_LOGIN_FORM);
      setLoginError("");
      setScreen("home");

      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);

      if (biometricEnabled === "true") return;

      Alert.alert(
        "Ativar biometria?",
        loggedUser.tipo === "admin"
          ? "Deseja entrar como administrador usando biometria nas próximas vezes?"
          : "Deseja entrar com biometria nas próximas vezes?",
        [
          { text: "Agora não", style: "cancel" },
          {
            text: "Ativar",
            onPress: async () => {
              const tokenSaved = await saveBiometricToken(loggedUser);

              if (tokenSaved) {
                Alert.alert(
                  "Biometria ativada",
                  "Agora você pode sair da conta e entrar com biometria."
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      setLoginError(error.message || "Não foi possível realizar login.");
    }
  }

  async function biometricLogin() {
    setLoginError("");

    try {
      const biometricEnabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);

      if (biometricEnabled !== "true") {
        Alert.alert(
          "Biometria não configurada",
          "Entre com usuário e senha primeiro e aceite ativar a biometria."
        );
        return;
      }

      const authentication = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirme sua biometria para entrar no EcoGuard",
        cancelLabel: "Cancelar",
        disableDeviceFallback: false,
      });

      if (!authentication.success) {
        Alert.alert("Acesso cancelado", "A biometria não foi confirmada.");
        return;
      }

      const secureStoreAvailable = await SecureStore.isAvailableAsync();

      const tokenString = secureStoreAvailable
        ? await SecureStore.getItemAsync(BIOMETRIC_TOKEN_KEY)
        : await AsyncStorage.getItem(BIOMETRIC_FALLBACK_KEY);

      const tokenData = safeJsonParse(tokenString, null);
      const tipoValido = tokenData?.tipo === "usuario" || tokenData?.tipo === "admin";

      if (!tokenData?.userId || !tokenData?.tokenId || !tipoValido) {
        await removeBiometricToken();
        Alert.alert(
          "Token inválido",
          "Faça login novamente com usuário e senha para gerar um novo token."
        );
        return;
      }

      const data = await refreshFromApi();

      const biometricUser = (data.users || []).find(
        (user) => user.id === tokenData.userId && user.tipo === tokenData.tipo
      );

      if (!biometricUser) {
        await removeBiometricToken();
        Alert.alert("Conta não encontrada", "Faça login novamente com usuário e senha.");
        return;
      }

      setCurrentUser(biometricUser);
      await saveSession(biometricUser);
      await addAuditLog("login_biometrico", { tipo: biometricUser.tipo }, biometricUser);

      setLoginForm(EMPTY_LOGIN_FORM);
      setLoginType(tokenData.tipo);
      setScreen("home");
    } catch (error) {
      console.log("Erro ao liberar token biométrico:", error);
      Alert.alert(
        "Erro na biometria",
        "Não foi possível entrar com biometria. Tente novamente."
      );
    }
  }

  async function registerUser() {
    try {
      const data = await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify(registerForm),
      });

      setUsers((oldUsers) => [data.user, ...oldUsers]);
      await refreshFromApi();

      setRegisterForm(EMPTY_REGISTER_FORM);

      Alert.alert("Sucesso", "Cadastro realizado e salvo no banco. Agora faça login.");

      setScreen("login");
      setLoginType("usuario");
      setLoginForm(EMPTY_LOGIN_FORM);
      setLoginError("");

      return true;
    } catch (error) {
      Alert.alert("Erro no cadastro", error.message || "Não foi possível salvar o cadastro.");
      return error.message || "Não foi possível salvar o cadastro.";
    }
  }

  async function verificarUsuarioRecuperacao() {
    setRecoverError("");

    try {
      const data = await apiRequest("/auth/recover/find", {
        method: "POST",
        body: JSON.stringify({
          usuario: recoverForm.usuario,
          cpf: recoverForm.cpf,
        }),
      });

      setRecoverUser(data.user);
      setRecoverStep(2);
      setRecoverError("");
      return true;
    } catch (error) {
      setRecoverError(error.message || "Usuário ou CPF não encontrado.");
      return false;
    }
  }

  async function confirmarPerguntasSeguranca() {
    setRecoverError("");

    if (!recoverUser) {
      setRecoverError("Conta não localizada. Volte e informe usuário e CPF novamente.");
      setRecoverStep(1);
      return false;
    }

    try {
      await apiRequest("/auth/recover/verify", {
        method: "POST",
        body: JSON.stringify({
          userId: recoverUser.id,
          resposta1: recoverForm.resposta1,
          resposta2: recoverForm.resposta2,
        }),
      });

      setRecoverStep(3);
      setRecoverError("");
      return true;
    } catch (error) {
      setRecoverError(error.message || "Uma ou mais respostas de segurança estão incorretas.");
      return false;
    }
  }

  async function redefinirSenha() {
    setRecoverError("");

    if (!recoverUser) {
      setRecoverError("Conta não localizada. Volte e informe usuário e CPF novamente.");
      setRecoverStep(1);
      return false;
    }

    try {
      await apiRequest("/auth/recover/reset", {
        method: "POST",
        body: JSON.stringify({
          userId: recoverUser.id,
          novaSenha: recoverForm.novaSenha,
          confirmarSenha: recoverForm.confirmarSenha,
        }),
      });

      resetRecover();

      Alert.alert(
        "Sucesso",
        "Senha redefinida no banco. Faça login com a nova senha."
      );

      setScreen("login");
      setLoginType("usuario");
      setLoginForm(EMPTY_LOGIN_FORM);
      setLoginError("");
      await refreshFromApi();

      return true;
    } catch (error) {
      setRecoverError(error.message || "Não foi possível salvar a nova senha.");
      return false;
    }
  }

  function resetRecover() {
    setRecoverStep(1);
    setRecoverUser(null);
    setRecoverError("");
    setRecoverForm(EMPTY_RECOVER_FORM);
  }

  async function addNotification(notification) {
    try {
      const data = await apiRequest("/notifications", {
        method: "POST",
        body: JSON.stringify(notification),
      });

      setNotifications((oldNotifications) => [
        data.notification,
        ...oldNotifications,
      ]);

      await refreshFromApi();
    } catch (error) {
      console.log("Erro ao criar notificação:", error);
    }
  }

  async function markNotificationAsRead(notificationId) {
    setNotifications((oldNotifications) =>
      oldNotifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      )
    );

    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
    } catch (error) {
      console.log("Erro ao marcar notificação como lida:", error);
    }
  }

  async function markAllNotificationsAsRead(userId) {
    setNotifications((oldNotifications) =>
      oldNotifications.map((notification) =>
        notification.userId === userId
          ? { ...notification, read: true }
          : notification
      )
    );

    try {
      await apiRequest(`/notifications/read-all/${userId}`, {
        method: "PATCH",
      });
    } catch (error) {
      console.log("Erro ao marcar notificações como lidas:", error);
    }
  }

  async function addAuditLog(action, details = {}, userOverride = null) {
    try {
      const data = await apiRequest("/audit-logs", {
        method: "POST",
        body: JSON.stringify({
          action,
          details,
          user: userOverride || currentUser,
        }),
      });

      setAuditLogs((oldLogs) => [data.log, ...oldLogs].slice(0, 250));
    } catch (error) {
      console.log("Erro ao registrar auditoria:", error);
    }
  }

  async function logout() {
    if (currentUser) {
      await addAuditLog("logout", { tipo: currentUser.tipo }, currentUser);
    }

    await clearSession();
    setCurrentUser(null);
    setScreen("login");
    setLoginType("usuario");
    setLoginForm(EMPTY_LOGIN_FORM);
    setLoginError("");
  }

  const myReports = useMemo(() => {
    if (!currentUser) return [];

    return reports.filter((report) => report.userId === currentUser.id);
  }, [reports, currentUser]);

  if (screen === "login") {
    return (
      <Login
        loginType={loginType}
        setLoginType={setLoginType}
        loginForm={loginForm}
        setLoginForm={setLoginForm}
        loginError={loginError}
        setLoginError={setLoginError}
        login={login}
        biometricLogin={biometricLogin}
        goCadastro={() => {
          setLoginError("");
          setScreen("cadastro");
        }}
        goRecuperar={() => {
          setLoginError("");
          resetRecover();
          setScreen("recuperar");
        }}
      />
    );
  }

  if (screen === "cadastro") {
    return (
      <Cadastro
        registerForm={registerForm}
        setRegisterForm={setRegisterForm}
        registerUser={registerUser}
        voltar={() => setScreen("login")}
      />
    );
  }

  if (screen === "recuperar") {
    return (
      <RecuperarSenha
        recoverStep={recoverStep}
        recoverUser={recoverUser}
        recoverForm={recoverForm}
        setRecoverForm={setRecoverForm}
        recoverError={recoverError}
        setRecoverError={setRecoverError}
        verificarUsuarioRecuperacao={verificarUsuarioRecuperacao}
        confirmarPerguntasSeguranca={confirmarPerguntasSeguranca}
        redefinirSenha={redefinirSenha}
        voltarLogin={() => {
          resetRecover();
          setScreen("login");
        }}
        voltarEtapa1={() => {
          setRecoverStep(1);
          setRecoverUser(null);
          setRecoverError("");
          setRecoverForm({ ...recoverForm, resposta1: "", resposta2: "" });
        }}
        voltarEtapa2={() => {
          setRecoverStep(2);
          setRecoverError("");
        }}
      />
    );
  }

  if (screen === "denuncia") {
    return (
      <Denuncia
        currentUser={currentUser}
        reports={reports}
        saveReports={saveReports}
        addAuditLog={addAuditLog}
        addNotification={addNotification}
        voltar={() => setScreen("home")}
      />
    );
  }

  return (
    <TelaInicial
      currentUser={currentUser}
      updateCurrentUser={updateCurrentUser}
      reports={reports}
      saveReports={saveReports}
      myReports={myReports}
      auditLogs={auditLogs}
      notifications={notifications}
      addAuditLog={addAuditLog}
      addNotification={addNotification}
      markNotificationAsRead={markNotificationAsRead}
      markAllNotificationsAsRead={markAllNotificationsAsRead}
      abrirDenuncia={() => setScreen("denuncia")}
      logout={logout}
    />
  );
}
