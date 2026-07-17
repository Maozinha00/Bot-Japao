/**
 * 🐺 HUNTERS BOT - SCRIPT OFICIAL v2.6 🐺
 * Desenvolvido para o clã/facção HUNTERS.
 * 
 * Sincronização em tempo real de manufatura, vendas e retiradas de insumos.
 * NOVIDADE v2.6: 
 *   - Catálogo completo de Armas, Acessórios, Caixas e Munições integrados.
 *   - Desconto máximo ajustado para 15% com a flag '--desconto'.
 *   - Botão interativo no painel e janela (Modal) para Gerentes retirarem aço com segurança.
 * 
 * Requisitos: Node.js v18+ (usa fetch nativo!)
 * Dependências: discord.js v14+, dotenv
 */

require('dotenv').config();
const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');

const DISCORD_TOKEN = process.env.TOKEN || process.env.DISCORD_TOKEN;
const ERP_API_URL = process.env.ERP_API_URL || "SUA_URL_DO_ERP_AQUI"; // URL do seu ERP Hunters
const GERENTE_ROLE_ID = "1523277774436171796"; // Substitua pelo ID real do cargo de Gerente no seu Discord

if (!DISCORD_TOKEN) {
  console.error("❌ ERRO: O token do bot (DISCORD_TOKEN ou TOKEN) não foi configurado!");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

// Banco de dados oficial de itens e armamentos Hunters
const ITENS_DB = {
  // --- ARMAS ---
  ak47: { name: "AK-47", steel: 2700, value: 35000 },
  awp: { name: "AWP", steel: 3000, value: 65000 },
  m16: { name: "M16", steel: 2700, value: 35000 },
  sawedoff: { name: "Sawed-Off Shotgun", steel: 1200, value: 20000 },
  glock17: { name: "Glock 17", steel: 120, value: 5000 },
  tec9: { name: "TEC-9", steel: 900, value: 15000 },
  taser: { name: "Taser", steel: 700, value: 10000 },

  // --- ACESSÓRIOS ---
  silenciador: { name: "Silenciador", steel: 20, value: 2000 },
  carregador_est: { name: "Carregador Estendido", steel: 25, value: 3000 },
  grip: { name: "Grip", steel: 30, value: 3000 },
  lanterna: { name: "Lanterna", steel: 30, value: 2000 },

  // --- CAIXAS DE MUNICAO ---
  box_pistola: { name: "Box M. Pistola", steel: 40, value: 2000 },
  box_sub: { name: "Box M. Sub", steel: 80, value: 3000 },
  box_escopeta: { name: "Box M. Escopeta", steel: 100, value: 4000 },
  box556: { name: "Box M. 5.56", steel: 120, value: 5000 },
  box308: { name: "Box M. .308", steel: 200, value: 5000 },

  // --- MUNIÇÕES INDIVIDUAIS (CAIXAS COM 10) ---
  muni_pistola: { name: "Munição Pistola (10x)", steel: 10, value: 2000 },
  muni_smg: { name: "Munição SMG (10x)", steel: 20, value: 3000 },
  muni_escopeta: { name: "Munição Escopeta (10x)", steel: 25, value: 4000 },
  muni_fuzil: { name: "Munição Fuzil (10x)", steel: 30, value: 5000 }
};

const formatNumber = (num) => Number(num).toLocaleString("pt-BR");
const formatMoney = (num) => `R$ ${formatNumber(num)}`;

// Consulta os dados atuais do portal ERP Hunters
async function fetchErpData() {
  try {
    const res = await fetch(`${ERP_API_URL}/api/data`);
    if (!res.ok) throw new Error("Erro na comunicação com o ERP");
    return await res.json();
  } catch (error) {
    console.error("⚠️ Falha ao obter dados do ERP:", error.message);
    return null;
  }
}

client.once('ready', () => {
  console.log(`===============================================\n🐺 BOT HUNTERS ONLINE E PRONTO PARA COMBATE!\n🤖 Conectado como: ${client.user.tag}\n🌐 ERP Sincronizado: ${ERP_API_URL}\n===============================================`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  const erpData = await fetchErpData();
  if (!erpData) {
    return message.reply("❌ **Erro:** Não foi possível contactar o servidor ERP Hunters.");
  }

  // COMANDO: !painel
  if (command === 'painel') {
    const kits = Math.floor(erpData.estoque / erpData.settings.kitCost);
    const totalVendido = erpData.vendas.reduce((acc, v) => acc + v.total, 0);

    const embed = new EmbedBuilder()
      .setTitle("🐺 HUNTERS — PAINEL DE CONTROLE")
      .setColor("#9333EA")
      .setDescription("### 📊 Status de Recursos e Operação do Clã")
      .addFields(
        { name: "🛠️ Estoque de Aço", value: `**${formatNumber(erpData.estoque)} kg**`, inline: true },
        { name: "🏦 Caixa (70%)", value: `**${formatMoney(erpData.caixa)}**`, inline: true },
        { name: "🎁 Kits Prontos", value: `**${formatNumber(kits)} Kits**`, inline: true },
        { name: "🛒 Total Vendido", value: `**${formatMoney(totalVendido)}**`, inline: true },
        { name: "📜 Lançamentos", value: `**${erpData.vendas.length} registros**`, inline: true },
        { name: "⚖️ Repasse", value: `**70% Clã / 30% Membro**`, inline: true }
      )
      .setFooter({ text: "Hunters Management ERP", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    // Linha de botões incluindo o novo botão interativo "Retirar Aço 📤"
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('btn_estoque').setLabel('Estoque 📦').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_caixa').setLabel('Caixa 🏦').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('btn_ranking').setLabel('Ranking 🏆').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('btn_retirar_aco').setLabel('Retirar Aço 📤').setStyle(ButtonStyle.Danger)
    );

    return message.reply({ embeds: [embed], components: [row] });
  }

  // COMANDO: !venda <item> <quantidade> [--desconto]
  if (command === 'venda') {
    const itemArg = args[0];
    const qtdArg = args[1];
    const descArg = args[2];

    if (!itemArg || !qtdArg) {
      return message.reply("⚠️ **Uso correto:** `!venda <item> <quantidade> [--desconto]`\nExemplo: `!venda ak47 5` ou `!venda box556 10 --desconto`");
    }

    const itemKey = itemArg.toLowerCase();
    const item = ITENS_DB[itemKey];
    if (!item) {
      return message.reply(`❌ **Item inválido!** Opções válidas:\n\`${Object.keys(ITENS_DB).join(", ")}\``);
    }

    const qty = parseInt(qtdArg);
    if (isNaN(qty) || qty <= 0) {
      return message.reply("❌ **Erro:** A quantidade inserida deve ser um número maior que zero.");
    }

    const aplicarDesconto = descArg === '--desconto';

    try {
      const response = await fetch(`${ERP_API_URL}/api/venda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: message.author.id,
          userName: message.author.username,
          itemKey: itemKey,
          quantidade: qty,
          aplicarDesconto: aplicarDesconto
        })
      });

      const result = await response.json();
      if (!response.ok) {
        return message.reply(`❌ **Erro na operação:** ${result.error || "Rejeitado pelo ERP."}`);
      }

      const v = result.venda;
      const embed = new EmbedBuilder()
        .setTitle("✅ VENDA REGISTRADA COM SUCESSO!")
        .setColor("#10B981")
        .setDescription(`👤 Vendedor: <@${v.userId}>\n🔫 Equipamento: **${v.item}** (${v.quantidade}x)\n🛠️ Aço consumido: ${formatNumber(v.aco)} kg`)
        .addFields(
          { name: "💰 Faturamento Bruto (100%)", value: `**${formatMoney(v.total)}**`, inline: true },
          { name: "🏦 Entrada no Caixa (70%)", value: formatMoney(v.cla), inline: true },
          { name: "💸 Comissão Recebida (30%)", value: formatMoney(v.membro), inline: true }
        )
        .setFooter({ text: "Sincronizado instantaneamente via ERP Link • Desconto Máx: 15%" })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply("❌ **Erro de conexão:** Não foi possível sincronizar a venda com o portal ERP.");
    }
  }

  // COMANDO: !retirar <quantidade> (Comando de fallback direto no chat)
  if (command === 'retirar') {
    const isManager = message.member.roles.cache.has(GERENTE_ROLE_ID) || message.member.permissions.has(PermissionFlagsBits.Administrator);
    if (!isManager) {
      return message.reply("❌ **Acesso Negado:** Apenas Gerentes ou Administradores podem retirar aço.");
    }

    const qtyArg = args[0];
    const qty = parseInt(qtyArg);

    if (isNaN(qty) || qty <= 0) {
      return message.reply("⚠️ **Uso correto:** `!retirar <quantidade>`\nExemplo: `!retirar 5000`");
    }

    try {
      const response = await fetch(`${ERP_API_URL}/api/retirar-aco`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: message.author.id,
          userName: message.author.username,
          quantidade: qty,
          motivo: "Retirada via comando de chat Discord"
        })
      });

      const result = await response.json();
      if (!response.ok) {
        return message.reply(`❌ **Erro na operação:** ${result.error || "Operação rejeitada."}`);
      }

      const embed = new EmbedBuilder()
        .setTitle("📤 AÇO RETIRADO DO ESTOQUE!")
        .setColor("#EF4444")
        .setDescription(`👤 Gerente Responsável: <@${message.author.id}>\n📉 Quantidade: **${formatNumber(qty)} kg**\n📋 Motivo: _Retirada via comando de chat Discord_`)
        .addFields(
          { name: "📦 Estoque de Aço Restante", value: `**${formatNumber(result.estoque)} kg**` }
        )
        .setFooter({ text: "Lançamento Auditado no ERP Hunters" })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      return message.reply("❌ **Erro de conexão:** Não foi possível contactar o servidor ERP.");
    }
  }

  // COMANDO: !ranking
  if (command === 'ranking') {
    const rankingMap = {};
    erpData.vendas.forEach(v => {
      if (!rankingMap[v.userId]) {
        rankingMap[v.userId] = { total: 0, count: 0, name: v.userName };
      }
      rankingMap[v.userId].total += v.total;
      rankingMap[v.userId].count++;
    });

    const sorted = Object.entries(rankingMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 10);

    let list = "";
    sorted.forEach(([userId, stats], idx) => {
      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `🔹`;
      list += `${medal} <@${userId}> (${stats.name}) — **${formatMoney(stats.total)}** (${stats.count} vendas)\n`;
    });

    const embed = new EmbedBuilder()
      .setTitle("🏆 RANKING DE VENDAS - HUNTERS ELITE")
      .setColor("#F59E0B")
      .setDescription(list || "Nenhuma venda registrada.")
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
});

// Suporte a interações de botões e modais (Modal de Retirada)
client.on('interactionCreate', async (interaction) => {
  
  // 1. LIDAR COM CLIQUES EM BOTÕES DO PAINEL
  if (interaction.isButton()) {
    const erpData = await fetchErpData();
    if (!erpData) return interaction.reply({ content: "❌ Erro ao conectar ao ERP.", ephemeral: true });

    if (interaction.customId === 'btn_estoque') {
      const clanAco = Math.floor(erpData.estoque * (erpData.settings.steelClanPercent / 100));
      return interaction.reply({
        content: `📦 **ESTOQUE GERAL:** ${formatNumber(erpData.estoque)} kg de Aço\n🛡️ **Reserva Estratégica do Clã:** ${formatNumber(clanAco)} kg`,
        ephemeral: true
      });
    }

    if (interaction.customId === 'btn_caixa') {
      return interaction.reply({
        content: `🏦 **SALDO ATUAL DO CAIXA:** ${formatMoney(erpData.caixa)} (Destinado à expansão e base do clã)`,
        ephemeral: true
      });
    }

    if (interaction.customId === 'btn_ranking') {
      return interaction.reply({
        content: `🏆 Use o comando \`!ranking\` no chat público para visualizar a classificação de desempenho!`,
        ephemeral: true
      });
    }

    // BOTÃO: Retirar Aço (Abre o Modal interativo no Discord)
    if (interaction.customId === 'btn_retirar_aco') {
      const member = interaction.member;
      const isManager = member.roles.cache.has(GERENTE_ROLE_ID) || member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isManager) {
        return interaction.reply({
          content: "❌ **Acesso Negado:** Apenas Gerentes do clã têm permissão para retirar aço do estoque estratégico.",
          ephemeral: true
        });
      }

      // Criação da janela popup (Modal)
      const modal = new ModalBuilder()
        .setCustomId('modal_retirar_aco')
        .setTitle('🐺 Retirada de Aço — Hunters');

      // Campos de Entrada do formulário
      const qtyInput = new TextInputBuilder()
        .setCustomId('retirar_qtd')
        .setLabel('Quantidade de Aço a retirar (kg)')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Ex: 5000')
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('retirar_motivo')
        .setLabel('Motivo do Saque')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('Ex: Fabricação de coletes balísticos para ação do clã')
        .setRequired(true);

      const row1 = new ActionRowBuilder().addComponents(qtyInput);
      const row2 = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(row1, row2);

      // Exibe a janela de modal na tela do Gerente
      await interaction.showModal(modal);
    }
  }

  // 2. LIDAR COM ENVIO (SUBMIT) DO FORMULÁRIO DO MODAL
  if (interaction.isModalSubmit() && interaction.customId === 'modal_retirar_aco') {
    const quantidade = parseInt(interaction.fields.getTextInputValue('retirar_qtd'));
    const motivo = interaction.fields.getTextInputValue('retirar_motivo');

    if (isNaN(quantidade) || quantidade <= 0) {
      return interaction.reply({
        content: "❌ **Erro:** A quantidade inserida deve ser um número inteiro positivo.",
        ephemeral: true
      });
    }

    try {
      const response = await fetch(`${ERP_API_URL}/api/retirar-aco`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: interaction.user.id,
          userName: interaction.user.username,
          quantidade: quantidade,
          motivo: motivo
        })
      });

      const result = await response.json();
      if (!response.ok) {
        return interaction.reply({
          content: `❌ **Erro na operação:** ${result.error || "Operação rejeitada pelo ERP."}`,
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("🛠️ RETIRADA DE AÇO REGISTRADA!")
        .setColor("#EF4444")
        .setDescription(`👤 Gerente: <@${interaction.user.id}> (${interaction.user.username})\n📉 Quantidade: **${formatNumber(quantidade)} kg**\n📋 Motivo: _${motivo}_`)
        .addFields(
          { name: "📦 Estoque Restante", value: `**${formatNumber(result.estoque)} kg**`, inline: true }
        )
        .setFooter({ text: "Sincronizado via ERP Hunters API • Lançamento Auditado" })
        .setTimestamp();

      // Responde no canal de texto para todos verem a auditoria da retirada de material
      return interaction.reply({ embeds: [embed] });

    } catch (err) {
      return interaction.reply({
        content: "❌ **Erro de conexão:** Não foi possível contactar o servidor ERP para registrar a retirada.",
        ephemeral: true
      });
    }
  }
});

client.login(DISCORD_TOKEN);
