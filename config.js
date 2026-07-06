/**
 * Configuração Oficial do Bot — Rec do Japão
 * Copie este arquivo como "config.js" na mesma pasta do bot.
 */
module.exports = {
  GUILD_ID: "1495178024759332914",
  CANAL_REGISTRO_ID: "1495178025602515177",
  CANAL_APROVACAO_ID: "1495790507182522450", // canal onde a staff vê e aprova/recusa
  CANAL_LOGS_ID: "1495178025602515177",
  CARGO_MEMBRO_ID: "1495178024759332915",
  PREFIXO_APELIDO: "[M]",
  NOME_FACCAO: "Rec do Japão",
  COOLDOWN_MS: 30000, // 30 segundos de anti-spam

  // Cores dos embeds
  COR_PRINCIPAL: 2829617, // Hex: #2b2d31
  COR_PENDENTE: 15770880,   // Hex: #f0a500
  COR_APROVADO: 5763719,   // Hex: #57f287
  COR_RECUSADO: 15548997,   // Hex: #ed4245

  // Arquivo para persistência de painéis e pendentes
  ARQUIVO_DADOS: "./dados.json"
};
