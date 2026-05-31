import React, { useEffect, useState } from "react";
import { uploadToCloudinary } from "../config/cloudinary";
import {
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import VideoPlayer from "../components/VideoPlayer";
import * as Location from "expo-location";
import * as Crypto from "expo-crypto";
import { Button, Field, Header } from "../components/UI";

const EMPTY_FORM = {
  tipo: "",
  descricao: "",
  imagem: "",
  video: "",
};

export default function Denuncia({
  currentUser,
  reports,
  saveReports,
  addAuditLog,
  addNotification,
  voltar,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [location, setLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    obterLocalizacao();
  }, []);

  function updateField(field, value) {
    setForm({
      ...form,
      [field]: value,
    });
  }

  async function obterLocalizacao() {
    try {
      setLoadingLocation(true);

      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Localização não permitida",
          "A denúncia pode ser criada sem localização, mas o ideal é permitir o GPS para registrar o local."
        );

        setLoadingLocation(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLocation(currentLocation);
    } catch (error) {
      console.log("Erro ao obter localização:", error);

      Alert.alert(
        "Erro na localização",
        "Não foi possível obter sua localização agora."
      );
    } finally {
      setLoadingLocation(false);
    }
  }

  async function escolherMidia() {
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita acesso à galeria para anexar imagem ou vídeo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsEditing: false,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      const tipoArquivo =
        asset.type ||
        (String(asset.uri).match(/\.(mp4|mov|m4v|avi|webm)$/i)
          ? "video"
          : "image");

      if (tipoArquivo === "video") {
        setForm({
          ...form,
          imagem: "",
          video: asset.uri,
        });
      } else {
        setForm({
          ...form,
          imagem: asset.uri,
          video: "",
        });
      }
    } catch (error) {
      console.log("Erro ao escolher mídia:", error);

      Alert.alert(
        "Erro",
        "Não foi possível selecionar a imagem ou vídeo."
      );
    }
  }

  async function tirarFoto() {
    try {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita acesso à câmera para tirar uma foto."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      setForm({
        ...form,
        imagem: asset.uri,
        video: "",
      });
    } catch (error) {
      console.log("Erro ao tirar foto:", error);

      Alert.alert("Erro", "Não foi possível abrir a câmera.");
    }
  }

  async function gravarVideo() {
    try {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();

      if (!permissao.granted) {
        Alert.alert(
          "Permissão necessária",
          "Permita acesso à câmera para gravar um vídeo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        allowsEditing: false,
        videoMaxDuration: 60,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];

      setForm({
        ...form,
        imagem: "",
        video: asset.uri,
      });
    } catch (error) {
      console.log("Erro ao gravar vídeo:", error);

      Alert.alert("Erro", "Não foi possível gravar o vídeo.");
    }
  }

  function removerMidia() {
    setForm({
      ...form,
      imagem: "",
      video: "",
    });
  }

  function gerarCodigoCompartilhamento(tipo) {
    const tipoLimpo = String(tipo || "DENUNCIA")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 12);

    const timePart = String(Date.now()).slice(-5);
    const randomPart = Math.floor(1000 + Math.random() * 9000);

    return `ECO-${tipoLimpo || "DENUNCIA"}-${timePart}${randomPart}`;
  }

  async function gerarHashEvidencia(reportData) {
    const texto = JSON.stringify({
      tipo: reportData.tipo,
      descricao: reportData.descricao,
      userId: reportData.userId,
      createdAt: reportData.createdAt,
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      imagem: reportData.imagem,
      video: reportData.video,
    });

    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, texto);
  }

  async function criarDenuncia() {
    try {
      if (saving) return;

      const tipo = String(form.tipo || "").trim();
      const descricao = String(form.descricao || "").trim();

      if (!tipo) {
        Alert.alert("Atenção", "Informe o tipo da denúncia.");
        return;
      }

      if (!descricao) {
        Alert.alert("Atenção", "Descreva a denúncia.");
        return;
      }

      if (!form.imagem && !form.video) {
        Alert.alert(
          "Atenção",
          "Anexe uma imagem ou um vídeo para registrar a evidência."
        );
        return;
      }

    setSaving(true);

let imagemUrl = null;
let videoUrl = null;

if (form.imagem) {
  imagemUrl = await uploadToCloudinary(form.imagem, "image");
}

if (form.video) {
  videoUrl = await uploadToCloudinary(form.video, "video");
}

const createdAt = new Date().toISOString();

const baseReport = {
  id: `rep-${Date.now()}`,
  userId: currentUser.id,
  userName: currentUser.nome,
  tipo,
  descricao,
  status: "Pendente",
  data: new Date().toLocaleDateString("pt-BR"),
  createdAt,
  latitude: location?.coords?.latitude || null,
  longitude: location?.coords?.longitude || null,
  imagem: imagemUrl,
  video: videoUrl,
  likes: 0,
  likedBy: [],
  shareCode: gerarCodigoCompartilhamento(tipo),
  solution: null,
};

      const evidenceHash = await gerarHashEvidencia(baseReport);

      const novaDenuncia = {
        ...baseReport,
        evidenceHash,
      };

      const updatedReports = [novaDenuncia, ...reports];

      await saveReports(updatedReports);

      await addAuditLog(
        "denuncia_criada",
        {
          reportId: novaDenuncia.id,
          tipo: novaDenuncia.tipo,
          midia: novaDenuncia.video ? "video" : "imagem",
        },
        currentUser
      );

      if (typeof addNotification === "function") {
        await addNotification({
          userId: currentUser.id,
          reportId: novaDenuncia.id,
          title: "Denúncia criada com sucesso",
          message: `Sua denúncia de ${novaDenuncia.tipo} foi criada e está pendente de análise.`,
          type: "created",
        });
      }

      setForm(EMPTY_FORM);

      Alert.alert(
        "Sucesso",
        "Denúncia criada com sucesso.",
        [
          {
            text: "OK",
            onPress: voltar,
          }, 
        ]
      );
    } catch (error) {
  console.log("Erro ao criar denúncia:", error);

  Alert.alert(
    "Erro ao criar denúncia",
    error?.message || "Não foi possível criar a denúncia. Tente novamente."
  );
} finally {
  setSaving(false);
}
  }

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

      <Header
        title="Nova denúncia"
        subtitle="Registre uma ocorrência ambiental"
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
          <View style={styles.infoBox}>
            <Feather name="shield" size={20} color="#166534" />

            <View style={styles.infoTextBox}>
              <Text style={styles.infoTitle}>Registro com evidência</Text>

              <Text style={styles.infoText}>
                Adicione imagem ou vídeo para ajudar na análise da denúncia.
              </Text>
            </View>
          </View>

          <Field
            label="Tipo da denúncia"
            value={form.tipo}
            onChangeText={(value) => updateField("tipo", value)}
            placeholder="Ex: Queimada, Desmatamento, Lixo irregular..."
          />

          <Field
            label="Descrição"
            value={form.descricao}
            onChangeText={(value) => updateField("descricao", value)}
            placeholder="Descreva o que está acontecendo..."
            multiline
          />

          <Text style={styles.label}>Evidência</Text>

{form.video ? (
  <VideoPlayer uri={form.video} style={styles.previewMedia} />
) : form.imagem ? (
  <Image source={{ uri: form.imagem }} style={styles.previewMedia} />
) : (
  <View style={styles.mediaPlaceholder}>
    <Feather name="image" size={34} color="#64748B" />

    <Text style={styles.mediaPlaceholderTitle}>
      Nenhuma mídia selecionada
    </Text>

    <Text style={styles.mediaPlaceholderText}>
      Escolha uma imagem ou vídeo para anexar à denúncia.
    </Text>
  </View>
)}
          <View style={styles.mediaActions}>
            <TouchableOpacity
              style={styles.mediaButton}
              activeOpacity={0.85}
              onPress={escolherMidia}
            >
              <Feather name="folder" size={18} color="#166534" />
              <Text style={styles.mediaButtonText}>Galeria</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mediaButton}
              activeOpacity={0.85}
              onPress={tirarFoto}
            >
              <Feather name="camera" size={18} color="#166534" />
              <Text style={styles.mediaButtonText}>Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mediaButton}
              activeOpacity={0.85}
              onPress={gravarVideo}
            >
              <Feather name="video" size={18} color="#166534" />
              <Text style={styles.mediaButtonText}>Vídeo</Text>
            </TouchableOpacity>
          </View>

          {form.imagem || form.video ? (
            <Button
              title="Remover mídia"
              variant="outline"
              icon="trash-2"
              onPress={removerMidia}
            />
          ) : null}

          <View style={styles.locationBox}>
            <View style={styles.locationIcon}>
              <Feather name="map-pin" size={20} color="#166534" />
            </View>

            <View style={styles.locationTextBox}>
              <Text style={styles.locationTitle}>Localização</Text>

              <Text style={styles.locationText}>
                {loadingLocation
                  ? "Buscando localização..."
                  : location?.coords
                  ? `Latitude: ${location.coords.latitude.toFixed(
                      5
                    )} | Longitude: ${location.coords.longitude.toFixed(5)}`
                  : "Localização não registrada."}
              </Text>
            </View>
          </View>

          <Button
            title={loadingLocation ? "Atualizando localização..." : "Atualizar localização"}
            variant="soft"
            icon="map-pin"
            onPress={obterLocalizacao}
          />

          <Button
            title={saving ? "Enviando..." : "Enviar denúncia"}
            icon="send"
            onPress={criarDenuncia}
          />

          <Button
            title="Cancelar"
            variant="outline"
            icon="x"
            onPress={voltar}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  keyboardView: {
    flex: 1,
  },

  page: {
    padding: 18,
    paddingBottom: 60,
  },

  infoBox: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },

  infoTextBox: {
    flex: 1,
    marginLeft: 10,
  },

  infoTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#064E3B",
    marginBottom: 3,
  },

  infoText: {
    fontSize: 13,
    color: "#166534",
    lineHeight: 18,
  },

  label: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 8,
    marginTop: 4,
  },

  previewMedia: {
    width: "100%",
    height: 230,
    borderRadius: 18,
    backgroundColor: "#0F172A",
    marginBottom: 12,
  },

  mediaPlaceholder: {
    height: 210,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    marginBottom: 12,
  },

  mediaPlaceholderTitle: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "900",
    marginTop: 8,
  },

  mediaPlaceholderText: {
    color: "#64748B",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },

  mediaActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },

  mediaButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },

  mediaButtonText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
  },

  locationBox: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
  },

  locationIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  locationTextBox: {
    flex: 1,
    marginLeft: 10,
  },

  locationTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0F172A",
  },

  locationText: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
    lineHeight: 17,
  },
});