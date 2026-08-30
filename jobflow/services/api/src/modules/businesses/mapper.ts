import type { Business } from "@jobflow/types";

export interface BusinessRow {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  verified: boolean;
  verified_at: Date | null;
  rating: number | null;
  review_count: number;
  latitude: number | null;
  longitude: number | null;
  service_radius_km: number;
  avg_response_minutes: number | null;
  completed_job_count: number;
  created_at: Date;
  updated_at: Date;
}

export function mapBusiness(row: BusinessRow): Business {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    description: row.description,
    verified: row.verified,
    verifiedAt: row.verified_at === null ? null : row.verified_at.toISOString(),
    rating: row.rating,
    reviewCount: row.review_count,
    latitude: row.latitude,
    longitude: row.longitude,
    serviceRadiusKm: row.service_radius_km,
    avgResponseMinutes: row.avg_response_minutes,
    completedJobCount: row.completed_job_count,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
