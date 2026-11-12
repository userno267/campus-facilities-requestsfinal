import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../services/auth.service';
import { FeedbackService } from '../services/feedback.service';
import { ManagedUser, UsersDepartment, UsersService } from '../services/users.service';
import { Role } from '../models/user.model';
import { StaffReview } from '../models/request.model';

type RoleFilter = 'all' | Role;

// The open "Edit" panel for one user.
interface EditState {
  id: number;
  name: string;
  role: Role;
  department_id: number | null;
}

const ROLE_LABEL: Record<Role, string> = {
  faculty: 'Faculty',
  staff: 'Staff',
  admin: 'Admin',
};

// "1 request", "2 requests".
function countText(n: number, one: string, many: string = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

// Admin "Users" page: add users, change role or department, deactivate and reactivate accounts.
// Accounts are never deleted, so request and review history is kept.
@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [DatePipe, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">

        <div class="brand-header" slot="start">
          <img
            src="assets/campus-reports-logo.png"
            alt="Campus Reports logo"
            class="brand-logo-img" />
        </div>

        <ion-title>Users</ion-title>

        <ion-buttons slot="end">
          <ion-button class="refresh-btn" (click)="load()" [disabled]="loading()">
            {{ loading() ? 'Refreshing...' : 'Refresh' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">

      <div class="page-heading">
        <span class="eyebrow">ADMIN USERS</span>
        <h1>Manage Users</h1>
        <p>Add people, change their role or department, and deactivate accounts.</p>
      </div>

      <!-- SUMMARY CARD -->
      <div class="summary-card">
        <div class="summary-icon">👥</div>

        <div class="summary-info">
          <span class="summary-label">ACTIVE USERS</span>
          <h2>{{ activeCount() }}</h2>
          <p>{{ inactiveCount() }} deactivated</p>
        </div>
      </div>

      <!-- ADD USER -->
      @if (!showAdd()) {
        <ion-button class="primary-btn add-open-btn" expand="block" (click)="openAdd()">
          Add user
        </ion-button>
      } @else {
        <div class="add-card">
          <h3>Add a user</h3>

          <label class="label" for="new-name">Full name</label>
          <input id="new-name" class="field" type="text" maxlength="255" placeholder="Full name"
                 [value]="form().name"
                 (input)="setForm('name', textOf($event))" />

          <label class="label" for="new-email">Email</label>
          <input id="new-email" class="field" type="email" maxlength="255" placeholder="name@campus.edu"
                 autocomplete="off"
                 [value]="form().email"
                 (input)="setForm('email', textOf($event))" />

          <label class="label" for="new-emp">Employee ID</label>
          <input id="new-emp" class="field" type="text" maxlength="50" placeholder="e.g. STF-010"
                 [value]="form().employee_id"
                 (input)="setForm('employee_id', textOf($event))" />

          <label class="label" for="new-pass">Temporary password (at least 6 characters)</label>
          <input id="new-pass" class="field" type="text" maxlength="72" placeholder="Temporary password"
                 autocomplete="off"
                 [value]="form().password"
                 (input)="setForm('password', textOf($event))" />

          <label class="label" for="new-role">Role</label>
          <select id="new-role" class="field" (change)="setFormRole(textOf($event))">
            @for (r of roles; track r) {
              <option [value]="r" [selected]="r === form().role">{{ roleLabel(r) }}</option>
            }
          </select>

          @if (form().role === 'staff') {
            <label class="label" for="new-dept">Department</label>
            <select id="new-dept" class="field" (change)="setFormDept(selectNumber($event))">
              @for (d of departments(); track d.id) {
                <option [value]="d.id" [selected]="d.id === form().department_id">{{ d.name }}</option>
              }
            </select>
          }

          <p class="hint">Give the user this password. Self-registration still works too.</p>

          <div class="card-actions">
            <ion-button class="primary-btn" [disabled]="busy()" (click)="addUser()">Add user</ion-button>
            <ion-button class="ghost-btn" (click)="closeAdd()">Cancel</ion-button>
          </div>
        </div>
      }

      <!-- SEARCH AND FILTER -->
      <input class="field search" type="search" placeholder="Search name, email or employee ID"
             [value]="search()"
             (input)="search.set(textOf($event))" />

      <div class="tab-row">
        @for (f of filters; track f.key) {
          <button type="button" class="tab"
                  [class.active]="filter() === f.key"
                  (click)="filter.set(f.key)">{{ f.label }}</button>
        }
      </div>

      <div class="section-heading">
        <h2>{{ filterTitle() }}</h2>
        <span>{{ countText(visible().length, 'user') }}</span>
      </div>

      @for (u of visible(); track u.id) {
        <div class="item-card" [class.inactive]="!u.active">

          @if (editingFor(u.id); as e) {
            <label class="label" for="edit-name">Full name</label>
            <input id="edit-name" class="field" type="text" maxlength="255"
                   [value]="e.name"
                   (input)="setEditName(textOf($event))" />

            @if (isMe(u.id)) {
              <p class="hint">You cannot change your own role.</p>
            } @else {
              <label class="label" for="edit-role">Role</label>
              <select id="edit-role" class="field" (change)="setEditRole(textOf($event))">
                @for (r of roles; track r) {
                  <option [value]="r" [selected]="r === e.role">{{ roleLabel(r) }}</option>
                }
              </select>

              @if (e.role === 'staff') {
                <label class="label" for="edit-dept">Department</label>
                <select id="edit-dept" class="field" (change)="setEditDept(selectNumber($event))">
                  @for (d of departments(); track d.id) {
                    <option [value]="d.id" [selected]="d.id === e.department_id">{{ d.name }}</option>
                  }
                </select>
              }

              @if (u.role === 'staff' && u.open_jobs > 0) {
                <p class="hint">
                  This staff member has {{ countText(u.open_jobs, 'open job') }}. Reassign them before
                  changing role or department.
                </p>
              }
            }

            <div class="card-actions">
              <ion-button class="primary-btn" [disabled]="busy()" (click)="saveEdit()">Save</ion-button>
              <ion-button class="ghost-btn" (click)="cancelEdit()">Cancel</ion-button>
            </div>
          } @else {
            <div class="item-main">
              <strong>
                {{ u.name }}
                <span class="pill">{{ roleLabel(u.role) }}</span>
                @if (isMe(u.id)) { <span class="pill">You</span> }
                @if (!u.active) { <span class="pill pill-off">Deactivated</span> }
              </strong>
              <span>{{ u.email }} · {{ u.employee_id }}</span>
              @if (u.department_name) {
                <span>{{ u.department_name }}</span>
              }
              <span>{{ statsText(u) }}</span>
              @if (u.role === 'staff') {
                <span class="score">{{ scoreText(u) }}</span>
              }
            </div>

            <div class="card-actions">
              @if (u.role === 'staff' && u.review_count > 0) {
                <ion-button class="ghost-btn" (click)="toggleReviews(u)">
                  {{ reviewsFor(u.id) ? 'Hide reviews' : 'View reviews' }}
                </ion-button>
              }
              @if (u.active) {
                <ion-button class="ghost-btn" (click)="startEdit(u)">Edit</ion-button>
                @if (!isMe(u.id)) {
                  <ion-button class="outline-btn" (click)="askDeactivate(u.id)">Deactivate</ion-button>
                }
              } @else {
                <ion-button class="ghost-btn" [disabled]="busy()" (click)="reactivate(u)">Reactivate</ion-button>
              }
            </div>
          }

          @if (reviewsFor(u.id); as rv) {
            <div class="reviews-panel">
              @if (rv.loading) {
                <p class="hint">Loading reviews...</p>
              } @else {
                @for (r of rv.reviews; track r.id) {
                  <div class="review-row">
                    <div class="review-top">
                      <strong>{{ stars(r.rating) }}</strong>
                      <span>{{ r.rating }} / 5</span>
                    </div>
                    @if (r.comment) {
                      <p class="review-comment">“{{ r.comment }}”</p>
                    } @else {
                      <p class="hint">No comment.</p>
                    }
                    <span class="hint">
                      {{ r.title }} · {{ r.location_name }}<br />
                      {{ r.reviewer_name }} · {{ r.created_at | date: 'mediumDate' }}
                    </span>
                  </div>
                } @empty {
                  <p class="hint">No reviews yet.</p>
                }
              }
            </div>
          }

          @if (pendingFor(u.id); as p) {
            <div class="delete-panel">
              @if (p.open_jobs > 0) {
                <p>
                  {{ p.name }} has {{ countText(p.open_jobs, 'open job') }}. Reassign them in Manage first,
                  then deactivate this account.
                </p>
              } @else {
                <p>
                  Deactivate {{ p.name }}? They will not be able to log in. Their requests and reviews are
                  kept, and you can reactivate the account later.
                </p>
              }
              <div class="card-actions">
                <ion-button class="primary-btn" [disabled]="busy() || p.open_jobs > 0"
                            (click)="confirmDeactivate()">Deactivate</ion-button>
                <ion-button class="ghost-btn" (click)="cancelDeactivate()">Cancel</ion-button>
              </div>
            </div>
          }
        </div>
      } @empty {
        <div class="empty-card">
          <div class="empty-icon">👥</div>
          @if (loading()) {
            <h3>Loading...</h3>
          } @else {
            <h3>No Users Found</h3>
            <p>Try another search or filter.</p>
          }
        </div>
      }

    </ion-content>
  `,
  styles: [`
    :host {
      --purple-primary: #56318f;
      --purple-secondary: #7651b5;
      --purple-light: #b99ae8;
      --lavender: #ede4fa;
      --background-color: #faf8fd;
      --text-dark: #302344;
      --text-muted: #8c829b;
      display: block;
    }

    /* CAMPUS REPORTS LOGO */

    .brand-header {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo-img {
      height: 42px;
      width: auto;
      max-width: 160px;
      object-fit: contain;
    }

    @media (max-width: 600px) {
      .brand-logo-img {
        height: 34px;
      }
    }

    /* PAGE */

    .page-content {
      --background: var(--background-color);
    }

    .page-toolbar {
      --background: #ffffff;
      --color: var(--text-dark);
      --border-color: #eee8f5;
      border-bottom: 1px solid #eee8f5;
    }

    /* REFRESH BUTTON */

    .refresh-btn {
      --color: var(--purple-primary);
      --background: transparent;
      --background-hover: var(--lavender);
      --background-activated: var(--lavender);
      --border-radius: 10px;

      min-width: 85px;
      min-height: 42px;
      height: auto;

      font-size: 13px;
      font-weight: 700;
      text-transform: none;
      white-space: normal;
    }

    /* PAGE HEADING */

    .page-heading {
      margin: 8px 0 20px;
      animation: slide-up 0.4s ease both;
    }

    .eyebrow {
      display: inline-block;
      color: var(--purple-secondary);
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin-bottom: 7px;
    }

    .page-heading h1 {
      color: var(--text-dark);
      font-size: 25px;
      font-weight: 800;
      margin: 0 0 6px;
    }

    .page-heading p {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }

    /* SUMMARY CARD */

    .summary-card {
      display: flex;
      align-items: center;
      gap: 15px;

      padding: 18px;
      margin-bottom: 25px;

      border-radius: 18px;
      background: linear-gradient(135deg, #56318f, #7651b5, #8c6ac5);
      box-shadow: 0 7px 20px rgba(86, 49, 143, 0.18);

      transition: transform 0.25s ease, box-shadow 0.25s ease;
      animation: slide-up 0.45s ease both;
    }

    .summary-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 25px rgba(86, 49, 143, 0.24);
    }

    .summary-icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;

      display: flex;
      align-items: center;
      justify-content: center;

      border-radius: 14px;
      background: rgba(255, 255, 255, 0.18);
      font-size: 23px;
    }

    .summary-info {
      min-width: 0;
    }

    .summary-label {
      color: #e9def9;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.2px;
    }

    .summary-card h2 {
      color: #ffffff;
      font-size: 25px;
      font-weight: 800;
      margin: 3px 0;
    }

    .summary-card p {
      color: #eee5fb;
      font-size: 12px;
      margin: 0;
    }

    /* TABS */

    .tab-row {
      display: flex;
      gap: 8px;
      background: var(--lavender);
      padding: 5px;
      border-radius: 14px;
      margin-bottom: 20px;
    }

    .tab {
      flex: 1;
      border: none;
      background: transparent;
      color: var(--purple-secondary);
      font: inherit;
      font-weight: 700;
      padding: 10px;
      border-radius: 10px;
      cursor: pointer;
      transition: background 0.2s ease, color 0.2s ease;
    }

    .tab.active {
      background: #ffffff;
      color: var(--purple-primary);
      box-shadow: 0 2px 8px rgba(86, 49, 143, 0.12);
    }

    /* ADD CARD */

    .add-card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 17px;
      padding: 18px;
      margin-bottom: 22px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 15px rgba(65, 39, 100, 0.05);
      animation: slide-up 0.4s ease both;
    }

    .add-card h3 {
      color: var(--text-dark);
      font-size: 16px;
      font-weight: 800;
      margin: 0 0 4px;
    }

    .label {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
    }

    .field {
      width: 100%;
      box-sizing: border-box;
      padding: 11px 12px;
      border: 1px solid #d9cdea;
      border-radius: 12px;
      background: #ffffff;
      color: var(--text-dark);
      font: inherit;
    }

    .field:focus {
      outline: 2px solid var(--purple-light);
      border-color: var(--purple-secondary);
    }

    /* BUTTONS */

    .primary-btn {
      --background: var(--purple-primary);
      --background-hover: var(--purple-secondary);
      --color: #ffffff;
      --border-radius: 12px;
      font-weight: 700;
      text-transform: none;
    }

    .ghost-btn {
      --background: var(--lavender);
      --background-hover: #e6d9f7;
      --color: var(--purple-primary);
      --border-radius: 12px;
      font-weight: 700;
      text-transform: none;
    }

    .outline-btn {
      --background: #ffffff;
      --background-hover: var(--lavender);
      --color: var(--text-dark);
      --border-radius: 12px;
      --border-width: 1px;
      --border-style: solid;
      --border-color: var(--purple-light);
      font-weight: 700;
      text-transform: none;
    }

    /* SECTION HEADING */

    .section-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 13px;
    }

    .section-heading h2 {
      color: var(--text-dark);
      font-size: 17px;
      font-weight: 800;
      margin: 0;
    }

    .section-heading span {
      color: var(--purple-secondary);
      font-size: 12px;
      font-weight: 700;
    }

    /* ITEM CARDS */

    .item-card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 17px;
      padding: 16px;
      margin-bottom: 13px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-shadow: 0 4px 15px rgba(65, 39, 100, 0.05);
      animation: slide-up 0.4s ease both;
    }

    .item-main strong {
      display: block;
      color: var(--text-dark);
      font-size: 15px;
    }

    .item-main span {
      display: block;
      color: var(--text-muted);
      font-size: 12px;
      margin-top: 3px;
    }

    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .delete-panel {
      background: var(--background-color);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .delete-panel p {
      margin: 0;
      color: var(--text-dark);
      font-size: 14px;
      line-height: 1.5;
    }

    /* EMPTY STATE */

    .empty-card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 18px;
      padding: 30px 20px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(65, 39, 100, 0.05);
      animation: slide-up 0.4s ease both;
    }

    .empty-icon {
      font-size: 34px;
      margin-bottom: 10px;
    }

    .empty-card h3 {
      color: var(--text-dark);
      font-size: 17px;
      font-weight: 800;
      margin: 0 0 6px;
    }

    .empty-card p {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.5;
      margin: 0;
    }

    /* ANIMATION */

    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(12px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  
    /* USERS PAGE */

    .add-open-btn {
      margin-bottom: 22px;
    }

    .search {
      margin-bottom: 12px;
    }

    .hint {
      margin: 0;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
    }

    .item-card.inactive {
      opacity: 0.75;
      background: #fcfbfe;
    }

    .pill {
      display: inline-block;
      margin-left: 6px;
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--lavender);
      color: var(--purple-primary);
      font-size: 11px;
      font-weight: 700;
      vertical-align: middle;
    }

    .reviews-panel {
      background: var(--background-color);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .review-row {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 12px;
      padding: 10px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .review-top {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--purple-primary);
      font-size: 14px;
    }

    .review-top span {
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 700;
    }

    .review-comment {
      margin: 0;
      color: var(--text-dark);
      font-size: 14px;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .item-main .score {
      color: var(--purple-primary);
      font-weight: 700;
    }

    .pill-off {
      background: #f1edf6;
      color: var(--text-muted);
    }

    /* The catalog rule ".item-main span" would turn the pills into blocks, so undo it here. */
    .item-main strong .pill {
      display: inline-block;
      margin-top: 0;
      margin-left: 6px;
      color: var(--purple-primary);
      font-size: 11px;
    }

    .item-main strong .pill-off {
      color: var(--text-muted);
    }
  `],
})
export class AdminUsersPage implements OnInit {
  private users = inject(UsersService);
  private auth = inject(AuthService);
  private feedback = inject(FeedbackService);

  readonly roles: Role[] = ['faculty', 'staff', 'admin'];
  readonly filters: { key: RoleFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'faculty', label: 'Faculty' },
    { key: 'staff', label: 'Staff' },
    { key: 'admin', label: 'Admin' },
  ];

  loading = signal(false);
  busy = signal(false);

  all = signal<ManagedUser[]>([]);
  departments = signal<UsersDepartment[]>([]);

  filter = signal<RoleFilter>('all');
  search = signal('');

  showAdd = signal(false);
  form = signal({
    name: '',
    email: '',
    employee_id: '',
    password: '',
    role: 'faculty' as Role,
    department_id: null as number | null,
  });

  // Reviews opened for one staff member (only one is open at a time).
  openReviews = signal<{ id: number; loading: boolean; reviews: StaffReview[] } | null>(null);

  editing = signal<EditState | null>(null);
  pending = signal<{ id: number; name: string; open_jobs: number } | null>(null);

  activeCount = computed(() => this.all().filter((u) => u.active).length);
  inactiveCount = computed(() => this.all().filter((u) => !u.active).length);

  // The list after the role filter and the search box.
  visible = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    return this.all().filter((u) => {
      if (f !== 'all' && u.role !== f) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.employee_id.toLowerCase().includes(q)
      );
    });
  });

  ngOnInit(): void {
    void this.load();
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  countText = countText;

  roleLabel(role: Role): string {
    return ROLE_LABEL[role];
  }

  filterTitle(): string {
    const f = this.filter();
    return f === 'all' ? 'All users' : `${ROLE_LABEL[f]} users`;
  }

  isMe(id: number): boolean {
    return this.auth.user()?.id === id;
  }

  statsText(u: ManagedUser): string {
    const parts = [countText(u.request_count, 'request')];
    if (u.role === 'staff') {
      parts.push(countText(u.open_jobs, 'open job'));
    }
    return parts.join(' · ');
  }

  // "★ 4.5 average" or "No reviews yet".
  scoreText(u: ManagedUser): string {
    if (u.review_average === null || u.review_count === 0) {
      return 'No reviews yet';
    }
    return `★ ${u.review_average.toFixed(1)} average · ${countText(u.review_count, 'review')}`;
  }

  stars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
  }

  reviewsFor(id: number) {
    const r = this.openReviews();
    return r && r.id === id ? r : null;
  }

  async toggleReviews(u: ManagedUser): Promise<void> {
    if (this.reviewsFor(u.id)) {
      this.openReviews.set(null);
      return;
    }
    this.openReviews.set({ id: u.id, loading: true, reviews: [] });
    try {
      const data = await this.users.reviewsFor(u.id);
      // Ignore the answer if the admin opened someone else in the meantime.
      if (this.openReviews()?.id === u.id) {
        this.openReviews.set({ id: u.id, loading: false, reviews: data.reviews });
      }
    } catch (e: any) {
      if (this.openReviews()?.id === u.id) {
        this.openReviews.set(null);
      }
      this.fail(e?.message ?? 'Could not load the reviews');
    }
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.users.list();
      this.all.set(data.users);
      this.departments.set(data.departments);

      // Keep a department picked for a new staff user, if it still exists.
      const ids = data.departments.map((d) => d.id);
      const current = this.form().department_id;
      if (current === null || !ids.includes(current)) {
        this.form.update((f) => ({ ...f, department_id: ids[0] ?? null }));
      }
    } catch (e: any) {
      await this.feedback.toast(e?.message ?? 'Could not load the users', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  // Input helpers, so the template stays readable.
  textOf(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  selectNumber(event: Event): number {
    return Number((event.target as HTMLSelectElement).value);
  }

  private fail(message: string): void {
    void this.feedback.toast(message, 'danger');
  }

  // ----- add -----

  openAdd(): void {
    this.showAdd.set(true);
  }

  closeAdd(): void {
    this.showAdd.set(false);
  }

  setForm(key: 'name' | 'email' | 'employee_id' | 'password', value: string): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  setFormRole(value: string): void {
    this.form.update((f) => ({ ...f, role: value as Role }));
  }

  setFormDept(id: number): void {
    this.form.update((f) => ({ ...f, department_id: id }));
  }

  async addUser(): Promise<void> {
    const f = this.form();
    const name = f.name.trim();
    const email = f.email.trim().toLowerCase();
    const employeeId = f.employee_id.trim();

    if (!name || !email || !employeeId || !f.password) {
      this.fail('Name, email, employee ID and a temporary password are required');
      return;
    }
    if (f.password.length < 6) {
      this.fail('Password must be at least 6 characters');
      return;
    }
    if (f.role === 'staff' && f.department_id === null) {
      this.fail('Staff must have a department');
      return;
    }

    this.busy.set(true);
    try {
      await this.users.create({
        name,
        email,
        employee_id: employeeId,
        password: f.password,
        role: f.role,
        department_id: f.role === 'staff' ? f.department_id : null,
      });
      this.form.update((x) => ({ ...x, name: '', email: '', employee_id: '', password: '' }));
      this.showAdd.set(false);
      await this.feedback.toast(`Added ${name}`, 'success');
      await this.load();
    } catch (e: any) {
      this.fail(e?.message ?? 'Could not add the user');
    } finally {
      this.busy.set(false);
    }
  }

  // ----- edit -----

  editingFor(id: number): EditState | null {
    const e = this.editing();
    return e && e.id === id ? e : null;
  }

  startEdit(u: ManagedUser): void {
    this.pending.set(null);
    const fallbackDept = this.departments()[0]?.id ?? null;
    this.editing.set({
      id: u.id,
      name: u.name,
      role: u.role,
      department_id: u.department_id ?? fallbackDept,
    });
  }

  setEditName(value: string): void {
    const e = this.editing();
    if (e) this.editing.set({ ...e, name: value });
  }

  setEditRole(value: string): void {
    const e = this.editing();
    if (e) this.editing.set({ ...e, role: value as Role });
  }

  setEditDept(id: number): void {
    const e = this.editing();
    if (e) this.editing.set({ ...e, department_id: id });
  }

  cancelEdit(): void {
    this.editing.set(null);
  }

  async saveEdit(): Promise<void> {
    const e = this.editing();
    if (!e) return;

    const name = e.name.trim();
    if (!name) {
      this.fail('Please enter a name');
      return;
    }
    if (e.role === 'staff' && e.department_id === null) {
      this.fail('Staff must have a department');
      return;
    }

    this.busy.set(true);
    try {
      await this.users.update(e.id, {
        name,
        role: e.role,
        department_id: e.role === 'staff' ? e.department_id : null,
      });
      this.editing.set(null);
      await this.feedback.toast('Saved', 'success');
      await this.load();
    } catch (err: any) {
      this.fail(err?.message ?? 'Could not update the user');
    } finally {
      this.busy.set(false);
    }
  }

  // ----- deactivate / reactivate -----

  pendingFor(id: number) {
    const p = this.pending();
    return p && p.id === id ? p : null;
  }

  askDeactivate(id: number): void {
    const u = this.all().find((x) => x.id === id);
    if (!u) return;
    this.editing.set(null);
    this.pending.set({ id: u.id, name: u.name, open_jobs: u.role === 'staff' ? u.open_jobs : 0 });
  }

  cancelDeactivate(): void {
    this.pending.set(null);
  }

  async confirmDeactivate(): Promise<void> {
    const p = this.pending();
    if (!p) return;

    this.busy.set(true);
    try {
      await this.users.setActive(p.id, false);
      this.pending.set(null);
      await this.feedback.toast(`Deactivated ${p.name}`, 'success');
      await this.load();
    } catch (e: any) {
      this.fail(e?.message ?? 'Could not deactivate the account');
    } finally {
      this.busy.set(false);
    }
  }

  async reactivate(u: ManagedUser): Promise<void> {
    this.busy.set(true);
    try {
      await this.users.setActive(u.id, true);
      await this.feedback.toast(`Reactivated ${u.name}`, 'success');
      await this.load();
    } catch (e: any) {
      this.fail(e?.message ?? 'Could not reactivate the account');
    } finally {
      this.busy.set(false);
    }
  }
}
