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
    { name: "NSS - Núcleo de Suporte de Sistemas", description: "Tecnologia da Informação" },
    { name: "NIR - Núcleo de Infraestrutura de Redes", description: "Infraestrutura e Redes" },
    { name: "NMT - Núcleo de Manutenção Técnica", description: "Manutenção Técnica" },
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
        "Monitor sem imagem",
        "Teclado/Mouse com defeito",
        "Cabo/Conexão",
        "Outro",
      ],
    },
    {
      code: "NETWORK",
      name: "nternet",
      icon: "wifi",
      sortOrder: 2,
      allowsFreeText: false,
      subcategories: [
        "Sem acesso à internet",
        "Internet lenta",
        "Cabo de rede",
        "Wi-Fi não conecta",
        "VPN não conecta",
        "Falha de Confiança",
        "Outro",
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
        "Problema no SIGED",
        "Problema no e-mail institucional",
      ],
    },
    {
      code: "PRINTER",
      name: "Impressora",
      icon: "printer",
      sortOrder: 4,
      allowsFreeText: false,
      subcategories: [
        "Impressora não imprime",
        "Papel enroscado",
        "Toner/Cartucho vazio ou com defeito",
        "Impressora offline",
        "Qualidade de impressão ruim",
        "Impressora não reconhecida pelo computador",
        "Outro",
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
  const nssDept = await prisma.department.findFirst({
    where: { name: { contains: "NSS" } },
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
      departmentId: nssDept?.id || null,
    },
    update: {
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
