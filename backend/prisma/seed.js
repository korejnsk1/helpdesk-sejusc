import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ── Unidades ────────────────────────────────────────────────────────────
  const units = [
    { name: "NSS - Núcleo de Suporte de Sistemas", description: "Tecnologia da Informação" },
    { name: "Unidade Centro", description: "Atendimento região central" },
    { name: "Unidade Norte", description: "Atendimento zona norte" },
    { name: "Unidade Sul", description: "Atendimento zona sul" },
  ];
  for (const u of units) {
    await prisma.unit.upsert({
      where: { name: u.name },
      create: u,
      update: u,
    });
  }

  // ── Categorias e subcategorias ───────────────────────────────────────────
  const categories = [
    {
      code: "HARDWARE",
      name: "Problema de Hardware",
      icon: "desktop",
      sortOrder: 1,
      allowsFreeText: false,
      subcategories: [
        "Computador não liga",
        "Monitor sem imagem",
        "Teclado/Mouse com defeito",
        "Impressora com erro",
        "Cabo/Conexão",
        "Outro hardware",
      ],
    },
    {
      code: "NETWORK",
      name: "Problema de Rede/Internet",
      icon: "wifi",
      sortOrder: 2,
      allowsFreeText: false,
      subcategories: [
        "Sem acesso à internet",
        "Internet lenta",
        "Cabo de rede",
        "Wi-Fi não conecta",
        "VPN não conecta",
      ],
    },
    {
      code: "ACCESS",
      name: "Acesso a Sistema ou Senha",
      icon: "key",
      sortOrder: 3,
      allowsFreeText: false,
      subcategories: [
        "Esqueci a senha",
        "Usuário bloqueado",
        "Solicitar acesso a novo sistema",
        "Problema no GLPI",
        "Problema no e-mail institucional",
      ],
    },
    {
      code: "OTHER",
      name: "Outro",
      icon: "help",
      sortOrder: 99,
      allowsFreeText: true,
      subcategories: [],
    },
  ];

  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { code: cat.code },
      create: {
        code: cat.code,
        name: cat.name,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        allowsFreeText: cat.allowsFreeText,
      },
      update: {
        name: cat.name,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        allowsFreeText: cat.allowsFreeText,
      },
    });
    for (const subName of cat.subcategories) {
      const existing = await prisma.subcategory.findFirst({
        where: { categoryId: created.id, name: subName },
      });
      if (!existing) {
        await prisma.subcategory.create({
          data: { name: subName, categoryId: created.id },
        });
      }
    }
  }

  // ── Usuário ADMIN (único usuário pré-criado) ─────────────────────────────
  // CPF do administrador do sistema
  const adminCpf = "48215374867";
  const adminHash = await bcrypt.hash("admin@2025", 10);

  const nss = await prisma.unit.findUnique({
    where: { name: "NSS - Núcleo de Suporte de Sistemas" },
  });

  await prisma.user.upsert({
    where: { cpf: adminCpf },
    create: {
      cpf: adminCpf,
      name: "Administrador SEJUSC",
      passwordHash: adminHash,
      role: "ADMIN",
      active: true,
      unitId: nss?.id || null,
    },
    update: {
      role: "ADMIN",
      active: true,
    },
  });

  // Remove usuários de desenvolvimento antigos (CPFs fictícios do seed anterior)
  await prisma.user.deleteMany({
    where: { cpf: { in: ["52998224725", "11144477735"] } },
  });

  console.log("✅ Seed concluído.");
  console.log("Admin → CPF: 482.153.748-67 | senha: admin@2025");
  console.log("Demais usuários devem se cadastrar via /cadastro e aguardar aprovação.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
