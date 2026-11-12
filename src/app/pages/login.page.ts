
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonItem,
  IonSpinner,
} from '@ionic/angular';

import { AuthService } from '../services/auth.service';
import { FeedbackService } from '../services/feedback.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonInput,
    IonItem,
    IonSpinner,
  ],
  template: `
    <ion-content [fullscreen]="true" class="login-content">
      <div class="auth-background">
        <div class="auth-container" [class.register-mode]="registerMode">

          <!-- LOGIN FORM -->
          <section class="form-container login-container">
            <div class="login-card">

              <div class="mobile-brand">
                <div class="brand-logo">CR</div>
                <strong>Campus Reports</strong>
              </div>

              <div class="form-heading">
                <span class="eyebrow">WELCOME BACK</span>
                <h2>Sign in to your account</h2>
                <p>Enter your faculty credentials to continue.</p>
              </div>

              <form (ngSubmit)="login()">
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
                      required>
                    </ion-input>
                  </ion-item>
                </div>

                <div class="input-group">
                  <label for="password">Password</label>
                  <ion-item class="custom-input" lines="none">
                    <ion-input
                      id="password"
                      [type]="showPassword ? 'text' : 'password'"
                      placeholder="Enter your password"
                      [(ngModel)]="password"
                      name="password"
                      autocomplete="current-password"
                      required>
                    </ion-input>

                    <button
                      class="password-toggle"
                      type="button"
                      (click)="togglePassword()"
                      [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'">
                      {{ showPassword ? 'Hide' : 'Show' }}
                    </button>
                  </ion-item>
                </div>

                <a class="forgot-password" routerLink="/forgot-password">
                  Forgot Password?
                </a>

                <ion-button
                  expand="block"
                  type="submit"
                  class="login-button"
                  [disabled]="busy || !email.trim() || !password">

                  @if (busy) {
                    <ion-spinner name="crescent"></ion-spinner>
                    <span class="button-loading">Signing in...</span>
                  } @else {
                    <span>Sign In</span>
                    <span class="button-arrow">→</span>
                  }

                </ion-button>
              </form>

              <div class="register-section">
                <span>Don't have an account?</span>
                <a routerLink="/register">Create an account</a>
              </div>

              <div class="security-note">
                <span>✦</span>
                <p>Secure access for authorized faculty members.</p>
              </div>

            </div>
          </section>

          <!-- SLIDING WELCOME PANEL -->
          <section class="overlay-container">
            <div class="overlay">

              <div class="overlay-panel overlay-left">
                <div class="panel-logo">CR</div>

                <h1>Welcome Back!</h1>

                <p>
                  Sign in to continue submitting concerns
                  and tracking campus reports.
                </p>

                <button
                  class="ghost-button"
                  type="button"
                  (click)="togglePanel()">
                  Back to Login
                </button>
              </div>

              <div class="overlay-panel overlay-right">
                <div class="panel-logo">CR</div>

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
                  (click)="goToRegister()">
                  Create Account
                </button>
              </div>

            </div>
          </section>

          <!-- MOBILE REGISTER LINK -->
          <div class="mobile-switch">
            <span>Don't have an account?</span>
            <a routerLink="/register">Create an account</a>
          </div>

        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --purple-primary: #56318f;
      --purple-secondary: #7651b5;
      --purple-light: #d9c5ff;
      --text-dark: #302344;
      --text-muted: #8c829b;
      display: block;
      height: 100%;
    }

    .login-content {
      --background: #faf8fd;
    }

    .auth-background {
      min-height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      box-sizing: border-box;
      background:
        radial-gradient(circle at top left, #ede4fa, transparent 42%),
        linear-gradient(135deg, #faf8fd, #f0eafa);
    }

    .auth-container {
      position: relative;
      width: 100%;
      max-width: 1050px;
      min-height: 640px;
      overflow: hidden;
      border-radius: 25px;
      background: #fff;
      box-shadow: 0 25px 70px rgba(48, 35, 68, .17);
    }

    /* LOGIN FORM */

    .form-container {
      position: absolute;
      inset: 0 auto 0 0;
      width: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 42px;
      box-sizing: border-box;
      transition: transform .7s ease, opacity .45s ease;
    }

    .login-container {
      z-index: 2;
    }

    .login-card {
      width: 100%;
      max-width: 390px;
      animation: cardEntrance .65s ease both;
    }

    .mobile-brand {
      display: none;
    }

    .form-heading {
      margin-bottom: 32px;
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
    }

    .form-heading p {
      margin: 0;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.7;
    }

    /* INPUTS */

    .input-group {
      margin-bottom: 21px;
    }

    .input-group label {
      display: block;
      margin-bottom: 9px;
      color: var(--text-dark);
      font-size: 12px;
      font-weight: 700;
      transition: color .25s ease, transform .25s ease;
    }

    .input-group:focus-within label {
      color: var(--purple-secondary);
      transform: translateX(3px);
    }

    .custom-input {
      --background: #fff;
      --border-radius: 11px;
      --padding-start: 14px;
      --padding-end: 12px;
      --min-height: 53px;

      border: 1px solid #e9e1f3;
      border-radius: 11px;

      transition:
        border-color .25s,
        box-shadow .25s,
        transform .25s;
    }

    .custom-input:hover {
      border-color: #cbb8e7;
      transform: translateY(-2px);
    }

    .custom-input:focus-within {
      border-color: var(--purple-secondary);
      box-shadow:
        0 0 0 3px rgba(118,81,181,.12),
        0 5px 14px rgba(86,49,143,.08);
      transform: translateY(-2px);
    }

    ion-input {
      --color: var(--text-dark);
      --placeholder-color: #aaa0b7;
      --placeholder-opacity: 1;
      font-size: 12px;
    }

    /* PASSWORD TOGGLE */

    .password-toggle {
      border: 0;
      background: transparent;
      color: var(--purple-secondary);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      padding: 8px;
      transition: transform .2s;
    }

    .password-toggle:hover {
      transform: scale(1.08);
    }

    /* FORGOT PASSWORD */

    .forgot-password {
      display: block;
      text-align: right;
      margin: -7px 0 17px;
      color: var(--purple-primary);
      font-size: 11px;
      text-decoration: none;
      transition: color .2s;
    }

    .forgot-password:hover {
      color: var(--purple-secondary);
      text-decoration: underline;
    }

    /* LOGIN BUTTON */

    .login-button {
      --background: var(--purple-primary);
      --background-hover: var(--purple-secondary);
      --background-activated: #452773;
      --border-radius: 11px;
      --box-shadow: 0 7px 16px rgba(86,49,143,.2);
      --color: #fff;

      width: 100%;
      min-height: 52px;
      margin-top: 8px;

      font-size: 13px;
      font-weight: 750;
      text-transform: none;

      transition: transform .25s, filter .25s;
    }

    .login-button::part(native) {
      min-height: 52px;
      transition: transform .2s, filter .2s;
    }

    .login-button:not([disabled]):hover {
      transform: translateY(-3px);
      filter: brightness(1.08);
    }

    .login-button:not([disabled]):active {
      transform: scale(.97);
    }

    .login-button[disabled] {
      opacity: .6;
    }

    .button-arrow {
      display: inline-block;
      margin-left: 10px;
      font-size: 19px;
      transition: transform .25s;
    }

    .login-button:not([disabled]):hover .button-arrow {
      transform: translateX(5px);
    }

    .button-loading {
      margin-left: 10px;
    }

    /* REGISTER SECTION */

    .register-section {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 5px;
      margin-top: 25px;
      color: var(--text-muted);
      font-size: 11px;
    }

    .register-section a,
    .mobile-switch a {
      color: var(--purple-primary);
      font-weight: 750;
      text-decoration: none;
      transition: color .2s, transform .2s;
    }

    .register-section a:hover,
    .mobile-switch a:hover {
      color: var(--purple-secondary);
      text-decoration: underline;
      transform: translateY(-1px);
    }

    /* SECURITY NOTE */

    .security-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 35px;
      padding: 13px;
      border-radius: 11px;
      background: #f0eafa;
      transition: transform .25s, background .25s;
    }

    .security-note:hover {
      transform: translateY(-2px);
      background: #eae0f8;
    }

    .security-note span {
      color: var(--purple-secondary);
    }

    .security-note p {
      margin: 0;
      color: #796b8c;
      font-size: 10px;
    }

    /* SLIDING PURPLE PANEL */

    .overlay-container {
      position: absolute;
      top: 0;
      left: 50%;
      width: 50%;
      height: 100%;
      overflow: hidden;
      z-index: 10;
      transition: transform .7s ease-in-out;
    }

    .overlay {
      position: relative;
      left: -100%;
      width: 200%;
      height: 100%;
      color: #fff;
      background: linear-gradient(
        145deg,
        #56318f,
        #7651b5 65%,
        #8d6ac6
      );
      transition: transform .7s ease-in-out;
    }

    .overlay-panel {
      position: absolute;
      top: 0;
      width: 50%;
      height: 100%;
      padding: 45px;
      box-sizing: border-box;

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .overlay-left {
      transform: translateX(-12%);
      transition: transform .7s;
    }

    .overlay-right {
      right: 0;
      transition: transform .7s;
    }

    .panel-logo {
      width: 58px;
      height: 58px;
      display: grid;
      place-items: center;
      margin-bottom: 22px;
      border-radius: 17px;
      background: rgba(255,255,255,.17);
      border: 1px solid rgba(255,255,255,.25);
      font-weight: 900;
      letter-spacing: 1px;
      transition: transform .3s, background .3s;
    }

    .panel-logo:hover {
      transform: rotate(-6deg) scale(1.08);
      background: rgba(255,255,255,.28);
    }

    .panel-eyebrow {
      color: #dfd0f7;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.8px;
    }

    .overlay-panel h1 {
      margin: 16px 0;
      font-size: clamp(28px, 3vw, 40px);
      font-weight: 800;
    }

    .overlay-panel p {
      max-width: 300px;
      margin: 0 0 30px;
      color: #e5d9f5;
      font-size: 13px;
      line-height: 1.8;
    }

    /* PANEL BUTTON */

    .ghost-button {
      min-width: 155px;
      padding: 13px 24px;
      border: 2px solid #fff;
      border-radius: 12px;
      color: #fff;
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
      background: #fff;
      color: var(--purple-primary);
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(0,0,0,.15);
    }

    .ghost-button:active {
      transform: scale(.96);
    }

    /* ANIMATION STATES */

    .auth-container.register-mode .overlay-container {
      transform: translateX(-100%);
    }

    .auth-container.register-mode .overlay {
      transform: translateX(50%);
    }

    .auth-container.register-mode .overlay-left {
      transform: translateX(0);
    }

    .auth-container.register-mode .overlay-right {
      transform: translateX(12%);
    }

    .mobile-switch {
      display: none;
    }

    /* ENTRANCE ANIMATION */

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

    /* TABLET */

    @media (max-width: 900px) {
      .form-container {
        padding: 30px;
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
      }

      .auth-container {
        min-height: 650px;
        border-radius: 20px;
      }

      .form-container {
        width: 100%;
        padding: 28px 23px 65px;
      }

      .overlay-container {
        display: none;
      }

      .mobile-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 42px;
      }

      .mobile-brand .brand-logo {
        width: 42px;
        height: 42px;
        display: grid;
        place-items: center;
        border-radius: 12px;
        color: #fff;
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

      .mobile-switch {
        position: absolute;
        bottom: 18px;
        left: 0;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        z-index: 5;
        color: var(--text-muted);
        font-size: 11px;
      }

      .security-note {
        margin-top: 28px;
      }
    }

    /* SMALL MOBILE */

    @media (max-width: 360px) {
      .form-container {
        padding: 22px 16px 65px;
      }

      .mobile-brand {
        margin-bottom: 32px;
      }

      .form-heading h2 {
        font-size: 22px;
      }

      .security-note {
        padding: 10px;
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
export class LoginPage {

  private auth = inject(AuthService);
  private router = inject(Router);
  private feedback = inject(FeedbackService);

  email = '';
  password = '';
  busy = false;
  showPassword = false;
  registerMode = false;
  currentYear = new Date().getFullYear();

  togglePanel() {
    this.registerMode = !this.registerMode;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  async goToRegister() {
    await this.router.navigateByUrl('/register');
  }

  async login() {
    if (!this.email.trim() || !this.password) {
      await this.feedback.toast(
        'Please enter your email and password.'
      );
      return;
    }

    if (this.busy) return;

    this.busy = true;

    try {
      await this.auth.login(
        this.email.trim(),
        this.password
      );

      await this.router.navigateByUrl('/home', {
        replaceUrl: true
      });

    } catch (e: any) {
      await this.feedback.toast(
        e?.message ?? 'Login failed. Please check your credentials.'
      );

    } finally {
      this.busy = false;
    }
  }
}
