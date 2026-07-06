client.login(process.env.DISCORD_TOKEN);

const {
  Client,
  GatewayIntentBits,
  Partials,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  Events,
} = require("discord.js");

const config  = require("./config");
const utils   = require("./utils");
const embeds  = require("./embeds");

// ─── Cliente Discord ──────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
});

// ─── Dados persistentes ───────────────────────────────────────────────────────

let dados = utils.carregarDados();

function salvar() {
  utils.salvarDados(dados);
}

// ─── Ready ────────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async () => {
  console.log(`\n✅ Bot online como: ${client.user.tag}`);
  console.log(`   Servidor  : ${config.GUILD_ID}`);
  console.log(`   Registro  : ${config.CANAL_REGISTRO_ID}`);
  console.log(`   Aprovação : ${config.CANAL_APROVACAO_ID}`);
  console.log(`   Cargo     : ${config.CARGO_MEMBRO_ID}\n`);

  await enviarOuAtualizarPainel();
});

// ─── Painel de Registro ───────────────────────────────────────────────────────

async function enviarOuAtualizarPainel() {
  try {
    const guild  = await client.guilds.fetch(config.GUILD_ID);
    const canal  = await guild.channels.fetch(config.CANAL_REGISTRO_ID);

    // Tenta reutilizar a mensagem do painel já salva
    if (dados.painelMensagemId) {
      try {
        const msg = await canal.messages.fetch(dados.painelMensagemId);
        await msg.edit(embeds.criarPainelRegistro());
        console.log("📋 Painel de registro atualizado.");
        return;
      } catch {
        // Mensagem não encontrada, cria uma nova
      }
    }

    // Limpa mensagens antigas do bot no canal para não acumular painéis
    try {
      const msgs = await canal.messages.fetch({ limit: 10 });
      const doBot = msgs.filter((m) => m.author.id === client.user.id);
      for (const m of doBot.values()) await m.delete().catch(() => {});
    } catch {}

    const msg = await canal.send(embeds.criarPainelRegistro());
    dados.painelMensagemId = msg.id;
    salvar();
    console.log("📋 Painel de registro enviado.");
  } catch (err) {
    console.error("❌ Erro ao enviar painel:", err.message);
  }
}

// ─── Interações ───────────────────────────────────────────────────────────────

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ── Botão: Abrir formulário de registro ──────────────────────────────────
    if (interaction.isButton() && interaction.customId === "btn_abrir_registro") {
      await handleBotaoRegistrar(interaction);
      return;
    }

    // ── Modal: Enviar dados de registro ──────────────────────────────────────
    if (interaction.isModalSubmit() && interaction.customId === "modal_registro") {
      await handleModalRegistro(interaction);
      return;
    }

    // ── Botão: Aprovar ────────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith("btn_aprovar_")) {
      await handleAprovar(interaction);
      return;
    }

    // ── Botão: Recusar ────────────────────────────────────────────────────────
    if (interaction.isButton() && interaction.customId.startsWith("btn_recusar_")) {
      await handleRecusar(interaction);
      return;
    }

    // ── Comando: !painel (recria painel) ──────────────────────────────────────
    // Tratado em messageCreate abaixo

  } catch (err) {
    console.error("❌ Erro na interação:", err.message);
    const payload = { content: "❌ Ocorreu um erro interno. Tente novamente.", ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

// ─── Botão Registrar ──────────────────────────────────────────────────────────

async function handleBotaoRegistrar(interaction) {
  const userId = interaction.user.id;

  // Anti-spam
  const espera = utils.checarCooldown(userId);
  if (espera > 0) {
    return interaction.reply({
      content: `⏳ Você está enviando solicitações muito rápido. Aguarde **${espera}s** e tente novamente.`,
      ephemeral: true,
    });
  }

  // Blacklist
  if (dados.blacklist.includes(userId)) {
    return interaction.reply({
      content: "🚫 Você está na blacklist e não pode se registrar.",
      ephemeral: true,
    });
  }

  // Já tem pendente
  if (dados.pendentes[userId]) {
    return interaction.reply({
      content: "⏳ Você já possui uma solicitação pendente. Aguarde a análise da staff.",
      ephemeral: true,
    });
  }

  // Já aprovado (tem cargo)
  const guild  = await interaction.client.guilds.fetch(config.GUILD_ID);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member && member.roles.cache.has(config.CARGO_MEMBRO_ID)) {
    return interaction.reply({
      content: "✅ Você já é membro registrado!",
      ephemeral: true,
    });
  }

  // Abre modal
  const modal = new ModalBuilder()
    .setCustomId("modal_registro")
    .setTitle(`Registro — ${config.NOME_FACCAO}`);

  const campoNome = new TextInputBuilder()
    .setCustomId("input_nome_rp")
    .setLabel("Nome RP")
    .setPlaceholder("Ex: Hiroshi Tanaka")
    .setStyle(TextInputStyle.Short)
    .setMinLength(3)
    .setMaxLength(40)
    .setRequired(true);

  const campoID = new TextInputBuilder()
    .setCustomId("input_id_passaporte")
    .setLabel("ID / Passaporte")
    .setPlaceholder("Ex: 12345 ou BR-9876")
    .setStyle(TextInputStyle.Short)
    .setMinLength(2)
    .setMaxLength(20)
    .setRequired(true);

  modal.addComponents(
    new ActionRowBuilder().addComponents(campoNome),
    new ActionRowBuilder().addComponents(campoID)
  );

  await interaction.showModal(modal);
}

// ─── Modal Registro ───────────────────────────────────────────────────────────

async function handleModalRegistro(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const nomeRP       = interaction.fields.getTextInputValue("input_nome_rp").trim();
  const idPassaporte = interaction.fields.getTextInputValue("input_id_passaporte").trim();
  const userId       = interaction.user.id;

  // Validações
  const erroNome = utils.validarNomeRP(nomeRP);
  if (erroNome) {
    return interaction.editReply({ content: `❌ **Nome RP inválido:** ${erroNome}` });
  }
  const erroID = utils.validarIDPassaporte(idPassaporte);
  if (erroID) {
    return interaction.editReply({ content: `❌ **ID/Passaporte inválido:** ${erroID}` });
  }

  // Busca membro
  const guild  = await interaction.client.guilds.fetch(config.GUILD_ID);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) {
    return interaction.editReply({ content: "❌ Não foi possível identificar você no servidor." });
  }

  // Envia para canal de aprovação
  const canalAprovacao = await guild.channels.fetch(config.CANAL_APROVACAO_ID).catch(() => null);
  if (!canalAprovacao) {
    return interaction.editReply({ content: "❌ Canal de aprovação não encontrado. Contate um administrador." });
  }

  const msgAprovacao = await canalAprovacao.send(
    embeds.criarEmbedPendente(member, nomeRP, idPassaporte)
  );

  // Salva pendente
  dados.pendentes[userId] = {
    nomeRP,
    idPassaporte,
    msgId: msgAprovacao.id,
    timestamp: Date.now(),
  };
  salvar();

  await interaction.editReply({
    content: [
      "✅ **Solicitação enviada com sucesso!**",
      "",
      `**Nome RP:** ${nomeRP}`,
      `**ID/Passaporte:** ${idPassaporte}`,
      "",
      "Aguarde a análise da staff. Você receberá uma mensagem privada com o resultado.",
    ].join("\n"),
  });

  console.log(`📨 Solicitação de registro recebida: ${interaction.user.tag} | ${nomeRP} | ${idPassaporte}`);
}

// ─── Aprovar ──────────────────────────────────────────────────────────────────

async function handleAprovar(interaction) {
  await interaction.deferUpdate();

  const targetId = interaction.customId.replace("btn_aprovar_", "");
  const pendente = dados.pendentes[targetId];

  if (!pendente) {
    return interaction.followUp({ content: "⚠️ Esta solicitação já foi processada.", ephemeral: true });
  }

  const guild  = await interaction.client.guilds.fetch(config.GUILD_ID);
  const member = await guild.members.fetch(targetId).catch(() => null);

  if (!member) {
    delete dados.pendentes[targetId];
    salvar();
    return interaction.followUp({ content: "⚠️ O usuário não está mais no servidor.", ephemeral: true });
  }

  const { nomeRP, idPassaporte } = pendente;
  const novoApelido = `${config.PREFIXO_APELIDO} ${nomeRP} ${idPassaporte}`.slice(0, 32);

  // Adiciona cargo
  await member.roles.add(config.CARGO_MEMBRO_ID).catch((e) =>
    console.error("❌ Erro ao adicionar cargo:", e.message)
  );

  // Altera apelido
  await member.setNickname(novoApelido).catch((e) =>
    console.error("❌ Erro ao alterar apelido:", e.message)
  );

  // DM ao aprovado
  await member.send({ embeds: [embeds.criarEmbedAprovado(nomeRP, idPassaporte)] }).catch(() =>
    console.warn(`⚠️ Não foi possível enviar DM para ${member.user.tag}`)
  );

  // Log
  const staffMember = interaction.member;
  dados.aprovados.push({
    userId: targetId,
    nomeRP,
    idPassaporte,
    staffId: staffMember.id,
    timestamp: Date.now(),
  });
  delete dados.pendentes[targetId];
  salvar();

  // Edita mensagem de aprovação (remove botões)
  await interaction.message
    .edit({
      embeds: [
        interaction.message.embeds[0],
        embeds.criarEmbedLog("aprovado", staffMember, member, nomeRP, idPassaporte),
      ],
      components: [],
    })
    .catch(() => {});

  await interaction.followUp({
    content: `✅ **${member.user.tag}** foi aprovado como \`${novoApelido}\`.`,
    ephemeral: true,
  });

  console.log(`✅ Aprovado: ${member.user.tag} | ${nomeRP} | Staff: ${staffMember.user.tag}`);
}

// ─── Recusar ──────────────────────────────────────────────────────────────────

async function handleRecusar(interaction) {
  await interaction.deferUpdate();

  const targetId = interaction.customId.replace("btn_recusar_", "");
  const pendente = dados.pendentes[targetId];

  if (!pendente) {
    return interaction.followUp({ content: "⚠️ Esta solicitação já foi processada.", ephemeral: true });
  }

  const guild  = await interaction.client.guilds.fetch(config.GUILD_ID);
  const member = await guild.members.fetch(targetId).catch(() => null);

  const { nomeRP, idPassaporte } = pendente;

  // DM ao recusado
  if (member) {
    await member.send({ embeds: [embeds.criarEmbedRecusado(nomeRP)] }).catch(() =>
      console.warn(`⚠️ Não foi possível enviar DM para ${member?.user?.tag}`)
    );
  }

  // Log
  const staffMember = interaction.member;
  dados.recusados.push({
    userId: targetId,
    nomeRP,
    idPassaporte,
    staffId: staffMember.id,
    timestamp: Date.now(),
  });
  delete dados.pendentes[targetId];
  salvar();

  // Edita mensagem (remove botões)
  await interaction.message
    .edit({
      embeds: [
        interaction.message.embeds[0],
        embeds.criarEmbedLog("recusado", staffMember, member ?? { id: targetId, user: { tag: targetId } }, nomeRP, idPassaporte),
      ],
      components: [],
    })
    .catch(() => {});

  await interaction.followUp({
    content: `❌ Solicitação de **${member?.user?.tag ?? targetId}** foi recusada.`,
    ephemeral: true,
  });

  console.log(`❌ Recusado: ${targetId} | ${nomeRP} | Staff: ${staffMember.user.tag}`);
}

// ─── Comando de prefixo: !painel ─────────────────────────────────────────────

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.guild.id !== config.GUILD_ID) return;

  if (message.content.toLowerCase() === "!painel") {
    // Apenas quem pode gerenciar mensagens
    if (!message.member.permissions.has("ManageMessages")) {
      return message.reply("❌ Você não tem permissão para usar este comando.");
    }
    dados.painelMensagemId = null;
    salvar();
    await enviarOuAtualizarPainel();
    await message.reply("✅ Painel recriado com sucesso!").then((m) => setTimeout(() => m.delete().catch(() => {}), 5000));
    return;
  }

  if (message.content.toLowerCase() === "!blacklist") {
    if (!message.member.permissions.has("Administrator")) return;
    const mencionado = message.mentions.users.first();
    if (!mencionado) return message.reply("Use: `!blacklist @usuário`");
    if (dados.blacklist.includes(mencionado.id)) {
      dados.blacklist = dados.blacklist.filter((id) => id !== mencionado.id);
      salvar();
      return message.reply(`✅ **${mencionado.tag}** removido da blacklist.`);
    }
    dados.blacklist.push(mencionado.id);
    salvar();
    return message.reply(`🚫 **${mencionado.tag}** adicionado à blacklist.`);
  }
});

// ─── Tratamento de erros globais ──────────────────────────────────────────────

process.on("unhandledRejection", (err) => {
  console.error("🔥 Unhandled Rejection:", err.message);
});
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err.message);
});

// ─── Login ────────────────────────────────────────────────────────────────────

client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Falha ao fazer login:", err.message);
  console.error("   Verifique se o DISCORD_TOKEN no arquivo .env está correto.");
  process.exit(1);
});
