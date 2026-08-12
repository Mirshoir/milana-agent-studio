import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { ensureStudioSchema, getD1, getFilesBucket } from "@/db/raw";
import { knowledgeFiles } from "@/db/schema";

const allowedExtensions = new Set(["txt", "md", "json", "csv", "html", "xml", "yaml", "yml"]);

function chunkText(input: string, requestedSize: number, requestedOverlap: number) {
  const text = input.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim();
  const size = Math.max(800, Math.min(8000, requestedSize || 1600));
  const overlap = Math.max(0, Math.min(Math.floor(size * .3), requestedOverlap || 180));
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length && chunks.length < 500) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const window = text.slice(start + Math.floor(size * .65), end);
      const boundary = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "), window.lastIndexOf("\n"));
      if (boundary > -1) end = start + Math.floor(size * .65) + boundary + 1;
    }
    const content = text.slice(start, end).trim();
    if (content) chunks.push(content);
    if (end >= text.length) break;
    start = Math.max(start + 1, end - overlap);
  }
  return { chunks, size, overlap, truncated: start < text.length };
}

function analyzeDocument(text: string, chunks: string[], truncated: boolean) {
  const headings = (text.match(/^#{1,6}\s+.+$/gm) || []).length;
  const commercialTerms = (text.match(/price|catalog|delivery|discount|order|wholesale|цена|каталог|достав|заказ|narx|katalog|yetkaz/gi) || []).length;
  const sensitivePatterns = (text.match(/(?:password|api[_ -]?key|secret|пароль|token)\s*[:=]/gi) || []).length;
  return { characters: text.length, words: text.trim().split(/\s+/).filter(Boolean).length, tokenEstimate: Math.ceil(text.length / 4), headings, commercialTerms, sensitivePatterns, chunks: chunks.length, truncated, quality: sensitivePatterns ? "Review required" : text.length < 200 ? "Too little content" : "Ready for retrieval", recommendations: [sensitivePatterns ? "Remove secrets before using this file." : "No obvious credentials detected.", headings === 0 ? "Add headings to improve semantic chunk boundaries." : "Document structure supports retrieval.", truncated ? "Increase chunk size or split the source file." : "All extracted text was chunked."] };
}

export async function GET(request: Request) {
  await ensureStudioSchema();
  const agentId = new URL(request.url).searchParams.get("agentId");
  const query = getDb().select().from(knowledgeFiles).orderBy(desc(knowledgeFiles.createdAt)).limit(50);
  const files = agentId ? await query.where(eq(knowledgeFiles.agentId, agentId)) : await query;
  return Response.json({ files: files.map((file) => ({ ...file, analysis: JSON.parse(file.analysisJson) })) });
}

export async function POST(request: Request) {
  try {
    await ensureStudioSchema();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Select a file to upload." }, { status: 400 });
    if (file.size > 2 * 1024 * 1024) return Response.json({ error: "Files are limited to 2 MB in this workspace." }, { status: 413 });
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.has(extension)) return Response.json({ error: "Use TXT, Markdown, JSON, CSV, HTML, XML, or YAML for chunking." }, { status: 415 });
    const agentId = String(form.get("agentId") || "unassigned");
    const text = await file.text();
    const result = chunkText(text, Number(form.get("chunkSize")), Number(form.get("chunkOverlap")));
    if (!result.chunks.length) return Response.json({ error: "The uploaded file contains no extractable text." }, { status: 422 });
    const analysis = analyzeDocument(text, result.chunks, result.truncated);
    const id = `file_${crypto.randomUUID()}`;
    const storageKey = `knowledge/${agentId}/${id}/${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await getFilesBucket().put(storageKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "text/plain" }, customMetadata: { agentId, originalName: file.name } });
    const createdAt = new Date().toISOString();
    await getDb().insert(knowledgeFiles).values({ id, agentId, filename: file.name, mimeType: file.type || "text/plain", sizeBytes: file.size, storageKey, chunkSize: result.size, chunkOverlap: result.overlap, chunkCount: result.chunks.length, analysisJson: JSON.stringify(analysis), status: analysis.sensitivePatterns ? "review" : "ready", createdAt });
    const d1 = getD1();
    for (let offset = 0; offset < result.chunks.length; offset += 75) {
      const statements = result.chunks.slice(offset, offset + 75).map((content, localIndex) => d1.prepare("INSERT INTO file_chunks (id, file_id, chunk_index, content, character_count, token_estimate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(`chunk_${crypto.randomUUID()}`, id, offset + localIndex, content, content.length, Math.ceil(content.length / 4), createdAt));
      await d1.batch(statements);
    }
    return Response.json({ ok: true, file: { id, filename: file.name, chunkCount: result.chunks.length, chunkSize: result.size, chunkOverlap: result.overlap, analysis, previews: result.chunks.slice(0, 3).map((content, index) => ({ index, content: content.slice(0, 240), characters: content.length })) } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "File processing failed" }, { status: 500 });
  }
}
