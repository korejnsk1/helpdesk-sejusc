# HelpDesk SEJUSC

Sistema interno de chamados de TI para a SEJUSC.

## Stack
- **Backend**: Node.js + Express + Prisma (MySQL) + JWT + bcrypt + Socket.io
- **Frontend**: React + Vite + TailwindCSS + React Router + Recharts
- **Integração**: GLPI v10 REST API (Fase 6)

## Estrutura
```
Projeto HelpDesk/
├── backend/        # API Express + Prisma
├── frontend/       # SPA React + Vite
└── docs/           # Documentação
```

## Pré-requisitos
- Node.js 18+
- MySQL 8+ rodando localmente (ou acessível via rede)
- Base de dados criada: `CREATE DATABASE helpdesk_sejusc CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`

## Setup — Backend
```bash
cd backend
cp .env.example .env
# Edite DATABASE_URL e JWT_SECRET em .env
npm install
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```
API disponível em `http://localhost:3333`.

**Credenciais de desenvolvimento** (criadas pelo seed):
- Monitor: CPF `529.982.247-25` · senha `admin123`
- Técnico: CPF `111.444.777-35` · senha `tec123`

## Setup — Frontend
```bash
cd frontend
npm install
npm run dev
```
Aplicação disponível em `http://localhost:5173`.

## Fluxos

### Usuário (público, sem login)
1. Acessa `/` → clica em **Abrir chamado**
2. Informa nome, departamento, CPF (com validação + máscara)
3. Seleciona categoria em cards grandes e depois subcategoria
4. Recebe protocolo `YYYYMMDD-NNNN` e é redirecionado para `/acompanhar/:numero`
5. Acompanha o progresso em timeline vertical
6. Quando concluído e o módulo de feedback estiver ativo, pode avaliar (1–5 estrelas + comentário)

### Monitor de Plantão (MONITOR)
- Login em `/login` com CPF + senha
- Painel `/painel` com chamados do dia agrupados por unidade + indicador de não atribuídos
- Detalha qualquer chamado e executa transições de estado
- Campos obrigatórios ao concluir: **Causa** e **Solução**
- Relatórios em `/painel/relatorios`

### Técnico (TECHNICIAN)
- Vê apenas chamados da sua unidade ou atribuídos a ele
- Não pode alterar o status — quem controla é o monitor de plantão

## Estados do chamado
`OPEN → VIEWED → (EN_ROUTE) → IN_SERVICE → COMPLETED`

A máquina de estados é validada no backend — o frontend só renderiza as ações permitidas.

## Módulo de Feedback
Controlado pela variável `FEEDBACK_ENABLED` em `.env`. Quando desativada, o formulário simplesmente não aparece e o endpoint retorna 404. Os dados já gravados permanecem no banco.

## Integração GLPI (Fase 6)
Desabilitada por padrão. Para ativar:
1. Solicite ao administrador do GLPI: **habilitar a API REST**
2. Gere `App-Token` e `User-Token`
3. Preencha `GLPI_*` no `.env` e `GLPI_ENABLED=true`
4. A exportação acontece automaticamente quando o chamado é concluído

## Próximos passos sugeridos
- QR code nos departamentos apontando para `/novo-chamado`
- HTTPS com certificado interno da SEJUSC
- Backup automático da base MySQL
