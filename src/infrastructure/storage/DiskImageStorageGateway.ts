import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { ImageStorageGateway } from '@/application/ports/ImageStorageGateway';

export class DiskImageStorageGateway implements ImageStorageGateway {
    private readonly uploadDir: string;
    private readonly webPrefix: string;

    constructor(
        uploadDir: string = path.join(process.cwd(), 'public', 'uploads', 'products'),
        webPrefix: string = '/uploads/products',
    ) {
        this.uploadDir = uploadDir;
        this.webPrefix = webPrefix;
    }

    async save(bytes: Buffer, article: string, filename: string): Promise<string> {
        await mkdir(this.uploadDir, { recursive: true });

        const ext = path.extname(filename) || '.jpg';
        const safeName = article.replace(/[^a-zA-Z0-9_-]/g, '_') + ext;

        await writeFile(path.join(this.uploadDir, safeName), bytes);

        return `${this.webPrefix}/${safeName}`;
    }
}
