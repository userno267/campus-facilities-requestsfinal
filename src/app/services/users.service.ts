import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api.service';
import { AuthService } from './auth.service';
import { Role } from '../models/user.model';
import { StaffReviewList } from '../models/request.model';

// One user as the admin sees them on the Users page.
export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  employee_id: string;
  department_id: number | null;
  department_name: string | null;
  active: boolean;
  request_count: number;   // requests this person created
  open_jobs: number;       // jobs assigned to them that are not finished (staff)
  review_count: number;    // reviews written about them (staff)
  review_average: number | null;   // average rating, null when there are no reviews
}

export interface UsersDepartment {
  id: number;
  name: string;
}

export interface UserList {
  users: ManagedUser[];
  departments: UsersDepartment[];
}

// What the "Add user" form sends. The password is a temporary one the admin gives to the user.
export interface NewUserInput {
  name: string;
  email: string;
  employee_id: string;
  password: string;
  role: Role;
  department_id: number | null;   // required when role is 'staff'
}

export interface UserChanges {
  name: string;
  role: Role;
  department_id: number | null;   // required when role is 'staff'
}

// Admin-only wrapper for users.php. Pages call this, this calls the API.
// The server checks the role and every rule again.
@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private requireAdmin(): void {
    if (this.auth.user()?.role !== 'admin') {
      throw new Error('Only admins can do this.');
    }
  }

  async list(): Promise<UserList> {
    this.requireAdmin();
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${API_BASE}/users.php?action=list`)
      );
      return {
        users: response.users ?? [],
        departments: response.departments ?? [],
      };
    } catch (e: any) {
      throw new Error(e.error?.error ?? 'Could not load the users');
    }
  }

  // The reviews and comments written about one staff member. Admin only.
  async reviewsFor(staffId: number): Promise<StaffReviewList> {
    this.requireAdmin();
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${API_BASE}/reviews.php?action=for_admin&staff_id=${staffId}`)
      );
      return {
        reviews: response.reviews ?? [],
        summary: response.summary ?? { count: 0, average: null },
      };
    } catch (e: any) {
      throw new Error(e.error?.error ?? 'Could not load the reviews');
    }
  }

  create(input: NewUserInput): Promise<void> {
    return this.post('create', input, 'Could not add the user');
  }

  update(id: number, changes: UserChanges): Promise<void> {
    return this.post('update', { id, ...changes }, 'Could not update the user');
  }

  setActive(id: number, active: boolean): Promise<void> {
    return this.post('set_active', { id, active },
      active ? 'Could not reactivate the account' : 'Could not deactivate the account');
  }

  private async post(action: string, body: object, fallback: string): Promise<void> {
    this.requireAdmin();
    try {
      await firstValueFrom(this.http.post(`${API_BASE}/users.php?action=${action}`, body));
    } catch (e: any) {
      throw new Error(e.error?.error ?? fallback);
    }
  }
}
