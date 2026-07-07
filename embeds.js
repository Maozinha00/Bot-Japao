const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const config = require("./config");

// ======================================================================
// PAINEL DE REGISTRO
// ======================================================================

function criarPainelRegistro() {
  const embed = new EmbedBuilder()
    .setColor(config.COR_PRINCIPAL)
    .setAuthor({
      name: `${config.NOME_FACCAO} • Sistema de Registro`,
    })
    .setTitle("📋 Registro Oficial")
    .setDescription(
      [
        "# 👋 Bem-vindo!",
        "",
        `Você está iniciando seu registro para entrar na **${config.NOME_FACCAO}**.`,
        "",
        "### 📌 Informações necessárias",
        "• 🎭 Nome RP",
        "• 🪪 ID / Passaporte",
        "",
        "> Após enviar sua solicitação, ela será analisada pela **Gerência**.",
        "",
        "### ⚠️ Importante",
        "• Deixe sua DM aberta.",
        "• Utilize informações corretas.",
        "• Aguarde o retorno da equipe.",
      ].join("\n")
    )
    .setFooter({
      text: `${config.NOME_FACCAO} • Registro Automático`,
    })
    .setTimestamp();

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("btn_abrir_registro")
      .setLabel("Realizar Registro")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary)
  );

  return {
    embeds: [embed],
    components: [botoes],
  };
}

// ======================================================================
// SOLICITAÇÃO PARA GERÊNCIA
// ======================================================================

function criarEmbedPendente(member, nomeRP, idPassaporte) {
  const embed = new EmbedBuilder()
    .setColor(config.COR_PENDENTE)
    .setAuthor({
      name: "Nova Solicitação de Registro",
      iconURL: member.user.displayAvatarURL({ dynamic: true }),
    })
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 512 }))
    .addFields(
      {
        name: "👤 Discord",
        value: `${member.user.tag}\n\`${member.user.id}\``,
        inline: false,
      },
      {
        name: "🎭 Nome RP",
        value: `\`${nomeRP}\``,
        inline: true,
      },
      {
        name: "🪪 Passaporte",
        value: `\`${idPassaporte}\``,
        inline: true,
      }
    )
    .setDescription(
      "A solicitação aguarda análise da **Gerência**.\n\nEscolha uma das opções abaixo."
    )
    .setFooter({
      text: "Sistema Automático de Registro",
    })
    .setTimestamp();

  const botoes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_aprovar_${member.id}`)
      .setLabel("Aprovar")
      .setEmoji("✅")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`btn_recusar_${member.id}`)
      .setLabel("Recusar")
      .setEmoji("❌")
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [botoes],
  };
}

// ======================================================================
// DM APROVADO
// ======================================================================

function criarEmbedAprovado(nomeRP, idPassaporte) {
  return new EmbedBuilder()
    .setColor(config.COR_APROVADO)
    .setTitle("🎉 Registro Aprovado")
    .setDescription(
      [
        "Parabéns!",
        "",
        `Seu registro na **${config.NOME_FACCAO}** foi aprovado com sucesso.`,
        "",
        "### 📄 Seus dados",
        `🎭 **Nome RP:** \`${nomeRP}\``,
        `🪪 **Passaporte:** \`${idPassaporte}\``,
        "",
        "✅ Seu apelido foi atualizado.",
        "✅ Seu cargo foi configurado.",
        "",
        "Seja bem-vindo(a)! Desejamos um ótimo RP. ❤️",
      ].join("\n")
    )
    .setTimestamp();
}

// ======================================================================
// DM RECUSADO
// ======================================================================

function criarEmbedRecusado(nomeRP) {
  return new EmbedBuilder()
    .setColor(config.COR_RECUSADO)
    .setTitle("❌ Registro Recusado")
    .setDescription(
      [
        `Sua solicitação para entrar na **${config.NOME_FACCAO}** foi recusada.`,
        "",
        `🎭 **Nome RP:** \`${nomeRP}\``,
        "",
        "Caso acredite que houve algum erro, entre em contato com um membro da Gerência.",
      ].join("\n")
    )
    .setTimestamp();
}

// ======================================================================
// LOGS
// ======================================================================

function criarEmbedLog(
  tipo,
  staffMember,
  targetMember,
  nomeRP,
  idPassaporte
) {
  const aprovado = tipo === "aprovado";

  return new EmbedBuilder()
    .setColor(
      aprovado ? config.COR_APROVADO : config.COR_RECUSADO
    )
    .setTitle(
      aprovado
        ? "📗 Registro Aprovado"
        : "📕 Registro Recusado"
    )
    .setThumbnail(targetMember.user.displayAvatarURL({ dynamic: true }))
    .addFields(
      {
        name: "👤 Usuário",
        value: `${targetMember.user.tag}\n\`${targetMember.id}\``,
        inline: false,
      },
      {
        name: "👮 Responsável",
        value: `${staffMember.user.tag}`,
        inline: false,
      },
      {
        name: "🎭 Nome RP",
        value: `\`${nomeRP}\``,
        inline: true,
      },
      {
        name: "🪪 Passaporte",
        value: `\`${idPassaporte}\``,
        inline: true,
      },
      {
        name: "📌 Resultado",
        value: aprovado ? "✅ Aprovado" : "❌ Recusado",
        inline: true,
      }
    )
    .setFooter({
      text: "Sistema Automático de Registro",
    })
    .setTimestamp();
}

module.exports = {
  criarPainelRegistro,
  criarEmbedPendente,
  criarEmbedAprovado,
  criarEmbedRecusado,
  criarEmbedLog,
};
