import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { EnumIssueStatus, Issue } from '../../features/planning-table/planning-table.component';
import { collection, doc, getFirestore, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'info-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  templateUrl: './info-panel.component.html',
  styleUrl: './info-panel.component.css',
  animations: [
    trigger('newIssueAppear', [
      state('closed', style({
        display: 'none',
        width: '0',
        opacity: '0',
        margin: '0',
        padding: '0'
      })),
      state('opened', style({ display: 'block', width: '300px', opacity: '1' })),
      transition('closed => opened', [ animate('.3s ease-out') ]),
      transition('opened => closed', [
        animate('.3s ease-out', style({
          display: 'none',
          margin: '0',
          width: '0',
          minWidth: '0',
          opacity: '0',
          padding: '0'
        }))
      ])
    ])
  ]
})
export class InfoPanelComponent implements OnInit {

  public app = initializeApp(environment.firebaseConfig as FirebaseOptions);
  public firestore = getFirestore(this.app);

  public issues: Issue[] = [];
  public isAddingNewIssue: boolean = false;
  public addNewIssueFormGroup!: FormGroup;
  @Input() planningId!: string;
  @Input() currentIssue!: Issue | null;
  @Output('onStartVoting') onStartVotingEvent = new EventEmitter<Issue>();
  @Output('onReset') onResetEvent = new EventEmitter<Issue>();
  @Output('onIssuesLoaded') onIssuesLoadedEvent = new EventEmitter<Issue[]>();

  constructor(
    private formBuilder: FormBuilder
  ){}

  ngOnInit(): void {
    this.loadIssues();
  }

  public loadIssues() {
    onSnapshot(query(collection(this.firestore, 'issues'), where('planningId', '==', this.planningId)), snap => {
      this.issues = snap.docs.map(doc => doc.data() as Issue);
      this.onIssuesLoadedEvent.emit(this.issues);
    });
  }

  public onAddNewIssue() {
    this.isAddingNewIssue = !this.isAddingNewIssue;
    this.addNewIssueFormGroup = this.formBuilder.group({
      description: ['', Validators.required],
      url: [''],
    })
  }

  public onStartVoting(issue: Issue) {
    this.onStartVotingEvent.emit(issue);
  }

  public onReset(issue: Issue) {
    this.onResetEvent.emit(issue);
  }

  public async onSaveNewIssue() {
    if (this.addNewIssueFormGroup.valid) {
      const newIssue = {
        ...this.addNewIssueFormGroup.getRawValue(),
        planningId: this.planningId,
        status: EnumIssueStatus.VOTAR
      }
      this.addNewIssueFormGroup.reset();
      this.onAddNewIssue();
      const newIssueRef = doc(collection(this.firestore, 'issues'));
      await setDoc(newIssueRef, {...newIssue, id: newIssueRef.id});
    }
  }
  
}
