import { Controller, Get, Post, Body, Param, Req, UseGuards, Delete, Patch } from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('store')
@UseGuards(JwtAuthGuard)
export class StoreController {
    constructor(private readonly storeService: StoreService) { }

    @Get('products')
    listProducts(@Req() req) {
        return this.storeService.listProducts(req.user.clubId);
    }

    @Post('products')
    createProduct(@Req() req, @Body() body: CreateProductDto) {
        return this.storeService.createProduct(req.user.clubId, body);
    }

    @Patch('products/:id')
    updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
        return this.storeService.updateProduct(id, body);
    }

    @Delete('products/:id')
    deleteProduct(@Param('id') id: string) {
        return this.storeService.deleteProduct(id);
    }

    @Post('buy/:productId')
    buyProduct(@Req() req, @Param('productId') productId: string) {
        // Fix: JwtStrategy returns userId, not id
        console.log('Buy Request User:', req.user);
        return this.storeService.buyProduct(req.user.userId, productId);
    }

    @Get('inventory') // Existing endpoint for user inventory
    getMyPurchases(@Req() req) {
        return this.storeService.getMyPurchases(req.user.id);
    }

    @Get('products/:clubId') // Fix missing parameter route in FE vs BE
    listProductsByClub(@Param('clubId') clubId: string) {
        return this.storeService.listProducts(clubId);
    }

    // Admin Routes
    @Get('admin/purchases')
    getClubPurchases(@Req() req) {
        return this.storeService.getClubPurchases(req.user.clubId);
    }

    @Post('admin/deliver/:id')
    markDelivered(@Param('id') id: string) {
        return this.storeService.markDelivered(id);
    }

    @Post('admin/refund/:id')
    refundPurchase(@Param('id') id: string) {
        return this.storeService.refundPurchase(id);
    }
}
