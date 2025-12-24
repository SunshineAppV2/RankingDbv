import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class StoreService {
    constructor(private prisma: PrismaService) { }

    async listProducts(clubId: string) {
        return this.prisma.product.findMany({
            where: { clubId },
            orderBy: { price: 'asc' },
        });
    }

    async createProduct(clubId: string, data: CreateProductDto) {
        return this.prisma.product.create({
            data: {
                ...data,
                clubId,
            },
        });
    }

    async deleteProduct(productId: string) {
        return this.prisma.product.delete({
            where: { id: productId },
        });
    }

    // --- CORE: Purchase Logic ---
    async buyProduct(userId: string, productId: string) {
        // Transaction to ensure data integrity
        return this.prisma.$transaction(async (tx) => {
            // 1. Get User and Product
            const user = await tx.user.findUnique({ where: { id: userId } });
            const product = await tx.product.findUnique({ where: { id: productId } });

            if (!user || !product) throw new BadRequestException('User or Product not found');

            // 2. Data Validation
            if (user.points < product.price) {
                throw new BadRequestException('Saldo insuficiente de pontos (XP).');
            }

            if (product.stock === 0) {
                throw new BadRequestException('Produto esgotado.');
            }

            // 3. Deduct Points from User
            const updatedUser = await tx.user.update({
                where: { id: userId },
                data: {
                    points: { decrement: product.price },
                    pointsHistory: {
                        create: {
                            amount: -product.price,
                            reason: `Compra: ${product.name}`,
                            source: 'PURCHASE'
                        }
                    }
                }
            });

            // 4. Update Stock (if not infinite -1)
            if (product.stock > 0) {
                await tx.product.update({
                    where: { id: productId },
                    data: { stock: { decrement: 1 } }
                });
            }

            // 5. Create Purchase Record
            const purchase = await tx.purchase.create({
                data: {
                    userId,
                    productId,
                    cost: product.price,
                    status: product.category === 'VIRTUAL' ? 'APPLIED' : 'PENDING'
                }
            });

            return { purchase, newBalance: updatedUser.points };
        });
    }

    async getMyPurchases(userId: string) {
        return this.prisma.purchase.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { createdAt: 'desc' }
        });
    }
}
