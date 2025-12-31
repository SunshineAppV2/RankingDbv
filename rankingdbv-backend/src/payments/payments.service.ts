import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoConfig, PreApprovalPlan } from 'mercadopago';

@Injectable()
export class PaymentsService implements OnApplicationBootstrap {
    private readonly logger = new Logger(PaymentsService.name);
    private readonly mpClient: MercadoPagoConfig;

    // PagBank (Existing)
    private readonly token = process.env.PAGBANK_TOKEN || '4b85aac0-5c29-4876-963a-378cb7b3fcfaa53575bb4e2bad2a7a5ef3d3e1d76dcbfa24-2042-43d6-bd15-487dac931b2a';
    private readonly baseUrl = (process.env.NODE_ENV === 'production' || process.env.PAGBANK_ENV === 'production')
        ? 'https://api.pagseguro.com'
        : 'https://sandbox.api.pagseguro.com';

    constructor(
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService
    ) {
        this.mpClient = new MercadoPagoConfig({
            accessToken: 'APP_USR-1556887722137553-100213-a10130c72f03d76fc0a84e8b5ef2954e-91513558'
        });
    }

    async onApplicationBootstrap() {
        this.logger.log('Checking Payment Plans Configuration...');
        const plans = await this.getPlanIds();
        // Check if plans exist AND if the first plan matches the new structure (Básico)
        // Plans are stored as { key, id }. Key is sanitized reason.
        const isCurrentStructure = plans && plans.some((p: any) => p.key && p.key.includes('básico'));

        if (!plans || plans.length === 0 || !isCurrentStructure) {
            this.logger.warn('Payment plans outdated or missing. Auto-initializing Mercado Pago plans...');
            await this.setupAllPlans();
        } else {
            this.logger.log('Payment plans already configured.');
        }

        // Ensure defaults exist
        const settings = await this.getPublicSettings();
        if (settings.mercadopago_enabled === undefined) await this.updateSystemSettings('mercadopago_enabled', true);
        if (settings.referral_system_enabled === undefined) await this.updateSystemSettings('referral_system_enabled', true);
        if (settings.pix_payment_enabled === undefined) await this.updateSystemSettings('pix_payment_enabled', false);
    }

    // --- MERCADO PAGO SUBSCRIPTIONS ---

    async setupAllPlans() {
        const plans = [
            { reason: 'Plano Básico (Até 20)', amount: 19.90, frequency: 1, frequencyType: 'months' as const },
            { reason: 'Plano Bronze (21-30)', amount: 29.90, frequency: 1, frequencyType: 'months' as const },
            { reason: 'Plano Prata (31-100)', amount: 39.90, frequency: 1, frequencyType: 'months' as const },
            { reason: 'Plano Ouro (101+)', amount: 59.90, frequency: 1, frequencyType: 'months' as const }
        ];

        // Force clear old plans from settings to re-initialize
        // In reality we should check if they exist on MP but for now we just create new ones

        const createdPlans: { key: string, id: string }[] = [];
        for (const p of plans) {
            try {
                const planInstance = new PreApprovalPlan(this.mpClient);
                const response = await planInstance.create({
                    body: {
                        reason: p.reason,
                        auto_recurring: {
                            frequency: p.frequency,
                            frequency_type: p.frequencyType,
                            transaction_amount: p.amount,
                            currency_id: 'BRL'
                        },
                        back_url: 'https://cantinhodbv-dfdab.web.app/dashboard/settings'
                    }
                });
                createdPlans.push({ key: p.reason.replace(' ', '_').toLowerCase(), id: response.id as string });
                this.logger.log(`Plan Created: ${p.reason} -> ${response.id}`);
            } catch (error) {
                this.logger.error(`Error creating ${p.reason}`, error);
            }
        }

        // Store IDs in system settings
        await this.updateSystemSettings('mercadopago_plan_ids', createdPlans);
        return createdPlans;
    }

    async getPlanIds() {
        return this.getSystemSettings('mercadopago_plan_ids');
    }

    async getPublicSettings() {
        const keys = ['mercadopago_enabled', 'mercadopago_plan_ids', 'referral_system_enabled', 'pix_payment_enabled'];
        const settings = await this.prisma.systemSetting.findMany({
            where: { key: { in: keys } }
        });

        const result: any = {};
        settings.forEach(s => {
            result[s.key] = JSON.parse(s.value);
        });
        return result;
    }

    // --- SYSTEM SETTINGS ---

    async getSystemSettings(key: string) {
        const setting = await this.prisma.systemSetting.findUnique({ where: { key } });
        return setting ? JSON.parse(setting.value) : null;
    }

    async updateSystemSettings(key: string, value: any) {
        return this.prisma.systemSetting.upsert({
            where: { key },
            update: { value: JSON.stringify(value) },
            create: { key, value: JSON.stringify(value) }
        });
    }

    // --- PAGBANK (Existing Logic) ---

    async createPixCharge(amount: number, description: string, userId: string, userName: string, userEmail: string) {
        const referenceId = `REF-${userId}-${Date.now()}`;
        const payload = {
            reference_id: referenceId,
            customer: {
                name: userName || 'Membro DBV',
                email: userEmail || 'email@test.com',
                tax_id: '12345678909',
                phones: [{ country: '55', area: '11', number: '999999999', type: 'MOBILE' }]
            },
            qr_codes: [{
                amount: { value: Math.round(amount * 100) },
                expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            }]
        };

        try {
            const response: any = await lastValueFrom(
                this.httpService.post(`${this.baseUrl}/orders`, payload, {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                        'x-api-version': '4.0',
                    }
                })
            );

            const qrCodeData = response.data.qr_codes?.[0];
            return {
                success: true,
                referenceId,
                qrCodeImageUrl: qrCodeData.links.find((l: any) => l.media === 'image/png')?.href,
                payload: qrCodeData.text,
                raw: response.data
            };
        } catch (error: any) {
            this.logger.error('PagBank Creation Error', error.response?.data || error.message);
            throw new Error(`PagBank Error: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }
}
