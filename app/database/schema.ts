import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
    version: 1,
    tables: [
        tableSchema({
            name: 'products',
            columns: [
                { name: 'name', type: 'string' },
                { name: 'sku', type: 'string', isOptional: true },
                { name: 'barcode', type: 'string', isOptional: true },
                { name: 'selling_price', type: 'number' },
                { name: 'buying_price', type: 'number', isOptional: true },
                { name: 'stock_quantity', type: 'number' },
                { name: 'organization_id', type: 'string', isIndexed: true },
            ],
        }),
        tableSchema({
            name: 'sales',
            columns: [
                { name: 'total_amount', type: 'number' },
                { name: 'payment_method', type: 'string' },
                { name: 'status', type: 'string' },
                { name: 'created_at', type: 'number' },
                { name: 'organization_id', type: 'string', isIndexed: true },
                { name: 'cashier_id', type: 'string' },
            ],
        }),
        tableSchema({
            name: 'sale_items',
            columns: [
                { name: 'sale_id', type: 'string', isIndexed: true },
                { name: 'product_id', type: 'string', isIndexed: true },
                { name: 'quantity', type: 'number' },
                { name: 'unit_price', type: 'number' },
            ],
        }),
    ],
});
