export class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    stock: number;
    imageUrl?: string;
    category?: string; // REAL, VIRTUAL
}
