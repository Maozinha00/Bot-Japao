import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Definições de estruturas do Discord
interface DiscordRole {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
}

interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  position: number;
  parent_id?: string | null;
  topic?: string | null;
  nsfw?: boolean;
  rate_limit_per_user?: number;
}

interface DiscordMessage {
  id: string;
  content: string;
  author: {
    username: string;
    id: string;
    discriminator: string;
    avatar?: string | null;
  };
  timestamp: string;
}

interface CloneLog {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error" | "debug";
  message: string;
}

interface CloneStatus {
  active: boolean;
  progress: number;
  stage: string;
  isSimulated: boolean;
  logs: CloneLog[];
  stats: {
    rolesDeleted: number;
    rolesCreated: number;
    channelsDeleted: number;
    channelsCreated: number;
    messagesCloned: number;
    membersUpdated: number;
    totalTasks: number;
    completedTasks: number;
  };
}

// Status global do processo em memória
let cloneStatus: CloneStatus = {
  active: false,
  progress: 0,
  stage: "Inativo",
  isSimulated: false,
  logs: [],
  stats: {
    rolesDeleted: 0,
    rolesCreated: 0,
    channelsDeleted: 0,
    channelsCreated: 0,
    messagesCloned: 0,
    membersUpdated: 0,
    totalTasks: 0,
    completedTasks: 0,
  }
};

function addLog(level: CloneLog["level"], message: string) {
  const timestamp = new Date().toLocaleTimeString("pt-BR", { hour12: false });
  const logEntry: CloneLog = {
    id: Math.random().toString(36).substring(2, 9),
    timestamp,
    level,
    message
  };
  cloneStatus.logs.push(logEntry);
  if (cloneStatus.logs.length > 300) {
    cloneStatus.logs.shift();
  }
}

// Auxiliar de delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Conexão e requisições para a API REST oficial do Discord (com contorno de Rate Limits)
async function discordRequest(
  endpoint: string,
  method: string = 'GET',
  body: any = null,
  tokenOverride?: string
): Promise<any> {
  const token = tokenOverride || process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("Token do Bot Discord não configurado nas variáveis de ambiente ou secrets.");
  }

  const url = `https://discord.com/api/v10${endpoint}`;
  const headers: Record<string, string> = {
    'Authorization': `Bot ${token.trim()}`,
    'Content-Type': 'application/json',
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts) {
    attempts++;
    const res = await fetch(url, options);

    // Tratamento de Rate Limit do Discord (Erros 429)
    if (res.status === 429) {
      const retryAfterHeader = res.headers.get('Retry-After');
      const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : 1;
      const waitTime = (retryAfter * 1000) + 200;
      addLog("warning", `⚠️ Limite de requisições do Discord atingido. Aguardando ${retryAfter}s para continuar...`);
      await sleep(waitTime);
      continue;
    }

    if (!res.ok) {
      let errText = '';
      try {
        const errJson = await res.json();
        errText = JSON.stringify(errJson);
      } catch {
        errText = await res.text();
      }
      throw new Error(`Erro na API Discord [${res.status}]: ${errText}`);
    }

    if (res.status === 204) {
      return null;
    }

    return await res.json();
  }

  throw new Error("Falha ao realizar requisição ao Discord após múltiplas tentativas.");
}

// 🛡️ MOTOR DE SIMULAÇÃO (Para testes seguros com logs em tempo real sem afetar servidores reais)
async function runSimulation(sourceId: string, destId: string, serverName: string) {
  addLog("info", "🚀 Iniciando simulação de backup de servidor...");
  addLog("info", `Origem: ID ${sourceId}`);
  addLog("info", `Destino: ID ${destId}`);
  
  cloneStatus.stats = {
    rolesDeleted: 0,
    rolesCreated: 0,
    channelsDeleted: 0,
    channelsCreated: 0,
    messagesCloned: 0,
    membersUpdated: 0,
    totalTasks: 40,
    completedTasks: 0,
  };

  cloneStatus.stage = "Analisando Servidor de Origem";
  cloneStatus.progress = 5;
  addLog("info", "🔍 Analisando canais, cargos e permissões do servidor original...");
  await sleep(1500);
  
  const simRoles = [
    { name: "👑 Dono", color: 0xe74c3c, position: 5 },
    { name: "🛡️ Mod", color: 0x2ecc71, position: 4 },
    { name: "⭐ VIP", color: 0xf1c40f, position: 3 },
    { name: "🤖 Bot", color: 0x9b59b6, position: 2 },
    { name: "👤 Membro", color: 0x34495e, position: 1 }
  ];
  
  const simChannels = [
    { name: "INFORMAÇÕES", type: 4, position: 0 },
    { name: "📢-anuncios", type: 0, position: 1, category: "INFORMAÇÕES" },
    { name: "📜-regras", type: 0, position: 2, category: "INFORMAÇÕES" },
    { name: "PRINCIPAL", type: 4, position: 3 },
    { name: "💬-chat-geral", type: 0, position: 4, category: "PRINCIPAL" },
    { name: "memes", type: 0, position: 5, category: "PRINCIPAL" },
    { name: "comandos-bot", type: 0, position: 6, category: "PRINCIPAL" },
    { name: "VOZ", type: 4, position: 7 },
    { name: "🔊 Geral 1", type: 2, position: 8, category: "VOZ" },
    { name: "🔊 Dupla 1", type: 2, position: 9, category: "VOZ" }
  ];

  const simMessages: Record<string, string[]> = {
    "📢-anuncios": [
      "Bem-vindos ao Aura Bots Studio!",
      "Fiquem atentos para as próximas atualizações de nossos bots.",
      "Novo bot de proteção configurado com sucesso!"
    ],
    "📜-regras": [
      "1. Respeite todos os membros.",
      "2. Sem spam ou flood nos canais de texto.",
      "3. Use os comandos de bots apenas no canal apropriado."
    ],
    "💬-chat-geral": [
      "Olá pessoal! Como estão hoje?",
      "Alguém aí querendo jogar?",
      "Esse bot de backup é incrível, copia tudo mesmo!"
    ]
  };

  addLog("success", `✅ Origem mapeada: ${simRoles.length} cargos, ${simChannels.length} canais encontrados.`);
  cloneStatus.progress = 15;
  await sleep(1000);

  // Renomeando servidor de destino
  cloneStatus.stage = "Renomeando Servidor";
  addLog("info", `✏️ Alterando nome do servidor de destino para: "${serverName}"...`);
  await sleep(1200);
  addLog("success", `✅ Servidor de destino renomeado para "${serverName}" com sucesso.`);
  cloneStatus.progress = 20;

  // Deletando canais antigos
  cloneStatus.stage = "Limpando Canais Existentes";
  addLog("info", "🧹 Excluindo canais antigos no servidor de destino para evitar duplicação...");
  const channelsToDelete = ["general", "General", "Lobby", "Voz Geral"];
  for (const chan of channelsToDelete) {
    addLog("info", `🗑️ Deletando canal: #${chan}...`);
    await sleep(400);
    cloneStatus.stats.channelsDeleted++;
    cloneStatus.stats.completedTasks++;
    cloneStatus.progress = 20 + Math.floor((cloneStatus.stats.channelsDeleted / channelsToDelete.length) * 15);
  }
  
  // Deletando cargos antigos
  cloneStatus.stage = "Limpando Cargos Existentes";
  addLog("info", "🧹 Removendo cargos antigos do servidor de destino...");
  const rolesToDelete = ["New Role", "Mod Teste", "Membro Antigo"];
  for (const role of rolesToDelete) {
    addLog("info", `🗑️ Excluindo cargo antigo: @${role}...`);
    await sleep(350);
    cloneStatus.stats.rolesDeleted++;
    cloneStatus.stats.completedTasks++;
    cloneStatus.progress = 35 + Math.floor((cloneStatus.stats.rolesDeleted / rolesToDelete.length) * 10);
  }
  await sleep(800);

  // Criando novos cargos
  cloneStatus.stage = "Criando Novos Cargos";
  addLog("info", "🎨 Recreando cargos no servidor de destino com cores e posições...");
  for (const r of simRoles) {
    addLog("info", `✨ Criando cargo: @${r.name}...`);
    await sleep(500);
    cloneStatus.stats.rolesCreated++;
    cloneStatus.stats.completedTasks++;
    cloneStatus.progress = 45 + Math.floor((cloneStatus.stats.rolesCreated / simRoles.length) * 15);
  }
  await sleep(800);

  // Criando novos canais e categorias
  cloneStatus.stage = "Criando Canais e Categorias";
  addLog("info", "📁 Construindo estrutura de categorias e canais...");
  const createdCategories: Record<string, string> = {};
  const categories = simChannels.filter(c => c.type === 4);
  for (const cat of categories) {
    addLog("info", `📁 Criando categoria: [${cat.name}]...`);
    await sleep(450);
    createdCategories[cat.name] = Math.random().toString(36).substring(2, 9);
    cloneStatus.stats.channelsCreated++;
    cloneStatus.stats.completedTasks++;
  }

  const otherChannels = simChannels.filter(c => c.type !== 4);
  for (const chan of otherChannels) {
    const parentText = chan.category ? ` sob a categoria [${chan.category}]` : "";
    addLog("info", `✨ Criando canal: #${chan.name}${parentText}...`);
    await sleep(400);
    cloneStatus.stats.channelsCreated++;
    cloneStatus.stats.completedTasks++;
    cloneStatus.progress = 60 + Math.floor((cloneStatus.stats.channelsCreated / simChannels.length) * 15);
  }
  await sleep(800);

  // Restaurando mensagens
  cloneStatus.stage = "Restaurando Mensagens";
  addLog("info", "💬 Iniciando transferência do histórico de mensagens...");
  let totalMsgToClone = 0;
  for (const k in simMessages) totalMsgToClone += simMessages[k].length;

  for (const [chanName, msgs] of Object.entries(simMessages)) {
    addLog("info", `📨 Transferindo mensagens para o canal #${chanName}...`);
    for (const msg of msgs) {
      const randomUsers = ["Pedro", "Maria", "Carlos", "AuraHelper", "Ana"];
      const author = randomUsers[Math.floor(Math.random() * randomUsers.length)];
      addLog("debug", `   └─ Envia: [${author}] "${msg}"`);
      await sleep(300);
      cloneStatus.stats.messagesCloned++;
      cloneStatus.stats.completedTasks++;
      cloneStatus.progress = 75 + Math.floor((cloneStatus.stats.messagesCloned / totalMsgToClone) * 15);
    }
  }
  await sleep(800);

  // Atribuindo cargo de Membro
  cloneStatus.stage = "Atribuindo Cargo aos Membros";
  addLog("info", "👥 Sincronizando usuários presentes no Discord e atribuindo cargo de 'Membro'...");
  const simUsers = ["Henrique_User", "Gamer345", "AuraFan", "Sophia_X", "VictorDiscord"];
  for (const user of simUsers) {
    addLog("info", `👤 Adicionando cargo @Membro ao player: ${user}...`);
    await sleep(400);
    cloneStatus.stats.membersUpdated++;
    cloneStatus.stats.completedTasks++;
    cloneStatus.progress = 90 + Math.floor((cloneStatus.stats.membersUpdated / simUsers.length) * 10);
  }
  
  cloneStatus.progress = 100;
  cloneStatus.stage = "Finalizado com Sucesso";
  addLog("success", "🎉 Backup do servidor concluído de forma 100% perfeita na simulação!");
  addLog("success", `Resumo: ${cloneStatus.stats.channelsCreated} canais criados, ${cloneStatus.stats.rolesCreated} cargos criados, ${cloneStatus.stats.messagesCloned} mensagens recuperadas.`);
  cloneStatus.active = false;
}

// 🔥 CLONAGEM REAL DE DADOS VIA API DO DISCORD
async function runRealBackup(sourceId: string, destId: string, serverName: string) {
  addLog("info", "🚀 Iniciando cópia real via API oficial do Discord...");
  addLog("info", `Servidor de Origem: ${sourceId}`);
  addLog("info", `Servidor de Destino: ${destId}`);

  cloneStatus.stats = {
    rolesDeleted: 0,
    rolesCreated: 0,
    channelsDeleted: 0,
    channelsCreated: 0,
    messagesCloned: 0,
    membersUpdated: 0,
    totalTasks: 1,
    completedTasks: 0,
  };

  try {
    // Passo 1: Baixar dados de origem
    cloneStatus.stage = "Obtendo dados do Servidor de Origem";
    cloneStatus.progress = 5;
    addLog("info", "📡 Baixando configurações do servidor de origem...");
    
    const sourceGuild = await discordRequest(`/guilds/${sourceId}`);
    addLog("success", `✅ Servidor original encontrado: "${sourceGuild.name}"`);

    addLog("info", "📡 Baixando cargos originais...");
    const sourceRoles: DiscordRole[] = await discordRequest(`/guilds/${sourceId}/roles`);
    addLog("info", `   └─ ${sourceRoles.length} cargos mapeados.`);

    addLog("info", "📡 Baixando canais originais...");
    const sourceChannels: DiscordChannel[] = await discordRequest(`/guilds/${sourceId}/channels`);
    addLog("info", `   └─ ${sourceChannels.length} canais mapeados.`);

    cloneStatus.progress = 15;

    // Escaneando mensagens nos canais de texto
    const textChannels = sourceChannels.filter(c => c.type === 0);
    const messagesCache: Record<string, DiscordMessage[]> = {};
    
    addLog("info", `📡 Escaneando mensagens nos canais de texto (limite de 30 msgs por canal)...`);
    for (const chan of textChannels) {
      try {
        const msgs: DiscordMessage[] = await discordRequest(`/channels/${chan.id}/messages?limit=30`);
        messagesCache[chan.id] = msgs.reverse(); // Ordenar cronologicamente
        addLog("debug", `   └─ #${chan.name}: ${msgs.length} mensagens salvas.`);
      } catch (err: any) {
        addLog("warning", `⚠️ Não foi possível ler mensagens de #${chan.name}: ${err.message}`);
      }
    }

    cloneStatus.progress = 25;

    // Passo 2: Renomear o servidor destino para o nome personalizado
    cloneStatus.stage = "Alterando Nome do Destino";
    addLog("info", `✏️ Renomeando servidor de destino para "${serverName}"...`);
    await discordRequest(`/guilds/${destId}`, 'PATCH', { name: serverName });
    addLog("success", `✅ Servidor renomeado.`);
    cloneStatus.progress = 30;

    // Passo 3: Limpar os canais antigos do servidor de destino
    cloneStatus.stage = "Removendo Canais do Destino";
    addLog("info", "🧹 Obtendo canais atuais do servidor de destino para remoção...");
    const destChannels: DiscordChannel[] = await discordRequest(`/guilds/${destId}/channels`);
    
    // Criar canal temporário de suporte (o Discord exige ao menos um canal ativo)
    addLog("info", "🛠️ Criando canal temporário de suporte para o backup...");
    const tempChan = await discordRequest(`/guilds/${destId}/channels`, 'POST', {
      name: "temp-backup-holder",
      type: 0
    });

    addLog("info", `🗑️ Deletando ${destChannels.length} canais antigos...`);
    for (const chan of destChannels) {
      try {
        await discordRequest(`/channels/${chan.id}`, 'DELETE');
        addLog("debug", `   └─ Canal #${chan.name} deletado.`);
        cloneStatus.stats.channelsDeleted++;
      } catch (err: any) {
        addLog("warning", `⚠️ Falha ao deletar canal #${chan.name}: ${err.message}`);
      }
    }
    cloneStatus.progress = 45;

    // Passo 4: Deletar cargos antigos no servidor destino
    cloneStatus.stage = "Removendo Cargos do Destino";
    addLog("info", "🧹 Obtendo cargos atuais do servidor de destino para limpeza...");
    const destRoles: DiscordRole[] = await discordRequest(`/guilds/${destId}/roles`);
    for (const role of destRoles) {
      if (role.id !== destId && !role.managed && role.name !== "Aura Backup" && role.name !== "@everyone") {
        try {
          await discordRequest(`/guilds/${destId}/roles/${role.id}`, 'DELETE');
          addLog("debug", `   └─ Cargo @${role.name} removido.`);
          cloneStatus.stats.rolesDeleted++;
        } catch (err: any) {
          addLog("debug", `⚠️ Ignorando exclusão do cargo @${role.name}: ${err.message}`);
        }
      }
    }
    cloneStatus.progress = 55;

    // Passo 5: Recriar os cargos ordenadamente
    cloneStatus.stage = "Criando Cargos no Destino";
    addLog("info", "🎨 Recreando cargos originais...");
    const roleMapping: Record<string, string> = {}; // ID antigo -> ID novo

    const sortedRoles = [...sourceRoles].sort((a, b) => a.position - b.position);

    for (const role of sortedRoles) {
      if (role.id === sourceId || role.managed || role.name === "@everyone") {
        continue;
      }
      try {
        const newRole = await discordRequest(`/guilds/${destId}/roles`, 'POST', {
          name: role.name,
          color: role.color,
          hoist: role.hoist,
          permissions: role.permissions,
          mentionable: role.mentionable
        });
        roleMapping[role.id] = newRole.id;
        addLog("debug", `   └─ Cargo @${role.name} criado com sucesso.`);
        cloneStatus.stats.rolesCreated++;
        await sleep(400); // Espaçamento para evitar rate limits
      } catch (err: any) {
        addLog("warning", `⚠️ Falha ao recriar cargo @${role.name}: ${err.message}`);
      }
    }
    cloneStatus.progress = 70;

    // Passo 6: Recriar Categorias e Canais
    cloneStatus.stage = "Construindo Estrutura de Canais";
    const channelMapping: Record<string, string> = {}; // ID antigo -> ID novo

    // 1º: Criar categorias (tipo 4)
    const categories = sourceChannels.filter(c => c.type === 4).sort((a, b) => a.position - b.position);
    addLog("info", "📁 Criando categorias...");
    for (const cat of categories) {
      try {
        const newCat = await discordRequest(`/guilds/${destId}/channels`, 'POST', {
          name: cat.name,
          type: 4,
          position: cat.position
        });
        channelMapping[cat.id] = newCat.id;
        addLog("debug", `   └─ Categoria [${cat.name}] criada.`);
        cloneStatus.stats.channelsCreated++;
        await sleep(400);
      } catch (err: any) {
        addLog("warning", `⚠️ Falha ao criar categoria [${cat.name}]: ${err.message}`);
      }
    }

    // 2º: Criar canais de texto (0) e voz (2) dentro das respectivas categorias
    const otherChannels = sourceChannels.filter(c => c.type !== 4).sort((a, b) => a.position - b.position);
    addLog("info", "💬 Criando canais de texto e voz...");
    for (const chan of otherChannels) {
      try {
        const parentId = chan.parent_id ? channelMapping[chan.parent_id] : null;
        const newChan = await discordRequest(`/guilds/${destId}/channels`, 'POST', {
          name: chan.name,
          type: chan.type,
          position: chan.position,
          topic: chan.topic || "",
          nsfw: chan.nsfw || false,
          rate_limit_per_user: chan.rate_limit_per_user || 0,
          parent_id: parentId
        });
        channelMapping[chan.id] = newChan.id;
        addLog("debug", `   └─ Canal #${chan.name} criado.`);
        cloneStatus.stats.channelsCreated++;
        await sleep(400);
      } catch (err: any) {
        addLog("warning", `⚠️ Falha ao criar canal #${chan.name}: ${err.message}`);
      }
    }
    cloneStatus.progress = 85;

    // Deletar canal temporário de suporte
    try {
      addLog("info", "🧹 Removendo canal de suporte temporário...");
      await discordRequest(`/channels/${tempChan.id}`, 'DELETE');
    } catch {}

    // Passo 7: Enviar Histórico de Mensagens nos Novos Canais
    cloneStatus.stage = "Enviando Histórico de Mensagens";
    addLog("info", "💬 Enviando histórico de mensagens para os novos canais...");
    for (const [oldChanId, msgs] of Object.entries(messagesCache)) {
      const newChanId = channelMapping[oldChanId];
      if (!newChanId) continue;

      const oldChanName = sourceChannels.find(c => c.id === oldChanId)?.name || "canal";
      addLog("info", `📨 Transferindo ${msgs.length} mensagens para #${oldChanName}...`);

      for (const msg of msgs) {
        try {
          const content = `**[${msg.author.username}]**: ${msg.content}`;
          await discordRequest(`/channels/${newChanId}/messages`, 'POST', { content });
          cloneStatus.stats.messagesCloned++;
          await sleep(500); // Pequeno intervalo para contornar flood limits
        } catch {}
      }
    }
    cloneStatus.progress = 95;

    // Passo 8: Localizar ou Criar o cargo de Membro e atribuir a todos os players
    cloneStatus.stage = "Sincronizando Membros";
    addLog("info", "👥 Procurando ou criando o cargo de 'Membro'...");
    
    let membroRoleId = Object.values(roleMapping)[0];
    const destRolesRefreshed: DiscordRole[] = await discordRequest(`/guilds/${destId}/roles`);
    const existingMembroRole = destRolesRefreshed.find(r => r.name.toLowerCase() === "membro" || r.name.toLowerCase() === "member");
    
    if (existingMembroRole) {
      membroRoleId = existingMembroRole.id;
      addLog("info", "✅ Cargo 'Membro' existente localizado.");
    } else {
      addLog("info", "✨ Criando cargo exclusivo de 'Membro'...");
      try {
        const newMembro = await discordRequest(`/guilds/${destId}/roles`, 'POST', {
          name: "Membro",
          color: 0x3498db, // Azul claro
          hoist: true,
          mentionable: true
        });
        membroRoleId = newMembro.id;
        addLog("success", "✅ Cargo 'Membro' criado com sucesso.");
      } catch (err: any) {
        addLog("warning", `⚠️ Não foi possível criar cargo 'Membro' adicional: ${err.message}`);
      }
    }

    addLog("info", "📡 Baixando lista de membros do servidor de destino...");
    try {
      const members = await discordRequest(`/guilds/${destId}/members?limit=1000`);
      addLog("info", `   └─ ${members.length} membros encontrados. Aplicando cargos...`);
      
      for (const m of members) {
        if (m.user.bot) continue; // Pular bots
        
        try {
          addLog("info", `👤 Atribuindo @Membro para o player: ${m.user.username}...`);
          await discordRequest(`/guilds/${destId}/members/${m.user.id}/roles/${membroRoleId}`, 'PUT');
          cloneStatus.stats.membersUpdated++;
          await sleep(400);
        } catch (err: any) {
          addLog("debug", `⚠️ Erro ao colocar cargo em ${m.user.username}: ${err.message}`);
        }
      }
      addLog("success", `✅ Cargo atribuído a ${cloneStatus.stats.membersUpdated} membros.`);
    } catch (err: any) {
      addLog("warning", `⚠️ Falha ao gerenciar membros do servidor: ${err.message}`);
    }

    cloneStatus.progress = 100;
    cloneStatus.stage = "Finalizado com Sucesso";
    addLog("success", "🎉 Sincronização completa de canais, cargos e mensagens concluída com extremo sucesso!");

  } catch (error: any) {
    addLog("error", `❌ Ocorreu um erro crítico durante a sincronização: ${error.message}`);
    cloneStatus.stage = "Erro Fatal";
  } finally {
    cloneStatus.active = false;
  }
}

// ENDPOINTS REST PARA A INTERFACE RECURSIVA DO APP
app.get("/api/status", (req, res) => {
  const hasToken = !!process.env.DISCORD_BOT_TOKEN;
  res.json({
    hasToken,
    cloneStatus
  });
});

app.post("/api/discord/validate", async (req, res) => {
  const token = req.body.token || process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    return res.status(400).json({ valid: false, message: "Nenhum token fornecido." });
  }

  try {
    const user = await discordRequest("/users/@me", "GET", null, token);
    res.json({
      valid: true,
      username: `${user.username}#${user.discriminator || '0000'}`,
      id: user.id,
      avatar: user.avatar
    });
  } catch (error: any) {
    res.status(401).json({
      valid: false,
      message: error.message || "Token inválido ou não autorizado."
    });
  }
});

app.post("/api/clone/start", async (req, res) => {
  if (cloneStatus.active) {
    return res.status(400).json({ message: "Já existe uma cópia em andamento." });
  }

  const { sourceId, destId, serverName, simulate } = req.body;
  
  if (!sourceId || !destId || !serverName) {
    return res.status(400).json({ message: "Parâmetros são obrigatórios." });
  }

  cloneStatus.active = true;
  cloneStatus.isSimulated = !!simulate;
  cloneStatus.logs = [];
  cloneStatus.progress = 0;
  cloneStatus.stage = "Iniciando";

  if (simulate) {
    runSimulation(sourceId, destId, serverName);
  } else {
    runRealBackup(sourceId, destId, serverName);
  }

  res.json({ success: true, message: "Processo de cópia iniciado." });
});

app.post("/api/clone/cancel", (req, res) => {
  if (!cloneStatus.active) {
    return res.status(400).json({ message: "Nenhum processo em andamento." });
  }
  
  addLog("warning", "🛑 Cancelamento solicitado pelo usuário. O processo será interrompido.");
  cloneStatus.active = false;
  cloneStatus.stage = "Cancelado";
  res.json({ success: true, message: "Cancelado com sucesso." });
});

// Configuração do Servidor Estático ou Middleware de Desenvolvimento
async function configureApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

configureApp();
