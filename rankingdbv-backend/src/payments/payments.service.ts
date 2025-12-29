
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
    // Priority: Env Var > Hardcoded (User provided)
    private readonly token = process.env.PAGBANK_TOKEN || '4b85aac0-5c29-4876-963a-378cb7b3fcfaa53575bb4e2bad2a7a5ef3d3e1d76dcbfa24-2042-43d6-bd15-487dac931b2a';
    private readonly baseUrl = 'https://sandbox.api.pagseguro.com'; // Default to Sandbox for safety first

    constructor(private readonly httpService: HttpService) { }

    async createPixCharge(amount: number, description: string, userId: string, userName: string, userEmail: string) {
        const referenceId = `REF-${userId}-${Date.now()}`;

        // PagBank Order API Payload
        const payload = {
            reference_id: referenceId,
            customer: {
                name: userName || 'Membro DBV',
                email: userEmail || 'email@test.com',
                tax_id: '12345678909', // Sandbox requirement often needs valid CPF. For prod need real user CPF.
                phones: [
                    {
                        country: '55',
                        area: '11',
                        number: '999999999',
                        type: 'MOBILE'
                    }
                ]
            },
            qr_codes: [
                {
                    amount: {
                        value: Number(amount.toFixed(2)) * 100 // Cents? No, PagBank uses integer for cents? Wait, docs say: "value": 1000 for 10.00? Checking docs... usually API v4 uses integer cents. But Order API sometimes differs. 
                        // Checking PagBank Order API docs standard: 
                        // "value": Integer representing cents. e.g. 1000 = 10.00.
                    },
                    expiration_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h
                }
            ]
        };

        // ADJUSTMENT: PagBank Order API uses 'charges' OR 'qr_codes'. 
        // Docs: https://developer.pagbank.com.br/reference/criar-pedido
        // For Pix directly: 
        /*
        {
          "reference_id": "ex-00001",
          "customer": { ... },
          "qr_codes": [ { "amount": { "value": 500 } } ] 
        }
        */

        // IMPORTANT: In Sandbox, tax_id (CPF) must be valid. We might need to mock if user doesn't have one.
        // For now using a dummy valid format CPF for Sandbox.

        try {
            const response: any = await lastValueFrom(
                this.httpService.post(`${this.baseUrl}/orders`, payload, {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                        'Content-Type': 'application/json',
                        'x-api-version': '4.0', // Ensure version
                    }
                })
            );

            const qrCodeData = response.data.qr_codes?.[0];
            if (!qrCodeData) {
                throw new Error('QR Code not generated in response');
            }

            // Extract links
            const pngLink = qrCodeData.links.find((l: any) => l.media === 'image/png')?.href;
            const textCode = qrCodeData.text; // Or sometimes in links "text/plain"

            return {
                success: true,
                referenceId,
                qrCodeImageUrl: pngLink,
                payload: textCode, // Copia e Cola
                raw: response.data
            };

        } catch (error: any) {
            this.logger.error('PagBank Creation Error', error.response?.data || error.message);
            throw new Error(`PagBank Error: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }
}
