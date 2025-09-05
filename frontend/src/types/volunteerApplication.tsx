export interface VolunteerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface VolunteerApplicationCreate {
  name: string;
  email: string;
  phone: string;
}

export interface VolunteerApplicationUpdate {
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
}

export interface VolunteerApplicationApproval {
  status: 'approved';
}

export interface VolunteerApplicationRejection {
  status: 'rejected';
  rejection_reason: string;
}

export interface ApplicationStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}
