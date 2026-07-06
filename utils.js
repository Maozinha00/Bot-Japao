const fs = require("fs");
const config = require("./config");

// ─── Persistência ────────────────────────────────────────────────────────────

function carregarDados() {
  try {
    const raw = fs.readFileSync(config.ARQUIVO_DADOS, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      painelMensagemId: null,
      pendentes: {},
      aprovados: [],
      recusados: [],
      blacklist: [],
    };
  }
}

function salvarDados(dados) {
  fs.writeFileSync(config.ARQUIVO_DADOS, JSON.stringify(dados, null, 2), "utf8");
}

// ─── Anti-Spam (cooldown em memória) ─────────────────────────────────────────

const cooldowns = new Map();

function checarCooldown(userId) {
  const agora = Date.now();
  if (cooldowns.has(userId)) {
    const ultimo = cooldowns.get(userId);
    const restante = config.COOLDOWN_MS - (agora - ultimo);
    if (restante > 0) return Math.ceil(restante / 1000); // retorna segundos restantes
  }
  cooldowns.set(userId, agora);
  return 0; // sem cooldown
}

// ─── Validações ──────────────────────────────────────────────────────────────

function validarNomeRP(nome) {
  if (!nome || nome.trim().length < 3) return "Nome RP muito curto (mínimo 3 caracteres).";
  if (nome.trim().length > 40)        return "Nome RP muito longo (máximo 40 caracteres).";
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s'-]+$/.test(nome.trim()))
    return "Nome RP contém caracteres inválidos.";
  return null;
}

function validarIDPassaporte(id) {
  if (!id || id.trim().length < 2) return "ID/Passaporte muito curto.";
  if (id.trim().length > 20)       return "ID/Passaporte muito longo (máximo 20 caracteres).";
  return null;
}

// ─── Exportações ─────────────────────────────────────────────────────────────

module.exports = {
  carregarDados,
  salvarDados,
  checarCooldown,
  validarNomeRP,
  validarIDPassaporte,
};
