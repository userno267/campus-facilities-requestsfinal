
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import {
  RequestStatus,
  RequestSummary,
} from '../models/request.model';

import { RequestService } from '../services/request.service';
import { FeedbackService } from '../services/feedback.service';
import {
  LiveUpdateService,
  LiveWatcher,
} from '../services/live-update.service';

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

const RATING_CHOICES = [
  { value: 5, label: '5 - Excellent' },
  { value: 4, label: '4 - Good' },
  { value: 3, label: '3 - Okay' },
  { value: 2, label: '2 - Poor' },
  { value: 1, label: '1 - Very poor' },
];

@Component({
  selector: 'app-my-reports',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonTitle,
    IonToolbar,
    PriorityBadgeComponent,
  ],
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
        <ion-title>My Reports</ion-title>

        <ion-buttons slot="end">
          <ion-button
            class="refresh-btn"
            (click)="load()"
            [disabled]="loading">

            {{ loading ? 'Refreshing...' : 'Refresh' }}

          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">

      <div class="page-heading">
        <span class="eyebrow">FACULTY PORTAL</span>
        <h1>My Reports</h1>
        <p>Track your submitted requests and monitor their progress.</p>
      </div>

      <!-- SUMMARY CARD -->
      <div class="summary-card">
        <div class="summary-icon">📋</div>

        <div class="summary-info">
          <span class="summary-label">TOTAL REQUESTS</span>
          <h2>{{ requests.length }}</h2>
          <p>Your submitted reports</p>
        </div>
      </div>

      @if (requests.length > 0) {

        <div class="section-heading">
          <h2>Your Requests</h2>

          <span>
            {{ requests.length }}
            {{ requests.length === 1 ? 'report' : 'reports' }}
          </span>
        </div>

        @for (r of requests; track r.id) {

          <div class="request-card">

            <!-- CLICKABLE REPORT DETAILS -->
            <ion-item
              lines="none"
              class="request-row"
              button
              detail="true"
              (click)="openDetails(r.id)">

              <ion-label class="ion-text-wrap">
                <h2>{{ r.title }}</h2>

                <p class="request-location">
                  {{ r.category_name }} · {{ r.location_name }}
                </p>

                <p class="meta">
                  Reported {{ r.created_at | date: 'mediumDate' }}
                </p>

                @if (r.staff_name) {
                  <p class="meta staff-name">
                    Handled by {{ r.staff_name }}
                  </p>
                }
              </ion-label>

              <div slot="end" class="badges">
                <app-priority-badge [priority]="r.priority" />

                <ion-badge [color]="statusColor(r.status)">
                  {{ statusLabel(r.status) }}
                </ion-badge>
              </div>

            </ion-item>

            <!-- COMPLETED REPORT -->
            @if (r.status === 'completed') {

              @if (r.has_review) {

                <div class="rated-section">
                  <span class="star-icon">⭐</span>
                  <p>Rated {{ r.review_rating }}/5</p>
                  <span class="rated-label">
                    Thank you for your feedback!
                  </span>
                </div>

              } @else if (ratingFor !== r.id) {

                <!-- RATE BUTTON -->
                <div class="card-actions">
                  <ion-button
                    expand="block"
                    size="small"
                    class="action-btn"
                    (click)="openRating(r.id)">

                    ⭐ Rate the Work

                  </ion-button>
                </div>

              } @else {

                <!-- RATING FORM -->
                <div class="rating-form">

                  <div class="rating-heading">
                    <h3>Rate the Completed Work</h3>
                    <p>Share your experience with this request.</p>
                  </div>

                  <ion-item lines="none" class="rating-item">
                    <ion-select
                      label="Your Rating"
                      labelPlacement="stacked"
                      interface="popover"
                      placeholder="Choose 1 to 5"
                      [(ngModel)]="rating"
                      [disabled]="saving">

                      @for (c of ratingChoices; track c.value) {
                        <ion-select-option [value]="c.value">
                          {{ c.label }}
                        </ion-select-option>
                      }

                    </ion-select>
                  </ion-item>

                  <ion-item lines="none" class="rating-item">
                    <ion-textarea
                      label="Comment (optional)"
                      labelPlacement="stacked"
                      [autoGrow]="true"
                      maxlength="300"
                      placeholder="How was the work?"
                      [(ngModel)]="comment"
                      [disabled]="saving">
                    </ion-textarea>
                  </ion-item>

                  <p class="meta note">
                    A rating is final. You cannot change it later.
                  </p>

                  <div class="card-actions form-actions">

                    <ion-button
                      expand="block"
                      size="small"
                      fill="outline"
                      class="cancel-btn"
                      [disabled]="saving"
                      (click)="closeRating()">

                      Cancel

                    </ion-button>

                    <ion-button
                      expand="block"
                      size="small"
                      class="action-btn"
                      [disabled]="saving || rating === null"
                      (click)="submitRating(r.id)">

                      {{ saving ? 'Saving...' : 'Submit Rating' }}

                    </ion-button>

                  </div>

                </div>
              }

            }

          </div>

        }

      } @else if (!loading) {

        <!-- EMPTY STATE -->
        <div class="empty-card">
          <div class="empty-icon">📄</div>
          <h3>No Reports Yet</h3>
          <p>
            You haven't submitted any requests.
            Use the New Report tab to report a problem.
          </p>
        </div>

      } @else {

        <!-- LOADING STATE -->
        <div class="loading-card">
          <div class="loading-icon">⏳</div>
          <p>Loading your reports...</p>
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

      display: block;
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

      transition:
        transform 0.2s ease,
        background-color 0.2s ease,
        box-shadow 0.2s ease;
    }

    .refresh-btn:hover:not([disabled]) {
      transform: translateY(-3px);
      --background: var(--lavender);
      --box-shadow: 0 4px 12px rgba(86, 49, 143, 0.13);
    }

    .refresh-btn:active:not([disabled]) {
      transform: scale(0.94);
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
      transition: transform 0.2s ease;
    }

    .page-heading h1 {
      color: var(--text-dark);
      font-size: 25px;
      font-weight: 800;
      margin: 0 0 6px;
      transition: color 0.2s ease, transform 0.2s ease;
    }

    .page-heading h1:hover {
      color: var(--purple-secondary);
      transform: translateX(3px);
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
      background: linear-gradient(
        135deg,
        #56318f,
        #7651b5,
        #8c6ac5
      );

      box-shadow: 0 7px 20px rgba(86, 49, 143, 0.18);

      transition:
        transform 0.25s ease,
        box-shadow 0.25s ease;

      animation: slide-up 0.45s ease both;
    }

    .summary-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 25px rgba(86, 49, 143, 0.24);
    }

    .summary-card:active {
      transform: scale(0.99);
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

      transition: transform 0.25s ease;
    }

    .summary-card:hover .summary-icon {
      transform: rotate(-8deg) scale(1.08);
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
      transition: transform 0.2s ease, color 0.2s ease;
    }

    .section-heading h2:hover {
      color: var(--purple-secondary);
      transform: translateX(3px);
    }

    .section-heading span {
      color: var(--purple-secondary);
      font-size: 12px;
      font-weight: 700;
      transition: transform 0.2s ease;
    }

    .section-heading span:hover {
      transform: scale(1.06);
    }

    /* REQUEST CARD */

    .request-card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 17px;
      margin-bottom: 13px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(65, 39, 100, 0.05);

      transition:
        transform 0.25s ease,
        border-color 0.25s ease,
        box-shadow 0.25s ease;

      animation: slide-up 0.4s ease both;
    }

    .request-card:hover {
      transform: translateY(-3px);
      border-color: #d9c9ee;
      box-shadow: 0 9px 22px rgba(86, 49, 143, 0.11);
    }

    .request-card:active {
      transform: scale(0.995);
    }

    /* CLICKABLE REQUEST ROW */

    .request-row {
      --background: #ffffff;
      --color: var(--text-dark);
      --padding-start: 15px;
      --padding-end: 12px;
      --inner-padding-end: 0;
      --min-height: 105px;

      width: 100%;
      cursor: pointer;

      transition:
        transform 0.2s ease,
        background-color 0.2s ease,
        box-shadow 0.2s ease;
    }

    .request-row:hover {
      --background: #faf7fe;
      transform: translateX(3px);
    }

    .request-row:active {
      transform: scale(0.985);
    }

    .request-row h2 {
      color: var(--text-dark);
      font-size: 15px;
      font-weight: 800;
      line-height: 1.4;
      margin: 0 0 6px;
      overflow-wrap: anywhere;
      transition: color 0.2s ease;
    }

    .request-row:hover h2 {
      color: var(--purple-secondary);
    }

    .request-location {
      color: var(--purple-secondary);
      font-size: 12px;
      margin: 0 0 5px;
      overflow-wrap: anywhere;
    }

    .meta {
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
      margin: 4px 0;
    }

    .staff-name {
      color: var(--purple-secondary);
    }

    /* STATUS BADGES */

    .badges {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      margin-left: 8px;
      flex-shrink: 0;
    }

    .badges ion-badge {
      border-radius: 7px;
      padding: 6px 8px;
      font-size: 10px;
      font-weight: 700;
      white-space: normal;
      text-align: center;

      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease;
    }

    .badges ion-badge:hover {
      transform: translateY(-2px) scale(1.04);
      box-shadow: 0 3px 8px rgba(48, 35, 68, 0.12);
    }

    /* BUTTON CONTAINERS */

    .card-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;

      padding: 10px 15px 14px;
      border-top: 1px solid #f0ebf6;
    }

    /* MAIN ACTION BUTTON */

    .action-btn {
      --background: var(--purple-primary);
      --background-hover: var(--purple-secondary);
      --background-activated: #432570;
      --background-focused: var(--purple-secondary);
      --color: #ffffff;
      --border-radius: 10px;
      --padding-start: 16px;
      --padding-end: 16px;

      min-width: 120px;
      min-height: 44px;
      height: auto;

      font-size: 12px;
      font-weight: 700;
      text-transform: none;
      white-space: normal;

      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        filter 0.2s ease;
    }

    .action-btn:hover:not([disabled]) {
      transform: translateY(-3px);
      filter: brightness(1.08);
      --box-shadow: 0 6px 14px rgba(86, 49, 143, 0.23);
    }

    .action-btn:active:not([disabled]) {
      transform: translateY(1px) scale(0.95);
      filter: brightness(0.94);
    }

    /* CANCEL BUTTON */

    .cancel-btn {
      --color: var(--purple-primary);
      --border-color: #cbb8e7;
      --border-radius: 10px;
      --background-hover: var(--lavender);
      --background-activated: var(--lavender);
      --padding-start: 16px;
      --padding-end: 16px;

      min-width: 100px;
      min-height: 44px;
      height: auto;

      font-size: 12px;
      font-weight: 700;
      text-transform: none;
      white-space: normal;

      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        background-color 0.2s ease;
    }

    .cancel-btn:hover:not([disabled]) {
      transform: translateY(-3px);
      --background: var(--lavender);
      --box-shadow: 0 5px 12px rgba(86, 49, 143, 0.12);
    }

    .cancel-btn:active:not([disabled]) {
      transform: scale(0.95);
    }

    /* IONIC BUTTON TOUCH AREA */

    ion-button::part(native) {
      min-height: 44px;
      height: auto;

      white-space: normal;
      text-align: center;
      line-height: 1.3;
      overflow-wrap: anywhere;

      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        background-color 0.2s ease;
    }

    ion-button[disabled] {
      opacity: 0.55;
    }

    /* RATED SECTION */

    .rated-section {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 7px;

      padding: 12px 15px;
      border-top: 1px solid #f0ebf6;
      background: #faf8fd;

      transition: background-color 0.2s ease;
    }

    .rated-section:hover {
      background: #f3eefb;
    }

    .star-icon {
      font-size: 16px;
      transition: transform 0.2s ease;
    }

    .rated-section:hover .star-icon {
      transform: rotate(12deg) scale(1.15);
    }

    .rated-section p {
      color: var(--purple-primary);
      font-size: 13px;
      font-weight: 800;
      margin: 0;
    }

    .rated-label {
      color: var(--text-muted);
      font-size: 11px;
    }

    /* RATING FORM */

    .rating-form {
      padding: 15px;
      background: #faf8fd;
      border-top: 1px solid #eee8f5;

      animation: form-enter 0.3s ease both;
    }

    .rating-heading {
      margin-bottom: 12px;
    }

    .rating-heading h3 {
      color: var(--text-dark);
      font-size: 15px;
      font-weight: 800;
      margin: 0 0 5px;
    }

    .rating-heading p {
      color: var(--text-muted);
      font-size: 12px;
      margin: 0;
    }

    .rating-form ion-item {
      --background: #ffffff;
      --border-color: #eee8f5;
      --color: var(--text-dark);
      --border-radius: 10px;

      margin-bottom: 9px;
      width: 100%;

      border: 1px solid #eee8f5;
      border-radius: 10px;

      transition:
        transform 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease;
    }

    .rating-form ion-item:focus-within {
      transform: translateY(-2px);
      border-color: var(--purple-secondary);
      box-shadow: 0 0 0 3px rgba(118, 81, 181, 0.12);
    }

    .rating-form ion-select,
    .rating-form ion-textarea {
      --color: var(--text-dark);
      --placeholder-color: #a49aaf;

      font-size: 13px;
      max-width: 100%;

      transition: transform 0.2s ease;
    }

    .rating-form ion-item:focus-within ion-select,
    .rating-form ion-item:focus-within ion-textarea {
      transform: translateX(2px);
    }

    .note {
      padding: 0 4px;
      margin: 10px 0;
    }

    .form-actions {
      padding: 10px 0 0;
      border-top: none;
    }

    /* EMPTY AND LOADING STATES */

    .empty-card,
    .loading-card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 18px;
      padding: 30px 20px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(65, 39, 100, 0.05);

      transition:
        transform 0.25s ease,
        box-shadow 0.25s ease,
        border-color 0.25s ease;

      animation: slide-up 0.4s ease both;
    }

    .empty-card:hover,
    .loading-card:hover {
      transform: translateY(-4px);
      border-color: #d9c9ee;
      box-shadow: 0 9px 22px rgba(86, 49, 143, 0.10);
    }

    .empty-icon,
    .loading-icon {
      font-size: 38px;
      margin-bottom: 12px;
      transition: transform 0.25s ease;
    }

    .empty-card:hover .empty-icon {
      transform: translateY(-4px) rotate(-6deg);
    }

    .loading-icon {
      animation: loading-float 1.2s ease-in-out infinite;
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
      line-height: 1.6;
      margin: 0;
    }

    /* GENERAL INTERACTION FEEDBACK */

    button,
    a,
    input,
    textarea,
    select,
    [role="button"],
    [role="option"],
    [tabindex]:not([tabindex="-1"]) {
      -webkit-tap-highlight-color: transparent;
    }

    button:focus-visible,
    a:focus-visible,
    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible,
    [role="button"]:focus-visible,
    [role="option"]:focus-visible {
      outline: 2px solid rgba(118, 81, 181, 0.55);
      outline-offset: 3px;
    }

    ion-button:focus-visible {
      outline: 2px solid rgba(118, 81, 181, 0.55);
      outline-offset: 3px;
      border-radius: 10px;
    }

    /* ANIMATIONS */

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

    @keyframes form-enter {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.99);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes loading-float {
      0%, 100% {
        transform: translateY(0);
      }

      50% {
        transform: translateY(-5px);
      }
    }

    /* TABLET AND DESKTOP */

    @media (min-width: 768px) {
      .page-content {
        --padding-start: 28px;
        --padding-end: 28px;
      }

      .page-heading,
      .summary-card,
      .section-heading,
      .request-card,
      .empty-card,
      .loading-card {
        max-width: 850px;
        margin-left: auto;
        margin-right: auto;
      }

      .summary-card {
        margin-bottom: 25px;
      }

      .section-heading {
        margin-bottom: 13px;
      }

      .request-card {
        margin-bottom: 13px;
      }

      .card-actions {
        flex-direction: row;
        justify-content: flex-end;
      }

      .card-actions ion-button {
        width: auto;
      }

      .form-actions {
        flex-direction: row;
      }
    }

    /* MOBILE */

    @media (max-width: 767px) {
      .card-actions {
        flex-direction: column;
        align-items: stretch;
        padding: 12px 15px;
      }

      .card-actions ion-button {
        width: 100%;
        max-width: 100%;
        margin: 0;
      }

      .form-actions {
        flex-direction: column-reverse;
        align-items: stretch;
      }

      .form-actions ion-button {
        width: 100%;
      }

      .refresh-btn {
        min-width: 75px;
        font-size: 12px;
      }

      .request-row {
        --padding-start: 10px;
        --padding-end: 8px;
      }

      .badges {
        margin-left: 5px;
      }
    }

    /* SMALL MOBILE SCREENS */

    @media (max-width: 360px) {
      .page-heading h1 {
        font-size: 22px;
      }

      .refresh-btn {
        min-width: 65px;
        font-size: 11px;
      }

      .action-btn,
      .cancel-btn {
        font-size: 11px;
        --padding-start: 10px;
        --padding-end: 10px;
      }

      .card-actions {
        padding-left: 10px;
        padding-right: 10px;
      }

      .summary-card {
        padding: 14px;
        gap: 10px;
      }

      .badges ion-badge {
        font-size: 9px;
        padding: 5px 6px;
      }
    }

    /* REDUCED MOTION ACCESSIBILITY */

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }

  `],
})

export class MyReportsPage implements OnDestroy {

  private requestService = inject(RequestService);
  private feedback = inject(FeedbackService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private live = inject(LiveUpdateService);

  private watcher: LiveWatcher | null = null;

  requests: RequestSummary[] = [];
  loading = false;

  ratingChoices = RATING_CHOICES;
  ratingFor: number | null = null;
  rating: number | null = null;
  comment = '';
  saving = false;

  ionViewWillEnter(): void {
    this.watcher?.stop();

    this.watcher = this.live.watch(
      'list',
      (silent) => this.load(silent)
    );
  }

  ionViewWillLeave(): void {
    this.stopWatching();
  }

  ngOnDestroy(): void {
    this.stopWatching();
  }

  private stopWatching(): void {
    this.watcher?.stop();
    this.watcher = null;
  }

  async load(silent = false): Promise<void> {
    if (this.loading && !silent) return;

    if (!silent) {
      this.loading = true;
      this.cdr.markForCheck();
    }

    try {
      this.requests = await this.requestService.getMyRequests();

    } catch (e: any) {
      if (!silent) {
        await this.feedback.toast(
          e?.message ?? 'Could not load your requests.'
        );
      }

    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  openDetails(requestId: number): void {
    void this.router.navigate(['/request', requestId]);
  }

  openRating(requestId: number): void {
    if (this.saving) return;

    this.ratingFor = requestId;
    this.rating = null;
    this.comment = '';

    this.cdr.markForCheck();
  }

  closeRating(): void {
    if (this.saving) return;

    this.ratingFor = null;
    this.rating = null;
    this.comment = '';

    this.cdr.markForCheck();
  }

  async submitRating(requestId: number): Promise<void> {
    if (this.saving || this.rating === null) return;

    this.saving = true;
    this.cdr.markForCheck();

    try {
      await this.requestService.submitReview(
        requestId,
        this.rating,
        this.comment
      );

      await this.feedback.toast(
        'Thank you for your rating.',
        'success'
      );

      this.ratingFor = null;
      this.rating = null;
      this.comment = '';

      await this.load();

    } catch (e: any) {
      await this.feedback.toast(
        e?.message ?? 'Could not save your rating.'
      );

    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }

  statusLabel(status: RequestStatus): string {
    return STATUS_LABELS[status];
  }

  statusColor(status: RequestStatus): string {
    return STATUS_COLORS[status];
  }
}
