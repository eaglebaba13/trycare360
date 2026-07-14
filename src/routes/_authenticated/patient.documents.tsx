import { createFileRoute } from "@tanstack/react-router";
import { DocumentsWorkspace } from "@/components/patient/documents";
export const Route = createFileRoute("/_authenticated/patient/documents")({ component: DocumentsWorkspace });
