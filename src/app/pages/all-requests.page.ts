import { ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel,
  IonList, IonSelect, IonSelectOption, IonTitle, IonToolbar,
} from '@ionic/angular';
import { AdminRequestService } from '../services/admin-request.service';
import { FeedbackService } from '../services/feedback.service';
import { LiveUpdateService, LiveWatcher } from '../services/live-update.service';
import { AdminRequestDetail, AdminRequestRow, RequestStatus } from '../models/request.model';
import { PriorityBadgeComponent } from '../components/priority-badge.component';

// Friendly labels and badge colours (same as the Manage page).
const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  assigned: 'Assigned',
  in_progress: 'In progress',
  awaiting_proof: 'Awaiting proof',
  paused: 'Paused',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: 'medium',
  assigned: 'primary',
  in_progress: 'primary',
  awaiting_proof: 'warning',
  paused: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

// Order of the filter choices follows the lifecycle.
const STATUS_ORDER: RequestStatus[] = [
  'submitted', 'assigned', 'in_progress', 'awaiting_proof', 'paused', 'completed', 'cancelled',
];

// Admin "Requests" tab (Step 8). A plain, read-only list of ALL requests in any status,
// with a status filter. Tap a row to see the photos, proof, history and the faculty rating.
// No actions here: assigning, cancelling and completing stay on the Manage tab.
// Not a dashboard: no counts, no charts, no workload.
@Component({
  selector: 'app-all-requests',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel,
    IonList, IonSelect, IonSelectOption, IonTitle, IonToolbar,
    PriorityBadgeComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="top-toolbar">
        @if (selected) {
          <ion-buttons slot="start">
            <ion-button (click)="backToList()">← Back</ion-button>
          </ion-buttons>
          <ion-title>Request #{{ selected.id }}</ion-title>
        } @else {
          <div class="brand" slot="start">
            <div class="brand-icon">CR</div>
            <div class="brand-info">
              <strong>Campus Reports</strong>
              <span>Admin · All Requests</span>
            </div>
          </div>
          <ion-buttons slot="end">
            <ion-button (click)="load()" [disabled]="loading">Refresh</ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content class="dashboard-content">

      <main class="dashboard-container">

        @if (!selected) {

          <!-- Welcome Section -->
          <section class="welcome-section">
            <div class="welcome-text">
              <span class="eyebrow">ADMIN · ALL REQUESTS</span>

              <h1>
                All <span>Requests</span>
              </h1>

              <p>
                Every request in any status, read-only. Tap one to see its photos,
                proof, history and the faculty rating.
              </p>

              <div class="welcome-role">
                <span class="status-dot"></span>
                Read-only · use the Manage tab to act
              </div>
            </div>

            <div class="welcome-illustration">
              <div class="illustration-circle">
                <span class="illustration-icon">✦</span>
                <div class="illustration-shield">▤</div>
              </div>
            </div>
          </section>

          <!-- Filter -->
          <section class="section-block">
            <div class="control-card">
              <ion-item lines="none" class="filter-item">
                <ion-select label="Status" labelPlacement="stacked" interface="popover"
                            [ngModel]="statusFilter"
                            (ionChange)="setFilter($event.detail.value)">
                  <ion-select-option value="all">All statuses</ion-select-option>
                  @for (s of statusOptions; track s) {
                    <ion-select-option [value]="s">{{ statusLabel(s) }}</ion-select-option>
                  }
                </ion-select>
              </ion-item>
            </div>
          </section>

          <!-- List -->
          <section class="section-block">
            <div class="section-heading">
              <div>
                <span class="eyebrow">REQUESTS</span>
                <h2>{{ statusFilter === 'all' ? 'Everything' : statusLabel(statusFilter) }}</h2>
              </div>
            </div>

            @if (requests.length > 0) {
              <ion-list class="card-list">
                @for (r of requests; track r.id) {
                  <ion-item button detail="true" [disabled]="opening" (click)="openRequest(r.id)">
                    <ion-label class="ion-text-wrap">
                      <h3>{{ r.title }}</h3>
                      <p>{{ r.category_name }} · {{ r.location_name }}</p>
                      <p class="meta">
                        {{ r.department_name ?? 'No department yet' }}
                        @if (r.assigned_name) {
                          · {{ r.assigned_name }}
                        }
                        · {{ r.created_at | date: 'mediumDate' }}
                      </p>
                    </ion-label>
                    <div slot="end" class="badges">
                      <app-priority-badge [priority]="r.priority" />
                      <ion-badge [color]="statusColor(r.status)">
                        {{ statusLabel(r.status) }}
                      </ion-badge>
                    </div>
                  </ion-item>
                }
              </ion-list>
            } @else if (!loading) {
              <div class="empty-card">
                {{ statusFilter === 'all' ? 'No requests yet.' : 'No requests with this status.' }}
              </div>
            }
          </section>

        } @else {

          <!-- Detail -->
          <section class="section-block detail-block">
            <div class="detail-card">
              <span class="eyebrow">REQUEST #{{ selected.id }}</span>
              <h2 class="detail-title">{{ selected.title }}</h2>
              <p class="meta">
                {{ selected.category_name }} · {{ selected.location_name }} ·
                Reported {{ selected.created_at | date: 'mediumDate' }}
              </p>
              <p class="detail-text">{{ selected.description }}</p>
              <p class="meta">
                Status: {{ statusLabel(selected.status) }}
                @if (selected.department_name) {
                  · Department: {{ selected.department_name }}
                }
                @if (selected.assigned_name) {
                  · Staff: {{ selected.assigned_name }}
                }
              </p>
              @if (selected.priority) {
                <p class="meta">Priority: <app-priority-badge [priority]="selected.priority" /></p>
              }
            </div>

            <img class="photo"
                 [src]="'data:image/jpeg;base64,' + selected.before_photo"
                 alt="Before photo" />

            @if (selected.after_photo) {
              <div class="detail-card">
                <span class="eyebrow">PROOF</span>
                <h3 class="detail-title">Proof from staff</h3>
                @if (selected.proof_note) {
                  <p class="detail-text">{{ selected.proof_note }}</p>
                } @else {
                  <p class="meta">No note.</p>
                }
              </div>
              <img class="photo"
                   [src]="'data:image/jpeg;base64,' + selected.after_photo"
                   alt="After photo" />
            }

            <!-- Step 8: how the faculty member rated the work (only after completion). -->
            @if (selected.review) {
              <div class="detail-card">
                <span class="eyebrow">RATING</span>
                <h3 class="detail-title">Faculty rating</h3>
                <p class="detail-text">{{ selected.review.rating }} / 5</p>
                @if (selected.review.comment) {
                  <p class="detail-text">{{ selected.review.comment }}</p>
                }
                <p class="meta">
                  {{ selected.review.reviewer_name }} · {{ selected.review.created_at | date: 'mediumDate' }}
                </p>
              </div>
            } @else if (selected.status === 'completed') {
              <div class="detail-card">
                <p class="meta">Not rated yet.</p>
              </div>
            }

            <div class="section-heading history-heading">
              <div>
                <span class="eyebrow">TIMELINE</span>
                <h2>History</h2>
              </div>
            </div>

            <ion-list class="card-list">
              @for (e of selected.events; track $index) {
                <ion-item>
                  <ion-label class="ion-text-wrap">
                    <h3>{{ statusLabel(e.status) }}</h3>
                    @if (e.remark) {
                      <p>{{ e.remark }}</p>
                    }
                    <p class="meta">{{ e.changed_by_name }} · {{ e.changed_at | date: 'short' }}</p>
                  </ion-label>
                </ion-item>
              }
            </ion-list>

            <p class="meta footnote">
              Read-only. To assign, cancel or complete a request, use the Manage tab.
            </p>
          </section>
        }

        <!-- Footer -->
        <footer class="dashboard-footer">
          <span>Campus Reports</span>
          <span>Admin · All Requests</span>
        </footer>

      </main>

    </ion-content>
  `,
  styles: [`

    /* =====================================
       GLOBAL DASHBOARD
    ===================================== */

    :host {
      display: block;
      --purple-primary: #56318f;
      --purple-secondary: #7651b5;
      --purple-light: #b99ae8;
      --lavender: #ede4fa;
      --background-color: #faf8fd;
      --text-dark: #302344;
      --text-muted: #8c829b;
      --border-color: #eee8f5;
      --card-background: #ffffff;
    }

    .dashboard-content {
      --background: var(--background-color);
      --color: var(--text-dark);
    }

    .dashboard-container {
      width: 100%;
      max-width: 1250px;
      margin: 0 auto;
      padding: 32px 42px;
      box-sizing: border-box;
    }

    /* =====================================
       TOP NAVIGATION
    ===================================== */

    .top-toolbar {
      --background: #ffffff;
      --color: var(--text-dark);
      --min-height: 76px;
      --padding-start: 28px;
      --padding-end: 28px;
      border-bottom: 1px solid var(--border-color);
    }

    ion-title {
      font-weight: 700;
      color: var(--text-dark);
    }

    ion-button {
      --color: var(--purple-primary);
      --border-radius: 10px;
      font-weight: 650;
      text-transform: none;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 42px;
      height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 13px;
      background: var(--purple-primary);
      color: white;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 1px;
      transition: transform .25s ease, box-shadow .25s ease;
    }

    .brand-icon:hover {
      transform: rotate(-7deg) scale(1.08);
      box-shadow: 0 5px 14px rgba(86,49,143,.25);
    }

    .brand-info {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .brand-info strong {
      color: var(--text-dark);
      font-size: 16px;
      font-weight: 750;
    }

    .brand-info span {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* =====================================
       WELCOME BANNER
    ===================================== */

    .welcome-section {
      min-height: 220px;
      padding: 36px 42px;
      box-sizing: border-box;
      border-radius: 22px;
      background: linear-gradient(120deg, #56318f 0%, #7651b5 60%, #8c6ac5 100%);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      color: white;
      box-shadow: 0 12px 30px rgba(86, 49, 143, 0.16);
      transition: transform .25s ease, box-shadow .25s ease;
    }

    .welcome-section:hover {
      transform: translateY(-3px);
      box-shadow: 0 16px 35px rgba(86,49,143,.22);
    }

    .welcome-text {
      position: relative;
      z-index: 2;
      max-width: 650px;
    }

    .eyebrow {
      display: block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.6px;
      margin-bottom: 12px;
      color: #bfa8e9;
    }

    .welcome-section .eyebrow {
      color: #dfd0f7;
    }

    .welcome-section h1 {
      font-size: clamp(25px, 3vw, 35px);
      font-weight: 750;
      margin: 0 0 12px;
      line-height: 1.25;
    }

    .welcome-section h1 span {
      color: #d8c3ff;
    }

    .welcome-section p {
      font-size: 13px;
      line-height: 1.8;
      color: #e8def6;
      max-width: 510px;
      margin: 0 0 20px;
    }

    .welcome-role {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 650;
      background: rgba(255,255,255,0.13);
      padding: 8px 14px;
      border-radius: 30px;
      transition: background .2s ease, transform .2s ease;
    }

    .welcome-role:hover {
      background: rgba(255,255,255,.22);
      transform: translateX(4px);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      background: #d8c3ff;
      border-radius: 50%;
      animation: status-pulse 2s infinite;
    }

    .welcome-illustration {
      width: 180px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .illustration-circle {
      width: 135px;
      height: 135px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.23);
      background: rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      transition: transform .35s ease, background .35s ease;
    }

    .welcome-section:hover .illustration-circle {
      transform: rotate(8deg) scale(1.06);
      background: rgba(255,255,255,.13);
    }

    .illustration-shield {
      width: 72px;
      height: 82px;
      border: 3px solid rgba(255,255,255,0.6);
      clip-path: polygon(50% 0%, 100% 20%, 90% 75%, 50% 100%, 10% 75%, 0% 20%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
      transition: transform .3s ease;
    }

    .welcome-section:hover .illustration-shield {
      transform: scale(1.1);
    }

    .illustration-icon {
      position: absolute;
      top: 2px;
      right: 10px;
      font-size: 25px;
      color: #e6d5ff;
      transition: transform .3s ease;
    }

    .welcome-section:hover .illustration-icon {
      transform: rotate(35deg) scale(1.2);
    }

    /* =====================================
       SECTIONS
    ===================================== */

    .section-block {
      margin-top: 38px;
    }

    .section-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-bottom: 20px;
    }

    .section-heading .eyebrow {
      color: var(--purple-secondary);
      margin-bottom: 7px;
    }

    .section-heading h2 {
      margin: 0;
      font-size: 21px;
      color: var(--text-dark);
      font-weight: 750;
    }

    .history-heading {
      margin-top: 28px;
    }

    .control-card {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 10px 18px;
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.07);
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .control-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(86, 49, 143, 0.12);
    }

    .filter-item {
      --background: transparent;
      --color: var(--text-dark);
      --highlight-color-focused: var(--purple-secondary);
      padding: 0;
    }

    .filter-item ion-select {
      color: var(--text-dark);
    }

    /* =====================================
       LIST
    ===================================== */

    .card-list {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
      padding: 0;
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.07);
    }

    .card-list ion-item {
      --background: var(--card-background);
      --border-color: var(--border-color);
      --color: var(--text-dark);
      --highlight-color-focused: var(--purple-secondary);
      transition: background .2s ease;
    }

    .card-list ion-item[button]:hover {
      --background: #fdfbff;
    }

    .card-list ion-item h3 {
      margin: 0 0 4px;
      font-weight: 700;
      color: var(--purple-primary);
    }

    .card-list ion-item p {
      color: var(--text-dark);
    }

    .badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .meta {
      color: var(--text-muted);
      font-size: 13px;
      margin: 4px 0;
    }

    .empty-card {
      background: var(--lavender);
      border: 1px dashed var(--purple-light);
      border-radius: 16px;
      padding: 18px;
      color: var(--purple-primary);
      text-align: center;
      font-weight: 600;
    }

    /* =====================================
       DETAIL
    ===================================== */

    .detail-card {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 14px;
      color: var(--text-dark);
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.07);
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .detail-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(86, 49, 143, 0.12);
    }

    .detail-title {
      margin: 0 0 6px;
      font-size: 18px;
      font-weight: 700;
      color: var(--purple-primary);
    }

    .detail-text {
      color: var(--text-dark);
      margin: 8px 0 4px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .photo {
      display: block;
      width: 100%;
      max-width: 100%;
      border-radius: 16px;
      border: 1px solid var(--border-color);
      margin-bottom: 14px;
    }

    .footnote {
      text-align: center;
      margin-top: 18px;
    }

    /* =====================================
       FOOTER
    ===================================== */

    .dashboard-footer {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 25px 0 10px;
      margin-top: 35px;
      border-top: 1px solid var(--border-color);
      font-size: 11px;
      color: var(--text-muted);
    }

    /* =====================================
       ANIMATIONS
    ===================================== */

    @keyframes status-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(216,195,255,.6); }
      50% { box-shadow: 0 0 0 5px rgba(216,195,255,0); }
    }

    /* =====================================
       RESPONSIVENESS
    ===================================== */

    @media (max-width: 900px) {
      .dashboard-container {
        padding: 28px 24px;
      }

      .welcome-section {
        padding: 30px;
      }

      .welcome-illustration {
        width: 130px;
      }
    }

    @media (max-width: 600px) {
      .dashboard-container {
        padding: 20px 15px;
      }

      .top-toolbar {
        --min-height: 65px;
        --padding-start: 15px;
        --padding-end: 12px;
      }

      .brand-icon {
        width: 37px;
        height: 37px;
        font-size: 12px;
      }

      .brand-info strong {
        font-size: 14px;
      }

      .brand-info span {
        font-size: 10px;
      }

      .welcome-section {
        min-height: auto;
        padding: 27px 22px;
        border-radius: 17px;
      }

      .welcome-text {
        max-width: 100%;
      }

      .welcome-section h1 {
        font-size: 24px;
      }

      .welcome-section p {
        font-size: 11px;
      }

      .welcome-illustration {
        display: none;
      }

      .section-block {
        margin-top: 30px;
      }

      .section-heading h2 {
        font-size: 19px;
      }

      .dashboard-footer {
        font-size: 9px;
      }
    }

    @media (max-width: 360px) {
      .dashboard-container {
        padding: 15px 11px;
      }

      .welcome-section {
        padding: 23px 17px;
      }

      .welcome-section h1 {
        font-size: 21px;
      }

      .section-heading h2 {
        font-size: 17px;
      }
    }

    /* =====================================
       TOUCH + ACCESSIBILITY
    ===================================== */

    @media (hover: none) {
      .welcome-section:hover,
      .control-card:hover,
      .detail-card:hover {
        transform: none;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
      }
    }

  `],
})
export class AllRequestsPage implements OnDestroy {
  private adminService = inject(AdminRequestService);
  private feedback = inject(FeedbackService);
  private cdr = inject(ChangeDetectorRef);
  private live = inject(LiveUpdateService);
  private watcher: LiveWatcher | null = null;

  readonly statusOptions = STATUS_ORDER;

  requests: AdminRequestRow[] = [];
  selected: AdminRequestDetail | null = null;
  statusFilter: RequestStatus | 'all' = 'all';
  loading = false;
  opening = false;

  // Counts every load. A slow answer for an old filter is ignored when a newer load started.
  private loadSeq = 0;

  // Ionic keeps tab pages alive, so start watching each time the tab is shown.
  // The list loads now, and again by itself whenever any request changes.
  // While a detail is open the screen is left alone, so the admin is not thrown back to the list.
  // backToList() reloads, so nothing is missed.
  ionViewWillEnter() {
    this.watcher?.stop();
    this.watcher = this.live.watch('list', async (silent) => {
      if (!this.selected) {
        await this.load(silent);
      }
    });
  }

  // Live updates: stop checking when the screen is left or destroyed.
  ionViewWillLeave() {
    this.stopWatching();
  }

  ngOnDestroy() {
    this.stopWatching();
  }

  private stopWatching() {
    this.watcher?.stop();
    this.watcher = null;
  }

  // silent = true is a background refresh: no spinner and no error message.
  async load(silent = false) {
    const seq = ++this.loadSeq;
    if (!silent) {
      this.loading = true;
      this.cdr.markForCheck();
    }
    try {
      const rows = await this.adminService.loadAll(this.statusFilter === 'all' ? null : this.statusFilter);
      if (seq === this.loadSeq) {
        this.requests = rows;
      }
    } catch (e: any) {
      if (seq === this.loadSeq && !silent) {
        await this.feedback.toast(e.message ?? 'Could not load the requests.');
      }
    } finally {
      if (seq === this.loadSeq) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }

  async setFilter(value: RequestStatus | 'all') {
    if (value === this.statusFilter) return;
    this.statusFilter = value;
    await this.load();
  }

  async openRequest(id: number) {
    if (this.opening) return; // ignore a double tap
    this.opening = true;
    this.cdr.markForCheck();
    try {
      this.selected = await this.adminService.loadDetail(id);
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not open the request.');
    } finally {
      this.opening = false;
      this.cdr.markForCheck();
    }
  }

  backToList() {
    this.selected = null;
    this.load();
  }

  statusLabel(status: RequestStatus): string {
    return STATUS_LABELS[status];
  }

  statusColor(status: RequestStatus): string {
    return STATUS_COLORS[status];
  }
}