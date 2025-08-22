import { animate, state, style, transition, trigger } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Voter } from '../../features/planning-table/planning-table.component';

@Component({
  selector: 'voter-card',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './voter-card.component.html',
  styleUrl: './voter-card.component.css',
  animations: [
    trigger('cardTurn', [
      state('front', style({
        backgroundColor: 'var(--secondary)',
        border: '2px solid var(--border)',
        transform: 'rotate3d(0, 1, 0, 0)'
      })),
      state('back', style({
        backgroundColor: 'var(--primaria)',
        border: '2px solid var(--primaria)',
        transform: 'rotate3d(0, 1, 0, 3.14rad)'
      })),
      transition('back => front', [
        animate('.2s', style({
          backgroundColor: 'var(--secondary)',
          transform: 'rotate3d(0, 1, 0, 0)'
        }))
      ])
    ])
  ]
})
export class VoterCardComponent {

  @Input() public votingFinished: boolean = false;
  @Input() public voter!: Voter;
  @Input() public userIsObserver: boolean = false;
  @Output('onPoke') public onPokeEmmiter: EventEmitter<string> = new EventEmitter();
  @ViewChild('cardElement', { static: true }) cardElement!: ElementRef;

  public onPoke() {
    this.onPokeEmmiter.emit(this.voter.uid);
  }

}