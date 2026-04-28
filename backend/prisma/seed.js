import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // ── Setores de TI (únicos pré-criados; demais são criados pelo admin) ────
  const departments = [
    "Núcleo de Suporte de Sistemas (NSS)",
    "Núcleo de Infraestrutura de Redes (NIR)",
    "Núcleo de Manutenção Técnica (NMT)",
  ];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { name },
      create: { name, active: true },
      update: { active: true },
    });
  }

  // ── Unidades ────────────────────────────────────────────────────────────
  const units = [
    { name: "NSS", description: "Tecnologia da Informação" },
    { name: "NIR", description: "Infraestrutura e Redes" },
    { name: "NMT", description: "Manutenção Técnica" },
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
      name: "Computador",
      icon: "desktop",
      sortOrder: 1,
      allowsFreeText: false,
      subcategories: [
        "Computador não liga",
        "Computador travado",
        "Monitor sem imagem",
        "Mouse/Teclado não funciona",
        "Outro",
      ],
    },
    {
      code: "NETWORK",
      name: "Internet",
      icon: "wifi",
      sortOrder: 2,
      allowsFreeText: false,
      subcategories: [
        "Sem internet",
        "Internet lenta",
        "Falha de confiança",
        "Wi-Fi não conecta",
        "Outro",
      ],
    },
    {
      code: "ACCESS",
      name: "Senhas e Sistemas",
      icon: "key",
      sortOrder: 3,
      allowsFreeText: false,
      subcategories: [
        "Esqueci a senha (SIGED)",
        "Usuário bloqueado",
        "Criação de usuário (Novo Servidor)",
        "Problema no SIGED",
        "Problema no site da SEJUSC",
      ],
    },
    {
      code: "PRINTER",
      name: "Impressora",
      icon: "printer",
      sortOrder: 4,
      allowsFreeText: false,
      subcategories: [
        "Impressora não aparece",
        "Impressora offline",
        "Impressão não sai",
        "Papel enroscado",
        "Sem papel",
        "Troca de toner",
      ],
    },
    {
      code: "REMOTE",
      name: "Suporte Remoto",
      icon: "monitor-smartphone",
      sortOrder: 5,
      allowsFreeText: false,
      subcategories: [],
    },
  ];

  // Remove categoria OTHER obsoleta (se não tiver chamados vinculados)
  await prisma.category.deleteMany({
    where: { code: "OTHER", tickets: { none: {} } },
  });

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

    // Remove subcategorias obsoletas (sem chamados vinculados)
    await prisma.subcategory.deleteMany({
      where: {
        categoryId: created.id,
        name: { notIn: cat.subcategories },
        tickets: { none: {} },
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
    where: { name: "NSS" },
  });
  const nssDept = await prisma.department.findFirst({
    where: { name: { contains: "NSS" } },
  });

  await prisma.user.upsert({
    where: { cpf: adminCpf },
    create: {
      cpf: adminCpf,
      name: "Guilherme Oliveira",
      passwordHash: adminHash,
      role: "ADMIN",
      active: true,
      unitId: nss?.id || null,
      departmentId: nssDept?.id || null,
    },
    update: {
      name: "Guilherme Oliveira",
      role: "ADMIN",
      active: true,
      unitId: nss?.id || null,
      departmentId: nssDept?.id || null,
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
