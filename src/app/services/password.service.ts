import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE } from './api.service';

// Lets the logged-in user change their own password.
// The server checks the current password again and who is asking (X-User-Id).
@Injectable({ providedIn: 'root' })
export class PasswordService {
  private http = inject(HttpClient);

  async change(currentPassword: string, newPassword: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${API_BASE}/auth.php?action=change_password`, {
          current_password: currentPassword,
          new_password: newPassword,
        })
      );
    } catch (e: any) {
      throw new Error(e.error?.error ?? 'Could not change the password');
    }
  }
}
