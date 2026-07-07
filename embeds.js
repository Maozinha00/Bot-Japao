"const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
const config = require("./config");

// ─── Painel de Registro ───────────────────────────────────────────────────────

function criarPainelRegistro() {
  const embed = new EmbedBuilder()
    .setColor(config.COR_PRINCIPAL)
    .setTitle(📋 Registro — ${config.NOME_FACCAO})
    .setDescription(
      [
        > Bem-vindo ao sistema de registro da **${config.NOME_FACCAO}**!,
        "",
        "Para se tornar um membro oficial, clique no botão abaixo e preencha o formulário com:",
        "‣ **Nome RP** — seu nome no roleplay",
        "‣ **ID / Passaporte** — seu identificador no servidor",
        "",
        "Sua solicitação será analisada pela **Gerencia** e você receberá uma notificação no privado com o resultado.",
        "",
        "⚠️ Certifique-se de que suas **mensagens diretas** estão abertas.",
      ].join("\n")
    )
    .setFooter({ text: ${config.NOME_FACCAO} • Sistema de Registro Automático })
    .setTimestamp();

  const botao = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_abrir_registro")
      .setLabel("📝  Registrar")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [botao] };
}

// ─── Solicitação de Aprovação (canal da Gerencia) ────────────────────────────────

function criarEmbedPendente(member, nomeRP, idPassaporte) {
  const embed = new EmbedBuilder()
    .setColor(config.COR_PENDENTE)
    .setTitle("🔔 Nova Solicitação de Registro")
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
    .addFields(
      { name: "👤 Usuário Discord", value: ${member.user.tag} (${member.user.id}), inline: false },
      { name: "🎭 Nome RP",         value: nomeRP,        inline: true  },
      { name: "🪪 ID / Passaporte", value: idPassaporte,  inline: true  }
    )
    .setFooter({ text: "Use os botões abaixo para aprovar ou recusar." })
    .setTimestamp();

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(btn_aprovar_${member.id})
      .setLabel("✅  Aprovar")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(btn_recusar_${member.id})
      .setLabel("❌  Recusar")
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [botoes] };
}

// ─── DM — Aprovado ────────────────────────────────────────────────────────────

function criarEmbedAprovado(nomeRP, idPassaporte) {
  return new EmbedBuilder()
    .setColor(config.COR_APROVADO)
    .setTitle("✅ Registro Aprovado!")
    .setDescription(
      [
        Parabéns! Seu registro na **${config.NOME_FACCAO}** foi **aprovado** pela Gerencia.,
        "",
        **Nome RP:** ${nomeRP},
        **ID/Passaporte:** ${idPassaporte},
        "",
        "Seu cargo e apelido foram configurados automaticamente. Bem-vindo(a)! 🎉",
      ].join("\n")
    )
    .setTimestamp();
}

// ─── DM — Recusado ────────────────────────────────────────────────────────────

function criarEmbedRecusado(nomeRP) {
  return new EmbedBuilder()
    .setColor(config.COR_RECUSADO)
    .setTitle("❌ Registro Recusado")
    .setDescription(
      [
        Infelizmente seu registro na **${config.NOME_FACCAO}** foi **recusado** pela Gerencia .,
        "",
        **Nome RP tentado:** ${nomeRP},
        "",
        "Caso acredite que houve um engano, entre em contato com a liderança.",
      ].join("\n")
    )
    .setTimestamp();
}

// ─── Embed de Log ─────────────────────────────────────────────────────────────

function criarEmbedLog(tipo, staffMember, targetMember, nomeRP, idPassaporte) {
  const aprovado = tipo === "aprovado";
  return new EmbedBuilder()
    .setColor(aprovado ? config.COR_APROVADO : config.COR_RECUSADO)
    .setTitle(aprovado ? "📗 Registro Aprovado" : "📕 Registro Recusado")
    .addFields(
      { name: "Membro",       value: ${targetMember.user.tag} (${targetMember.id}), inline: true },
      { name: "Gerente",        value: ${staffMember.user.tag},                       inline: true },
      { name: "Nome RP",      value: nomeRP,                                          inline: true },
      { name: "ID/Passaporte",value: idPassaporte,                                    inline: true }
    )
    .setTimestamp();
}

module.exports = {
  criarPainelRegistro,
  criarEmbedPendente,
  criarEmbedAprovado,
  criarEmbedRecusado,
  criarEmbedLog,
};"
