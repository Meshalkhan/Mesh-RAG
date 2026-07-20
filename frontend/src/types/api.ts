export type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details: Array<Record<string, unknown>>;
  };
};

export type DocumentUploadData = {
  filename: string;
  size: number;
  content_type: string;
  status: "uploaded" | "processed" | "indexed";
  indexed_count: number;
};

export type DocumentUploadResponse = {
  success: true;
  data: DocumentUploadData;
};

export type ChatSource = {
  filename: string;
  page_number: number;
};

export type ChatResponse = {
  answer: string;
  sources: ChatSource[];
};
