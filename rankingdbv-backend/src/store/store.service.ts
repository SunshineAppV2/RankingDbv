import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
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

    async updateProduct(id: string, data: any) {
        return this.prisma.product.update({
            where: { id },
            data,
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
            console.log(`[StoreService] Creating purchase record for user ${userId} product ${productId}`);
            const purchase = await tx.purchase.create({
                data: {
                    userId,
                    productId,
                    cost: product.price,
                    status: product.category === 'VIRTUAL' ? 'APPLIED' : 'PENDING'
                }
            });

            console.log(`[StoreService] Purchase successful. New balance: ${updatedUser.points}`);
            return { purchase, newBalance: updatedUser.points };
        }).catch(error => {
            console.error('[StoreService] Transaction failed:', error);
            // Write to file for debugging
            fs.writeFileSync('purchase-error.log', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

            // Re-throw with message
            throw new InternalServerErrorException(`Erro na transação: ${error.message}`);
        });
    }

    async getMyPurchases(userId: string) {
        return this.prisma.purchase.findMany({
            where: { userId },
            include: { product: true },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getClubPurchases(clubId: string) {
        return this.prisma.purchase.findMany({
            where: { product: { clubId } },
            include: {
                product: true,
                user: { select: { id: true, name: true, role: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async markDelivered(purchaseId: string) {
        return this.prisma.purchase.update({
            where: { id: purchaseId },
            data: { status: 'DELIVERED' }
        });
    }

    async refundPurchase(purchaseId: string) {
        return this.prisma.$transaction(async (tx) => {
            const purchase = await tx.purchase.findUnique({
                where: { id: purchaseId },
                include: { product: true, user: true }
            });

            if (!purchase) throw new BadRequestException('Pedido não encontrado.');
            if (purchase.status === 'CANCELED' || purchase.status === 'REFUNDED') {
                throw new BadRequestException('Pedido já estornado.');
            }

            // 1. Refund Points
            await tx.user.update({
                where: { id: purchase.userId },
                data: {
                    points: { increment: purchase.cost },
                    pointsHistory: {
                        create: {
                            amount: purchase.cost,
                            reason: `Estorno: ${purchase.product.name}`,
                            source: 'REFUND'
                        }
                    }
                }
            });

            // 2. Return to Stock (if not infinite)
            if (purchase.product.stock !== -1) {
                await tx.product.update({
                    where: { id: purchase.productId },
                    data: { stock: { increment: 1 } }
                });
            }

            // 3. Mark Purchase as Refunded
            return tx.purchase.update({
                where: { id: purchaseId },
                data: { status: 'REFUNDED' }
            });
        });
    }
}
