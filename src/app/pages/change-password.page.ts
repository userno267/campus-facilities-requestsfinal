import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
} from '@ionic/angular';
import { FeedbackService } from '../services/feedback.service';
import { PasswordService } from '../services/password.service';

// "Change password" page. Any logged-in user changes their own password.
// Opened from the Password button on the Account tab.
@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">

        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/account" text="Back"></ion-back-button>
          <div class="brand-header">
            <img
              src="assets/campus-reports-logo.png"
              alt="Campus Reports logo"
              class="brand-logo-img" />
          </div>
        </ion-buttons>

        <ion-title>Password</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">

      <div class="page-heading">
        <span class="eyebrow">ACCOUNT</span>
        <h1>Change Password</h1>
        <p>Choose a new password. If an admin gave you a temporary one, change it here.</p>
      </div>

      <div class="form-card">
        <label class="label" for="cp-current">Current password</label>
        <input id="cp-current" class="field" type="password" maxlength="72" autocomplete="current-password"
               [value]="current()" (input)="current.set(textOf($event))" />

        <label class="label" for="cp-new">New password (at least 6 characters)</label>
        <input id="cp-new" class="field" type="password" maxlength="72" autocomplete="new-password"
               [value]="next()" (input)="next.set(textOf($event))" />

        <label class="label" for="cp-confirm">Confirm new password</label>
        <input id="cp-confirm" class="field" type="password" maxlength="72" autocomplete="new-password"
               [value]="confirm()" (input)="confirm.set(textOf($event))" />

        <ion-button class="primary-btn" expand="block" [disabled]="busy()" (click)="save()">
          {{ busy() ? 'Saving...' : 'Change password' }}
        </ion-button>
      </div>

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
  
    .form-card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 17px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      box-shadow: 0 4px 15px rgba(65, 39, 100, 0.05);
      animation: slide-up 0.4s ease both;
    }

    .hint {
      margin: 0;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
    }

    ion-back-button {
      --color: var(--purple-primary);
    }
  `],
})
export class ChangePasswordPage {
  private passwords = inject(PasswordService);
  private feedback = inject(FeedbackService);
  private router = inject(Router);

  current = signal('');
  next = signal('');
  confirm = signal('');
  busy = signal(false);

  textOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  async save(): Promise<void> {
    if (!this.current() || !this.next()) {
      void this.feedback.toast('Enter your current and new password', 'danger');
      return;
    }
    if (this.next().length < 6) {
      void this.feedback.toast('New password must be at least 6 characters', 'danger');
      return;
    }
    if (this.next() !== this.confirm()) {
      void this.feedback.toast('The new passwords do not match', 'danger');
      return;
    }

    this.busy.set(true);
    try {
      await this.passwords.change(this.current(), this.next());
      this.current.set('');
      this.next.set('');
      this.confirm.set('');
      await this.feedback.toast('Password changed', 'success');
      await this.router.navigateByUrl('/tabs/account');
    } catch (e: any) {
      void this.feedback.toast(e?.message ?? 'Could not change the password', 'danger');
    } finally {
      this.busy.set(false);
    }
  }
}
