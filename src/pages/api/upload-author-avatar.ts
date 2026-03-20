import type { APIRoute } from "astro";
import fs from "node:fs/promises";
import path from "node:path";

export const prerender = false;

async function log(message: string) {
    const logPath = path.join(process.cwd(), "upload_debug.log");
    const timestamp = new Date().toISOString();
    await fs.appendFile(logPath, `[${timestamp}] ${message}\n`);
}

export const POST: APIRoute = async ({ request }) => {
    await log("--- START BINARY UPLOAD V3 (STABLE REVERT) ---");
    
    try {
        const slug = request.headers.get("X-Author-Slug");
        if (!slug) {
            await log("Error: Missing slug in header");
            return new Response(JSON.stringify({ error: "Missing author slug" }), { status: 400 });
        }

        const buffer = await request.arrayBuffer();
        if (buffer.byteLength === 0) {
            await log("Error: Empty body");
            return new Response(JSON.stringify({ error: "Empty image data" }), { status: 400 });
        }

        await log(`Slug from header: ${slug}`);
        await log(`Received binary size: ${buffer.byteLength} bytes`);

        const dir = path.join(process.cwd(), "src/assets/images/authors", slug);
        await fs.mkdir(dir, { recursive: true });

        const filename = "avatar.jpg";
        const filePath = path.join(dir, filename);
        const relativePath = `@assets/images/authors/${slug}/${filename}`;

        await log(`Target file: ${filePath}`);
        await fs.writeFile(filePath, Buffer.from(buffer));
        await log("File written successfully");

        // CRITICAL: "Touch" the author's index.mdx file to force Astro Content Collection refresh.
        try {
            const mdxPath = path.join(process.cwd(), "src/content/authors", slug, "index.mdx");
            await fs.utimes(mdxPath, new Date(), new Date());
            await log("Touched MDX for refresh");
        } catch (e) {
            // Ignore if MDX doesn't exist yet
        }

        return new Response(
            JSON.stringify({ success: true, path: relativePath }), 
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

    } catch (err: any) {
        await log(`CRITICAL ERROR: ${err.message}`);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
