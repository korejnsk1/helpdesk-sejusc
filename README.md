# HelpDesk SEJUSC

Sistema interno de chamados de TI para a SEJUSC.

## Stack
- **Backend**: Node.js + Express + Prisma (MySQL) + JWT + bcrypt + Socket.io
- **Frontend**: React + Vite + TailwindCSS + React Router + Recharts

## Estrutura
```
helpdesk-sejusc/
├── backend/        # API Express + Prisma
├── frontend/       # SPA React + Vite
└── docker-compose.yml
```

## Setup com Docker (recomendado)
```bash
cp .env.example .env
# Edite as variáveis em .env
docker-compose up -d
```

API disponível em `http://localhost:3333` · Frontend em `http://localhost:5173`.

## Setup manual

### Backend
```bash
cd backend
cp .env.example .env
# Edite DATABASE_URL e JWT_SECRET em .env
npm install
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

**Credenciais criadas pelo seed:**
- Admin: CPF `482.153.748-67` · senha `admin@2025`

## Fluxos

### Usuário (requer login)
1. Acessa `/login` e entra com CPF + senha
2. Seleciona categoria e subcategoria do problema
3. Recebe protocolo `YYYYMMDD-NNNN`
4. Acompanha o progresso em `/acompanhar/:numero`
5. Quando concluído, pode avaliar o atendimento (1–5 estrelas)

### Monitor de Plantão (MONITOR)
- Painel `/painel` com chamados do dia agrupados por unidade
- Executa transições de estado e atribui técnicos
- Campos obrigatórios ao concluir: **Causa** e **Solução**
- Aba **Senhas** para gerenciar solicitações de redefinição de senha
- Relatórios em `/painel/relatorios`

### Técnico (TECHNICIAN)
- Vê apenas chamados da sua unidade ou atribuídos a ele
- Não pode alterar o status — quem controla é o monitor de plantão

## Estados do chamado
`OPEN → VIEWED → (EN_ROUTE) → IN_SERVICE → COMPLETED`

A máquina de estados é validada no backend — o frontend só renderiza as ações permitidas.

## Módulo de Feedback
Controlado pela variável `FEEDBACK_ENABLED` em `.env`. Quando desativada, o formulário não aparece e o endpoint retorna 404.

## Próximos passos sugeridos
- QR code nos departamentos apontando para `/novo-chamado`
- HTTPS com certificado interno da SEJUSC
- Backup automático da base MySQL
