
import { ChangeDetectorRef, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonItem,
  IonList, IonTextarea, IonTitle, IonToolbar,
} from '@ionic/angular';
import { RequestPriority, RequestStatus, StaffJob, StaffQueueItem } from '../models/request.model';
import { StaffJobService } from '../services/staff-job.service';
import { FeedbackService } from '../services/feedback.service';
import { LiveUpdateService, LiveWatcher } from '../services/live-update.service';
import { DeviceService, GpsStatus, PhotoSource } from '../services/device.service';
import {
  WORKING_QUALITY, resizeDataUrlToBase64, resizeImageToBase64, stampPhoto,
} from '../utils/photo.util';
import { PriorityBadgeComponent } from '../components/priority-badge.component';
import { LocationMapComponent } from '../components/location-map.component';

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  assigned: 'Not started',
  in_progress: 'In progress',
  awaiting_proof: 'Waiting for review',
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

type GpsState = 'idle' | 'loading' | GpsStatus;

@Component({
  selector: 'app-assigned-job',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    IonBadge, IonButton, IonButtons, IonContent, IonHeader, IonItem,
    IonList, IonTextarea, IonTitle, IonToolbar,
    PriorityBadgeComponent, LocationMapComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">
        <ion-title>My Job</ion-title>
        <ion-buttons slot="end">
          <ion-button
            class="refresh-btn"
            (click)="load()"
            [disabled]="loading || busy"
          >
            Refresh
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      @if (job) {
        <div class="job-card">
          <div class="job-head">
            <h2 class="job-title">{{ job.title }}</h2>
            <div class="badges">
              <app-priority-badge [priority]="job.priority" />
              <ion-badge [color]="statusColor(job.status)">
                {{ statusLabel(job.status) }}
              </ion-badge>
            </div>
          </div>

          <p class="meta">
            {{ job.category_name }} · {{ job.location_name }} ·
            Updated {{ job.updated_at | date: 'medium' }}
          </p>

          <p class="detail-text">{{ job.description }}</p>

          <p class="meta">
            <strong>Problem location:</strong>
            {{ formatCoords(job.latitude, job.longitude) }}
          </p>

          <img
            class="photo"
            [src]="'data:image/jpeg;base64,' + job.before_photo"
            alt="Problem photo"
          />

          @if (job.status === 'assigned' || job.status === 'in_progress') {
            <app-location-map
              [problemLat]="job.latitude"
              [problemLng]="job.longitude"
              [staffLat]="staffLat"
              [staffLng]="staffLng"
            />

            <p class="gps-text">{{ staffGpsText }}</p>

            <p class="meta">
              Your position is shown on this screen only. It is not saved.
            </p>

            <ion-button
              expand="block"
              fill="outline"
              class="action-btn-outline"
              [disabled]="busy || staffGpsState === 'loading'"
              (click)="updateMyPosition()"
            >
              Update my position
            </ion-button>

            @if (job.latitude !== null && job.longitude !== null) {
              <p class="meta map-link-wrapper">
                <a
                  class="osm-link"
                  target="_blank"
                  rel="noopener"
                  [href]="openMapLink(job.latitude, job.longitude)"
                >
                  Open in a larger map
                </a>
              </p>
            }
          }
        </div>

        @if (job.status === 'in_progress') {
          <div class="job-card ion-margin-top">

            @if (job.rejected_remark) {
              <div class="rejected-card">
                <strong>Sent back by the admin:</strong>
                <p class="detail-text">{{ job.rejected_remark }}</p>
                <p class="meta">
                  Please fix this and send proof again.
                </p>
              </div>
            }

            <h3 class="section-title">Proof of completed work</h3>

            <p class="meta">
              Take a photo of the finished work, add an optional note,
              then send it to the admin.
            </p>

            <input
              #cameraInput
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              (change)="onPhotoPicked($event)"
            />

            <input
              #galleryInput
              type="file"
              accept="image/*"
              hidden
              (change)="onPhotoPicked($event)"
            />

            <div class="photo-buttons">
              <ion-button
                expand="block"
                class="action-btn"
                [disabled]="busy"
                (click)="openPhoto('camera')"
              >
                Take photo
              </ion-button>

              <ion-button
                expand="block"
                fill="outline"
                class="action-btn-outline"
                [disabled]="busy"
                (click)="openPhoto('gallery')"
              >
                Choose photo
              </ion-button>
            </div>

            @if (previewSrc) {
              <img
                class="photo preview-photo"
                [src]="previewSrc"
                alt="After photo preview"
              />

              <p class="meta">
                Photo time: {{ proofTakenAt | date: 'medium' }}
              </p>
            }

            <div class="gps-box">
              <p class="gps-label">
                Location of this proof (required)
              </p>

              <p class="gps-text">{{ gpsText }}</p>

              <ion-button
                expand="block"
                fill="outline"
                class="action-btn-outline"
                [disabled]="busy || gpsState === 'loading'"
                (click)="fixLocation()"
              >
                Try GPS again
              </ion-button>
            </div>

            <ion-list class="note-list">
              <ion-item>
                <ion-textarea
                  label="Note (optional)"
                  labelPlacement="stacked"
                  [autoGrow]="true"
                  maxlength="300"
                  placeholder="For example: replaced the filter"
                  [(ngModel)]="note"
                ></ion-textarea>
              </ion-item>
            </ion-list>

            <ion-button
              expand="block"
              class="action-btn ion-margin-top"
              [disabled]="!canSendProof()"
              (click)="submitProof()"
            >
              {{ busy ? 'Sending...' : 'Send proof' }}
            </ion-button>
          </div>
        }

        @if (job.status === 'awaiting_proof') {
          <div class="job-card ion-margin-top">
            <h3 class="section-title">Proof sent</h3>

            <p class="meta">
              Waiting for the admin to review your work.
            </p>

            @if (job.after_photo) {
              <img
                class="photo"
                [src]="'data:image/jpeg;base64,' + job.after_photo"
                alt="Your after photo"
              />
            }

            <p class="meta">
              <strong>Taken at:</strong>
              {{ job.after_photo_taken_at | date: 'medium' }} ·
              <strong>Location:</strong>
              {{ formatCoords(job.after_latitude, job.after_longitude) }}
            </p>

            @if (job.proof_note) {
              <p class="detail-text">
                <strong>Your note:</strong> {{ job.proof_note }}
              </p>
            }
          </div>
        }
      } @else if (!loading && queue.length === 0 && paused.length === 0) {
        <div class="empty-card">
          No active job right now. New jobs appear here when the admin assigns you one.
        </div>
      } @else if (!loading) {
        <div class="empty-card">
          You are not working on a job right now. Start one from your queue below.
        </div>
      }

      <!-- PAUSE: only while a more urgent job is waiting in the queue -->
      @if (job && job.status === 'in_progress' && canPause) {
        <div class="job-card ion-margin-top">
          <h3 class="section-title">A more urgent job is waiting</h3>
          <p class="meta">
            You can pause this job, do the urgent one first, then resume this one later.
          </p>
          <ion-list class="note-list">
            <ion-item>
              <ion-textarea
                label="Reason for pausing"
                labelPlacement="stacked"
                [autoGrow]="true"
                maxlength="300"
                placeholder="For example: urgent leak in the library"
                [(ngModel)]="pauseReason"
              ></ion-textarea>
            </ion-item>
          </ion-list>
          <ion-button
            expand="block"
            fill="outline"
            class="action-btn-outline"
            [disabled]="busy || pauseReason.trim() === ''"
            (click)="pauseJob()"
          >
            {{ busy ? 'Saving...' : 'Pause this job' }}
          </ion-button>
        </div>
      }

      <!-- PAUSED JOBS -->
      @if (paused.length > 0) {
        <h3 class="section-title ion-margin-top">Paused jobs</h3>
        @for (p of paused; track p.id) {
          <div class="job-card">
            <div class="job-head">
              <h2 class="job-title">{{ p.title }}</h2>
              <div class="badges">
                <app-priority-badge [priority]="p.priority" />
                <ion-badge [color]="statusColor(p.status)">{{ statusLabel(p.status) }}</ion-badge>
              </div>
            </div>
            <p class="meta">{{ p.category_name }} · {{ p.location_name }}</p>
            @if (p.paused_remark) {
              <div class="rejected-card">
                <p class="detail-text">{{ p.paused_remark }}</p>
              </div>
            }
            <ion-button
              expand="block"
              class="action-btn ion-margin-top"
              [disabled]="busy || job !== null"
              (click)="resumeJob(p)"
            >
              {{ job !== null ? 'Finish your current job first' : (busy ? 'Saving...' : 'Resume') }}
            </ion-button>
          </div>
        }
      }

      <!-- QUEUE: assigned, not started yet. Most urgent first. -->
      @if (queue.length > 0) {
        <h3 class="section-title ion-margin-top">Your queue</h3>
        @for (q of queue; track q.id) {
          <div class="job-card">
            <div class="job-head">
              <h2 class="job-title">{{ q.title }}</h2>
              <div class="badges">
                <app-priority-badge [priority]="q.priority" />
                <ion-badge [color]="statusColor(q.status)">{{ statusLabel(q.status) }}</ion-badge>
              </div>
            </div>
            <p class="meta">{{ q.category_name }} · {{ q.location_name }}</p>
            <p class="detail-text">{{ q.description }}</p>
            <ion-button
              expand="block"
              class="action-btn ion-margin-top"
              [disabled]="busy || job !== null"
              (click)="startQueued(q)"
            >
              {{ job !== null ? 'Finish or pause your current job first' : (busy ? 'Saving...' : 'Start this job') }}
            </ion-button>
          </div>
        }
      }
    </ion-content>
  `,
  styles: [`
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

    /* PAGE */

    .page-content {
      --background: var(--background-color);
    }

    .page-toolbar {
      --background: #ffffff;
      --color: var(--text-dark);
      border-bottom: 1px solid var(--border-color);
    }

    ion-title {
      font-weight: 700;
      transition: transform .2s ease, color .2s ease;
    }

    ion-title:hover {
      transform: translateX(3px);
      color: var(--purple-secondary);
    }

    /* CARDS */

    .job-card {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 4px 14px rgba(86, 49, 143, .06);
      transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease;
      animation: card-enter .35s ease both;
    }

    .job-card:hover {
      transform: translateY(-3px);
      border-color: #d8c8ee;
      box-shadow: 0 10px 24px rgba(86, 49, 143, .12);
    }

    .job-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      transition: transform .2s ease;
    }

    .badges:hover {
      transform: scale(1.03);
    }

    .job-title {
      margin: 0 0 6px;
      font-size: 18px;
      font-weight: 700;
      color: var(--text-dark);
      transition: color .2s ease, transform .2s ease;
    }

    .job-title:hover {
      color: var(--purple-secondary);
      transform: translateX(3px);
    }

    .section-title {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 700;
      color: var(--purple-primary);
      transition: color .2s ease, transform .2s ease;
    }

    .section-title:hover {
      color: var(--purple-secondary);
      transform: translateX(3px);
    }

    .detail-text {
      color: var(--text-dark);
      margin: 8px 0;
      line-height: 1.6;
      transition: color .2s ease;
    }

    .detail-text:hover {
      color: var(--purple-secondary);
    }

    .meta {
      color: var(--text-muted);
      font-size: 13px;
      margin: 0 0 4px;
      line-height: 1.6;
    }

    /* LINKS */

    .osm-link {
      display: inline-block;
      color: var(--purple-primary);
      font-weight: 600;
      text-decoration: none;
      transition:
        color .2s ease,
        transform .2s ease,
        text-decoration-color .2s ease;
    }

    .osm-link:hover {
      color: var(--purple-secondary);
      text-decoration: underline;
      transform: translateX(3px);
    }

    .osm-link:active {
      transform: scale(.96);
    }

    .osm-link:focus-visible {
      outline: 2px solid var(--purple-light);
      outline-offset: 4px;
      border-radius: 3px;
    }

    .map-link-wrapper {
      margin-top: 8px;
    }

    /* PHOTOS */

    .photo {
      display: block;
      width: 100%;
      max-width: 100%;
      border-radius: 14px;
      border: 1px solid var(--border-color);
      margin-top: 12px;
      transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease;
    }

    .photo:hover {
      transform: scale(1.01);
      border-color: var(--purple-light);
      box-shadow: 0 8px 18px rgba(86, 49, 143, .13);
    }

    .preview-photo {
      animation: photo-enter .35s ease both;
    }

    @keyframes photo-enter {
      from {
        opacity: 0;
        transform: translateY(10px) scale(.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .photo-buttons {
      margin: 12px 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .photo-buttons ion-button {
      margin: 0;
    }

    /* GPS */

    .gps-box {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid var(--border-color);
      border-radius: 14px;
      background: var(--lavender);
      transition:
        transform .22s ease,
        box-shadow .22s ease,
        border-color .22s ease;
    }

    .gps-box:hover {
      transform: translateY(-2px);
      border-color: #d8c8ee;
      box-shadow: 0 6px 15px rgba(86, 49, 143, .09);
    }

    .gps-label {
      margin: 0 0 6px;
      font-weight: 600;
      color: var(--purple-primary);
      transition: color .2s ease;
    }

    .gps-box:hover .gps-label {
      color: var(--purple-secondary);
    }

    .gps-text {
      margin: 8px 0;
      color: var(--text-dark);
      line-height: 1.5;
    }

    /* NOTE FIELD */

    .note-list {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      overflow: hidden;
      margin-top: 12px;
      transition:
        transform .22s ease,
        box-shadow .22s ease,
        border-color .22s ease;
    }

    .note-list:hover,
    .note-list:focus-within {
      transform: translateY(-2px);
      border-color: var(--purple-light);
      box-shadow: 0 6px 15px rgba(86, 49, 143, .09);
    }

    .note-list ion-item {
      --background: #ffffff;
      --color: var(--text-dark);
      transition: background .2s ease;
    }

    .note-list ion-item:focus-within {
      --background: #faf8fd;
    }

    .note-list ion-textarea {
      --color: var(--text-dark);
      --placeholder-color: var(--text-muted);
      --highlight-color: var(--purple-secondary);
      transition: transform .2s ease;
    }

    .note-list ion-item:focus-within ion-textarea {
      transform: translateX(3px);
    }

    /* REJECTED CARD */

    .rejected-card {
      background: #fdf7ff;
      border: 1px solid #e3d5f4;
      border-radius: 14px;
      padding: 12px 14px;
      margin-bottom: 12px;
      color: var(--purple-primary);
      transition:
        transform .22s ease,
        box-shadow .22s ease,
        border-color .22s ease;
    }

    .rejected-card:hover {
      transform: translateY(-2px);
      border-color: var(--purple-light);
      box-shadow: 0 6px 14px rgba(86, 49, 143, .09);
    }

    /* EMPTY STATE */

    .empty-card {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px 16px;
      color: var(--text-muted);
      text-align: center;
      transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease;
      animation: card-enter .35s ease both;
    }

    .empty-card:hover {
      transform: translateY(-3px);
      border-color: #d8c8ee;
      box-shadow: 0 9px 20px rgba(86, 49, 143, .10);
    }

    /* BUTTONS */

    .action-btn,
    .action-btn-outline {
      min-height: 46px;
      font-weight: 700;
      text-transform: none;
      letter-spacing: .2px;
      transition:
        transform .2s ease,
        filter .2s ease,
        opacity .2s ease,
        box-shadow .2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .action-btn {
      --background: linear-gradient(135deg, #56318f, #7651b5);
      --background-hover: #7651b5;
      --background-activated: #432474;
      --color: #ffffff;
      --border-radius: 14px;
      --box-shadow: 0 4px 10px rgba(86, 49, 143, .18);
    }

    .action-btn-outline {
      --color: #56318f;
      --border-color: #7651b5;
      --border-radius: 14px;
      --background: #ffffff;
      --background-hover: #ede4fa;
      --background-activated: #e4d8f5;
    }

    .action-btn:hover:not([disabled]),
    .action-btn-outline:hover:not([disabled]) {
      transform: translateY(-3px);
      filter: brightness(1.06);
      --box-shadow: 0 9px 18px rgba(86, 49, 143, .22);
    }

    .action-btn:active:not([disabled]),
    .action-btn-outline:active:not([disabled]) {
      transform: translateY(1px) scale(.97);
      filter: brightness(.95);
      --box-shadow: 0 2px 6px rgba(86, 49, 143, .14);
    }

    ion-button::part(native) {
      transition:
        transform .2s ease,
        box-shadow .2s ease,
        background-color .2s ease;
    }

    ion-button[disabled] {
      opacity: .55;
      cursor: not-allowed;
    }

    ion-button:focus-visible {
      outline: 3px solid rgba(118, 81, 181, .35);
      outline-offset: 3px;
    }

    /* REFRESH BUTTON */

    .refresh-btn {
      --color: var(--purple-primary);
      font-weight: 650;
      transition: transform .2s ease, color .2s ease;
    }

    .refresh-btn:hover:not([disabled]) {
      transform: translateY(-2px);
      --color: var(--purple-secondary);
    }

    .refresh-btn:active:not([disabled]) {
      transform: scale(.94);
    }

    /* ANIMATIONS */

    @keyframes card-enter {
      from {
        opacity: 0;
        transform: translateY(9px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* RESPONSIVE */

    @media (max-width: 650px) {
      .job-head {
        align-items: flex-start;
        flex-direction: column;
      }

      .badges {
        flex-direction: row;
        align-items: center;
        flex-wrap: wrap;
      }

      .job-title {
        font-size: 17px;
      }

      .job-card {
        padding: 14px;
      }

      .action-btn,
      .action-btn-outline {
        min-height: 48px;
      }
    }

    /* TOUCH DEVICES */

    @media (hover: none) {
      .job-card:hover,
      .empty-card:hover,
      .gps-box:hover,
      .note-list:hover,
      .rejected-card:hover,
      .photo:hover {
        transform: none;
      }

      .action-btn:hover:not([disabled]),
      .action-btn-outline:hover:not([disabled]),
      .refresh-btn:hover:not([disabled]) {
        transform: none;
      }

      .action-btn:active:not([disabled]),
      .action-btn-outline:active:not([disabled]) {
        transform: scale(.96);
      }

      .job-card:active {
        border-color: #d8c8ee;
      }
    }

    /* ACCESSIBILITY */

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
export class AssignedJobPage implements OnDestroy {
  private jobService = inject(StaffJobService);
  private feedback = inject(FeedbackService);
  private device = inject(DeviceService);
  private cdr = inject(ChangeDetectorRef);
  private live = inject(LiveUpdateService);
  private watcher: LiveWatcher | null = null;

  @ViewChild('cameraInput') cameraInput?: ElementRef<HTMLInputElement>;
  @ViewChild('galleryInput') galleryInput?: ElementRef<HTMLInputElement>;

  job: StaffJob | null = null;
  queue: StaffQueueItem[] = [];
  paused: StaffQueueItem[] = [];
  pauseReason = '';
  loading = false;
  busy = false;

  afterPhotoRaw: string | null = null;
  afterPhoto: string | null = null;
  previewSrc: string | null = null;
  proofTakenAt: string | null = null;
  note = '';

  gpsState: GpsState = 'idle';
  proofLatitude: number | null = null;
  proofLongitude: number | null = null;

  stamping = false;
  private stampSeq = 0;

  staffGpsState: GpsState = 'idle';
  staffLat: number | null = null;
  staffLng: number | null = null;

  ionViewWillEnter() {
    this.watcher?.stop();
    this.watcher = this.live.watch('job', (silent) => this.load(silent));
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

  async load(silent = false) {
    if (!silent) {
      this.loading = true;
      this.cdr.markForCheck();
    }

    try {
      const view = await this.jobService.loadCurrent();
      const job = view.job;
      const changed = job?.id !== this.job?.id;

      this.queue = view.queue;
      this.paused = view.paused;

      if (changed) {
        this.pauseReason = '';
        this.clearProof();
        this.clearStaffPosition();
      }

      this.job = job;

      if (
        changed &&
        job &&
        job.latitude !== null &&
        (job.status === 'assigned' || job.status === 'in_progress')
      ) {
        void this.updateMyPosition();
      }
    } catch (e: any) {
      if (!silent) {
        await this.feedback.toast(e.message ?? 'Could not load your job.');
      }
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // Start a job from the queue. The server refuses when you already have a working job.
  async startQueued(item: StaffQueueItem) {
    if (this.busy) return;

    this.busy = true;
    this.cdr.markForCheck();

    try {
      await this.jobService.start(item.id);
      await this.feedback.toast('Job started.', 'success');
      await this.load(true);
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not start the job.');
      await this.load(true);
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  // Pause is only offered when a queued job has a strictly higher priority (the server checks it too).
  get canPause(): boolean {
    if (!this.job || this.job.status !== 'in_progress') return false;
    const mine = this.rank(this.job.priority);
    return this.queue.some((q) => this.rank(q.priority) > mine);
  }

  private rank(p: RequestPriority | null): number {
    return { low: 1, medium: 2, high: 3, urgent: 4 }[p ?? 'low'] ?? 0;
  }

  async pauseJob() {
    if (!this.job || this.busy) return;

    this.busy = true;
    this.cdr.markForCheck();

    try {
      await this.jobService.pause(this.job.id, this.pauseReason);
      this.pauseReason = '';
      await this.feedback.toast('Job paused. Start the urgent job from your queue.', 'success');
      await this.load(true);
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not pause the job.');
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  async resumeJob(item: StaffQueueItem) {
    if (this.busy) return;

    this.busy = true;
    this.cdr.markForCheck();

    try {
      await this.jobService.resume(item.id);
      await this.feedback.toast('Job resumed.', 'success');
      await this.load(true);
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not resume the job.');
      await this.load(true);
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  canSendProof(): boolean {
    return !this.busy && !this.stamping && this.gpsState !== 'loading'
      && this.afterPhoto !== null && this.proofLatitude !== null && this.proofLongitude !== null;
  }

  get gpsText(): string {
    switch (this.gpsState) {
      case 'granted':
        return this.proofLatitude !== null && this.proofLongitude !== null
          ? `${this.proofLatitude.toFixed(5)}, ${this.proofLongitude.toFixed(5)}`
          : 'Location not checked yet.';
      case 'loading':
        return 'Getting your location...';
      case 'denied':
        return 'Location permission is off. Turn it on, then tap Try GPS again. Proof needs your location.';
      case 'timeout':
        return 'Location took too long. Tap Try GPS again.';
      case 'unavailable':
        return 'Location is not available here. Proof needs your location.';
      default:
        return 'Take a photo to get the location.';
    }
  }

  get staffGpsText(): string {
    switch (this.staffGpsState) {
      case 'granted':
        return this.staffLat !== null ? 'Your position is on the map.' : 'Position not checked yet.';
      case 'loading':
        return 'Getting your position...';
      case 'denied':
        return 'Location is off. Turn it on to see how far the problem is.';
      case 'timeout':
        return 'Your position took too long. Tap Update my position.';
      case 'unavailable':
        return 'Your position is not available here.';
      default:
        return 'Tap Update my position to see how far the problem is.';
    }
  }

  async updateMyPosition() {
    if (this.staffGpsState === 'loading') return;

    this.staffGpsState = 'loading';
    this.cdr.markForCheck();

    const result = await this.device.getPosition();
    this.staffGpsState = result.status;

    if (result.status === 'granted') {
      this.staffLat = result.latitude ?? null;
      this.staffLng = result.longitude ?? null;
    } else {
      this.staffLat = null;
      this.staffLng = null;
    }

    this.cdr.markForCheck();
  }

  async fixLocation() {
    if (this.gpsState === 'loading') return;

    this.gpsState = 'loading';
    this.cdr.markForCheck();

    const result = await this.device.getPosition();
    this.gpsState = result.status;

    if (result.status === 'granted') {
      this.proofLatitude = result.latitude ?? null;
      this.proofLongitude = result.longitude ?? null;
    } else {
      this.proofLatitude = null;
      this.proofLongitude = null;
    }

    this.cdr.markForCheck();

    await this.applyStamp();

    if (result.status !== 'granted') {
      await this.feedback.toast(this.gpsText);
    }
  }

  private async applyStamp() {
    const raw = this.afterPhotoRaw;
    if (!raw) return;

    const seq = ++this.stampSeq;
    this.stamping = true;
    this.cdr.markForCheck();

    try {
      const stamped = await stampPhoto(
        raw,
        this.proofTakenAt,
        this.proofLatitude,
        this.proofLongitude
      );

      if (seq !== this.stampSeq) return;

      this.afterPhoto = stamped;
      this.previewSrc = 'data:image/jpeg;base64,' + stamped;
    } catch (e: any) {
      if (seq !== this.stampSeq) return;

      this.afterPhotoRaw = null;
      this.afterPhoto = null;
      this.previewSrc = null;
      this.proofTakenAt = null;

      await this.feedback.toast(
        e.message ?? 'Could not add the stamp. Please choose the photo again.'
      );
    } finally {
      if (seq === this.stampSeq) {
        this.stamping = false;
      }

      this.cdr.markForCheck();
    }
  }

  formatCoords(lat: number | null, lng: number | null): string {
    if (lat === null || lng === null) return 'Not recorded';
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  openMapLink(lat: number, lng: number): string {
    return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
  }

  async openPhoto(source: PhotoSource) {
    if (this.busy) return;

    if (this.device.isNative()) {
      await this.pickNative(source);
      return;
    }

    const input = source === 'camera'
      ? this.cameraInput?.nativeElement
      : this.galleryInput?.nativeElement;

    input?.click();
  }

  private async pickNative(source: PhotoSource) {
    this.busy = true;
    this.cdr.markForCheck();

    try {
      const pick = await this.device.pickPhotoNative(source);
      if (!pick) return;

      this.afterPhotoRaw = await resizeDataUrlToBase64(
        pick.dataUrl,
        1280,
        WORKING_QUALITY
      );

      this.proofTakenAt = pick.takenAt;
      await this.applyStamp();
    } catch (e: any) {
      await this.feedback.toast(
        e.message ?? 'Could not read that photo. Please try again.'
      );
      return;
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }

    if (this.afterPhotoRaw) {
      void this.fixLocation();
    }
  }

  async onPhotoPicked(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    this.busy = true;
    this.cdr.markForCheck();

    try {
      this.afterPhotoRaw = await resizeImageToBase64(
        file,
        1280,
        WORKING_QUALITY
      );

      this.proofTakenAt = new Date().toISOString();
      await this.applyStamp();
    } catch (e: any) {
      await this.feedback.toast('Could not read that photo. Please try again.');
      return;
    } finally {
      input.value = '';
      this.busy = false;
      this.cdr.markForCheck();
    }

    if (this.afterPhotoRaw) {
      void this.fixLocation();
    }
  }

  async submitProof() {
    if (!this.job || !this.canSendProof()) return;

    this.busy = true;
    this.cdr.markForCheck();

    try {
      this.job = await this.jobService.submitProof(
        this.job.id,
        this.afterPhoto,
        this.note,
        {
          latitude: this.proofLatitude,
          longitude: this.proofLongitude,
          takenAt: this.proofTakenAt,
        }
      );

      this.clearProof();
      await this.feedback.toast('Proof sent to the admin.', 'success');
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not send the proof.');
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  private clearProof() {
    this.stampSeq++;
    this.stamping = false;
    this.afterPhotoRaw = null;
    this.afterPhoto = null;
    this.previewSrc = null;
    this.proofTakenAt = null;
    this.note = '';
    this.gpsState = 'idle';
    this.proofLatitude = null;
    this.proofLongitude = null;
  }

  private clearStaffPosition() {
    this.staffGpsState = 'idle';
    this.staffLat = null;
    this.staffLng = null;
  }

  statusLabel(status: RequestStatus): string {
    return STATUS_LABELS[status];
  }

  statusColor(status: RequestStatus): string {
    return STATUS_COLORS[status];
  }
}
