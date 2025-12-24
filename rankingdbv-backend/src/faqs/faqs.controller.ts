import { Controller, Get, Patch, Post, Param, UseGuards, Query } from '@nestjs/common';
import { FaqsService } from './faqs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('faqs')
@UseGuards(JwtAuthGuard)
export class FaqsController {
    constructor(private readonly faqsService: FaqsService) { }

    @Get()
    findAll(@Query('all') all: string) {
        // If 'all' query param is passed (e.g. ?all=true), show hidden ones too.
        // Usually only Admins should do this, but for simplicity we rely on the frontend to toggle.
        // Ideally: check user Role here.
        const showAll = all === 'true';
        return this.faqsService.findAll(!showAll);
    }

    @Patch(':id/toggle')
    toggleVisibility(@Param('id') id: string) {
        return this.faqsService.toggleVisibility(id);
    }

    @Post('seed')
    seed() {
        return this.faqsService.seedDefaultFaqs();
    }
}
