import { animate, state, style, transition, trigger } from '@angular/animations';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';

@Component({
  selector: 'emoji',
  standalone: true,
  imports: [],
  template: '<span class="emoji" [@poke]="{value: poked, params: {initialTop, initialLeft, hitTop, hitLeft, finalTop: (hitTop+150), finalLeft}}">{{emoji}}</span>',
  styles: [`
    .emoji {
      position: absolute;
      font-size: 1.8rem;
      user-select: none;
      z-index: 20;
    }
  `],
  animations: [
    trigger('poke', [
      state('launch', style({ top: '{{initialTop}}px', left: '{{initialLeft}}px', transform: 'rotate(0deg)' }), {params: { initialTop: 0, initialLeft: 0 }}),
      state('hit', style({ top: '{{hitTop}}px', left: '{{hitLeft}}px', transform: 'rotate(360deg)' }), {params: { hitTop: 0, hitLeft: 0 }}),
      state('fall', style({ top: '{{finalTop}}px', left: '{{finalLeft}}px', transform: 'rotate(180deg)' }), {params: { finalTop: 0, finalLeft: 0 }}),
      state('fall', style({ top: '{{finalTop}}px', left: '{{finalLeft}}px', transform: 'rotate(180deg)', opacity: 0 }), {params: { finalTop: 0, finalLeft: 0 }}),
      transition('launch => hit', [ animate('1s') ]),
      transition('hit => fall', [ animate('.4s ease-in') ]),
      transition('fall => destroy', [ animate('.4s', style({opacity: 0})) ])
    ])
  ]
})
export class EmojiComponent implements OnInit, OnDestroy {

  @Input() public initialTop!: number;
  @Input() public initialLeft!: number;
  @Input() public hitTop!: number;
  @Input() public hitLeft!: number;
  public finalTop!: number;
  @Input() public finalLeft!: number;
  @Input() public emoji!: string;
  public poked!: string;

  ngOnInit(): void {
    this.poked = 'launch';
    setTimeout(() => {
      this.poked = 'hit';
    }, 20);
    setTimeout(() => {
      this.poked = 'fall';
    }, 1000);
  }

  ngOnDestroy(): void {
    this.poked = 'destroy';
  }

}

export interface CardPosition {
  top: number
  left: number
}