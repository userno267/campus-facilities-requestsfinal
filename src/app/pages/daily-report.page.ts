import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonToolbar,
} from '@ionic/angular';
import { DailyReportService } from '../services/daily-report.service';
import { FeedbackService } from '../services/feedback.service';
import { DailyReport } from '../models/daily-report.model';
import { PriorityBadgeComponent } from '../components/priority-badge.component';
import {
  buildDailyReportPdf, dailyReportFileName, formatDuration, formatPh, formatPhTime,
} from '../utils/daily-report-pdf.util';

// How often the preview refreshes while the report is for TODAY and the tab is visible.
// A record for a past day never changes, so it is loaded once.
const TODAY_REFRESH_MS = 30000;

// Today's date in Philippine time as YYYY-MM-DD, whatever the device's own time zone is.
function todayPh(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

// Admin "Report" tab. A RECORD ONLY: no rankings, targets, averages or scores.
// The preview and the PDF are built from the same data, so they agree.
@Component({
  selector: 'app-daily-report',
  standalone: true,
  imports: [
    DatePipe, FormsModule,
    IonButton, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonToolbar,
    PriorityBadgeComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="top-toolbar">
        <div class="brand" slot="start">
          <div class="brand-icon">CR</div>
          <div class="brand-info">
            <strong>Campus Reports</strong>
            <span>Admin · Daily Report</span>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="dashboard-content">

      <main class="dashboard-container">

        <!-- Welcome Section -->
        <section class="welcome-section">
          <div class="welcome-text">
            <span class="eyebrow">ADMIN · DAILY REPORT</span>

            <h1>
              Daily <span>Report</span>
            </h1>

            <p>
              A plain record of what was reported, completed and still open.
              No rankings, targets or scores.
            </p>

            <div class="welcome-role">
              <span class="status-dot"></span>
              {{ isToday ? 'Today' : 'Past date' }} · Philippine time
            </div>
          </div>

          <div class="welcome-illustration">
            <div class="illustration-circle">
              <span class="illustration-icon">✦</span>
              <div class="illustration-shield">▤</div>
            </div>
          </div>
        </section>

        <!-- Date + download -->
        <section class="section-block">
          <div class="control-card">
            <ion-item lines="none" class="date-item">
              <ion-label position="stacked">Date (Philippine time)</ion-label>
              <ion-input type="date" [ngModel]="date" (ionChange)="onDateChange($event.detail.value)"></ion-input>
            </ion-item>
            <div class="row-actions">
              <ion-button fill="outline" size="small" (click)="useToday()" [disabled]="loading">Today</ion-button>
              <ion-button size="small" (click)="downloadPdf()" [disabled]="loading || !report">Download PDF</ion-button>
            </div>
            @if (report) {
              <p class="meta">
                Generated {{ report.generated_at | date: 'medium' }} by {{ report.generated_by.name }}
                @if (isToday) { · refreshes every 30 seconds }
              </p>
            }
          </div>
        </section>

        @if (loading && !report) {
          <div class="empty-card">Loading the report…</div>
        }

        @if (report) {

          <!-- Summary -->
          <section class="section-block">
            <div class="section-heading">
              <div>
                <span class="eyebrow">AT A GLANCE</span>
                <h2>Summary</h2>
              </div>
            </div>
            <div class="summary-grid">
              <div class="stat"><span class="stat-value">{{ report.summary.completed }}</span><span class="meta">Completed</span></div>
              <div class="stat"><span class="stat-value">{{ report.summary.still_open }}</span><span class="meta">Still open</span></div>
              <div class="stat"><span class="stat-value">{{ report.summary.new_reports }}</span><span class="meta">New reports</span></div>
              <div class="stat"><span class="stat-value">{{ report.summary.cancelled }}</span><span class="meta">Cancelled</span></div>
            </div>
          </section>

          <!-- Who did what -->
          <section class="section-block">
            <div class="section-heading">
              <div>
                <span class="eyebrow">STAFF</span>
                <h2>Who did what</h2>
              </div>
            </div>
            <div class="card">
              @if (report.who_did_what.length === 0) {
                <p class="meta">No jobs completed on this date.</p>
              } @else {
                <ion-list class="plain-list">
                  @for (row of report.who_did_what; track row.request_id) {
                    <ion-item lines="inset">
                      <ion-label class="ion-text-wrap">
                        <h2>{{ row.staff_name ?? 'No staff recorded' }}</h2>
                        <p>Request #{{ row.request_id }} · {{ row.location_name }}</p>
                      </ion-label>
                      <span slot="end" class="meta">{{ formatTime(row.completed_at) }}</span>
                    </ion-item>
                  }
                </ion-list>
              }
            </div>
          </section>

          <!-- Completed jobs -->
          @if (report.completed.length > 0) {
            <section class="section-block">
              <div class="section-heading">
                <div>
                  <span class="eyebrow">CLOSED</span>
                  <h2>Completed jobs</h2>
                </div>
              </div>

              @for (job of report.completed; track job.id) {
                <div class="card job-card">
                  <h3 class="job-title">#{{ job.id }} · {{ job.title }}</h3>
                  <p class="meta">{{ job.category_name }} · {{ job.location_name }} · {{ job.department_name ?? 'No department' }}</p>
                  @if (job.priority) {
                    <p class="meta">Priority: <app-priority-badge [priority]="job.priority" /></p>
                  }
                  <p class="detail-text">{{ job.description }}</p>

                  <dl class="facts">
                    <dt>Reported by</dt><dd>{{ job.reporter_name ?? '-' }}</dd>
                    <dt>Done by</dt><dd>{{ job.staff_name ?? '-' }}{{ job.staff_employee_id ? ' (ID ' + job.staff_employee_id + ')' : '' }}</dd>
                    <dt>Approved by</dt><dd>{{ job.approved_by_name ?? '-' }}</dd>
                    <dt>Reported</dt><dd>{{ formatFull(job.reported_at) }}</dd>
                    <dt>Assigned</dt><dd>{{ formatFull(job.assigned_at) }}</dd>
                    <dt>Started</dt><dd>{{ formatFull(job.started_at) }}</dd>
                    <dt>Proof sent</dt><dd>{{ formatFull(job.proof_sent_at) }}</dd>
                    <dt>Completed</dt><dd>{{ formatFull(job.completed_at) }}</dd>
                    <dt>Time to complete</dt><dd>{{ duration(job.reported_at, job.completed_at) }}</dd>
                    @if (job.send_back_count > 0) {
                      <dt>Sent back</dt><dd>{{ job.send_back_count }} time{{ job.send_back_count === 1 ? '' : 's' }}</dd>
                    }
                    @if (job.latitude !== null && job.longitude !== null) {
                      <dt>Coordinates</dt><dd>{{ job.latitude.toFixed(5) }}, {{ job.longitude.toFixed(5) }}</dd>
                    }
                  </dl>

                  <p class="block-label">Work done</p>
                  <p class="detail-text">{{ job.proof_note ?? 'No note written.' }}</p>
                  @if (job.admin_remark) {
                    <p class="block-label">Admin remark</p>
                    <p class="detail-text">{{ job.admin_remark }}</p>
                  }
                  <p class="block-label">Rating</p>
                  @if (job.rating !== null) {
                    <p class="detail-text">{{ job.rating }} / 5 · by {{ job.reviewer_name ?? 'faculty' }}</p>
                    @if (job.review_comment) {
                      <p class="detail-text">“{{ job.review_comment }}”</p>
                    }
                  } @else {
                    <p class="detail-text">Not rated yet.</p>
                  }
                </div>
              }
            </section>
          }

          <!-- Still open -->
          <section class="section-block">
            <div class="section-heading">
              <div>
                <span class="eyebrow">IN PROGRESS</span>
                <h2>Still open</h2>
              </div>
            </div>
            @if (report.still_open.length === 0) {
              <div class="empty-card">No open jobs with activity on this date.</div>
            } @else {
              <div class="card">
                <ion-list class="plain-list">
                  @for (job of report.still_open; track job.id) {
                    <ion-item lines="inset">
                      <ion-label class="ion-text-wrap">
                        <h2>#{{ job.id }} · {{ job.title }}</h2>
                        <p>{{ statusText(job.status) }} · {{ job.staff_name ?? 'No staff yet' }}</p>
                        <p class="meta">Reported {{ formatFull(job.reported_at) }} · {{ job.location_name }}</p>
                      </ion-label>
                    </ion-item>
                  }
                </ion-list>
              </div>
            }
          </section>
        }

        <!-- Footer -->
        <footer class="dashboard-footer">
          <span>Campus Reports</span>
          <span>Admin · Daily Report</span>
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

      /* Keep the page light with dark purple text, whatever the phone's dark mode setting is. */
      --ion-background-color: #faf8fd;
      --ion-background-color-rgb: 250, 248, 253;
      --ion-text-color: #302344;
      --ion-text-color-rgb: 48, 35, 68;
      --ion-item-background: #ffffff;
      --ion-item-color: #302344;
      --ion-toolbar-background: #ffffff;
      --ion-toolbar-color: #302344;
      --ion-card-background: #ffffff;
      --ion-card-color: #302344;
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

    .control-card,
    .card {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 14px;
      color: var(--text-dark);
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.07);
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .control-card:hover,
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(86, 49, 143, 0.12);
    }

    .job-card {
      margin-bottom: 18px;
    }

    .empty-card {
      background: var(--lavender);
      border: 1px dashed var(--purple-light);
      border-radius: 16px;
      padding: 18px;
      color: var(--purple-primary);
      text-align: center;
      font-weight: 600;
      margin-bottom: 14px;
    }

    .job-title {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 700;
      color: var(--purple-primary);
    }

    .meta {
      color: var(--text-muted);
      font-size: 13px;
      margin: 4px 0;
    }

    .detail-text {
      color: var(--text-dark);
      font-size: 14px;
      margin: 4px 0 8px;
      line-height: 1.5;
      white-space: pre-wrap;
    }

    .block-label {
      margin: 12px 0 2px;
      color: var(--purple-secondary);
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    /* =====================================
       DATE + BUTTONS
    ===================================== */

    .date-item {
      --background: transparent;
      --color: var(--text-dark);
      --highlight-color-focused: var(--purple-secondary);
      padding: 0;
    }

    .date-item ion-label,
    .date-item ion-input {
      color: var(--text-dark);
    }

    .row-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
      flex-wrap: wrap;
    }

    ion-button {
      --color: var(--purple-primary);
      --border-color: var(--purple-primary);
      --border-radius: 12px;
    }

    ion-button:not([fill='outline']) {
      --background: var(--purple-primary);
      --color: #ffffff;
    }

    /* =====================================
       SUMMARY
    ===================================== */

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .stat {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: var(--text-dark);
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.07);
      transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
    }

    .stat:hover {
      transform: translateY(-4px);
      border-color: var(--purple-light);
      box-shadow: 0 8px 20px rgba(86,49,143,.11);
    }

    .stat-value {
      font-size: 26px;
      font-weight: 800;
      color: var(--purple-primary);
    }

    /* =====================================
       LISTS
    ===================================== */

    .plain-list {
      background: transparent;
      padding: 0;
    }

    .plain-list ion-item {
      --background: var(--card-background);
      --color: var(--text-dark);
      --border-color: var(--border-color);
    }

    .plain-list ion-item h2 {
      font-weight: 700;
      margin: 0 0 4px;
      color: var(--purple-primary);
    }

    .plain-list ion-item p {
      color: var(--text-dark);
    }

    .facts {
      display: grid;
      grid-template-columns: 130px 1fr;
      gap: 4px 10px;
      font-size: 13px;
      margin: 8px 0 0;
      color: var(--text-dark);
    }

    .facts dt {
      color: var(--purple-secondary);
      font-weight: 600;
    }

    .facts dd {
      margin: 0;
      color: var(--text-dark);
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

      .summary-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .facts {
        grid-template-columns: 110px 1fr;
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
      .card:hover,
      .stat:hover {
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
export class DailyReportPage implements OnInit, OnDestroy {
  private reportService = inject(DailyReportService);
  private feedback = inject(FeedbackService);
  private cdr = inject(ChangeDetectorRef);

  // YYYY-MM-DD in Philippine time. Starts as today.
  date = todayPh();
  report: DailyReport | null = null;
  loading = false;

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  // Exposed to the template: the shared formatters, so the preview and the PDF match.
  formatTime = formatPhTime;
  formatFull = formatPh;
  duration = formatDuration;

  get isToday(): boolean {
    return this.date === todayPh();
  }

  ngOnInit(): void {
    void this.load(false);
    this.startTodayRefresh();
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  ngOnDestroy(): void {
    this.stopTodayRefresh();
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  // Ionic keeps a tab alive, so reload when the admin comes back to it.
  ionViewWillEnter(): void {
    void this.load(true);
  }

  onDateChange(value: string | null | undefined): void {
    if (!value || value === this.date) return;
    this.date = value;
    this.startTodayRefresh();
    void this.load(false);
  }

  useToday(): void {
    this.onDateChange(todayPh());
  }

  // silent = true means refresh in the background, without the spinner text or an error toast.
  async load(silent: boolean): Promise<void> {
    if (this.loading) return;
    this.loading = !silent;
    try {
      this.report = await this.reportService.load(this.date);
    } catch (e: any) {
      if (!silent) {
        await this.feedback.toast(e?.message ?? 'Could not load the report.', 'danger');
      }
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // Only today's report can change, so only today refreshes on a timer.
  private startTodayRefresh(): void {
    this.stopTodayRefresh();
    if (this.isToday) {
      this.refreshTimer = setInterval(() => {
        if (!document.hidden) void this.load(true);
      }, TODAY_REFRESH_MS);
    }
  }

  private stopTodayRefresh(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // Coming back to the app: refresh at once.
  private onVisibility = (): void => {
    if (!document.hidden && this.isToday) void this.load(true);
  };

  statusText(status: string): string {
    const labels: Record<string, string> = {
      assigned: 'Assigned',
      in_progress: 'In progress',
      awaiting_proof: 'Awaiting proof',
      paused: 'Paused',
    };
    return labels[status] ?? status;
  }

  // Builds the PDF from the same report on screen and saves it.
  // Browser: a normal download. Phone: the download goes to the phone's download folder.
  // Native file saving (Feature 8) is not built yet, so this uses the browser path only.
  downloadPdf(): void {
    if (!this.report) return;
    try {
      const blob = buildDailyReportPdf(this.report);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = dailyReportFileName(this.report);
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Give the browser a moment to start the download before freeing the file.
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      void this.feedback.toast('Could not build the PDF. Please try again.', 'danger');
    }
  }
}