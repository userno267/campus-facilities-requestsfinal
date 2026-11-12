import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSpinner,
} from '@ionic/angular';

import { AuthService } from '../services/auth.service';
import { RequestService } from '../services/request.service';
import { FeedbackService } from '../services/feedback.service';
import { AdminRequestService } from '../services/admin-request.service';
import { RequestCategory } from '../models/request.model';

// What each category is for, with examples. The database only stores the category NAME,
// so this text lives here, keyed by the lower-case name. A category that is not listed
// gets the generic text below.
interface CategoryInfo {
  about: string;
  examples: string[];
}

const CATEGORY_INFO: Record<string, CategoryInfo> = {
  facilities: {
    about: 'Problems with the buildings and grounds: water, power, doors, lights and cooling.',
    examples: [
      'Leaking roof or ceiling',
      'Broken door, window or lock',
      'Flickering or burned-out lights',
      'Clogged toilet or water leak',
      'Broken aircon or electric fan',
    ],
  },
  it: {
    about: 'Problems with computers, internet and other campus technology.',
    examples: [
      'Wi-Fi not working in a room',
      'Projector or monitor will not turn on',
      'Broken computer in a lab',
      'Printer jammed or offline',
      'Cannot log in to a campus system',
    ],
  },
  classroom: {
    about: 'Problems with the things inside a classroom or lab that teaching depends on.',
    examples: [
      'Broken or missing chairs and desks',
      'Damaged whiteboard',
      'Broken window blinds or curtains',
      'Lab tables or equipment damaged',
      'Room not set up for the class',
    ],
  },
  administrative: {
    about: 'Office and paperwork matters. Use this when nothing is broken but you need something arranged.',
    examples: [
      'Request for a room or equipment',
      'Room booking or schedule conflict',
      'Missing office supplies',
      'Key or access card request',
      'Problem with a form or record',
    ],
  },
};

const DEFAULT_INFO: CategoryInfo = {
  about: 'Choose this category when your concern matches its name.',
  examples: [],
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="top-toolbar">
        <div class="brand" slot="start">
          <div class="brand-icon">CR</div>
          <div class="brand-info">
            <strong>Campus Reports</strong>
            <span>{{ roleLabel }}</span>
          </div>
        </div>

        <ion-buttons slot="end">
          <ion-button class="logout-btn" (click)="logout()">
            Logout
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="dashboard-content">

      <main class="dashboard-container">

        <!-- Welcome Section -->
        <section class="welcome-section">
          <div class="welcome-text">
            <span class="eyebrow">{{ eyebrow }}</span>

            <h1>
              {{ greeting }},
              <span>{{ auth.user()?.name || 'Campus User' }}!</span>
            </h1>

            <p>{{ welcomeText }}</p>

            <div class="welcome-role">
              <span class="status-dot"></span>
              {{ rolePill }}
            </div>
          </div>

          <div class="welcome-illustration">
            <div class="illustration-circle">
              <span class="illustration-icon">✦</span>
              <div class="illustration-shield">✓</div>
            </div>
          </div>
        </section>

        <!-- Quick Actions (different for each role) -->
        <section class="section-block">
          <div class="section-heading">
            <div>
              <span class="eyebrow">GET STARTED</span>
              <h2>Quick Actions</h2>
              <p>{{ actionsText }}</p>
            </div>
          </div>

          <div class="quick-grid">

            @if (isFaculty) {
              <button type="button" class="action-card primary-action" (click)="goTo('/tabs/new-report')">
                <div class="action-icon purple-icon">＋</div>
                <div class="action-details">
                  <h3>Submit a Request</h3>
                  <p>Report a concern or submit a new campus request.</p>
                </div>
                <span class="action-arrow">→</span>
              </button>

              <button type="button" class="action-card" (click)="goTo('/tabs/my-reports')">
                <div class="action-icon lavender-icon">▤</div>
                <div class="action-details">
                  <h3>My Reports</h3>
                  <p>View and track your previously submitted requests.</p>
                </div>
                <span class="action-arrow">→</span>
              </button>
            }

            @if (isAdmin) {
              <button type="button" class="action-card primary-action" (click)="goTo('/tabs/dashboard')">
                <div class="action-icon purple-icon">▤</div>
                <div class="action-details">
                  <h3>All Requests</h3>
                  <p>Browse every request in any status. Read-only.</p>
                </div>
                <span class="action-arrow">→</span>
              </button>

              <div class="action-card info-card">
                <div class="action-icon lavender-icon">✓</div>
                <div class="action-details">
                  <h3>Waiting for review</h3>
                  <p>
                    @if (pendingCount === null) {
                      Open the Manage tab to see the queue.
                    } @else {
                      {{ pendingCount }} request{{ pendingCount === 1 ? '' : 's' }} need attention. Use the Manage tab to act.
                    }
                  </p>
                </div>
              </div>
            }

            @if (isStaff) {
              <button type="button" class="action-card primary-action" (click)="goTo('/tabs/assigned')">
                <div class="action-icon purple-icon">▣</div>
                <div class="action-details">
                  <h3>My Job</h3>
                  <p>Your current job, your queue and any paused jobs.</p>
                </div>
                <span class="action-arrow">→</span>
              </button>
            }

          </div>
        </section>

        <!-- Categories (faculty only: they are used when submitting a request) -->
        @if (isFaculty) {
          <section class="section-block categories-section">

            <div class="section-heading">
              <div>
                <span class="eyebrow">CAMPUS SERVICES</span>
                <h2>Request Categories</h2>
                <p>Explore the available categories for your requests.</p>
              </div>

              <div class="category-count">
                {{ categories.length }} Available
              </div>
            </div>

            @if (loading) {
              <div class="loading-container">
                <ion-spinner name="crescent"></ion-spinner>
                <p>Loading categories...</p>
              </div>
            } @else {

              <div class="category-grid">

                @for (c of categories; track c.id) {
                  <div
                    class="category-card"
                    [class.open]="expandedId === c.id"
                    role="button"
                    tabindex="0"
                    [attr.aria-expanded]="expandedId === c.id"
                    (click)="toggleCategory(c.id)"
                    (keydown.enter)="toggleCategory(c.id)"
                    (keydown.space)="toggleCategory(c.id); $event.preventDefault()"
                  >

                    <div class="category-icon">
                      <span>▦</span>
                    </div>

                    <div class="category-info">
                      <h3>{{ c.name }}</h3>
                      <p>{{ expandedId === c.id ? 'Tap to close' : 'Tap to see examples' }}</p>
                    </div>

                    <div class="category-indicator">→</div>

                    @if (expandedId === c.id) {
                      <div class="category-detail" (click)="$event.stopPropagation()">
                        <p class="detail-about">{{ infoFor(c.name).about }}</p>

                        @if (infoFor(c.name).examples.length > 0) {
                          <span class="detail-label">EXAMPLES</span>
                          <ul class="detail-list">
                            @for (ex of infoFor(c.name).examples; track ex) {
                              <li>{{ ex }}</li>
                            }
                          </ul>
                        }
                      </div>
                    }

                  </div>
                } @empty {

                  <div class="empty-state">
                    <div class="empty-icon">▤</div>

                    <h3>No Categories Available</h3>

                    <p>
                      There are currently no request categories.
                      Please check again later.
                    </p>
                  </div>

                }

              </div>
            }

          </section>
        }

        <!-- Footer -->
        <footer class="dashboard-footer">
          <span>Campus Reports</span>
          <span>{{ roleLabel }} · {{ currentYear }}</span>
        </footer>

      </main>

    </ion-content>
  `,

  styles: [`

    /* =====================================
       GLOBAL DASHBOARD
    ===================================== */

    :host {
      --purple-primary: #56318f;
      --purple-secondary: #7651b5;
      --purple-light: #b99ae8;
      --lavender: #ede4fa;
      --background-color: #faf8fd;
      --text-dark: #302344;
      --text-muted: #8c829b;
    }

    .dashboard-content {
      --background: var(--background-color);
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
      border-bottom: 1px solid #eee8f5;
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

    .logout-btn {
      --color: var(--purple-primary);
      --border-radius: 10px;
      font-weight: 650;
      text-transform: none;
      min-height: 42px;
      transition: transform .2s ease, filter .2s ease;
      -webkit-tap-highlight-color: transparent;
    }

    /* =====================================
       WELCOME BANNER
    ===================================== */

    .welcome-section {
      min-height: 220px;
      padding: 36px 42px;
      box-sizing: border-box;
      border-radius: 22px;
      background: linear-gradient(
        120deg,
        #56318f 0%,
        #7651b5 60%,
        #8c6ac5 100%
      );
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
      text-transform: capitalize;
      transition: background .2s ease, transform .2s ease;
    }

    .welcome-role:hover {
      background: rgba(255,255,255,.22);
      transform: translateX(4px);
    }

    .status-dot {
      width: 7px;
      height: 7px;
      background: #b8f5ca;
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
      font-size: 32px;
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
       SECTION HEADINGS
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

    .section-heading p {
      margin: 6px 0 0;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* =====================================
       QUICK ACTION CARDS
    ===================================== */

    .quick-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px;
    }

    .action-card {
      width: 100%;
      min-height: 125px;
      display: flex;
      align-items: center;
      gap: 17px;
      padding: 22px;
      border: 1px solid #eee8f5;
      border-radius: 17px;
      background: #ffffff;
      text-align: left;
      cursor: pointer;
      transition:
        transform .22s ease,
        border-color .22s ease,
        box-shadow .22s ease,
        background .22s ease;
      font-family: inherit;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
    }

    .action-card:hover {
      transform: translateY(-5px);
      border-color: var(--purple-light);
      box-shadow: 0 10px 25px rgba(86,49,143,.13);
      background: #fdfbff;
    }

    .action-card:active {
      transform: translateY(1px) scale(.975);
      box-shadow: 0 3px 9px rgba(86,49,143,.1);
    }

    .action-card:focus-visible {
      outline: 3px solid rgba(118,81,181,.4);
      outline-offset: 4px;
    }

    .primary-action {
      border-left: 4px solid var(--purple-primary);
    }

    .action-icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      font-weight: 700;
      transition: transform .25s ease, border-radius .25s ease;
    }

    .action-card:hover .action-icon {
      transform: rotate(-7deg) scale(1.1);
      border-radius: 17px;
    }

    .purple-icon {
      background: #eee5fb;
      color: var(--purple-primary);
    }

    .lavender-icon {
      background: #f2edfb;
      color: var(--purple-secondary);
    }

    .action-details {
      flex: 1;
    }

    .action-details h3 {
      margin: 0 0 7px;
      font-size: 14px;
      color: var(--text-dark);
      font-weight: 750;
      transition: color .2s ease;
    }

    .action-card:hover .action-details h3 {
      color: var(--purple-primary);
    }

    .action-details p {
      margin: 0;
      font-size: 11px;
      line-height: 1.6;
      color: var(--text-muted);
    }

    .action-arrow {
      color: var(--purple-secondary);
      font-size: 21px;
      flex-shrink: 0;
      transition: transform .25s ease;
    }

    .action-card:hover .action-arrow {
      transform: translateX(6px);
    }

    .action-card:active .action-arrow {
      transform: translateX(2px);
    }

    /* =====================================
       CATEGORY CARDS
    ===================================== */

    .category-count {
      background: var(--lavender);
      color: var(--purple-primary);
      padding: 8px 13px;
      border-radius: 30px;
      font-size: 11px;
      font-weight: 750;
      white-space: nowrap;
      transition: transform .2s ease, background .2s ease;
    }

    .category-count:hover {
      transform: translateY(-2px);
      background: #e3d5f7;
    }

    .category-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 16px;
    }

    .category-card {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 20px 17px;
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 16px;
      transition:
        transform .22s ease,
        border-color .22s ease,
        box-shadow .22s ease,
        background .22s ease;
      cursor: pointer;
      flex-wrap: wrap;
    }

    .category-card:hover {
      transform: translateY(-4px);
      border-color: var(--purple-light);
      box-shadow: 0 8px 20px rgba(86,49,143,.11);
      background: #fdfbff;
    }

    .category-icon {
      width: 43px;
      height: 43px;
      flex-shrink: 0;
      border-radius: 12px;
      background: #f0e9fa;
      color: var(--purple-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 23px;
      transition: transform .25s ease, background .25s ease;
    }

    .category-card:hover .category-icon {
      transform: rotate(-8deg) scale(1.1);
      background: #e7daf8;
    }

    .category-info {
      flex: 1;
      min-width: 0;
    }

    .category-info h3 {
      margin: 0 0 5px;
      font-size: 13px;
      font-weight: 750;
      color: var(--text-dark);
      overflow-wrap: anywhere;
      transition: color .2s ease;
    }

    .category-card:hover .category-info h3 {
      color: var(--purple-primary);
    }

    .category-info p {
      margin: 0;
      font-size: 10px;
      color: var(--text-muted);
    }

    .category-indicator {
      color: var(--purple-secondary);
      font-size: 18px;
      flex-shrink: 0;
      transition: transform .2s ease;
    }

    .category-card:hover .category-indicator {
      transform: translateX(5px);
    }

    /* Open card: spans the full row and shows what the category is for. */
    .category-card.open {
      grid-column: 1 / -1;
      border-color: var(--purple-light);
      background: #fdfbff;
    }

    .category-card.open .category-indicator {
      transform: rotate(90deg);
    }

    .category-card:focus-visible {
      outline: 3px solid rgba(118,81,181,.4);
      outline-offset: 3px;
    }

    .category-detail {
      flex: 0 0 100%;
      margin-top: 4px;
      padding-top: 14px;
      border-top: 1px solid #eee8f5;
      cursor: default;
      animation: content-enter .25s ease both;
    }

    .detail-about {
      margin: 0 0 12px;
      font-size: 12px;
      line-height: 1.7;
      color: var(--text-dark);
    }

    .detail-label {
      display: block;
      margin-bottom: 8px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.4px;
      color: var(--purple-secondary);
    }

    .detail-list {
      margin: 0;
      padding-left: 18px;
      font-size: 12px;
      line-height: 1.8;
      color: var(--text-muted);
    }

    .detail-list li::marker {
      color: var(--purple-light);
    }

    /* =====================================
       LOADING AND EMPTY STATES
    ===================================== */

    .loading-container,
    .empty-state {
      padding: 45px 20px;
      background: white;
      border: 1px solid #eee8f5;
      border-radius: 16px;
      text-align: center;
      color: var(--text-muted);
      animation: content-enter .3s ease both;
    }

    .loading-container ion-spinner {
      color: var(--purple-primary);
    }

    .empty-icon {
      font-size: 35px;
      color: var(--purple-light);
      transition: transform .25s ease;
    }

    .empty-state:hover .empty-icon {
      transform: translateY(-4px) scale(1.1);
    }

    .empty-state h3 {
      color: var(--text-dark);
      font-size: 16px;
    }

    .empty-state p {
      font-size: 12px;
    }

    /* Non-clickable card (admin "Waiting for review") */
    .info-card {
      cursor: default;
    }

    .info-card:hover {
      transform: none;
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
      border-top: 1px solid #eee8f5;
      font-size: 11px;
      color: var(--text-muted);
    }

    /* =====================================
       ANIMATIONS
    ===================================== */

    @keyframes status-pulse {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(184,245,202,.5);
      }

      50% {
        box-shadow: 0 0 0 5px rgba(184,245,202,0);
      }
    }

    @keyframes content-enter {
      from {
        opacity: 0;
        transform: translateY(8px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* =====================================
       TABLET RESPONSIVENESS
    ===================================== */

    @media (max-width: 900px) {

      .dashboard-container {
        padding: 28px 24px;
      }

      .category-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .welcome-section {
        padding: 30px;
      }

      .welcome-illustration {
        width: 130px;
      }
    }

    /* =====================================
       MOBILE RESPONSIVENESS
    ===================================== */

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

      .logout-btn {
        font-size: 12px;
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

      .quick-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .action-card {
        min-height: 105px;
        padding: 17px;
      }

      .category-grid {
        grid-template-columns: 1fr;
        gap: 11px;
      }

      .category-card {
        padding: 16px;
      }

      .dashboard-footer {
        font-size: 9px;
      }
    }

    /* =====================================
       SMALL MOBILE DEVICES
    ===================================== */

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

      .brand-info strong {
        font-size: 12px;
      }

      .section-heading h2 {
        font-size: 17px;
      }

      .category-count {
        font-size: 9px;
        padding: 7px 9px;
      }
    }

    /* =====================================
       TOUCH DEVICE FEEDBACK
    ===================================== */

    @media (hover: none) {

      .action-card:hover {
        transform: none;
      }

      .category-card:hover,
      .welcome-section:hover {
        transform: none;
      }

      .action-card:active {
        transform: scale(.97);
        background: #f5effc;
      }

      .category-card:active {
        transform: scale(.985);
        background: #f5effc;
      }

      .logout-btn:active {
        opacity: .75;
      }
    }

    /* =====================================
       ACCESSIBILITY
    ===================================== */

    @media (prefers-reduced-motion: reduce) {

      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
      }

      .action-card:active,
      .category-card:active {
        transform: none;
      }
    }

  `],
})

export class HomePage implements OnInit {

  auth = inject(AuthService);

  private requestService = inject(RequestService);
  private adminService = inject(AdminRequestService);
  private feedback = inject(FeedbackService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  categories: RequestCategory[] = [];

  loading = true;

  // Admin only: how many requests need attention. null = not loaded (or not an admin).
  pendingCount: number | null = null;

  // The category card that is open (showing its details), or null when all are closed.
  expandedId: number | null = null;

  currentYear = new Date().getFullYear();

  // ----- Role -----

  get role(): string {
    return this.auth.user()?.role ?? '';
  }

  get isFaculty(): boolean {
    return this.role === 'faculty';
  }

  get isAdmin(): boolean {
    return this.role === 'admin';
  }

  get isStaff(): boolean {
    return this.role === 'staff';
  }

  get roleLabel(): string {
    if (this.isAdmin) return 'Admin Portal';
    if (this.isStaff) return 'Staff Portal';
    return 'Faculty Portal';
  }

  get eyebrow(): string {
    if (this.isAdmin) return 'ADMIN DASHBOARD';
    if (this.isStaff) return 'STAFF DASHBOARD';
    return 'FACULTY DASHBOARD';
  }

  get welcomeText(): string {
    if (this.isAdmin) {
      return 'Review, assign and track campus requests. Your queue and the full request list are one tap away.';
    }
    if (this.isStaff) {
      return 'Open My Job to see your current job, your queue and any paused jobs.';
    }
    return 'Welcome to Campus Reports. Manage your campus concerns and stay updated with your submitted requests.';
  }

  get actionsText(): string {
    if (this.isAdmin) return 'Jump to the work that needs you.';
    if (this.isStaff) return 'Your work, one tap away.';
    return 'What would you like to do today?';
  }

  get rolePill(): string {
    if (this.isAdmin && this.pendingCount !== null) {
      return `${this.pendingCount} waiting for review`;
    }
    return this.roleLabel;
  }

  get greeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';

    return 'Good evening';
  }

  // ----- Loading -----

  async ngOnInit() {
    await this.refreshForRole();
  }

  // Ionic keeps this tab alive, so reload the role data each time it is shown.
  // This also fixes the case where a different account has logged in.
  ionViewWillEnter() {
    void this.refreshForRole();
  }

  private async refreshForRole() {
    if (this.isFaculty) {
      await this.loadCategories();
    } else {
      this.loading = false;
    }

    if (this.isAdmin) {
      await this.loadPending();
    } else {
      this.pendingCount = null;
    }

    this.cdr.markForCheck();
  }

  async loadCategories() {
    this.loading = true;

    try {
      this.categories = await this.requestService.getCategories();
    } catch (e: any) {
      await this.feedback.toast(
        e?.message ?? 'Could not load categories.'
      );
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // Admin only. A failure just leaves the count blank; no error toast.
  async loadPending() {
    try {
      const rows = await this.adminService.loadQueue();
      this.pendingCount = rows.length;
    } catch {
      this.pendingCount = null;
    } finally {
      this.cdr.markForCheck();
    }
  }

  // ----- Actions -----

  // Tap a category card to open it, tap again to close it.
  toggleCategory(id: number): void {
    this.expandedId = this.expandedId === id ? null : id;
  }

  infoFor(name: string): CategoryInfo {
    return CATEGORY_INFO[name.trim().toLowerCase()] ?? DEFAULT_INFO;
  }

  async goTo(path: string) {
    await this.router.navigateByUrl(path);
  }

  async logout() {
    this.auth.logout();

    await this.router.navigateByUrl('/login', {
      replaceUrl: true
    });
  }

}