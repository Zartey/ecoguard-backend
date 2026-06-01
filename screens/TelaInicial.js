import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import VideoPlayer from "../components/VideoPlayer";
import * as Sharing from "expo-sharing";
import { Button, Field, Header } from "../components/UI";

export default function TelaInicial({
  currentUser,
  updateCurrentUser,
  reports,
  saveReports,
  myReports,
  auditLogs,
  notifications,
  addAuditLog,
  addNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  abrirDenuncia,
  logout,
}) {
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [profileModal, setProfileModal] = useState(false);
  const [editProfileModal, setEditProfileModal] = useState(false);
  const [shareModal, setShareModal] = useState(false);
  const [shareSearch, setShareSearch] = useState("");
  const [solutionModal, setSolutionModal] = useState(false);
  const [solutionReport, setSolutionReport] = useState(null);
  const [logsModal, setLogsModal] = useState(false);
  const [notificationsModal, setNotificationsModal] = useState(false);
  const [ownReportsModal, setOwnReportsModal] = useState(false);
  const [filter, setFilter] = useState("todas");
  const likingReportIdRef = useRef(null);
  const actionLockRef = useRef(false);

  const [profileForm, setProfileForm] = useState({
    nome: currentUser?.nome || "",
    email: currentUser?.email || "",
    telefone: currentUser?.telefone || "",
    cep: currentUser?.cep || "",
    endereco: currentUser?.endereco || "",
    cidade: currentUser?.cidade || "",
    bio: currentUser?.bio || "",
    fotoPerfil: currentUser?.fotoPerfil || "",
  });

  const [solutionForm, setSolutionForm] = useState({
    descricao: "",
    imagem: "",
  });

  const isAdmin = currentUser?.tipo === "admin";
  const visibleReports = reports;
  const totalReports = reports.length;
  const pendingReports = visibleReports.filter(
    (report) => report.status === "Pendente"
  );
  const analysisReports = visibleReports.filter(
    (report) => report.status === "Em análise"
  );
  const resolvedReports = visibleReports.filter(
    (report) => report.status === "Resolvido"
  );
  const ownReports = visibleReports.filter(
    (report) => report.userId === currentUser?.id
  );
  const userNotifications = Array.isArray(notifications)
    ? notifications.filter((notification) => notification.userId === currentUser?.id)
    : [];
  const unreadNotifications = userNotifications.filter(
    (notification) => !notification.read
  ).length;

  const filteredReports = useMemo(() => {
  let source = [...reports].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });


    if (filter === "pendentes") {
      source = source.filter((report) => report.status === "Pendente");
    }

    if (filter === "analise") {
      source = source.filter((report) => report.status === "Em análise");
    }

    if (filter === "resolvidas") {
      source = source.filter((report) => report.status === "Resolvido");
    }

    if (!search.trim()) {
      return source;
    }

    const term = search.trim().toLowerCase();

    return source.filter(
      (report) =>
        String(report.tipo || "").toLowerCase().includes(term) ||
        String(report.descricao || "").toLowerCase().includes(term) ||
        String(report.status || "").toLowerCase().includes(term) ||
        String(report.userName || "").toLowerCase().includes(term) ||
        String(report.shareCode || "").toLowerCase().includes(term)
    );
  }, [search, reports, filter]);

  async function openNotifications() {
    setNotificationsModal(true);

    if (unreadNotifications > 0 && markAllNotificationsAsRead) {
      await markAllNotificationsAsRead(currentUser.id);
    }
  }

  function getNotificationIcon(type) {
    if (type === "created") return "check-circle";
    if (type === "analysis") return "search";
    if (type === "pending") return "clock";
    if (type === "resolved") return "award";
    return "bell";
  }

  function openNotificationReport(notification) {
    if (markNotificationAsRead) {
      markNotificationAsRead(notification.id);
    }

    const report = reports.find((item) => item.id === notification.reportId);

    if (report) {
      setNotificationsModal(false);
      setTimeout(() => setSelectedReport(report), 250);
    }
  }

  function generateShareCode(report) {
    const tipoLimpo = String(report.tipo || "DENUNCIA")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 12);

    const randomPart = Math.floor(1000 + Math.random() * 9000);
    const timePart = String(Date.now()).slice(-5);

    return `ECO-${tipoLimpo || "DENUNCIA"}-${timePart}${randomPart}`;
  }

  function getUpdatedSelected(updatedReports, reportId) {
    return updatedReports.find((report) => report.id === reportId) || null;
  }

  async function ensureShareCode(report) {
    if (report.shareCode) {
      return { reportToUse: report, updatedReports: reports };
    }

    const newShareCode = generateShareCode(report);
    const updatedReports = reports.map((item) =>
      item.id === report.id ? { ...item, shareCode: newShareCode } : item
    );

    await saveReports(updatedReports);

    const reportToUse = {
      ...report,
      shareCode: newShareCode,
    };

    if (selectedReport?.id === report.id) {
      setSelectedReport(reportToUse);
    }

    await addAuditLog(
      "codigo_compartilhamento_gerado",
      { reportId: report.id, shareCode: newShareCode },
      currentUser
    );

    return { reportToUse, updatedReports };
  }
  async function runOnce(callback) {
  if (actionLockRef.current) return;

  try {
    actionLockRef.current = true;
    await callback();
  } catch (error) {
    console.log("Erro ao executar ação:", error);
  } finally {
    setTimeout(() => {
      actionLockRef.current = false;
    }, 700);
  }
}

  async function openReportByCode() {
    const code = shareSearch.trim();

    if (!code) {
      Alert.alert("Atenção", "Digite um código de compartilhamento.");
      return;
    }

    const foundReport = reports.find(
      (report) => String(report.shareCode || "").toLowerCase() === code.toLowerCase()
    );

    if (!foundReport) {
      Alert.alert(
        "Código não encontrado",
        "Nenhuma denúncia foi encontrada com esse código. Verifique se ele foi copiado corretamente."
      );
      return;
    }

    setShareModal(false);
    setShareSearch("");
    setSelectedReport(foundReport);

    await addAuditLog(
      "consulta_por_codigo",
      { reportId: foundReport.id, shareCode: foundReport.shareCode },
      currentUser
    );
  }

async function likeReport(reportId) {
  if (!currentUser?.id) return;
  if (likingReportIdRef.current === reportId) return;

  likingReportIdRef.current = reportId;

  const updated = reports.map((report) => {
    if (report.id !== reportId) return report;

    const likedBy = Array.isArray(report.likedBy) ? report.likedBy : [];
    const alreadyLiked = likedBy.includes(currentUser.id);

    return {
      ...report,
      likes: alreadyLiked
        ? Math.max(0, (report.likes || 0) - 1)
        : (report.likes || 0) + 1,
      likedBy: alreadyLiked
        ? likedBy.filter((id) => id !== currentUser.id)
        : [...likedBy, currentUser.id],
    };
  });

  const updatedSelected = updated.find((report) => report.id === reportId);

  if (updatedSelected) {
    setSelectedReport(updatedSelected);
  }

  try {
    await saveReports(updated);
  } catch (error) {
    console.log("Erro ao salvar curtida:", error);
  } finally {
    setTimeout(() => {
      likingReportIdRef.current = null;
    }, 500);
  }
}

  async function shareReport(report) {
    try {
      const { reportToUse } = await ensureShareCode(report);

      const message =
        `EcoGuard - Denúncia ambiental\n\n` +
        `Código: ${reportToUse.shareCode}\n` +
        `Tipo: ${reportToUse.tipo}\n` +
        `Status: ${reportToUse.status}\n` +
        `Data: ${reportToUse.data}\n` +
        `Descrição: ${reportToUse.descricao}\n\n` +
        `Use o código ${reportToUse.shareCode} para localizar esta denúncia no app EcoGuard.`;

      const result = await Share.share({
        title: "EcoGuard - Denúncia ambiental",
        message,
      });

      await addAuditLog(
        "compartilhamento_denuncia",
        {
          reportId: reportToUse.id,
          shareCode: reportToUse.shareCode,
          action: result.action,
        },
        currentUser
      );

      Alert.alert(
        "Código de compartilhamento",
        `Código gerado/copíado para envio:\n\n${reportToUse.shareCode}`
      );
    } catch (error) {
      console.log("Erro ao compartilhar denúncia:", error);
      Alert.alert(
        "Erro ao compartilhar",
        "Não foi possível abrir o compartilhamento. O código foi mantido na denúncia."
      );
    }
  }

  async function pickProfileImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permissão necessária", "Permita acesso à galeria para alterar a foto.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileForm({ ...profileForm, fotoPerfil: result.assets[0].uri });
    }
  }

  async function saveProfile() {
    if (!profileForm.nome.trim() || !profileForm.email.trim()) {
      Alert.alert("Atenção", "Nome e e-mail são obrigatórios.");
      return;
    }

    const updatedUser = {
      ...currentUser,
      ...profileForm,
      nome: profileForm.nome.trim(),
      email: profileForm.email.trim().toLowerCase(),
    };

    await updateCurrentUser(updatedUser);
    setEditProfileModal(false);
    setProfileModal(false);
    Alert.alert("Sucesso", "Perfil atualizado.");
  }

  async function markReportAsPending(report) {
    if (!isAdmin) {
      Alert.alert(
        "Acesso negado",
        "Apenas o administrador pode alterar o status da denúncia."
      );
      return;
    }

    if (report.status === "Resolvido") {
      Alert.alert("Denúncia resolvida", "Esta denúncia já foi solucionada.");
      return;
    }

    if (report.status === "Pendente") {
      Alert.alert("Já está pendente", "Esta denúncia já está como Pendente.");
      return;
    }

    try {
      setSelectedReport(null);

      const updated = reports.map((item) =>
        item.id === report.id
          ? {
              ...item,
              status: "Pendente",
              pendingUpdate: {
                changedBy: currentUser.nome,
                changedAt: new Date().toISOString(),
                data: new Date().toLocaleString("pt-BR"),
                observacao: "Denúncia retornada para pendente pelo administrador.",
              },
            }
          : item
      );

      await saveReports(updated);

      if (addNotification) {
        await addNotification({
          userId: report.userId,
          reportId: report.id,
          title: "Denúncia voltou para pendente",
          message: `Sua denúncia de ${report.tipo} foi atualizada pelo administrador e voltou para o status Pendente.`,
          type: "pending",
        });
      }

      await addAuditLog(
        "denuncia_pendente",
        {
          reportId: report.id,
          statusAnterior: report.status,
          statusNovo: "Pendente",
        },
        currentUser
      );

      Alert.alert(
        "Status atualizado",
        "A denúncia foi marcada como Pendente e o autor foi notificado."
      );
    } catch (error) {
      console.log("Erro ao marcar denúncia como pendente:", error);
      Alert.alert("Erro", "Não foi possível marcar a denúncia como Pendente.");
    }
  }

  async function markReportAsAnalysis(report) {
    if (!isAdmin) {
      Alert.alert(
        "Acesso negado",
        "Apenas o administrador pode alterar o status da denúncia."
      );
      return;
    }

    if (report.status === "Resolvido") {
      Alert.alert("Denúncia resolvida", "Esta denúncia já foi solucionada.");
      return;
    }

    if (report.status === "Em análise") {
      Alert.alert(
        "Já está em análise",
        "Esta denúncia já foi marcada como em análise."
      );
      return;
    }

    try {
      const now = new Date();

      // Fecha a tela de detalhes antes de atualizar o status.
      // Isso evita que vários modais/alertas apareçam rapidamente na frente.
      setSelectedReport(null);

      const updated = reports.map((item) =>
        item.id === report.id
          ? {
              ...item,
              status: "Em análise",
              investigation: {
                startedBy: currentUser.nome,
                startedAt: now.toISOString(),
                data: now.toLocaleString("pt-BR"),
                observacao:
                  "Denúncia marcada como em análise pelo administrador.",
              },
            }
          : item
      );

      await saveReports(updated);

      if (addNotification) {
        await addNotification({
          userId: report.userId,
          reportId: report.id,
          title: "Denúncia em análise",
          message: `Sua denúncia de ${report.tipo} foi marcada como Em análise pelo administrador.`,
          type: "analysis",
        });
      }

      await addAuditLog(
        "denuncia_em_analise",
        {
          reportId: report.id,
          statusAnterior: report.status,
          statusNovo: "Em análise",
        },
        currentUser
      );

      Alert.alert(
        "Status atualizado",
        "A denúncia foi marcada como Em análise, registrada como investigação em andamento e o autor foi notificado."
      );
    } catch (error) {
      console.log("Erro ao marcar denúncia como em análise:", error);

      Alert.alert(
        "Erro",
        "Não foi possível marcar a denúncia como Em análise. Tente novamente."
      );
    }
  }

  function openSolution(report) {
    setSelectedReport(null);
    setSolutionReport(report);
    setSolutionForm({
      descricao: report.solution?.descricao || "",
      imagem: report.solution?.imagem || "",
    });

    setTimeout(() => {
      setSolutionModal(true);
    }, 250);
  }

  async function pickSolutionImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permissão necessária",
        "Permita acesso à galeria para anexar a imagem da solução."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSolutionForm({ ...solutionForm, imagem: result.assets[0].uri });
    }
  }

  async function saveSolution() {
    if (!solutionReport) {
      Alert.alert("Erro", "Nenhuma denúncia foi selecionada.");
      return;
    }

    if (!solutionForm.descricao.trim()) {
      Alert.alert("Atenção", "Descreva o que foi resolvido.");
      return;
    }

    const updated = reports.map((report) =>
      report.id === solutionReport.id
        ? {
            ...report,
            status: "Resolvido",
            solution: {
              descricao: solutionForm.descricao.trim(),
              imagem: solutionForm.imagem,
              solvedBy: currentUser.nome,
              solvedAt: new Date().toISOString(),
              data: new Date().toLocaleString("pt-BR"),
            },
          }
        : report
    );

    await saveReports(updated);

    if (addNotification) {
      await addNotification({
        userId: solutionReport.userId,
        reportId: solutionReport.id,
        title: "Denúncia solucionada",
        message: `Sua denúncia de ${solutionReport.tipo} foi solucionada pelo administrador. Abra para ver os detalhes da solução.`,
        type: "resolved",
      });
    }

    await addAuditLog("denuncia_resolvida", { reportId: solutionReport.id }, currentUser);

    setSolutionModal(false);
    setSolutionReport(null);
    setSolutionForm({ descricao: "", imagem: "" });
    Alert.alert("Sucesso", "Solução registrada com descrição e imagem.");
  }

  async function deleteReport(report) {
    if (!isAdmin && report.userId !== currentUser.id) {
      Alert.alert("Acesso negado", "Você não pode excluir esta denúncia.");
      return;
    }

    Alert.alert("Excluir denúncia", "Tem certeza que deseja excluir esta denúncia?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          const updated = reports.filter((item) => item.id !== report.id);
          await saveReports(updated);
          await addAuditLog("denuncia_excluida", { reportId: report.id }, currentUser);
          setSelectedReport(null);
        },
      },
    ]);
  }

  async function gerarRelatorio() {
    const source = isAdmin ? reports : myReports;

    if (source.length === 0) {
      Alert.alert("Aviso", "Sem denúncias para o relatório.");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #1f2937; }
            h1 { color: #064E3B; text-align: center; border-bottom: 2px solid #064E3B; padding-bottom: 10px; }
            .summary { background-color: #ECFDF5; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .report { border: 1px solid #CBD5E1; border-radius: 8px; padding: 12px; margin-bottom: 12px; }
            .label { font-weight: bold; color: #475569; }
            .status { font-weight: bold; color: #15803D; }
            .hash { font-size: 10px; color: #64748B; word-break: break-all; }
          </style>
        </head>
        <body>
          <h1>Relatório EcoGuard</h1>
          <div class="summary">
            <p><span class="label">Usuário:</span> ${currentUser.nome} (${currentUser.tipo})</p>
            <p><span class="label">Total:</span> ${source.length}</p>
            <p><span class="label">Pendentes:</span> ${
              source.filter((report) => report.status === "Pendente").length
            }</p>
            <p><span class="label">Em análise:</span> ${
              source.filter((report) => report.status === "Em análise").length
            }</p>
            <p><span class="label">Resolvidas:</span> ${
              source.filter((report) => report.status === "Resolvido").length
            }</p>
          </div>
          ${source
            .map(
              (report, index) => `
                <div class="report">
                  <p><span class="status">#${index + 1} - ${report.status}</span></p>
                  <p><span class="label">Código:</span> ${report.shareCode || "Não gerado"}</p>
                  <p><span class="label">Tipo:</span> ${report.tipo}</p>
                  <p><span class="label">Data:</span> ${report.data}</p>
                  <p><span class="label">Autor:</span> ${report.userName}</p>
                  <p><span class="label">Lat/Lon:</span> ${report.latitude || "N/A"}, ${report.longitude || "N/A"}</p>
                  <p><span class="label">Descrição:</span> ${report.descricao}</p>
                  <p class="hash"><span class="label">Hash:</span> ${report.evidenceHash || "N/A"}</p>
                </div>`
            )
            .join("")}
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { mimeType: "application/pdf" });
      await addAuditLog("relatorio_gerado", { total: source.length }, currentUser);
    } catch (error) {
      console.log("Erro ao gerar relatório:", error);
      Alert.alert("Erro", "Falha ao gerar o PDF.");
    }
  }

  function openMaps(report) {
    if (!report.latitude || !report.longitude) return;

    Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${report.latitude},${report.longitude}`
    );
  }

  function getStatusStyle(status) {
    if (status === "Resolvido") return styles.statusDone;
    if (status === "Em análise") return styles.statusAnalysis;
    return styles.statusPending;
  }
function renderReport({ item }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.reportCard}
      onPress={() => setSelectedReport(item)}
    >
      {item.video ? (
        <View style={styles.reportMediaBox}>
          <VideoPlayer uri={item.video} style={styles.reportImage} />

          <View pointerEvents="none" style={styles.videoBadge}>
            <Feather name="video" size={14} color="#FFFFFF" />
            <Text style={styles.videoBadgeText}>Vídeo</Text>
          </View>
        </View>
      ) : item.imagem ? (
        <Image source={{ uri: item.imagem }} style={styles.reportImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Feather name="image" size={32} color="#64748B" />
          <Text style={styles.imagePlaceholderText}>Sem imagem ou vídeo</Text>
        </View>
      )}

      <View style={styles.reportContent}>
        <View style={styles.rowBetween}>
          <Text style={styles.reportType} numberOfLines={1}>
            {item.tipo}
          </Text>

          <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <Text style={styles.reportDescription} numberOfLines={3}>
          {item.descricao}
        </Text>

        <View style={styles.reportInfoRow}>
          <View style={styles.infoItem}>
            <Feather name="calendar" size={14} color="#64748B" />
            <Text style={styles.reportMeta}>{item.data}</Text>
          </View>

          <View style={styles.infoItem}>
            <Feather name="user" size={14} color="#64748B" />
            <Text style={styles.reportMeta} numberOfLines={1}>
              {item.userName}
            </Text>
          </View>
        </View>

        <View style={styles.codeBox}>
          <Feather name="hash" size={14} color="#166534" />
          <Text style={styles.shareCode} numberOfLines={1}>
            {item.shareCode || "Código será gerado ao compartilhar"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

  function ReportDetailsModal() {
    if (!selectedReport) return null;

    const canManage = isAdmin;
    const canDelete = isAdmin || selectedReport.userId === currentUser.id;

    return (
      <Modal
        visible={Boolean(selectedReport)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.rowBetween}>
                <Text style={styles.modalTitle}>{selectedReport.tipo}</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedReport(null)}>
                  <Feather name="x" size={22} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {selectedReport.video ? (
  <VideoPlayer uri={selectedReport.video} style={styles.detailImage} />
) : selectedReport.imagem ? (
  <Image source={{ uri: selectedReport.imagem }} style={styles.detailImage} />
) : null}

              <View style={[styles.statusBadge, getStatusStyle(selectedReport.status)]}>
                <Text style={styles.statusText}>{selectedReport.status}</Text>
              </View>

              <Text style={styles.detailText}>{selectedReport.descricao}</Text>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Código</Text>
                <Text style={styles.detailValue}>{selectedReport.shareCode || "Ainda não gerado"}</Text>

                <Text style={styles.detailLabel}>Autor</Text>
                <Text style={styles.detailValue}>{selectedReport.userName}</Text>

                <Text style={styles.detailLabel}>Data</Text>
                <Text style={styles.detailValue}>{selectedReport.data}</Text>

                <Text style={styles.detailLabel}>GPS</Text>
                <Text style={styles.detailValue}>
                  {selectedReport.latitude || "N/A"}, {selectedReport.longitude || "N/A"}
                </Text>
              </View>

              <Text style={styles.hashText}>
                Hash de integridade: {selectedReport.evidenceHash || "N/A"}
              </Text>

              {selectedReport.investigation ? (
                <View style={styles.analysisBox}>
                  <Text style={styles.analysisTitle}>Investigação registrada</Text>
                  <Text style={styles.detailText}>
                    Esta denúncia foi marcada como em análise pelo administrador.
                  </Text>
                  <Text style={styles.reportMeta}>
                    Por {selectedReport.investigation.startedBy} em {selectedReport.investigation.data}
                  </Text>
                </View>
              ) : null}

              {selectedReport.solution ? (
                <View style={styles.solutionBox}>
                  <Text style={styles.solutionTitle}>Solução registrada</Text>
                  <Text style={styles.detailText}>{selectedReport.solution.descricao}</Text>
                  <Text style={styles.reportMeta}>
                    Por {selectedReport.solution.solvedBy} em {selectedReport.solution.data}
                  </Text>

                  {selectedReport.solution.imagem ? (
                    <Image source={{ uri: selectedReport.solution.imagem }} style={styles.detailImage} />
                  ) : null}
                </View>
              ) : null}

<TouchableOpacity
  activeOpacity={0.85}
  style={styles.likeButton}
  onPress={() => likeReport(selectedReport.id)}
>
  <Feather name="thumbs-up" size={18} color="#166534" />

  <Text style={styles.likeButtonText}>
    Curtir ({selectedReport.likes || 0})
  </Text>
</TouchableOpacity>

              <Button
                title="Compartilhar código"
                variant="outline"
                icon="share-2"
               onPress={() => runOnce(() => shareReport(selectedReport))}
              />

              {selectedReport.latitude ? (
                <Button
                  title="Abrir no mapa"
                  variant="soft"
                  icon="map-pin"
                  onPress={() => runOnce(() => openMaps(selectedReport))}
                />
              ) : null}

              {canManage &&
              selectedReport.status !== "Resolvido" &&
              selectedReport.status !== "Em análise" ? (
                <Button
                  title="Marcar como em análise"
                  variant="soft"
                  icon="search"
                  onPress={() => runOnce(() => markReportAsAnalysis(selectedReport))}
                />
              ) : null}

              {canManage && selectedReport.status === "Em análise" ? (
                <Button
                  title="Voltar para pendente"
                  variant="outline"
                  icon="clock"
                  onPress={() => runOnce(() => markReportAsPending(selectedReport))}
                />
              ) : null}

              {canManage && selectedReport.status === "Em análise" ? (
                <Button
                  title="Solucionar caso"
                  icon="check-circle"
                  onPress={() => runOnce(() => openSolution(selectedReport))}
                />
              ) : null}

              {canDelete ? (
                <Button
                  title="Excluir denúncia"
                  variant="danger"
                  icon="trash-2"
                  onPress={() => runOnce(() => deleteReport(selectedReport))}
                />
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function FilterChip({ title, value }) {
    const active = filter === value;

    return (
      <TouchableOpacity
        style={[styles.filterChip, active && styles.filterChipActive]}
        onPress={() => setFilter(value)}
      >
        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
}

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

      <Header
        title={isAdmin ? "Painel Administrativo" : "EcoGuard"}
        subtitle={isAdmin ? "Gerencie denúncias e auditorias" : `Olá, ${currentUser?.nome || "usuário"}`}
        onNotifications={openNotifications}
        notificationCount={unreadNotifications}
        onLogout={logout}
      />

      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.content}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Todas as denúncias</Text>
              <Text style={styles.summarySubtitle}>Acompanhe rapidamente o status das ocorrências ambientais.</Text>

              <View style={styles.summaryNumbers}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{totalReports}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{pendingReports.length}</Text>
                  <Text style={styles.summaryLabel}>Pendentes</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{analysisReports.length}</Text>
                  <Text style={styles.summaryLabel}>Em análise</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{resolvedReports.length}</Text>
                  <Text style={styles.summaryLabel}>Resolvidas</Text>
                </View>
              </View>
            </View>

            <View style={styles.quickActions}>
              <TouchableOpacity style={styles.primaryAction} onPress={abrirDenuncia}>
                <Feather name="plus-circle" size={22} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>
                  {isAdmin ? "Criar denúncia" : "Nova denúncia"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryAction} onPress={() => setProfileModal(true)}>
                <Feather name="user" size={20} color="#166534" />
                <Text style={styles.secondaryActionText}>Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryAction} onPress={() => setShareModal(true)}>
                <Feather name="search" size={20} color="#166534" />
                <Text style={styles.secondaryActionText}>Código</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryAction} onPress={() => setOwnReportsModal(true)}>
                <Feather name="folder" size={20} color="#166534" />
                <Text style={styles.secondaryActionText}>Minhas</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchBox}>
              <Feather name="search" size={18} color="#64748B" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Buscar denúncia..."
                style={styles.searchInput}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.filterRow}>
              <FilterChip title="Todas" value="todas" />
              <FilterChip title="Pendentes" value="pendentes" />
              <FilterChip title="Em análise" value="analise" />
              <FilterChip title="Resolvidas" value="resolvidas" />
            </View>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Denúncias</Text>
              <View style={styles.sectionActions}>
                <TouchableOpacity style={styles.iconAction} onPress={gerarRelatorio}>
                  <Feather name="file-text" size={18} color="#166534" />
                </TouchableOpacity>
                {isAdmin ? (
                  <TouchableOpacity style={styles.iconAction} onPress={() => setLogsModal(true)}>
                    <Feather name="activity" size={18} color="#166534" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma denúncia encontrada.</Text>
        }
      />

      <ReportDetailsModal />


      <Modal
        visible={notificationsModal}
        animationType="slide"
        onRequestClose={() => setNotificationsModal(false)}
      >
        <SafeAreaView style={styles.screen}>
          <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

          <Header
            title="Notificações"
            subtitle="Atualizações sobre suas denúncias"
            back={() => setNotificationsModal(false)}
          />

          <View style={styles.content}>
            <View style={styles.notificationSummary}>
              <Feather name="bell" size={22} color="#166534" />
              <View style={{ flex: 1 }}>
                <Text style={styles.notificationSummaryTitle}>
                  Central de notificações
                </Text>
                <Text style={styles.notificationSummaryText}>
                  Aqui aparecem avisos quando uma denúncia é criada, entra em análise, volta para pendente ou é solucionada.
                </Text>
              </View>
            </View>
          </View>

          <FlatList
            data={userNotifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.notificationCard,
                  !item.read && styles.notificationCardUnread,
                ]}
                onPress={() => openNotificationReport(item)}
              >
                <View style={styles.notificationIconBox}>
                  <Feather
                    name={getNotificationIcon(item.type)}
                    size={20}
                    color="#166534"
                  />
                </View>

                <View style={styles.notificationContent}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    {!item.read ? <View style={styles.unreadDot} /> : null}
                  </View>

                  <Text style={styles.notificationMessage}>{item.message}</Text>
                  <Text style={styles.notificationDate}>{item.date}</Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Feather name="bell-off" size={36} color="#94A3B8" />
                <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
                <Text style={styles.emptyText}>
                  Quando houver atualizações nas suas denúncias, elas aparecerão aqui.
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>

      <Modal
        visible={ownReportsModal}
        animationType="slide"
        onRequestClose={() => setOwnReportsModal(false)}
      >
        <SafeAreaView style={styles.screen}>
          <StatusBar barStyle="light-content" backgroundColor="#064E3B" />

          <Header
            title="Minhas denúncias"
            subtitle="Consulte apenas as denúncias criadas por você"
            back={() => setOwnReportsModal(false)}
          />

          <View style={styles.content}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Minhas denúncias</Text>
              <Text style={styles.summarySubtitle}>
                Aqui aparecem somente as denúncias que você criou nesta conta.
              </Text>

              <View style={styles.summaryNumbers}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>{ownReports.length}</Text>
                  <Text style={styles.summaryLabel}>Total</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {ownReports.filter((report) => report.status === "Pendente").length}
                  </Text>
                  <Text style={styles.summaryLabel}>Pendentes</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {ownReports.filter((report) => report.status === "Em análise").length}
                  </Text>
                  <Text style={styles.summaryLabel}>Em análise</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryNumber}>
                    {ownReports.filter((report) => report.status === "Resolvido").length}
                  </Text>
                  <Text style={styles.summaryLabel}>Resolvidas</Text>
                </View>
              </View>
            </View>
          </View>

          <FlatList
            data={ownReports}
            keyExtractor={(item) => item.id}
            renderItem={renderReport}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                Você ainda não criou nenhuma denúncia nesta conta.
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={profileModal} transparent animationType="slide" onRequestClose={() => setProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.rowBetween}>
                <Text style={styles.modalTitle}>Meu perfil</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setProfileModal(false)}>
                  <Feather name="x" size={22} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {currentUser.fotoPerfil ? (
                <Image source={{ uri: currentUser.fotoPerfil }} style={styles.avatarLarge} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Feather name="user" size={38} color="#166534" />
                </View>
              )}

              <Text style={styles.profileName}>{currentUser.nome}</Text>
              <Text style={styles.profileMeta}>{currentUser.email}</Text>
              <Text style={styles.profileMeta}>Tipo: {currentUser.tipo}</Text>
              <Text style={styles.profileMeta}>Telefone: {currentUser.telefone || "Não informado"}</Text>
              <Text style={styles.profileMeta}>Cidade: {currentUser.cidade || "Não informada"}</Text>
              <Text style={styles.detailText}>{currentUser.bio || "Sem bio cadastrada."}</Text>

              <Button title="Editar perfil" icon="edit-3" onPress={() => setEditProfileModal(true)} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editProfileModal} transparent animationType="slide" onRequestClose={() => setEditProfileModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.rowBetween}>
                <Text style={styles.modalTitle}>Editar perfil</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setEditProfileModal(false)}>
                  <Feather name="x" size={22} color="#0F172A" />
                </TouchableOpacity>
              </View>

              <Button title="Alterar foto" variant="soft" icon="camera" onPress={pickProfileImage} />

              {profileForm.fotoPerfil ? (
                <Image source={{ uri: profileForm.fotoPerfil }} style={styles.avatarLarge} />
              ) : null}

              <Field label="Nome" value={profileForm.nome} onChangeText={(value) => setProfileForm({ ...profileForm, nome: value })} />
              <Field label="E-mail" value={profileForm.email} onChangeText={(value) => setProfileForm({ ...profileForm, email: value })} />
              <Field label="Telefone" value={profileForm.telefone} onChangeText={(value) => setProfileForm({ ...profileForm, telefone: value })} />
              <Field label="CEP" value={profileForm.cep} onChangeText={(value) => setProfileForm({ ...profileForm, cep: value })} />
              <Field label="Endereço" value={profileForm.endereco} onChangeText={(value) => setProfileForm({ ...profileForm, endereco: value })} />
              <Field label="Cidade" value={profileForm.cidade} onChangeText={(value) => setProfileForm({ ...profileForm, cidade: value })} />
              <Field label="Bio" value={profileForm.bio} onChangeText={(value) => setProfileForm({ ...profileForm, bio: value })} multiline />

              <Button title="Salvar perfil" icon="save" onPress={saveProfile} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={shareModal} transparent animationType="fade" onRequestClose={() => setShareModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Buscar por código</Text>
            <TextInput
              value={shareSearch}
              onChangeText={setShareSearch}
              placeholder="Ex: ECO-QUEIMADA-12345"
              autoCapitalize="characters"
              style={styles.modalInput}
              placeholderTextColor="#94A3B8"
            />
            <Button title="Abrir denúncia" icon="search" onPress={openReportByCode} />
            <Button title="Cancelar" variant="soft" icon="x" onPress={() => setShareModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={solutionModal} transparent animationType="slide" onRequestClose={() => setSolutionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.rowBetween}>
                <Text style={styles.modalTitle}>Solucionar caso</Text>
                <TouchableOpacity style={styles.closeButton} onPress={() => setSolutionModal(false)}>
                  <Feather name="x" size={22} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {solutionReport ? (
                <View style={styles.solutionCaseBox}>
                  <Text style={styles.solutionCaseTitle}>{solutionReport.tipo}</Text>
                  <Text style={styles.reportDescription}>{solutionReport.descricao}</Text>
                </View>
              ) : null}

              <Field
                label="O que foi resolvido?"
                value={solutionForm.descricao}
                onChangeText={(value) => setSolutionForm({ ...solutionForm, descricao: value })}
                placeholder="Ex: A equipe foi ao local, controlou a ocorrência e registrou evidências."
                multiline
              />

              <Button title="Anexar imagem da solução" variant="soft" icon="image" onPress={pickSolutionImage} />

              {solutionForm.imagem ? (
                <Image source={{ uri: solutionForm.imagem }} style={styles.detailImage} />
              ) : null}

              <Button title="Salvar solução" icon="check" onPress={saveSolution} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={logsModal} transparent animationType="slide" onRequestClose={() => setLogsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCardLarge}>
            <View style={styles.rowBetween}>
              <Text style={styles.modalTitle}>Logs de auditoria</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setLogsModal(false)}>
                <Feather name="x" size={22} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={auditLogs}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.logItem}>
                  <Text style={styles.logAction}>{item.action}</Text>
                  <Text style={styles.logText}>
                    {item.date} • {item.userName} ({item.userType})
                  </Text>
                  <Text style={styles.logText}>{JSON.stringify(item.details)}</Text>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>Nenhum log registrado.</Text>}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F3",
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  summaryCard: {
    backgroundColor: "#064E3B",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
  },
  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900",
  },
  summarySubtitle: {
    color: "#BBF7D0",
    marginTop: 5,
    lineHeight: 19,
    fontSize: 13,
  },
  summaryNumbers: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
  },
  summaryLabel: {
    color: "#BBF7D0",
    fontSize: 10,
    marginTop: 2,
    fontWeight: "700",
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    height: 34,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  primaryAction: {
    flexGrow: 1,
    flexBasis: "100%",
    backgroundColor: "#15803D",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  secondaryAction: {
    flexGrow: 1,
    flexBasis: "30%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  secondaryActionText: {
    color: "#166534",
    fontWeight: "900",
  },
  searchBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    color: "#0F172A",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    columnGap: 8,
    rowGap: 8,
    marginBottom: 14,
  },
  filterChip: {
    minWidth: 92,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  filterChipText: {
    color: "#166534",
    fontWeight: "900",
    fontSize: 12,
    textAlign: "center",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionTitle: {
    color: "#064E3B",
    fontSize: 18,
    fontWeight: "900",
  },
  sectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 30,
  },
  reportCard: {
    marginHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  reportImage: {
    width: "100%",
    height: 190,
  },
  reportMediaBox: {
  width: "100%",
  height: 190,
  position: "relative",
  backgroundColor: "#0F172A",
},
  reportVideoBox: {
    width: "100%",
    height: 190,
    backgroundColor: "#0F172A",
    position: "relative",
  },
  reportVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0F172A",
  },
  videoBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  videoBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  imagePlaceholder: {
    height: 150,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  imagePlaceholderText: {
    color: "#64748B",
    fontWeight: "700",
    marginTop: 6,
  },
  reportContent: {
    padding: 15,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  reportType: {
    flex: 1,
    color: "#064E3B",
    fontSize: 17,
    fontWeight: "900",
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusAnalysis: {
    backgroundColor: "#DBEAFE",
  },
  statusDone: {
    backgroundColor: "#DCFCE7",
  },
  statusText: {
    color: "#14532D",
    fontSize: 11,
    fontWeight: "900",
  },
  reportDescription: {
    color: "#475569",
    marginTop: 10,
    lineHeight: 20,
  },
  reportInfoRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 13,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  reportMeta: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  codeBox: {
    marginTop: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  shareCode: {
    color: "#166534",
    fontWeight: "900",
    flex: 1,
    fontSize: 12,
  },
  emptyText: {
    marginHorizontal: 16,
    color: "#64748B",
    textAlign: "center",
    marginTop: 30,
    fontWeight: "700",
  },

  likeButton: {
    backgroundColor: "#DCFCE7",
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  likeButtonText: {
    color: "#166534",
    fontWeight: "900",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
  },
  modalCardLarge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    maxHeight: "88%",
  },
  modalTitle: {
    color: "#064E3B",
    fontSize: 20,
    fontWeight: "900",
    flex: 1,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  detailImage: {
    width: "100%",
    height: 210,
    borderRadius: 20,
    marginTop: 14,
    marginBottom: 14,
  },
  detailVideoBox: {
    width: "100%",
    height: 260,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    marginTop: 14,
    marginBottom: 14,
  },
  detailVideo: {
    width: "100%",
    height: "100%",
    backgroundColor: "#0F172A",
  },
  detailText: {
    color: "#334155",
    lineHeight: 21,
    marginTop: 12,
  },
  detailBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  detailLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
  },
  detailValue: {
    color: "#0F172A",
    fontWeight: "800",
    marginTop: 3,
  },
  hashText: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 10,
  },
  videoNotice: {
    marginTop: 12,
    backgroundColor: "#DCFCE7",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  videoNoticeText: {
    color: "#166534",
    fontWeight: "900",
  },
  analysisBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },

  analysisTitle: {
    color: "#1D4ED8",
    fontWeight: "900",
    fontSize: 16,
  },

  solutionBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  solutionTitle: {
    color: "#064E3B",
    fontWeight: "900",
    fontSize: 16,
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0F172A",
    marginTop: 15,
  },
  avatarLarge: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignSelf: "center",
    marginTop: 16,
    marginBottom: 14,
  },
  avatarFallback: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: "#DCFCE7",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 14,
  },
  profileName: {
    textAlign: "center",
    color: "#064E3B",
    fontWeight: "900",
    fontSize: 20,
  },
  profileMeta: {
    textAlign: "center",
    color: "#64748B",
    fontWeight: "700",
    marginTop: 5,
  },
  solutionCaseBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 14,
    marginTop: 14,
    marginBottom: 12,
  },
  solutionCaseTitle: {
    color: "#064E3B",
    fontSize: 16,
    fontWeight: "900",
  },

  notificationSummary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1FAE5",
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  notificationSummaryTitle: {
    color: "#064E3B",
    fontSize: 16,
    fontWeight: "900",
  },

  notificationSummaryText: {
    color: "#64748B",
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },

  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    gap: 12,
  },

  notificationCardUnread: {
    borderColor: "#86EFAC",
    backgroundColor: "#F0FDF4",
  },

  notificationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },

  notificationContent: {
    flex: 1,
  },

  notificationTitle: {
    flex: 1,
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
  },

  notificationMessage: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },

  notificationDate: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 7,
  },

  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#16A34A",
  },

  logItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 10,
  },
  logAction: {
    color: "#064E3B",
    fontWeight: "900",
  },
  logText: {
    color: "#64748B",
    marginTop: 4,
    fontSize: 12,
  },
  
});
