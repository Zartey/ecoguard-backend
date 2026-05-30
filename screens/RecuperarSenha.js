import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ErrorBox, Field, Header } from "../components/UI";

export default function RecuperarSenha({
  recoverStep,
  recoverUser,
  recoverForm,
  setRecoverForm,
  recoverError,
  setRecoverError,
  verificarUsuarioRecuperacao,
  confirmarPerguntasSeguranca,
  redefinirSenha,
  voltarLogin,
  voltarEtapa1,
  voltarEtapa2,
}) {
  const [loading, setLoading] = useState(false);

  function atualizarCampo(campo, valor) {
    setRecoverError("");
    setRecoverForm({
      ...recoverForm,
      [campo]: valor,
    });
  }

  async function executarAcao(acao) {
    if (loading) return;

    try {
      setLoading(true);
      await acao();
    } catch (error) {
      console.log("Erro na recuperação de senha:", error);
      setRecoverError("Não foi possível continuar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

      <Header
        title="Recuperar senha"
        subtitle={
          recoverStep === 1
            ? "Confirme sua conta"
            : recoverStep === 2
            ? "Perguntas de segurança"
            : "Nova senha"
        }
        back={voltarLogin}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.page}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.recoverProgress}>
            <Step number="1" active={recoverStep >= 1} />
            <View style={[styles.recoverLine, recoverStep >= 2 && styles.recoverLineActive]} />
            <Step number="2" active={recoverStep >= 2} />
            <View style={[styles.recoverLine, recoverStep >= 3 && styles.recoverLineActive]} />
            <Step number="3" active={recoverStep >= 3} />
          </View>

          {recoverStep === 1 && (
            <>
              <Text style={styles.recoverTitle}>Identificação da conta</Text>
              <Text style={styles.recoverSubtitle}>
                Informe o usuário e CPF cadastrados para localizar sua conta.
              </Text>

              <Field
                label="Usuário"
                value={recoverForm.usuario}
                onChangeText={(value) => atualizarCampo("usuario", value)}
                placeholder="Digite seu usuário"
                autoCapitalize="none"
              />

              <Field
                label="CPF"
                value={recoverForm.cpf}
                onChangeText={(value) => atualizarCampo("cpf", value)}
                placeholder="Somente números"
                keyboardType="numeric"
              />

              <ErrorBox message={recoverError} />

              <ActionButton
                title="Continuar"
                icon="arrow-right"
                loading={loading}
                onPress={() => executarAcao(verificarUsuarioRecuperacao)}
              />
            </>
          )}

          {recoverStep === 2 && recoverUser && (
            <>
              <Text style={styles.recoverTitle}>Perguntas de segurança</Text>
              <Text style={styles.recoverSubtitle}>
                Responda as perguntas cadastradas para confirmar sua identidade.
              </Text>

              <View style={styles.questionBox}>
                <Text style={styles.questionLabel}>Pergunta 1</Text>
                <Text style={styles.questionText}>
                  {recoverUser.pergunta1 || "Pergunta não cadastrada"}
                </Text>
              </View>

              <Field
                label="Resposta 1"
                value={recoverForm.resposta1}
                onChangeText={(value) => atualizarCampo("resposta1", value)}
                placeholder="Digite sua resposta"
              />

              <View style={styles.questionBox}>
                <Text style={styles.questionLabel}>Pergunta 2</Text>
                <Text style={styles.questionText}>
                  {recoverUser.pergunta2 || "Pergunta não cadastrada"}
                </Text>
              </View>

              <Field
                label="Resposta 2"
                value={recoverForm.resposta2}
                onChangeText={(value) => atualizarCampo("resposta2", value)}
                placeholder="Digite sua resposta"
              />

              <ErrorBox message={recoverError} />

              <ActionButton
                title="Confirmar respostas"
                icon="check-circle"
                loading={loading}
                onPress={() => executarAcao(confirmarPerguntasSeguranca)}
              />

              <ActionButton
                title="Voltar"
                icon="arrow-left"
                variant="outline"
                disabled={loading}
                onPress={voltarEtapa1}
              />
            </>
          )}

          {recoverStep === 3 && (
            <>
              <Text style={styles.recoverTitle}>Nova senha</Text>
              <Text style={styles.recoverSubtitle}>
                Crie uma nova senha para acessar sua conta.
              </Text>

              <Field
                label="Nova senha"
                value={recoverForm.novaSenha}
                onChangeText={(value) => atualizarCampo("novaSenha", value)}
                placeholder="Digite a nova senha"
                secureTextEntry
              />

              <Field
                label="Confirmar nova senha"
                value={recoverForm.confirmarSenha}
                onChangeText={(value) => atualizarCampo("confirmarSenha", value)}
                placeholder="Repita a nova senha"
                secureTextEntry
              />

              <ErrorBox message={recoverError} />

              <ActionButton
                title="Redefinir senha"
                icon="refresh-cw"
                loading={loading}
                onPress={() => executarAcao(redefinirSenha)}
              />

              <ActionButton
                title="Voltar"
                icon="arrow-left"
                variant="outline"
                disabled={loading}
                onPress={voltarEtapa2}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Step({ number, active }) {
  return (
    <View style={[styles.recoverStep, active && styles.recoverStepActive]}>
      <Text style={[styles.recoverStepText, active && styles.recoverStepTextActive]}>
        {number}
      </Text>
    </View>
  );
}

function ActionButton({ title, icon, onPress, loading, disabled, variant = "primary" }) {
  const isOutline = variant === "outline";
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.button,
        isOutline && styles.buttonOutline,
        isDisabled && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? "#166534" : "#FFFFFF"} />
      ) : (
        <>
          <Feather name={icon} size={18} color={isOutline ? "#166534" : "#FFFFFF"} />
          <Text style={[styles.buttonText, isOutline && styles.buttonOutlineText]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F3",
  },

  keyboardView: {
    flex: 1,
  },

  page: {
    padding: 20,
    paddingBottom: 50,
  },

  recoverProgress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },

  recoverStep: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  recoverStepActive: {
    backgroundColor: "#16A34A",
  },

  recoverStepText: {
    color: "#64748B",
    fontWeight: "900",
  },

  recoverStepTextActive: {
    color: "#FFFFFF",
  },

  recoverLine: {
    width: 45,
    height: 3,
    backgroundColor: "#CBD5E1",
    marginHorizontal: 5,
    borderRadius: 99,
  },

  recoverLineActive: {
    backgroundColor: "#16A34A",
  },

  recoverTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#064E3B",
    marginBottom: 6,
  },

  recoverSubtitle: {
    color: "#64748B",
    marginBottom: 20,
    lineHeight: 20,
  },

  questionBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },

  questionLabel: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4,
  },

  questionText: {
    color: "#064E3B",
    fontWeight: "800",
    fontSize: 15,
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

  buttonDisabled: {
    opacity: 0.65,
  },

  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  buttonOutlineText: {
    color: "#166534",
  },
});
