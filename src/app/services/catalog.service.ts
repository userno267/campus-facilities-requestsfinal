import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api.service';
import { AuthService } from './auth.service';

export interface CatalogDepartment {
  id: number;
  name: string;
  request_count: number;
  staff_count: number;
  category_count: number;
}

export interface CatalogCategory {
  id: number;
  name: string;
  default_department_id: number;
  default_department_name: string;
  request_count: number;
}

export interface CatalogList {
  departments: CatalogDepartment[];
  categories: CatalogCategory[];
}

// Admin-only wrapper for catalog.php. Pages call this, this calls the API.
// The server checks the role and every rule again.
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private requireAdmin(): void {
    if (this.auth.user()?.role !== 'admin') {
      throw new Error('Only admins can do this.');
    }
  }

  async list(): Promise<CatalogList> {
    this.requireAdmin();
    try {
      const response: any = await firstValueFrom(
        this.http.get(`${API_BASE}/catalog.php?action=list`)
      );
      return {
        departments: response.departments ?? [],
        categories: response.categories ?? [],
      };
    } catch (e: any) {
      throw new Error(e.error?.error ?? 'Could not load departments and categories');
    }
  }

  createDepartment(name: string): Promise<void> {
    return this.post('dept_create', { name }, 'Could not add the department');
  }

  renameDepartment(id: number, name: string): Promise<void> {
    return this.post('dept_rename', { id, name }, 'Could not rename the department');
  }

  // moveToId is required by the server when the department is in use. Pass null when it is not.
  deleteDepartment(id: number, moveToId: number | null): Promise<void> {
    return this.post('dept_delete', { id, move_to_id: moveToId }, 'Could not delete the department');
  }

  createCategory(name: string, defaultDepartmentId: number): Promise<void> {
    return this.post('cat_create', { name, default_department_id: defaultDepartmentId },
      'Could not add the category');
  }

  renameCategory(id: number, name: string): Promise<void> {
    return this.post('cat_rename', { id, name }, 'Could not rename the category');
  }

  // moveToId is required by the server when the category has requests. Pass null when it does not.
  deleteCategory(id: number, moveToId: number | null): Promise<void> {
    return this.post('cat_delete', { id, move_to_id: moveToId }, 'Could not delete the category');
  }

  private async post(action: string, body: object, fallback: string): Promise<void> {
    this.requireAdmin();
    try {
      await firstValueFrom(this.http.post(`${API_BASE}/catalog.php?action=${action}`, body));
    } catch (e: any) {
      throw new Error(e.error?.error ?? fallback);
    }
  }
}
