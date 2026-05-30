require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "25mb" }));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

function hashText(value) {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function nowBr() {
  return new Date().toLocaleString("pt-BR");
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;

  if (typeof value === "object") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function normalizeLookup(value) {
  return String(value || "").trim().toLowerCase();
}

async function query(sql, params = []) {
  return pool.query(sql, params);
}

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome || "",
    usuario: row.usuario || "",
    email: row.email || "",
    cpf: row.cpf || "",
    cep: row.cep || "",
    telefone: row.telefone || "",
    endereco: row.endereco || "",
    cidade: row.cidade || "",
    bio: row.bio || "",
    fotoPerfil: row.fotoperfil || "",
    pergunta1: row.pergunta1 || "",
    pergunta2: row.pergunta2 || "",
    tipo: row.tipo || "usuario",
    createdAt: row.createdat || "",
    updatedAt: row.updatedat || "",
  };
}

function mapReport(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.userid,
    userName: row.username || "",
    tipo: row.tipo || "",
    descricao: row.descricao || "",
    status: row.status || "Em análise",
    data: row.data || "",
    createdAt: row.createdat || "",
    latitude: row.latitude,
    longitude: row.longitude,
    imagem: row.imagem || null,
    video: row.video || null,
    evidenceHash: row.evidencehash || "",
    likes: Number(row.likes || 0),
    likedBy: safeJsonParse(row.likedby, []),
    shareCode: row.sharecode || "",
    solution: safeJsonParse(row.solution, null),
  };
}

function mapNotification(row) {
  if (!row) return null;

  return {
    id: row.id,
    userId: row.userid,
    reportId: row.reportid || null,
    title: row.title || "",
    message: row.message || "",
    type: row.type || "info",
    read: Boolean(row.read),
    createdAt: row.createdat || "",
    date: row.date || "",
  };
}

function mapAuditLog(row) {
  if (!row) return null;

  return {
    id: row.id,
    action: row.action || "",
    details: safeJsonParse(row.details, {}),
    userId: row.userid || "",
    userName: row.username || "",
    userType: row.usertype || "",
    createdAt: row.createdat || "",
    date: row.date || "",
  };
}

async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      usuario TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      cpf TEXT NOT NULL UNIQUE,
      cep TEXT,
      telefone TEXT,
      endereco TEXT,
      cidade TEXT,
      bio TEXT,
      fotoPerfil TEXT,
      senhaHash TEXT NOT NULL,
      pergunta1 TEXT,
      resposta1 TEXT,
      pergunta2 TEXT,
      resposta2 TEXT,
      tipo TEXT NOT NULL DEFAULT 'usuario',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      userName TEXT,
      tipo TEXT NOT NULL,
      descricao TEXT NOT NULL,
      status TEXT NOT NULL,
      data TEXT,
      createdAt TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      imagem TEXT,
      video TEXT,
      evidenceHash TEXT,
      likes INTEGER DEFAULT 0,
      likedBy TEXT DEFAULT '[]',
      shareCode TEXT,
      solution TEXT
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      reportId TEXT,
      title TEXT,
      message TEXT,
      type TEXT,
      read BOOLEAN DEFAULT false,
      createdAt TEXT NOT NULL,
      date TEXT
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT,
      userId TEXT,
      userName TEXT,
      userType TEXT,
      createdAt TEXT NOT NULL,
      date TEXT
    );
  `);

  const adminResult = await query(
    "SELECT * FROM users WHERE usuario = $1 LIMIT 1",
    ["admin"]
  );

  if (adminResult.rows.length === 0) {
    const createdAt = nowIso();

    await query(
      `
      INSERT INTO users (
        id, nome, usuario, email, cpf, cep, telefone, endereco, cidade, bio,
        fotoPerfil, senhaHash, pergunta1, resposta1, pergunta2, resposta2,
        tipo, createdAt, updatedAt
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      `,
      [
        "admin-001",
        "Administrador EcoGuard",
        "admin",
        "admin@ecoguard.com",
        "00000000000",
        "00000000",
        "",
        "",
        "",
        "Conta administrativa do EcoGuard.",
        "",
        hashText("admin123"),
        "Administrador",
        "admin",
        "EcoGuard",
        "ecoguard",
        "admin",
        createdAt,
        createdAt,
      ]
    );
  }
}

async function addAuditLog(action, details = {}, user = null) {
  const log = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    action,
    details: JSON.stringify(details || {}),
    userId: user?.id || "sistema",
    userName: user?.nome || user?.usuario || "Sistema",
    userType: user?.tipo || "sistema",
    createdAt: nowIso(),
    date: nowBr(),
  };

  await query(
    `
    INSERT INTO audit_logs (
      id, action, details, userId, userName, userType, createdAt, date
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
    [
      log.id,
      log.action,
      log.details,
      log.userId,
      log.userName,
      log.userType,
      log.createdAt,
      log.date,
    ]
  );

  return log;
}

app.get("/", (req, res) => {
  res.json({
    message: "API EcoGuard funcionando!",
    status: "online",
  });
});

app.get("/health", async (req, res) => {
  try {
    await query("SELECT 1");

    res.json({
      status: "ok",
      message: "Servidor EcoGuard online e conectado ao PostgreSQL",
      timestamp: nowIso(),
    });
  } catch (error) {
    res.status(500).json({
      status: "erro",
      message: "Servidor online, mas sem conexão com o banco.",
      error: error.message,
    });
  }
});

app.get("/criar-tabelas", async (req, res) => {
  try {
    await initDb();

    res.json({
      message: "Tabelas criadas/verificadas com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao criar tabelas.",
      error: error.message,
    });
  }
});

app.get("/bootstrap", async (req, res) => {
  try {
    const usersResult = await query("SELECT * FROM users ORDER BY createdAt DESC");
    const reportsResult = await query("SELECT * FROM reports ORDER BY createdAt DESC");
    const notificationsResult = await query(
      "SELECT * FROM notifications ORDER BY createdAt DESC"
    );
    const logsResult = await query(
      "SELECT * FROM audit_logs ORDER BY createdAt DESC"
    );

    res.json({
      users: usersResult.rows.map(mapUser),
      reports: reportsResult.rows.map(mapReport),
      notifications: notificationsResult.rows.map(mapNotification),
      auditLogs: logsResult.rows.map(mapAuditLog),
    });
  } catch (error) {
    res.status(500).json({
      message: "Não foi possível carregar os dados iniciais.",
      error: error.message,
    });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { usuario, senha, tipo } = req.body;

    if (!usuario || !senha) {
      return res.status(400).json({
        message: "Informe usuário e senha.",
      });
    }

    const result = await query(
      "SELECT * FROM users WHERE LOWER(usuario) = $1 LIMIT 1",
      [normalizeLookup(usuario)]
    );

    const user = result.rows[0];

    if (!user) {
      await addAuditLog("login_falhou", {
        usuario,
        tipo,
        motivo: "usuario_nao_encontrado",
      });

      return res.status(404).json({
        message:
          tipo === "admin"
            ? "Administrador não encontrado."
            : "Usuário não cadastrado.",
      });
    }

    if (tipo && user.tipo !== tipo) {
      await addAuditLog(
        "login_falhou",
        {
          usuario,
          tipo,
          motivo: "tipo_incorreto",
        },
        user
      );

      return res.status(401).json({
        message: "Tipo de conta incorreto.",
      });
    }

    if (user.senhahash !== hashText(senha)) {
      await addAuditLog(
        "login_falhou",
        {
          usuario,
          tipo,
          motivo: "senha_incorreta",
        },
        user
      );

      return res.status(401).json({
        message: "Senha incorreta.",
      });
    }

    await addAuditLog("login_sucesso", { tipo: user.tipo }, user);

    res.json({
      user: mapUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao realizar login.",
      error: error.message,
    });
  }
});

app.get("/users", async (req, res) => {
  try {
    const result = await query("SELECT * FROM users ORDER BY createdAt DESC");

    res.json({
      users: result.rows.map(mapUser),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao listar usuários.",
      error: error.message,
    });
  }
});

app.post("/users", async (req, res) => {
  try {
    const {
      nome,
      cpf,
      usuario,
      email,
      cep,
      telefone,
      endereco,
      cidade,
      bio,
      senha,
      pergunta1,
      resposta1,
      pergunta2,
      resposta2,
    } = req.body;

    if (!nome || !cpf || !usuario || !email || !senha) {
      return res.status(400).json({
        message: "Preencha nome, CPF, usuário, e-mail e senha.",
      });
    }

    const cleanCpf = String(cpf || "").replace(/\D/g, "");
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanUsuario = String(usuario || "").trim();

    const exists = await query(
      `
      SELECT * FROM users
      WHERE LOWER(usuario) = $1 OR LOWER(email) = $2 OR cpf = $3
      LIMIT 1
      `,
      [normalizeLookup(cleanUsuario), cleanEmail, cleanCpf]
    );

    if (exists.rows.length > 0) {
      return res.status(409).json({
        message: "Já existe uma conta com esse usuário, CPF ou e-mail.",
      });
    }

    const createdAt = nowIso();

    const newUser = {
      id: `user-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      nome: String(nome || "").trim(),
      cpf: cleanCpf,
      usuario: cleanUsuario,
      email: cleanEmail,
      cep: String(cep || "").replace(/\D/g, ""),
      telefone: String(telefone || "").trim(),
      endereco: String(endereco || "").trim(),
      cidade: String(cidade || "").trim(),
      bio: String(bio || "").trim(),
      fotoPerfil: "",
      senhaHash: hashText(senha),
      pergunta1: String(pergunta1 || "").trim(),
      resposta1: String(resposta1 || "").trim(),
      pergunta2: String(pergunta2 || "").trim(),
      resposta2: String(resposta2 || "").trim(),
      tipo: "usuario",
      createdAt,
      updatedAt: createdAt,
    };

    await query(
      `
      INSERT INTO users (
        id, nome, cpf, usuario, email, cep, telefone, endereco, cidade, bio,
        fotoPerfil, senhaHash, pergunta1, resposta1, pergunta2, resposta2,
        tipo, createdAt, updatedAt
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
      `,
      [
        newUser.id,
        newUser.nome,
        newUser.cpf,
        newUser.usuario,
        newUser.email,
        newUser.cep,
        newUser.telefone,
        newUser.endereco,
        newUser.cidade,
        newUser.bio,
        newUser.fotoPerfil,
        newUser.senhaHash,
        newUser.pergunta1,
        newUser.resposta1,
        newUser.pergunta2,
        newUser.resposta2,
        newUser.tipo,
        newUser.createdAt,
        newUser.updatedAt,
      ]
    );

    await addAuditLog(
      "cadastro_usuario",
      {
        usuario: newUser.usuario,
        email: newUser.email,
      },
      newUser
    );

    res.status(201).json({
      message: "Cadastro realizado com sucesso.",
      user: mapUser(newUser),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao cadastrar usuário.",
      error: error.message,
    });
  }
});

app.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const currentResult = await query("SELECT * FROM users WHERE id = $1", [id]);
    const currentUser = currentResult.rows[0];

    if (!currentUser) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    const updated = {
      nome: req.body.nome ?? currentUser.nome,
      email: req.body.email ?? currentUser.email,
      telefone: req.body.telefone ?? currentUser.telefone,
      endereco: req.body.endereco ?? currentUser.endereco,
      cidade: req.body.cidade ?? currentUser.cidade,
      bio: req.body.bio ?? currentUser.bio,
      fotoPerfil: req.body.fotoPerfil ?? currentUser.fotoperfil,
      updatedAt: nowIso(),
    };

    await query(
      `
      UPDATE users SET
        nome = $1,
        email = $2,
        telefone = $3,
        endereco = $4,
        cidade = $5,
        bio = $6,
        fotoPerfil = $7,
        updatedAt = $8
      WHERE id = $9
      `,
      [
        updated.nome,
        updated.email,
        updated.telefone,
        updated.endereco,
        updated.cidade,
        updated.bio,
        updated.fotoPerfil,
        updated.updatedAt,
        id,
      ]
    );

    const savedResult = await query("SELECT * FROM users WHERE id = $1", [id]);
    const savedUser = savedResult.rows[0];

    await addAuditLog("perfil_atualizado", { alvo: id }, savedUser);

    res.json({
      user: mapUser(savedUser),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao atualizar usuário.",
      error: error.message,
    });
  }
});

app.post("/auth/recover/find", async (req, res) => {
  try {
    const { usuario, cpf } = req.body;

    const result = await query(
      `
      SELECT * FROM users
      WHERE LOWER(usuario) = $1 AND cpf = $2 AND tipo = 'usuario'
      LIMIT 1
      `,
      [normalizeLookup(usuario), String(cpf || "").replace(/\D/g, "")]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        message: "Usuário ou CPF não encontrado.",
      });
    }

    res.json({
      user: {
        id: user.id,
        usuario: user.usuario,
        cpf: user.cpf,
        pergunta1: user.pergunta1,
        pergunta2: user.pergunta2,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao localizar usuário.",
      error: error.message,
    });
  }
});

app.post("/auth/recover/verify", async (req, res) => {
  try {
    const { userId, resposta1, resposta2 } = req.body;

    const result = await query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    const resposta1Correta =
      normalizeLookup(user.resposta1) === normalizeLookup(resposta1);

    const resposta2Correta =
      normalizeLookup(user.resposta2) === normalizeLookup(resposta2);

    if (!resposta1Correta || !resposta2Correta) {
      return res.status(401).json({
        message: "Uma ou mais respostas de segurança estão incorretas.",
      });
    }

    res.json({
      message: "Respostas confirmadas.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao verificar respostas.",
      error: error.message,
    });
  }
});

app.post("/auth/recover/reset", async (req, res) => {
  try {
    const { userId, novaSenha, confirmarSenha } = req.body;

    if (!novaSenha || !confirmarSenha) {
      return res.status(400).json({
        message: "Digite e confirme a nova senha.",
      });
    }

    if (novaSenha !== confirmarSenha) {
      return res.status(400).json({
        message: "As senhas não coincidem.",
      });
    }

    const result = await query("SELECT * FROM users WHERE id = $1", [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        message: "Usuário não encontrado.",
      });
    }

    await query(
      "UPDATE users SET senhaHash = $1, updatedAt = $2 WHERE id = $3",
      [hashText(novaSenha), nowIso(), userId]
    );

    await addAuditLog("senha_redefinida", { usuario: user.usuario }, user);

    res.json({
      message: "Senha redefinida com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao redefinir senha.",
      error: error.message,
    });
  }
});

app.get("/reports", async (req, res) => {
  try {
    const result = await query("SELECT * FROM reports ORDER BY createdAt DESC");

    res.json({
      reports: result.rows.map(mapReport),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao listar denúncias.",
      error: error.message,
    });
  }
});

app.post("/reports", async (req, res) => {
  try {
    const report = req.body;

    const newReport = {
      id: report.id || `rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: report.userId,
      userName: report.userName || "",
      tipo: report.tipo || "",
      descricao: report.descricao || "",
      status: report.status || "Em análise",
      data: report.data || new Date().toLocaleDateString("pt-BR"),
      createdAt: report.createdAt || nowIso(),
      latitude: report.latitude || null,
      longitude: report.longitude || null,
      imagem: report.imagem || null,
      video: report.video || null,
      evidenceHash: report.evidenceHash || "",
      likes: Number(report.likes || 0),
      likedBy: JSON.stringify(report.likedBy || []),
      shareCode:
        report.shareCode ||
        `ECO-${String(report.tipo || "DENUNCIA").toUpperCase()}-${Date.now()}`,
      solution: JSON.stringify(report.solution || null),
    };

    await query(
      `
      INSERT INTO reports (
        id, userId, userName, tipo, descricao, status, data, createdAt,
        latitude, longitude, imagem, video, evidenceHash, likes, likedBy,
        shareCode, solution
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15,
        $16, $17
      )
      `,
      [
        newReport.id,
        newReport.userId,
        newReport.userName,
        newReport.tipo,
        newReport.descricao,
        newReport.status,
        newReport.data,
        newReport.createdAt,
        newReport.latitude,
        newReport.longitude,
        newReport.imagem,
        newReport.video,
        newReport.evidenceHash,
        newReport.likes,
        newReport.likedBy,
        newReport.shareCode,
        newReport.solution,
      ]
    );

    await addAuditLog("denuncia_criada", {
      reportId: newReport.id,
      tipo: newReport.tipo,
    });

    const saved = await query("SELECT * FROM reports WHERE id = $1", [
      newReport.id,
    ]);

    res.status(201).json({
      report: mapReport(saved.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao criar denúncia.",
      error: error.message,
    });
  }
});

app.put("/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const currentResult = await query("SELECT * FROM reports WHERE id = $1", [
      id,
    ]);

    const currentReport = currentResult.rows[0];

    if (!currentReport) {
      return res.status(404).json({
        message: "Denúncia não encontrada.",
      });
    }

    const updated = {
      userName: req.body.userName ?? currentReport.username,
      tipo: req.body.tipo ?? currentReport.tipo,
      descricao: req.body.descricao ?? currentReport.descricao,
      status: req.body.status ?? currentReport.status,
      data: req.body.data ?? currentReport.data,
      latitude: req.body.latitude ?? currentReport.latitude,
      longitude: req.body.longitude ?? currentReport.longitude,
      imagem: req.body.imagem ?? currentReport.imagem,
      video: req.body.video ?? currentReport.video,
      evidenceHash: req.body.evidenceHash ?? currentReport.evidencehash,
      likes: req.body.likes ?? currentReport.likes,
      likedBy: JSON.stringify(
        req.body.likedBy ?? safeJsonParse(currentReport.likedby, [])
      ),
      shareCode: req.body.shareCode ?? currentReport.sharecode,
      solution: JSON.stringify(
        req.body.solution ?? safeJsonParse(currentReport.solution, null)
      ),
    };

    await query(
      `
      UPDATE reports SET
        userName = $1,
        tipo = $2,
        descricao = $3,
        status = $4,
        data = $5,
        latitude = $6,
        longitude = $7,
        imagem = $8,
        video = $9,
        evidenceHash = $10,
        likes = $11,
        likedBy = $12,
        shareCode = $13,
        solution = $14
      WHERE id = $15
      `,
      [
        updated.userName,
        updated.tipo,
        updated.descricao,
        updated.status,
        updated.data,
        updated.latitude,
        updated.longitude,
        updated.imagem,
        updated.video,
        updated.evidenceHash,
        updated.likes,
        updated.likedBy,
        updated.shareCode,
        updated.solution,
        id,
      ]
    );

    await addAuditLog("denuncia_atualizada", {
      reportId: id,
      status: updated.status,
    });

    const saved = await query("SELECT * FROM reports WHERE id = $1", [id]);

    res.json({
      report: mapReport(saved.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao atualizar denúncia.",
      error: error.message,
    });
  }
});

app.delete("/reports/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await query("DELETE FROM reports WHERE id = $1", [id]);

    await addAuditLog("denuncia_excluida", {
      reportId: id,
    });

    res.json({
      message: "Denúncia excluída com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao excluir denúncia.",
      error: error.message,
    });
  }
});

app.post("/reports/sync", async (req, res) => {
  try {
    const { reports } = req.body;

    if (!Array.isArray(reports)) {
      return res.status(400).json({
        message: "Lista de denúncias inválida.",
      });
    }

    await query("DELETE FROM reports");

    for (const report of reports) {
      await query(
        `
        INSERT INTO reports (
          id, userId, userName, tipo, descricao, status, data, createdAt,
          latitude, longitude, imagem, video, evidenceHash, likes, likedBy,
          shareCode, solution
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15,
          $16, $17
        )
        `,
        [
          report.id || `rep-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          report.userId || "sistema",
          report.userName || "",
          report.tipo || "",
          report.descricao || "",
          report.status || "Em análise",
          report.data || new Date().toLocaleDateString("pt-BR"),
          report.createdAt || nowIso(),
          report.latitude || null,
          report.longitude || null,
          report.imagem || null,
          report.video || null,
          report.evidenceHash || "",
          Number(report.likes || 0),
          JSON.stringify(report.likedBy || []),
          report.shareCode || "",
          JSON.stringify(report.solution || null),
        ]
      );
    }

    const result = await query("SELECT * FROM reports ORDER BY createdAt DESC");

    res.json({
      reports: result.rows.map(mapReport),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao sincronizar denúncias.",
      error: error.message,
    });
  }
});

app.get("/notifications/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      "SELECT * FROM notifications WHERE userId = $1 ORDER BY createdAt DESC",
      [userId]
    );

    res.json({
      notifications: result.rows.map(mapNotification),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao listar notificações.",
      error: error.message,
    });
  }
});

app.post("/notifications", async (req, res) => {
  try {
    const notification = req.body;

    const newNotification = {
      id:
        notification.id ||
        `notif-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      userId: notification.userId,
      reportId: notification.reportId || null,
      title: notification.title || "Atualização EcoGuard",
      message: notification.message || "Você possui uma nova atualização.",
      type: notification.type || "info",
      read: Boolean(notification.read),
      createdAt: notification.createdAt || nowIso(),
      date: notification.date || nowBr(),
    };

    await query(
      `
      INSERT INTO notifications (
        id, userId, reportId, title, message, type, read, createdAt, date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        newNotification.id,
        newNotification.userId,
        newNotification.reportId,
        newNotification.title,
        newNotification.message,
        newNotification.type,
        newNotification.read,
        newNotification.createdAt,
        newNotification.date,
      ]
    );

    const saved = await query("SELECT * FROM notifications WHERE id = $1", [
      newNotification.id,
    ]);

    res.status(201).json({
      notification: mapNotification(saved.rows[0]),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao criar notificação.",
      error: error.message,
    });
  }
});

app.patch("/notifications/:id/read", async (req, res) => {
  try {
    const { id } = req.params;

    await query("UPDATE notifications SET read = true WHERE id = $1", [id]);

    res.json({
      message: "Notificação marcada como lida.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao marcar notificação.",
      error: error.message,
    });
  }
});

app.patch("/notifications/read-all/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    await query("UPDATE notifications SET read = true WHERE userId = $1", [
      userId,
    ]);

    res.json({
      message: "Todas as notificações foram marcadas como lidas.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao marcar notificações.",
      error: error.message,
    });
  }
});

app.get("/audit-logs", async (req, res) => {
  try {
    const result = await query("SELECT * FROM audit_logs ORDER BY createdAt DESC");

    res.json({
      auditLogs: result.rows.map(mapAuditLog),
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao listar logs.",
      error: error.message,
    });
  }
});

app.post("/audit-logs", async (req, res) => {
  try {
    const { action, details, user } = req.body;

    const log = await addAuditLog(action || "acao_app", details || {}, user || null);

    res.status(201).json({
      log,
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao criar log.",
      error: error.message,
    });
  }
});

app.get("/resetar-banco", async (req, res) => {
  try {
    await query(`
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS reports;
      DROP TABLE IF EXISTS users;
    `);

    await initDb();

    res.json({
      message: "Banco resetado com sucesso.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Erro ao resetar banco.",
      error: error.message,
    });
  }
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor EcoGuard rodando na porta ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Erro ao iniciar banco:", error);
    process.exit(1);
  });