
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
} from '@ionic/angular';

import { AuthService } from '../services/auth.service';
import { FeedbackService } from '../services/feedback.service';
import { Department } from '../models/user.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
  ],
  template: `
    <ion-content [fullscreen]="true" class="register-content">

      <div class="auth-background">

        <div class="auth-container">

          <!-- REGISTRATION FORM - LEFT SIDE -->
          <section class="form-container">

            <div class="register-card">

              <!-- MOBILE BRAND -->
              <div class="mobile-brand">
                <div class="brand-header">
                  <img
                    src="assets/campus-reports-logo.png"
                    alt="Campus Reports logo"
                    class="brand-logo-img" />
                </div>
                <strong>Campus Reports</strong>
              </div>

              <!-- HEADING -->
              <div class="form-heading">
                <span class="eyebrow">GET STARTED</span>
                <h2>Create your account</h2>
                <p>Fill in your details to register for Campus Reports.</p>
              </div>

              <form (ngSubmit)="register()">

                <!-- ACCOUNT TYPE -->
                <div class="input-group role-group">
                  <label>Account Type</label>

                  <ion-segment
                    class="role-segment"
                    [value]="role()"
                    (ionChange)="onRoleChange($event.detail.value)"
                  >
                    <ion-segment-button value="faculty">
                      <ion-label>Faculty</ion-label>
                    </ion-segment-button>

                    <ion-segment-button value="staff">
                      <ion-label>Staff</ion-label>
                    </ion-segment-button>
                  </ion-segment>
                </div>

                <!-- FULL NAME -->
                <div class="input-group">
                  <label for="name">Full Name</label>

                  <ion-item class="custom-input" lines="none">
                    <ion-input
                      id="name"
                      placeholder="Enter your full name"
                      [(ngModel)]="name"
                      name="name"
                      autocomplete="name"
                      required
                    ></ion-input>
                  </ion-item>
                </div>

                <!-- EMAIL -->
                <div class="input-group">
                  <label for="email">Email Address</label>

                  <ion-item class="custom-input" lines="none">
                    <ion-input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      [(ngModel)]="email"
                      name="email"
                      autocomplete="email"
                      required
                    ></ion-input>
                  </ion-item>
                </div>

                <!-- EMPLOYEE ID -->
                <div class="input-group">
                  <label for="employeeId">Employee ID</label>

                  <ion-item class="custom-input" lines="none">
                    <ion-input
                      id="employeeId"
                      placeholder="Enter your employee ID"
                      [(ngModel)]="employeeId"
                      name="employeeId"
                      required
                    ></ion-input>
                  </ion-item>
                </div>

                <!-- DEPARTMENT - STAFF ONLY -->
                @if (role() === 'staff') {
                  <div class="input-group">
                    <label>Department</label>

                    <ion-item class="custom-input" lines="none">
                      <ion-select
                        placeholder="Select your department"
                        interface="popover"
                        [(ngModel)]="departmentId"
                        name="departmentId"
                      >
                        @for (d of departments(); track d.id) {
                          <ion-select-option [value]="d.id">
                            {{ d.name }}
                          </ion-select-option>
                        }
                      </ion-select>
                    </ion-item>
                  </div>
                }

                <!-- PASSWORD -->
                <div class="input-group">
                  <label for="password">Password</label>

                  <ion-item class="custom-input" lines="none">
                    <ion-input
                      id="password"
                      [type]="showPassword() ? 'text' : 'password'"
                      placeholder="At least 6 characters"
                      [(ngModel)]="password"
                      name="password"
                      autocomplete="new-password"
                      required
                    ></ion-input>

                    <button
                      class="password-toggle"
                      type="button"
                      (click)="togglePassword()"
                    >
                      {{ showPassword() ? 'Hide' : 'Show' }}
                    </button>
                  </ion-item>
                </div>

                <!-- CONFIRM PASSWORD -->
                <div class="input-group">
                  <label for="confirm">Confirm Password</label>

                  <ion-item class="custom-input" lines="none">
                    <ion-input
                      id="confirm"
                      [type]="showConfirm() ? 'text' : 'password'"
                      placeholder="Re-enter your password"
                      [(ngModel)]="confirm"
                      name="confirm"
                      autocomplete="new-password"
                      required
                    ></ion-input>

                    <button
                      class="password-toggle"
                      type="button"
                      (click)="toggleConfirm()"
                    >
                      {{ showConfirm() ? 'Hide' : 'Show' }}
                    </button>
                  </ion-item>
                </div>

                <!-- CREATE ACCOUNT -->
                <ion-button
                  expand="block"
                  type="submit"
                  class="register-button"
                  [disabled]="busy"
                >
                  @if (busy) {
                    <ion-spinner name="crescent"></ion-spinner>
                    <span class="button-loading">Creating account...</span>
                  } @else {
                    <span>Create Account</span>
                    <span class="button-arrow">→</span>
                  }
                </ion-button>

              </form>

              <!-- LOGIN LINK -->
              <div class="login-section">
                <span>Already have an account?</span>
                <a
                  role="button"
                  tabindex="0"
                  (click)="goToLogin()"
                  (keydown.enter)="goToLogin()"
                >
                  Sign in
                </a>
              </div>

              <!-- SECURITY NOTE -->
              <div class="security-note">
                <span>✦</span>
                <p>
                  By creating an account, you agree to use Campus Reports
                  responsibly.
                </p>
              </div>

            </div>
          </section>

          <!-- PURPLE WELCOME PANEL - RIGHT SIDE -->
          <section class="overlay-container">

            <div class="overlay">

              <div class="overlay-panel">

                <div class="brand-header">
                  <img
                    src="assets/campus-reports-logo.png"
                    alt="Campus Reports logo"
                    class="brand-logo-img" />
                </div>

                <span class="panel-eyebrow">
                  YOUR CAMPUS, YOUR VOICE
                </span>

                <h1>Hello, Welcome!</h1>

                <p>
                  Join the Campus Reports community.
                  Create an account to report concerns
                  and help make your campus better.
                </p>

                <button
                  class="ghost-button"
                  type="button"
                  (click)="goToLogin()"
                >
                  Back to Login
                </button>

              </div>

            </div>

          </section>

        </div>

      </div>

    </ion-content>
  `,

  styles: [`
    .brand-header { display: flex; align-items: center; gap: 12px; }
    .brand-logo-img { height: 42px; width: auto; max-width: 160px; object-fit: contain; }
    @media (max-width: 600px) { .brand-logo-img { height: 34px; } }


    :host {
      --purple-primary: #56318F;
      --purple-secondary: #7651B5;
      --purple-light: #D9C5FF;
      --text-dark: #302344;
      --text-muted: #8C829B;

      display: block;
      height: 100%;
    }

    * {
      box-sizing: border-box;
    }

    /* BACKGROUND */

    .register-content {
      --background: #FAF8FD;
    }

    .auth-background {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;

      background:
        radial-gradient(circle at top left, #EDE4FA, transparent 42%),
        linear-gradient(135deg, #FAF8FD, #F0EAFA);
    }

    /* MAIN CARD - SAME AS LOGIN */

    .auth-container {
      position: relative;
      width: 100%;
      max-width: 1050px;
      min-height: 760px;

      overflow: hidden;
      border-radius: 25px;

      background: #FFFFFF;

      box-shadow: 0 25px 70px rgba(48, 35, 68, .17);

      display: grid;
      grid-template-columns: 1fr 1fr;

      animation: cardEntrance .65s ease both;
    }

    @keyframes cardEntrance {
      from {
        opacity: 0;
        transform: translateY(20px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* LEFT FORM PANEL */

    .form-container {
      display: flex;
      align-items: center;
      justify-content: center;

      padding: 38px 42px;
      background: #FFFFFF;
    }

    .register-card {
      width: 100%;
      max-width: 420px;
    }

    /* MOBILE BRAND */

    .mobile-brand {
      display: none;
    }

    /* HEADING */

    .form-heading {
      margin-bottom: 23px;
    }

    .eyebrow {
      color: var(--purple-secondary);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.8px;
    }

    .form-heading h2 {
      margin: 12px 0 9px;

      color: var(--text-dark);
      font-size: 29px;
      font-weight: 800;
      letter-spacing: -.6px;

      transition: color .25s, transform .25s;
    }

    .form-heading h2:hover {
      color: var(--purple-secondary);
      transform: translateX(3px);
    }

    .form-heading p {
      margin: 0;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.7;
    }

    /* INPUT GROUPS */

    .input-group {
      margin-bottom: 15px;
      min-width: 0;
    }

    .input-group label {
      display: block;
      margin-bottom: 8px;

      color: var(--text-dark);
      font-size: 12px;
      font-weight: 700;

      transition: color .25s, transform .25s;
    }

    .input-group:focus-within label {
      color: var(--purple-secondary);
      transform: translateX(3px);
    }

    /* CUSTOM INPUT */

    .custom-input {
      --background: #FFFFFF;
      --border-radius: 11px;
      --padding-start: 14px;
      --padding-end: 12px;
      --min-height: 49px;

      border: 1px solid #E9E1F3;
      border-radius: 11px;

      transition:
        border-color .25s,
        box-shadow .25s,
        transform .25s;
    }

    .custom-input:hover {
      border-color: #CBB8E7;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(86,49,143,.07);
    }

    .custom-input:focus-within {
      border-color: var(--purple-secondary);

      box-shadow:
        0 0 0 3px rgba(118,81,181,.12),
        0 5px 14px rgba(86,49,143,.08);

      transform: translateY(-2px);
    }

    ion-input,
    ion-select {
      --color: var(--text-dark);
      --placeholder-color: #AAA0B7;
      --placeholder-opacity: 1;

      font-size: 12px;
    }

    /* ACCOUNT TYPE */

    .role-group {
      margin-bottom: 19px;
    }

    .role-segment {
      padding: 5px;
      border-radius: 11px;

      background: #F0EAFA;
      --background: #F0EAFA;

      transition: transform .25s, box-shadow .25s;
    }

    .role-segment:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 14px rgba(86,49,143,.10);
    }

    .role-segment ion-segment-button {
      min-height: 39px;
      border-radius: 9px;

      --indicator-color: #FFFFFF;
      --color: #82798D;
      --color-checked: #56318F;

      font-size: 12px;
      font-weight: 700;

      transition: transform .2s;
    }

    .role-segment ion-segment-button:hover {
      transform: scale(1.03);
    }

    .role-segment ion-segment-button:active {
      transform: scale(.96);
    }

    /* PASSWORD BUTTON */

    .password-toggle {
      border: 0;
      border-radius: 7px;

      padding: 8px 10px;

      background: #F0EAFA;
      color: var(--purple-secondary);

      font-size: 11px;
      font-weight: 750;

      cursor: pointer;

      transition:
        background .2s,
        color .2s,
        transform .2s;
    }

    .password-toggle:hover {
      background: var(--purple-primary);
      color: #FFFFFF;
      transform: scale(1.07);
    }

    .password-toggle:active {
      transform: scale(.93);
    }

    /* REGISTER BUTTON */

    .register-button {
      --background: var(--purple-primary);
      --background-hover: var(--purple-secondary);
      --background-activated: #452773;
      --border-radius: 11px;
      --box-shadow: 0 7px 16px rgba(86,49,143,.2);
      --color: #FFFFFF;

      width: 100%;
      min-height: 52px;
      margin: 10px 0 0;

      font-size: 13px;
      font-weight: 750;
      text-transform: none;

      transition: transform .25s, filter .25s;
    }

    .register-button::part(native) {
      min-height: 52px;
      transition: transform .2s, filter .2s;
    }

    .register-button:not([disabled]):hover {
      transform: translateY(-3px);
      filter: brightness(1.08);
    }

    .register-button:not([disabled]):active {
      transform: scale(.97);
    }

    .register-button[disabled] {
      opacity: .6;
    }

    .button-arrow {
      display: inline-block;
      margin-left: 10px;
      font-size: 19px;

      transition: transform .25s;
    }

    .register-button:not([disabled]):hover .button-arrow {
      transform: translateX(5px);
    }

    .button-loading {
      margin-left: 10px;
    }

    /* LOGIN LINK */

    .login-section {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 5px;

      margin-top: 21px;

      color: var(--text-muted);
      font-size: 11px;
    }

    .login-section a {
      color: var(--purple-primary);
      font-weight: 750;
      text-decoration: none;
      cursor: pointer;

      transition: color .2s, transform .2s;
    }

    .login-section a:hover {
      color: var(--purple-secondary);
      text-decoration: underline;
      transform: translateY(-2px);
    }

    /* SECURITY NOTE */

    .security-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      margin-top: 25px;
      padding: 13px;

      border-radius: 11px;
      background: #F0EAFA;

      transition: transform .25s, background .25s;
    }

    .security-note:hover {
      transform: translateY(-2px);
      background: #EAE0F8;
    }

    .security-note span {
      color: var(--purple-secondary);
    }

    .security-note p {
      margin: 0;
      color: #796B8C;
      font-size: 10px;
      line-height: 1.5;
    }

    /* RIGHT PURPLE PANEL */

    .overlay-container {
      position: relative;
      min-height: 100%;

      overflow: hidden;

      background: linear-gradient(
        145deg,
        #56318F,
        #7651B5 65%,
        #8D6AC6
      );

      color: #FFFFFF;
    }

    .overlay-container::before,
    .overlay-container::after {
      content: '';
      position: absolute;

      width: 400px;
      height: 400px;

      border: 1px solid rgba(255,255,255,.10);
      border-radius: 50%;

      transition: transform .5s;
    }

    .overlay-container::before {
      top: 10%;
      right: -190px;
    }

    .overlay-container::after {
      top: 22%;
      right: -110px;
      width: 270px;
      height: 270px;
    }

    .overlay-container:hover::before {
      transform: scale(1.07);
    }

    .overlay-container:hover::after {
      transform: scale(1.1);
    }

    .overlay-panel {
      position: relative;
      z-index: 2;

      min-height: 100%;
      padding: 45px;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;

      text-align: center;
    }

    .overlay-panel .brand-header {
      margin-bottom: 22px;
      padding: 6px 10px;
      border-radius: 14px;
      background: #ffffff;
    }

    .panel-logo {
      width: 62px;
      height: 62px;

      display: grid;
      place-items: center;

      margin-bottom: 25px;

      border-radius: 17px;

      background: rgba(255,255,255,.17);
      border: 1px solid rgba(255,255,255,.25);

      font-size: 20px;
      font-weight: 900;
      letter-spacing: 1px;

      transition: transform .3s, background .3s;
    }

    .panel-logo:hover {
      transform: rotate(-6deg) scale(1.08);
      background: rgba(255,255,255,.28);
    }

    .panel-eyebrow {
      color: #DFD0F7;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.8px;
    }

    .overlay-panel h1 {
      margin: 16px 0;

      font-size: clamp(28px, 3vw, 40px);
      font-weight: 800;

      transition: transform .25s;
    }

    .overlay-panel h1:hover {
      transform: translateY(-3px);
    }

    .overlay-panel p {
      max-width: 310px;
      margin: 0 0 30px;

      color: #E5D9F5;
      font-size: 13px;
      line-height: 1.8;
    }

    /* PURPLE PANEL BUTTON */

    .ghost-button {
      min-width: 155px;
      padding: 13px 24px;

      border: 2px solid #FFFFFF;
      border-radius: 12px;

      color: #FFFFFF;
      background: transparent;

      font-weight: 750;
      cursor: pointer;

      transition:
        background .25s,
        color .25s,
        transform .25s,
        box-shadow .25s;
    }

    .ghost-button:hover {
      background: #FFFFFF;
      color: var(--purple-primary);

      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,.15);
    }

    .ghost-button:active {
      transform: scale(.96);
    }

    /* FOCUS ACCESSIBILITY */

    button:focus-visible,
    a:focus-visible {
      outline: 3px solid rgba(118,81,181,.4);
      outline-offset: 4px;
    }

    /* TABLET */

    @media (max-width: 900px) {

      .auth-background {
        padding: 25px 15px;
      }

      .auth-container {
        min-height: 780px;
      }

      .form-container {
        padding: 30px 25px;
      }

      .overlay-panel {
        padding: 28px;
      }

      .overlay-panel h1 {
        font-size: 30px;
      }

    }

    /* MOBILE */

    @media (max-width: 650px) {

      .auth-background {
        padding: 14px;
        align-items: flex-start;
      }

      .auth-container {
        display: block;
        min-height: auto;
        overflow: visible;
        border-radius: 20px;
      }

      .form-container {
        width: 100%;
        padding: 28px 23px 35px;
      }

      .register-card {
        max-width: 440px;
        margin: auto;
      }

      .overlay-container {
        display: none;
      }

      .mobile-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 30px;
      }

      .mobile-brand .brand-logo {
        width: 42px;
        height: 42px;

        display: grid;
        place-items: center;

        border-radius: 12px;

        color: #FFFFFF;
        background: var(--purple-primary);

        font-weight: 800;
      }

      .mobile-brand strong {
        color: var(--text-dark);
        font-size: 16px;
      }

      .form-heading h2 {
        font-size: 25px;
      }

      .security-note {
        margin-top: 24px;
      }

    }

    /* SMALL MOBILE */

    @media (max-width: 360px) {

      .form-container {
        padding: 22px 16px 30px;
      }

      .form-heading h2 {
        font-size: 22px;
      }

    }

    /* TOUCH DEVICES */

    @media (hover: none) {

      .custom-input:hover,
      .register-button:not([disabled]):hover,
      .ghost-button:hover,
      .password-toggle:hover {
        transform: none;
      }

      .custom-input:active {
        transform: scale(.99);
        border-color: var(--purple-secondary);
      }

      .register-button:not([disabled]):active,
      .ghost-button:active {
        transform: scale(.96);
      }

    }

    /* REDUCED MOTION */

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

export class RegisterPage implements OnInit {

  private auth = inject(AuthService);
  private router = inject(Router);
  private feedback = inject(FeedbackService);

  role = signal<'faculty' | 'staff'>('faculty');

  departments = signal<Department[]>([]);

  busy = false;

  showPassword = signal(false);
  showConfirm = signal(false);

  name = '';
  email = '';
  employeeId = '';
  departmentId: number | null = null;
  password = '';
  confirm = '';

  async ngOnInit() {
    try {
      this.departments.set(await this.auth.getDepartments());
    } catch (e: any) {
      await this.feedback.toast(
        e.message ?? 'Could not load departments.'
      );
    }
  }

  onRoleChange(value: string | number | undefined) {
    this.role.set(value === 'staff' ? 'staff' : 'faculty');

    if (this.role() === 'faculty') {
      this.departmentId = null;
    }
  }

  togglePassword() {
    this.showPassword.update(value => !value);
  }

  toggleConfirm() {
    this.showConfirm.update(value => !value);
  }

  goToLogin() {
    this.router.navigateByUrl('/login');
  }

  async register() {

    if (this.busy) return;

    if (
      !this.name.trim() ||
      !this.email.trim() ||
      !this.employeeId.trim()
    ) {
      await this.feedback.toast(
        'Please complete all required fields.'
      );
      return;
    }

    if (this.password.length < 6) {
      await this.feedback.toast(
        'Password must be at least 6 characters.'
      );
      return;
    }

    if (this.password !== this.confirm) {
      await this.feedback.toast(
        'Passwords do not match.'
      );
      return;
    }

    if (
      this.role() === 'staff' &&
      this.departmentId === null
    ) {
      await this.feedback.toast(
        'Please select your department.'
      );
      return;
    }

    this.busy = true;

    try {

      await this.auth.register({
        name: this.name.trim(),
        email: this.email.trim(),
        employee_id: this.employeeId.trim(),
        password: this.password,
        role: this.role(),
        department_id: this.departmentId,
      });

      await this.feedback.toast(
        'Account created. Welcome!',
        'success'
      );

      await this.router.navigateByUrl('/home', {
        replaceUrl: true,
      });

    } catch (e: any) {

      await this.feedback.toast(
        e.message ?? 'Registration failed.'
      );

    } finally {
      this.busy = false;
    }
  }

}
