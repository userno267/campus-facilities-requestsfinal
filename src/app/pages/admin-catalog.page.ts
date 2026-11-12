import { Component, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar,
} from '@ionic/angular';
import { CatalogCategory, CatalogDepartment, CatalogService } from '../services/catalog.service';
import { FeedbackService } from '../services/feedback.service';

type Tab = 'departments' | 'categories';

// One row in the list. Both tabs use the same shape.
interface Row {
  id: number;
  name: string;
  meta: string;
}

// The open delete panel. inUse decides whether a replacement must be chosen first.
interface PendingDelete {
  type: Tab;
  id: number;
  name: string;
  inUse: boolean;
  usageText: string;
  moveTo: number | null;
  targets: { id: number; name: string }[];
}

// "1 request", "2 requests", "2 categories". Pass the plural when adding s is not enough.
function countText(n: number, one: string, many: string = one + 's'): string {
  return `${n} ${n === 1 ? one : many}`;
}

// Admin "Setup" page: add, rename and delete departments and categories.
// Deleting something in use moves its requests (and staff and categories) to another item you pick.
@Component({
  selector: 'app-admin-catalog',
  standalone: true,
  imports: [IonButton, IonButtons, IonContent, IonHeader, IonTitle, IonToolbar],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="page-toolbar">

        <div class="brand-header" slot="start">
          <img
            src="assets/campus-reports-logo.png"
            alt="Campus Reports logo"
            class="brand-logo-img" />
        </div>

        <ion-title>Setup</ion-title>

        <ion-buttons slot="end">
          <ion-button class="refresh-btn" (click)="load()" [disabled]="loading()">
            {{ loading() ? 'Refreshing...' : 'Refresh' }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding page-content">

      <div class="page-heading">
        <span class="eyebrow">ADMIN SETUP</span>
        <h1>Departments &amp; Categories</h1>
        <p>Add, rename and remove the departments and categories used for reports.</p>
      </div>

      <!-- SUMMARY CARD -->
      <div class="summary-card">
        <div class="summary-icon">🏢</div>

        <div class="summary-info">
          <span class="summary-label">DEPARTMENTS</span>
          <h2>{{ departments().length }}</h2>
          <p>{{ categories().length }} {{ categories().length === 1 ? 'category' : 'categories' }} in use</p>
        </div>
      </div>

      <div class="tab-row">
        <button type="button" class="tab"
                [class.active]="tab() === 'departments'"
                (click)="setTab('departments')">Departments</button>
        <button type="button" class="tab"
                [class.active]="tab() === 'categories'"
                (click)="setTab('categories')">Categories</button>
      </div>

      <!-- ADD CARD -->
      <div class="add-card">
        <h3>Add a {{ noun() }}</h3>

        <input id="new-name" class="field" type="text" maxlength="100" placeholder="Name"
               [value]="newName()"
               (input)="newName.set(textOf($event))" />

        @if (tab() === 'categories') {
          <label class="label" for="new-dept">Default department</label>
          <select id="new-dept" class="field"
                  (change)="newCategoryDept.set(selectNumber($event))">
            @for (d of departments(); track d.id) {
              <option [value]="d.id" [selected]="d.id === newCategoryDept()">{{ d.name }}</option>
            }
          </select>
        }

        <ion-button class="primary-btn" expand="block" [disabled]="busy()" (click)="addItem()">
          Add {{ noun() }}
        </ion-button>
      </div>

      <!-- LIST -->
      <div class="section-heading">
        <h2>{{ tab() === 'departments' ? 'Departments' : 'Categories' }}</h2>
        <span>{{ countLabel(rows().length) }}</span>
      </div>

      @for (row of rows(); track row.id) {
        <div class="item-card">

          @if (editingFor(row.id); as e) {
            <input class="field" type="text" maxlength="100"
                   [value]="e.name"
                   (input)="setEditName(textOf($event))" />
            <div class="card-actions">
              <ion-button class="primary-btn" [disabled]="busy()" (click)="saveEdit()">Save</ion-button>
              <ion-button class="ghost-btn" (click)="cancelEdit()">Cancel</ion-button>
            </div>
          } @else {
            <div class="item-main">
              <strong>{{ row.name }}</strong>
              <span>{{ row.meta }}</span>
            </div>
            <div class="card-actions">
              <ion-button class="ghost-btn" (click)="startEdit(row.id, row.name)">Rename</ion-button>
              <ion-button class="outline-btn" (click)="askDelete(row.id, row.name)">Delete</ion-button>
            </div>
          }

          @if (pendingFor(row.id); as p) {
            <div class="delete-panel">
              @if (p.inUse) {
                <p>
                  In use: {{ p.usageText }}. Choose where to move
                  {{ p.type === 'departments' ? 'them' : 'the requests' }}.
                </p>
                @if (p.targets.length > 0) {
                  <select class="field" (change)="setMoveTo(selectNumber($event))">
                    @for (t of p.targets; track t.id) {
                      <option [value]="t.id" [selected]="t.id === p.moveTo">{{ t.name }}</option>
                    }
                  </select>
                } @else {
                  <p>Add another {{ p.type === 'departments' ? 'department' : 'category' }} first.</p>
                }
              } @else {
                <p>Delete "{{ p.name }}"? Nothing is using it.</p>
              }
              <div class="card-actions">
                <ion-button class="primary-btn"
                            [disabled]="busy() || (p.inUse && p.targets.length === 0)"
                            (click)="confirmDelete()">Delete</ion-button>
                <ion-button class="ghost-btn" (click)="cancelDelete()">Cancel</ion-button>
              </div>
            </div>
          }
        </div>
      } @empty {
        <div class="empty-card">
          <div class="empty-icon">🏢</div>
          @if (loading()) {
            <h3>Loading...</h3>
          } @else {
            <h3>No {{ nounPlural() }} Yet</h3>
            <p>Use the form above to add the first one.</p>
          }
        </div>
      }

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
  `],
})
export class AdminCatalogPage implements OnInit {
  private catalog = inject(CatalogService);
  private feedback = inject(FeedbackService);

  tab = signal<Tab>('departments');
  loading = signal(false);
  busy = signal(false);

  departments = signal<CatalogDepartment[]>([]);
  categories = signal<CatalogCategory[]>([]);

  newName = signal('');
  newCategoryDept = signal<number | null>(null);

  editing = signal<{ type: Tab; id: number; name: string } | null>(null);
  pending = signal<PendingDelete | null>(null);

  // The rows for the open tab.
  rows = computed<Row[]>(() => {
    if (this.tab() === 'departments') {
      return this.departments().map((d) => ({
        id: d.id,
        name: d.name,
        meta: [
          countText(d.request_count, 'request'),
          countText(d.staff_count, 'staff member'),
          countText(d.category_count, 'category', 'categories'),
        ].join(' · '),
      }));
    }
    return this.categories().map((c) => ({
      id: c.id,
      name: c.name,
      meta: `Default: ${c.default_department_name} · ${countText(c.request_count, 'request')}`,
    }));
  });

  ngOnInit(): void {
    void this.load();
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  noun(): string {
    return this.tab() === 'departments' ? 'department' : 'category';
  }

  nounPlural(): string {
    return this.tab() === 'departments' ? 'Departments' : 'Categories';
  }

  countLabel(n: number): string {
    return countText(n, this.noun(), this.noun() === 'department' ? 'departments' : 'categories');
  }

  async load(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.catalog.list();
      this.departments.set(data.departments);
      this.categories.set(data.categories);

      // Keep the default department picked for a new category, if it still exists.
      const ids = data.departments.map((d) => d.id);
      const current = this.newCategoryDept();
      if (current === null || !ids.includes(current)) {
        this.newCategoryDept.set(ids[0] ?? null);
      }
    } catch (e: any) {
      await this.feedback.toast(e?.message ?? 'Could not load the list', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  setTab(t: Tab): void {
    this.tab.set(t);
    this.editing.set(null);
    this.pending.set(null);
  }

  // Input helpers, so the template stays readable.
  textOf(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  selectNumber(event: Event): number {
    return Number((event.target as HTMLSelectElement).value);
  }

  editingFor(id: number) {
    const e = this.editing();
    return e && e.type === this.tab() && e.id === id ? e : null;
  }

  pendingFor(id: number): PendingDelete | null {
    const p = this.pending();
    return p && p.type === this.tab() && p.id === id ? p : null;
  }

  private fail(message: string): void {
    void this.feedback.toast(message, 'danger');
  }

  async addItem(): Promise<void> {
    const name = this.newName().trim();
    if (!name) {
      this.fail('Please enter a name');
      return;
    }

    this.busy.set(true);
    try {
      if (this.tab() === 'departments') {
        await this.catalog.createDepartment(name);
      } else {
        const deptId = this.newCategoryDept();
        if (deptId === null) {
          this.fail('Choose a default department');
          return;
        }
        await this.catalog.createCategory(name, deptId);
      }
      this.newName.set('');
      await this.feedback.toast(`Added "${name}"`, 'success');
      await this.load();
    } catch (e: any) {
      this.fail(e?.message ?? 'Could not add it');
    } finally {
      this.busy.set(false);
    }
  }

  startEdit(id: number, name: string): void {
    this.pending.set(null);
    this.editing.set({ type: this.tab(), id, name });
  }

  setEditName(value: string): void {
    const e = this.editing();
    if (e) {
      this.editing.set({ ...e, name: value });
    }
  }

  cancelEdit(): void {
    this.editing.set(null);
  }

  async saveEdit(): Promise<void> {
    const e = this.editing();
    if (!e) return;

    const name = e.name.trim();
    if (!name) {
      this.fail('Please enter a name');
      return;
    }

    this.busy.set(true);
    try {
      if (e.type === 'departments') {
        await this.catalog.renameDepartment(e.id, name);
      } else {
        await this.catalog.renameCategory(e.id, name);
      }
      this.editing.set(null);
      await this.feedback.toast('Renamed', 'success');
      await this.load();
    } catch (err: any) {
      this.fail(err?.message ?? 'Could not rename it');
    } finally {
      this.busy.set(false);
    }
  }

  askDelete(id: number, name: string): void {
    this.editing.set(null);
    const type = this.tab();
    const parts: string[] = [];
    let total = 0;
    let targets: { id: number; name: string }[] = [];

    if (type === 'departments') {
      const d = this.departments().find((x) => x.id === id);
      if (!d) return;
      total = d.request_count + d.staff_count + d.category_count;
      if (d.request_count) parts.push(countText(d.request_count, 'request'));
      if (d.staff_count) parts.push(countText(d.staff_count, 'staff member'));
      if (d.category_count) parts.push(countText(d.category_count, 'category', 'categories'));
      targets = this.departments()
        .filter((x) => x.id !== id)
        .map((x) => ({ id: x.id, name: x.name }));
    } else {
      const c = this.categories().find((x) => x.id === id);
      if (!c) return;
      total = c.request_count;
      if (c.request_count) parts.push(countText(c.request_count, 'request'));
      targets = this.categories()
        .filter((x) => x.id !== id)
        .map((x) => ({ id: x.id, name: x.name }));
    }

    const inUse = total > 0;
    this.pending.set({
      type,
      id,
      name,
      inUse,
      usageText: parts.join(', '),
      moveTo: inUse && targets.length > 0 ? targets[0].id : null,
      targets,
    });
  }

  setMoveTo(id: number): void {
    const p = this.pending();
    if (p) {
      this.pending.set({ ...p, moveTo: id });
    }
  }

  cancelDelete(): void {
    this.pending.set(null);
  }

  async confirmDelete(): Promise<void> {
    const p = this.pending();
    if (!p) return;

    if (p.inUse && p.moveTo === null) {
      this.fail('Choose where to move them');
      return;
    }

    this.busy.set(true);
    try {
      const moveTo = p.inUse ? p.moveTo : null;
      if (p.type === 'departments') {
        await this.catalog.deleteDepartment(p.id, moveTo);
      } else {
        await this.catalog.deleteCategory(p.id, moveTo);
      }
      this.pending.set(null);
      await this.feedback.toast(`Deleted "${p.name}"`, 'success');
      await this.load();
    } catch (e: any) {
      this.fail(e?.message ?? 'Could not delete it');
    } finally {
      this.busy.set(false);
    }
  }
}