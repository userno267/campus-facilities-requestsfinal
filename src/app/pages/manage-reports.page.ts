
import {
  ChangeDetectorRef, Component, OnDestroy, OnInit, inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController, IonBadge, IonButton, IonButtons, IonContent,
  IonHeader, IonItem, IonLabel, IonList, IonSelect, IonSelectOption,
  IonTextarea, IonTitle, IonToolbar, IonSpinner,
} from '@ionic/angular';

import { AdminRequestService } from '../services/admin-request.service';
import { FeedbackService } from '../services/feedback.service';
import { LiveUpdateService, LiveWatcher } from '../services/live-update.service';

import {
  AdminRequestDetail, AdminRequestRow, RequestPriority,
  RequestStatus, StaffMember,
} from '../models/request.model';

import { Department } from '../models/user.model';
import { PriorityBadgeComponent } from '../components/priority-badge.component';
import { LocationMapComponent } from '../components/location-map.component';
import { PRIORITY_CHOICES } from '../utils/priority.util';

const STATUS_LABELS: Record<RequestStatus, string> = {
  submitted: 'Submitted',
  assigned: 'Assigned',
  in_progress: 'In progress',
  awaiting_proof: 'Awaiting proof',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<RequestStatus, string> = {
  submitted: 'medium',
  assigned: 'primary',
  in_progress: 'primary',
  awaiting_proof: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

interface AssignForm {
  department_id: number | null;
  staff_id: number | null;
  priority: RequestPriority | null;
  remark: string;
}

@Component({
  selector: 'app-manage-reports',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    IonBadge,
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonItem,
    IonLabel,
    IonList,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonTitle,
    IonToolbar,
    IonSpinner,
    PriorityBadgeComponent,
    LocationMapComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">

        @if (selected) {
          <ion-buttons slot="start">
            <ion-button class="back-button" (click)="backToQueue()">
              ← Back
            </ion-button>
          </ion-buttons>

          <ion-title>Request #{{ selected.id }}</ion-title>
        } @else {
          <ion-title>Manage Reports</ion-title>

          <ion-buttons slot="end">
            <ion-button
              class="refresh-button"
              (click)="loadQueue()"
              [disabled]="loading"
            >
              Refresh
            </ion-button>
          </ion-buttons>
        }

      </ion-toolbar>
    </ion-header>

    <ion-content class="page-content">

      <div class="page-wrapper">

        @if (!selected) {

          <!-- QUEUE HEADER -->
          <div class="page-heading">
            <div>
              <span class="eyebrow">ADMINISTRATION</span>
              <h1>Manage Reports</h1>
              <p>Review, assign, and monitor campus requests.</p>
            </div>

            <div class="queue-counter">
              <span class="counter-number">{{ queue.length }}</span>
              <span class="counter-label">Total requests</span>
            </div>
          </div>

          <!-- QUEUE -->
          <div class="section-heading">
            <div>
              <h2>Request Queue</h2>
              <p>Requests that need administrative attention.</p>
            </div>
          </div>

          @if (loading && queue.length === 0) {
            <div class="loading-card">
              <ion-spinner name="crescent"></ion-spinner>
              <p>Loading requests...</p>
            </div>
          } @else if (queue.length > 0) {

            <div class="request-list">

              @for (r of queue; track r.id) {
                <button
                  type="button"
                  class="request-card"
                  (click)="openRequest(r.id)"
                >
                  <div class="request-card-main">

                    <div class="request-icon">
                      <span>CR</span>
                    </div>

                    <div class="request-information">
                      <div class="request-title-row">
                        <h3>{{ r.title }}</h3>

                        <span class="request-id">
                          #{{ r.id }}
                        </span>
                      </div>

                      <p class="request-category">
                        {{ r.category_name }} · {{ r.location_name }}
                      </p>

                      <p class="request-assignment">
                        Suggested department:
                        <strong>
                          {{ departmentName(r.suggested_department_id) }}
                        </strong>
                      </p>

                      @if (r.assigned_name) {
                        <p class="request-assignment">
                          Assigned to:
                          <strong>{{ r.assigned_name }}</strong>
                        </p>
                      }
                    </div>

                    <div class="request-card-side">
                      <app-priority-badge [priority]="r.priority" />

                      <ion-badge [color]="statusColor(r.status)">
                        {{ statusLabel(r.status) }}
                      </ion-badge>

                      <span class="view-details">View details →</span>
                    </div>

                  </div>
                </button>
              }

            </div>

          } @else {
            <div class="empty-card">
              <div class="empty-icon">✓</div>
              <h3>All caught up!</h3>
              <p>No requests are currently waiting for review.</p>

              <ion-button
                fill="outline"
                class="empty-refresh"
                (click)="loadQueue()"
              >
                Refresh queue
              </ion-button>
            </div>
          }

        } @else {

          <!-- REQUEST DETAILS -->
          <div class="detail-heading">
            <div>
              <span class="eyebrow">REQUEST DETAILS</span>
              <h1>{{ selected.title }}</h1>
              <p>Review the report information and take the necessary action.</p>
            </div>

            <ion-badge [color]="statusColor(selected.status)">
              {{ statusLabel(selected.status) }}
            </ion-badge>
          </div>

          <!-- BASIC INFORMATION -->
          <section class="content-card">
            <div class="card-heading">
              <div class="heading-icon">01</div>
              <div>
                <h2>Report Information</h2>
                <p>Basic details submitted by the faculty member.</p>
              </div>
            </div>

            <div class="information-grid">
              <div class="information-item">
                <span>Request ID</span>
                <strong>#{{ selected.id }}</strong>
              </div>

              <div class="information-item">
                <span>Category</span>
                <strong>{{ selected.category_name }}</strong>
              </div>

              <div class="information-item">
                <span>Location</span>
                <strong>{{ selected.location_name }}</strong>
              </div>

              <div class="information-item">
                <span>Date reported</span>
                <strong>{{ selected.created_at | date: 'mediumDate' }}</strong>
              </div>

              <div class="information-item">
                <span>Department</span>
                <strong>{{ selected.department_name || 'Not assigned' }}</strong>
              </div>

              <div class="information-item">
                <span>Priority</span>
                <strong>
                  @if (selected.priority) {
                    <app-priority-badge [priority]="selected.priority" />
                  } @else {
                    Not set
                  }
                </strong>
              </div>
            </div>

            <div class="description-box">
              <span>Description</span>
              <p>{{ selected.description }}</p>
            </div>
          </section>

          <!-- BEFORE PHOTO -->
          <section class="content-card">
            <div class="card-heading">
              <div class="heading-icon">02</div>
              <div>
                <h2>Reported Photo</h2>
                <p>Original photo attached to the request.</p>
              </div>
            </div>

            <img
              class="report-photo"
              [src]="'data:image/jpeg;base64,' + selected.before_photo"
              alt="Before photo"
            />
          </section>

          <!-- LOCATION -->
          <section class="content-card">
            <div class="card-heading">
              <div class="heading-icon">03</div>
              <div>
                <h2>Problem Location</h2>
                <p>Location information recorded with the report.</p>
              </div>
            </div>

            <div class="location-information">
              <p>
                <strong>Photo taken:</strong>
                {{ selected.photo_taken_at
                  ? (selected.photo_taken_at | date: 'medium')
                  : 'Time not recorded' }}
              </p>

              <p>
                <strong>Coordinates:</strong>
                {{ formatCoords(selected.latitude, selected.longitude) }}
              </p>
            </div>

            <div class="map-container">
              <app-location-map
                [problemLat]="selected.latitude"
                [problemLng]="selected.longitude"
              />
            </div>
          </section>

          <!-- STAFF PROOF -->
          @if (selected.after_photo) {
            <section class="content-card">
              <div class="card-heading">
                <div class="heading-icon">04</div>
                <div>
                  <h2>Staff Completion Proof</h2>
                  <p>Photo evidence submitted by the assigned staff member.</p>
                </div>
              </div>

              @if (selected.assigned_name) {
                <p class="proof-submitted">
                  Submitted by <strong>{{ selected.assigned_name }}</strong>
                </p>
              }

              <div class="description-box">
                <span>Staff remarks</span>
                <p>{{ selected.proof_note || 'No note provided.' }}</p>
              </div>

              <div class="location-information">
                <p>
                  <strong>Photo taken:</strong>
                  {{ selected.after_photo_taken_at
                    ? (selected.after_photo_taken_at | date: 'medium')
                    : 'Time not recorded' }}
                </p>

                <p>
                  <strong>Coordinates:</strong>
                  {{ formatCoords(selected.after_latitude, selected.after_longitude) }}
                </p>
              </div>

              <img
                class="report-photo"
                [src]="'data:image/jpeg;base64,' + selected.after_photo"
                alt="After photo submitted by staff"
              />
            </section>
          }

          <!-- APPROVE OR SEND BACK -->
          @if (canComplete) {
            <section class="content-card action-card">
              <div class="card-heading">
                <div class="heading-icon">05</div>
                <div>
                  <h2>Review Completion Proof</h2>
                  <p>Approve the submitted proof or return it for corrections.</p>
                </div>
              </div>

              <div class="description-box">
                <span>Completion remark (optional)</span>
                <ion-item class="custom-input" lines="none">
                  <ion-textarea
                    [autoGrow]="true"
                    maxlength="300"
                    placeholder="For example: Checked and verified."
                    [(ngModel)]="form.remark"
                  ></ion-textarea>
                </ion-item>
              </div>

              <ion-button
                expand="block"
                class="primary-action"
                [disabled]="busy"
                (click)="confirmComplete()"
              >
                {{ busy ? 'Saving...' : '✓ Mark as Completed' }}
              </ion-button>

              <div class="action-divider"></div>

              <div class="description-box">
                <span>Reason for sending back</span>
                <ion-item class="custom-input" lines="none">
                  <ion-textarea
                    [autoGrow]="true"
                    maxlength="300"
                    placeholder="Explain what needs to be corrected."
                    [(ngModel)]="rejectRemark"
                  ></ion-textarea>
                </ion-item>
              </div>

              <ion-button
                expand="block"
                fill="outline"
                class="send-back-action"
                [disabled]="busy"
                (click)="confirmSendBack()"
              >
                Send Back to Staff
              </ion-button>
            </section>
          }

          <!-- ASSIGNMENT -->
          @if (canChange) {
            <section class="content-card action-card">
              <div class="card-heading">
                <div class="heading-icon">05</div>
                <div>
                  <h2>Assign Request</h2>
                  <p>Choose the department, staff member, and priority.</p>
                </div>
              </div>

              <div class="assignment-fields">

                <div class="assignment-field">
                  <label>Department</label>
                  <ion-item class="custom-input" lines="none">
                    <ion-select
                      placeholder="Select department"
                      interface="popover"
                      [ngModel]="form.department_id"
                      (ionChange)="setDepartment($event.detail.value)"
                    >
                      @for (d of departments; track d.id) {
                        <ion-select-option [value]="d.id">
                          {{ d.name }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                </div>

                <div class="assignment-field">
                  <label>Staff Member</label>
                  <ion-item class="custom-input" lines="none">
                    <ion-select
                      placeholder="Select staff member"
                      interface="popover"
                      [disabled]="!form.department_id"
                      [(ngModel)]="form.staff_id"
                    >
                      @for (s of staffForDepartment(); track s.id) {
                        <ion-select-option
                          [value]="s.id"
                          [disabled]="!s.is_available && s.id !== selected.assigned_to"
                        >
                          {{ s.name }} ({{ s.is_available ? 'Available' : 'Busy' }})
                        </ion-select-option>
                      } @empty {
                        <ion-select-option [value]="null" disabled>
                          No staff in this department
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                </div>

                <div class="assignment-field">
                  <label>Priority Level</label>
                  <ion-item class="custom-input" lines="none">
                    <ion-select
                      placeholder="Choose priority"
                      interface="popover"
                      [(ngModel)]="form.priority"
                    >
                      @for (p of priorityChoices; track p.value) {
                        <ion-select-option [value]="p.value">
                          {{ p.label }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                </div>

                <div class="assignment-field">
                  <label>Remark (Optional)</label>
                  <ion-item class="custom-input" lines="none">
                    <ion-textarea
                      [autoGrow]="true"
                      maxlength="300"
                      placeholder="Add instructions for the assigned staff."
                      [(ngModel)]="form.remark"
                    ></ion-textarea>
                  </ion-item>
                </div>

              </div>

              <ion-button
                expand="block"
                class="primary-action"
                [disabled]="busy || !form.department_id || !form.staff_id || !form.priority"
                (click)="submitAssign()"
              >
                {{ busy ? 'Saving...' : (selected.status === 'assigned' ? 'Reassign Request' : 'Assign Request') }}
              </ion-button>

              <ion-button
                expand="block"
                fill="outline"
                class="cancel-action"
                [disabled]="busy"
                (click)="confirmCancel()"
              >
                Cancel Request
              </ion-button>
            </section>
          }

          <!-- HISTORY -->
          <section class="content-card">
            <div class="card-heading">
              <div class="heading-icon">06</div>
              <div>
                <h2>Request History</h2>
                <p>Track the progress and status changes of this request.</p>
              </div>
            </div>

            @if (selected.events.length > 0) {
              <div class="history-list">
                @for (e of selected.events; track $index) {
                  <div class="history-item">
                    <div class="history-marker"></div>

                    <div class="history-content">
                      <div class="history-title">
                        <strong>{{ statusLabel(e.status) }}</strong>
                        <ion-badge [color]="statusColor(e.status)">
                          {{ statusLabel(e.status) }}
                        </ion-badge>
                      </div>

                      @if (e.remark) {
                        <p>{{ e.remark }}</p>
                      }

                      <span>
                        {{ e.changed_by_name }} ·
                        {{ e.changed_at | date: 'medium' }}
                      </span>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="no-history">No history available yet.</p>
            }
          </section>

        }

      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --deep-purple: #56318F;
      --royal-purple: #7651B5;
      --soft-lavender: #B99AE8;
      --pale-lavender: #EDE4FA;
      --off-white: #FAF8FD;
      display: block;
    }

    /* PAGE */

    .page-content {
      --background: #FAF8FD;
    }

    .page-toolbar {
      --background: #FAF8FD;
      --color: #30233F;
      --border-color: #E7DFEF;
      border-bottom: 1px solid #E7DFEF;
    }

    ion-title {
      font-size: 17px;
      font-weight: 750;
      color: #56318F;
    }

    .back-button,
    .refresh-button {
      --color: #7651B5;
      font-weight: 650;
      text-transform: none;
    }

    .page-wrapper {
      width: 100%;
      max-width: 1050px;
      margin: 0 auto;
      padding: 28px 24px 50px;
    }

    /* HEADINGS */

    .page-heading,
    .detail-heading {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
      margin-bottom: 32px;
    }

    .eyebrow {
      color: #7651B5;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.8px;
    }

    .page-heading h1,
    .detail-heading h1 {
      margin: 9px 0;
      color: #30233F;
      font-size: 30px;
      font-weight: 800;
      letter-spacing: -0.8px;
    }

    .page-heading p,
    .detail-heading p {
      margin: 0;
      color: #82798D;
      font-size: 14px;
      line-height: 1.6;
    }

    .queue-counter {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 120px;
      padding: 15px 20px;
      border: 1px solid #E7DFEF;
      border-radius: 15px;
      background: white;
    }

    .counter-number {
      color: #56318F;
      font-size: 28px;
      font-weight: 800;
    }

    .counter-label {
      color: #82798D;
      font-size: 11px;
    }

    .section-heading {
      margin-bottom: 16px;
    }

    .section-heading h2 {
      margin: 0 0 5px;
      color: #30233F;
      font-size: 19px;
      font-weight: 750;
    }

    .section-heading p {
      margin: 0;
      color: #93899E;
      font-size: 13px;
    }

    /* REQUEST QUEUE */

    .request-list {
      display: flex;
      flex-direction: column;
      gap: 13px;
    }

    .request-card {
      width: 100%;
      padding: 19px;
      border: 1px solid #E7DFEF;
      border-radius: 15px;
      background: white;
      text-align: left;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
    }

    .request-card:hover {
      transform: translateY(-2px);
      border-color: #B99AE8;
      box-shadow: 0 8px 22px rgba(86,49,143,0.09);
    }

    .request-card-main {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .request-icon {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 48px;
      height: 48px;
      border-radius: 13px;
      background: #EDE4FA;
      color: #56318F;
      font-size: 13px;
      font-weight: 800;
    }

    .request-information {
      flex: 1;
      min-width: 0;
    }

    .request-title-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .request-information h3 {
      margin: 0;
      color: #30233F;
      font-size: 16px;
      font-weight: 750;
    }

    .request-id {
      color: #9A8BAE;
      font-size: 11px;
    }

    .request-category {
      margin: 6px 0;
      color: #7651B5;
      font-size: 12px;
      font-weight: 650;
    }

    .request-assignment {
      margin: 4px 0 0;
      color: #93899E;
      font-size: 12px;
    }

    .request-assignment strong {
      color: #51435F;
    }

    .request-card-side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 9px;
      flex-shrink: 0;
    }

    .view-details {
      color: #7651B5;
      font-size: 11px;
      font-weight: 700;
    }

    /* EMPTY AND LOADING */

    .empty-card,
    .loading-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 55px 20px;
      border: 1px solid #E7DFEF;
      border-radius: 16px;
      background: white;
      text-align: center;
    }

    .empty-icon {
      display: grid;
      place-items: center;
      width: 55px;
      height: 55px;
      margin-bottom: 14px;
      border-radius: 50%;
      background: #EDE4FA;
      color: #56318F;
      font-size: 25px;
      font-weight: 800;
    }

    .empty-card h3 {
      margin: 0 0 8px;
      color: #30233F;
      font-size: 18px;
    }

    .empty-card p,
    .loading-card p {
      color: #93899E;
      font-size: 13px;
    }

    .loading-card ion-spinner {
      color: #7651B5;
    }

    .empty-refresh {
      --color: #7651B5;
      --border-color: #B99AE8;
      text-transform: none;
    }

    /* DETAIL CARDS */

    .content-card {
      margin-bottom: 19px;
      padding: 22px;
      border: 1px solid #E7DFEF;
      border-radius: 16px;
      background: white;
      box-shadow: 0 4px 15px rgba(86,49,143,0.035);
    }

    .card-heading {
      display: flex;
      align-items: center;
      gap: 13px;
      margin-bottom: 20px;
    }

    .heading-icon {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 38px;
      height: 38px;
      border-radius: 11px;
      background: #EDE4FA;
      color: #56318F;
      font-size: 12px;
      font-weight: 800;
    }

    .card-heading h2 {
      margin: 0 0 4px;
      color: #30233F;
      font-size: 17px;
      font-weight: 750;
    }

    .card-heading p {
      margin: 0;
      color: #93899E;
      font-size: 12px;
    }

    .information-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 18px;
    }

    .information-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
    }

    .information-item span,
    .description-box > span {
      color: #93899E;
      font-size: 11px;
      font-weight: 650;
    }

    .information-item strong {
      color: #41364F;
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .description-box {
      margin-top: 20px;
    }

    .description-box > p {
      margin: 8px 0 0;
      padding: 13px;
      border-radius: 10px;
      background: #FAF8FD;
      color: #51435F;
      font-size: 13px;
      line-height: 1.7;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    /* PHOTOS AND LOCATION */

    .report-photo {
      display: block;
      width: 100%;
      max-height: 480px;
      object-fit: contain;
      border: 1px solid #E7DFEF;
      border-radius: 13px;
      background: #FAF8FD;
    }

    .location-information {
      margin-bottom: 15px;
      padding: 13px;
      border-radius: 10px;
      background: #FAF8FD;
    }

    .location-information p {
      margin: 5px 0;
      color: #82798D;
      font-size: 12px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .location-information strong {
      color: #41364F;
    }

    .map-container {
      overflow: hidden;
      border: 1px solid #E7DFEF;
      border-radius: 12px;
    }

    .proof-submitted {
      margin: 0 0 12px;
      color: #82798D;
      font-size: 13px;
    }

    .proof-submitted strong {
      color: #56318F;
    }

    /* ASSIGNMENT AND ACTIONS */

    .action-card {
      border-top: 3px solid #7651B5;
    }

    .assignment-fields {
      display: flex;
      flex-direction: column;
      gap: 17px;
    }

    .assignment-field label {
      display: block;
      margin-bottom: 8px;
      color: #51435F;
      font-size: 12px;
      font-weight: 700;
    }

    .custom-input {
      --background: #FAF8FD;
      --color: #41364F;
      --border-radius: 10px;
      --padding-start: 12px;
      --padding-end: 12px;
      border: 1px solid #E7DFEF;
      border-radius: 10px;
    }

    .custom-input:focus-within {
      border-color: #9671CC;
      box-shadow: 0 0 0 3px rgba(118,81,181,0.08);
    }

    ion-select,
    ion-textarea {
      --color: #41364F;
      --placeholder-color: #A69CAF;
      font-size: 13px;
    }

    .primary-action {
      height: 48px;
      margin-top: 22px;
      --background: #56318F;
      --background-hover: #7651B5;
      --background-activated: #452575;
      --border-radius: 11px;
      --box-shadow: 0 5px 13px rgba(86,49,143,0.15);
      font-size: 13px;
      font-weight: 700;
      text-transform: none;
    }

    .send-back-action {
      height: 45px;
      margin-top: 14px;
      --color: #7651B5;
      --border-color: #B99AE8;
      --border-radius: 11px;
      font-size: 13px;
      font-weight: 700;
      text-transform: none;
    }

    .cancel-action {
      height: 45px;
      margin-top: 12px;
      --color: #C34C5A;
      --border-color: #E6B8BF;
      --border-radius: 11px;
      font-size: 13px;
      font-weight: 700;
      text-transform: none;
    }

    .action-divider {
      height: 1px;
      margin: 24px 0;
      background: #EDE4FA;
    }

    /* HISTORY */

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .history-item {
      position: relative;
      display: flex;
      gap: 13px;
      padding-bottom: 23px;
    }

    .history-item:not(:last-child)::before {
      position: absolute;
      top: 13px;
      bottom: -1px;
      left: 6px;
      width: 2px;
      background: #E7DFEF;
      content: '';
    }

    .history-marker {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      margin-top: 3px;
      border: 3px solid #B99AE8;
      border-radius: 50%;
      background: white;
    }

    .history-content {
      flex: 1;
      min-width: 0;
    }

    .history-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
    }

    .history-title strong {
      color: #41364F;
      font-size: 13px;
    }

    .history-content > p {
      margin: 7px 0;
      color: #82798D;
      font-size: 12px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .history-content > span {
      color: #A69CAF;
      font-size: 11px;
    }

    .no-history {
      color: #93899E;
      font-size: 13px;
    }

    /* RESPONSIVE */

    @media (max-width: 760px) {
      .page-wrapper {
        padding: 22px 16px 40px;
      }

      .information-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .request-card-main {
        align-items: flex-start;
      }

      .request-card-side {
        align-items: flex-end;
      }
    }

    @media (max-width: 520px) {
      .page-heading,
      .detail-heading {
        align-items: flex-start;
        flex-direction: column;
        gap: 14px;
      }

      .page-heading h1,
      .detail-heading h1 {
        font-size: 25px;
      }

      .queue-counter {
        flex-direction: row;
        gap: 10px;
        min-width: auto;
        padding: 9px 15px;
      }

      .counter-number {
        font-size: 21px;
      }

      .request-card {
        padding: 14px;
      }

      .request-card-main {
        flex-wrap: wrap;
      }

      .request-information {
        flex-basis: calc(100% - 65px);
      }

      .request-card-side {
        width: 100%;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding-left: 64px;
      }

      .content-card {
        padding: 16px;
      }

      .information-grid {
        grid-template-columns: 1fr 1fr;
        gap: 15px 10px;
      }

      .card-heading h2 {
        font-size: 15px;
      }
    }

    @media (max-width: 350px) {
      .information-grid {
        grid-template-columns: 1fr;
      }

      .request-card-side {
        padding-left: 0;
      }
    }
  `],
})
export class ManageReportsPage implements OnInit, OnDestroy {
  private adminService = inject(AdminRequestService);
  private feedback = inject(FeedbackService);
  private alertCtrl = inject(AlertController);
  private cdr = inject(ChangeDetectorRef);
  private live = inject(LiveUpdateService);

  private watcher: LiveWatcher | null = null;

  queue: AdminRequestRow[] = [];
  departments: Department[] = [];
  allStaff: StaffMember[] = [];

  selected: AdminRequestDetail | null = null;

  form: AssignForm = {
    department_id: null,
    staff_id: null,
    priority: null,
    remark: '',
  };

  rejectRemark = '';
  readonly priorityChoices = PRIORITY_CHOICES;

  loading = false;
  busy = false;

  async ngOnInit() {
    await this.loadDepartments();
  }

  ionViewWillEnter() {
    this.watcher?.stop();

    this.watcher = this.live.watch('list', async (silent) => {
      if (!this.selected) {
        await this.loadQueue(silent);
      }
    });
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

  async loadDepartments() {
    try {
      this.departments = await this.adminService.getDepartments();
      this.cdr.markForCheck();
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not load departments.');
    }
  }

  async loadQueue(silent = false) {
    if (!silent) {
      this.loading = true;
      this.cdr.markForCheck();
    }

    try {
      this.queue = await this.adminService.loadQueue();
    } catch (e: any) {
      if (!silent) {
        await this.feedback.toast(
          e.message ?? 'Could not load the request queue.'
        );
      }
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async loadStaff() {
    try {
      this.allStaff = await this.adminService.getStaff();
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not load staff.');
    }
  }

  async openRequest(id: number) {
    try {
      const detail = await this.adminService.loadDetail(id);
      await this.loadStaff();

      this.selected = detail;
      this.rejectRemark = '';

      this.form = {
        department_id: detail.department_id ?? detail.suggested_department_id,
        staff_id: detail.assigned_to,
        priority: detail.priority,
        remark: '',
      };
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not open the request.');
    }

    this.cdr.markForCheck();
  }

  backToQueue() {
    this.selected = null;
    this.loadQueue();
  }

  staffForDepartment(): StaffMember[] {
    const deptId = this.form.department_id;

    if (!deptId) return [];

    return this.allStaff
      .filter((s) => s.department_id === deptId)
      .sort((a, b) => Number(b.is_available) - Number(a.is_available));
  }

  setDepartment(value: number) {
    this.form.department_id = value;

    const stillValid = this.staffForDepartment().some(
      (s) => s.id === this.form.staff_id
    );

    if (!stillValid) {
      this.form.staff_id = null;
    }

    this.cdr.markForCheck();
  }

  async submitAssign() {
    if (!this.selected || this.busy) return;

    this.busy = true;
    this.cdr.markForCheck();

    try {
      await this.adminService.assign({
        request_id: this.selected.id,
        department_id: this.form.department_id,
        staff_id: this.form.staff_id,
        priority: this.form.priority,
        remark: this.form.remark.trim(),
      });

      await this.feedback.toast('Request assigned.', 'success');

      this.selected = null;
      await this.loadQueue();
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not assign the request.');
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  async confirmCancel() {
    if (!this.selected || this.busy) return;

    const requestId = this.selected.id;

    const alert = await this.alertCtrl.create({
      header: 'Cancel this request?',
      message: 'The request will be closed. This cannot be undone.',
      buttons: [
        { text: 'Keep it', role: 'cancel' },
        {
          text: 'Yes, cancel',
          role: 'destructive',
          handler: () => this.doCancel(requestId),
        },
      ],
    });

    await alert.present();
  }

  private async doCancel(requestId: number) {
    this.busy = true;
    this.cdr.markForCheck();

    try {
      await this.adminService.cancel(requestId, this.form.remark.trim());

      await this.feedback.toast('Request cancelled.', 'success');

      this.selected = null;
      await this.loadQueue();
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not cancel the request.');
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  async confirmComplete() {
    if (!this.selected || this.busy) return;

    const requestId = this.selected.id;

    const alert = await this.alertCtrl.create({
      header: 'Mark as completed?',
      message: 'Only do this after you checked the after photo. This cannot be undone.',
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        {
          text: 'Yes, completed',
          handler: () => this.doComplete(requestId),
        },
      ],
    });

    await alert.present();
  }

  private async doComplete(requestId: number) {
    this.busy = true;
    this.cdr.markForCheck();

    try {
      await this.adminService.complete(requestId, this.form.remark.trim());

      await this.feedback.toast('Request completed.', 'success');

      this.selected = null;
      await this.loadQueue();
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not complete the request.');
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  async confirmSendBack() {
    if (!this.selected || this.busy) return;

    const requestId = this.selected.id;
    const remark = this.rejectRemark.trim();

    if (remark === '') {
      await this.feedback.toast(
        'Please write a reason so the staff member knows what to fix.'
      );
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Send back to staff?',
      message: 'The staff member will see your reason and can send proof again.',
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        {
          text: 'Yes, send back',
          handler: () => this.doSendBack(requestId, remark),
        },
      ],
    });

    await alert.present();
  }

  private async doSendBack(requestId: number, remark: string) {
    this.busy = true;
    this.cdr.markForCheck();

    try {
      await this.adminService.rejectProof(requestId, remark);

      await this.feedback.toast('Sent back to staff.', 'success');

      this.rejectRemark = '';
      this.selected = null;
      await this.loadQueue();
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not send the request back.');
    } finally {
      this.busy = false;
      this.cdr.markForCheck();
    }
  }

  get canComplete(): boolean {
    return this.selected?.status === 'awaiting_proof';
  }

  get canChange(): boolean {
    return this.selected?.status === 'submitted' ||
      this.selected?.status === 'assigned';
  }

  departmentName(id: number): string {
    return this.departments.find((d) => d.id === id)?.name ?? '—';
  }

  formatCoords(lat: number | null, lng: number | null): string {
    if (lat === null || lng === null) {
      return 'Location not recorded';
    }

    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  statusLabel(status: RequestStatus): string {
    return STATUS_LABELS[status];
  }

  statusColor(status: RequestStatus): string {
    return STATUS_COLORS[status];
  }
}
