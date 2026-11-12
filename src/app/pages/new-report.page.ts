
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';

import { CampusLocation, RequestCategory } from '../models/request.model';
import { NewRequestForm, RequestService } from '../services/request.service';
import { FeedbackService } from '../services/feedback.service';
import {
  DeviceService,
  GpsStatus,
  PhotoSource,
} from '../services/device.service';
import { SearchablePickerComponent } from '../components/searchable-picker.component';
import {
  WORKING_QUALITY,
  resizeDataUrlToBase64,
  resizeImageToBase64,
  stampPhoto,
} from '../utils/photo.util';

type GpsState = 'idle' | 'loading' | GpsStatus;

@Component({
  selector: 'app-new-report',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonList,
    IonTextarea,
    IonTitle,
    IonToolbar,
    SearchablePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">
        <ion-title>New Report</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">

      <div class="page-heading">
        <span class="eyebrow">FACULTY PORTAL</span>
        <h1>Submit a Report</h1>
        <p>
          Provide the details below to report a campus issue or facility concern.
        </p>
      </div>

      <div class="intro-card">
        <div class="intro-icon">📝</div>
        <div>
          <h3>Report a Campus Issue</h3>
          <p>
            Fill in the information accurately so the appropriate team can assist you.
          </p>
        </div>
      </div>

      <!-- REQUEST INFORMATION -->
      <div class="form-card">
        <div class="section-heading">
          <div class="section-icon">📋</div>
          <div>
            <h2>Request Information</h2>
            <p>Tell us about the problem.</p>
          </div>
        </div>

        <ion-list class="form-list">

          <ion-item lines="none" class="form-item">
            <ion-input
              label="Report Title"
              labelPlacement="floating"
              placeholder="e.g. Projector not working"
              maxlength="80"
              [(ngModel)]="title"
              [disabled]="busy">
            </ion-input>
          </ion-item>

          <div class="picker-wrapper">
            <app-searchable-picker
              #categoryPicker
              label="Category"
              placeholder="Type to search, e.g. Electrical"
              [items]="categories"
              [selectedId]="categoryId"
              [disabled]="busy"
              (selectedChange)="categoryId = $event"
            />
          </div>

          <div class="picker-wrapper">
            <app-searchable-picker
              #locationPicker
              label="Location"
              placeholder="Type to search, e.g. Room 101"
              [items]="locations"
              [selectedId]="locationId"
              [allowCreate]="true"
              addNoun="location"
              [disabled]="busy || addingLocation"
              (selectedChange)="categoryId !== null && (locationId = $event)"
              (created)="addLocation($event)"
            />
          </div>

          <ion-item lines="none" class="form-item description-item">
            <ion-textarea
              label="Description"
              labelPlacement="floating"
              placeholder="Describe the issue and provide any important details..."
              [rows]="5"
              [counter]="true"
              maxlength="500"
              [(ngModel)]="description"
              [disabled]="busy">
            </ion-textarea>
          </ion-item>

        </ion-list>
      </div>

      <!-- DEVICE LOCATION -->
      <div class="form-card">
        <div class="section-heading">
          <div class="section-icon">📍</div>
          <div>
            <h2>Device Location</h2>
            <p>Optional GPS coordinates for your report.</p>
          </div>
        </div>

        <div class="gps-box">

          <div class="gps-status">
            <span
              class="gps-indicator"
              [class.gps-active]="gpsState === 'granted'"
              [class.gps-loading]="gpsState === 'loading'">
            </span>

            <span class="gps-status-label">
              {{
                gpsState === 'granted'
                  ? 'Location detected'
                  : gpsState === 'loading'
                    ? 'Detecting location'
                    : 'Location information'
              }}
            </span>
          </div>

          <p class="gps-text">{{ gpsText }}</p>

          <ion-button
            expand="block"
            fill="outline"
            class="gps-button responsive-button"
            [disabled]="busy || gpsState === 'loading'"
            (click)="refreshLocation()">

            {{
              gpsState === 'loading'
                ? 'Getting Location...'
                : '📍 Try GPS Again'
            }}

          </ion-button>

        </div>
      </div>

      <!-- BEFORE PHOTO -->
      <div class="form-card">
        <div class="section-heading">
          <div class="section-icon">📷</div>
          <div>
            <h2>Before Photo</h2>
            <p>Attach a photo showing the reported problem.</p>
          </div>
        </div>

        <div class="photo-box">

          <div class="photo-required">
            <span>PHOTO EVIDENCE</span>
            <span class="required-label">REQUIRED</span>
          </div>

          @if (photoPreview) {
            <div class="preview-container">
              <img
                class="photo-preview"
                [src]="photoPreview"
                alt="Before photo preview" />

              <div class="preview-caption">
                Photo ready for submission
              </div>
            </div>
          } @else {
            <div class="photo-placeholder">
              <div class="placeholder-icon">📸</div>
              <h3>No Photo Selected</h3>
              <p>
                Take a picture or choose an existing photo from your device.
              </p>
            </div>
          }

          <input
            #cameraInput
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            (change)="onPhotoPicked($event)" />

          <input
            #galleryInput
            type="file"
            accept="image/*"
            hidden
            (change)="onPhotoPicked($event)" />

          <ion-button
            expand="block"
            class="camera-button responsive-button"
            [disabled]="busy || stamping"
            (click)="openPhoto('camera')">

            📷 Take Photo

          </ion-button>

          <ion-button
            expand="block"
            fill="outline"
            class="gallery-button responsive-button"
            [disabled]="busy || stamping"
            (click)="openPhoto('gallery')">

            🖼 Choose from Gallery

          </ion-button>

          @if (stamping) {
            <div class="stamp-notice">
              Preparing photo stamp...
            </div>
          } @else if (photoPreview) {
            <div class="stamp-notice success-notice">
              ✓ Photo timestamp and available GPS information have been stamped.
            </div>
          }

        </div>
      </div>

      <!-- SUBMIT -->
      <div class="submit-section">

        <ion-button
          expand="block"
          class="submit-button responsive-button"
          [disabled]="busy || stamping"
          (click)="submit()">

          {{
            busy
              ? 'Working...'
              : stamping
                ? 'Adding Stamp...'
                : 'Submit Report'
          }}

        </ion-button>

        <p>
          Your report will be sent to the campus administration for review.
        </p>

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

    .page-heading {
      margin: 8px 0 20px;
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
      line-height: 1.6;
      margin: 0;
    }

    /* INTRO CARD */

    .intro-card {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 16px;
      margin-bottom: 18px;
      border-radius: 16px;
      background: linear-gradient(
        135deg,
        #56318f,
        #7651b5,
        #8c6ac5
      );
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.15);
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }

    .intro-icon {
      width: 43px;
      height: 43px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border-radius: 13px;
      background: rgba(255, 255, 255, 0.18);
      font-size: 21px;
    }

    .intro-card h3 {
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 5px;
    }

    .intro-card p {
      color: #eee5fb;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }

    /* FORM CARDS */

    .form-card {
      background: #ffffff;
      border: 1px solid #eee8f5;
      border-radius: 18px;
      padding: 17px;
      margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(65, 39, 100, 0.05);
      transition:
        transform 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease;
    }

    .section-heading {
      display: flex;
      align-items: center;
      gap: 11px;
      margin-bottom: 17px;
    }

    .section-icon {
      width: 39px;
      height: 39px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: var(--lavender);
      font-size: 18px;
      flex-shrink: 0;
    }

    .section-heading h2 {
      color: var(--text-dark);
      font-size: 15px;
      font-weight: 800;
      margin: 0 0 4px;
    }

    .section-heading p {
      color: var(--text-muted);
      font-size: 12px;
      margin: 0;
    }

    .form-list {
      background: transparent;
      padding: 0;
    }

    /* INPUT FIELDS */

    .form-item {
      --background: #faf8fd;
      --color: var(--text-dark);
      --border-color: #eee8f5;
      --border-radius: 11px;
      --padding-start: 13px;
      --inner-padding-end: 13px;

      margin-bottom: 13px;
      border: 1px solid #eee8f5;
      border-radius: 11px;
      cursor: text;

      transition:
        transform 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease,
        background-color 0.22s ease;
    }

    .form-item ion-input,
    .form-item ion-textarea {
      --color: var(--text-dark);
      --placeholder-color: #a49aaf;
      --highlight-color-focused: var(--purple-secondary);
      font-size: 14px;
      transition: transform 0.2s ease, color 0.2s ease;
    }

    .form-item:focus-within {
      transform: translateY(-2px);
      border-color: var(--purple-secondary);
      box-shadow: 0 0 0 3px rgba(118, 81, 181, 0.13);
      --background: #ffffff;
    }

    .form-item:focus-within ion-input,
    .form-item:focus-within ion-textarea {
      transform: translateX(2px);
    }

    .description-item {
      margin-top: 4px;
    }

    /* SEARCHABLE PICKERS */

    .picker-wrapper {
      margin-bottom: 13px;
      border-radius: 12px;
      cursor: pointer;

      transition:
        transform 0.22s ease,
        box-shadow 0.22s ease;
    }

    .picker-wrapper:hover,
    .picker-wrapper:focus-within {
      transform: translateY(-2px);
      box-shadow: 0 5px 14px rgba(86, 49, 143, 0.10);
    }

    .picker-wrapper:focus-within {
      outline: 2px solid rgba(118, 81, 181, 0.45);
      outline-offset: 2px;
    }

    app-searchable-picker {
      display: block;
      transition: transform 0.2s ease, opacity 0.2s ease;
    }

    app-searchable-picker:active {
      transform: scale(0.995);
    }

    /* GPS */

    .gps-box {
      padding: 15px;
      border-radius: 13px;
      background: #faf8fd;
      border: 1px solid #eee8f5;

      transition:
        transform 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease;
    }

    .gps-status {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
    }

    .gps-indicator {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #a49aaf;
    }

    .gps-active {
      background: #2e9b68;
      box-shadow: 0 0 0 4px rgba(46, 155, 104, 0.12);
    }

    .gps-loading {
      background: #e6a23c;
      animation: gps-pulse 1s infinite;
    }

    .gps-status-label {
      color: var(--text-dark);
      font-size: 12px;
      font-weight: 800;
    }

    .gps-text {
      color: var(--text-muted);
      font-size: 13px;
      line-height: 1.6;
      margin: 0 0 13px;
      overflow-wrap: anywhere;
    }

    @keyframes gps-pulse {
      0%, 100% {
        opacity: 1;
        transform: scale(1);
      }

      50% {
        opacity: 0.5;
        transform: scale(1.25);
      }
    }

    /* PHOTO */

    .photo-box {
      padding: 14px;
      background: #faf8fd;
      border: 1px solid #eee8f5;
      border-radius: 13px;

      transition:
        transform 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease;
    }

    .photo-required {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 13px;
    }

    .photo-required span:first-child {
      color: var(--purple-primary);
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
    }

    .required-label {
      color: #c34b65;
      background: #fcebf0;
      border-radius: 6px;
      padding: 5px 8px;
      font-size: 9px;
      font-weight: 800;
    }

    .photo-placeholder {
      text-align: center;
      padding: 26px 15px;
      margin-bottom: 12px;
      background: #ffffff;
      border: 1px dashed #cbb8e7;
      border-radius: 12px;

      transition:
        transform 0.22s ease,
        border-color 0.22s ease,
        box-shadow 0.22s ease;
    }

    .placeholder-icon {
      font-size: 35px;
      margin-bottom: 8px;
      transition: transform 0.22s ease;
    }

    .photo-placeholder h3 {
      color: var(--text-dark);
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 6px;
    }

    .photo-placeholder p {
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }

    .preview-container {
      margin-bottom: 12px;
      overflow: hidden;
      border-radius: 12px;
      background: #ffffff;
      border: 1px solid #eee8f5;

      animation: preview-enter 0.3s ease;
      transition: transform 0.22s ease, box-shadow 0.22s ease;
    }

    .photo-preview {
      display: block;
      width: 100%;
      max-height: 280px;
      object-fit: contain;
      background: #f2eef7;
    }

    .preview-caption {
      color: var(--purple-primary);
      font-size: 11px;
      font-weight: 700;
      padding: 10px;
    }

    .stamp-notice {
      color: var(--text-muted);
      font-size: 11px;
      line-height: 1.5;
      margin-top: 12px;
      text-align: center;
      animation: preview-enter 0.25s ease;
    }

    .success-notice {
      color: #27845a;
    }

    @keyframes preview-enter {
      from {
        opacity: 0;
        transform: translateY(7px);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* BUTTONS */

    .submit-section {
      margin: 20px 0 12px;
    }

    .submit-section p {
      color: var(--text-muted);
      font-size: 11px;
      line-height: 1.5;
      text-align: center;
      margin: 11px 10px;
    }

    .responsive-button {
      display: block;
      width: 100%;
      max-width: 100%;
      min-height: 48px;
      margin: 10px 0 0;

      font-size: 14px;
      font-weight: 700;
      text-transform: none;

      --border-radius: 12px;
      --transition:
        background-color 0.2s ease,
        transform 0.2s ease,
        opacity 0.2s ease;
      --box-shadow: none;

      position: relative;
      overflow: hidden;
      transform: translateY(0) scale(1);

      transition:
        transform 0.18s ease,
        box-shadow 0.18s ease,
        filter 0.18s ease,
        opacity 0.18s ease;

      -webkit-tap-highlight-color: transparent;
    }

    .gps-button {
      --color: var(--purple-primary);
      --border-color: #cbb8e7;
      --border-width: 1px;
      --border-style: solid;
      font-size: 13px;
    }

    .camera-button {
      --background: var(--purple-primary);
      --background-hover: #452574;
      --background-activated: #432570;
      --color: #ffffff;
    }

    .gallery-button {
      --background: #ffffff;
      --background-hover: #f2ecfb;
      --background-activated: #ede4fa;
      --color: var(--purple-primary);
      --border-color: #cbb8e7;
      --border-width: 1px;
      --border-style: solid;
    }

    .submit-button {
      min-height: 52px;
      --background: var(--purple-primary);
      --background-hover: #452574;
      --background-activated: #432570;
      --background-focused: #452574;
      --color: #ffffff;
      --border-radius: 13px;
      --box-shadow: 0 5px 13px rgba(86, 49, 143, 0.17);
      font-size: 15px;
      font-weight: 800;
    }

    .responsive-button:hover:not([disabled]) {
      transform: translateY(-2px);
      filter: brightness(1.035);
      --box-shadow: 0 7px 16px rgba(86, 49, 143, 0.18);
    }

    .responsive-button:active:not([disabled]) {
      transform: translateY(1px) scale(0.97);
      filter: brightness(0.96);
      --box-shadow: 0 2px 6px rgba(86, 49, 143, 0.12);
    }

    .responsive-button:focus-visible {
      outline: 3px solid rgba(118, 81, 181, 0.38);
      outline-offset: 3px;
    }

    .responsive-button[disabled] {
      opacity: 0.5;
      transform: none;
      filter: none;
      cursor: not-allowed;
      --box-shadow: none;
    }

    /* OTHER CLICKABLE ELEMENTS */

    button,
    a,
    input,
    textarea,
    select,
    [role="button"],
    [role="option"],
    [tabindex]:not([tabindex="-1"]) {
      transition:
        transform 0.18s ease,
        color 0.18s ease,
        border-color 0.18s ease,
        background-color 0.18s ease,
        box-shadow 0.18s ease;

      -webkit-tap-highlight-color: transparent;
    }

    button:active:not(:disabled),
    a:active,
    [role="button"]:active,
    [role="option"]:active {
      transform: scale(0.97);
    }

    button:focus-visible,
    a:focus-visible,
    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible,
    [role="button"]:focus-visible,
    [role="option"]:focus-visible,
    [tabindex]:not([tabindex="-1"]):focus-visible {
      outline: 2px solid rgba(118, 81, 181, 0.55);
      outline-offset: 2px;
    }

    .photo-placeholder:hover,
    .preview-container:hover,
    .gps-box:hover {
      border-color: #d8c8ee;
      box-shadow: 0 5px 15px rgba(86, 49, 143, 0.07);
    }

    .photo-placeholder:hover .placeholder-icon {
      transform: translateY(-3px) scale(1.05);
    }

    .photo-placeholder:active {
      transform: scale(0.99);
    }

    .form-card:hover {
      box-shadow: 0 7px 20px rgba(65, 39, 100, 0.075);
    }

    /* TABLET AND DESKTOP */

    @media (min-width: 768px) {
      .page-content {
        --padding-start: 28px;
        --padding-end: 28px;
      }

      .page-heading,
      .intro-card,
      .form-card,
      .submit-section {
        max-width: 850px;
        margin-left: auto;
        margin-right: auto;
      }

      .intro-card {
        margin-bottom: 18px;
      }

      .form-card {
        margin-bottom: 16px;
      }

      .submit-section {
        margin-top: 20px;
      }

      .responsive-button {
        min-height: 48px;
        font-size: 14px;
      }
    }

    /* MOBILE */

    @media (max-width: 600px) {
      .page-heading h1 {
        font-size: 23px;
      }

      .form-card {
        padding: 14px;
      }

      .responsive-button {
        width: 100%;
        min-height: 50px;
        font-size: 13px;
        margin-top: 10px;
        --border-radius: 11px;
      }

      .submit-button {
        min-height: 52px;
        font-size: 14px;
      }

      .gps-box,
      .photo-box {
        padding: 12px;
      }
    }

    /* EXTRA SMALL PHONES */

    @media (max-width: 360px) {
      .responsive-button {
        min-height: 48px;
        font-size: 12px;
        padding-inline: 4px;
      }

      .submit-button {
        font-size: 13px;
      }

      .form-card {
        padding: 12px;
      }
    }

    /* REDUCED MOTION ACCESSIBILITY */

    @media (prefers-reduced-motion: reduce) {
      .form-item,
      .form-item ion-input,
      .form-item ion-textarea,
      .picker-wrapper,
      app-searchable-picker,
      .responsive-button,
      .gps-box,
      .photo-box,
      .photo-placeholder,
      .preview-container,
      .intro-card,
      .form-card,
      button,
      a,
      input,
      textarea,
      select,
      [role="button"],
      [role="option"],
      [tabindex]:not([tabindex="-1"]) {
        transition: none !important;
        animation: none !important;
      }

      .responsive-button:active:not([disabled]),
      button:active:not(:disabled),
      a:active,
      [role="button"]:active,
      [role="option"]:active,
      .photo-placeholder:active {
        transform: none;
      }
    }

  `],
})

export class NewReportPage implements OnInit {

  private requests = inject(RequestService);
  private feedback = inject(FeedbackService);
  private device = inject(DeviceService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  @ViewChild('cameraInput')
  cameraInput?: ElementRef<HTMLInputElement>;

  @ViewChild('galleryInput')
  galleryInput?: ElementRef<HTMLInputElement>;

  @ViewChild('categoryPicker')
  categoryPicker?: SearchablePickerComponent;

  @ViewChild('locationPicker')
  locationPicker?: SearchablePickerComponent;

  categories: RequestCategory[] = [];
  locations: CampusLocation[] = [];

  title = '';
  categoryId: number | null = null;
  locationId: number | null = null;
  description = '';

  photoRaw: string | null = null;
  photoBase64: string | null = null;
  photoPreview: string | null = null;
  photoTakenAt: string | null = null;

  stamping = false;
  private stampSeq = 0;

  gpsState: GpsState = 'idle';
  latitude: number | null = null;
  longitude: number | null = null;

  busy = false;
  addingLocation = false;

  get gpsText(): string {
    switch (this.gpsState) {
      case 'granted':
        return this.latitude !== null && this.longitude !== null
          ? `${this.latitude.toFixed(5)}, ${this.longitude.toFixed(5)}`
          : 'Location not checked yet.';

      case 'loading':
        return 'Getting your location...';

      case 'denied':
        return 'Location permission is off. The photo can still be sent.';

      case 'timeout':
        return 'Location took too long. Try again.';

      case 'unavailable':
        return 'Location is not available. The photo can still be sent.';

      default:
        return 'Location not checked yet.';
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      const [categories, locations] = await Promise.all([
        this.requests.getCategories(),
        this.requests.getLocations(),
      ]);

      this.categories = categories ?? [];
      this.locations = locations ?? [];

      this.cdr.markForCheck();

    } catch (e: any) {
      await this.feedback.toast(
        e?.message ?? 'Could not load the form.'
      );

      this.cdr.markForCheck();
    }
  }

  async ionViewWillEnter(): Promise<void> {
    if (this.gpsState === 'idle') {
      await this.refreshLocation(false);
    }
  }

  async addLocation(name: string): Promise<void> {
    if (this.addingLocation || this.busy) return;

    this.addingLocation = true;
    this.cdr.markForCheck();

    try {
      const result = await this.requests.createLocation(name);
      const loc = result.location;

      if (!this.locations.some((l) => l.id === loc.id)) {
        this.locations = [...this.locations, loc].sort(
          (a, b) => a.name.localeCompare(b.name)
        );
      }

      this.locationId = loc.id;

      await this.feedback.toast(
        result.created
          ? `Added "${loc.name}" to the list.`
          : `"${loc.name}" is already in the list. Selected it.`,
        'success',
      );

    } catch (e: any) {
      await this.feedback.toast(
        e?.message ?? 'Could not add the location.'
      );

    } finally {
      this.addingLocation = false;
      this.cdr.markForCheck();
    }
  }

  async refreshLocation(showMessage = true): Promise<void> {
    if (this.gpsState === 'loading' || this.busy) return;

    this.gpsState = 'loading';
    this.cdr.markForCheck();

    try {
      const result = await this.device.getPosition();

      this.gpsState = result.status;

      if (result.status === 'granted') {
        this.latitude = result.latitude ?? null;
        this.longitude = result.longitude ?? null;
      } else {
        this.latitude = null;
        this.longitude = null;
      }

      this.cdr.markForCheck();

      // Update the photo stamp if a photo has already been selected.
      await this.applyStamp();

      if (showMessage) {
        if (result.status === 'granted') {
          await this.feedback.toast(
            'Your location has been detected.',
            'success'
          );
        } else {
          await this.feedback.toast(this.gpsText);
        }
      }

    } catch (e: any) {
      console.error('GPS error:', e);

      this.gpsState = 'unavailable';
      this.latitude = null;
      this.longitude = null;

      this.cdr.markForCheck();

      if (showMessage) {
        await this.feedback.toast(
          e?.message ?? 'Could not get your location. Please try again.'
        );
      }
    } finally {
      this.cdr.markForCheck();
    }
  }

  async openPhoto(source: PhotoSource): Promise<void> {
    if (this.busy || this.stamping) return;

    if (this.device.isNative()) {
      await this.pickNative(source);
      return;
    }

    const input = source === 'camera'
      ? this.cameraInput?.nativeElement
      : this.galleryInput?.nativeElement;

    input?.click();
  }

  private async pickNative(source: PhotoSource): Promise<void> {
    if (this.busy || this.stamping) return;

    this.busy = true;
    this.cdr.markForCheck();

    try {
      const pick = await this.device.pickPhotoNative(source);

      if (!pick) return;

      const base64 = await resizeDataUrlToBase64(
        pick.dataUrl,
        1280,
        WORKING_QUALITY
      );

      await this.setPhoto(base64, pick.takenAt);

    } catch (e: any) {
      await this.feedback.toast(
        e?.message ?? 'Could not add the photo.'
      );

    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  async onPhotoPicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    input.value = '';

    if (!file || this.busy || this.stamping) return;

    if (!file.type.startsWith('image/')) {
      await this.feedback.toast('Please select a valid image.');
      return;
    }

    const takenAt = new Date().toISOString();

    this.busy = true;
    this.cdr.markForCheck();

    try {
      const base64 = await resizeImageToBase64(
        file,
        1280,
        WORKING_QUALITY
      );

      await this.setPhoto(base64, takenAt);

    } catch (e: any) {
      await this.feedback.toast(
        e?.message ?? 'Could not read that photo.'
      );

    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  private async setPhoto(
    raw: string,
    takenAt: string
  ): Promise<void> {
    this.photoRaw = raw;
    this.photoTakenAt = takenAt;

    await this.applyStamp();
  }

  private async applyStamp(): Promise<void> {
    const raw = this.photoRaw;

    if (!raw) return;

    const seq = ++this.stampSeq;

    this.stamping = true;
    this.cdr.markForCheck();

    try {
      const stamped = await stampPhoto(
        raw,
        this.photoTakenAt,
        this.latitude,
        this.longitude
      );

      if (seq !== this.stampSeq) return;

      this.photoBase64 = stamped;
      this.photoPreview = 'data:image/jpeg;base64,' + stamped;

    } catch (e: any) {
      if (seq !== this.stampSeq) return;

      this.photoRaw = null;
      this.photoBase64 = null;
      this.photoPreview = null;
      this.photoTakenAt = null;

      await this.feedback.toast(
        e?.message ??
        'Could not add the stamp. Please choose the photo again.'
      );

    } finally {
      if (seq === this.stampSeq) {
        this.stamping = false;
      }

      this.cdr.markForCheck();
    }
  }

  async submit(): Promise<void> {
    if (this.busy || this.stamping) return;

    // FORM VALIDATION
    if (!this.title.trim()) {
      await this.feedback.toast('Please enter a report title.');
      return;
    }

    if (this.categoryId === null) {
      await this.feedback.toast('Please select a category.');
      return;
    }

    if (this.locationId === null) {
      await this.feedback.toast('Please select a location.');
      return;
    }

    if (!this.description.trim()) {
      await this.feedback.toast('Please enter a description.');
      return;
    }

    if (!this.photoBase64) {
      await this.feedback.toast('Please attach a photo before submitting.');
      return;
    }

    this.busy = true;
    this.cdr.markForCheck();

    try {
      const form: NewRequestForm = {
        title: this.title.trim(),
        category_id: this.categoryId,
        location_id: this.locationId,
        description: this.description.trim(),
        before_photo: this.photoBase64,
        latitude: this.latitude,
        longitude: this.longitude,
        photo_taken_at: this.photoTakenAt,
      };

      const id = await this.requests.submit(form);

      this.resetForm();

      await this.feedback.toast(
        `Request #${id} submitted.`,
        'success'
      );

      await this.router.navigateByUrl('/tabs/my-reports');

    } catch (e: any) {
      console.error('Submit report error:', e);

      await this.feedback.toast(
        e?.message ?? 'Could not submit the request.'
      );

    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  private resetForm(): void {
    this.title = '';
    this.categoryId = null;
    this.locationId = null;
    this.description = '';

    this.categoryPicker?.clear();
    this.locationPicker?.clear();

    this.stampSeq++;
    this.stamping = false;

    this.photoRaw = null;
    this.photoBase64 = null;
    this.photoPreview = null;
    this.photoTakenAt = null;

    this.gpsState = 'idle';
    this.latitude = null;
    this.longitude = null;

    this.cdr.markForCheck();
  }
}
