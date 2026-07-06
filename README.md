# 🤖 Bot de Registro — Rac do Japão

Bot de registro automático para Discord desenvolvido em **Node.js** com **discord.js v14**.  
Automatiza completamente a entrada de novos membros na organização, reduzindo o trabalho da liderança.

---

## 📁 Estrutura de Arquivos

```
bot-registro-rac-japao/
├── index.js        ← Arquivo principal (lógica do bot)
├── config.js       ← Todas as configurações (IDs, cores, etc.)
├── embeds.js       ← Embeds e componentes visuais
├── utils.js        ← Anti-spam, validações e persistência
├── dados.json      ← Persistência automática (gerado pelo bot)
├── package.json    ← Dependências do projeto
├── .env            ← Token do bot (você cria a partir do .env.example)
└── .env.example    ← Modelo do arquivo .env
```

---

## ⚙️ Configuração Rápida

### 1. Instalar o Node.js
Baixe e instale o Node.js **v16.9.0 ou superior**: https://nodejs.org

### 2. Instalar as dependências
```bash
npm install
```

### 3. Criar o arquivo `.env`
Copie o arquivo de exemplo e preencha com o token do seu bot:
```bash
cp .env.example .env
```
Abra o `.env` e substitua `seu_token_aqui` pelo token real:
```
DISCORD_TOKEN=seu_token_aqui_real
```

### 4. Verificar as configurações em `config.js`
Confirme se os IDs estão corretos:

| Campo                | Valor atual                |
|----------------------|---------------------------|
| `GUILD_ID`           | `1495178024759332914`     |
| `CANAL_REGISTRO_ID`  | `1495790507182522450`     |
| `CANAL_APROVACAO_ID` | `1495178025602515177`     |
| `CARGO_MEMBRO_ID`    | `1495178024759332915`     |
| `PREFIXO_APELIDO`    | `\|MEM\|`                 |
| `NOME_FACCAO`        | `Rac do Japão`            |
| `COOLDOWN_MS`        | `30000` (30 segundos)     |

> ℹ️ O `CANAL_APROVACAO_ID` é o canal onde a **staff** verá as solicitações e poderá aprovar/recusar.

### 5. Iniciar o bot
```bash
node index.js
```
Ou com reinício automático (desenvolvimento):
```bash
npm run dev
```

---

## 🔐 Permissões do Bot no Discord

Ao adicionar o bot ao servidor, certifique-se de que ele possua as seguintes permissões:

| Permissão             | Necessária para                         |
|-----------------------|-----------------------------------------|
| Gerenciar Cargos      | Adicionar o cargo de Membro             |
| Gerenciar Apelidos    | Alterar o apelido do novo membro        |
| Enviar Mensagens      | Enviar painel e mensagens nos canais    |
| Ler Mensagens         | Processar interações                    |
| Incorporar Links      | Exibir embeds                           |
| Usar Componentes      | Botões e modais                         |

> ⚠️ **Importante:** O cargo do bot deve estar **acima** do cargo `Membro` na hierarquia do Discord  
> (Configurações do servidor → Cargos → arraste o cargo do bot para cima)

---

## 🚀 Como Funciona

```
Membro clica em "Registrar"
        ↓
Formulário (Modal) abre
  • Nome RP
  • ID / Passaporte
        ↓
Solicitação enviada ao canal de aprovação
        ↓
Staff clica em ✅ Aprovar  ou  ❌ Recusar
        ↓
SE APROVADO:                    SE RECUSADO:
• Cargo de Membro adicionado    • DM de recusa enviada
• Apelido alterado para          • Solicitação removida
  |MEM| Nome ID
• DM de aprovação enviada
```

---

## 🛡️ Sistema Anti-Spam & Segurança

- **Cooldown de 30 segundos** entre tentativas de registro
- **Validação** de Nome RP (apenas letras, espaços, apóstrofo, hífen; 3–40 chars)
- **Validação** de ID/Passaporte (2–20 chars)
- **Verifica** se o usuário já tem o cargo (já é membro)
- **Verifica** se já há uma solicitação pendente do mesmo usuário
- **Sistema de Blacklist** para bloquear usuários específicos

---

## 💬 Comandos de Staff

| Comando                | Permissão necessária | Descrição                                    |
|------------------------|----------------------|----------------------------------------------|
| `!painel`              | Gerenciar Mensagens  | Recria o painel no canal de registro         |
| `!blacklist @usuário`  | Administrador        | Adiciona/remove usuário da blacklist         |

---

## 💾 Persistência de Dados

O arquivo `dados.json` é gerado automaticamente e armazena:

- `painelMensagemId` — ID do painel (evita criar duplicatas ao reiniciar)
- `pendentes` — Solicitações aguardando aprovação
- `aprovados` — Histórico de aprovações
- `recusados` — Histórico de recusas
- `blacklist` — Usuários bloqueados

> Os dados **não são perdidos** ao reiniciar o bot. 🎉

---

## 🔧 Obtendo o Token do Bot

1. Acesse: https://discord.com/developers/applications
2. Crie uma nova aplicação
3. Vá em **Bot** → **Reset Token** → copie o token
4. Em **Bot** → ative: `SERVER MEMBERS INTENT` e `MESSAGE CONTENT INTENT`
5. Em **OAuth2 → URL Generator**: selecione `bot` + as permissões necessárias
6. Use o link gerado para adicionar o bot ao servidor

---

## ❓ Problemas Comuns

| Problema                          | Solução                                                              |
|-----------------------------------|----------------------------------------------------------------------|
| Bot não envia DM                  | O usuário precisa ter "Mensagens Diretas" habilitadas para o servidor|
| Erro ao adicionar cargo           | Verifique a hierarquia: o cargo do bot deve estar acima do Membro    |
| Erro ao alterar apelido           | O bot não pode alterar apelido do dono do servidor                   |
| `TOKEN` inválido                  | Verifique o arquivo `.env` e se o token não expirou                  |
| Painel com múltiplas mensagens    | Use `!painel` para recriar; o ID antigo é invalidado automaticamente |

---

## 📌 Feito para

**Rac do Japão** — Sistema de Registro Automático v1.0  
Desenvolvido com ❤️ usando discord.js v14
