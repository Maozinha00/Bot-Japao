/**
 * ============================================================================
 * BOT OFICIAL DE REGISTRO DISCORD — REC DO JAPÃO
 * ============================================================================
 * 
 * Desenvolvido em Node.js usando discord.js v14.
 * Este bot gerencia o recrutamento e padronização de apelidos de forma automática.
 * ============================================================================
 */

const { 
  Client, 
  GatewayIntentBits, 
  Partials, 
  EmbedBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  ActionRowBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  Events, 
  PermissionsBitField 
} = require("discord.js");
const fs = require("fs");
const config = require("./config.js");

// Tenta carregar o Token das variáveis de ambiente ou usa placeholder
require("dotenv").config();
const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;

if (!TOKEN) {
  console.error("❌ ERRO CRÍTICO: Token do Discord não configurado no arquivo .env!");
  process.exit(1);
}

// Inicializa o Cliente do Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.User]
});

// Cache para controle de Anti-Spam (ID Usuário -> Timestamp liberação)
const cooldowns = new Map();

// Garante que o arquivo de dados exista para persistência se necessário
if (!fs.existsSync(config.ARQUIVO_DADOS)) {
  fs.writeFileSync(config.ARQUIVO_DADOS, JSON.stringify({ registros: [] }, null, 2), "utf-8");
}

function salvarRegistroLocal(registro) {
  try {
    const dados = JSON.parse(fs.readFileSync(config.ARQUIVO_DADOS, "utf-8"));
    if (!dados.registros) dados.registros = [];
    dados.registros.unshift(registro);
    fs.writeFileSync(config.ARQUIVO_DADOS, JSON.stringify(dados, null, 2), "utf-8");
  } catch (err) {
    console.error("⚠️ Erro ao salvar registro localmente:", err.message);
  }
}

// Evento: Bot Conectado
client.once(Events.ClientReady, async (c) => {
  console.log("==================================================");
  console.log(`✅ BOT ONLINE: ${c.user.tag}`);
  console.log(`🏯 Facção: ${config.NOME_FACCAO}`);
  console.log(`🛡️ Anti-Spam: ${config.COOLDOWN_MS / 1000} segundos`);
  console.log("==================================================");

  // Tenta enviar/atualizar o painel de registro automático
  try {
    const guild = c.guilds.cache.get(config.GUILD_ID);
    if (!guild) {
      console.warn(`⚠️ Servidor com ID ${config.GUILD_ID} não encontrado. Certifique-se de que o bot está nele!`);
      return;
    }

    const canalRegistro = guild.channels.cache.get(config.CANAL_REGISTRO_ID);
    if (canalRegistro && canalRegistro.isTextBased()) {
      const embed = new EmbedBuilder()
        .setColor(config.COR_PRINCIPAL)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ dynamic: true }) || undefined })
        .setTitle(`🇯🇵 Registro Oficial — ${config.NOME_FACCAO}`)
        .setDescription(`# Bem-vindo ao recrutamento da facção **${config.NOME_FACCAO}**!

Para realizar o seu registro e obter seu cargo de Membro na facção, você deve clicar no botão abaixo e preencher o formulário.

⚠️ **REQUISITOS IMPORTANTES:**
> • Seu apelido no servidor será padronizado como **\`${config.PREFIXO_APELIDO} Nome | ID\`**.
> • Preencha os campos com atenção (Nome, ID da cidade e Quem te recrutou).
> • Há um sistema anti-spam de ${config.COOLDOWN_MS / 1000} segundos.

👇 *Clique no botão abaixo para preencher o formulário de Cidadania!*`)
        .setFooter({ text: `${config.NOME_FACCAO} • Sistema de Registro` })
        .setTimestamp();

      const botao = new ButtonBuilder()
        .setCustomId("botao_registro_japao")
        .setEmoji("🇯🇵")
        .setLabel("Realizar Registro")
        .setStyle(ButtonStyle.Success);

      const row = new ActionRowBuilder().addComponents(botao);

      // Limpa e envia para manter o chat organizado
      const messages = await canalRegistro.messages.fetch({ limit: 10 });
      const botMessages = messages.filter(m => m.author.id === c.user.id);
      
      if (botMessages.size > 0) {
        await botMessages.first().edit({ embeds: [embed], components: [row] });
        console.log("✅ Painel de Registro atualizado com sucesso no Discord.");
      } else {
        await canalRegistro.send({ embeds: [embed], components: [row] });
        console.log("✅ Novo Painel de Registro enviado ao canal do Discord.");
      }
    }
  } catch (err) {
    console.error("⚠️ Ocorreu um erro ao gerar o painel inicial:", err.message);
  }
});

// Evento: Tratamento de Interações (Botões e Modals)
client.on(Events.InteractionCreate, async (interaction) => {
  // 1. CLIQUE NO BOTÃO "REALIZAR REGISTRO"
  if (interaction.isButton() && interaction.customId === "botao_registro_japao") {
    try {
      // Verificar Anti-Spam
      const tempoCooldown = cooldowns.get(interaction.user.id);
      if (tempoCooldown && tempoCooldown > Date.now()) {
        const segundosRestantes = Math.ceil((tempoCooldown - Date.now()) / 1000);
        return interaction.reply({
          content: `⏳ **Anti-Spam:** Por favor, aguarde **${segundosRestantes} segundos** para abrir o formulário novamente.`,
          ephemeral: true
        });
      }

      // Abre o Modal com as perguntas
      const modal = new ModalBuilder()
        .setCustomId("modal_registro_japao")
        .setTitle(`Registro - ${config.NOME_FACCAO}`);

      const inputNome = new TextInputBuilder()
        .setCustomId("nome_jogo")
        .setLabel("Seu Nome no Jogo / Personagem")
        .setPlaceholder("Ex: Takashi Hayashi")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(22);

      const inputId = new TextInputBuilder()
        .setCustomId("id_jogo")
        .setLabel("Seu ID no Jogo (Cidade / Mental)")
        .setPlaceholder("Ex: 1540")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(10);

      const inputContratou = new TextInputBuilder()
        .setCustomId("quem_contratou")
        .setLabel("Quem realizou seu recrutamento?")
        .setPlaceholder("Ex: Kenji Sato")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(2)
        .setMaxLength(30);

      const row1 = new ActionRowBuilder().addComponents(inputNome);
      const row2 = new ActionRowBuilder().addComponents(inputId);
      const row3 = new ActionRowBuilder().addComponents(inputContratou);

      modal.addComponents(row1, row2, row3);
      await interaction.showModal(modal);
    } catch (err) {
      console.error("Erro ao exibir modal de registro:", err.message);
    }
  }

  // 2. RESPOSTA DO MODAL DE REGISTRO
  if (interaction.isModalSubmit() && interaction.customId === "modal_registro_japao") {
    try {
      const nomeJogo = interaction.fields.getTextInputValue("nome_jogo").trim();
      const idJogo = interaction.fields.getTextInputValue("id_jogo").trim();
      const quemContratou = interaction.fields.getTextInputValue("quem_contratou").trim();

      const apelidoGerado = `${config.PREFIXO_APELIDO} ${nomeJogo} | ${idJogo}`;

      if (apelidoGerado.length > 32) {
        return interaction.reply({
          content: "❌ Seu nome mais a tag da facção excederam o limite de 32 caracteres do Discord. Reduza seu nome do jogo.",
          ephemeral: true
        });
      }

      const guild = interaction.guild;
      if (!guild) return;

      const idSolicitacao = "disc_" + Date.now();

      // Salva em cache/banco local
      salvarRegistroLocal({
        id: idSolicitacao,
        userId: interaction.user.id,
        userTag: interaction.user.tag,
        nomeJogo,
        idJogo,
        quemContratou,
        status: "PENDENTE",
        apelidoGerado,
        data: new Date().toISOString()
      });

      // Aplica cooldown de anti-spam de 30s
      cooldowns.set(interaction.user.id, Date.now() + config.COOLDOWN_MS);

      // Envia ao canal de aprovação da Staff
      const canalAprovacao = guild.channels.cache.get(config.CANAL_APROVACAO_ID);
      if (!canalAprovacao) {
        return interaction.reply({
          content: "❌ Canal de aprovação da Staff não encontrado. Contate um administrador.",
          ephemeral: true
        });
      }

      const embedAprovacao = new EmbedBuilder()
        .setColor(config.COR_PENDENTE)
        .setTitle(`🏮 Nova Solicitação de Registro — ${config.NOME_FACCAO}`)
        .setDescription(`O membro **${interaction.user.tag}** preencheu o formulário de recrutamento.`)
        .addFields(
          { name: "👤 Usuário Discord", value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: true },
          { name: "🆔 Discord ID", value: `\`${interaction.user.id}\``, inline: true },
          { name: "📝 Nome no Jogo", value: `**${nomeJogo}**`, inline: true },
          { name: "🔢 ID no Jogo", value: `**${idJogo}**`, inline: true },
          { name: "🤝 Recrutador", value: `**${quemContratou}**`, inline: true },
          { name: "🏷️ Apelido Proposto", value: `\`${apelidoGerado}\``, inline: false }
        )
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }) || null)
        .setFooter({ text: `${config.NOME_FACCAO} • Painel da Staff` })
        .setTimestamp();

      const btnAprovar = new ButtonBuilder()
        .setCustomId(`staff_aprovar_${idSolicitacao}`)
        .setEmoji("✅")
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Success);

      const btnRecusar = new ButtonBuilder()
        .setCustomId(`staff_recusar_${idSolicitacao}`)
        .setEmoji("❌")
        .setLabel("Recusar")
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(btnAprovar, btnRecusar);
      await canalAprovacao.send({ embeds: [embedAprovacao], components: [row] });

      await interaction.reply({
        content: `✅ **Formulário enviado com sucesso!**\nSua solicitação de registro foi enviada para avaliação da Staff.\n\n**Apelido que será configurado:** \`${apelidoGerado}\`\nPor favor, aguarde a aprovação nos canais.`,
        ephemeral: true
      });

    } catch (err) {
      console.error("Erro no modal de registro:", err.message);
      await interaction.reply({ content: "❌ Ocorreu um erro interno ao enviar o registro.", ephemeral: true }).catch(() => {});
    }
  }

  // 3. EVENTO DE CLIQUE DO ADMINISTRADOR (APROVAR / RECUSAR)
  if (interaction.isButton() && (interaction.customId.startsWith("staff_aprovar_") || interaction.customId.startsWith("staff_recusar_"))) {
    try {
      // Verificar Permissões da Staff
      if (!interaction.memberPermissions.has(PermissionsBitField.Flags.ManageRoles) && !interaction.memberPermissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({
          content: "❌ **Sem permissão:** Apenas membros da Staff com permissão de Gerenciar Cargos podem avaliar registros.",
          ephemeral: true
        });
      }

      const isAprovar = interaction.customId.startsWith("staff_aprovar_");
      const idSolicitacao = interaction.customId.replace(isAprovar ? "staff_aprovar_" : "staff_recusar_", "");

      // Lê arquivo de persistência
      const dados = JSON.parse(fs.readFileSync(config.ARQUIVO_DADOS, "utf-8"));
      const registro = dados.registros?.find(r => r.id === idSolicitacao);

      if (!registro) {
        return interaction.reply({
          content: "⚠️ Solicitação não encontrada no banco de dados local.",
          ephemeral: true
        });
      }

      if (registro.status !== "PENDENTE") {
        return interaction.reply({
          content: `⚠️ Esta solicitação já foi respondida como **${registro.status}** anteriormente.`,
          ephemeral: true
        });
      }

      const guild = interaction.guild;
      if (!guild) return;

      const membroAlvo = await guild.members.fetch(registro.userId).catch(() => null);

      if (isAprovar) {
        registro.status = "APROVADO";
        registro.avaliadoPor = interaction.user.tag;
        registro.avaliadoEm = new Date().toISOString();

        if (membroAlvo) {
          // Atribui cargo de membro
          const cargoMembro = await guild.roles.fetch(config.CARGO_MEMBRO_ID).catch(() => null);
          if (cargoMembro) {
            await membroAlvo.roles.add(cargoMembro).catch(err => {
              console.error("Erro ao adicionar cargo:", err.message);
            });
          }

          // Altera apelido
          if (membroAlvo.id !== guild.ownerId) {
            await membroAlvo.setNickname(registro.apelidoGerado).catch(err => {
              console.warn("Sem permissão para alterar apelido:", err.message);
            });
          }

          // Notifica por DM
          await membroAlvo.send({
            embeds: [
              new EmbedBuilder()
                .setColor(config.COR_APROVADO)
                .setTitle(`🇯🇵 Registro Aprovado — ${config.NOME_FACCAO}`)
                .setDescription(`Olá **${membroAlvo.user.username}**! 👋

Seu registro na facção **${config.NOME_FACCAO}** foi **APROVADO** pela nossa Staff!

> ✅ **Apelido Atualizado:** \`${registro.apelidoGerado}\`
> 🎖️ **Cargo Recebido:** Membro
> 🔓 **Canais Liberados:** Divirta-se!`)
                .setFooter({ text: `${config.NOME_FACCAO} • Registro Automático` })
                .setTimestamp()
            ]
          }).catch(() => console.log(`DM fechada para ${registro.userTag}`));
        }

        // Atualiza a embed de aprovação
        const embedEditado = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(config.COR_APROVADO)
          .setTitle(`✅ Registro Aprovado — ${config.NOME_FACCAO}`)
          .addFields({
            name: "👮 Avaliado por",
            value: `<@${interaction.user.id}> (${interaction.user.tag})`,
            inline: false
          });

        await interaction.update({ embeds: [embedEditado], components: [] });

        // Envia log detalhada no canal de logs se configurado e for diferente
        const canalLogs = guild.channels.cache.get(config.CANAL_LOGS_ID);
        if (canalLogs && canalLogs.isTextBased() && config.CANAL_LOGS_ID !== config.CANAL_APROVACAO_ID) {
          const embedLog = new EmbedBuilder()
            .setColor(config.COR_APROVADO)
            .setTitle("📝 Log de Registro Aprovado")
            .addFields(
              { name: "👤 Membro", value: `<@${registro.userId}>`, inline: true },
              { name: "🏷️ Apelido", value: `\`${registro.apelidoGerado}\``, inline: true },
              { name: "👮 Staff", value: `<@${interaction.user.id}>`, inline: true }
            )
            .setTimestamp();
          await canalLogs.send({ embeds: [embedLog] }).catch(() => {});
        }

      } else {
        // RECUSADO
        registro.status = "RECUSADO";
        registro.avaliadoPor = interaction.user.tag;
        registro.avaliadoEm = new Date().toISOString();

        if (membroAlvo) {
          await membroAlvo.send({
            embeds: [
              new EmbedBuilder()
                .setColor(config.COR_RECUSADO)
                .setTitle(`❌ Registro Recusado — ${config.NOME_FACCAO}`)
                .setDescription(`Olá **${membroAlvo.user.username}**,

Infelizmente sua solicitação de registro na facção **${config.NOME_FACCAO}** foi **recusada** pela administração.

Caso queira refazer com dados corretos, basta clicar em registrar no canal novamente.`)
                .setFooter({ text: `${config.NOME_FACCAO} • Registro Automático` })
                .setTimestamp()
            ]
          }).catch(() => {});
        }

        const embedEditado = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor(config.COR_RECUSADO)
          .setTitle(`❌ Registro Recusado — ${config.NOME_FACCAO}`)
          .addFields({
            name: "👮 Recusado por",
            value: `<@${interaction.user.id}> (${interaction.user.tag})`,
            inline: false
          });

        await interaction.update({ embeds: [embedEditado], components: [] });
      }

      // Salva no banco local
      fs.writeFileSync(config.ARQUIVO_DADOS, JSON.stringify(dados, null, 2), "utf-8");

    } catch (err) {
      console.error("Erro ao processar botão da staff:", err.message);
      await interaction.reply({ content: "❌ Ocorreu um erro ao avaliar.", ephemeral: true }).catch(() => {});
    }
  }
});

// Tratamento de Erros Globais (Anti-Crash)
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ [ANTI-CRASH] Unhandled Rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("⚠️ [ANTI-CRASH] Uncaught Exception:", err);
});

// Inicia sessão no Discord
client.login(TOKEN);
