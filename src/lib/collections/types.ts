export type CollectionItemKind = "text" | "file" | "image" | "link";
export type CollectionItemStatus = "pending" | "ready" | "error";
export type CollectionArtifactType = "mary_session" | "document" | "image";
export type CollectionSurface = "mary" | "write";

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  user_id: string;
  kind: CollectionItemKind;
  title: string | null;
  body_text: string | null;
  source_url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  byte_size: number | null;
  char_count: number;
  status: CollectionItemStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionArtifact {
  id: string;
  collection_id: string;
  user_id: string;
  artifact_type: CollectionArtifactType;
  artifact_id: string;
  preview_title: string | null;
  preview_snippet: string | null;
  created_at: string;
}

export const COLLECTION_COLORS = [
  { key: "indigo", from: "#6366F1", to: "#8B5CF6" },
  { key: "rose", from: "#F43F5E", to: "#EC4899" },
  { key: "amber", from: "#F59E0B", to: "#EF4444" },
  { key: "emerald", from: "#10B981", to: "#06B6D4" },
  { key: "violet", from: "#8B5CF6", to: "#D946EF" },
  { key: "sky", from: "#0EA5E9", to: "#6366F1" },
  { key: "gold", from: "#C99B3C", to: "#E8A87C" },
];

export function colorTokens(key: string) {
  return COLLECTION_COLORS.find((c) => c.key === key) ?? COLLECTION_COLORS[0];
}

export const CONTEXT_CHAR_CAP = 20_000;
