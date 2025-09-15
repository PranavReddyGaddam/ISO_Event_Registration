export type TeamRole =
  | 'Marketing Team Member'
  | 'Social Media Team Member'
  | 'Finance Team Member'
  | 'Alumni Team Member'
  | 'Events Team Member'
  | 'Director'
  | 'Secretary'
  | 'Vice President'
  | 'President';

export const TEAM_ROLES: TeamRole[] = [
  'Marketing Team Member',
  'Social Media Team Member',
  'Finance Team Member',
  'Alumni Team Member',
  'Events Team Member',
  'Director',
  'Secretary',
  'Vice President',
  'President',
];

export interface VolunteerApplication {
  id: string;
  name: string;
  email: string;
  phone: string;
  team_role?: TeamRole | null;
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
  team_role?: TeamRole | null;
}

export interface VolunteerApplicationUpdate {
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  team_role?: TeamRole | null;
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
