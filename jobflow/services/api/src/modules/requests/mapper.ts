import type { RequestPhoto, RequestStatus, ServiceRequest, Urgency } from "@jobflow/types";

export interface RequestRow {
  id: string;
  customer_id: string;
  category_id: string | null;
  title: string | null;
  description: string;
  urgency: Urgency;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  desired_from: Date | null;
  desired_to: Date | null;
  status: RequestStatus;
  created_at: Date;
  updated_at: Date;
}

export function mapRequest(row: RequestRow): ServiceRequest {
  return {
    id: row.id,
    customerId: row.customer_id,
    categoryId: row.category_id,
    title: row.title,
    description: row.description,
    urgency: row.urgency,
    latitude: row.latitude,
    longitude: row.longitude,
    locationLabel: row.location_label,
    desiredFrom: row.desired_from === null ? null : row.desired_from.toISOString(),
    desiredTo: row.desired_to === null ? null : row.desired_to.toISOString(),
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface RequestPhotoRow {
  id: string;
  request_id: string;
  storage_key: string;
  content_type: string;
  byte_size: number;
  created_at: Date;
}

export function mapRequestPhoto(row: RequestPhotoRow): RequestPhoto {
  return {
    id: row.id,
    requestId: row.request_id,
    storageKey: row.storage_key,
    contentType: row.content_type,
    byteSize: row.byte_size,
    createdAt: row.created_at.toISOString(),
  };
}
