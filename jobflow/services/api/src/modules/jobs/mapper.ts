import type { Job, JobStatus } from "@jobflow/types";

export interface JobRow {
  id: string;
  offer_id: string;
  request_id: string;
  business_id: string;
  customer_id: string;
  status: JobStatus;
  started_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export function mapJob(row: JobRow): Job {
  return {
    id: row.id,
    offerId: row.offer_id,
    requestId: row.request_id,
    businessId: row.business_id,
    customerId: row.customer_id,
    status: row.status,
    startedAt: row.started_at === null ? null : row.started_at.toISOString(),
    completedAt: row.completed_at === null ? null : row.completed_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
