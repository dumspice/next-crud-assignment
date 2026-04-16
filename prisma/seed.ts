import { PrismaClient, Prisma, Role } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import pg from "pg";
import "dotenv/config";

// Cấu hình Adapter cho PostgreSQL
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("🚀 Bắt đầu xóa dữ liệu cũ...");
  await prisma.post.deleteMany();
  await prisma.category.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  // 1. Tạo các Categories mẫu
  console.log("📂 Đang tạo categories...");
  const categories = await Promise.all([
    prisma.category.create({ data: { name: "Công nghệ" } }),
    prisma.category.create({ data: { name: "Lập trình" } }),
    prisma.category.create({ data: { name: "Đời sống" } }),
  ]);

  // 2. Định nghĩa dữ liệu Users (1 Admin + 2 Users)
  const usersToCreate = [
    {
      email: "admin@example.com",
      name: "Quản trị viên",
      password: "123456",
      role: Role.ADMIN,
      bio: "Tôi là Admin và tôi cũng viết lách.",
    },
    {
      email: "user1@example.com",
      name: "Nguyễn Văn A",
      password: "123456",
      role: Role.USER,
      bio: "Lập trình viên Fullstack.",
    },
    {
      email: "user2@example.com",
      name: "Trần Thị B",
      password: "123456",
      role: Role.USER,
      bio: "Chuyên gia Content Marketing.",
    },
  ];

  console.log("👤 Đang tạo Users và Posts...");

  for (const userData of usersToCreate) {
    // Tạo 10 bài posts mẫu cho mỗi User (bao gồm cả Admin)
    const posts: Prisma.PostCreateNestedManyWithoutAuthorInput = {
      create: Array.from({ length: 10 }).map((_, i) => ({
        title: `Bài viết #${i + 1} của ${userData.name}`,
        published: true,
        categories: {
          connect: { id: categories[i % categories.length].id }, // Gán category xoay vòng
        },
      })),
    };

    // Thực hiện tạo User kèm Profile và 10 Posts
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: await bcrypt.hash(userData.password, 10),
        role: userData.role,
        profile: {
          create: { bio: userData.bio },
        },
        posts: posts,
      },
    });

    console.log(`✅ Đã tạo xong User: ${user.email} với 10 bài viết.`);
  }

  console.log("✨ Hoàn tất quá trình Seed data!");
}

main()
  .catch((e) => {
    console.error("❌ Lỗi khi seed data:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end(); // Đóng kết nối pool của pg
  });
