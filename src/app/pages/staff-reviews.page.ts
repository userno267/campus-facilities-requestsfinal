
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar,
} from '@ionic/angular';
import { StaffReview } from '../models/request.model';
import { StaffJobService } from '../services/staff-job.service';
import { FeedbackService } from '../services/feedback.service';
import { LiveUpdateService, LiveWatcher } from '../services/live-update.service';

// "Reviews" tab for staff (Step 7). Read-only: the ratings faculty left about this
// staff member's finished jobs, newest first. Reviews are final, so there is nothing to edit.
@Component({
  selector: 'app-staff-reviews',
  standalone: true,
  imports: [DatePipe, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonTitle, IonToolbar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">
        <div class="brand-header" slot="start">
          <img
            src="assets/campus-reports-logo.png"
            alt="Campus Reports logo"
            class="brand-logo-img" />
        </div>
        <ion-title>My Reviews</ion-title>
        <ion-buttons slot="end">
          <ion-button
            class="refresh-btn"
            (click)="load()"
            [disabled]="loading"
          >
            Refresh
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">
      @if (count > 0) {
        <div class="summary-card">
          <div class="rating-icon">★</div>
          <p class="summary-main">{{ average }} / 5</p>
          <p class="meta">
            Average of {{ count }} {{ count === 1 ? 'review' : 'reviews' }}
          </p>
        </div>

        <ion-list class="card-list">
          @for (r of reviews; track r.id) {
            <ion-item lines="full" class="review-item">
              <ion-label class="ion-text-wrap">
                <h2>{{ r.title }} · {{ r.rating }}/5</h2>
                <p class="review-location">{{ r.location_name }}</p>

                @if (r.comment) {
                  <p class="comment">{{ r.comment }}</p>
                } @else {
                  <p class="meta">No comment.</p>
                }

                <p class="meta">
                  {{ r.reviewer_name }} · {{ r.created_at | date: 'mediumDate' }}
                </p>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      } @else if (!loading) {
        <div class="empty-card">
          <div class="empty-icon">★</div>
          <h2>No reviews yet</h2>
          <p>
            Reviews will appear here after faculty rate your finished jobs.
          </p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .brand-header { display: flex; align-items: center; gap: 12px; }
    .brand-logo-img { height: 42px; width: auto; max-width: 160px; object-fit: contain; }
    @media (max-width: 600px) { .brand-logo-img { height: 34px; } }

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

    /* SUMMARY CARD */

    .summary-card {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #ffffff, #faf8fd);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 20px 16px;
      margin-bottom: 16px;
      text-align: center;
      box-shadow: 0 4px 14px rgba(86, 49, 143, .06);
      transition:
        transform .25s ease,
        box-shadow .25s ease,
        border-color .25s ease;
      animation: card-enter .35s ease both;
    }

    .summary-card:hover {
      transform: translateY(-4px);
      border-color: #d8c8ee;
      box-shadow: 0 10px 24px rgba(86, 49, 143, .12);
    }

    .rating-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 46px;
      height: 46px;
      margin-bottom: 8px;
      border-radius: 14px;
      background: var(--lavender);
      color: var(--purple-secondary);
      font-size: 27px;
      transition: transform .25s ease, background .25s ease;
    }

    .summary-card:hover .rating-icon {
      transform: rotate(-8deg) scale(1.12);
      background: #e4d8f5;
    }

    .summary-main {
      margin: 0 0 4px;
      font-size: 30px;
      font-weight: 800;
      color: var(--purple-primary);
      transition: transform .2s ease, color .2s ease;
    }

    .summary-card:hover .summary-main {
      transform: scale(1.04);
      color: var(--purple-secondary);
    }

    /* REVIEW LIST */

    .card-list {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
      padding: 0;
      box-shadow: 0 4px 14px rgba(86, 49, 143, .04);
      animation: card-enter .4s ease both;
    }

    .card-list ion-item {
      --background: #ffffff;
      --border-color: #eee8f5;
      --color: var(--text-dark);
      --padding-start: 16px;
      --padding-end: 16px;
      --inner-padding-end: 0;

      transition:
        transform .2s ease,
        --background .2s ease;
    }

    .card-list ion-item:hover {
      --background: #faf8fd;
    }

    .card-list ion-item::part(native) {
      transition: background-color .2s ease;
    }

    .card-list ion-item h2 {
      margin: 0 0 6px;
      font-size: 16px;
      font-weight: 700;
      color: var(--purple-primary);
      transition: color .2s ease, transform .2s ease;
    }

    .card-list ion-item:hover h2 {
      color: var(--purple-secondary);
      transform: translateX(3px);
    }

    .review-location {
      color: var(--text-muted);
      font-size: 13px;
      margin: 4px 0;
    }

    .comment {
      color: var(--text-dark);
      font-size: 14px;
      line-height: 1.6;
      margin: 8px 0;
      padding: 10px 12px;
      border-left: 3px solid var(--purple-light);
      border-radius: 0 8px 8px 0;
      background: #faf8fd;
      transition:
        background .2s ease,
        border-color .2s ease,
        transform .2s ease;
    }

    .review-item:hover .comment {
      background: var(--lavender);
      border-color: var(--purple-secondary);
      transform: translateX(2px);
    }

    .meta {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.5;
    }

    /* EMPTY STATE */

    .empty-card {
      background: #ffffff;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 28px 18px;
      color: var(--text-muted);
      text-align: center;
      box-shadow: 0 4px 14px rgba(86, 49, 143, .05);
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

    .empty-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 54px;
      margin-bottom: 10px;
      border-radius: 16px;
      background: var(--lavender);
      color: var(--purple-secondary);
      font-size: 30px;
      transition: transform .25s ease;
    }

    .empty-card:hover .empty-icon {
      transform: rotate(-10deg) scale(1.1);
    }

    .empty-card h2 {
      margin: 0 0 8px;
      color: var(--purple-primary);
      font-size: 18px;
      font-weight: 700;
    }

    .empty-card p {
      margin: 0;
      line-height: 1.6;
      font-size: 14px;
    }

    /* REFRESH BUTTON */

    .refresh-btn {
      --color: var(--purple-primary);
      font-weight: 700;
      min-height: 44px;
      transition: transform .2s ease, color .2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    .refresh-btn:hover:not([disabled]) {
      transform: translateY(-2px);
      --color: var(--purple-secondary);
    }

    .refresh-btn:active:not([disabled]) {
      transform: translateY(1px) scale(.94);
    }

    ion-button::part(native) {
      transition:
        transform .2s ease,
        box-shadow .2s ease,
        background-color .2s ease;
    }

    ion-button:focus-visible {
      outline: 3px solid rgba(118, 81, 181, .35);
      outline-offset: 3px;
    }

    ion-button[disabled] {
      opacity: .55;
      cursor: not-allowed;
    }

    /* ANIMATIONS */

    @keyframes card-enter {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* RESPONSIVE */

    @media (max-width: 650px) {
      .summary-card {
        padding: 18px 14px;
      }

      .summary-main {
        font-size: 27px;
      }

      .card-list ion-item {
        --padding-start: 12px;
        --padding-end: 12px;
      }

      .card-list ion-item h2 {
        font-size: 15px;
      }

      .empty-card {
        padding: 24px 14px;
      }
    }

    /* TOUCH DEVICES */

    @media (hover: none) {
      .summary-card:hover,
      .empty-card:hover {
        transform: none;
      }

      .refresh-btn:hover:not([disabled]) {
        transform: none;
      }

      .summary-card:active,
      .empty-card:active {
        transform: scale(.99);
      }

      .refresh-btn:active:not([disabled]) {
        transform: scale(.94);
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
export class StaffReviewsPage implements OnDestroy {
  private staffService = inject(StaffJobService);
  private feedback = inject(FeedbackService);
  private cdr = inject(ChangeDetectorRef);
  private live = inject(LiveUpdateService);
  private watcher: LiveWatcher | null = null;

  reviews: StaffReview[] = [];
  count = 0;
  average: number | null = null;
  loading = false;

  // Ionic calls this every time the tab is shown. The reviews load now, and again by itself
  // whenever a new rating arrives, so nothing needs a manual refresh.
  ionViewWillEnter() {
    this.watcher?.stop();
    this.watcher = this.live.watch('reviews', (silent) => this.load(silent));
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
    if (!silent) {
      this.loading = true;
      this.cdr.markForCheck();
    }

    try {
      const result = await this.staffService.loadReviews();
      this.reviews = result.reviews;
      this.count = result.summary.count;
      this.average = result.summary.average;
    } catch (e: any) {
      if (!silent) {
        await this.feedback.toast(e.message ?? 'Could not load your reviews.');
      }
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }
}
