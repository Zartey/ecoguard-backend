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
import { Field, Header } from "../components/UI";

export default function Cadastro({
  registerForm,
  setRegisterForm,
  registerUser,
  voltar,
}) {
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [erro, setErro] = useState("");
  const [cepInfo, setCepInfo] = useState("");

  function atualizarCampo(campo, valor) {
    setErro("");

    setRegisterForm({
      ...registerForm,
      [campo]: valor,
    });
  }

  async function buscarEnderecoPorCep(cepDigitado) {
    const cepLimpo = String(cepDigitado || "").replace(/\D/g, "");

    setErro("");
    setCepInfo("");

    setRegisterForm({
      ...registerForm,
      cep: cepLimpo,
    });

    if (cepLimpo.length < 8) {
      return;
    }

    if (cepLimpo.length > 8) {
      setErro("O CEP deve ter apenas 8 números.");
      return;
    }

    try {
      setLoadingCep(true);
      setCepInfo("Buscando endereço pelo CEP...");

      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!response.ok || data.erro) {
        setCepInfo("");
        setErro("CEP não encontrado. Verifique os números digitados.");
        return;
      }

      const enderecoCompleto = [data.logradouro, data.bairro]
        .filter(Boolean)
        .join(", ");

      setRegisterForm({
        ...registerForm,
        cep: cepLimpo,
        endereco: enderecoCompleto || registerForm.endereco,
        cidade: data.localidade || registerForm.cidade,
      });

      setCepInfo("Endereço preenchido automaticamente.");
    } catch (error) {
      console.log("Erro ao buscar CEP:", error);
      setCepInfo("");
      setErro(
        "Não foi possível buscar o CEP agora. Você pode preencher o endereço manualmente."
      );
    } finally {
      setLoadingCep(false);
    }
  }

  async function finalizarCadastro() {
    if (loading) return;

    try {
      setErro("");
      setLoading(true);

      if (typeof registerUser !== "function") {
        setErro("Erro interno: função de cadastro não encontrada.");
        return;
      }

      const resultado = await registerUser();

      if (resultado === true) {
        return;
      }

      if (typeof resultado === "string") {
        setErro(resultado);
        return;
      }

      if (resultado && typeof resultado === "object" && resultado.message) {
        setErro(resultado.message);
        return;
      }

      setErro("O cadastro não foi criado. Veja a mensagem de alerta e corrija o campo indicado.");
    } catch (error) {
      console.log("Erro ao finalizar cadastro:", error);
      setErro("Não foi possível finalizar o cadastro. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

      <Header
        title="Criar cadastro"
        subtitle="Cadastro de usuário"
        back={voltar}
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
          <Field
            label="Nome completo *"
            value={registerForm.nome}
            onChangeText={(value) => atualizarCampo("nome", value)}
            placeholder="Ex: Gabriel Mathias"
          />

          <Field
            label="CPF *"
            value={registerForm.cpf}
            onChangeText={(value) => atualizarCampo("cpf", value)}
            placeholder="Somente números"
            keyboardType="numeric"
          />

          <Field
            label="Usuário *"
            value={registerForm.usuario}
            onChangeText={(value) => atualizarCampo("usuario", value)}
            placeholder="Crie um usuário"
            autoCapitalize="none"
          />

          <Field
            label="E-mail *"
            value={registerForm.email}
            onChangeText={(value) => atualizarCampo("email", value)}
            placeholder="email@exemplo.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.cepHeaderRow}>
            <Text style={styles.cepLabel}>CEP *</Text>
            {loadingCep ? (
              <View style={styles.cepLoadingBox}>
                <ActivityIndicator size="small" color="#166534" />
                <Text style={styles.cepLoadingText}>Buscando...</Text>
              </View>
            ) : null}
          </View>

          <Field
            label=""
            value={registerForm.cep}
            onChangeText={buscarEnderecoPorCep}
            placeholder="Digite 8 números"
            keyboardType="numeric"
          />

          {cepInfo ? (
            <View style={styles.successBox}>
              <Feather name="check-circle" size={17} color="#166534" />
              <Text style={styles.successText}>{cepInfo}</Text>
            </View>
          ) : null}

          <Field
            label="Endereço"
            value={registerForm.endereco}
            onChangeText={(value) => atualizarCampo("endereco", value)}
            placeholder="Rua, número, bairro"
          />

          <Field
            label="Cidade"
            value={registerForm.cidade}
            onChangeText={(value) => atualizarCampo("cidade", value)}
            placeholder="Cidade"
          />

          <Field
            label="Telefone"
            value={registerForm.telefone}
            onChangeText={(value) => atualizarCampo("telefone", value)}
            placeholder="(00) 00000-0000"
            keyboardType="phone-pad"
          />

          <Field
            label="Senha *"
            value={registerForm.senha}
            onChangeText={(value) => atualizarCampo("senha", value)}
            placeholder="Crie uma senha com pelo menos 6 caracteres"
            secureTextEntry
          />

          <Field
            label="Confirmar senha *"
            value={registerForm.confirmarSenha}
            onChangeText={(value) => atualizarCampo("confirmarSenha", value)}
            placeholder="Repita sua senha"
            secureTextEntry
          />

          <View style={styles.sectionTitleBox}>
            <Text style={styles.sectionTitle}>Segurança da conta</Text>

            <Text style={styles.sectionSubtitle}>
              Essas perguntas serão usadas para recuperar sua senha. Se deixar em branco, o app usa respostas padrão.
            </Text>
          </View>

          <Field
            label="Pergunta de segurança 1 (opcional)"
            value={registerForm.pergunta1}
            onChangeText={(value) => atualizarCampo("pergunta1", value)}
            placeholder="Ex: Nome do primeiro pet"
          />

          <Field
            label="Resposta 1 (opcional)"
            value={registerForm.resposta1}
            onChangeText={(value) => atualizarCampo("resposta1", value)}
            placeholder="Digite a resposta"
          />

          <Field
            label="Pergunta de segurança 2 (opcional)"
            value={registerForm.pergunta2}
            onChangeText={(value) => atualizarCampo("pergunta2", value)}
            placeholder="Ex: Cidade natal"
          />

          <Field
            label="Resposta 2 (opcional)"
            value={registerForm.resposta2}
            onChangeText={(value) => atualizarCampo("resposta2", value)}
            placeholder="Digite a resposta"
          />

          <Field
            label="Bio"
            value={registerForm.bio}
            onChangeText={(value) => atualizarCampo("bio", value)}
            placeholder="Fale um pouco sobre você"
            multiline
          />

          {erro ? (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={18} color="#B91C1C" />
              <Text style={styles.errorText}>{erro}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={finalizarCadastro}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Feather name="check" size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Criar cadastro</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.backLoginButton}
            onPress={voltar}
            disabled={loading}
          >
            <Text style={styles.backLoginText}>Voltar para login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingBottom: 60,
  },

  cepHeaderRow: {
    marginTop: 2,
    marginBottom: -8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cepLabel: {
    fontSize: 13,
    color: "#14532D",
    fontWeight: "800",
  },

  cepLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  cepLoadingText: {
    fontSize: 12,
    color: "#166534",
    fontWeight: "800",
  },

  sectionTitleBox: {
    marginTop: 10,
    marginBottom: 14,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#064E3B",
  },

  sectionSubtitle: {
    color: "#64748B",
    marginTop: 4,
    lineHeight: 19,
  },

  successBox: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -6,
    marginBottom: 12,
  },

  successText: {
    flex: 1,
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
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
    marginTop: 4,
    marginBottom: 10,
  },

  errorText: {
    flex: 1,
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "800",
  },

  submitButton: {
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

  submitButtonDisabled: {
    opacity: 0.65,
  },

  submitButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },

  backLoginButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    marginTop: 8,
  },

  backLoginText: {
    color: "#166534",
    fontSize: 14,
    fontWeight: "800",
  },
});
