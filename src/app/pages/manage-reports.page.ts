import {
  ChangeDetectorRef, Component, OnDestroy, OnInit, inject,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AlertController, IonBadge, IonButton, IonButtons, IonContent,
  IonHeader, IonItem, IonSelect, IonSelectOption,
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
      <ion-toolbar class="top-toolbar">

        @if (selected) {
          <ion-buttons slot="start">
            <ion-button class="back-button" (click)="backToQueue()">← Back</ion-button>
          </ion-buttons>
          <ion-title>Request #{{ selected.id }}</ion-title>
        } @else {
          <div class="brand" slot="start">
            <div class="brand-icon">CR</div>
            <div class="brand-info">
              <strong>Campus Reports</strong>
              <span>Admin · Manage Reports</span>
            </div>
          </div>
          <ion-buttons slot="end">
            <ion-button class="refresh-button" (click)="loadQueue()" [disabled]="loading">Refresh</ion-button>
          </ion-buttons>
        }

      </ion-toolbar>
    </ion-header>

    <ion-content class="dashboard-content">

      <main class="dashboard-container">

        @if (!selected) {

          <!-- Welcome Section -->
          <section class="welcome-section">
            <div class="welcome-text">
              <span class="eyebrow">ADMINISTRATION</span>

              <h1>
                Manage <span>Reports</span>
              </h1>

              <p>
                Review, assign and monitor campus requests. Tap a request to see its
                details, proof and history.
              </p>

              <div class="welcome-role">
                <span class="status-dot"></span>
                {{ queue.length }} request{{ queue.length === 1 ? '' : 's' }} in the queue
              </div>
            </div>

            <div class="welcome-illustration">
              <div class="illustration-circle">
                <span class="illustration-icon">✦</span>
                <div class="illustration-shield">▤</div>
              </div>
            </div>
          </section>

          <!-- Queue -->
          <section class="section-block">
            <div class="section-heading">
              <div>
                <span class="eyebrow">REQUEST QUEUE</span>
                <h2>Needs attention</h2>
                <p>Requests waiting for review, assignment or approval.</p>
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
                  <button type="button" class="request-card" (click)="openRequest(r.id)">
                    <div class="request-card-main">

                      <div class="request-icon">
                        <span>CR</span>
                      </div>

                      <div class="request-information">
                        <div class="request-title-row">
                          <h3>{{ r.title }}</h3>
                          <span class="request-id">#{{ r.id }}</span>
                        </div>

                        <p class="request-category">
                          {{ r.category_name }} · {{ r.location_name }}
                        </p>

                        <p class="request-assignment">
                          Suggested department:
                          <strong>{{ departmentName(r.suggested_department_id) }}</strong>
                        </p>

                        @if (r.assigned_name) {
                          <p class="request-assignment">
                            Assigned to: <strong>{{ r.assigned_name }}</strong>
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

                <ion-button fill="outline" class="empty-refresh" (click)="loadQueue()">
                  Refresh queue
                </ion-button>
              </div>
            }
          </section>

        } @else {

          <!-- Detail hero -->
          <section class="welcome-section">
            <div class="welcome-text">
              <span class="eyebrow">REQUEST DETAILS</span>

              <h1>{{ selected.title }}</h1>

              <p>Review the report information and take the necessary action.</p>

              <div class="welcome-role">
                <span class="status-dot"></span>
                {{ statusLabel(selected.status) }}
              </div>
            </div>

            <div class="welcome-illustration">
              <div class="illustration-circle">
                <span class="illustration-icon">✦</span>
                <div class="illustration-shield">#{{ selected.id }}</div>
              </div>
            </div>
          </section>

          <!-- 01 Report information -->
          <section class="section-block">
            <div class="card">
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
            </div>
          </section>

          <!-- 02 Reported photo -->
          <section class="section-block">
            <div class="card">
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
            </div>
          </section>

          <!-- 03 Location -->
          <section class="section-block">
            <div class="card">
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
            </div>
          </section>

          <!-- 04 Staff proof -->
          @if (selected.after_photo) {
            <section class="section-block">
              <div class="card">
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
              </div>
            </section>
          }

          <!-- 05 Action (only one of these shows, depending on status) -->

          <!-- Approve or send back -->
          @if (canComplete) {
            <section class="section-block">
              <div class="card action-card">
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
              </div>
            </section>
          }

          <!-- Pause a job in progress -->
          @if (selected.status === 'in_progress') {
            <section class="section-block">
              <div class="card action-card">
                <div class="card-heading">
                  <div class="heading-icon">05</div>
                  <div>
                    <h2>Pause This Job</h2>
                    <p>Use this when the staff member must do a more urgent job first. The server only allows it when a higher-priority job is already in their queue.</p>
                  </div>
                </div>

                <div class="description-box">
                  <span>Reason for pausing</span>
                  <ion-item class="custom-input" lines="none">
                    <ion-textarea
                      [autoGrow]="true"
                      maxlength="300"
                      placeholder="For example: urgent leak in the library."
                      [(ngModel)]="pauseRemark"
                    ></ion-textarea>
                  </ion-item>
                </div>

                <ion-button
                  expand="block"
                  fill="outline"
                  class="send-back-action"
                  [disabled]="busy"
                  (click)="confirmPause()"
                >
                  Pause Job
                </ion-button>
              </div>
            </section>
          }

          <!-- Paused: admin can only cancel -->
          @if (selected.status === 'paused') {
            <section class="section-block">
              <div class="card action-card">
                <div class="card-heading">
                  <div class="heading-icon">05</div>
                  <div>
                    <h2>Paused Job</h2>
                    <p>The staff member will resume it when they are free. You can cancel it if it is no longer needed.</p>
                  </div>
                </div>

                <ion-button
                  expand="block"
                  fill="outline"
                  class="cancel-action"
                  [disabled]="busy"
                  (click)="confirmCancel()"
                >
                  Cancel Request
                </ion-button>
              </div>
            </section>
          }

          <!-- Assign -->
          @if (canChange) {
            <section class="section-block">
              <div class="card action-card">
                <div class="card-heading">
                  <div class="heading-icon">05</div>
                  <div>
                    <h2>Assign Request</h2>
                    <p>Choose the department, staff member and priority.</p>
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
                          <ion-select-option [value]="d.id">{{ d.name }}</ion-select-option>
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
                          <ion-select-option [value]="s.id" [disabled]="staffDisabled(s)">
                            {{ s.name }} ({{ staffLabel(s) }})
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
                          <ion-select-option [value]="p.value">{{ p.label }}</ion-select-option>
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
              </div>
            </section>
          }

          <!-- 06 History -->
          <section class="section-block">
            <div class="card">
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

                        <span>{{ e.changed_by_name }} · {{ e.changed_at | date: 'medium' }}</span>
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <p class="no-history">No history available yet.</p>
              }
            </div>
          </section>

        }

        <!-- Footer -->
        <footer class="dashboard-footer">
          <span>Campus Reports</span>
          <span>Admin · Manage Reports</span>
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
      max-width: 1100px;
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

    ion-title {
      font-weight: 700;
      color: var(--text-dark);
    }

    ion-button {
      --color: var(--purple-primary);
      --border-radius: 10px;
      font-weight: 650;
      text-transform: none;
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
      overflow-wrap: anywhere;
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
      font-size: 22px;
      font-weight: 700;
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
      margin-bottom: 20px;
    }

    .section-heading .eyebrow {
      color: var(--purple-secondary);
      margin-bottom: 7px;
    }

    .section-heading h2 {
      margin: 0 0 5px;
      font-size: 21px;
      color: var(--text-dark);
      font-weight: 750;
    }

    .section-heading p {
      margin: 0;
      font-size: 12px;
      color: var(--text-muted);
    }

    /* =====================================
       REQUEST QUEUE
    ===================================== */

    .request-list {
      display: flex;
      flex-direction: column;
      gap: 13px;
    }

    .request-card {
      width: 100%;
      padding: 19px;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      background: var(--card-background);
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.07);
      transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease;
    }

    .request-card:hover {
      transform: translateY(-3px);
      border-color: var(--purple-light);
      box-shadow: 0 10px 24px rgba(86,49,143,.13);
    }

    .request-card:focus-visible {
      outline: 3px solid rgba(118,81,181,.4);
      outline-offset: 3px;
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
      background: var(--lavender);
      color: var(--purple-primary);
      font-size: 13px;
      font-weight: 800;
      transition: transform .25s ease;
    }

    .request-card:hover .request-icon {
      transform: rotate(-7deg) scale(1.08);
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
      color: var(--text-dark);
      font-size: 16px;
      font-weight: 750;
      transition: color .2s ease;
    }

    .request-card:hover .request-information h3 {
      color: var(--purple-primary);
    }

    .request-id {
      color: var(--text-muted);
      font-size: 11px;
    }

    .request-category {
      margin: 6px 0;
      color: var(--purple-secondary);
      font-size: 12px;
      font-weight: 650;
    }

    .request-assignment {
      margin: 4px 0 0;
      color: var(--text-muted);
      font-size: 12px;
    }

    .request-assignment strong {
      color: var(--text-dark);
    }

    .request-card-side {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 9px;
      flex-shrink: 0;
    }

    .view-details {
      color: var(--purple-secondary);
      font-size: 11px;
      font-weight: 700;
    }

    /* =====================================
       EMPTY AND LOADING
    ===================================== */

    .empty-card,
    .loading-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 45px 20px;
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      text-align: center;
      color: var(--text-muted);
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.07);
    }

    .empty-icon {
      display: grid;
      place-items: center;
      width: 55px;
      height: 55px;
      margin-bottom: 14px;
      border-radius: 50%;
      background: var(--lavender);
      color: var(--purple-primary);
      font-size: 25px;
      font-weight: 800;
    }

    .empty-card h3 {
      margin: 0 0 8px;
      color: var(--text-dark);
      font-size: 18px;
    }

    .empty-card p,
    .loading-card p {
      color: var(--text-muted);
      font-size: 13px;
    }

    .loading-card ion-spinner {
      color: var(--purple-primary);
    }

    .empty-refresh {
      --color: var(--purple-secondary);
      --border-color: var(--purple-light);
      text-transform: none;
    }

    /* =====================================
       DETAIL CARDS
    ===================================== */

    .card {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 22px;
      color: var(--text-dark);
      box-shadow: 0 6px 18px rgba(86, 49, 143, 0.07);
      transition: transform .2s ease, box-shadow .2s ease;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 24px rgba(86, 49, 143, 0.12);
    }

    .action-card {
      border-top: 3px solid var(--purple-secondary);
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
      width: 40px;
      height: 40px;
      border-radius: 12px;
      background: var(--lavender);
      color: var(--purple-primary);
      font-size: 12px;
      font-weight: 800;
    }

    .card-heading h2 {
      margin: 0 0 4px;
      color: var(--purple-primary);
      font-size: 17px;
      font-weight: 750;
    }

    .card-heading p {
      margin: 0;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
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
      color: var(--purple-secondary);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .information-item strong {
      color: var(--text-dark);
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
      background: var(--background-color);
      color: var(--text-dark);
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
      border: 1px solid var(--border-color);
      border-radius: 13px;
      background: var(--background-color);
    }

    .location-information {
      margin-bottom: 15px;
      padding: 13px;
      border-radius: 10px;
      background: var(--background-color);
    }

    .location-information p {
      margin: 5px 0;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .location-information strong {
      color: var(--text-dark);
    }

    .map-container {
      overflow: hidden;
      border: 1px solid var(--border-color);
      border-radius: 12px;
    }

    .proof-submitted {
      margin: 0 0 12px;
      color: var(--text-muted);
      font-size: 13px;
    }

    .proof-submitted strong {
      color: var(--purple-primary);
    }

    /* =====================================
       FORM FIELDS AND BUTTONS
    ===================================== */

    .assignment-fields {
      display: flex;
      flex-direction: column;
      gap: 17px;
    }

    .assignment-field label {
      display: block;
      margin-bottom: 8px;
      color: var(--purple-secondary);
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .custom-input {
      --background: var(--background-color);
      --color: var(--text-dark);
      --border-radius: 10px;
      --padding-start: 12px;
      --padding-end: 12px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
    }

    .custom-input:focus-within {
      border-color: var(--purple-secondary);
      box-shadow: 0 0 0 3px rgba(118,81,181,0.1);
    }

    ion-select,
    ion-textarea {
      --color: var(--text-dark);
      --placeholder-color: #a69caf;
      font-size: 13px;
    }

    .primary-action {
      height: 48px;
      margin-top: 22px;
      --background: var(--purple-primary);
      --background-hover: var(--purple-secondary);
      --background-activated: #452575;
      --color: #ffffff;
      --border-radius: 12px;
      --box-shadow: 0 5px 13px rgba(86,49,143,0.15);
      font-size: 13px;
      font-weight: 700;
      text-transform: none;
    }

    .send-back-action {
      height: 45px;
      margin-top: 14px;
      --color: var(--purple-secondary);
      --border-color: var(--purple-light);
      --border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      text-transform: none;
    }

    .cancel-action {
      height: 45px;
      margin-top: 12px;
      --color: #c34c5a;
      --border-color: #e6b8bf;
      --border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      text-transform: none;
    }

    .action-divider {
      height: 1px;
      margin: 24px 0;
      background: var(--lavender);
    }

    /* =====================================
       HISTORY
    ===================================== */

    .history-list {
      display: flex;
      flex-direction: column;
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
      background: var(--border-color);
      content: '';
    }

    .history-marker {
      position: relative;
      z-index: 1;
      flex-shrink: 0;
      width: 14px;
      height: 14px;
      margin-top: 3px;
      border: 3px solid var(--purple-light);
      border-radius: 50%;
      background: #ffffff;
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
      color: var(--text-dark);
      font-size: 13px;
    }

    .history-content > p {
      margin: 7px 0;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .history-content > span {
      color: var(--text-muted);
      font-size: 11px;
    }

    .no-history {
      color: var(--text-muted);
      font-size: 13px;
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

    @media (max-width: 760px) {
      .information-grid {
        grid-template-columns: repeat(2, 1fr);
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

      .request-card {
        padding: 14px;
      }

      .request-card-main {
        align-items: flex-start;
      }

      .request-card-side {
        align-items: flex-end;
      }

      .card {
        padding: 16px;
      }

      .information-grid {
        grid-template-columns: 1fr 1fr;
        gap: 15px 10px;
      }

      .card-heading h2 {
        font-size: 15px;
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

      .information-grid {
        grid-template-columns: 1fr;
      }
    }

    /* =====================================
       TOUCH + ACCESSIBILITY
    ===================================== */

    @media (hover: none) {
      .welcome-section:hover,
      .card:hover,
      .request-card:hover {
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
  pauseRemark = '';
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
      this.pauseRemark = '';

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

  // A staff member who is working can still be given a job, but only one with a STRICTLY higher
  // priority than the job they are working on (it waits in their queue). The server checks this again.
  private priorityRank(p: RequestPriority | null): number {
    return { low: 1, medium: 2, high: 3, urgent: 4 }[p ?? 'low'] ?? 0;
  }

  staffDisabled(s: StaffMember): boolean {
    if (s.is_available || s.id === this.selected?.assigned_to) return false;
    if (this.form.priority === null) return true;
    return this.priorityRank(this.form.priority) <= this.priorityRank(s.working_priority);
  }

  staffLabel(s: StaffMember): string {
    const queued = s.queued_count > 0 ? `, ${s.queued_count} queued` : '';
    if (s.is_available) return 'Available' + queued;
    return this.staffDisabled(s)
      ? 'Busy, pick a higher priority to queue' + queued
      : 'Working, job will be queued' + queued;
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

  async confirmPause() {
    if (!this.selected || this.busy) return;

    const requestId = this.selected.id;
    const remark = this.pauseRemark.trim();

    if (remark === '') {
      await this.feedback.toast('Please write a reason for pausing.');
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Pause this job?',
      message: 'The staff member can then start the more urgent job in their queue.',
      buttons: [
        { text: 'Not yet', role: 'cancel' },
        {
          text: 'Yes, pause',
          handler: () => this.doPause(requestId, remark),
        },
      ],
    });

    await alert.present();
  }

  private async doPause(requestId: number, remark: string) {
    this.busy = true;
    this.cdr.markForCheck();

    try {
      await this.adminService.pause(requestId, remark);

      await this.feedback.toast('Job paused.', 'success');

      this.pauseRemark = '';
      this.selected = null;
      await this.loadQueue();
    } catch (e: any) {
      await this.feedback.toast(e.message ?? 'Could not pause the job.');
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