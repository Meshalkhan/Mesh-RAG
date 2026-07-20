import type { Metadata } from "next";

import { UploadForm } from "@/components/upload/upload-form";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: "Upload",
  description: "Upload PDF documents for indexing in Mesh RAG.",
};

export default function UploadPage() {
  return (
    <main className="py-10 sm:py-14">
      <Container className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Upload document
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Add a PDF to the knowledge base. Processing and indexing happen
            automatically after upload.
          </p>
        </div>
        <UploadForm />
      </Container>
    </main>
  );
}
