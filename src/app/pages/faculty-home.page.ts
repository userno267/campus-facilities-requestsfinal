
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonToolbar,
} from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-faculty-home',
  standalone: true,
  imports: [
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonToolbar,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">
        <div class="brand-header">
          <img
            src="assets/campus-reports-logo.png"
            alt="Campus Reports - Faculty Portal"
          />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="page-content">
      <div class="home-container">

        <div class="page-heading">
          <span class="heading-label">FACULTY PORTAL</span>
          <h1>Welcome back!</h1>
          <p>Here's your campus reports workspace.</p>
        </div>

        <div class="welcome-card">
          <div class="welcome-decoration"></div>

          <div class="welcome-content">
            <div class="welcome-icon">
              <span>👋</span>
            </div>

            <p class="welcome-greeting">HELLO, FACULTY MEMBER</p>

            <h2>{{ auth.user()?.name || 'Faculty Member' }}</h2>

            <p class="welcome-text">
              Welcome to your Campus Reports portal. You can report
              campus facility problems and monitor the progress of
              your submitted reports here.
            </p>
          </div>
        </div>

        <div class="section-heading">
          <div>
            <h2>Quick Actions</h2>
            <p>What would you like to do today?</p>
          </div>
        </div>

        <div class="actions">

          <!-- New Report -->
          <div class="action-card">
            <div class="action-icon report-icon">
              <span>📝</span>
            </div>

            <div class="action-info">
              <h3>Submit a Report</h3>
              <p>
                Report damaged facilities, equipment issues,
                or other campus concerns.
              </p>
            </div>

            <ion-button
              expand="block"
              routerLink="/tabs/new-report"
              class="primary-button"
            >
              Create New Report
              <span class="button-arrow">→</span>
            </ion-button>
          </div>

          <!-- My Reports -->
          <div class="action-card">
            <div class="action-icon reports-icon">
              <span>📋</span>
            </div>

            <div class="action-info">
              <h3>My Reports</h3>
              <p>
                View your submitted reports and keep track
                of their current status.
              </p>
            </div>

            <ion-button
              expand="block"
              fill="outline"
              routerLink="/tabs/my-reports"
              class="secondary-button"
            >
              View My Reports
              <span class="button-arrow">→</span>
            </ion-button>
          </div>

        </div>

        <div class="info-note">
          <div class="info-icon">ℹ️</div>
          <p>
            <strong>Reminder:</strong> Provide accurate details and
            clear photos when submitting a campus facility report.
            This helps the assigned staff address the issue properly.
          </p>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    /* Page Background */
    .page-content {
      --background: #faf8fd;
    }

    /* Header */
    .page-toolbar {
      --background: #ffffff;
      --color: #302344;
      --min-height: 90px;
      border-bottom: 1px solid #eee8f5;
      padding-inline: 30px;
    }

    /* Campus Reports Branding */
    .brand-header {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      width: 100%;
      height: 90px;
      overflow: visible;
    }

    .brand-header img {
      display: block;
      width: auto;
      height: auto;
      max-width: 220px;
      max-height: 76px;
      object-fit: contain;
      object-position: left center;
    }

    /* Main Container */
    .home-container {
      width: 100%;
      max-width: 850px;
      margin: 0 auto;
      padding: 24px 18px 35px;
    }

    /* Page Heading */
    .page-heading {
      margin-bottom: 22px;
    }

    .heading-label {
      display: inline-block;
      color: #7651b5;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      margin-bottom: 8px;
    }

    .page-heading h1 {
      margin: 0 0 6px;
      color: #302344;
      font-size: 27px;
      font-weight: 800;
    }

    .page-heading p {
      margin: 0;
      color: #8c829b;
      font-size: 14px;
    }

    /* Welcome Card */
    .welcome-card {
      position: relative;
      overflow: hidden;
      background: linear-gradient(
        135deg,
        #56318f,
        #7651b5,
        #8c6ac5
      );
      border-radius: 20px;
      padding: 27px 23px;
      margin-bottom: 30px;
      box-shadow: 0 8px 22px rgba(86, 49, 143, 0.16);
      transition:
        transform 0.25s ease,
        box-shadow 0.25s ease;
    }

    .welcome-card:hover {
      box-shadow: 0 12px 28px rgba(86, 49, 143, 0.20);
    }

    .welcome-decoration {
      position: absolute;
      width: 190px;
      height: 190px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.08);
      right: -55px;
      top: -75px;
      transition: transform 0.5s ease;
    }

    .welcome-card:hover .welcome-decoration {
      transform: scale(1.15);
    }

    .welcome-content {
      position: relative;
      z-index: 1;
    }

    .welcome-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 14px;
      font-size: 23px;
      margin-bottom: 17px;
      transition:
        transform 0.25s ease,
        background 0.25s ease;
    }

    .welcome-icon:hover {
      transform: translateY(-4px) rotate(-5deg);
      background: rgba(255, 255, 255, 0.27);
    }

    .welcome-greeting {
      margin: 0 0 7px;
      color: #e8dcfa;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
    }

    .welcome-card h2 {
      margin: 0 0 12px;
      color: #ffffff;
      font-size: 25px;
      font-weight: 800;
      overflow-wrap: anywhere;
    }

    .welcome-text {
      max-width: 580px;
      margin: 0;
      color: #eee7fa;
      font-size: 14px;
      line-height: 1.7;
    }

    /* Section Heading */
    .section-heading {
      margin-bottom: 16px;
    }

    .section-heading h2 {
      margin: 0 0 5px;
      color: #302344;
      font-size: 19px;
      font-weight: 800;
    }

    .section-heading p {
      margin: 0;
      color: #8c829b;
      font-size: 13px;
    }

    /* Action Cards */
    .actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    .action-card {
      display: flex;
      flex-direction: column;
      min-width: 0;
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 17px;
      padding: 20px;
      box-shadow: 0 4px 14px rgba(48, 35, 68, 0.04);
      transition:
        transform 0.25s ease,
        box-shadow 0.25s ease,
        border-color 0.25s ease;
    }

    .action-card:hover {
      transform: translateY(-4px);
      border-color: #d8c8ee;
      box-shadow: 0 10px 24px rgba(86, 49, 143, 0.12);
    }

    .action-card:active {
      transform: translateY(-1px) scale(0.99);
    }

    .action-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 14px;
      font-size: 23px;
      margin-bottom: 16px;
      flex-shrink: 0;
      transition:
        transform 0.25s ease,
        box-shadow 0.25s ease;
    }

    .action-card:hover .action-icon {
      transform: translateY(-3px) scale(1.06);
    }

    .report-icon {
      background: #ede4fa;
    }

    .reports-icon {
      background: #f1eafa;
    }

    .action-info {
      flex: 1;
      min-width: 0;
    }

    .action-info h3 {
      margin: 0 0 8px;
      color: #302344;
      font-size: 16px;
      font-weight: 800;
    }

    .action-info p {
      margin: 0 0 20px;
      color: #8c829b;
      font-size: 13px;
      line-height: 1.6;
    }

    /* Responsive Buttons */
    ion-button {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      min-height: 46px;
      height: auto;
      margin: 0;

      --border-radius: 11px;
      --padding-start: 14px;
      --padding-end: 14px;
      --padding-top: 10px;
      --padding-bottom: 10px;

      font-size: 13px;
      font-weight: 700;
      text-transform: none;
      white-space: normal;
      text-align: center;

      cursor: pointer;

      transition:
        transform 0.2s ease,
        filter 0.2s ease,
        box-shadow 0.2s ease;
    }

    /* Actual Ionic Button */
    ion-button::part(native) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-width: 0;
      min-height: 46px;
      height: auto;
      padding: 10px 12px;
      white-space: normal;
      line-height: 1.4;
      text-align: center;
      overflow-wrap: anywhere;

      transition:
        transform 0.2s ease,
        box-shadow 0.2s ease,
        background-color 0.2s ease,
        color 0.2s ease;
    }

    /* Primary Button */
    .primary-button {
      --background: #56318f;
      --background-hover: #452574;
      --color: #ffffff;
      --box-shadow: none;
    }

    /* Secondary Button */
    .secondary-button {
      --background: transparent;
      --color: #56318f;
      --border-color: #7651b5;
      --border-width: 1px;
      --border-style: solid;
      --box-shadow: none;
    }

    /* Button Hover Animation */
    @media (hover: hover) {
      ion-button:hover {
        filter: brightness(1.07);
      }

      ion-button:hover::part(native) {
        transform: translateY(-3px);
        box-shadow: 0 7px 16px rgba(86, 49, 143, 0.18);
      }

      .button-arrow {
        transition: transform 0.25s ease;
      }

      ion-button:hover .button-arrow {
        transform: translateX(5px);
      }
    }

    /* Button Click / Tap Animation */
    ion-button:active {
      transform: scale(0.97);
      filter: brightness(0.94);
    }

    ion-button:active::part(native) {
      transform: translateY(1px);
      box-shadow: 0 2px 5px rgba(86, 49, 143, 0.12);
    }

    /* Keyboard Focus */
    ion-button:focus-visible {
      outline: 3px solid #b99ae8;
      outline-offset: 4px;
      border-radius: 11px;
    }

    ion-button:focus-visible::part(native) {
      box-shadow: 0 0 0 3px rgba(185, 154, 232, 0.35);
    }

    /* Button Arrow */
    .button-arrow {
      display: inline-block;
      margin-left: 7px;
      font-size: 17px;
      flex-shrink: 0;
      transition: transform 0.25s ease;
    }

    /* Information Note */
    .info-note {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      background: #f2ecfb;
      border: 1px solid #e6dcf5;
      border-radius: 14px;
      padding: 15px;
      margin-top: 24px;
      transition:
        transform 0.25s ease,
        box-shadow 0.25s ease;
    }

    .info-note:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(86, 49, 143, 0.08);
    }

    .info-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    .info-note p {
      margin: 0;
      color: #665477;
      font-size: 12px;
      line-height: 1.7;
    }

    .info-note strong {
      color: #56318f;
    }

    /* Tablet Responsive */
    @media (max-width: 768px) {
      .page-toolbar {
        padding-inline: 20px;
      }

      .brand-header img {
        max-width: 200px;
        max-height: 72px;
      }

      .home-container {
        max-width: 100%;
        padding: 22px 16px 30px;
      }

      .actions {
        gap: 12px;
      }

      .action-card {
        padding: 17px;
      }

      ion-button {
        min-height: 48px;
        font-size: 13px;
      }

      ion-button::part(native) {
        min-height: 48px;
      }
    }

    /* Mobile Responsive */
    @media (max-width: 600px) {
      .page-toolbar {
        --min-height: 76px;
        padding-inline: 15px;
      }

      .brand-header {
        height: 76px;
      }

      .brand-header img {
        max-width: 185px;
        max-height: 65px;
      }

      .home-container {
        padding: 20px 15px 30px;
      }

      .page-heading h1 {
        font-size: 24px;
      }

      .welcome-card {
        padding: 23px 19px;
      }

      .welcome-card h2 {
        font-size: 22px;
      }

      .actions {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .action-card {
        width: 100%;
        padding: 18px;
      }

      ion-button {
        width: 100%;
        min-height: 48px;
        font-size: 13px;
        --padding-start: 12px;
        --padding-end: 12px;
      }

      ion-button::part(native) {
        width: 100%;
        min-height: 48px;
        padding: 11px 12px;
      }
    }

    /* Small Mobile Responsive */
    @media (max-width: 360px) {
      .home-container {
        padding-inline: 12px;
      }

      .brand-header img {
        max-width: 165px;
        max-height: 60px;
      }

      .action-card {
        padding: 15px;
      }

      ion-button {
        font-size: 12px;
        --padding-start: 8px;
        --padding-end: 8px;
      }

      ion-button::part(native) {
        padding-inline: 8px;
      }

      .button-arrow {
        margin-left: 4px;
        font-size: 15px;
      }
    }

    /* Accessibility: Reduced Motion */
    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }
  `],
})
export class FacultyHomePage {
  auth = inject(AuthService);
}
