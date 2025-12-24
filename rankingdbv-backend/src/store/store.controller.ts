import { Controller, Get, Post, Body, Param, Req, UseGuards, Delete } from '@nestjs/common';
import { StoreService } from './store.service';
import { CreateProductDto } from './dto/create-product.dto';
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

    @Delete('products/:id')
    deleteProduct(@Param('id') id: string) {
        return this.storeService.deleteProduct(id);
    }

    @Post('buy/:productId')
    buyProduct(@Req() req, @Param('productId') productId: string) {
        return this.storeService.buyProduct(req.user.id, productId);
    }

    @Get('my-purchases')
    getMyPurchases(@Req() req) {
        return this.storeService.getMyPurchases(req.user.id);
    }
}
