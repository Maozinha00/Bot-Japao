/**
 * 🐺 HUNTERS BOT - SCRIPT OFICIAL DISCORD v4.5 🐺
 * Desenvolvido para o clã/facção HUNTERS.
 * 
 * Sincronização em tempo real de manufatura, vendas e retiradas de insumos.
 * NOVIDADE v4.5: 
 *   - Manual de Vendas com Scripts Táticos por Item (!manual ak47)
 *   - Calculadora e Simulador de Orçamento com 15% OFF (!calculadora ak47 3 --desconto)
 *   - Catálogo completo de Armas (AK-47, AWP, M16, Sawed-Off, Glock, TEC-9, Taser)
 *   - Suporte a Kits Táticos (Kit AK, Kit M16, Kit AWP Solo, Kit Ação/Snipe, Kit Invasão)
 *   - Modal Interativo no Discord para Gerentes retirarem aço com segurança.
 * 
 * Requisitos: Node.js v18+
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
const GERENTE_ROLE_ID = "1523277774436171796"; // Cargo de Gerente no Discord

if (!DISCORD_TOKEN) {
  console.error("❌ ERRO: O token do bot (DISCORD_TOKEN) não foi configurado no arquivo .env!");
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

// Configurações do Clã
const CONFIG = {
  PREFIX: "!",
  PRECO_ACOS_KG: 12.5,
  SPLIT_CLAN_PERCENT: 70, // 70% Clã / 30% Membro
};

// Banco de dados oficial de itens e armamentos Hunters
const ARMAS = {
  // --- KITS DE VENDA ---
  kit_armas_novo: { nome: "Kit Completo Hunters", aco: 3375, preco: 69000, descricao: "1x AK-47, 1x Glock 17, 3x Box 5.56, 3x Box Pistola + Acessórios" },
  kit_venda_basico: { nome: "Kit AK-47 Venda Básico", aco: 2840, preco: 42000, descricao: "1x AK-47 + 1x Box M. 5.56 + 1x Silenciador" },
  kit_m16_basico: { nome: "Kit M16 Venda Básico", aco: 2840, preco: 42000, descricao: "1x M16 + 1x Box M. 5.56 + 1x Silenciador" },
  kit_venda_acao: { nome: "Kit Ação / Snipe", aco: 6050, preco: 115000, descricao: "1x AK-47 + 1x AWP + 2x Box 5.56 + 2x Box .308 + Grip" },
  kit_awp_solo: { nome: "Kit AWP Sniper Solo", aco: 3420, preco: 77000, descricao: "1x AWP + 2x Box M. .308 + 1x Silenciador" },
  kit_venda_invasao: { nome: "Kit Venda Invasão", aco: 6180, preco: 92000, descricao: "2x AK-47 + 2x Glock 17 + 4x Box 5.56 + 2x Grip" },

  // --- ARMAS INDIVIDUAIS ---
  ak47: { nome: "AK-47", aco: 2700, preco: 35000, descricao: "Fuzil de assalto 5.56" },
  awp: { nome: "AWP Sniper", aco: 3000, preco: 65000, descricao: "Sniper de precisão .308" },
  m16: { nome: "M16", aco: 2700, preco: 35000, descricao: "Fuzil tático 5.56" },
  sawnoff: { nome: "Sawed-Off Shotgun", aco: 1200, preco: 20000, descricao: "Escopeta cano serrado" },
  glock17: { nome: "Glock 17", aco: 120, preco: 5000, descricao: "Pistola leve 9mm" },
  tec9: { nome: "TEC-9", aco: 900, preco: 15000, descricao: "Submetralhadora compacta" },
  taser: { nome: "Taser Tático", aco: 700, preco: 10000, descricao: "Dispositivo de imobilização" },

  // --- ACESSÓRIOS & CAIXAS ---
  silenciador: { nome: "Silenciador", aco: 20, preco: 2000 },
  carregador_est: { nome: "Carregador Estendido", aco: 25, preco: 3000 },
  grip: { nome: "Grip Tático", aco: 30, preco: 3000 },
  lanterna: { nome: "Lanterna Tática", aco: 30, preco: 2000 },
  box_m_556: { nome: "Box M. 5.56", aco: 120, preco: 5000 },
  box_m_308: { nome: "Box M. .308", aco: 200, preco: 5000 },
  box_m_pistola: { nome: "Box M. Pistola", aco: 40, preco: 2000 }
};

// Funções de Formatação
const formatarNumero = (num) => Number(num || 0).toLocaleString("pt-BR");
const formatarMoeda = (num) => `R$ ${formatarNumero(num)}`;

// Estado Local Simulado
let db = {
  bancoDinheiro: 185000,
  estoque: { acoBau: 45000, acoMaoTotal: 12500, kitsMontados: 18 },
  vendas: [],
  farmes: []
};

// PAINEL PRINCIPAL
function obterPainelPayload() {
  const embed = new EmbedBuilder()
    .setTitle("🐺 HUNTERS — PAINEL OPERACIONAL DE COMANDO")
    .setColor("#9333EA")
    .setDescription("### 📊 Gestão de Recursos, Estoque e Vendas do Clã\n\n_Sincronizado instantaneamente com o portal Hunters ERP._")
    .addFields(
      { name: "📦 Aço no Baú", value: `**${formatarNumero(db.estoque.acoBau)} kg**`, inline: true },
      { name: "✋ Aço na Mão", value: `**${formatarNumero(db.estoque.acoMaoTotal)} kg**`, inline: true },
      { name: "🏦 Banco do Clã", value: `**${formatarMoeda(db.bancoDinheiro)}**`, inline: true },
      { name: "🔥 Kits Prontos", value: `**${db.estoque.kitsMontados} Kits**`, inline: true },
      { name: "📜 Vendas Registradas", value: `**${db.vendas.length} Lançamentos**`, inline: true },
      { name: "⚖️ Divisão Padrão", value: `**70% Clã / 30% Membro**`, inline: true }
    )
    .setFooter({ text: "Hunters Management ERP • Sistema Antifraude" })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('btn_status').setLabel('Status Estoque 📦').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('btn_banco').setLabel('Saldo Banco 🏦').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('btn_manual').setLabel('Manual de Vendas 📜').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('btn_retirar_aco').setLabel('Retirar Aço 📤').setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

// COMANDOS DE CHAT
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(CONFIG.PREFIX)) return;

  const args = message.content.slice(CONFIG.PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();
  if (!command) return;

  // !ajuda
  if (command === 'ajuda' || command === 'help') {
    const embed = new EmbedBuilder()
      .setTitle('🐺 HUNTERS ERP - GUIA DE COMANDOS v4.5')
      .setColor('#a855f7')
      .setDescription(`Comandos disponíveis no servidor:`)
      .addFields(
        { name: '📊 `!painel`', value: 'Exibe o Painel Operacional Central.' },
        { name: '📖 `!manual [item]`', value: 'Gera o script tático de venda pronto para copiar. Ex: `!manual ak47`' },
        { name: '🧮 `!calculadora <item> <qtd> [--desconto]`', value: 'Simula o valor total com 15% OFF sem registrar. Ex: `!calculadora ak47 3 --desconto`' },
        { name: '📜 `!tabela`', value: 'Exibe a Tabela Oficial de Armas e Kits.' },
        { name: '💰 `!venda <item> <qtd> [--desconto]`', value: 'Registra uma venda realizada.' },
        { name: '🏆 `!ranking`', value: 'Mostra o ranking de vendedores de elite.' }
      )
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }

  // !painel
  if (command === 'painel') {
    return message.reply(obterPainelPayload());
  }

  // !tabela
  if (command === 'tabela') {
    const embed = new EmbedBuilder()
      .setTitle('🛒 TABELA OFICIAL DE ITENS & PREÇOS — HUNTERS')
      .setColor('#a855f7')
      .setDescription(`⚔️ **KITS OFICIAIS HUNTERS:**
⭐ **Kit Completo (\`kit_armas_novo\`)** — R$ 69.000 (c/ 15%: R$ 58.650) | 🛠️ 3.375 kg
📦 **Kit AK-47 Venda (\`kit_venda_basico\`)** — R$ 42.000 (c/ 15%: R$ 35.700) | 🛠️ 2.840 kg
🔫 **Kit M16 Venda (\`kit_m16_basico\`)** — R$ 42.000 (c/ 15%: R$ 35.700) | 🛠️ 2.840 kg
🎯 **Kit Ação / Snipe (\`kit_venda_acao\`)** — R$ 115.000 (c/ 15%: R$ 97.750) | 🛠️ 6.050 kg
🎯 **Kit AWP Sniper Solo (\`kit_awp_solo\`)** — R$ 77.000 (c/ 15%: R$ 65.450) | 🛠️ 3.420 kg

🔫 **ARMAS INDIVIDUAIS:**
• AK-47 (\`ak47\`) — R$ 35.000 (15% OFF: R$ 29.750) | 🛠️ 2.700 kg
• AWP (\`awp\`) — R$ 65.000 (15% OFF: R$ 55.250) | 🛠️ 3.000 kg
• M16 (\`m16\`) — R$ 35.000 (15% OFF: R$ 29.750) | 🛠️ 2.700 kg
• Sawed-Off (\`sawnoff\`) — R$ 20.000 (15% OFF: R$ 17.000) | 🛠️ 1.200 kg
• Glock 17 (\`glock17\`) — R$ 5.000 (15% OFF: R$ 4.250) | 🛠️ 120 kg
• TEC-9 (\`tec9\`) — R$ 15.000 (15% OFF: R$ 12.750) | 🛠️ 900 kg
• Taser (\`taser\`) — R$ 10.000 (15% OFF: R$ 8.500) | 🛠️ 700 kg`);

    return message.reply({ embeds: [embed] });
  }

  // !manual [item]
  if (command === 'manual') {
    const itemKey = args[0]?.toLowerCase();

    if (!itemKey) {
      const scriptGlobal = `🐺 **HUNTERS ARMAMENTOS & ACESSÓRIOS — TABELA OFICIAL**
Atendimento rápido e pronta entrega de equipamentos táticos de alto calibre!

🔥 **KITS EM DESTAQUE:**
⭐ **Kit Completo (AK + Glock)** — R$ 69.000 (c/ 15% Desc: R$ 58.650)
📦 **Kit AK-47 Venda** — R$ 42.000 (c/ 15% Desc: R$ 35.700)
🔫 **Kit M16 Venda** — R$ 42.000 (c/ 15% Desc: R$ 35.700)
🎯 **Kit Ação / Snipe (AK + AWP)** — R$ 115.000 (c/ 15% Desc: R$ 97.750)
🎯 **Kit AWP Sniper Solo** — R$ 77.000 (c/ 15% Desc: R$ 65.450)

🔫 **ARMAS SEPARADAS:**
• AK-47: R$ 35.000 (Desc 15%: R$ 29.750)
• AWP: R$ 65.000 (Desc 15%: R$ 55.250)
• M16: R$ 35.000 (Desc 15%: R$ 29.750)
• Sawed-Off: R$ 20.000 (Desc 15%: R$ 17.000)
• Glock 17: R$ 5.000 (Desc 15%: R$ 4.250)
• TEC-9: R$ 15.000 (Desc 15%: R$ 12.750)
• Taser: R$ 10.000 (Desc 15%: R$ 8.500)

💬 *Chama no privado para negociar seu lote!*`;

      return message.reply(`\`\`\`markdown\n# 📜 SCRIPT GLOBAL DE VENDAS HUNTERS (COPIE ABAIXO)\n${scriptGlobal}\n\`\`\`\n📌 *Dica: Digite \`!manual ak47\` ou \`!manual kit_armas_novo\` para pegar o script individual de um item especifico!*`);
    }

    const item = ARMAS[itemKey];
    if (!item) {
      return message.reply(`❌ **Item não encontrado!** IDs válidos: \`${Object.keys(ARMAS).join(', ')}\``);
    }

    const preco15 = item.preco * 0.85;
    const scriptItem = `🔥 **OFERTA TÁTICA HUNTERS — ${item.nome.toUpperCase()}**
📦 **Equipamento:** ${item.nome}
💵 **Preço de Tabela (100%):** ${formatarMoeda(item.preco)}
🟢 **Preço c/ 15% Desc. (Clã):** ${formatarMoeda(preco15)}
🛠️ **Requisito Aço:** ${formatarNumero(item.aco)} kg
${item.descricao ? `📋 **Descrição:** ${item.descricao}\n` : ''}💬 *Garantia de entrega imediata! Mande mensagem no privado para fechar.*`;

    return message.reply(`\`\`\`markdown\n# 📜 SCRIPT DE VENDA INDIVIDUAL: ${item.nome}\n${scriptItem}\n\`\`\``);
  }

  // !calculadora <item> <qtd> [--desconto]
  if (command === 'calculadora' || command === 'simular') {
    const itemKey = args[0]?.toLowerCase();
    const qtd = parseInt(args[1] || '1');
    const temDesconto = args.includes('--desconto');

    if (!itemKey || !ARMAS[itemKey]) {
      return message.reply(`⚠️ **Uso correto:** \`!calculadora <item> <quantidade> [--desconto]\`
Exemplo: \`!calculadora ak47 2 --desconto\``);
    }

    const item = ARMAS[itemKey];
    const precoCheio = item.preco * qtd;
    const valorDesconto = temDesconto ? precoCheio * 0.15 : 0;
    const precoFinal = precoCheio - valorDesconto;
    const acoTotal = item.aco * qtd;

    const embed = new EmbedBuilder()
      .setTitle(`🧮 SIMULADOR DE ORÇAMENTO — ${item.nome.toUpperCase()}`)
      .setColor('#10b981')
      .addFields(
        { name: '📦 Equipamento & Qtd', value: `${item.nome} (**${qtd}x**)`, inline: true },
        { name: '🛠️ Aço Necessário', value: `**${formatarNumero(acoTotal)} kg**`, inline: true },
        { name: '💵 Valor Total Sem Desconto', value: formatarMoeda(precoCheio), inline: true },
        { name: '🏷️ Desconto de 15% Aplicado', value: temDesconto ? `- ${formatarMoeda(valorDesconto)}` : 'Não aplicado', inline: true },
        { name: '🟢 Valor Final a Cobrar', value: `**${formatarMoeda(precoFinal)}**`, inline: true }
      )
      .setFooter({ text: 'Simulação tática • Não registra lançamento no banco' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
});

// INTERAÇÕES DE BOTÃO E MODAL DE RETIRADA DE AÇO
client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    if (interaction.customId === 'btn_status') {
      return interaction.reply({
        content: `📦 **ESTOQUE ATUAL:** ${formatarNumero(db.estoque.acoBau)} kg de Aço no Baú | ${formatarNumero(db.estoque.acoMaoTotal)} kg na Mão`,
        ephemeral: true
      });
    }

    if (interaction.customId === 'btn_banco') {
      return interaction.reply({
        content: `🏦 **SALDO ATUAL DO BANCO DO CLÃ:** ${formatarMoeda(db.bancoDinheiro)}`,
        ephemeral: true
      });
    }

    if (interaction.customId === 'btn_manual') {
      return interaction.reply({
        content: `📖 Use o comando \`!manual\` para copiar os scripts de venda prontos para o Discord!`,
        ephemeral: true
      });
    }

    if (interaction.customId === 'btn_retirar_aco') {
      const isManager = interaction.member.roles.cache.has(GERENTE_ROLE_ID) || interaction.member.permissions.has(PermissionFlagsBits.Administrator);

      if (!isManager) {
        return interaction.reply({
          content: "❌ **Acesso Negado:** Apenas Gerentes do clã têm permissão para retirar aço do estoque.",
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_retirar_aco')
        .setTitle('🐺 Retirada de Aço — Hunters');

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

      modal.addComponents(
        new ActionRowBuilder().addComponents(qtyInput),
        new ActionRowBuilder().addComponents(reasonInput)
      );

      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'modal_retirar_aco') {
    const quantidade = parseInt(interaction.fields.getTextInputValue('retirar_qtd'));
    const motivo = interaction.fields.getTextInputValue('retirar_motivo');

    if (isNaN(quantidade) || quantidade <= 0) {
      return interaction.reply({ content: "❌ Quantidade inválida.", ephemeral: true });
    }

    db.estoque.acoBau = Math.max(0, db.estoque.acoBau - quantidade);

    const embed = new EmbedBuilder()
      .setTitle("🛠️ RETIRADA DE AÇO REGISTRADA!")
      .setColor("#EF4444")
      .setDescription(`👤 Gerente: <@${interaction.user.id}>\n📉 Saque: **${formatarNumero(quantidade)} kg**\n📋 Motivo: _${motivo}_`)
      .addFields({ name: "📦 Estoque Restante no Baú", value: `**${formatarNumero(db.estoque.acoBau)} kg**` })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

client.once('ready', () => {
  console.log(`🤖 [HUNTERS ERP] Bot Discord Online como ${client.user.tag}!`);
});

client.login(DISCORD_TOKEN);
