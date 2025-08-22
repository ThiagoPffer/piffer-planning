import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container" [@toastAppear]="toastInfo.showToast ? 'opened' : 'closed'">
      <div class="toast">
        <span>{{ toastInfo.message }}</span>
        <button (click)="closeToast()">
          <span class="mdi mdi-close"></span>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .toast-container {
        display: flex;
        justify-content: center;
        align-items: center;
        position: absolute;
        top: 0;
        left: 50%;
        right: 50%;
        width: 'fit-content';
        z-index: 9999;
      }
      .toast {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        background-color: var(--secondary);
        color: black;
        padding: 10px 20px;
        border: 2px solid var(--border);
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        width: fit-content;
        min-width: 300px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        transition: .2s
      }
      .toast button {
        background: none;
        border: none;
        color: black;
        margin-left: 10px;
        cursor: pointer;
      }
      .toast button:hover {
        opacity: 0.7;
      }
    `,
  ],
  standalone: true,
  imports: [ CommonModule ],
  animations: [
    trigger('toastAppear', [
      state('closed', style({ display: 'none', opacity: '0', top: '0', })),
      state('opened', style({ display: 'flex', opacity: '1', top: '20px' })),
      transition('closed => opened', [ 
        animate('.3s ease-out', style({
          display: 'flex',
          opacity: '1',
          transform: 'translateY(20px)'
        })) 
      ]),
      transition('opened => closed', [
        animate('.3s ease-out', style({
          opacity: '0',
          transform: 'translateY(10px)'
        }))
      ])
    ])
  ]
})
export class ToastComponent implements OnInit {
  toastInfo: ToastInfo = { message: '', showToast: false };

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.message$.subscribe((toastInfo) => {
      this.toastInfo = toastInfo;
    });
  }

  closeToast(): void {
    this.toastInfo.showToast = false;
  }
}

export interface ToastInfo {
  message: string;
  showToast: boolean;
}