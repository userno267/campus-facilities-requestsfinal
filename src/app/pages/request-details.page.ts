
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton, IonBadge, IonButtons, IonContent, IonHeader, IonItem,
  IonLabel, IonList, IonTitle, IonToolbar,
} from '@ionic/angular';
import { FacultyRequestDetail, RequestStatus } from '../models/request.model';
import { RequestService } from '../services/request.service';
import { FeedbackService } from '../services/feedback.service';
import { LiveUpdateService, LiveWatcher } from '../services/live-update.service';
import { RequestPhotoComponent } from '../components/request-photo.component';
import { PriorityBadgeComponent } from '../components/priority-badge.component';

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

@Component({
  selector: 'app-request-details',
  standalone: true,
  imports: [
    DatePipe,
    IonBackButton, IonBadge, IonButtons, IonContent, IonHeader, IonItem,
    IonLabel, IonList, IonTitle, IonToolbar,
    RequestPhotoComponent,
    PriorityBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">
        <ion-buttons slot="start">
          <ion-back-button
            defaultHref="/tabs/my-reports"
            text="Back">
          </ion-back-button>
          <div class="brand-header">
            <img
              src="assets/campus-reports-logo.png"
              alt="Campus Reports logo"
              class="brand-logo-img" />
          </div>
        </ion-buttons>
        <ion-title>Request Details</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      <div class="page-heading">
        <span class="eyebrow">FACULTY PORTAL</span>
        <h1>Request Details</h1>
        <p>View the information and progress of your request.</p>
      </div>

      @if (detail; as r) {
        <div class="card request-card">
          <div class="card-heading">
            <div class="heading-icon">📋</div>
            <span class="card-label">REQUEST INFORMATION</span>
          </div>

          <h2 class="title">{{ r.title }}</h2>

          <div class="badges">
            <app-priority-badge [priority]="r.priority" />
            <ion-badge [color]="statusColor(r.status)">
              {{ statusLabel(r.status) }}
            </ion-badge>
          </div>

          <div class="info-divider"></div>

          <p class="meta">
            <strong>Category:</strong> {{ r.category_name }}
          </p>
          <p class="meta">
            <strong>Location:</strong> {{ r.location_name }}
          </p>
          <p class="meta">
            <strong>Reported:</strong> {{ r.created_at | date: 'mediumDate' }}
          </p>

          <div class="description-box">
            <span class="description-label">DESCRIPTION</span>
            <p class="text">{{ r.description }}</p>
          </div>

          @if (r.staff_name) {
            <p class="staff-info">
              <strong>Handled by:</strong> {{ r.staff_name }}
            </p>
          }
        </div>

        <div class="card">
          <div class="card-heading">
            <div class="heading-icon">📷</div>
            <span class="card-label">ORIGINAL REPORT</span>
          </div>

          <h3 class="section">Problem Photo</h3>
          <app-request-photo [base64]="r.before_photo" alt="Problem photo" />

          <div class="photo-details">
            <p class="meta">
              <strong>Taken at:</strong>
              {{ r.photo_taken_at ? (r.photo_taken_at | date: 'medium') : 'Time not recorded' }}
            </p>
            <p class="meta">
              <strong>Coordinates:</strong>
              {{ formatCoords(r.latitude, r.longitude) }}
            </p>
          </div>
        </div>

        @if (r.after_photo; as afterPhoto) {
          <div class="card">
            <div class="card-heading">
              <div class="heading-icon">✅</div>
              <span class="card-label">COMPLETION UPDATE</span>
            </div>

            <h3 class="section">Proof of Completed Work</h3>
            <app-request-photo [base64]="afterPhoto" alt="Proof photo" />

            <div class="photo-details">
              <p class="meta">
                <strong>Taken at:</strong>
                {{ r.after_photo_taken_at ? (r.after_photo_taken_at | date: 'medium') : 'Time not recorded' }}
              </p>
              <p class="meta">
                <strong>Coordinates:</strong>
                {{ formatCoords(r.after_latitude, r.after_longitude) }}
              </p>
            </div>

            @if (r.proof_note) {
              <div class="description-box">
                <span class="description-label">STAFF NOTE</span>
                <p class="text">{{ r.proof_note }}</p>
              </div>
            }
          </div>
        }

        @if (r.review; as review) {
          <div class="card">
            <div class="card-heading">
              <div class="heading-icon">⭐</div>
              <span class="card-label">YOUR FEEDBACK</span>
            </div>

            <h3 class="section">Your Rating</h3>
            <p class="rating">{{ review.rating }} <span>/ 5</span></p>

            @if (review.comment) {
              <p class="text">{{ review.comment }}</p>
            } @else {
              <p class="meta">No comment provided.</p>
            }

            <p class="meta">
              Rated {{ review.created_at | date: 'mediumDate' }}
            </p>
          </div>
        } @else if (r.status === 'completed') {
          <div class="notice-card">
            <div class="notice-icon">⭐</div>
            <div>
              <strong>How was the service?</strong>
              <p>You have not rated this work yet. You can submit your rating from My Reports.</p>
            </div>
          </div>
        }

        <div class="card history-card">
          <div class="card-heading">
            <div class="heading-icon">🕒</div>
            <span class="card-label">REQUEST ACTIVITY</span>
          </div>

          <h3 class="section">Request History</h3>

          <ion-list class="timeline-list">
            @for (e of r.events; track $index) {
              <ion-item lines="none" class="timeline-item">
                <div class="timeline-dot" slot="start"></div>
                <ion-label class="ion-text-wrap">
                  <h3>{{ statusLabel(e.status) }}</h3>
                  @if (e.remark) {
                    <p class="event-remark">{{ e.remark }}</p>
                  }
                  <p class="meta">
                    {{ e.changed_by_name }} · {{ e.changed_at | date: 'short' }}
                  </p>
                </ion-label>
              </ion-item>
            }
          </ion-list>
        </div>

      } @else if (!loading) {
        <div class="empty-card">
          <div class="empty-icon">📄</div>
          <h3>Request Not Found</h3>
          <p>This request could not be opened. Please return to My Reports and try again.</p>
        </div>
      } @else {
        <div class="loading-card">
          <p>Loading request details...</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .brand-header { display: flex; align-items: center; gap: 12px; }
    .brand-logo-img { height: 42px; width: auto; max-width: 160px; object-fit: contain; }
    @media (max-width: 600px) { .brand-logo-img { height: 34px; } }

    :host {
      --purple-primary: #56318f;
      --purple-secondary: #7651b5;
      --purple-light: #b99ae8;
      --lavender: #ede4fa;
      --background-color: #faf8fd;
      --text-dark: #302344;
      --text-muted: #8c829b;
    }

    .page-content {
      --background: var(--background-color);
    }

    .page-toolbar {
      --background: #ffffff;
      --color: var(--text-dark);
      --border-color: #eee8f5;
      border-bottom: 1px solid #eee8f5;
    }

    ion-back-button {
      --color: var(--purple-primary);
    }

    .page-heading {
      margin: 8px 0 22px;
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
      margin: 0;
      line-height: 1.5;
    }

    .card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 16px;
      box-shadow: 0 5px 18px rgba(65, 39, 100, 0.055);
    }

    .request-card {
      border-top: 4px solid var(--purple-primary);
    }

    .card-heading {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 15px;
    }

    .heading-icon {
      width: 34px;
      height: 34px;
      border-radius: 11px;
      background: var(--lavender);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      flex-shrink: 0;
    }

    .card-label {
      color: var(--purple-secondary);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.2px;
    }

    .title {
      color: var(--text-dark);
      font-size: 20px;
      font-weight: 800;
      line-height: 1.35;
      margin: 0 0 12px;
    }

    .badges {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .badges ion-badge {
      border-radius: 7px;
      padding: 7px 10px;
      font-size: 11px;
      font-weight: 700;
    }

    .info-divider {
      height: 1px;
      background: #eee8f5;
      margin: 17px 0;
    }

    .meta {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.6;
      margin: 5px 0;
      overflow-wrap: anywhere;
    }

    .meta strong {
      color: var(--text-dark);
      font-weight: 700;
    }

    .description-box {
      background: #faf8fd;
      border: 1px solid #eee8f5;
      border-radius: 12px;
      padding: 13px;
      margin-top: 15px;
    }

    .description-label {
      color: var(--purple-secondary);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .text {
      color: var(--text-dark);
      font-size: 14px;
      line-height: 1.65;
      margin: 7px 0 0;
      overflow-wrap: anywhere;
    }

    .staff-info {
      color: var(--text-muted);
      font-size: 13px;
      margin: 14px 0 0;
    }

    .staff-info strong {
      color: var(--text-dark);
    }

    .section {
      color: var(--text-dark);
      font-size: 16px;
      font-weight: 800;
      margin: 0 0 14px;
    }

    .photo-details {
      background: #faf8fd;
      border-radius: 11px;
      padding: 10px 12px;
      margin-top: 12px;
    }

    .rating {
      color: var(--purple-primary);
      font-size: 30px;
      font-weight: 800;
      margin: 4px 0 10px;
    }

    .rating span {
      color: var(--text-muted);
      font-size: 15px;
      font-weight: 500;
    }

    .notice-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #f3edfc;
      border: 1px solid #e5d8f8;
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .notice-icon {
      font-size: 22px;
    }

    .notice-card strong {
      color: var(--purple-primary);
      font-size: 14px;
    }

    .notice-card p {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.5;
      margin: 5px 0 0;
    }

    .timeline-list {
      background: transparent;
      padding: 0;
      margin-top: 10px;
    }

    .timeline-item {
      --background: transparent;
      --color: var(--text-dark);
      --padding-start: 0;
      --inner-padding-end: 0;
      --min-height: 65px;
    }

    .timeline-item ion-label {
      margin: 8px 0;
    }

    .timeline-item h3 {
      color: var(--purple-primary);
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 5px;
    }

    .timeline-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: var(--purple-secondary);
      margin: 0 13px 0 3px;
      box-shadow: 0 0 0 4px var(--lavender);
    }

    .event-remark {
      color: var(--text-dark);
      font-size: 13px;
      margin: 4px 0;
      line-height: 1.5;
    }

    .empty-card,
    .loading-card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 18px;
      padding: 30px 20px;
      text-align: center;
      box-shadow: 0 5px 18px rgba(65, 39, 100, 0.055);
    }

    .empty-icon {
      font-size: 35px;
      margin-bottom: 10px;
    }

    .empty-card h3 {
      color: var(--text-dark);
      font-size: 17px;
      font-weight: 800;
      margin: 0 0 8px;
    }

    .empty-card p,
    .loading-card p {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.5;
      margin: 0;
    }

    @media (min-width: 768px) {
      .page-content {
        --padding-start: 28px;
        --padding-end: 28px;
      }

      .page-heading,
      .card,
      .notice-card,
      .empty-card,
      .loading-card {
        max-width: 850px;
        margin-left: auto;
        margin-right: auto;
      }

      .page-heading {
        margin-bottom: 22px;
      }

      .card,
      .notice-card {
        margin-bottom: 16px;
      }
    }
  `],
})
export class RequestDetailsPage implements OnDestroy {
  private route = inject(ActivatedRoute);
  private requestService = inject(RequestService);
  private feedback = inject(FeedbackService);
  private cdr = inject(ChangeDetectorRef);
  private live = inject(LiveUpdateService);
  private watcher: LiveWatcher | null = null;

  detail: FacultyRequestDetail | null = null;
  loading = false;

  ionViewWillEnter() {
    this.watcher?.stop();
    const id = this.requestId();

    if (id === null) {
      void this.load(false);
      return;
    }

    this.watcher = this.live.watch(
      'request',
      (silent) => this.load(silent),
      id
    );
  }

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

  private requestId(): number | null {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    return Number.isInteger(id) && id >= 1 ? id : null;
  }

  private async load(silent = false) {
    const id = this.requestId();

    if (id === null) {
      this.detail = null;
      await this.feedback.toast('That request link is not valid.');
      this.cdr.markForCheck();
      return;
    }

    if (!silent) {
      this.loading = true;
      this.cdr.markForCheck();
    }

    try {
      this.detail = await this.requestService.getMyRequestDetail(id);
    } catch (e: any) {
      if (!silent) {
        this.detail = null;
        await this.feedback.toast(e.message ?? 'Could not load this request.');
      }
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  formatCoords(lat: number | null, lng: number | null): string {
    if (lat === null || lng === null) {
      return 'Location not recorded';
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  statusLabel(status: RequestStatus): string {
    return STATUS_LABELS[status];
  }

  statusColor(status: RequestStatus): string {
    return STATUS_COLORS[status];
  }
}
