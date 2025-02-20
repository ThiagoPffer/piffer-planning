import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Voter } from '../../features/planning-table/planning-table.component';
import { animate, state, style, transition, trigger } from '@angular/animations';

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
        backgroundColor: 'white',
        border: '2px solid var(--cinza-medio)',
        transform: 'rotate3d(0, 1, 0, 0)'
      })),
      state('back', style({
        backgroundColor: 'var(--primaria)',
        border: '2px solid var(--primaria)',
        transform: 'rotate3d(0, 1, 0, 3.14rad)'
      })),
      transition('back => front', [
        animate('.2s', style({
          backgroundColor: 'white',
          transform: 'rotate3d(0, 1, 0, 0)'
        }))
      ])
    ])
  ]
})
export class VoterCardComponent {

  @Input() public votingFinished: boolean = false;
  @Input() public voter!: Voter;

}
