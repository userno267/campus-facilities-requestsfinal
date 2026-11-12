
import { Component, inject } from '@angular/core';
import {
  IonLabel,
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonIcon
} from '@ionic/angular';

import {
  homeOutline,
  addCircleOutline,
  documentsOutline,
  personCircleOutline,
  listOutline,
  clipboardOutline,
  peopleOutline,
  starOutline,
  documentTextOutline,
} from 'ionicons/icons';

import { addIcons } from 'ionicons';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonLabel,
    IonIcon
  ],

  template: `
    <ion-tabs>

      <ion-tab-bar slot="bottom" class="custom-tab-bar">

        @switch (auth.user()?.role) {

          @case ('faculty') {

            <ion-tab-button tab="faculty-home">
              <ion-icon name="home-outline"></ion-icon>
              <ion-label>Home</ion-label>
            </ion-tab-button>

            <ion-tab-button tab="new-report">
              <ion-icon name="add-circle-outline"></ion-icon>
              <ion-label>New Report</ion-label>
            </ion-tab-button>

            <ion-tab-button tab="my-reports">
              <ion-icon name="documents-outline"></ion-icon>
              <ion-label>My Reports</ion-label>
            </ion-tab-button>

            <ion-tab-button tab="account">
              <ion-icon name="person-circle-outline"></ion-icon>
              <ion-label>Account</ion-label>
            </ion-tab-button>

          }

          @case ('admin') {

            <ion-tab-button tab="dashboard">
              <ion-icon name="list-outline"></ion-icon>
              <ion-label>Requests</ion-label>
            </ion-tab-button>

            <ion-tab-button tab="manage-reports">
              <ion-icon name="clipboard-outline"></ion-icon>
              <ion-label>Manage</ion-label>
            </ion-tab-button>

            <ion-tab-button tab="daily-report">
              <ion-icon name="document-text-outline"></ion-icon>
              <ion-label>Report</ion-label>
            </ion-tab-button>

            <ion-tab-button tab="account">
              <ion-icon name="person-circle-outline"></ion-icon>
              <ion-label>Account</ion-label>
            </ion-tab-button>

          }

          @case ('staff') {

            <ion-tab-button tab="assigned">
              <ion-icon name="people-outline"></ion-icon>
              <ion-label>Assigned</ion-label>
            </ion-tab-button>

            <ion-tab-button tab="reviews">
              <ion-icon name="star-outline"></ion-icon>
              <ion-label>Reviews</ion-label>
            </ion-tab-button>

            <ion-tab-button tab="account">
              <ion-icon name="person-circle-outline"></ion-icon>
              <ion-label>Account</ion-label>
            </ion-tab-button>

          }

        }

      </ion-tab-bar>

    </ion-tabs>
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
      height: 100%;
    }

    ion-tabs {
      --background: var(--background-color);
      background: var(--background-color);
    }

    /* BOTTOM NAVIGATION */

    .custom-tab-bar {
      --background: #ffffff;
      --border: none;
      --color: #a49bad;
      --color-selected: #56318f;

      position: relative;

      min-height: 76px;
      height: auto;

      padding: 8px 12px
        max(8px, env(safe-area-inset-bottom));

      border-top: 1px solid #eee8f5;

      box-shadow:
        0 -5px 20px rgba(48, 35, 68, 0.07);

      overflow: visible;
      z-index: 10;
    }

    /* TAB BUTTONS */

    ion-tab-button {
      --color: #a49bad;
      --color-selected: #56318f;
      --ripple-color: #ede4fa;

      flex: 1;

      max-width: 180px;
      min-height: 58px;

      margin: 0 4px;

      border-radius: 14px;

      font-family: inherit;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.2px;

      transition:
        transform 0.3s cubic-bezier(.2,.8,.2,1),
        background 0.3s ease,
        box-shadow 0.3s ease,
        color 0.3s ease;

      cursor: pointer;
      position: relative;
      overflow: visible;
      -webkit-tap-highlight-color: transparent;
    }

    /* ICONS */

    ion-tab-button ion-icon {
      font-size: 23px;
      margin-bottom: 4px;

      transition:
        transform 0.35s cubic-bezier(.2,.8,.2,1),
        color 0.25s ease,
        filter 0.25s ease;
    }

    /* LABELS */

    ion-tab-button ion-label {
      font-size: 10.5px;
      font-weight: 600;
      letter-spacing: 0.2px;
      margin-top: 2px;

      transition:
        transform 0.25s ease,
        color 0.25s ease;
    }

    /* HOVER EFFECT */

    @media (hover: hover) and (pointer: fine) {

      ion-tab-button:hover {
        --color: #56318f;

        transform: translateY(-6px) scale(1.04);

        background: #f4effb;

        box-shadow:
          0 7px 16px rgba(86, 49, 143, 0.12);
      }

      ion-tab-button:hover ion-icon {
        transform: translateY(-3px) scale(1.2) rotate(-5deg);

        color: #56318f;

        filter:
          drop-shadow(0 3px 5px rgba(86, 49, 143, 0.2));
      }

      ion-tab-button:hover ion-label {
        transform: translateY(1px);
        color: #56318f;
      }

      ion-tab-button.tab-selected:hover {
        background: #e6d9f7;
        box-shadow:
          0 8px 18px rgba(86, 49, 143, 0.18);
      }
    }

    /* ACTIVE TAB */

    ion-tab-button.tab-selected {
      --color: #56318f;

      background: #ede4fa;

      border-radius: 14px;

      font-weight: 750;

      box-shadow:
        0 3px 10px rgba(86, 49, 143, 0.08);
    }

    ion-tab-button.tab-selected ion-icon {
      color: #56318f;

      transform: translateY(-2px);

      font-size: 25px;
    }

    ion-tab-button.tab-selected ion-label {
      color: #56318f;
      font-weight: 750;
    }

    /* CLICK / PRESS ANIMATION */

    ion-tab-button:active {
      transform: scale(0.91);
      transition: transform 0.1s ease;
    }

    ion-tab-button:active ion-icon {
      transform: scale(0.85);
    }

    /* KEYBOARD FOCUS */

    ion-tab-button:focus-visible {
      outline: 3px solid #b99ae8;
      outline-offset: 3px;
      border-radius: 14px;
    }

    /* MOBILE RESPONSIVENESS */

    @media (max-width: 600px) {

      .custom-tab-bar {
        min-height: 70px;
        padding-left: 5px;
        padding-right: 5px;
      }

      ion-tab-button {
        min-height: 54px;
        margin: 0 2px;
      }

      ion-tab-button ion-icon {
        font-size: 21px;
      }

      ion-tab-button ion-label {
        font-size: 9.5px;
      }

      ion-tab-button.tab-selected ion-icon {
        font-size: 23px;
      }

    }

    /* SMALL MOBILE DEVICES */

    @media (max-width: 360px) {

      .custom-tab-bar {
        padding-left: 2px;
        padding-right: 2px;
      }

      ion-tab-button {
        margin: 0 1px;
        min-height: 50px;
      }

      ion-tab-button ion-icon {
        font-size: 19px;
      }

      ion-tab-button ion-label {
        font-size: 8.5px;
      }

    }

    /* TABLET AND DESKTOP */

    @media (min-width: 768px) {

      .custom-tab-bar {
        min-height: 80px;
        padding: 10px 20px;
      }

      ion-tab-button {
        max-width: 200px;
        min-height: 62px;
      }

      ion-tab-button ion-icon {
        font-size: 24px;
      }

      ion-tab-button ion-label {
        font-size: 11px;
      }

    }

    /* REDUCED MOTION ACCESSIBILITY */

    @media (prefers-reduced-motion: reduce) {

      ion-tab-button,
      ion-tab-button ion-icon,
      ion-tab-button ion-label {
        transition: none !important;
        animation: none !important;
      }

    }

  `],
})

export class TabsPage {

  auth = inject(AuthService);

  constructor() {

    addIcons({
      homeOutline,
      addCircleOutline,
      documentsOutline,
      personCircleOutline,
      listOutline,
      clipboardOutline,
      peopleOutline,
      starOutline,
      documentTextOutline,
    });

  }

}
